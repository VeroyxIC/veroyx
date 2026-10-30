"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { 
  Flame, 
  Cpu, 
  Gauge, 
  TrendingUp, 
  Download, 
  Filter, 
  Search, 
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react"

export default function PropulsionMatrixPage() {
  const [engines, setEngines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [propellantFilter, setPropellantFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchEngines() {
      const { data, error } = await supabase
        .from("propulsion_engines")
        .select("*")
        .order("thrust_vacuum_kn", { ascending: false })

      if (!error && data) {
        setEngines(data)
      }
      setLoading(false)
    }

    fetchEngines()
  }, [])

  const filtered = engines.filter((e) => {
    const matchesProp = propellantFilter === "ALL" || e.propellants.toLowerCase().includes(propellantFilter.toLowerCase())
    const matchesQuery =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.cycle.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesProp && matchesQuery
  })

  const exportCSV = () => {
    const headers = "Name,Manufacturer,Propellants,Cycle,Thrust_Vac_kN,Isp_Vac_s,ChamberPressure_bar,TWR,Status\n"
    const rows = filtered.map(e => 
      `"${e.name}","${e.manufacturer}","${e.propellants}","${e.cycle}",${e.thrust_vacuum_kn},${e.isp_vacuum_s},${e.chamber_pressure_bar},${e.thrust_to_weight || "N/A"},"${e.status}"`
    ).join("\n")
    const blob = new Blob([headers + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-propulsion-matrix.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              Thermodynamic Combustion & Cycle Architecture Registry
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              PROPULSION ENGINE MATRIX
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Institutional benchmark indexing specific impulse (Isp), chamber pressure (Pc), thrust-to-weight ratios, and power cycle thermodynamics across sovereign and commercial rocket engines.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT CSV SPEC SHEET
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {["ALL", "Methalox", "Kerolox", "Hydrolox"].map((prop) => (
              <button
                key={prop}
                onClick={() => setPropellantFilter(prop)}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                  propellantFilter === prop
                    ? "bg-amber-950 border-amber-500/50 text-amber-300 font-bold"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {prop}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter by engine, builder, or cycle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>
        </div>

        {/* High-Density Engine Table */}
        {loading ? (
          <div className="p-16 text-center font-mono text-xs text-slate-500">
            POLLING THERMODYNAMIC PROPULSION REGISTRIES...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ENGINE / PRIME</th>
                  <th className="py-3.5 px-4">CHEMISTRY</th>
                  <th className="py-3.5 px-4">CYCLE ARCHITECTURE</th>
                  <th className="py-3.5 px-4 text-right">VAC THRUST</th>
                  <th className="py-3.5 px-4 text-right">VAC ISP</th>
                  <th className="py-3.5 px-4 text-right">P_CHAMBER</th>
                  <th className="py-3.5 px-4 text-right">TWR</th>
                  <th className="py-3.5 px-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((eng) => (
                  <tr key={eng.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-sm">{eng.name}</div>
                      <div className="text-[11px] text-amber-400 mt-0.5">{eng.manufacturer}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                        {eng.propellants}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 text-[11px]">
                      {eng.cycle}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-cyan-400">
                      {Number(eng.thrust_vacuum_kn).toLocaleString()} kN
                    </td>
                    <td className="py-4 px-4 text-right font-black text-emerald-400">
                      {eng.isp_vacuum_s} s
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-purple-400">
                      {eng.chamber_pressure_bar} bar
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-200">
                      {eng.thrust_to_weight ? `${eng.thrust_to_weight}:1` : "N/A"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 uppercase">
                        {eng.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cycle Thermodynamics Callout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-amber-400 font-bold flex items-center gap-1.5 uppercase">
              <Zap className="w-3.5 h-3.5" /> Full-Flow Staged Combustion
            </div>
            <p className="text-slate-400 text-[11px] font-sans leading-relaxed">
              Dual preburners vaporize 100% of propellants into gaseous phases before injector entry. Maximizes combustion efficiency and mass flow, enabling extreme chamber pressures (&gt;300 bar).
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5 uppercase">
              <Gauge className="w-3.5 h-3.5" /> Oxidizer-Rich Staged (ORSC)
            </div>
            <p className="text-slate-400 text-[11px] font-sans leading-relaxed">
              All oxidizer passes through the preburner with a fraction of fuel. Requires proprietary exotic superalloys to prevent hot, high-pressure gaseous oxygen from burning turbine blades.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-purple-400 font-bold flex items-center gap-1.5 uppercase">
              <Cpu className="w-3.5 h-3.5" /> Electric Pump-Fed
            </div>
            <p className="text-slate-400 text-[11px] font-sans leading-relaxed">
              Eliminates complex turbomachinery entirely by utilizing high-discharge lithium-polymer battery packs and brushless DC electric motors to drive propellant boost pumps.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
