"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Terminal, Search, X, CornerDownLeft 
} from "lucide-react"

export interface RouteItem {
  name: string
  route: string
  domain: string
  description: string
  badge: string
}

export const ALL_CAPABILITIES: RouteItem[] = [
  // Master Command & Institutional Gate
  { name: "Enterprise VIP Access Portal ($10K+ Seats)", route: "/access", domain: "ENTERPRISE", description: "Institutional seat licensing, ITAR compliance, and sovereign node procurement", badge: "VIP" },
  { name: "Unified Command Nexus", route: "/nexus", domain: "COMMAND", description: "Grand Unified Space Domain Awareness Multi-Tier Nexus", badge: "TIER-0" },
  { name: "C2 Tactical Deck", route: "/c2", domain: "COMMAND", description: "Joint space operations command and battle management glass", badge: "C2" },
  { name: "Threat Visualizer", route: "/visualizer", domain: "COMMAND", description: "Interactive 3D orbital catalog and conjunction visualizer", badge: "3D" },
  { name: "Space Domain Awareness (SSA)", route: "/ssa", domain: "COMMAND", description: "Custodial orbital catalog and state vector monitoring", badge: "SDA" },

  // Orbital Defense & Kinetic
  { name: "Kinetic ASAT & DEW Intercept", route: "/intercept", domain: "DEFENSE", description: "Hit-to-kill True ProNav guidance and laser thermal ablation", badge: "H2K" },
  { name: "Space Kill-Chain JADC2", route: "/kill-chain", domain: "DEFENSE", description: "Automated F2T2EA battle management and weapon-target pairing", badge: "JADC2" },
  { name: "Non-Cooperative RPO Corridors", route: "/rpo", domain: "DEFENSE", description: "Hill-Clohessy-Wiltshire proximity safety keep-out envelopes", badge: "HCW" },
  { name: "Pursuit-Evasion Differential Combat", route: "/pursuit-evasion", domain: "DEFENSE", description: "Hamilton-Jacobi-Isaacs reachability basins and dogfights", badge: "GAME" },
  { name: "HEMP & Radiation Belts", route: "/hemp-sim", domain: "DEFENSE", description: "Exoatmospheric EMP E1/E2/E3 and Starfish Prime trapping", badge: "EMP" },
  { name: "Planetary Defense & DART Deflection", route: "/planetary-defense", domain: "DEFENSE", description: "Asteroid kinetic impactor ejecta momentum enhancement", badge: "NEO" },

  // Surveillance & Recon
  { name: "SSN Sensor Tasking & Handover", route: "/tasking", domain: "SURVEILLANCE", description: "Phased-array radar SNR cascade and metric handover", badge: "SSN" },
  { name: "Automated Hungarian Sensor Scheduler", route: "/scheduler", domain: "SURVEILLANCE", description: "Kuhn-Munkres bipartite optimal covariance contraction", badge: "SCHED" },
  { name: "Space-Based SIGINT Geolocation", route: "/sigint", domain: "SURVEILLANCE", description: "TDOA / FDOA satellite formation multilateration", badge: "SIGINT" },
  { name: "Hypersonic Glide OPIR Tracking", route: "/hypersonic", domain: "SURVEILLANCE", description: "Non-Keplerian aerothermal shock wave space tracking", badge: "OPIR" },
  { name: "Adaptive Optics LGS Wavefront", route: "/adaptive-optics", domain: "SURVEILLANCE", description: "Sodium laser guide star atmospheric turbulence correction", badge: "AO" },

  // Communications & Resilience
  { name: "Autonomous Mesh Self-Healing", route: "/resilience", domain: "RESILIENCE", description: "Dynamic Dijkstra link-state rerouting across pLEO OISL", badge: "MESH" },
  { name: "EW & Counter-PNT Resilience", route: "/pnt-resilience", domain: "RESILIENCE", description: "CRPA MVDR spatial nulling and anti-spoofing filter", badge: "PNT" },
  { name: "Satellite QKD Entanglement Relays", route: "/qkd", domain: "RESILIENCE", description: "Bell state verification and post-quantum hybrid keys", badge: "QKD" },
  { name: "Space-Based Solar Power (SBSP)", route: "/sbsp", domain: "RESILIENCE", description: "GEO-to-grid microwave wireless power transfer beaming", badge: "WPT" },
  { name: "Optical Lasercom Link Budget", route: "/lasercom", domain: "RESILIENCE", description: "Deep-space 1550nm coherent optical transceiver budget", badge: "FSOC" },

  // Orbital Mechanics & Physics
  { name: "Delta-V Maneuver Planner", route: "/delta-v", domain: "PHYSICS", description: "Hohmann, bi-elliptic, and plane-change burn calculation", badge: "ORBIT" },
  { name: "Trajectory & Ephemeris", route: "/trajectory", domain: "PHYSICS", description: "J2/J4 gravitational perturbation orbital propagation", badge: "PROP" },
  { name: "Conjunction Assessment", route: "/conjunction", domain: "PHYSICS", description: "Collision probability Pc calculation and miss distance", badge: "ALCOA" },
  { name: "Atmospheric Reentry & Footprint", route: "/reentry", domain: "PHYSICS", description: "Aerothermal breakup risk and debris footprint analysis", badge: "ENTRY" },
  { name: "Space Weather & Geomagnetic", route: "/space-weather", domain: "PHYSICS", description: "Solar coronal mass ejections, Kp-index, and drag flare", badge: "SWPC" }
]

