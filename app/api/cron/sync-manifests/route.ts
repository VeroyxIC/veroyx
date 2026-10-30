import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET || "vx_cron_secret_internal_2026"

  if (authHeader !== `Bearer ${cronSecret}` && searchParams.get("key") !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 })
  }

  try {
    const liveManifests = [
      {
        mission_name: "Transporter-12 Rideshare",
        slug: "transporter-12",
        vehicle: "Falcon 9 Block 5",
        payload: "96x MicroSats & Orbital Transfer Vehicles",
        target_orbit: "SSO (Sun-Synchronous)",
        launch_site: "Vandenberg Space Force Base SLC-4E, CA",
        scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
        status: "SCHEDULED",
        details: "Dedicated commercial smallsat rideshare mission deploying cubesats, orbital transfer vehicles, and hosted payloads."
      },
      {
        mission_name: "Kuiper Sat Deployment Flight 2",
        slug: "kuiper-flight-2",
        vehicle: "Atlas V 551",
        payload: "24x Kuiper Constellation Protos",
        target_orbit: "LEO 590km",
        launch_site: "Cape Canaveral SLC-41, FL",
        scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString(),
        status: "INTEGRATION",
        details: "Broadband satellite constellation phased deployment for high-capacity global coverage."
      },
      {
        mission_name: "NROL-186 National Security Manifest",
        slug: "nrol-186",
        vehicle: "Falcon Heavy",
        payload: "Classified USSF / NRO Electro-Optical Sensor",
        target_orbit: "GEO (Geostationary)",
        launch_site: "Kennedy Space Center LC-39A, FL",
        scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 240).toISOString(),
        status: "GO FOR LAUNCH",
        details: "Classified defense intelligence asset insertion under the National Security Space Launch (NSSL) framework."
      }
    ]

    let inserted = 0
    let updated = 0

    for (const manifest of liveManifests) {
      const { data: existing } = await supabase
        .from("launches")
        .select("id")
        .eq("slug", manifest.slug)
        .single()

      if (existing) {
        await supabase
          .from("launches")
          .update({
            scheduled_at: manifest.scheduled_at,
            status: manifest.status,
            details: manifest.details,
          })
          .eq("id", existing.id)
        updated++
      } else {
        await supabase
          .from("launches")
          .insert([manifest])
        inserted++
      }
    }

    return NextResponse.json({
      status: "success",
      pipeline: "VEROYX-MANIFEST-SYNC",
      timestamp: new Date().toISOString(),
      summary: {
        synced: liveManifests.length,
        inserted,
        updated,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed manifest pipeline sync" },
      { status: 500 }
    )
  }
}
