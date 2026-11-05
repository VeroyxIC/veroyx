"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import { 
  ShieldAlert, Target, Crosshair, Orbit, Compass, 
  Flame, Zap, Activity, ArrowRight, ShieldCheck, 
  AlertTriangle, RotateCcw, Sliders, Globe, Radio, Sparkles
} from "lucide-react"

export default function PlanetaryDefensePage() {
  const [deltaV, setDeltaV] = useState<number>(3.8) // cm/s
  const [betaFactor, setBetaFactor] = useState<number>(2.4)
  const [interceptEngaged, setInterceptEngaged] = useState<boolean>(true)
  const [leadTimeYears, setLeadTimeYears] = useState<number>(3.5)
  const orbitCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const effectiveDeltaV_mps = (deltaV * 0.01) * betaFactor
  const leadTimeSec = leadTimeYears * 365.25 * 86400
  const totalDeflectionKm = Math.round((effectiveDeltaV_mps * leadTimeSec) / 1000)
  
  const nominalPerigeeKm = 31600
  const actualPerigeeKm = interceptEngaged ? nominalPerigeeKm + totalDeflectionKm : nominalPerigeeKm

  // 1. Heliocentric Orbital Deflection Canvas
  useEffect(() => {
    const canvas = orbitCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let time = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      time += 0.015

      const w = (canvas.width = canvas.parentElement?.clientWidth || 740)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 480)
      const cx = w * 0.44
      const cy = h * 0.52
      const auScale = Math.min(w, h) * 0.38

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)"
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 45) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 45) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Sun
      const sunPulse = Math.sin(time * 2.0) * 2 + 10
      const sunGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28)
      sunGrad.addColorStop(0, "#ffffff")
      sunGrad.addColorStop(0.3, "#f59e0b")
      sunGrad.addColorStop(0.8, "rgba(234, 88, 12, 0.2)")
      sunGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = sunGrad
      ctx.beginPath()
      ctx.arc(cx, cy, 28, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#fbbf24"
      ctx.beginPath()
      ctx.arc(cx, cy, sunPulse * 0.6, 0, Math.PI * 2)
      ctx.fill()

      // Earth Orbit
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = 1.2
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.arc(cx, cy, auScale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      const earthAngle = 0.22
      const earthX = cx + Math.cos(earthAngle) * auScale
      const earthY = cy + Math.sin(earthAngle) * auScale

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"
      ctx.beginPath()
      ctx.arc(earthX, earthY, 14, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(earthX, earthY, 4.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = "9px monospace"
      ctx.fillStyle = "#ffffff"
      ctx.fillText("EARTH (1.00 AU)", earthX + 16, earthY + 3)

      // Apophis Orbit
      const apophisA = auScale * 0.922
      const apophisB = auScale * 0.885
      const focusOffsetX = auScale * 0.176

      ctx.save()
      ctx.translate(cx - focusOffsetX, cy)
      ctx.rotate(-0.18)
      ctx.strokeStyle = interceptEngaged ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.85)"
      ctx.lineWidth = interceptEngaged ? 1.0 : 1.8
      if (interceptEngaged) ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.ellipse(0, 0, apophisA, apophisB, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      if (interceptEngaged) {
        ctx.save()
        ctx.translate(cx - focusOffsetX * 1.08, cy)
        ctx.rotate(-0.25)
        ctx.strokeStyle = "#10b981"
        ctx.lineWidth = 2.0
        ctx.beginPath()
        const deflA = apophisA * (1.0 + (totalDeflectionKm / 350000) * 0.09)
        const deflB = apophisB * (1.0 + (totalDeflectionKm / 350000) * 0.08)
        ctx.ellipse(0, 0, deflA, deflB, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // Impact Reticle
      const impactAngle = -1.15
      const impactX = cx + Math.cos(impactAngle) * (auScale * 0.84)
      const impactY = cy + Math.sin(impactAngle) * (auScale * 0.84)

      ctx.strokeStyle = "#f59e0b"
      ctx.lineWidth = 1.4
      ctx.strokeRect(impactX - 9, impactY - 9, 18, 18)

      ctx.fillStyle = "#f59e0b"
      ctx.beginPath()
      ctx.arc(impactX, impactY, 3, 0, Math.PI * 2)
      ctx.fill()

      const impactPulse = (Math.sin(time * 4) * 0.5 + 0.5) * 16
      ctx.strokeStyle = "rgba(245, 158, 11, 0.6)"
      ctx.beginPath()
      ctx.arc(impactX, impactY, 10 + impactPulse, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = "#f59e0b"
      ctx.fillText("KINETIC IMPACT (DART-II)", impactX + 14, impactY - 2)
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      ctx.fillText(`Δv: +${deltaV.toFixed(1)} cm/s (β=${betaFactor.toFixed(1)})`, impactX + 14, impactY + 10)

      // Closest Approach Perigee Vector
      const missScale = Math.min(110, 18 + (totalDeflectionKm / 1000) * 0.65)
      const approachX = earthX - (interceptEngaged ? missScale : 14)
      const approachY = earthY + 8

      ctx.strokeStyle = interceptEngaged ? "#10b981" : "#ef4444"
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(earthX, earthY)
      ctx.lineTo(approachX, approachY)
      ctx.stroke()

      ctx.fillStyle = interceptEngaged ? "#10b981" : "#ef4444"
      ctx.beginPath()
      ctx.arc(approachX, approachY, 3.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillText(
        `PERIGEE: ${actualPerigeeKm.toLocaleString()} km [${interceptEngaged ? "KEYHOLE MISSED" : "GRAZING GEO"}]`,
        earthX - 110,
        earthY + 36
      )
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [deltaV, betaFactor, interceptEngaged, totalDeflectionKm, actualPerigeeKm])

  // 2. Procedural Goldstone Radar Delay-Doppler Asteroid Mesh Canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let rot = 0

    // Irregular polyhedral vertices for Apophis
    const nodes = [
      { x: -0.7, y: -0.4, z: -0.3 }, { x: 0.8, y: -0.3, z: -0.2 },
      { x: 0.5, y: 0.6, z: -0.4 }, { x: -0.6, y: 0.5, z: -0.2 },
      { x: -0.4, y: -0.6, z: 0.5 }, { x: 0.7, y: -0.5, z: 0.4 },
      { x: 0.6, y: 0.7, z: 0.3 }, { x: -0.5, y: 0.6, z: 0.5 },
      { x: 0.0, y: -0.8, z: 0.1 }, { x: 0.0, y: 0.8, z: 0.0 },
      { x: 0.9, y: 0.1, z: 0.2 }, { x: -0.8, y: -0.1, z: 0.1 }
    ]

    const edges = [
      [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],[8,0],[8,1],[8,4],[8,5],
      [9,2],[9,3],[9,6],[9,7],[10,1],[10,2],[10,5],[10,6],
      [11,0],[11,3],[11,4],[11,7]
    ]

    const render = () => {
      animId = requestAnimationFrame(render)
      rot += 0.012

      const w = (canvas.width = canvas.parentElement?.clientWidth || 400)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 210)
      const cx = w * 0.5
      const cy = h * 0.5
      const scale = Math.min(w, h) * 0.48

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      // Radar scanlines
      ctx.strokeStyle = "rgba(245, 158, 11, 0.05)"
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 8) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Rotate and project 3D vertices
      const proj = nodes.map(n => {
        const cosY = Math.cos(rot), sinY = Math.sin(rot)
        const cosX = Math.cos(0.35), sinX = Math.sin(0.35)

        // Rotate Y
        const x1 = n.x * cosY + n.z * sinY
        const z1 = -n.x * sinY + n.z * cosY
        // Rotate X
        const y2 = n.y * cosX - z1 * sinX
        const z2 = n.y * sinX + z1 * cosX

        const f = 2.2 / (2.2 + z2)
        return {
          x: cx + x1 * scale * f,
          y: cy + y2 * scale * f,
          z: z2
        }
      })

      // Draw wireframe edges
      edges.forEach(([i, j]) => {
        const p1 = proj[i], p2 = proj[j]
        const avgZ = (p1.z + p2.z) * 0.5
        const alpha = Math.max(0.12, 0.6 + avgZ * 0.4)

        ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      })

      // Vertices
      proj.forEach(p => {
        ctx.fillStyle = p.z > 0 ? "#ffffff" : "#f59e0b"
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.z > 0 ? 2.5 : 1.5, 0, Math.PI * 2)
        ctx.fill()
      })

      // Radar corner tag
      ctx.font = "8px monospace"
      ctx.fillStyle = "rgba(245, 158, 11, 0.8)"
      ctx.fillText("GOLDSTONE DSN 70m RADAR // DELAY-DOPPLER 3D MODEL", 10, 16)
      ctx.fillText(`AZ: ${(rot * 57.3 % 360).toFixed(0)}° // ROT: 30.56h`, 10, 26)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-mono selection:bg-amber-500/30 overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 pb-16 flex-1 flex flex-col gap-6">
        
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>NASA CNEOS SENTRY STANDARD // PLANETARY DEFENSE COORDINATION OFFICE (PDCO)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              PLANETARY DEFENSE &amp; KINETIC INTERCEPT THEATER
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setInterceptEngaged(!interceptEngaged)}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2.5 shadow-lg ${
                interceptEngaged
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                  : "bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
              }`}
            >
              <Target className="w-4 h-4" />
              <span>{interceptEngaged ? "DEFLECTION TRAJECTORY ENGAGED" : "NOMINAL THREAT [CLICK TO DEFLECT]"}</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">PRIMARY TARGET</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>9942 APOPHIS</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                POTENTIALLY HAZARDOUS
              </span>
            </div>
            <span className="text-[9px] text-neutral-400 block">DIAMETER: ~340m // MASS: 6.1e10 kg</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">EARTH PERIGEE MISS DISTANCE</span>
            <div className={`text-lg font-bold ${interceptEngaged ? "text-emerald-400" : "text-red-400"}`}>
              {actualPerigeeKm.toLocaleString()} km
            </div>
            <span className="text-[9px] text-neutral-400 block">
              {interceptEngaged ? `DEFLECTION MARGIN: +${totalDeflectionKm.toLocaleString()} km` : "GEO BELT: 35,786 km (BREACH RISK)"}
            </span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">PALERMO TECHNICAL SCALE</span>
            <div className={`text-lg font-bold ${interceptEngaged ? "text-emerald-400" : "text-red-400"}`}>
              {interceptEngaged ? "< -4.00 (ZERO IMPACT RISK)" : "-0.84 (EXTENDED MONITORING)"}
            </div>
            <span className="text-[9px] text-neutral-400 block">TORINO SCALE: LEVEL {interceptEngaged ? "0 (WHITE)" : "1 (GREEN)"}</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">GRAVITATIONAL KEYHOLE 7b</span>
            <div className={`text-lg font-bold ${interceptEngaged ? "text-emerald-400" : "text-red-400"}`}>
              {interceptEngaged ? "CLEARED (> 120km OFFSET)" : "KEYHOLE BREACH: 3.2%"}
            </div>
            <span className="text-[9px] text-neutral-400 block">2029 CLOSE APPROACH RESONANCE</span>
          </div>
        </div>

        {/* Viewports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* LEFT 7 COLS: HELIOCENTRIC ORBITAL DEFLECTION SIMULATOR */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full h-[470px] rounded-xl overflow-hidden border border-white/10 bg-[#020408]">
              <canvas ref={orbitCanvasRef} className="w-full h-full" />

              <div className="absolute top-3 left-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-amber-400 font-bold">HELIOCENTRIC DEFLECTION KINEMATICS</div>
                <div className="text-neutral-400">1.0 AU REFERENCE PLANE (J2000 ECLIPTIC)</div>
              </div>

              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">INTERCEPTOR: DART-II HYPERVELOCITY STAGE</div>
                <div className="text-neutral-400">RELATIVE IMPACT VELOCITY: 6.84 km/s</div>
              </div>

              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] text-right space-y-0.5">
                <div className={`font-bold ${interceptEngaged ? "text-emerald-400" : "text-red-400"}`}>
                  STATUS: {interceptEngaged ? "EARTH SAFE // ORBIT ALTERED" : "NOMINAL CLOSE PASS"}
                </div>
                <div className="text-neutral-400">COWELL NUMERICAL INTEGRATION</div>
              </div>
            </div>

            {/* Kinetic Deflection Physics Sliders Panel */}
            <div className="p-4 rounded-xl border border-white/10 bg-[#080808] space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>KINETIC IMPULSE PARAMETER CONTROLS</span>
                </div>
                <button
                  onClick={() => { setDeltaV(3.8); setBetaFactor(2.4); setLeadTimeYears(3.5); }}
                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET NASA DART BASELINE</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-[11px]">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Δv IMPULSE:</span>
                    <span className="text-amber-400 font-bold">{deltaV.toFixed(1)} cm/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.1"
                    value={deltaV}
                    onChange={(e) => setDeltaV(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-800 cursor-pointer"
                  />
                  <span className="text-[9px] text-neutral-500 block">Linear velocity change applied at intercept</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">BETA FACTOR (β):</span>
                    <span className="text-white font-bold">{betaFactor.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={betaFactor}
                    onChange={(e) => setBetaFactor(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-800 cursor-pointer"
                  />
                  <span className="text-[9px] text-neutral-500 block">Ejecta crater momentum enhancement</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">LEAD TIME:</span>
                    <span className="text-emerald-400 font-bold">{leadTimeYears.toFixed(1)} YEARS</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={leadTimeYears}
                    onChange={(e) => setLeadTimeYears(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-800 cursor-pointer"
                  />
                  <span className="text-[9px] text-neutral-500 block">Duration between impact and Earth perigee</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: PROCEDURAL GOLDSTONE RADAR MESH CANVAS & DART-II */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            <div className="p-4 border border-white/10 bg-[#080808] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase">ASTEROID 9942 APOPHIS PROFILE</span>
                </div>
                <span className="text-[10px] text-amber-300 font-bold">CHONDRITE (Sq-TYPE)</span>
              </div>

              {/* LIVE 3D GOLDSTONE RADAR DELAY-DOPPLER MESH CANVAS (ZERO BROKEN IMAGES) */}
              <div className="relative w-full h-52 rounded-lg overflow-hidden border border-white/10 bg-black">
                <canvas ref={radarCanvasRef} className="w-full h-full" />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/85 border border-white/10 text-[9px] text-amber-400 font-bold">
                  ROTATION PERIOD: 30.56 HOURS
                </div>
              </div>

              <div className="space-y-1.5 text-[10px] pt-1">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">ESTIMATED BULK DENSITY</span>
                  <span className="text-white font-bold">2.60 g/cm³ (Porosity ~25-30%)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">KINETIC ENERGY AT IMPACT</span>
                  <span className="text-white font-bold">1,200 Megatons TNT (Unmitigated)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">MIN. ORBIT INTERSECTION (MOID)</span>
                  <span className="text-amber-400 font-bold">0.00021 AU (31,400 km)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">YARKOVSKY ACCELERATION (da/dt)</span>
                  <span className="text-white font-bold">-2.7 × 10⁻⁴ AU / Myr</span>
                </div>
              </div>
            </div>

            {/* Impactor Specs */}
            <div className="p-4 border border-white/10 bg-[#080808] rounded-xl space-y-3">
              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase block">
                DART-II KINETIC INTERCEPTOR FLIGHT VEHICLE
              </span>

              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">DRY MASS (IMPACT MASS)</span>
                  <span className="text-white font-bold">1,250 kg (Titanium/Carbon Composite)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">AUTONOMOUS GUIDANCE</span>
                  <span className="text-white font-bold">SMART Nav Optical Terminal Targeting</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">OPTICAL SENSOR</span>
                  <span className="text-amber-400 font-bold">DRACO Narrow-Angle Imager</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">PROPULSION STAGE</span>
                  <span className="text-emerald-400 font-bold">NEXT-C Gridded Ion Thruster + Monoprop RCS</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/10 bg-black/80 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] text-neutral-500 z-20">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider">VEROYX PLANETARY DEFENSE NODE</span>
          <span className="text-neutral-800">|</span>
          <span>IAWN / PDCO PROTOCOL COMPLIANT</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/c2" className="hover:text-white transition-colors">JADC2 C2</Link>
          <Link href="/conjunction" className="hover:text-white transition-colors">CONJUNCTION</Link>
          <Link href="/hypersonic" className="hover:text-white transition-colors">HYPERSONIC CFD</Link>
        </div>
      </footer>
    </div>
  )
}
