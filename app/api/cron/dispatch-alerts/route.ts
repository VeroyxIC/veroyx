import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import crypto from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET || "vx_cron_secret_internal_2026"

  // Secure validation
  if (authHeader !== `Bearer ${cronSecret}` && searchParams.get("key") !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized dispatch trigger" }, { status: 401 })
  }

  try {
    // 1. Fetch active watchlist items with alerts enabled
    const { data: watchlistItems, error: watchErr } = await supabase
      .from("user_watchlist")
      .select("*")
      .eq("alerts_enabled", true)

    if (watchErr) throw watchErr

    // 2. Fetch imminent launches (scheduled within next 72 hours)
    const now = new Date()
    const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString()

    const { data: imminentLaunches, error: launchErr } = await supabase
      .from("launches")
      .select("*")
      .lte("scheduled_at", horizon)
      .order("scheduled_at", { ascending: true })

    if (launchErr) throw launchErr

    // 3. Fetch active webhook subscriber endpoints
    const { data: subscribers } = await supabase
      .from("webhook_subscriptions")
      .select("*")
      .eq("status", "active")

    const dispatchedAlerts: any[] = []

    // 4. Match watchlist entities with flight radar & dispatch payloads
    for (const launch of (imminentLaunches || [])) {
      // Find matching watchlist items (or broadcast if mission is monitored)
      const matchingWatchers = (watchlistItems || []).filter(
        (w) => w.entity_type === "launch" && (w.entity_name === launch.mission_name || w.entity_slug === launch.slug)
      )

      const alertPayload = {
        event: "launch.imminent_window",
        timestamp: new Date().toISOString(),
        severity: "CRITICAL_OPS",
        mission: {
          mission_name: launch.mission_name,
          slug: launch.slug,
          vehicle: launch.vehicle,
          status: launch.status,
          scheduled_at: launch.scheduled_at,
          target_orbit: launch.target_orbit,
          launch_site: launch.launch_site,
        },
        matchedSubscribersCount: matchingWatchers.length,
      }

      dispatchedAlerts.push(alertPayload)

      // Post event payload to verified webhooks
      for (const sub of (subscribers || [])) {
        if (!sub.target_url) continue

        const hmac = crypto
          .createHmac("sha256", sub.secret_key || "default_secret")
          .update(JSON.stringify(alertPayload))
          .digest("hex")

        try {
          // Non-blocking fire-and-forget push
          fetch(sub.target_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Veroyx-Signature": hmac,
              "X-Veroyx-Event": "launch.imminent_window",
            },
            body: JSON.stringify(alertPayload),
          }).catch(() => {})
        } catch (e) {
          // Swallow network delivery failures for external subscribers
        }
      }
    }

    return NextResponse.json({
      status: "success",
      pipeline: "VEROYX-ALERT-DISPATCH-ARRAY",
      timestamp: new Date().toISOString(),
      summary: {
        activeMonitoredEntities: watchlistItems?.length || 0,
        imminentMissions: imminentLaunches?.length || 0,
        dispatchedAlertsCount: dispatchedAlerts.length,
        endpointsNotified: subscribers?.length || 0,
      },
      alerts: dispatchedAlerts,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Alert dispatch pipeline failed" }, { status: 500 })
  }
}
