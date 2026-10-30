"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { 
  ShieldAlert, 
  AlertTriangle, 
  Radio, 
  Activity, 
  Orbit, 
  ArrowRight, 
  ShieldCheck, 
  Crosshair, 
  Clock,
  Filter,
  Search
} from "lucide-react"
import DebrisOrbitVisualizer from "@/components/DebrisOrbitVisualizer"

export default function SSARadarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRisk, setFilterRisk] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  useEffect(() => {
    async function loadConjunctions() {
      const { data, error } = await supabase
        .from("conjunction_events")
        .select("*")
        .order("miss_distance_m", { ascending: true })

      if (!error && data) {
        setEvents(data)
        if (data.length > 0) {
          setSelectedEventId(data[0].event_id)
        }
      }
      setLoading(false)
    }

    loadConjunctions()
  }, [])

  const filteredEvents = events.filter((e) => {
    const matchesRisk = filterRisk === "ALL" || e.risk_level === filterRisk
    const matchesSearch =
      e.primary_object.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.secondary_object.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.event_id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRisk && matchesSearch
  })

  const criticalCount = events.filter((e) => e.risk_level === "CRITICAL").length
  const elevatedCount = events.filter((e) => e.risk_level === "ELEVATED").length
  const closestMiss = events.length > 0 ? Math.min(...events.map((e) => Number(e.miss_distance_m))) : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/30 text-red-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              Orbital Debris Tracking & Conjunction Warning System
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SPACE SITUATIONAL AWARENESS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Real-time close-approach radar monitoring high-density LEO shells, collision probability ($P_c$), radial miss vectors, and relative velocity intercept vectors.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-red-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            18TH SPACE DEFENSE SQDN FEED: ACTIVE
          </div>
        </div>

        {/* 3D Interactive Conjunction Visualizer */}
        <DebrisOrbitVisualizer
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={(evt) => setSelectedEventId(evt.event_id)}
        />

        {/* Macro Conjunction KPI Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> TRACKED CLOSE APPROACHES
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{events.length} EVENTS</div>
            <div className="text-[10px] text-slate-500">Next 48 Hours Horizon</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> CRITICAL CONJUNCTIONS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-400">{criticalCount} CRITICAL</div>
            <div className="text-[10px] text-slate-500">Pc &gt; 10⁻⁴ Threshold</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" /> CLOSEST APPROACH
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">{closestMiss.toFixed(1)} m</div>
            <div className="text-[10px] text-slate-500">Total Miss Distance</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Orbit className="w-3.5 h-3.5 text-purple-400" /> ELEVATED MONITORING
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400">{elevatedCount} FLIGHTS</div>
            <div className="text-[10px] text-slate-500">Active Warning Array</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {["ALL", "CRITICAL", "ELEVATED", "NOMINAL"].map((risk) => (
              <button
                key={risk}
                onClick={() => setFilterRisk(risk)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  filterRisk === risk
                    ? risk === "CRITICAL"
                      ? "bg-red-950 border-red-500/50 text-red-300 font-bold"
                      : risk === "ELEVATED"
                      ? "bg-amber-950 border-amber-500/50 text-amber-300 font-bold"
                      : "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {risk}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search object, NORAD ID, or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-xs"
            />
          </div>
        </div>

        {/* Conjunction Events Feed */}
        {loading ? (
          <div className="p-16 text-center font-mono text-xs text-slate-500">
            QUERYING ORBITAL SURVEILLANCE RADAR NETWORKS...
          </div>
        ) : (
          <div className="space-y-4 font-mono text-xs">
            {filteredEvents.map((evt) => {
              const isCrit = evt.risk_level === "CRITICAL"
              const isElev = evt.risk_level === "ELEVATED"
              const isSelected = evt.event_id === selectedEventId
              const tca = new Date(evt.tca_epoch)

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.event_id)}
                  className={`p-6 rounded-2xl bg-slate-900/40 border transition-all space-y-4 cursor-pointer ${
                    isSelected
                      ? "border-cyan-400 ring-1 ring-cyan-400 bg-cyan-950/20 shadow-[0_0_25px_rgba(6,182,212,0.15)]"
                      : isCrit
                      ? "border-red-500/40 bg-red-950/10 hover:border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                      : isElev
                      ? "border-amber-500/40 bg-amber-950/10 hover:border-amber-500/60"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                          isCrit
                            ? "bg-red-950 border-red-500/40 text-red-300"
                            : isElev
                            ? "bg-amber-950 border-amber-500/40 text-amber-300"
                            : "bg-slate-900 border-slate-700 text-slate-300"
                        }`}
                      >
                        {evt.risk_level} CONJUNCTION
                      </span>
                      <span className="text-slate-400 font-bold">{evt.event_id}</span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40">
                          SELECTED ON 3D RADAR
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      TCA: <span className="text-white font-bold">{tca.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Primary vs Secondary Targets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] uppercase text-cyan-400 font-bold">PRIMARY ASSET</div>
                      <div className="text-sm font-bold text-white">{evt.primary_object}</div>
                      <div className="text-[11px] text-slate-400">TYPE: {evt.primary_type}</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] uppercase text-red-400 font-bold">CONJUNCTION TARGET / DEBRIS</div>
                      <div className="text-sm font-bold text-white">{evt.secondary_object}</div>
                      <div className="text-[11px] text-slate-400">TYPE: {evt.secondary_type}</div>
                    </div>
                  </div>

                  {/* Telemetry Vector Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">TOTAL MISS DISTANCE</span>
                      <span className={`text-base font-black ${Number(evt.miss_distance_m) < 200 ? "text-red-400" : "text-white"}`}>
                        {Number(evt.miss_distance_m).toFixed(1)} m
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">COLLISION PROBABILITY</span>
                      <span className={`text-base font-black ${Number(evt.collision_probability) > 0.0001 ? "text-red-400" : "text-amber-400"}`}>
                        {(Number(evt.collision_probability) * 100).toFixed(4)}%
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">RELATIVE VELOCITY</span>
                      <span className="text-base font-black text-purple-400">
                        {Number(evt.relative_velocity_kms).toFixed(2)} km/s
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">SHELL ALTITUDE</span>
                      <span className="text-base font-black text-cyan-400">
                        {Number(evt.altitude_km).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
