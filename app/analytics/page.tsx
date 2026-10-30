'use client'

import { useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts'
import { TrendingUp, ShieldAlert, DollarSign, Cpu, ArrowUpRight } from 'lucide-react'

// Prime Federal Contract Allocation Data ($ Millions)
const primeContractData = [
  { name: 'SpaceX', value: 4400, color: '#06b6d4' },
  { name: 'Blue Origin', value: 3400, color: '#3b82f6' },
  { name: 'Axiom Space', value: 1260, color: '#8b5cf6' },
  { name: 'Rocket Lab', value: 515, color: '#10b981' },
  { name: 'Sierra Space', value: 450, color: '#f59e0b' },
  { name: 'ULA', value: 1100, color: '#ec4899' },
]

// Sector Capital Flow: Venture vs Federal ($ Billions)
const sectorCapitalData = [
  { sector: 'Launch Vehicles', venture: 12.4, federal: 18.2 },
  { sector: 'Commercial Habitats', venture: 2.1, federal: 4.8 },
  { sector: 'In-Space Servicing', venture: 1.8, federal: 1.2 },
  { sector: 'Satellite Megas', venture: 16.5, federal: 6.4 },
  { sector: 'Lunar Logistics', venture: 1.2, federal: 5.6 },
]

// TRL Distribution across Sectors
const trlData = [
  { trl: 'TRL 1-3 (Concept)', count: 14 },
  { trl: 'TRL 4-6 (Prototypes)', count: 32 },
  { trl: 'TRL 7-8 (Demonstrated)', count: 48 },
  { trl: 'TRL 9 (Flight Proven)', count: 65 },
]

export default function AnalyticsPage() {
  const [activeMetric, setActiveMetric] = useState('federal')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Telemetry */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Macro Capital Telemetry
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white font-mono">
              SPACE MARKET RADAR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Cross-sector financial telemetry tracking public contract awards, venture capitalization, and hardware maturity.
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-500">INDEX FREQUENCY:</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">DAILY EDGE SYNC</span>
          </div>
        </div>

        {/* Metric Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>TRACKED FEDERAL AWARDS</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">$36.2B</div>
            <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +14.2% YoY DoD/NASA
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>ACTIVE PRIMES INDEXED</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">159</div>
            <div className="text-[11px] font-mono text-cyan-400 mt-1">Tier-1 & Tier-2 Providers</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>AVERAGE ECOSYSTEM TRL</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">TRL 7.4</div>
            <div className="text-[11px] font-mono text-purple-400 mt-1">Flight Demonstration Phase</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>ACTIVE LEO MANIFESTS</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">24 Flights</div>
            <div className="text-[11px] font-mono text-amber-400 mt-1">Scheduled next 90 days</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Federal Contract Allocations */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold font-mono text-white">Prime Contractor Federal Deployments</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">Artemis, HLS & Commercial LEO Destinations ($M)</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={primeContractData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke="#cbd5e1" tick={{ fontSize: 11, fontFamily: 'monospace' }} width={85} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => [`$${val} Million`, 'Contract Value']}
                  />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Venture vs Federal Inflows */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold font-mono text-white">Venture Capital vs Federal Procurement</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">Capital inflow comparisons by sector ($B)</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorCapitalData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="sector" stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `$${v}B`} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => [`$${val} Billion`]}
                  />
                  <Bar dataKey="federal" name="Federal Allocations" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="venture" name="Venture Funding" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* TRL Technology Readiness Overview */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <h3 className="text-lg font-bold font-mono text-white mb-2">Technology Readiness Level (TRL) Dispersion</h3>
          <p className="text-xs text-slate-400 font-mono mb-6">Maturity distribution of active proprietary architectures in the Veroyx index</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {trlData.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-xs font-mono text-slate-400">{item.trl}</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">{item.count} Systems</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full rounded-full" 
                    style={{ width: `${(item.count / 65) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
