"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Scale, Plus, X, Download, ShieldCheck, DollarSign, MapPin, Building, Cpu, Orbit } from "lucide-react"

export default function ComparePage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompanies() {
      const { data } = await supabase
        .from("companies")
        .select("*, technologies(*), grants(*)")
        .order("name", { ascending: true })

      if (data) {
        setCompanies(data)
        // Default selection: pick first 2 primes
        if (data.length >= 2) {
          setSelectedIds([data[0].id, data[1].id])
        }
      }
      setLoading(false)
    }
    loadCompanies()
  }, [])

  const selectedCompanies = companies.filter((c) => selectedIds.includes(c.id))

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id))
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id])
      }
    }
  }

  const exportMatrix = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Metric," + selectedCompanies.map((c) => `"${c.name}"`).join(",")].concat([
        "Sector," + selectedCompanies.map((c) => `"${c.sector || 'Commercial Prime'}"`).join(","),
        "Capital Raised," + selectedCompanies.map((c) => `"${c.funding_total || 'Confidential'}"`).join(","),
        "Operational HQ," + selectedCompanies.map((c) => `"${c.hq_location || 'United States'}"`).join(","),
        "Stage," + selectedCompanies.map((c) => `"${c.stage || 'Scale'}"`).join(","),
        "Hardware Lines," + selectedCompanies.map((c) => c.technologies?.length || 0).join(","),
        "Federal Awards," + selectedCompanies.map((c) => c.grants?.length || 0).join(","),
      ]).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `veroyx-comparative-matrix.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-3 text-cyan-400">
          <Scale className="w-5 h-5 animate-pulse" />
          <span>INITIALIZING COMPARATIVE MATRIX TELEMETRY...</span>
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
              <Scale className="w-3.5 h-3.5" />
              Intelligence Briefing Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              COMPARATIVE MATRIX
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Side-by-side institutional telemetry diff. Contrast capital structure, technological readiness levels (TRL), and public procurement awards.
            </p>
          </div>

          <button
            onClick={exportMatrix}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-xs font-mono text-cyan-400 font-bold tracking-wider transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            EXPORT MATRIX (CSV)
          </button>
        </div>

        {/* Entity Selector Ribbon */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>SELECT ENTITIES (MAX 3):</span>
            <span className="text-cyan-400 font-bold">{selectedIds.length} / 3 SELECTED</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {companies.map((c) => {
              const active = selectedIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-2 border ${
                    active
                      ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {active ? <X className="w-3.5 h-3.5 text-cyan-400" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Comparative Diff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {selectedCompanies.map((c) => (
            <div
              key={c.id}
              className="rounded-xl bg-slate-900/40 border border-slate-800 p-6 flex flex-col justify-between space-y-6 hover:border-cyan-500/30 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    {c.sector || "Prime Contractor"}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{c.stage || "Growth"}</span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight">{c.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 mt-2 leading-relaxed">{c.description}</p>
                </div>
              </div>

              {/* Metrics Matrix Table */}
              <div className="space-y-3 pt-4 border-t border-slate-800 font-mono text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Capital
                  </span>
                  <span className="font-bold text-white">{c.funding_total || "Confidential"}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> HQ
                  </span>
                  <span className="text-slate-200">{c.hq_location || "United States"}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" /> Hardware Lines
                  </span>
                  <span className="font-bold text-cyan-400">{c.technologies?.length || 0} Systems</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Federal Awards
                  </span>
                  <span className="font-bold text-emerald-400">{c.grants?.length || 0} Contracts</span>
                </div>
              </div>

              {/* Systems & Contracts Breakdown */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  Indexed Systems & Missions:
                </div>
                <div className="space-y-1.5">
                  {c.technologies && c.technologies.length > 0 ? (
                    c.technologies.slice(0, 3).map((t: any) => (
                      <div
                        key={t.id}
                        className="px-2.5 py-1.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] font-mono flex justify-between items-center text-slate-300"
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="text-cyan-400 text-[10px] shrink-0 font-bold ml-2">TRL {t.trl || 7}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] font-mono text-slate-600 italic">No public systems indexed</div>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
