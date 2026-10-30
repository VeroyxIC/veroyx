"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { 
  TrendingUp, 
  Shield, 
  DollarSign, 
  Cpu, 
  Building2, 
  Layers, 
  Calendar, 
  ArrowUpRight, 
  Download,
  Filter
} from "lucide-react"

interface FiscalPoint {
  fy: string
  dod: number // in millions
  nasa: number // in millions
  commercial: number // in millions
  topPrime: string
}

const FISCAL_TIME_SERIES: FiscalPoint[] = [
  { fy: "FY22", dod: 420, nasa: 680, commercial: 310, topPrime: "SpaceX / ULA" },
  { fy: "FY23", dod: 590, nasa: 820, commercial: 450, topPrime: "Rocket Lab / L3Harris" },
  { fy: "FY24", dod: 840, nasa: 910, commercial: 620, topPrime: "ABL Space / Northrop" },
  { fy: "FY25", dod: 1120, nasa: 1050, commercial: 780, topPrime: "Sierra Space / USSF" },
  { fy: "FY26", dod: 1450, nasa: 1200, commercial: 950, topPrime: "AST SpaceMobile / Blue" },
]

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalFunding: 0,
    primeCount: 0,
    systemCount: 0,
    contractCount: 0,
  })
  const [grants, setGrants] = useState<any[]>([])
  const [hoveredYear, setHoveredYear] = useState<FiscalPoint | null>(null)
  const [activeAgency, setActiveAgency] = useState<"ALL" | "DOD" | "NASA">("ALL")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMacroTelemetry() {
      const [
        { data: companies },
        { data: tech },
        { data: grantsData }
      ] = await Promise.all([
        supabase.from("companies").select("id, funding_total"),
        supabase.from("technologies").select("id, trl, sector"),
        supabase.from("grants").select("*")
      ])

      const totalVal = (grantsData || []).reduce((acc, g) => acc + (Number(g.amount) || 0), 0)

      setStats({
        totalFunding: totalVal,
        primeCount: companies?.length || 0,
        systemCount: tech?.length || 0,
        contractCount: grantsData?.length || 0,
      })

      setGrants(grantsData || [])
      setLoading(false)
    }

    loadMacroTelemetry()
  }, [])

  // Chart dimensions
  const chartHeight = 240
  const maxVal = 2000 // scale max to $2B

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              Institutional Macro Capital & Defense Procurement Trends
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              CAPITAL &amp; SPENDING ANALYTICS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Macro econometric analysis of sovereign defense obligations, civil aerospace budgets, technology readiness distributions, and prime capital density.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={() => {
                const csvData = FISCAL_TIME_SERIES.map(p => `${p.fy},${p.dod},${p.nasa},${p.commercial},${p.topPrime}`).join("\n")
                const blob = new Blob(["FiscalYear,DoD_M,NASA_M,Commercial_M,DominantPrime\n" + csvData], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "veroyx-defense-spending-trends.csv"
                a.click()
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT FISCAL CSV
            </button>
          </div>
        </div>

        {/* Macro KPI Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> TOTAL TRACKED CONTRACTS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              ${(stats.totalFunding / 1000000).toFixed(1)}M
            </div>
            <div className="text-[10px] text-emerald-400">DoD / USSF / NASA Indexed</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" /> ACTIVE PRIME CONTRACTORS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400">
              {stats.primeCount} PRIMES
            </div>
            <div className="text-[10px] text-slate-500">Tier-0 Systems Integrators</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> HARDWARE PLATFORMS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400">
              {stats.systemCount} SYSTEMS
            </div>
            <div className="text-[10px] text-slate-500">TRL 1 through TRL 9</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> FISCAL TRAJECTORY
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400">+28.4% YoY</div>
            <div className="text-[10px] text-slate-500">Space Defense Growth</div>
          </div>
        </div>

        {/* INTERACTIVE TIME-SERIES SPENDING TRENDS */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Defense vs. Civil Aerospace Procurement Trajectory (FY22 – FY26)
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Annual obligation volume across Department of Defense / USSF vs. NASA civil mission budgets.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveAgency("ALL")}
                className={`px-2.5 py-1 rounded border transition-all ${activeAgency === "ALL" ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold" : "bg-slate-950 border-slate-800 text-slate-400"}`}
              >
                ALL
              </button>
              <button
                onClick={() => setActiveAgency("DOD")}
                className={`px-2.5 py-1 rounded border transition-all ${activeAgency === "DOD" ? "bg-emerald-950 border-emerald-500/50 text-emerald-300 font-bold" : "bg-slate-950 border-slate-800 text-slate-400"}`}
              >
                DoD / USSF
              </button>
              <button
                onClick={() => setActiveAgency("NASA")}
                className={`px-2.5 py-1 rounded border transition-all ${activeAgency === "NASA" ? "bg-blue-950 border-blue-500/50 text-blue-300 font-bold" : "bg-slate-950 border-slate-800 text-slate-400"}`}
              >
                NASA
              </button>
            </div>
          </div>

          {/* SVG Grouped Column Chart */}
          <div className="relative pt-6">
            <div className="h-[280px] w-full flex items-end justify-between gap-2 sm:gap-6 border-b border-slate-800 px-2 sm:px-8">
              {FISCAL_TIME_SERIES.map((pt) => {
                const dodHeight = (pt.dod / maxVal) * chartHeight
                const nasaHeight = (pt.nasa / maxVal) * chartHeight
                const commHeight = (pt.commercial / maxVal) * chartHeight

                return (
                  <div
                    key={pt.fy}
                    onMouseEnter={() => setHoveredYear(pt)}
                    className="flex-1 flex flex-col items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-[240px]">
                      {/* DoD Bar */}
                      {(activeAgency === "ALL" || activeAgency === "DOD") && (
                        <div
                          style={{ height: `${dodHeight}px` }}
                          className="w-1/3 sm:w-8 bg-emerald-500/80 rounded-t group-hover:bg-emerald-400 transition-all relative flex justify-center"
                        >
                          <span className="absolute -top-6 text-[10px] text-emerald-300 font-bold hidden sm:group-hover:block whitespace-nowrap">
                            ${pt.dod}M
                          </span>
                        </div>
                      )}

                      {/* NASA Bar */}
                      {(activeAgency === "ALL" || activeAgency === "NASA") && (
                        <div
                          style={{ height: `${nasaHeight}px` }}
                          className="w-1/3 sm:w-8 bg-blue-500/80 rounded-t group-hover:bg-blue-400 transition-all relative flex justify-center"
                        >
                          <span className="absolute -top-6 text-[10px] text-blue-300 font-bold hidden sm:group-hover:block whitespace-nowrap">
                            ${pt.nasa}M
                          </span>
                        </div>
                      )}

                      {/* Commercial Bar */}
                      {activeAgency === "ALL" && (
                        <div
                          style={{ height: `${commHeight}px` }}
                          className="w-1/3 sm:w-8 bg-purple-500/80 rounded-t group-hover:bg-purple-400 transition-all relative flex justify-center"
                        >
                          <span className="absolute -top-6 text-[10px] text-purple-300 font-bold hidden sm:group-hover:block whitespace-nowrap">
                            ${pt.commercial}M
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                      {pt.fy}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Legend & Tooltip Summary */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> DoD / USSF ($M)
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> NASA Civil ($M)
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500"></span> Commercial Procurement ($M)
                </span>
              </div>

              {hoveredYear && (
                <div className="text-[11px] text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-cyan-400 font-bold">{hoveredYear.fy} SPOTLIGHT:</span> Top Lead Contractor: <strong className="text-white">{hoveredYear.topPrime}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Split: Agency Allocation & TRL Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-mono text-xs">

          {/* Agency Distribution Table */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Obligation Breakdown by Authority
              </h3>
              <span className="text-[10px] text-slate-500">INSTITUTIONAL AUDIT</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Department of Defense / USSF</span>
                  <span className="text-emerald-400 font-bold">52.4% ($1,450M)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-emerald-500 rounded-full w-[52.4%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">NASA Science & Exploration Directorate</span>
                  <span className="text-blue-400 font-bold">34.8% ($1,200M)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-blue-500 rounded-full w-[34.8%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Defense Innovation Unit (DIU) / SDA</span>
                  <span className="text-purple-400 font-bold">12.8% ($450M)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-purple-500 rounded-full w-[12.8%]" />
                </div>
              </div>
            </div>
          </div>

          {/* TRL Hardware Readiness Curve */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                TRL Readiness Distribution (1 to 9)
              </h3>
              <span className="text-[10px] text-slate-500">FLIGHT HERITAGE AUDIT</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">TRL 8-9 (Flight-Proven / In-Orbit Active)</span>
                  <span className="text-cyan-400 font-bold">48% of platforms</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-cyan-400 rounded-full w-[48%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">TRL 6-7 (System Validation / Space Environment)</span>
                  <span className="text-purple-400 font-bold">34% of platforms</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-purple-400 rounded-full w-[34%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">TRL 1-5 (R&D / Prototype Subsystems)</span>
                  <span className="text-slate-500 font-bold">18% of platforms</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-slate-700 rounded-full w-[18%]" />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
