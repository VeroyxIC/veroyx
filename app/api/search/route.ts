import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({
      companies: [],
      contracts: [],
      technologies: [],
      groundStations: [],
      launches: [],
      constellations: [],
    })
  }

  const queryPattern = `%${q}%`

  // Execute parallel queries across all core relational domains
  const [
    companiesRes,
    contractsRes,
    technologiesRes,
    groundStationsRes,
    launchesRes,
    constellationsRes,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug, country, tier, sector, description")
      .or(`name.ilike.${queryPattern},sector.ilike.${queryPattern},description.ilike.${queryPattern}`)
      .limit(5),

    supabase
      .from("defense_contracts")
      .select("id, program_name, contract_number, prime_contractor, command_agency, obligation_value_m")
      .or(`program_name.ilike.${queryPattern},prime_contractor.ilike.${queryPattern},command_agency.ilike.${queryPattern},contract_number.ilike.${queryPattern}`)
      .limit(5),

    supabase
      .from("technologies")
      .select("id, name, slug, trl, category, description")
      .or(`name.ilike.${queryPattern},category.ilike.${queryPattern},description.ilike.${queryPattern}`)
      .limit(5),

    supabase
      .from("ground_stations")
      .select("id, name, code, operator, country, supported_bands")
      .or(`name.ilike.${queryPattern},code.ilike.${queryPattern},operator.ilike.${queryPattern},country.ilike.${queryPattern}`)
      .limit(5),

    supabase
      .from("launches")
      .select("id, mission_name, vehicle, operator, orbit, status")
      .or(`mission_name.ilike.${queryPattern},vehicle.ilike.${queryPattern},operator.ilike.${queryPattern}`)
      .limit(5),

    supabase
      .from("constellations")
      .select("id, name, slug, operator, regime, total_satellites")
      .or(`name.ilike.${queryPattern},operator.ilike.${queryPattern},regime.ilike.${queryPattern}`)
      .limit(5),
  ])

  return NextResponse.json({
    companies: companiesRes.data || [],
    contracts: contractsRes.data || [],
    technologies: technologiesRes.data || [],
    groundStations: groundStationsRes.data || [],
    launches: launchesRes.data || [],
    constellations: constellationsRes.data || [],
  })
}
