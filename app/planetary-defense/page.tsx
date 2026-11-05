"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import Asteroid3DViewport from "@/components/three/Asteroid3DViewport"
import { 
  ShieldAlert, Target, Crosshair, Orbit, Compass, 
  Flame, Zap, Activity, ArrowRight, ShieldCheck, 
  AlertTriangle, RotateCcw, Sliders, Globe, Radio, 
  Play, Pause, FastForward, Info
} from "lucide-react"

export default function PlanetaryDefensePage() {
  const [deltaV, setDeltaV] = useState<number>(3.8) // cm/s
  const [betaFactor, setBetaFactor] = useState<number>(2.4)
  const [interceptEngaged, setInterceptEngaged] = useState<boolean>(true)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [epochProgress, setEpochProgress] = useState<number>(0.28) // 0.0 (2026) -> 1.0 (April 13, 2029)
  const orbitCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const effectiveDeltaV_mps = (deltaV * 0.01) * betaFactor
  const totalDeflectionKm = Math.round((effectiveDeltaV_mps * (3.5 * 365.25 * 86400)) / 1000)
  
  const nominalPerigeeKm = 31600
  const actualPerigeeKm = interceptEngaged ? nominalPerigeeKm + totalDeflectionKm : nominalPerigeeKm

  // 4D EPOCH SIMULATION TIMELINE
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setEpochProgress((prev) => (prev >= 1.0 ? 0.0 : prev + 0.0018))
    }, 28)
    return () => clearInterval(interval)
  }, [isPlaying])

  // Convert progress (0 -> 1) to date string between 2026-11-05 and 2029-04-13
  const startEpoch = new Date("2026-11-05T00:00:00Z").getTime()
  const endEpoch = new Date("2029-04-13T21:46:00Z").getTime()
  const currentEpochDate = new Date(startEpoch + (endEpoch - startEpoch) * epochProgress)
  const formattedEpoch = currentEpochDate.toISOString().replace("T", " ").substring(0, 19) + " UTC"

  // 4D KEPLERIAN HELIOCENTRIC ORBITAL PROPAGATOR CANVAS
  useEffect(() => {
    const canvas = orbitCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number

    const render = () => {
      animId = requestAnimationFrame(render)

      const w = (canvas.width = canvas.parentElement?.clientWidth || 740)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 480)
      const cx = w * 0.44
      const cy = h * 0.52
      const auScale = Math.min(w, h) * 0.38

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      // Astronomical Coordinate Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)"
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 44) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 44) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Range Rings (0.25 AU, 0.50 AU, 0.75 AU, 1.00 AU)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)"
      ctx.setLineDash([2, 4])
      for (let r = 1; r <= 4; r++) {
        ctx.beginPath()
        ctx.arc(cx, cy, (auScale / 4) * r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // 1. Sol (Sun) - High-intensity star
      const sunGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26)
      sunGrad.addColorStop(0, "#ffffff")
      sunGrad.addColorStop(0.35, "rgba(255, 255, 255, 0.8)")
      sunGrad.addColorStop(0.7, "rgba(226, 232, 240, 0.15)")
      sunGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = sunGrad
      ctx.beginPath()
      ctx.arc(cx, cy, 26, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2)
      ctx.fill()

      // 2. Earth Heliocentric Orbit (1.00 AU)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)"
      ctx.lineWidth = 1.2
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.arc(cx, cy, auScale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Earth instantaneous position along orbit
      // Earth completes ~2.44 orbits between Nov 2026 and April 2029
      const earthAngle = 0.22 + epochProgress * (Math.PI * 2 * 2.44)
      const earthX = cx + Math.cos(earthAngle) * auScale
      const earthY = cy + Math.sin(earthAngle) * auScale

      // Earth GEO & Lunar clearance halos
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"
      ctx.beginPath()
      ctx.arc(earthX, earthY, 13, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(earthX, earthY, 4.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = "9px monospace"
      ctx.fillStyle = "#ffffff"
      ctx.fillText("EARTH", earthX + 16, earthY + 3)

      // 3. Apophis Trajectory (a = 0.922 AU, e = 0.191)
      const apophisA = auScale * 0.922
      const apophisB = auScale * 0.885
      const focusOffsetX = auScale * 0.176

      ctx.save()
      ctx.translate(cx - focusOffsetX, cy)
      ctx.rotate(-0.18)

      // Nominal Hazard Orbit
      ctx.strokeStyle = interceptEngaged ? "rgba(244, 63, 94, 0.25)" : "rgba(244, 63, 94, 0.85)"
      ctx.lineWidth = interceptEngaged ? 1.0 : 1.8
      if (interceptEngaged) ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.ellipse(0, 0, apophisA, apophisB, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Deflected Trajectory
      if (interceptEngaged) {
        ctx.save()
        ctx.translate(cx - focusOffsetX * 1.08, cy)
        ctx.rotate(-0.25)
        ctx.strokeStyle = "#38bdf8"
        ctx.lineWidth = 1.8
        ctx.beginPath()
        const deflA = apophisA * (1.0 + (totalDeflectionKm / 350000) * 0.09)
        const deflB = apophisB * (1.0 + (totalDeflectionKm / 350000) * 0.08)
        ctx.ellipse(0, 0, deflA, deflB, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // 4. Apophis Instantaneous Position
      // Period is 323.6 days (~0.886 years) -> ~2.75 revolutions
      const apophisAngle = -0.18 + epochProgress * (Math.PI * 2 * 2.75)
      const currentR = apophisA * (1 - 0.191 * Math.cos(apophisAngle))
      const targetA = interceptEngaged ? apophisAngle - 0.07 : apophisAngle
      const apophisX = (cx - focusOffsetX) + Math.cos(targetA) * currentR
      const apophisY = cy + Math.sin(targetA) * (currentR * 0.96)

      // Apophis marker
      ctx.fillStyle = interceptEngaged ? "#38bdf8" : "#f43f5e"
      ctx.beginPath()
      ctx.arc(apophisX, apophisY, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = ctx.fillStyle
      ctx.strokeRect(apophisX - 7, apophisY - 7, 14, 14)

      ctx.fillStyle = "#ffffff"
      ctx.fillText("9942 APOPHIS", apophisX + 11, apophisY - 2)

      // 5. Line-of-sight range vector to Earth
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)"
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(earthX, earthY)
      ctx.lineTo(apophisX, apophisY)
      ctx.stroke()
      ctx.setLineDash([])

      // Compute dynamic range in millions of km
      const dxAU = (earthX - apophisX) / auScale
      const dyAU = (earthY - apophisY) / auScale
      const distAU = Math.sqrt(dxAU * dxAU + dyAU * dyAU)
      const distMkm = (distAU * 149.6).toFixed(2)

      ctx.font = "8px monospace"
      ctx.fillStyle = "#94a3b8"
      ctx.fillText(`DIST: ${distMkm}M km (${distAU.toFixed(3)} AU)`, (earthX + apophisX) * 0.5 + 8, (earthY + apophisY) * 0.5 - 4)

      // 6. Kinetic Impact Epoch Flash Marker
      const impactAngle = -1.15
      const impactX = cx + Math.cos(impactAngle) * (auScale * 0.84)
      const impactY = cy + Math.sin(impactAngle) * (auScale * 0.84)

      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1.2
      ctx.strokeRect(impactX - 8, impactY - 8, 16, 16)
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(impactX, impactY, 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = "9px monospace"
      ctx.fillText("DART-II INTERCEPT NODE", impactX + 12, impactY - 2)
      ctx.fillStyle = "#94a3b8"
      ctx.fillText(`Δv: +${deltaV.toFixed(1)} cm/s (β=${betaFactor.toFixed(1)})`, impactX + 12, impactY + 9)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [deltaV, betaFactor, interceptEngaged, epochProgress, totalDeflectionKm])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-mono selection:bg-white/20 overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 pb-16 flex-1 flex flex-col gap-5">
        
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-white/[0.03] border border-white/10 text-slate-300 text-[10px] font-bold tracking-[0.25em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>NASA CNEOS SENTRY // PLANETARY DEFENSE COORDINATION OFFICE (PDCO)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              PLANETARY DEFENSE &amp; KINETIC INTERCEPT THEATER
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setInterceptEngaged(!interceptEngaged)}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2.5 ${
                interceptEngaged
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  : "bg-rose-500/15 border-rose-500 text-rose-300 hover:bg-rose-500/25 animate-pulse"
              }`}
            >
              <Target className="w-4 h-4" />
              <span>{interceptEngaged ? "DEFLECTION TRAJECTORY ENGAGED" : "NOMINAL HAZARD [ENGAGE DEFLECTION]"}</span>
            </button>
          </div>
        </div>

        {/* 4 SpaceX Starshield KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">PRIMARY TARGET</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>9942 APOPHIS</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/10 border border-white/20 text-slate-300">
                PHA Sq-TYPE
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block">DIAMETER: ~340m // MASS: 6.1e10 kg</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">EARTH PERIGEE MISS DISTANCE</span>
            <div className={`text-lg font-bold ${interceptEngaged ? "text-emerald-400" : "text-rose-400"}`}>
              {actualPerigeeKm.toLocaleString()} km
            </div>
            <span className="text-[9px] text-slate-400 block">
              {interceptEngaged ? `DEFLECTION MARGIN: +${totalDeflectionKm.toLocaleString()} km` : "GEO BELT: 35,786 km (BREACH RISK)"}
            </span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">PALERMO TECHNICAL SCALE</span>
            <div className={`text-lg font-bold ${interceptEngaged ? "text-emerald-400" : "text-rose-400"}`}>
              {interceptEngaged ? "< -4.00 (ZERO IMPACT RISK)" : "-0.84 (EXTENDED MONITORING)"}
            </div>
            <span className="text-[9px] text-slate-400 block">TORINO SCALE: LEVEL {interceptEngaged ? "0 (WHITE)" : "1 (GREEN)"}</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">GRAVITATIONAL KEYHOLE 7b</span>
            <div className={`text-lg font-bold ${interceptEngaged ? "text-emerald-400" : "text-rose-400"}`}>
              {interceptEngaged ? "CLEARED (> 120km OFFSET)" : "KEYHOLE BREACH: 3.2%"}
            </div>
            <span className="text-[9px] text-slate-400 block">2029 CLOSE APPROACH RESONANCE</span>
          </div>
        </div>

        {/* Viewports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          
          {/* LEFT 7 COLS: 4D EPOCH ORBITAL PROPAGATOR CANVAS */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative w-full h-[460px] border border-white/[0.08] bg-[#020408]">
              <canvas ref={orbitCanvasRef} className="w-full h-full" />

              <div className="absolute top-3 left-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">4D HELIOCENTRIC ORBIT PROPAGATOR</div>
                <div className="text-slate-400">EPOCH: {formattedEpoch}</div>
              </div>

              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">INTERCEPTOR: DART-II HYPERVELOCITY STAGE</div>
                <div className="text-slate-400">RELATIVE IMPACT VELOCITY: 6.84 km/s</div>
              </div>

              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px] text-right space-y-0.5">
                <div className={`font-bold ${interceptEngaged ? "text-emerald-400" : "text-rose-400"}`}>
                  STATUS: {interceptEngaged ? "EARTH SAFE // ORBIT ALTERED" : "NOMINAL CLOSE PASS"}
                </div>
                <div className="text-slate-400">COWELL NUMERICAL INTEGRATION</div>
              </div>
            </div>

            {/* 4D Timeline Scrubber Controls */}
            <div className="p-3 border border-white/[0.08] bg-[#06080d] flex items-center gap-4 text-xs">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 border border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
              >
                {isPlaying ? <Pause className="w-3 h-3 text-sky-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                <span>{isPlaying ? "PAUSE TIME" : "PLAY 4D"}</span>
              </button>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>2026-11-05 (NOW)</span>
                  <span className="text-white font-bold">SIM EPOCH: {formattedEpoch}</span>
                  <span>2029-04-13 (CLOSE ENCOUNTER)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={epochProgress}
                  onChange={(e) => {
                    setIsPlaying(false)
                    setEpochProgress(parseFloat(e.target.value))
                  }}
                  className="w-full accent-white bg-neutral-800 cursor-pointer h-1"
                />
              </div>
            </div>

            {/* Kinetic Deflection Sliders */}
            <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2 text-white font-bold tracking-wider text-[11px]">
                  <Sliders className="w-3.5 h-3.5 text-white" />
                  <span>KINETIC IMPULSE PARAMETER CONTROLS</span>
                </div>
                <button
                  onClick={() => { setDeltaV(3.8); setBetaFactor(2.4); }}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET DART BASELINE</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1 text-[11px]">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Δv IMPULSE:</span>
                    <span className="text-white font-bold">{deltaV.toFixed(1)} cm/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.1"
                    value={deltaV}
                    onChange={(e) => setDeltaV(parseFloat(e.target.value))}
                    className="w-full accent-white bg-neutral-800 cursor-pointer h-1"
                  />
                  <span className="text-[8px] text-slate-500 block">Linear velocity change applied at intercept</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">BETA FACTOR (β):</span>
                    <span className="text-white font-bold">{betaFactor.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={betaFactor}
                    onChange={(e) => setBetaFactor(parseFloat(e.target.value))}
                    className="w-full accent-white bg-neutral-800 cursor-pointer h-1"
                  />
                  <span className="text-[8px] text-slate-500 block">Ejecta crater momentum enhancement</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: MULTIMODAL 3D SENSOR VIEWPORT & ASTRODYNAMICS */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            
            {/* MULTIMODAL 3D ASTEROID SENSOR VIEWPORT */}
            <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">MULTIMODAL SENSOR FUSION VIEWPORT</span>
                </div>
                <span className="text-[10px] text-slate-400">APOPHIS Sq-TYPE</span>
              </div>

              <div className="relative w-full h-64 border border-white/[0.08] bg-black overflow-hidden">
                <Asteroid3DViewport />
              </div>
            </div>

            {/* NASA JPL HORIZONS KEPLERIAN ELEMENTS */}
            <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-2 text-[10px]">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block border-b border-white/[0.08] pb-1.5">
                JPL HORIZONS OSCULATING KEPLERIAN ELEMENTS (J2000)
              </span>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">SEMI-MAJOR (a)</span>
                  <span className="text-white font-bold">0.9224 AU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ECCENTRICITY (e)</span>
                  <span className="text-white font-bold">0.1912</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">INCLINATION (i)</span>
                  <span className="text-white font-bold">3.331°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ASCENDING NODE (Ω)</span>
                  <span className="text-white font-bold">204.4°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ARG. PERIHELION (ω)</span>
                  <span className="text-white font-bold">126.4°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ORBITAL PERIOD (P)</span>
                  <span className="text-white font-bold">323.6 DAYS</span>
                </div>
              </div>
            </div>

            {/* DART-II INTERCEPTOR SPECIFICATIONS */}
            <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-2 text-[10px]">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block border-b border-white/[0.08] pb-1.5">
                DART-II KINETIC IMPACTOR VEHICLE
              </span>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">IMPACT DRY MASS</span>
                  <span className="text-white font-bold">1,250 kg (Carbon-Titanium)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TERMINAL GUIDANCE</span>
                  <span className="text-white font-bold">SMART Nav Optical Centroiding</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PROPULSION BUS</span>
                  <span className="text-emerald-400 font-bold">NEXT-C Gridded Ion Propulsion</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* SpaceX Minimalist Footer */}
      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/[0.08] bg-black/90 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] text-slate-500 z-20">
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
