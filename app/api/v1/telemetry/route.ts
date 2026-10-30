import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const entity = searchParams.get("entity") || "all" // companies, technologies, grants, launches
  const sector = searchParams.get("sector")
  const trl = searchParams.get("trl")
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)

  try {
    let result: Record<string, any> = {
      status: "success",
      protocol: "VEROYX-AEROSPACE-v1",
      timestamp: new Date().toISOString(),
    }

    if (entity === "companies" || entity === "all") {
      let q = supabase.from("companies").select("id, name, slug, sector, funding_total, stage, hq_location").limit(limit)
      if (sector) q = q.ilike("sector", `%${sector}%`)
      const { data } = await q
      result.companies = data || []
    }

    if (entity === "technologies" || entity === "all") {
      let q = supabase.from("technologies").select("id, name, slug, sector, trl, description, target_domain").limit(limit)
      if (trl) q = q.gte("trl", Number(trl))
      const { data } = await q
      result.technologies = data || []
    }

    if (entity === "grants" || entity === "all") {
      let q = supabase.from("grants").select("id, name, slug, awarding_agency, amount, status").limit(limit)
      const { data } = await q
      result.grants = data || []
    }

    if (entity === "launches" || entity === "all") {
      let q = supabase.from("launches").select("id, mission_name, slug, vehicle, payload, target_orbit, launch_site, scheduled_at, status").limit(limit)
      const { data } = await q
      result.launches = data || []
    }

    return NextResponse.json(result, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to query Veroyx Telemetry Engine" },
      { status: 500 }
    )
  }
}
