"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Sparkles, Orbit, ShieldAlert, ShieldCheck, Zap, Radio, 
  Activity, Layers, Gauge, Crosshair, Target, Search, 
  ChevronDown, Flame, Wind, Eye, Network, Lock, Sun, 
  ArrowUpRight, Terminal, Globe, Award, Key 
} from "lucide-react"
import CommandPalette from "@/components/CommandPalette"

export default function CommandBar() {
  const pathname = usePathname()
  const [zuluTime, setZuluTime] = useState<string>("")
  const [defcon, setDefcon] = useState<number>(2)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setZuluTime(now.toISOString().substring(11, 19) + " Z")
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#01040f]/95 backdrop-blur-2xl border-b border-slate-800/80 font-mono text-xs select-none">
        <div className="h-full max-w-[1920px] mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 lg:gap-4">
          
          {/* LEFT: BRAND */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/nexus" className="flex items-center gap-2 text-white font-black tracking-widest uppercase hover:text-cyan-400 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-700 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-black tracking-[0.2em]">VEROYX</span>
            </Link>

            <div className="hidden 2xl:flex items-center gap-2 pl-3 border-l border-slate-800 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold">100+ CO-ORBITAL NODES</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-bold">TOP SECRET // SI-TK</span>
            </div>
          </div>

          {/* CENTER: SPECIALIZED DOMAIN MEGA-MENUS */}
          <nav className="hidden lg:flex items-center gap-1 text-[11px] font-sans">
            
            {/* COMMAND */}
            <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
              <button
                onClick={() => setActiveMenu(activeMenu === "COMMAND" ? null : "COMMAND")}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-all ${
                  activeMenu === "COMMAND" || pathname === "/nexus" || pathname === "/c2"
                    ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/50" 
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>COMMAND</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {activeMenu === "COMMAND" && (
                <div className="absolute top-full left-0 mt-1.5 w-64 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1">
                  <Link href="/nexus" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs flex items-center justify-between">
                      <span>Space Nexus C2</span>
                      <span className="text-[9px] px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">TIER-0</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Grand unified multi-tier theater nexus</div>
                  </Link>
                  <Link href="/c2" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">C2 Tactical Deck</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Real-time battle management glass</div>
                  </Link>
                  <Link href="/visualizer" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">3D Threat Visualizer</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Orbital conjunction catalog globe</div>
                  </Link>
                </div>
              )}
            </div>

            {/* DEFENSE */}
            <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
              <button
                onClick={() => setActiveMenu(activeMenu === "DEFENSE" ? null : "DEFENSE")}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-all ${
                  activeMenu === "DEFENSE"
                    ? "bg-rose-950/60 text-rose-300 border border-rose-500/50" 
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                <span>DEFENSE</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {activeMenu === "DEFENSE" && (
                <div className="absolute top-full left-0 mt-1.5 w-72 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1">
                  <Link href="/intercept" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs flex items-center justify-between">
                      <span>Kinetic ASAT &amp; DEW</span>
                      <span className="text-[9px] px-1 rounded bg-rose-950 text-rose-400 border border-rose-800 font-mono">H2K</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ProNav hit-to-kill &amp; laser ablation</div>
                  </Link>
                  <Link href="/rpo" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">RPO Safety Corridors</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Hill-Clohessy-Wiltshire keep-out cones</div>
                  </Link>
                  <Link href="/pursuit-evasion" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Pursuit-Evasion Game</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">HJI orbital combat reachability basins</div>
                  </Link>
                  <Link href="/hemp-sim" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">HEMP &amp; Radiation Belts</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Starfish Prime E1/E2/E3 burst model</div>
                  </Link>
                  <Link href="/planetary-defense" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Planetary Defense</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">DART ejecta recoil asteroid deflection</div>
                  </Link>
                </div>
              )}
            </div>

            {/* SURVEILLANCE */}
            <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
              <button
                onClick={() => setActiveMenu(activeMenu === "SURVEILLANCE" ? null : "SURVEILLANCE")}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-all ${
                  activeMenu === "SURVEILLANCE"
                    ? "bg-amber-950/60 text-amber-300 border border-amber-500/50" 
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>SURVEILLANCE</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {activeMenu === "SURVEILLANCE" && (
                <div className="absolute top-full left-0 mt-1.5 w-72 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1">
                  <Link href="/tasking" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs flex items-center justify-between">
                      <span>SSN Sensor Tasking</span>
                      <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">RADAR</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Metric radar handover &amp; covariance</div>
                  </Link>
                  <Link href="/scheduler" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Hungarian Scheduler</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Kuhn-Munkres optimal sensor assignment</div>
                  </Link>
                  <Link href="/sigint" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Space-Based SIGINT</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">TDOA / FDOA satellite multilateration</div>
                  </Link>
                  <Link href="/hypersonic" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Hypersonic OPIR Tracking</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Aerothermal shock space tracking</div>
                  </Link>
                  <Link href="/adaptive-optics" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Adaptive Optics LGS</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Sodium laser turbulence correction</div>
                  </Link>
                </div>
              )}
            </div>

            {/* RESILIENCE */}
            <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
              <button
                onClick={() => setActiveMenu(activeMenu === "RESILIENCE" ? null : "RESILIENCE")}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-all ${
                  activeMenu === "RESILIENCE"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/50" 
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>RESILIENCE</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {activeMenu === "RESILIENCE" && (
                <div className="absolute top-full left-0 mt-1.5 w-72 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1">
                  <Link href="/resilience" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs flex items-center justify-between">
                      <span>Mesh Self-Healing</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">DIJKSTRA</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">pLEO dynamic crosslink rerouting</div>
                  </Link>
                  <Link href="/pnt-resilience" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">EW &amp; Counter-PNT</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">CRPA adaptive nulling &amp; anti-spoofing</div>
                  </Link>
                  <Link href="/qkd" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Quantum Key Relays</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Bell state satellite entanglement</div>
                  </Link>
                  <Link href="/sbsp" className="p-2 rounded-lg hover:bg-slate-800/80 block text-left" onClick={() => setActiveMenu(null)}>
                    <div className="text-white font-bold text-xs">Space Solar Power (SBSP)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">GEO microwave wireless power transfer</div>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* RIGHT: SEARCH, DEFCON & VIP */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* SEARCH BUTTON WITH DIRECT STATE */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-white transition-all shadow-inner"
              title="Launch Command Palette (Ctrl+K or Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden xl:inline text-[11px] font-sans">Command Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono text-slate-300">
                ⌘K
              </kbd>
            </button>

            {/* DEFCON BADGE */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
              <span className="text-slate-500">DEFCON</span>
              <button
                onClick={() => setDefcon(d => (d === 1 ? 5 : d - 1))}
                className={`font-black px-1.5 py-0.5 rounded transition-all ${
                  defcon === 1 
                    ? "bg-rose-600 text-white animate-pulse" 
                    : defcon === 2 
                    ? "bg-rose-950 text-rose-400 border border-rose-800" 
                    : "bg-slate-800 text-amber-300"
                }`}
              >
                {defcon}
              </button>
            </div>

            {/* ZULU TIME */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>{zuluTime || "12:00:00 Z"}</span>
            </div>

            {/* VIP SEAT LINK */}
            <Link
              href="/access"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-[11px] shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all shrink-0"
            >
              <Key className="w-3 h-3" />
              <span>VIP</span>
              <span className="hidden sm:inline text-[9px] opacity-80">($10K+)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* RENDER COMMAND PALETTE MODAL */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  )
}
