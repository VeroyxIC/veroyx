'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, Building2, Cpu, FileText, Rocket, ExternalLink } from 'lucide-react'

interface QuickItem {
  name: string
  href: string
  category: 'Companies' | 'Technologies' | 'Contracts' | 'Launches'
  sub: string
}

const INDEXED_ITEMS: QuickItem[] = [
  // Companies
  { name: 'Varda Space Industries', href: '/companies/varda-space-industries', category: 'Companies', sub: 'In-Space Manufacturing & Reentry' },
  { name: 'Impulse Space', href: '/companies/impulse-space', category: 'Companies', sub: 'Orbital Mobility & Propulsion' },
  { name: 'Sierra Space', href: '/companies/sierra-space', category: 'Companies', sub: 'Commercial Stations & Transport' },
  { name: 'Vast Space', href: '/companies/vast-space', category: 'Companies', sub: 'Artificial Gravity Stations' },
  { name: 'Firefly Aerospace', href: '/companies/firefly-aerospace', category: 'Companies', sub: 'Small/Medium Launch & Landers' },
  { name: 'Stoke Space', href: '/companies/stoke-space', category: 'Companies', sub: '100% Reusable Launch Vehicles' },
  { name: 'Planet Labs', href: '/companies/planet-labs', category: 'Companies', sub: 'High-Cadence Earth Observation' },
  { name: 'SpaceX', href: '/companies/spacex', category: 'Companies', sub: 'Orbital Heavy-Lift & Megaconstellations' },
  { name: 'Rocket Lab', href: '/companies/rocket-lab', category: 'Companies', sub: 'Small-Lift & Space Systems' },

  // Technologies
  { name: 'W-Series Microgravity Reentry Capsule', href: '/technologies/w-series-capsule-reentry', category: 'Technologies', sub: 'TRL 8 • Reentry Systems' },
  { name: 'Helios High-Delta-V Orbital Stage', href: '/technologies/helios-kick-stage', category: 'Technologies', sub: 'TRL 6 • In-Space Mobility' },
  { name: 'Dream Chaser Spaceplane', href: '/technologies/dream-chaser-spaceplane', category: 'Technologies', sub: 'TRL 8 • Lifting Body Spacecraft' },
  { name: 'Blue Ghost Lunar Lander', href: '/technologies/blue-ghost-lander', category: 'Technologies', sub: 'TRL 8 • Lunar Surface Transit' },
  { name: 'Regenerative Aerospike Upper Stage', href: '/technologies/aerospike-heatshield-upperstage', category: 'Technologies', sub: 'TRL 7 • Reusable Propulsion' },

  // Contracts
  { name: 'NASA CLPS CP-12 Lunar Delivery ($112.4M)', href: '/grants/nasa-clps-blue-ghost-task-1', category: 'Contracts', sub: 'NASA Exploration Systems' },
  { name: 'Commercial LEO Destinations (CLD) ($48.5M)', href: '/grants/nasa-commercial-leo-destinations-haven', category: 'Contracts', sub: 'NASA Human Spaceflight' },
  { name: 'USSF TacRS-4 Tactically Responsive Launch ($32M)', href: '/grants/space-force-responsive-space-tacrs-4', category: 'Contracts', sub: 'Space Force / SSC' },

  // Launches & Analytics
  { name: 'Starlink Group 15-18 (Falcon 9)', href: '/launches', category: 'Launches', sub: 'SpaceX • SLC-4E Vandenberg' },
  { name: 'The Sea God Surveys iQPS-9 (Electron)', href: '/launches', category: 'Launches', sub: 'Rocket Lab • LC-1 Mahia' },
  { name: 'Macro Space Capital Radar', href: '/analytics', category: 'Launches', sub: 'Telemetry Visualizer & Analytics' },
]

export default function CommandBar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runSelect = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Search trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-cyan-500/40 text-xs font-mono transition-all"
      >
        <Search className="w-3.5 h-3.5 text-cyan-400" />
        <span>Search index...</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-sans">
          ⌘K
        </kbd>
      </button>

      {/* Modal Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div 
            className="fixed inset-0" 
            onClick={() => setOpen(false)} 
          />
          <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden font-mono z-10">
            <Command className="w-full">
              <div className="flex items-center px-4 border-b border-slate-800">
                <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-3" />
                <Command.Input
                  placeholder="Query operators, vehicles, TRL levels, or prime contracts..."
                  className="w-full bg-transparent py-4 text-sm text-slate-100 placeholder-slate-500 outline-none"
                  autoFocus
                />
                <kbd className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-500">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-96 overflow-y-auto p-2 space-y-1">
                <Command.Empty className="py-8 text-center text-xs text-slate-500">
                  No telemetry entries found for this query.
                </Command.Empty>

                {(['Companies', 'Technologies', 'Contracts', 'Launches'] as const).map((cat) => (
                  <Command.Group key={cat} heading={cat} className="text-[10px] uppercase tracking-wider text-slate-500 px-3 py-1 font-semibold">
                    {INDEXED_ITEMS.filter((item) => item.category === cat).map((item) => (
                      <Command.Item
                        key={item.name}
                        value={`${item.name} ${item.sub} ${item.category}`}
                        onSelect={() => runSelect(item.href)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-slate-300 hover:bg-slate-900 hover:text-white cursor-pointer group transition-colors data-[selected=true]:bg-slate-900 data-[selected=true]:text-cyan-400"
                      >
                        <div className="flex items-center gap-3">
                          {cat === 'Companies' && <Building2 className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                          {cat === 'Technologies' && <Cpu className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                          {cat === 'Contracts' && <FileText className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                          {cat === 'Launches' && <Rocket className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                          <div>
                            <div className="font-medium text-slate-200 group-hover:text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-500 group-hover:text-slate-400">{item.sub}</div>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/80 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Navigate <kbd className="text-[9px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">↑</kbd> <kbd className="text-[9px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">↓</kbd></span>
                <span>Select <kbd className="text-[9px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">ENTER</kbd></span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
