import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow edge worker time to ingest batches

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET || "vx_cron_secret_internal_2026"

  // Secure authorization
  if (authHeader !== `Bearer ${cronSecret}` && searchParams.get("key") !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized ephemeris sync trigger" }, { status: 401 })
  }

  try {
    // Poll CelesTrak active stations (ISS, Tiangong, high-priority science payloads)
    const celestrakUrl = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
    const response = await fetch(celestrakUrl, { next: { revalidate: 0 } })

    if (!response.ok) {
      throw new Error(`CelesTrak upstream error: ${response.statusText}`)
    }

    const text = await response.text()
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

    const records: any[] = []

    // TLEs are formatted in 3-line groups (0: Name, 1: Line 1, 2: Line 2)
    for (let i = 0; i < lines.length; i += 3) {
      const name = lines[i]
      const line1 = lines[i + 1]
      const line2 = lines[i + 2]

      if (!line1 || !line2 || !line1.startsWith("1 ") || !line2.startsWith("2 ")) {
        continue
      }

      // Parse standard NORAD TLE parameters
      const noradCatId = parseInt(line1.substring(2, 7).trim(), 10)
      const inclination = parseFloat(line2.substring(8, 16).trim())
      const raan = parseFloat(line2.substring(17, 25).trim())
      const eccentricity = parseFloat("0." + line2.substring(26, 33).trim())
      const meanMotion = parseFloat(line2.substring(52, 63).trim())
      const periodMin = meanMotion > 0 ? parseFloat((1440 / meanMotion).toFixed(2)) : 90.0

      records.push({
        norad_cat_id: noradCatId,
        name: name.replace(/^0\s+/, ""),
        tle_line1: line1,
        tle_line2: line2,
        inclination_deg: inclination,
        raan_deg: raan,
        eccentricity: eccentricity,
        mean_motion_rev_day: meanMotion,
        period_min: periodMin,
        source: "CELESTRAK-STATIONS",
        updated_at: new Date().toISOString(),
      })
    }

    // Upsert into Supabase in batches
    if (records.length > 0) {
      const { error } = await supabase
        .from("satellite_ephemeris")
        .upsert(records, { onConflict: "norad_cat_id" })

      if (error) throw error
    }

    return NextResponse.json({
      status: "success",
      pipeline: "CELESTRAK-EPHEMERIS-SYNC",
      timestamp: new Date().toISOString(),
      ingestedCount: records.length,
      sampleRecords: records.slice(0, 3).map((r) => ({
        norad_cat_id: r.norad_cat_id,
        name: r.name,
        inclination: r.inclination_deg,
        period_min: r.period_min,
      })),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to sync ephemeris data" },
      { status: 500 }
    )
  }
}
