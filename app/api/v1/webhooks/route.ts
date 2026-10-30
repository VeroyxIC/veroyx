import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { targetUrl, organization, events } = body

    if (!targetUrl || !targetUrl.startsWith("http")) {
      return NextResponse.json({ error: "A valid HTTPS targetUrl is required" }, { status: 400 })
    }

    // Generate production-grade HMAC signing secret
    const secretKey = `vx_whsec_${crypto.randomBytes(24).toString("hex")}`

    const { data, error } = await supabase.from("webhook_subscriptions").insert([
      {
        target_url: targetUrl,
        secret_key: secretKey,
        organization: organization || "Verified Prime / Fund",
        events: events || ["launch.status_changed", "grant.awarded"],
        status: "active",
      }
    ]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: "success",
      subscription: {
        id: data.id,
        targetUrl: data.target_url,
        secretKey: data.secret_key,
        events: data.events,
        registeredAt: data.created_at,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Webhook registration failed" }, { status: 500 })
  }
}

export async function GET() {
  const { data } = await supabase
    .from("webhook_subscriptions")
    .select("id, target_url, organization, events, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10)

  return NextResponse.json({
    protocol: "VEROYX-DISPATCH-V1",
    activeSubscriptions: data || []
  })
}
