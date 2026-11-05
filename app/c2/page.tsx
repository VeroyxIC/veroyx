"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import InteractiveTurntable from "@/components/ui/InteractiveTurntable"
import { 
  ShieldAlert, Radio, Activity, Compass, Eye, Satellite, 
  Crosshair, Zap, ArrowRight, ShieldCheck, Terminal, 
  Maximize2, AlertTriangle, Layers, Disc, Anchor, Flame, Lock
} from "lucide-react"

type AssetDomain = "AST-01" | "AST-11" | "AST-07"

export default function JADC2BattleGlassPage() {
  const [activeAsset, setActiveAsset] = useState<AssetDomain>("AST-01")
  const [fireControlActive, setFireControlActive] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Real-time Tactical Radar Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let sweepAngle = 0

    const tracks = [
      { id: "TRK-901", x: 0.35, y: 0.28, type: "HOSTILE_HGV", alt: "42km", vel: "Mach 8.4" },
      { id: "TRK-442", x: 0.72, y: 0.65, type: "UNCOOP_SAT", alt: "540km", vel: "7.6 km/s" },
      { id: "AST-01",  x: 0.48, y: 0.52, type: "FRIENDLY_SDA", alt: "510km", vel: "7.62 km/s" },
      { id: "AST-11",  x: 0.22, y: 0.78, type: "FRIENDLY_AEGIS", alt: "0m", vel: "28 kts" },
    ]

    const render = () => {
      animId = requestAnimationFrame(render)
      sweepAngle += 0.025

      const w = (canvas.width = canvas.parentElement?.clientWidth || 800)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 600)
      const cx = w * 0.5
      const cy = h * 0.5
      const maxR = Math.min(w, h) * 0.45

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      // Range Rings (125km per ring)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)"
      ctx.lineWidth = 1
      for (let r = 1; r <= 4; r++) {
        ctx.beginPath()
        ctx.arc(cx, cy, (maxR / 4) * r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Compass Crosshairs
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)"
      ctx.beginPath()
      ctx.moveTo(cx - maxR, cy)
      ctx.lineTo(cx + maxR, cy)
      ctx.moveTo(cx, cy - maxR)
      ctx.lineTo(cx, cy + maxR)
      ctx.stroke()

      // Radar Sweep Fan
      const sweepX = cx + Math.cos(sweepAngle) * maxR
      const sweepY = cy + Math.sin(sweepAngle) * maxR

      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      sweepGrad.addColorStop(0, "rgba(245, 158, 11, 0.22)")
      sweepGrad.addColorStop(1, "rgba(245, 158, 11, 0.0)")

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, maxR, sweepAngle - 0.45, sweepAngle)
      ctx.closePath()
      ctx.fillStyle = sweepGrad
      ctx.fill()

      // Sweep Leading Edge
      ctx.strokeStyle = "rgba(251, 191, 36, 0.85)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(sweepX, sweepY)
      ctx.stroke()
      ctx.restore()

      // Render Tactical Track Reticles
      tracks.forEach(trk => {
        const tx = trk.x * w
        const ty = trk.y * h

        const isHostile = trk.type.includes("HOSTILE")
        const isFriendly = trk.type.includes("FRIENDLY")

        ctx.strokeStyle = isHostile ? "#ef4444" : isFriendly ? "#f59e0b" : "#e2e8f0"
        ctx.fillStyle = ctx.strokeStyle
        ctx.lineWidth = 1.2

        ctx.strokeRect(tx - 6, ty - 6, 12, 12)
        ctx.beginPath()
        ctx.arc(tx, ty, 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = "9px monospace"
        ctx.fillText(`${trk.id} [${trk.vel}]`, tx + 9, ty - 2)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
        ctx.fillText(`ALT: ${trk.alt}`, tx + 9, ty + 9)
      })

      // Active Fire-Control Intercept Solution (Space-to-Sea Crosslink)
      if (fireControlActive) {
        const sat = tracks[2]
        const aegis = tracks[3]
        const hostile = tracks[0]

        // Crosslink Laser: AST-01 to AST-11
        ctx.strokeStyle = "rgba(245, 158, 11, 0.9)"
        ctx.setLineDash([4, 4])
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(sat.x * w, sat.y * h)
        ctx.lineTo(aegis.x * w, aegis.y * h)
        ctx.stroke()

        // Kinetic Intercept Vector: AST-11 to Hostile
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)"
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(aegis.x * w, aegis.y * h)
        ctx.lineTo(hostile.x * w, hostile.y * h)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [fireControlActive])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-mono selection:bg-amber-500/30 overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 pb-16 flex-1 flex flex-col gap-6">
        
        {/* Top Operational Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>JADC2 BATTLE MANAGEMENT GLASS // MIL-STD-6016 COMPLIANT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              MULTI-DOMAIN COMMAND GLASS (C2)
            </h1>
          </div>

          {/* Tactical Fire Control Switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFireControlActive(!fireControlActive)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${
                fireControlActive 
                  ? "bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse" 
                  : "bg-white/[0.03] border-white/20 text-neutral-300 hover:border-amber-400 hover:text-white"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{fireControlActive ? "FIRE-CONTROL ENGAGED" : "LINK INTERCEPT SOLUTION"}</span>
            </button>
          </div>
        </div>

        {/* Viewports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* LEFT 7 COLS: 2D REAL-TIME TACTICAL RADAR SWEEP */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-white/10 bg-[#020408]">
              <canvas ref={canvasRef} className="w-full h-full" />
              
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/80 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-amber-400 font-bold">RADAR MODE: SPY-6(V)1 TWS</div>
                <div className="text-neutral-400">RANGE RING: 125 KM / DIV</div>
              </div>

              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 border border-white/10 text-[10px] text-right space-y-0.5">
                <div className="text-emerald-400 font-bold">OISL LINK: 100 Gbps LOCK</div>
                <div className="text-neutral-400">LATENCY: 1.72 ms (LEO-TO-SEA)</div>
              </div>
            </div>

            {/* Engagement Kinematics Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 border border-white/10 bg-white/[0.02]">
                <span className="text-[9px] text-neutral-500 block uppercase">TRACK CORRELATION</span>
                <span className="text-sm font-bold text-white">99.84%</span>
                <span className="text-[9px] text-amber-400 block mt-0.5">EXTENDED KALMAN</span>
              </div>
              <div className="p-3 border border-white/10 bg-white/[0.02]">
                <span className="text-[9px] text-neutral-500 block uppercase">CLOSURE VELOCITY (Vc)</span>
                <span className="text-sm font-bold text-white">4.82 km/s</span>
                <span className="text-[9px] text-red-400 block mt-0.5">MACH 14.1 RELATIVE</span>
              </div>
              <div className="p-3 border border-white/10 bg-white/[0.02]">
                <span className="text-[9px] text-neutral-500 block uppercase">TIME-TO-GO (t_go)</span>
                <span className="text-sm font-bold text-amber-400">38.4 s</span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">PRO-NAV GUIDANCE</span>
              </div>
              <div className="p-3 border border-white/10 bg-white/[0.02]">
                <span className="text-[9px] text-neutral-500 block uppercase">KILL-CHAIN STATE</span>
                <span className="text-sm font-bold text-emerald-400">TRACK CLOSED</span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">F2T2EA CYCLE</span>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: MULTI-DOMAIN ASSET INSPECTOR */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Domain Switcher */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveAsset("AST-01")}
                className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                  activeAsset === "AST-01"
                    ? "bg-amber-500/15 border-amber-500 text-amber-300"
                    : "bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                <Satellite className="w-3 h-3" />
                <span>AST-01 (SPACE)</span>
              </button>

              <button
                onClick={() => setActiveAsset("AST-11")}
                className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                  activeAsset === "AST-11"
                    ? "bg-amber-500/15 border-amber-500 text-amber-300"
                    : "bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                <Anchor className="w-3 h-3" />
                <span>AST-11 (NAVAL)</span>
              </button>

              <button
                onClick={() => setActiveAsset("AST-07")}
                className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                  activeAsset === "AST-07"
                    ? "bg-amber-500/15 border-amber-500 text-amber-300"
                    : "bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>AST-07 (GLIDE)</span>
              </button>
            </div>

            {/* Asset Inspector Body */}
            <div className="p-4 border border-white/10 bg-[#080808] rounded-xl space-y-4">
              
              {/* ASSET 1: AST-01 (360 TURNTABLE) */}
              {activeAsset === "AST-01" && (
                <div className="space-y-3">
                  <InteractiveTurntable
                    src="/assets/fleet/ast-01-turntable.webm"
                    title="AST-01 EO/IR RECONNAISSANCE BUS"
                    hullCode="AST-01 // NORAD 48219"
                  />
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">PAYLOAD APERTURE</span>
                      <span className="text-white font-bold">0.85m Ritchey-Chrétien Cassegrain</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">SPECTRAL BANDS</span>
                      <span className="text-amber-400 font-bold">VNIR (0.4-1.0µm) + MWIR (3-5µm)</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">ATTITUDE DETERMINATION</span>
                      <span className="text-white font-bold">&lt; 0.002° Autonomous Star Tracker</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">CROSSLINK BANDWIDTH</span>
                      <span className="text-emerald-400 font-bold">100 Gbps Coherent 1550nm OISL</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ASSET 2: AST-11 (AEGIS DESTROYER) */}
              {activeAsset === "AST-11" && (
                <div className="space-y-3">
                  <div className="relative w-full h-72 rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                    <img 
                      src="/assets/fleet/ast-11-destroyer.jpg" 
                      alt="AST-11 Guided Missile Destroyer"
                      className="w-full h-full object-cover filter contrast-[1.1]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none"
                      }}
                    />
                    <div className="absolute top-2 left-3 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] text-amber-300 font-bold">
                      ● AST-11 AEGIS FLIGHT III GUIDED MISSILE DESTROYER
                    </div>
                    <div className="absolute bottom-2 right-3 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] text-emerald-400 font-bold">
                      96-CELL Mk 41 VLS READY
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">PRIMARY SENSOR</span>
                      <span className="text-white font-bold">AN/SPY-6(V)1 AMDR Phased Array</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">INTERCEPT INTERFACE</span>
                      <span className="text-amber-400 font-bold">SM-3 Block IIA / SM-6 Dual II</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">JADC2 DATALINK</span>
                      <span className="text-white font-bold">Link 16 / CDL-T Space Uplink</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">TARGET ENGAGEMENT</span>
                      <span className="text-emerald-400 font-bold">CEC Cooperative Engagement</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ASSET 3: AST-07 (HYPERSONIC CAPSULE) */}
              {activeAsset === "AST-07" && (
                <div className="space-y-3">
                  <div className="relative w-full h-72 rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                    <img 
                      src="/assets/fleet/ast-07-capsule.jpg" 
                      alt="AST-07 Hypersonic Re-entry Capsule"
                      className="w-full h-full object-cover filter contrast-[1.1]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none"
                      }}
                    />
                    <div className="absolute top-2 left-3 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] text-amber-300 font-bold">
                      ● AST-07 HYPERSONIC RE-ENTRY GLIDE VEHICLE
                    </div>
                    <div className="absolute bottom-2 right-3 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] text-red-400 font-bold">
                      MACH 22 AERO-THERMAL
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">THERMAL PROTECTION</span>
                      <span className="text-white font-bold">PICA-X Carbon-Phenolic Ablative</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">STAGNATION TEMP (T0)</span>
                      <span className="text-red-400 font-bold">2,840 K (Shock Ionization)</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-neutral-500">AERODYNAMIC RATIO</span>
                      <span className="text-white font-bold">L/D = 0.38 (Lifting Body Entry)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">COMMUNICATION CORRIDOR</span>
                      <span className="text-amber-400 font-bold">Magnetic Window Plasma Pen.</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* SpaceX Minimalist Footer */}
      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/10 bg-black/80 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] text-neutral-500 z-20">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider">VEROYX JADC2 NODE 01</span>
          <span className="text-neutral-800">|</span>
          <span>SECRET//NOFORN</span>
          <span className="text-neutral-800">|</span>
          <span>COPERNICUS BATTLE NETWORK</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/planetary-defense" className="hover:text-white transition-colors">PLANETARY DEFENSE</Link>
          <Link href="/hypersonic" className="hover:text-white transition-colors">HYPERSONIC CFD</Link>
          <Link href="/catalog" className="hover:text-white transition-colors">48K CATALOG</Link>
        </div>
      </footer>
    </div>
  )
}
