"use client"

import { useState } from "react"
import { 
  Search, 
  Filter, 
  Satellite, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Radio,
  MoreHorizontal,
  Crosshair
} from "lucide-react"

interface OrbitalAsset {
  noradId: string
  name: string
  regime: string
  apogeeKm: number
  perigeeKm: number
  incDeg: number
  status: "NOMINAL" | "DEGRADED" | "CRITICAL" | "LOS"
  lastContact: string
  subsystemAlert?: string
}

const FLEET_DATA: OrbitalAsset[] = [
  { noradId: "60124", name: "VXO-1 (ALPHA)", regime: "SSO", apogeeKm: 552, perigeeKm: 548, incDeg: 97.4, status: "NOMINAL", lastContact: "LIVE" },
  { noradId: "60125", name: "VXO-2 (BETA)", regime: "SSO", apogeeKm: 554, perigeeKm: 550, incDeg: 97.4, status: "NOMINAL", lastContact: "LIVE" },
  { noradId: "60126", name: "VXO-3 (GAMMA)", regime: "LEO", apogeeKm: 420, perigeeKm: 415, incDeg: 53.2, status: "DEGRADED", lastContact: "T- 4m 12s", subsystemAlert: "EPS: DoD > 40%" },
  { noradId: "60127", name: "VXO-4 (DELTA)", regime: "LEO", apogeeKm: 422, perigeeKm: 418, incDeg: 53.2, status: "CRITICAL", lastContact: "T- 1m 05s", subsystemAlert: "ADCS: SAFE HOLD" },
  { noradId: "60128", name: "VXO-5 (EPSILON)", regime: "MEO", apogeeKm: 20200, perigeeKm: 20180, incDeg: 55.0, status: "NOMINAL", lastContact: "LIVE" },
  { noradId: "60129", name: "VXO-6 (ZETA)", regime: "MEO", apogeeKm: 20210, perigeeKm: 20195, incDeg: 55.0, status: "LOS", lastContact: "T- 45m 20s", subsystemAlert: "AOS PENDING" },
  { noradId: "60130", name: "VXO-7 (ETA)", regime: "GEO", apogeeKm: 35786, perigeeKm: 35786, incDeg: 0.1, status: "NOMINAL", lastContact: "LIVE" },
]

export default function WatchlistPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRegime, setFilterRegime] = useState("ALL")

  const filteredFleet = FLEET_DATA.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || asset.noradId.includes(searchTerm)
    const matchesRegime = filterRegime === "ALL" || asset.regime === filterRegime
    return matchesSearch && matchesRegime
  })

  const getStatusColor = (status: OrbitalAsset["status"]) => {
    switch (status) {
      case "NOMINAL": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      case "DEGRADED": return "text-amber-400 bg-amber-400/10 border-amber-400/20"
      case "CRITICAL": return "text-rose-400 bg-rose-400/10 border-rose-400/20 animate-pulse"
      case "LOS": return "text-slate-400 bg-slate-400/10 border-slate-400/20"
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20"
    }
  }

  const getStatusIcon = (status: OrbitalAsset["status"]) => {
    switch (status) {
      case "NOMINAL": return <CheckCircle2 className="w-3.5 h-3.5" />
      case "DEGRADED": return <AlertTriangle className="w-3.5 h-3.5" />
      case "CRITICAL": return <Activity className="w-3.5 h-3.5" />
      case "LOS": return <Clock className="w-3.5 h-3.5" />
    }
  }

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 overflow-y-auto bg-slate-950 font-sans text-slate-100">
      
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Crosshair className="w-6 h-6 text-cyan-400" />
            Constellation Watchlist
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-2 uppercase tracking-wider">
            Active Space Domain Awareness & Fleet Telemetry Tracking
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="SEARCH NORAD ID / NAME" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs">
            {["ALL", "LEO", "SSO", "MEO", "GEO"].map(regime => (
              <button
                key={regime}
                onClick={() => setFilterRegime(regime)}
                className={`px-3 py-1 rounded transition-colors ${filterRegime === regime ? "bg-cyan-950 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
              >
                {regime}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enterprise Data Grid */}
      <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-bold tracking-wider">NORAD ID</th>
              <th className="px-6 py-4 font-bold tracking-wider">ASSET IDENTIFIER</th>
              <th className="px-6 py-4 font-bold tracking-wider">REGIME</th>
              <th className="px-6 py-4 font-bold tracking-wider">APO / PER (km)</th>
              <th className="px-6 py-4 font-bold tracking-wider">INC (&deg;)</th>
              <th className="px-6 py-4 font-bold tracking-wider">LAST CONTACT</th>
              <th className="px-6 py-4 font-bold tracking-wider">SYSTEM STATUS</th>
              <th className="px-6 py-4 font-bold tracking-wider text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredFleet.map((asset) => (
              <tr key={asset.noradId} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 text-slate-300">{asset.noradId}</td>
                <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                  <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                  {asset.name}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {asset.regime}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-300">{asset.apogeeKm} / {asset.perigeeKm}</td>
                <td className="px-6 py-4 text-slate-300">{asset.incDeg.toFixed(1)}</td>
                <td className="px-6 py-4 flex items-center gap-2 text-slate-300">
                  {asset.lastContact === "LIVE" ? (
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  {asset.lastContact}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-bold text-[10px] w-fit ${getStatusColor(asset.status)}`}>
                      {getStatusIcon(asset.status)}
                      {asset.status}
                    </span>
                    {asset.subsystemAlert && (
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {asset.subsystemAlert}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1.5 rounded text-slate-500 hover:text-cyan-400 hover:bg-cyan-950/30 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            
            {filteredFleet.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  NO ASSETS MATCHING CRITERIA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
