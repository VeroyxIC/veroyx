"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Cpu, 
  Rocket, 
  PieChart, 
  Layers, 
  ArrowUpRight,
  Download
} from "lucide-react"

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalTechnologies: 0,
    totalGrants: 0,
    totalLaunches: 0,
    totalGrantValue: 0,
    trlDistribution: {} as Record<number, number>,
    sectorCounts: {} as Record<string, number>,
    agencyCounts: {} as Record<string, number>,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMacroTelemetry() {
      const [
        { data: companies },
        { data: technologies },
        { data: grants },
        { data: launches }
      ] = await Promise.all([
        supabase.from("companies").select("*"),
        supabase.from("technologies").select("*"),
        supabase.from("grants").select("*"),
        supabase.from("launches").select("*")
      ])

      // Calculate aggregate grant value
      const totalGrantValue = (grants || []).reduce((acc, g) => acc + (Number(g.amount) || 0), 0)

      // Calculate TRL distribution
      const trlMap: Record<number, number> = {}
      ;(technologies || []).forEach(t => {
        const trl = t.trl || 7
        trlMap[trl] = (trlMap[trl] || 0) + 1
      })

      // Sector distribution
      const sectorMap: Record<string, number> = {}
      ;(companies || []).forEach(c => {
        const sector = c.sector || "Space Infrastructure"
        sectorMap[sector] = (sectorMap[sector] || 0) + 1
      })

      // Awarding Agency distribution
      const agencyMap: Record<string, number> = {}
      ;(grants || []).forEach(g => {
        const agency = g.awarding_agency || "DoD / NASA"
        agencyMap[agency] = (agencyMap[agency] || 0) + 1
      })

      setStats({
        totalCompanies: companies?.length || 0,
        totalTechnologies: technologies?.length || 0,
        totalGrants: grants?.length || 0,
        totalLaunches: launches?.length || 0,
        totalGrantValue,
        trlDistribution: trlMap,
        sectorCounts: sectorMap,
        agencyCounts: agencyMap,
      })
      setLoading(false)
    }

    loadMacroTelemetry()
  }, [])

  const exportMacroReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      macro_kpis: {
        indexed_primes: stats.totalCompanies,
        hardware_systems: stats.totalTechnologies,
        procurement_awards: stats.totalGrants,
        total_contract_obligations_usd: stats.totalGrantValue,
        active_launch_manifests: stats.totalLaunches,
      },
      trl_maturity_curve: stats.trlDistribution,
      sector_density: stats.sectorCounts,
      agency_procurement_split: stats.agencyCounts,
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2))
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `veroyx-macro-space-intelligence-${new Date().toISOString().split("T")[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-3 text-cyan-400">
          <BarChart3 className="w-5 h-5 animate-pulse" />
          <span>COMPILING MACRO AEROSPACE TELEMETRY ARRAYS...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header and Controls */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              Institutional Macro Deck
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              CAPITAL & FLIGHT ANALYTICS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Consolidated intelligence metrics indexing commercial capital allocation, federal procurement obligations, hardware readiness maturity, and active launch cadence.
            </p>
          </div>

          <button
            onClick={exportMacroReport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-xs font-mono text-cyan-400 font-bold tracking-wider transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            EXPORT MACRO BRIEFING (JSON)
          </button>
        </div>

        {/* Macro KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Tracked Procurement Obligations
            </div>
            <div className="text-3xl font-black text-emerald-400">
              ${(stats.totalGrantValue / 1000000).toFixed(1)}M
            </div>
            <div className="text-[10px] text-slate-500">
              Across {stats.totalGrants} recorded federal awards
            </div>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-cyan-400" />
              Aerospace Primes Indexed
            </div>
            <div className="text-3xl font-black text-white">
              {stats.totalCompanies}
            </div>
            <div className="text-[10px] text-slate-500">
              100% verified commercial & defense entities
            </div>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-purple-400" />
              Orbital Hardware Systems
            </div>
            <div className="text-3xl font-black text-cyan-400">
              {stats.totalTechnologies}
            </div>
            <div className="text-[10px] text-slate-500">
              Flight-proven and active TRL pipeline
            </div>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
              <Rocket className="w-4 h-4 text-blue-400" />
              Active Launch Manifests
            </div>
            <div className="text-3xl font-black text-blue-400">
              {stats.totalLaunches}
            </div>
            <div className="text-[10px] text-slate-500">
              Scheduled orbital flights on radar
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">

          {/* Technological Readiness Level (TRL) Curve */}
          <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono text-base font-bold text-white tracking-wide">
                  TRL MATURITY DISTRIBUTION (1 - 9)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">NASA / DoD Scale</span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {[9, 8, 7, 6, 5, 4].map((trl) => {
                const count = stats.trlDistribution[trl] || 0
                const percent = stats.totalTechnologies > 0 ? (count / stats.totalTechnologies) * 100 : 0
                return (
                  <div key={trl} className="space-y-1.5">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>TRL {trl} • {trl >= 8 ? "Flight Proven" : trl >= 6 ? "Demonstration" : "Development"}</span>
                      <span className="text-cyan-400 font-bold">{count} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sector Density Distribution */}
          <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                <h3 className="font-mono text-base font-bold text-white tracking-wide">
                  SECTOR ALLOCATION BREAKDOWN
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Commercial Footprint</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {Object.entries(stats.sectorCounts).map(([sector, count]) => {
                const percent = stats.totalCompanies > 0 ? (count / stats.totalCompanies) * 100 : 0
                return (
                  <div
                    key={sector}
                    className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span className="text-slate-300">{sector}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{percent.toFixed(0)}%</span>
                      <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 font-bold">
                        {count} Primes
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
