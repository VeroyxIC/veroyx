"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Globe, Crosshair, Eye, Zap, Search, ChevronDown, Key } from "lucide-react"

export default function CommandBar() {
  const pathname = usePathname()
  const [zuluTime, setZuluTime] = useState<string>("")
  const [defcon, setDefcon] = useState<number>(2)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setZuluTime(now.toISOString().substring(11, 19) + " Z")
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const triggerPalette = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"))
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#01030a]/95 backdrop-blur-2xl border-b border-slate-800/80 font-mono text-xs select-none">
      <div className="h-full max-w-[1920px] mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 lg:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 text-white font-black tracking-widest uppercase hover:opacity-90 transition-opacity">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-500/30 blur-md pointer-events-none" />
              <svg viewBox="0 0 64 64" className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 14L32 54L52 14H42L32 38L22 14H12Z" fill="url(#headerVGrad)" />
                <path d="M22 14L32 38L42 14H46L32 48L18 14H22Z" fill="#38bdf8" />
                <circle cx="32" cy="54" r="3" fill="#00f0ff" />
                <defs>
                  <linearGradient id="headerVGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-sm font-black tracking-[0.22em] text-white">VEROYX</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-1 text-[11px] font-sans">
          <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
            <button onClick={() => setActiveMenu(activeMenu === "COMMAND" ? null : "COMMAND")} className="px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition-all">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>COMMAND</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeMenu === "COMMAND" && (
              <div className="absolute top-full left-0 mt-1.5 w-64 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1 font-mono">
                <Link href="/nexus" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">Space Nexus C2</div>
                  <div className="text-[10px] text-slate-400">Unified multi-tier theater glass</div>
                </Link>
                <Link href="/c2" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">C2 Tactical Deck</div>
                  <div className="text-[10px] text-slate-400">Battle management glass</div>
                </Link>
                <Link href="/visualizer" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">3D Threat Visualizer</div>
                  <div className="text-[10px] text-slate-400">NASA-grade Earth & orbit glass</div>
                </Link>
              </div>
            )}
          </div>

          <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
            <button onClick={() => setActiveMenu(activeMenu === "DEFENSE" ? null : "DEFENSE")} className="px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition-all">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
              <span>DEFENSE</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeMenu === "DEFENSE" && (
              <div className="absolute top-full left-0 mt-1.5 w-64 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1 font-mono">
                <Link href="/directed-energy" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">DEW Laser Ablation</div>
                  <div className="text-[10px] text-slate-400">1.2 MW laser ablation terminal</div>
                </Link>
                <Link href="/kill-chain" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">Space Kill-Chain</div>
                  <div className="text-[10px] text-slate-400">Automated F2T2EA weapon pairing</div>
                </Link>
                <Link href="/intercept" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">Kinetic ASAT True ProNav</div>
                  <div className="text-[10px] text-slate-400">Hit-to-kill terminal intercept</div>
                </Link>
              </div>
            )}
          </div>

          <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
            <button onClick={() => setActiveMenu(activeMenu === "SURVEILLANCE" ? null : "SURVEILLANCE")} className="px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition-all">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>SURVEILLANCE</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeMenu === "SURVEILLANCE" && (
              <div className="absolute top-full left-0 mt-1.5 w-64 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1 font-mono">
                <Link href="/catalog" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">48K Space-Track Catalog</div>
                  <div className="text-[10px] text-slate-400">48,219 RSO real-time database</div>
                </Link>
                <Link href="/ephemeris" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">SGP4 Orbit Propagator</div>
                  <div className="text-[10px] text-slate-400">ECI J2000 state solver</div>
                </Link>
              </div>
            )}
          </div>

          <div className="relative" onMouseLeave={() => setActiveMenu(null)}>
            <button onClick={() => setActiveMenu(activeMenu === "RESILIENCE" ? null : "RESILIENCE")} className="px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition-all">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>RESILIENCE</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeMenu === "RESILIENCE" && (
              <div className="absolute top-full left-0 mt-1.5 w-64 p-2 bg-[#020617]/95 backdrop-blur-2xl border border-slate-700 rounded-xl shadow-2xl space-y-1 font-mono">
                <Link href="/resilience" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">Mesh Self-Healing</div>
                  <div className="text-[10px] text-slate-400">Dijkstra pLEO laser routing</div>
                </Link>
                <Link href="/qkd" className="p-2 rounded-lg hover:bg-slate-800 block" onClick={() => setActiveMenu(null)}>
                  <div className="text-white font-bold text-xs">Quantum Key Relays</div>
                  <div className="text-[10px] text-slate-400">Bell state verification</div>
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={triggerPalette} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-white transition-all">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden xl:inline text-[11px] font-sans">Command Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-mono text-slate-300">⌘K</kbd>
          </button>

          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
            <span className="text-slate-500">DEFCON</span>
            <button onClick={() => setDefcon(d => (d === 1 ? 5 : d - 1))} className="font-black px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">{defcon}</button>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>{zuluTime || "12:00:00 Z"}</span>
          </div>

          <Link href="/access" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-[11px] shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all shrink-0">
            <Key className="w-3 h-3" />
            <span>VIP</span>
            <span className="hidden sm:inline text-[9px] opacity-80">(0K+)</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
