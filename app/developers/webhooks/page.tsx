"use client"

import { useState, useEffect } from "react"
import { Webhook, Shield, Check, Copy, ArrowRight, Radio, RefreshCw, Send, AlertCircle } from "lucide-react"

export default function WebhooksPortalPage() {
  const [targetUrl, setTargetUrl] = useState("")
  const [org, setOrg] = useState("")
  const [createdWebhook, setCreatedWebhook] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [testSent, setTestSent] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          organization: org || "Institutional Operator",
          events: ["launch.status_changed", "grant.awarded", "prime.indexed"]
        })
      })
      const data = await res.json()
      if (data.subscription) {
        setCreatedWebhook(data.subscription)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const samplePayload = `{
  \"event\": \"launch.status_changed\",
  \"timestamp\": \"2026-10-30T14:15:00.000Z\",
  \"data\": {
    \"mission_name\": \"Transporter-12 Rideshare\",
    \"slug\": \"transporter-12\",
    \"vehicle\": \"Falcon 9 Block 5\",
    \"previous_status\": \"SCHEDULED\",
    \"new_status\": \"GO FOR LAUNCH\",
    \"target_orbit\": \"SSO (Sun-Synchronous)\"
  }
}`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Webhook className="w-3.5 h-3.5" />
              Event Dispatch Protocol
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              REAL-TIME WEBHOOK ENGINE
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Push real-time aerospace telemetry directly into your messaging arrays, Slack ops channels, trading engines, or internal microservices.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            DISPATCH LATENCY: &lt;140ms
          </div>
        </div>

        {/* Grid: Registration Form & Signature Spec */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 font-mono text-sm font-bold text-white uppercase">
              <Shield className="w-4 h-4 text-cyan-400" />
              Register Secure Destination
            </div>

            {createdWebhook ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                  <div className="text-emerald-400 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    ENDPOINT ACTIVATED
                  </div>
                  <div className="text-slate-300 break-all">
                    Target: <span className="text-white">{createdWebhook.targetUrl}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase">HMAC Signing Secret</label>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-cyan-400 break-all flex items-center justify-between gap-2">
                    <span className="truncate">{createdWebhook.secretKey}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdWebhook.secretKey)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0 hover:text-white"
                    >
                      {copied ? "COPIED" : "COPY"}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Use this secret to verify the <code className="text-cyan-400">X-Veroyx-Signature</code> header on inbound payloads.
                  </span>
                </div>

                <button
                  onClick={() => {
                    setTestSent(true)
                    setTimeout(() => setTestSent(false), 3000)
                  }}
                  className="w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 flex items-center justify-center gap-2 font-bold"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testSent ? "MOCK TELEMETRY PUSHED (200 OK)" : "FIRE TEST TELEMETRY EVENT"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">DESTINATION URL (HTTPS)</label>
                  <input
                    required
                    type="url"
                    placeholder="https://api.yourdomain.com/webhooks/aerospace"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ORGANIZATION IDENTIFIER</label>
                  <input
                    type="text"
                    placeholder="e.g. In-Q-Tel Alpha Ops"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-2">SUBSCRIBED EVENTS</label>
                  <div className="space-y-2 text-[11px] text-slate-300">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="rounded bg-slate-900 border-slate-700 text-cyan-500" />
                      <span>launch.status_changed (Real-time countdown & status scrubs)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="rounded bg-slate-900 border-slate-700 text-cyan-500" />
                      <span>grant.awarded (DoD, NASA, and USSF SBIR/STTR prime wins)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked disabled className="rounded bg-slate-900 border-slate-700 text-cyan-500" />
                      <span>prime.indexed (New orbital hardware & contractor records)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? "CONFIGURING DISPATCH ARRAY..." : "SUBSCRIBE ENDPOINT"}
                </button>
              </form>
            )}
          </div>

          {/* Sample Inbound Payload Schema */}
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400 uppercase font-bold">Standard Payload Schema</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                application/json
              </span>
            </div>

            <pre className="p-5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              {samplePayload}
            </pre>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-3 text-xs font-sans text-slate-400">
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                All outbound webhook dispatches are hashed via <code className="text-cyan-300 font-mono">HMAC-SHA256</code> and passed in the request header. If your endpoint returns a status code outside the 2xx range, the delivery retries with exponential backoff up to 5 times.
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
