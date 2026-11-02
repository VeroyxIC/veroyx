"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Terminal, Search, X, CornerDownLeft } from "lucide-react"

export interface RouteItem {
  name: string
  route: string
  domain: string
  description: string
  badge: string
}

export const ALL_CAPABILITIES: RouteItem[] = [
  { name: "Enterprise VIP Access Portal ($10K+ Seats)", route: "/access", domain: "ENTERPRISE", description: "Institutional seat licensing, ITAR compliance, and sovereign procurement", badge: "VIP" },
  { name: "Unified Command Nexus", route: "/nexus", domain: "COMMAND", description: "Grand Unified Space Domain Awareness Multi-Tier Nexus", badge: "TIER-0" },
  { name: "C2 Tactical Deck", route: "/c2", domain: "COMMAND", description: "Joint space operations command and battle management glass", badge: "C2" },
  { name: "Threat Visualizer", route: "/visualizer", domain: "COMMAND", description: "NASA-grade Earth, Sun flare, Moon, and satellite visualizer", badge: "3D" },
  { name: "Space-Track 48K Orbital Catalog", route: "/catalog", domain: "SURVEILLANCE", description: "Live SGP4 ephemeris, 48,219 RSO database and TLE exporter", badge: "48K" },
  { name: "SGP4 Orbit Propagator", route: "/ephemeris", domain: "SURVEILLANCE", description: "J2 analytical precession and true ECI J2000 state vectors", badge: "SGP4" },
  { name: "CCSDS Telecommand Uplink", route: "/telecommand", domain: "COMMAND", description: "Hardware-in-the-loop RF uplink and cryptographic console", badge: "CCSDS" },
  { name: "DEW Laser Ablation Suite", route: "/directed-energy", domain: "DEFENSE", description: "1.2 MW continuous-wave laser and HPM thermal ablation", badge: "DEW" },
  { name: "Space Kill-Chain JADC2", route: "/kill-chain", domain: "DEFENSE", description: "Automated F2T2EA battle management and weapon-target pairing", badge: "JADC2" },
  { name: "Kinetic ASAT True ProNav", route: "/intercept", domain: "DEFENSE", description: "Hit-to-kill True ProNav guidance and laser thermal ablation", badge: "H2K" },
  { name: "RPO Safety Corridors", route: "/rpo", domain: "DEFENSE", description: "Hill-Clohessy-Wiltshire proximity keep-out cones", badge: "HCW" },
  { name: "Autonomous Mesh Self-Healing", route: "/resilience", domain: "RESILIENCE", description: "Dynamic Dijkstra link-state rerouting across pLEO OISL", badge: "MESH" },
  { name: "EW & Counter-PNT Resilience", route: "/pnt-resilience", domain: "RESILIENCE", description: "CRPA MVDR spatial nulling and anti-spoofing filter", badge: "PNT" },
  { name: "Satellite QKD Entanglement Relays", route: "/qkd", domain: "RESILIENCE", description: "Bell state verification and post-quantum hybrid keys", badge: "QKD" }
]

export default function CommandPalette() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        setIsOpen(prev => !prev)
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }

    const handleOpen = () => setIsOpen(true)
    const handleClose = () => setIsOpen(false)

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("open-command-palette", handleOpen)
    window.addEventListener("close-command-palette", handleClose)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("open-command-palette", handleOpen)
      window.removeEventListener("close-command-palette", handleClose)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery("")
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return ALL_CAPABILITIES
    return ALL_CAPABILITIES.filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.domain.toLowerCase().includes(q) ||
      item.route.toLowerCase().includes(q)
    )
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md font-mono text-xs select-none">
      <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

      <div className="relative w-full max-w-2xl bg-[#020617] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col z-10">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <Terminal className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command, module, or orbital capability..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 focus:outline-none"
          />
          <button onClick={() => setIsOpen(false)} className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
          {filtered.map((item, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={item.route}
                onClick={() => { setIsOpen(false); router.push(item.route); }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                  isSelected ? "bg-cyan-950/70 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-[10px]">
                    {item.badge}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-2">
                      {item.name}
                      <span className="text-[9px] text-slate-500 font-mono">{item.route}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</div>
                  </div>
                </div>
                {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
