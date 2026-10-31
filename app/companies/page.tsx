"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { AEROSPACE_COMPANIES } from "@/lib/companyData"
import { 
  Building2, 
  Search, 
  ShieldCheck, 
  Rocket, 
  ArrowRight, 
  DollarSign, 
  Layers, 
  Award,
  Globe
} from "lucide-react"

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTier, setSelectedTier] = useState<string>("All")

  const tiers = [
    "All",
    "Prime / Heavy Launch",
    "SmallSat Bus / Payload",
    "SAR & Earth Observation",
    "In-Space Servicing (ISAM)"
  ]

  const filteredCompanies = useMemo(() => {
    return Object.values(AEROSPACE_COMPANIES).filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.hq.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.summary.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTier = selectedTier === "All" || c.tier === selectedTier
      return matchesSearch && matchesTier
    })
  }, [searchQuery, selectedTier])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Institutional Aerospace &amp; Defense Prime Registry
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              AEROSPACE INTELLIGENCE
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Commercial launch providers, satellite bus manufacturers, optical/SAR constellation operators, and defense contractors. Inspect active DoD/NASA program awards and simulate their spacecraft platforms directly in Veroyx.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
              {Object.keys(AEROSPACE_COMPANIES).length} ACTIVE DOSSIERS
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between font-mono text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search companies by name, program, or headquarters..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px]">
            {tiers.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  selectedTier === t
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Company Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {filteredCompanies.map(c => (
            <Link
              key={c.slug}
              href={`/companies/${c.slug}`}
              className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/70 transition-all flex flex-col justify-between space-y-6 group cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                      {c.tier}
                    </span>
                    <h2 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors mt-0.5">
                      {c.name}
                    </h2>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {c.hq} &middot; Est. {c.founded} {c.ticker && `· ${c.ticker}`}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                    {c.valuationOrCap}
                  </span>
                </div>

                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  {c.summary}
                </p>

                {/* Primary Platforms Strip */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1.5">
                    <Rocket className="w-3 h-3 text-cyan-400" /> Key Flight Platforms
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.primaryPlatforms.map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-300">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between text-cyan-400 border-t border-slate-800/60 text-[11px]">
                <span className="font-bold">INSPECT TECHNICAL DOSSIER</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
