"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { 
  ShieldCheck, 
  Briefcase, 
  Building2, 
  Layers, 
  GitBranch, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign,
  ChevronDown,
  ChevronRight,
  ArrowRight
} from "lucide-react"

interface SubcontractorNode {
  tier: number
  company: string
  subsystem: string
  value_m: number
}

interface ContractRecord {
  id: string
  program_name: string
  contract_number: string
  prime_contractor: string
  command_agency: string
  contract_type: string
  obligation_value_m: number
  award_date: string
  completion_date: string
  description: string
  subcontract_tree: SubcontractorNode[]
  status: string
}

export default function ContractsRadarPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null)

  useEffect(() => {
    async function loadContracts() {
      const { data, error } = await supabase
        .from("defense_contracts")
        .select("*")
        .order("obligation_value_m", { ascending: false })

      if (!error && data) {
        setContracts(data as ContractRecord[])
        if (data.length > 0) {
          setExpandedContractId(data[0].id)
        }
      }
      setLoading(false)
    }

    loadContracts()
  }, [])

  const filteredContracts = contracts.filter((c) => {
    const matchesType = selectedType === "ALL" || c.contract_type === selectedType
    const matchesSearch =
      c.program_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.prime_contractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.command_agency.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const totalObligations = contracts.reduce((acc, c) => acc + Number(c.obligation_value_m), 0)

  const exportContractsCSV = () => {
    const headers = "Program,Contract_Number,Prime_Contractor,Agency,Type,Obligation_M,Award_Date,Completion_Date,Status\n"
    const rows = filteredContracts.map(c => 
      `"${c.program_name}","${c.contract_number}","${c.prime_contractor}","${c.command_agency}","${c.contract_type}",${c.obligation_value_m},"${c.award_date}","${c.completion_date}","${c.status}"`
    ).join("\n")

    const blob = new Blob([headers + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-defense-contracts-radar.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
              DoD &amp; IC Defense Procurement Intelligence Desk
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              DEFENSE CONTRACTS &amp; FLOW-DOWN RADAR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Track major federal aerospace defense prime awards, multi-year obligations, contracting commands, and multi-tier supplier flow-down capital distributions.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportContractsCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT OBLIGATION MATRIX
            </button>
          </div>
        </div>

        {/* Top KPI Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> TOTAL PRIME OBLIGATIONS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400">
              ${(totalObligations / 1000).toFixed(2)}B
            </div>
            <div className="text-[10px] text-slate-500">Indexed DoD/NASA Programs</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" /> ACTIVE MAJOR CONTRACTS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{contracts.length} AWARDS</div>
            <div className="text-[10px] text-slate-500">Multi-Year Period of Performance</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" /> SUBCONTRACT PASS-THROUGH
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">TIER-1 &amp; TIER-2</div>
            <div className="text-[10px] text-slate-500">Subsystem Flow-Down Trace</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" /> CONTRACTING COMMANDS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">USSF • SDA • NASA</div>
            <div className="text-[10px] text-slate-500">Defense &amp; Civil Architecture</div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {["ALL", "OTA", "IDIQ", "FIRM_FIXED_PRICE", "COST_PLUS"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                  selectedType === type
                    ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search program, prime, or agency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>
        </div>

        {/* Contract Feed & Subcontract Tree */}
        {loading ? (
          <div className="p-16 text-center font-mono text-xs text-slate-500">
            QUERYING DEFENSE PROCUREMENT REGISTRIES...
          </div>
        ) : (
          <div className="space-y-4 font-mono text-xs">
            {filteredContracts.map((c) => {
              const isExpanded = expandedContractId === c.id
              const subTree = c.subcontract_tree || []
              const totalSubValue = subTree.reduce((acc, sub) => acc + Number(sub.value_m || 0), 0)

              return (
                <div
                  key={c.id}
                  className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden transition-all hover:border-slate-700"
                >
                  {/* Primary Row Header */}
                  <div
                    onClick={() => setExpandedContractId(isExpanded ? null : c.id)}
                    className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                            {c.contract_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-slate-500 text-[11px]">{c.contract_number}</span>
                        </div>
                        <h3 className="text-lg font-black text-white">{c.program_name}</h3>
                        <div className="text-slate-400 text-xs flex items-center gap-3">
                          <span>Prime: <strong className="text-white">{c.prime_contractor}</strong></span>
                          <span>•</span>
                          <span>Agency: <strong className="text-slate-300">{c.command_agency}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                      <div className="text-2xl font-black text-cyan-400">
                        ${Number(c.obligation_value_m).toLocaleString()}M
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(c.award_date).getFullYear()} – {new Date(c.completion_date).getFullYear()}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Subcontractor Tree & Program Details */}
                  {isExpanded && (
                    <div className="p-6 pt-0 border-t border-slate-800/80 bg-slate-950/40 space-y-6">
                      <p className="text-slate-300 text-xs font-sans leading-relaxed pt-4">
                        {c.description}
                      </p>

                      {/* Subcontractor Flow-Down Nodes */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                          <span className="font-bold uppercase flex items-center gap-1.5 text-white">
                            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                            Subcontractor Architecture &amp; Subsystem Flow-Down
                          </span>
                          <span>IDENTIFIED SUBCONTRACT VALUE: ${totalSubValue.toFixed(1)}M</span>
                        </div>

                        {subTree.length === 0 ? (
                          <div className="text-slate-500 text-xs italic py-2">
                            Direct prime execution or classified subsystem distribution.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {subTree.map((sub, idx) => (
                              <div
                                key={idx}
                                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      sub.tier === 1
                                        ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                                        : "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                    }`}>
                                      TIER-{sub.tier}
                                    </span>
                                    <span className="font-bold text-white text-xs">{sub.company}</span>
                                  </div>
                                  <span className="text-cyan-400 font-bold text-xs">${sub.value_m}M</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-sans">
                                  Subsystem: <strong className="text-slate-300">{sub.subsystem}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
