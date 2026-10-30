"use client"

import { useState } from "react"
import Link from "next/link"
import { Radio, Bell, ArrowLeft, Send, CheckCircle2, ShieldAlert, Cpu, Rocket } from "lucide-react"

export default function DispatchConsolePage() {
  const [dispatchLog, setDispatchLog] = useState<any>(null)
  const [running, setRunning] = useState(false)

  const triggerDispatchRun = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/cron/dispatch-alerts?key=vx_cron_secret_internal_2026")
      const data = await res.json()
      setDispatchLog(data)
    } catch (err) {
      console.error(err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/watchlist"
            className="inline-flex items-center gap-2 text-sm font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO WATCHLIST
          </Link>

          <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Live Notification Pipeline
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
                ALERT DISPATCH ARRAY
              </h1>
              <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
                Automated event triggers cross-referencing your monitored targets against launch countdowns and contract changes, dispatching signed JSON payloads.
              </p>
            </div>

            <button
              onClick={triggerDispatchRun}
              disabled={running}
              className="px-6 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
              {running ? "SCANNING FLIGHT RADAR..." : "TRIGGER IMMEDIATE DISPATCH CYCLE"}
            </button>
          </div>
        </div>

        {/* Dispatch Telemetry Display */}
        {dispatchLog ? (
          <div className="space-y-6 font-mono text-xs">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">PIPELINE STATUS</div>
                <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> ACTIVE (200 OK)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">WATCHED TARGETS</div>
                <div className="text-xl font-bold text-white">
                  {dispatchLog.summary?.activeMonitoredEntities || 0} ENTITIES
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">IMMINENT LAUNCHES (72H)</div>
                <div className="text-xl font-bold text-cyan-400">
                  {dispatchLog.summary?.imminentMissions || 0} FLIGHTS
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">NOTIFIED WEBHOOKS</div>
                <div className="text-xl font-bold text-purple-400">
                  {dispatchLog.summary?.endpointsNotified || 0} ENDPOINTS
                </div>
              </div>
            </div>

            {/* Payloads Stream */}
            <div className="space-y-3">
              <div className="text-xs uppercase text-slate-400 font-bold flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                Dispatched Payloads Stream
              </div>

              {dispatchLog.alerts && dispatchLog.alerts.length > 0 ? (
                <div className="space-y-3">
                  {dispatchLog.alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-500/30 text-amber-300 font-bold">
                          {alert.event}
                        </span>
                        <span className="text-slate-500 text-[10px]">{alert.timestamp}</span>
                      </div>
                      <div className="text-sm font-bold text-white">{alert.mission?.mission_name}</div>
                      <div className="text-[11px] text-slate-400">
                        Vehicle: <strong className="text-slate-200">{alert.mission?.vehicle}</strong> • Target Orbit: <strong className="text-cyan-400">{alert.mission?.target_orbit}</strong> • Status: <strong className="text-emerald-400">{alert.mission?.status}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-900/20 border border-slate-800 text-center text-slate-500">
                  NO MISSIONS ENTERING T-72H WINDOW DURING THIS CYCLE
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-16 rounded-2xl bg-slate-900/20 border border-dashed border-slate-800 text-center space-y-4">
            <Radio className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
            <div className="space-y-1 font-mono">
              <h3 className="text-base font-bold text-white">DISPATCH WORKER READY</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto font-sans">
                The alert engine automatically fires during daily scheduled manifest syncs. Click above to execute a live cycle and inspect payload signatures right now.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
