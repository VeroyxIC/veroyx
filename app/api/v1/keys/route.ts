import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organization, email, entityType, intendedUse } = body

    if (!organization || !email) {
      return NextResponse.json({ error: "Organization and authorized email are required" }, { status: 400 })
    }

    // Generate production-grade hex token
    const token = `vx_ent_${crypto.randomBytes(16).toString("hex")}`

    const { data, error } = await supabase.from("api_keys").insert([
      {
        key_token: token,
        organization_name: organization,
        contact_email: email,
        entity_type: entityType || "Defense / Commercial Prime",
        intended_use: intendedUse || "Programmatic telemetry ingestion",
        rate_limit_per_min: 300,
        tier: "Institutional Live",
        status: "active",
      },
    ]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      token,
      tier: "Institutional Live",
      rateLimit: "300 req/min",
      organization,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to issue institutional key" }, { status: 500 })
  }
}
