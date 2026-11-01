"use client"

import { useState } from "react"
import { 
  Search, 
  Briefcase, 
  DollarSign, 
  ShieldCheck, 
  AlertOctagon, 
  Activity,
  FileText,
  TrendingDown,
  Clock
} from "lucide-react"

interface MissionContract {
  id: string
  client: string
  type: "DoD" | "CIVIL" | "COMMERCIAL"
  valueM: number
  burnRatePct: number
  slaUptime: number
  slaStatus: "NOMINAL" | "WARNING" | "BREACH"
  endDate: string
}

const CONTRACT_DATA: MissionContract[] = [
  { id: "SDA-TR-26A", client: "U.S. Space Force", type: "DoD", valueM: 145.5, burnRatePct: 42.5, slaUptime: 99.99, slaStatus: "NOMINAL", endDate: "2028-11-01" },
  { id: "JPL-EO-09", client: "NASA JPL", type: "CIVIL", valueM: 85.0, burnRatePct: 88.2, slaUptime: 99.95, slaStatus: "WARNING", endDate: "2027-02-15" },
  { id: "NRO-L-112", client: "National Reconnaissance Office", type: "DoD", valueM: 320.0, burnRatePct: 15.0, slaUptime: 100.0, slaStatus: "NOMINAL", endDate: "2031-05-30" },
  { id: "NOAA-WX-3", client: "NOAA", type: "CIVIL", valueM: 65.2, burnRatePct: 95.5, slaUptime: 98.40, slaStatus: "BREACH", endDate: "2026-12-01" },
  { id: "MAX-SAR-1", client: "Maxar Technologies", type: "COMMERCIAL", valueM: 45.0, burnRatePct: 30.1, slaUptime: 99.9, slaStatus: "NOMINAL", endDate: "2029-08-20" }
]

export default function ContractsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredContracts = CONTRACT_DATA.filter(c => 
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.client.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getSlaColor = (status: MissionContract["slaStatus"]) => {
    switch (status) {
      case "NOMINAL": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      case "WARNING": return "text-amber-400 bg-amber-400/10 border-amber-400/20"
      case "BREACH": return "text-rose-400 bg-rose-400/10 border-rose-400/20 animate-pulse"
    }
  }

  const getTypeColor = (type: MissionContract["type"]) => {
    switch (type) {
      case "DoD": return "text-indigo-400 border-indigo-400/30"
      case "CIVIL": return "text-cyan-400 border-cyan-400/30"
      case "COMMERCIAL": return "text-fuchsia-400 border-fuchsia-400/30"
    }
  }

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 overflow-y-auto bg-slate-950 font-sans text-slate-100">
      
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Briefcase className="w-6 h-6 text-emerald-400" />
            Enterprise Contracts &amp; SLA
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-2 uppercase tracking-wider">
            Financial Burn Rates &amp; Client Compliance Telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="SEARCH ID / CLIENT" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 font-mono">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="text-slate-500 text-[10px] font-bold tracking-wider flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            TOTAL ACTIVE VALUE
          </div>
          <div className="text-2xl font-black text-white">$660.7M</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="text-slate-500 text-[10px] font-bold tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            ACTIVE MISSIONS
          </div>
          <div className="text-2xl font-black text-white">5</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="text-slate-500 text-[10px] font-bold tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            DOD COMPLIANCE
          </div>
          <div className="text-2xl font-black text-emerald-400">100%</div>
        </div>
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 flex flex-col gap-2">
          <div className="text-rose-400/70 text-[10px] font-bold tracking-wider flex items-center gap-2">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            ACTIVE SLA BREACHES
          </div>
          <div className="text-2xl font-black text-rose-400">1</div>
        </div>
      </div>

      {/* Enterprise Data Grid */}
      <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-bold tracking-wider">CONTRACT ID</th>
              <th className="px-6 py-4 font-bold tracking-wider">CLIENT &amp; TYPE</th>
              <th className="px-6 py-4 font-bold tracking-wider">VALUE ($M)</th>
              <th className="px-6 py-4 font-bold tracking-wider">BUDGET BURN</th>
              <th className="px-6 py-4 font-bold tracking-wider">SLA UPTIME</th>
              <th className="px-6 py-4 font-bold tracking-wider">SLA STATUS</th>
              <th className="px-6 py-4 font-bold tracking-wider">END DATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredContracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  {contract.id}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-200">{contract.client}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border w-fit ${getTypeColor(contract.type)}`}>
                      {contract.type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300 font-bold">${contract.valueM.toFixed(1)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className={contract.burnRatePct > 90 ? "text-rose-400 font-bold w-8" : "text-slate-300 w-8"}>
                      {contract.burnRatePct}%
                    </span>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${contract.burnRatePct > 90 ? "bg-rose-500" : "bg-emerald-500"}`} 
                        style={{ width: `${contract.burnRatePct}%` }} 
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={contract.slaUptime < 99.0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                    {contract.slaUptime.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded border font-bold text-[10px] w-fit ${getSlaColor(contract.slaStatus)}`}>
                    {contract.slaStatus}
                  </span>
                </td>
                <td className="px-6 py-4 flex items-center gap-2 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {contract.endDate}
                </td>
              </tr>
            ))}
            
            {filteredContracts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  NO CONTRACTS MATCHING CRITERIA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
