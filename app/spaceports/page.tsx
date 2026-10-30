"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { MapPin, Navigation, Orbit, Shield, ExternalLink, Search, Radio } from "lucide-react"

export default function SpaceportsPage() {
  const [spaceports, setSpaceports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    async function loadSpaceports() {
      const { data, error } = await supabase
        .from("spaceports")
        .select("*")
        .order("active_pads", { ascending: false })

      if (!error && data) {
        setSpaceports(data)
      }
      setLoading(false)
    }

    loadSpaceports()
  }, [])

  const filtered = spaceports.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.operator.toLowerCase().includes(query.toLowerCase()) ||
    s.state_or_region.toLowerCase().includes(query.toLowerCase())
  )

  const totalPads = spaceports.reduce((acc, s) => acc + (s.active_pads || 0), 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Sovereign & Defense Launch Infrastructure
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SPACEPORT REGISTRY
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Global directory indexing active launch complexes, military space bases, licensed orbital inclinations, and physical pad readiness.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-right">
              <div className="text-[10px] text-slate-500 uppercase">Active Monitored Pads</div>
              <div className="text-base font-bold text-cyan-400">
                {totalPads} OPERATIONAL PADS
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex justify-between items-center font-mono text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search complex, base, or operator..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          <Link
            href="/launches"
            className="hidden sm:flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold"
          >
            VIEW LIVE RADAR FLIGHTS <Radio className="w-3.5 h-3.5 animate-pulse" />
          </Link>
        </div>

        {/* Spaceport Cards */}
        {loading ? (
          <div className="p-16 text-center font-mono text-xs text-slate-500">
            SCANNING GLOBAL LAUNCH CORRIDORS...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
            {filtered.map((port) => (
              <div
                key={port.id}
                className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                      {port.active_pads} ACTIVE {port.active_pads === 1 ? "PAD" : "PADS"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {port.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {port.name}
                    </h3>
                    <div className="text-xs text-cyan-400 mt-0.5 font-bold">
                      {port.operator}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-slate-200">{port.state_or_region}, {port.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="text-slate-200">{Number(port.latitude).toFixed(2)}° N, {Math.abs(Number(port.longitude)).toFixed(2)}° W</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase text-slate-500 tracking-wider">
                      Supported Orbit Regimes
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(port.supported_orbits || []).map((orbit: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
                        >
                          {orbit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${port.latitude},${port.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    COORDINATE FIX <ExternalLink className="w-3 h-3" />
                  </a>

                  <Link
                    href="/launches"
                    className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px]"
                  >
                    RADAR CORRIDOR →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
