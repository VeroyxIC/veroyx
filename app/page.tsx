"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Sparkles, Globe, Orbit, Crosshair, ShieldCheck, Zap, 
  Eye, Radio, Activity, Layers, ArrowRight, Terminal, 
  Lock, Key, Database, Cpu, Compass, Flame, CheckCircle2 
} from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [isHandshaking, setIsHandshaking] = useState(false)

  const handleInitiateHandshake = () => {
    setIsHandshaking(true)
    setTimeout(() => {
      router.push("/nexus")
    }, 600)
  }

  return (
    <div className="w-full min-h-screen pt-20 pb-20 px-4 sm:px-8 bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* BACKGROUND GLOW DECORATIONS */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center -z-10">
        <div className="w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[160px] translate-y-32" />
      </div>

      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-6 max-w-4xl mx-auto pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>USSF DELTA-2 // ALLIED JADC2 SPACE BATTLE MANAGEMENT</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white uppercase select-none">
            VE<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">RO</span>YX
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-mono">
            Next-generation Space Domain Awareness (SDA), real-time SGP4 orbital propagation, counter-space kinetic intercept modeling, and multi-tier JADC2 battle management.
          </p>

          {/* ACTIVE PRIMARY ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={handleInitiateHandshake}
              disabled={isHandshaking}
              className={`px-8 py-4 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(6,182,212,0.35)] flex items-center gap-3 ${
                isHandshaking 
                  ? "bg-cyan-500 text-black animate-pulse" 
                  : "bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:scale-105"
              }`}
            >
              {isHandshaking ? <Lock className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
              <span>{isHandshaking ? "AUTHENTICATING ENCLAVE..." : "INITIATE ZERO-TRUST HANDSHAKE"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/catalog"
              className="px-6 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>48K SPACE-TRACK CATALOG</span>
            </Link>

            <Link
              href="/access"
              className="px-6 py-4 rounded-xl bg-gradient-to-r from-amber-600/30 to-amber-700/20 hover:from-amber-600/40 hover:to-amber-700/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>VIP ACCESS ($10K+)</span>
            </Link>
          </div>
        </div>

        {/* 4 STRATEGIC ENTERPRISE DOMAIN PILLARS (ZERO DEAD ENDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* PILLAR 1: COMMAND & TACTICAL JADC2 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                <Globe className="w-3.5 h-3.5" /> Pillar 01
              </div>
              <h2 className="text-lg font-black text-white">COMMAND &amp; JADC2</h2>
              <p className="text-xs text-slate-400 mt-1">Multi-tier theater glass and battle management orchestration.</p>
              
              <div className="mt-4 space-y-2 font-mono text-xs">
                <Link href="/nexus" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Unified Command Nexus</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/c2" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>C2 Tactical Deck</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/kill-chain" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Space Kill-Chain JADC2</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/telecommand" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>CCSDS Telecommand Uplink</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">STATUS: OPERATIONAL</div>
          </div>

          {/* PILLAR 2: COUNTER-SPACE & DEFENSE */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-rose-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                <Crosshair className="w-3.5 h-3.5" /> Pillar 02
              </div>
              <h2 className="text-lg font-black text-white">ORBITAL DEFENSE</h2>
              <p className="text-xs text-slate-400 mt-1">Kinetic hit-to-kill interception, DEW lasers, and proximity safety.</p>
              
              <div className="mt-4 space-y-2 font-mono text-xs">
                <Link href="/intercept" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Kinetic ASAT &amp; DEW</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
                <Link href="/rpo" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>RPO Safety Corridors</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
                <Link href="/pursuit-evasion" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Pursuit-Evasion Game</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
                <Link href="/planetary-defense" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Planetary Defense (DART)</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">STATUS: WEAPON LOCKED</div>
          </div>

          {/* PILLAR 3: SPACE SURVEILLANCE & SENSORS */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                <Eye className="w-3.5 h-3.5" /> Pillar 03
              </div>
              <h2 className="text-lg font-black text-white">SPACE SURVEILLANCE</h2>
              <p className="text-xs text-slate-400 mt-1">48K Space-Track catalog, SGP4 ephemeris, and SIGINT direction finding.</p>
              
              <div className="mt-4 space-y-2 font-mono text-xs">
                <Link href="/catalog" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>48K Space-Track Catalog</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
                <Link href="/ephemeris" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>SGP4 Orbit Propagator</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
                <Link href="/tasking" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>SSN Radar Tasking</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
                <Link href="/sigint" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Space-Based SIGINT TDOA</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">STATUS: 48,219 TRACKS</div>
          </div>

          {/* PILLAR 4: RESILIENCE & QUANTUM */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                <Zap className="w-3.5 h-3.5" /> Pillar 04
              </div>
              <h2 className="text-lg font-black text-white">RESILIENCE &amp; QUANTUM</h2>
              <p className="text-xs text-slate-400 mt-1">Autonomous mesh self-healing, QKD encryption, and EW anti-spoofing.</p>
              
              <div className="mt-4 space-y-2 font-mono text-xs">
                <Link href="/visualizer" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>3D Threat Visualizer</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </Link>
                <Link href="/pnt-resilience" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>EW &amp; Counter-PNT Nulling</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </Link>
                <Link href="/qkd" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Quantum Key Relays (QKD)</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </Link>
                <Link href="/resilience" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>pLEO Mesh Self-Healing</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">STATUS: POST-QUANTUM SECURE</div>
          </div>
        </div>

        {/* COMPREHENSIVE FLIGHT & ENGINEERING CAPABILITIES ACCORDION */}
        <div className="p-8 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider font-mono">Complete Orbital Engineering Decks</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">108 fully compiled production modules accessible across the platform</p>
            </div>
            <Link
              href="/nexus"
              className="px-4 py-2 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-900 transition-all flex items-center gap-2 self-start"
            >
              <span>OPEN COMMAND NEXUS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
            <Link href="/delta-v" className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 text-slate-400 hover:text-cyan-300 transition-all">
              <span className="font-bold block text-white">Delta-V Planner</span>
              <span className="text-[10px] text-slate-500">Maneuver Burns</span>
            </Link>
            <Link href="/conjunction" className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 text-slate-400 hover:text-cyan-300 transition-all">
              <span className="font-bold block text-white">Conjunction Pc</span>
              <span className="text-[10px] text-slate-500">Collision Risk</span>
            </Link>
            <Link href="/ground-track" className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 text-slate-400 hover:text-cyan-300 transition-all">
              <span className="font-bold block text-white">Ground Track</span>
              <span className="text-[10px] text-slate-500">Mercator Passes</span>
            </Link>
            <Link href="/swath" className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 text-slate-400 hover:text-cyan-300 transition-all">
              <span className="font-bold block text-white">Sensor Swath</span>
              <span className="text-[10px] text-slate-500">GSD Optics</span>
            </Link>
            <Link href="/space-weather" className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 text-slate-400 hover:text-cyan-300 transition-all">
              <span className="font-bold block text-white">Space Weather</span>
              <span className="text-[10px] text-slate-500">Kp &amp; Solar Flares</span>
            </Link>
            <Link href="/developers" className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 text-slate-400 hover:text-cyan-300 transition-all">
              <span className="font-bold block text-white">Developer API</span>
              <span className="text-[10px] text-slate-500">REST &amp; Webhooks</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
