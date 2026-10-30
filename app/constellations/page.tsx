"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Orbit, Radio, Satellite, Layers, ArrowUpRight, Filter, Search } from "lucide-react"

export default function ConstellationsPage() {
  const [constellations, setConstellations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRegime, setFilterRegime] = useState("ALL")
  const [query, setQuery] = useState("")

  useEffect(() => {
    async function fetchConstellations() {
      const { data, error } = await supabase
        .from("constellations")
        .select("*")
        .order("deployed_count", { ascending: false })

      if (!error && data) {
        setConstellations(data)
      }
      setLoading(false)
    }

    fetchConstellations()
  }, [])

  const filtered = constellations.filter((c) => {
    const matchesRegime = filterRegime === "ALL" || c.orbit_regime === filterRegime
    const matchesQuery = c.name.toLowerCase().includes(query.toLowerCase()) || c.operator.toLowerCase().includes(query.toLowerCase())
    return matchesRegime && matchesQuery
  })

  const totalDeployed = constellations.reduce((acc, c) => acc + (c.deployed_count || 0), 0)
  const totalAuthorized = constellations.reduce((acc, c) => acc + (c.authorized_count || 0), 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Orbit className="w-3.5 h-3.5 animate-spin" />
              Orbital Shell Registry & Spectrum Tracking
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              CONSTELLATION RADAR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Real-time monitoring of commercial mega-constellations, authorized FCC orbital slots, active LEO shells, and RF spectrum allocations.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-right">
              <div className="text-[10px] text-slate-500 uppercase">Tracked Satellites</div>
              <div className="text-base font-bold text-cyan-400">
                {totalDeployed.toLocaleString()} <span className="text-slate-500 text-xs">/ {totalAuthorized.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {["ALL", "LEO", "SSO", "MEO", "GEO"].map((regime) => (
              <button
                key={regime}
                onClick={() => setFilterRegime(regime)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  filterRegime === regime
                    ? "bg-cyan-950 border-cyan-500/50 text-cyan-400 font-bold"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {regime}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter operator or constellation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>
        </div>

        {/* Constellation Grid */}
        {loading ? (
          <div className="p-16 text-center font-mono text-xs text-slate-500">
            POLLING ORBITAL SHELL REPOSITORIES...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
            {filtered.map((item) => {
              const pct = Math.min(100, Math.round(((item.deployed_count || 0) / (item.authorized_count || 1)) * 100))

              return (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                        {item.orbit_regime} • {item.altitude_km} KM
                      </span>
                      <span className="text-[10px] text-slate-500">
                        INCL: {item.inclination_deg}°
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {item.name}
                      </h3>
                      <div className="text-xs text-cyan-400 mt-0.5 font-bold">
                        {item.operator}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-2">
                      {item.primary_mission}
                    </p>

                    {/* Deployment Progress Bar */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">DEPLOYMENT STATUS</span>
                        <span className="text-white font-bold">{pct}% ({item.deployed_count.toLocaleString()} / {item.authorized_count.toLocaleString()})</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Spectrum Badges */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {(item.spectrum_bands || []).map((band: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400"
                        >
                          {band}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {item.status}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      FCC LICENSED
                    </span>
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
