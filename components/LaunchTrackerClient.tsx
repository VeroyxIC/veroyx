"use client"

import React, { useState, useEffect } from "react"
import { Clock, Rocket, MapPin, Orbit, Target, ShieldCheck } from "lucide-react"

interface LaunchItem {
  slug: string
  mission_name: string
  operator: string
  vehicle: string
  launch_window_utc: string
  launch_site: string
  orbit_target: string
  payload_description: string
  status: string
  customer: string
}

function calculateTimeLeft(targetUtc: string) {
  const difference = +new Date(targetUtc) - +new Date()
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, completed: true }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    completed: false
  }
}

function CountdownDisplay({ targetUtc }: { targetUtc: string }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetUtc))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetUtc))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetUtc])

  if (timeLeft.completed) {
    return (
      <div className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        FLIGHT IN PROGRESS / INSERTION COMPLETE
      </div>
    )
  }

  const pad = (n: number) => n.toString().padStart(2, "0")

  return (
    <div className="flex items-center gap-1.5 font-mono">
      <span className="text-cyan-400 font-bold text-xs mr-1">T-</span>
      <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-xs">
        {pad(timeLeft.days)}<span className="text-[10px] text-slate-500 ml-0.5">d</span>
      </div>
      <span className="text-slate-600">:</span>
      <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-xs">
        {pad(timeLeft.hours)}<span className="text-[10px] text-slate-500 ml-0.5">h</span>
      </div>
      <span className="text-slate-600">:</span>
      <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-xs">
        {pad(timeLeft.minutes)}<span className="text-[10px] text-slate-500 ml-0.5">m</span>
      </div>
      <span className="text-slate-600">:</span>
      <div className="px-2 py-1 rounded bg-slate-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs">
        {pad(timeLeft.seconds)}<span className="text-[10px] text-cyan-600 ml-0.5">s</span>
      </div>
    </div>
  )
}

export default function LaunchTrackerClient({ launches }: { launches: LaunchItem[] }) {
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL")

  const operators = ["ALL", ...Array.from(new Set(launches.map((l) => l.operator)))]
  const filtered = selectedFilter === "ALL" ? launches : launches.filter((l) => l.operator === selectedFilter)

  return (
    <div className="space-y-6">
      {/* Operator Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-slate-500 mr-2">FILTER PRIME:</span>
        {operators.map((op) => (
          <button
            key={op}
            onClick={() => setSelectedFilter(op)}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
              selectedFilter === op
                ? "bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-semibold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {op}
          </button>
        ))}
      </div>

      {/* Manifest Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((launch) => (
          <div
            key={launch.slug}
            className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-6 backdrop-blur-sm group"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-400 font-semibold border border-slate-700">
                  {launch.operator}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-950/40 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {launch.status}
                </span>
              </div>

              {/* Mission Name */}
              <h2 className="text-2xl font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                {launch.mission_name}
              </h2>

              {/* Flight Specs */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                    <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                    VEHICLE
                  </div>
                  <div className="text-slate-200 font-bold">{launch.vehicle}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                    <Orbit className="w-3.5 h-3.5 text-cyan-400" />
                    TARGET ORBIT
                  </div>
                  <div className="text-cyan-300 font-bold line-clamp-1">{launch.orbit_target}</div>
                </div>
              </div>

              {/* Pad Location */}
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{launch.launch_site}</span>
              </div>

              {/* Payload Description */}
              <p className="mt-4 text-xs text-slate-300 leading-relaxed font-sans border-l-2 border-slate-800 pl-3">
                {launch.payload_description}
              </p>
            </div>

            {/* Card Footer: Live Countdown Ticker */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  COUNTDOWN TELEMETRY
                </div>
                <CountdownDisplay targetUtc={launch.launch_window_utc} />
              </div>

              <div className="text-left sm:text-right font-mono text-xs">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">PRIMARY PAYLOAD</div>
                <div className="text-slate-300 font-semibold">{launch.customer}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
