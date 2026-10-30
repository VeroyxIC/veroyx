'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Building2, DollarSign, Users, MapPin, Gauge, Orbit, CheckCircle2, ChevronRight, Layers } from 'lucide-react'

interface CompareClientProps {
  companies: any[]
  technologies: any[]
}

export default function CompareClient({ companies, technologies }: CompareClientProps) {
  const [selectedLeft, setSelectedLeft] = useState<string>(companies[0]?.slug || '')
  const [selectedRight, setSelectedRight] = useState<string>(companies[1]?.slug || companies[0]?.slug || '')

  const leftItem = companies.find((c) => c.slug === selectedLeft)
  const rightItem = companies.find((c) => c.slug === selectedRight)

  return (
    <div className="space-y-8">
      {/* Selector Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-2">OPERATOR SLOT A (PRIMARY REFERENCE)</label>
          <select
            value={selectedLeft}
            onChange={(e) => setSelectedLeft(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            {companies.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-slate-950">
                {c.name} ({c.sector || 'Commercial Prime'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-2">OPERATOR SLOT B (TARGET COMPARISON)</label>
          <select
            value={selectedRight}
            onChange={(e) => setSelectedRight(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            {companies.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-slate-950">
                {c.name} ({c.sector || 'Commercial Prime'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Dossier Card */}
        {leftItem && (
          <div className="p-7 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  SLOT A PRIME
                </span>
                <h2 className="text-2xl font-bold font-mono text-white mt-2">{leftItem.name}</h2>
                <div className="text-xs font-mono text-slate-400 mt-1">{leftItem.sector}</div>
              </div>
              <Link
                href={`/companies/${leftItem.slug}`}
                className="p-2 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  TOTAL CAPITAL
                </div>
                <div className="text-base font-bold text-white">{leftItem.funding_total || 'Confidential'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  HEADCOUNT
                </div>
                <div className="text-base font-bold text-white">{leftItem.employee_count ? `${leftItem.employee_count}+` : 'Scale-up'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  OPERATIONS BASE
                </div>
                <div className="text-xs font-bold text-white truncate">{leftItem.hq_location || 'United States'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  QUALIFICATION
                </div>
                <div className="text-xs font-bold text-emerald-400">ACTIVE PRIME</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Scope & Capabilities</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{leftItem.description}</p>
            </div>
          </div>
        )}

        {/* Right Dossier Card */}
        {rightItem && (
          <div className="p-7 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  SLOT B PRIME
                </span>
                <h2 className="text-2xl font-bold font-mono text-white mt-2">{rightItem.name}</h2>
                <div className="text-xs font-mono text-slate-400 mt-1">{rightItem.sector}</div>
              </div>
              <Link
                href={`/companies/${rightItem.slug}`}
                className="p-2 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  TOTAL CAPITAL
                </div>
                <div className="text-base font-bold text-white">{rightItem.funding_total || 'Confidential'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  HEADCOUNT
                </div>
                <div className="text-base font-bold text-white">{rightItem.employee_count ? `${rightItem.employee_count}+` : 'Scale-up'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  OPERATIONS BASE
                </div>
                <div className="text-xs font-bold text-white truncate">{rightItem.hq_location || 'United States'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  QUALIFICATION
                </div>
                <div className="text-xs font-bold text-emerald-400">ACTIVE PRIME</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Scope & Capabilities</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{rightItem.description}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
