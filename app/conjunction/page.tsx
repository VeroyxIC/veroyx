"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import { 
  ShieldAlert, AlertTriangle, ShieldCheck, Activity, 
  Orbit, Compass, Play, Pause, RotateCcw, Flame, 
  ChevronRight, ArrowRight, Zap, Target, Box
} from "lucide-react"

interface ConjunctionEvent {
  id: string
  primary: string
  secondary: string
  tca: string
  missDistance: string
  radialMiss: string
  pc: string
  status: "CRITICAL" | "EVALUATING" | "NOMINAL"
}

export default function ConjunctionAssessmentPage() {
  const [pdamEngaged, setPdamEngaged] = useState<boolean>(false)
  const [selectedEventId, setSelectedEventId] = useState<string>("CONJ-8841")
  const bPlaneCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const events: ConjunctionEvent[] = [
    {
      id: "CONJ-8841",
      primary: "HVA-01 STATION (NORAD 25544)",
      secondary: "DEB FENGYUN 1C (NORAD 31115)",
      tca: "T+ 04h 18m 22s",
      missDistance: pdamEngaged ? "2,410 m" : "385 m",
      radialMiss: pdamEngaged ? "+1,820 m" : "-140 m",
      pc: pdamEngaged ? "4.12e-07" : "3.84e-03",
      status: pdamEngaged ? "NOMINAL" : "CRITICAL"
    },
    {
      id: "CONJ-8842",
      primary: "AST-01 RECON (NORAD 48219)",
      secondary: "COSMOS 2251 DEB (NORAD 34012)",
      tca: "T+ 11h 04m 10s",
      missDistance: "1,120 m",
      radialMiss: "+480 m",
      pc: "6.82e-05",
      status: "EVALUATING"
    },
    {
      id: "CONJ-8843",
      primary: "HVA-01 STATION (NORAD 25544)",
      secondary: "SL-16 R/B (NORAD 22220)",
      tca: "T+ 28h 45m 00s",
      missDistance: "8,940 m",
      radialMiss: "+3,200 m",
      pc: "< 1.0e-08",
      status: "NOMINAL"
    }
  ]

  const activeEvent = events.find(e => e.id === selectedEventId) || events[0]

  // B-Plane Collision Covariance Ellipse Canvas Engine
  useEffect(() => {
    const canvas = bPlaneCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let pulseTime = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      pulseTime += 0.03

      const w = (canvas.width = canvas.parentElement?.clientWidth || 700)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 450)
      const cx = w * 0.5
      const cy = h * 0.5

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      // Coordinate Grid Lines (RIC B-Plane)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)"
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Principal Axes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, h)
      ctx.stroke()

      // Primary Hard Body Sphere (HVA-01 ISS, scaled for display)
      const hbrRadius = 14
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)"
      ctx.strokeStyle = "#f59e0b"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, hbrRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Center Anchor Dot
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Target positions depending on maneuver state
      const targetOffset = pdamEngaged ? 170 : 38
      const targetAngle = pdamEngaged ? -0.85 : 0.65
      const targetX = cx + Math.cos(targetAngle) * targetOffset
      const targetY = cy + Math.sin(targetAngle) * targetOffset

      const sigmaA = 45
      const sigmaB = 22
      const ellipseAngle = 0.42

      // Draw 3-sigma, 2-sigma, 1-sigma error covariance ellipses
      for (let s = 3; s >= 1; s--) {
        ctx.save()
        ctx.translate(targetX, targetY)
        ctx.rotate(ellipseAngle)
        ctx.beginPath()
        ctx.ellipse(0, 0, sigmaA * s * 0.7, sigmaB * s * 0.7, 0, 0, Math.PI * 2)
        
        if (pdamEngaged) {
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.15 + (4 - s) * 0.15})`
          ctx.fillStyle = s === 1 ? "rgba(16, 185, 129, 0.08)" : "transparent"
        } else {
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.18 + (4 - s) * 0.18})`
          ctx.fillStyle = s === 1 ? "rgba(239, 68, 68, 0.12)" : "transparent"
        }
        ctx.lineWidth = 1.2
        ctx.stroke()
        if (s === 1) ctx.fill()
        ctx.restore()
      }

      // Debris Track Marker
      ctx.fillStyle = pdamEngaged ? "#10b981" : "#ef4444"
      ctx.beginPath()
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = pdamEngaged ? "#10b981" : "#ef4444"
      ctx.strokeRect(targetX - 8, targetY - 8, 16, 16)

      // Miss-Distance Vector Line
      ctx.strokeStyle = pdamEngaged ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)"
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(targetX, targetY)
      ctx.stroke()
      ctx.setLineDash([])

      // Labels
      ctx.font = "10px monospace"
      ctx.fillStyle = "#ffffff"
      ctx.fillText("HVA-01 (HARD BODY)", cx + 18, cy + 4)
      ctx.fillStyle = pdamEngaged ? "#10b981" : "#ef4444"
      ctx.fillText(
        `DEBRIS TRACK [MISS: ${pdamEngaged ? "2,410m (CLEAR)" : "385m (RED ALERT)"}]`,
        targetX + 12,
        targetY - 10
      )
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [pdamEngaged])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-mono selection:bg-amber-500/30 overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 pb-16 flex-1 flex flex-col gap-6">
        
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>NASA CARA CONJUNCTION ASSESSMENT // HUMAN SPACEFLIGHT (HSF)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              ORBITAL SAFETY &amp; CONJUNCTION ASSESSMENT
            </h1>
          </div>

          {/* Emergency PDAM Maneuver Trigger Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPdamEngaged(!pdamEngaged)}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2.5 shadow-lg ${
                pdamEngaged
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                  : "bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{pdamEngaged ? "PDAM BURN EXECUTED [CLEARANCE RESTORED]" : "EXECUTE PDAM AVOIDANCE BURN (+0.74 m/s)"}</span>
            </button>
          </div>
        </div>

        {/* Top 4 CARA KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">TOTAL MISS DISTANCE</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>{activeEvent.missDistance}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                pdamEngaged ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}>
                {pdamEngaged ? "OUTSIDE BOX" : "INSIDE PIZZA BOX"}
              </span>
            </div>
            <span className="text-[9px] text-neutral-400 block">RADIAL OFFSET: {activeEvent.radialMiss}</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">COLLISION PROBABILITY (Pc)</span>
            <div className={`text-lg font-bold ${pdamEngaged ? "text-emerald-400" : "text-red-400"}`}>
              {activeEvent.pc}
            </div>
            <span className="text-[9px] text-neutral-400 block">NASA CARA RED THRESHOLD: 1.00e-04</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">TIME TO CLOSEST APPROACH (TCA)</span>
            <div className="text-lg font-bold text-amber-400">
              {activeEvent.tca}
            </div>
            <span className="text-[9px] text-neutral-400 block">EPOCH: 2026-11-05 16:36:44 UTC</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">CARA KEEP-OUT VOLUME</span>
            <div className="text-lg font-bold text-white">
              ±25km × ±25km × ±0.75km
            </div>
            <span className="text-[9px] text-neutral-400 block">NASA HSF ELLIPSOID STANDARD</span>
          </div>
        </div>

        {/* Main Grid: B-Plane Encounter Canvas + HSF Asset & Conjunction Events */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* LEFT 7 COLS: B-PLANE COLLISION ENCOUNTER CANVAS */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full h-[440px] rounded-xl overflow-hidden border border-white/10 bg-[#020408]">
              <canvas ref={bPlaneCanvasRef} className="w-full h-full" />

              <div className="absolute top-3 left-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-amber-400 font-bold">ENCOUNTER PLANE (B-PLANE PROJECTION)</div>
                <div className="text-neutral-400">COMBINED 1σ, 2σ, 3σ COVARIANCE ELLIPSE</div>
              </div>

              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">PRIMARY: HVA-01 (ISS CLASS)</div>
                <div className="text-neutral-400">HARD-BODY RADIUS (HBR): 50.0 METERS</div>
              </div>

              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] text-right space-y-0.5">
                <div className={`font-bold ${pdamEngaged ? "text-emerald-400" : "text-red-400"}`}>
                  ACTION: {pdamEngaged ? "CONJUNCTION RESOLVED" : "MANEUVER MANDATORY"}
                </div>
                <div className="text-neutral-400">COWELL PROPAGATION + J2-J4</div>
              </div>
            </div>

            {/* NASA CARA Pizza Box Geometry Spec Panel */}
            <div className="p-4 rounded-xl border border-white/10 bg-[#080808] grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px]">
              <div className="space-y-1">
                <span className="text-neutral-500 block uppercase font-bold">RADIAL BOUNDARY (DR)</span>
                <span className="text-white font-bold text-xs">±0.75 km (750 m)</span>
                <p className="text-neutral-400">Altitude separation limit. Breached during nominal trajectory.</p>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 block uppercase font-bold">IN-TRACK BOUNDARY (DT)</span>
                <span className="text-white font-bold text-xs">±25.0 km</span>
                <p className="text-neutral-400">Along-velocity orbital track corridor safety tolerance.</p>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 block uppercase font-bold">CROSS-TRACK BOUNDARY (DC)</span>
                <span className="text-white font-bold text-xs">±25.0 km</span>
                <p className="text-neutral-400">Out-of-plane orbital inclination separation threshold.</p>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: HVA-01 ASSET CARD & CONJUNCTION WATCHLIST */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* HVA-01 Modular Space Station Asset Card (akmk2.jpg) */}
            <div className="p-4 border border-white/10 bg-[#080808] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase">HVA-01 MODULAR SPACE COMPLEX</span>
                </div>
                <span className="text-[10px] text-amber-300 font-bold">CREWED // 7 ABOARD</span>
              </div>

              {/* Station Hero Image (akmk2.jpg) */}
              <div className="relative w-full h-56 rounded-lg overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                <img
                  src="/assets/stations/hsf-station-hero.jpg"
                  alt="HVA-01 Modular Space Station"
                  className="w-full h-full object-contain filter contrast-[1.08]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (!target.src.includes("akmk2")) {
                      target.src = "/akmk2.jpg"
                    }
                  }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/85 border border-white/10 text-[9px] text-white">
                  NORAD 25544 // ALT: 418 KM // INC: 51.64°
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/85 border border-white/10 text-[9px] text-emerald-400 font-bold">
                  ECLSS &amp; THERMAL NOMINAL
                </div>
              </div>

              <div className="space-y-1.5 text-[10px] pt-1">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">HABITABLE VOLUME</span>
                  <span className="text-white font-bold">916 m³ (Pressurized Living Quarters)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">MICROMETEOROID SHIELD</span>
                  <span className="text-white font-bold">Multi-layer Whipple Blankets (Stuffed)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">AVOIDANCE PROPULSION</span>
                  <span className="text-amber-400 font-bold">Hypergolic Hydrazine Service Module (Δv: 180 m/s)</span>
                </div>
              </div>
            </div>

            {/* High-Interest Conjunction Event Watchlist */}
            <div className="p-4 border border-white/10 bg-[#080808] rounded-xl space-y-3">
              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase block">
                CONJUNCTION WATCHLIST (TCA &lt; 72 HOURS)
              </span>

              <div className="space-y-2">
                {events.map((evt) => {
                  const isSelected = evt.id === selectedEventId
                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEventId(evt.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-white/[0.06] border-amber-400" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-white">{evt.id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          evt.status === "CRITICAL"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : evt.status === "EVALUATING"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        }`}>
                          {evt.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {evt.primary} vs {evt.secondary}
                      </div>
                      <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                        <span>MISS: {evt.missDistance}</span>
                        <span>Pc: {evt.pc}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* SpaceX Minimalist Footer */}
      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/10 bg-black/80 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] text-neutral-500 z-20">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider">VEROYX FLIGHT SAFETY // NASA CARA PROTOCOL</span>
          <span className="text-neutral-800">|</span>
          <span>18TH SPACE DEFENSE SQUADRON (18 SDS) FEED</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/c2" className="hover:text-white transition-colors">JADC2 C2</Link>
          <Link href="/planetary-defense" className="hover:text-white transition-colors">PLANETARY DEFENSE</Link>
          <Link href="/catalog" className="hover:text-white transition-colors">48K CATALOG</Link>
        </div>
      </footer>
    </div>
  )
}
