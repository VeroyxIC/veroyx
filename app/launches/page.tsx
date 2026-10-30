"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Rocket, Clock, MapPin, Orbit, Radio } from "lucide-react"
import OrbitalGlobe from "@/components/OrbitalGlobe"

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number }>({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    const updateCountdown = () => {
      const diff = new Date(targetDate).getTime() - new Date().getTime()
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 })
        return
      }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60),
      })
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-bold text-sm bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded-lg">
      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
      <span>
        T-{timeLeft.d}d {String(timeLeft.h).padStart(2, "0")}h {String(timeLeft.m).padStart(2, "0")}m {String(timeLeft.s).padStart(2, "0")}s
      </span>
    </div>
  )
}

export default function LaunchesPage() {
  const [launches, setLaunches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLaunches() {
      const { data } = await supabase
        .from("launches")
        .select("*")
        .order("scheduled_at", { ascending: true })

      if (data) setLaunches(data)
      setLoading(false)
    }
    fetchLaunches()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Live Telemetry Feed • Real-Time Manifest
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ORBITAL LAUNCH RADAR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Real-time flight manifest tracking commercial orbital launches, Space Force defense payloads, and deep-space exploration windows.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {launches.length} ACTIVE TRACKS
            </div>
          </div>
        </div>

        <OrbitalGlobe />

        {loading ? (
          <div className="p-16 text-center font-mono text-cyan-400 flex items-center justify-center gap-3">
            <Radio className="w-5 h-5 animate-spin" />
            SYNCHRONIZING ORBITAL RADAR TRANSPONDERS...
          </div>
        ) : (
          <div className="space-y-4">
            {launches.map((launch) => (
              <div
                key={launch.slug}
                className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold">
                      {launch.status}
                    </span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Rocket className="w-3.5 h-3.5 text-slate-400" /> {launch.vehicle}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
                    {launch.mission_name}
                  </h2>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {launch.details}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-300 min-w-[280px]">
                  <div className="space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5 text-[10px] uppercase">
                      <Orbit className="w-3.5 h-3.5 text-cyan-400" /> Target Orbit
                    </span>
                    <span className="font-semibold text-white truncate block">{launch.target_orbit}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5 text-[10px] uppercase">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Launch Site
                    </span>
                    <span className="font-semibold text-white truncate block">{launch.launch_site}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                  <CountdownTimer targetDate={launch.scheduled_at} />
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(launch.scheduled_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