export interface CommandPaletteProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function CommandPalette({ isOpen: propIsOpen, onClose }: CommandPaletteProps = {}) {
  const router = useRouter()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isControlled = propIsOpen !== undefined
  const isOpen = isControlled ? propIsOpen : internalIsOpen

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (isControlled) {
          if (isOpen) {
            onClose?.()
          } else {
            window.dispatchEvent(new CustomEvent("toggle-command-palette"))
          }
        } else {
          setInternalIsOpen(prev => !prev)
        }
      } else if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }

    const handleOpenEvent = () => {
      if (!isControlled) {
        setInternalIsOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("open-command-palette", handleOpenEvent)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("open-command-palette", handleOpenEvent)
    }
  }, [isOpen, isControlled, onClose])

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
      item.route.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q)
    )
  }, [query])

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault()
      const targetRoute = filtered[selectedIndex].route
      handleClose()
      router.push(targetRoute)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md font-mono text-xs">
      <div className="fixed inset-0" onClick={handleClose} />

      <div 
        className="relative w-full max-w-2xl bg-[#020617] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col z-10"
        onKeyDown={handleKeyNavigation}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <Terminal className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Type a command, module, or orbital capability (e.g. 'intercept', 'qkd', 'dart')..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 focus:outline-none"
          />
          <button 
            onClick={handleClose}
            className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No matching orbital modules found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.route}
                  onClick={() => {
                    handleClose()
                    router.push(item.route)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                    isSelected 
                      ? "bg-cyan-950/70 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                      : "hover:bg-slate-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                      item.domain === "DEFENSE" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                      item.domain === "SURVEILLANCE" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                      item.domain === "RESILIENCE" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                      item.domain === "ENTERPRISE" ? "bg-cyan-600 text-white font-black shadow-[0_0_10px_rgba(6,182,212,0.5)]" :
                      "bg-cyan-950 text-cyan-400 border border-cyan-800"
                    }`}>
                      {item.badge}
                    </div>

                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        {item.name}
                        <span className="text-[9px] text-slate-500 font-mono">{item.route}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {item.domain}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">↵</kbd> Dispatch</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">ESC</kbd> Close</span>
          </div>
          <div className="text-cyan-400 font-bold">
            VEROYX KERNEL v2.7 // 100+ LIVE ROUTES
          </div>
        </div>
      </div>
    </div>
  )
}
