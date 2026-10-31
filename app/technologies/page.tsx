"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { AEROSPACE_TECHNOLOGIES, AerospaceTech } from "@/lib/techData"
import { 
  Cpu, 
  Search, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Award,
  Zap,
  Radio,
  Rocket,
  ShieldCheck
} from "lucide-react"

export default function TechnologiesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDomain, setSelectedDomain] = useState<string>("All")

  const domains = [
    "All",
    "Propulsion",
    "Communications",
    "Power & Energy",
    "Structures & Materials"
  ]

  const filteredTech = useMemo(() => {
    return Object.values(AEROSPACE_TECHNOLOGIES).filter(t => {
      const matchSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.governingStandard.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.summary.toLowerCase().includes(searchQuery.toLowerCase())
      const matchDomain = selectedDomain === "All" || t.domain === selectedDomain
      return matchSearch && matchDomain
    })
  }, [searchQuery, selectedDomain])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Aerospace Technology Readiness (TRL) &amp; Standards Registry
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TECHNOLOGIES
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Curated library of qualified aerospace subsystems, electric propulsion thrusters, optical crosslinks, and radiation-tolerant materials. Cross-referenced to ECSS, AIAA, and NASA standard baselines.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
              {Object.keys(AEROSPACE_TECHNOLOGIES).length} TRL 9 TECHNOLOGIES
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between font-mono text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search technologies by name, governing standard, or domain..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px]">
            {domains.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDomain(d)}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  selectedDomain === d
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Technology Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {filteredTech.map(t => (
            <Link
              key={t.slug}
              href={`/technologies/${t.slug}`}
              className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/70 transition-all flex flex-col justify-between space-y-6 group cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                      {t.domain}
                    </span>
                    <h2 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors mt-0.5">
                      {t.name}
                    </h2>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      STANDARD: {t.governingStandard}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    TRL {t.trl}
                  </span>
                </div>

                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  {t.summary}
                </p>

                {/* Key Specs Teaser */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px]">
                  {Object.entries(t.specifications).slice(0, 2).map(([k, v], idx) => (
                    <div key={idx}>
                      <span className="text-slate-500 block uppercase truncate">{k}</span>
                      <strong className="text-white truncate block">{v}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between text-cyan-400 border-t border-slate-800/60 text-[11px]">
                <span className="font-bold">INSPECT SPECIFICATIONS &amp; SIMULATE</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
