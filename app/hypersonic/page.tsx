"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import { 
  Flame, Wind, Activity, Compass, ShieldAlert, 
  RotateCcw, Sliders, ArrowRight, ShieldCheck, 
  Radio, Zap, Layers, ChevronRight
} from "lucide-react"

export default function HypersonicCFDPage() {
  const [machNumber, setMachNumber] = useState<number>(22.4)
  const [altitudeKm, setAltitudeKm] = useState<number>(68.5)
  const [angleAttackDeg, setAngleAttackDeg] = useState<number>(18.0)
  const [magneticWindowActive, setMagneticWindowActive] = useState<boolean>(true)
  const cfdCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const ambientTempK = 218.0
  const stagnationTempK = Math.round(ambientTempK * (1 + 0.2 * Math.pow(machNumber, 1.48)))
  const dynamicPressureKPa = (0.5 * 0.00012 * Math.pow(machNumber * 300, 2)).toFixed(1)
  const heatFluxMW_m2 = (0.11 * Math.sqrt(0.00012 / 0.8) * Math.pow(machNumber * 300, 3) / 1000000).toFixed(2)
  const shockAngleDeg = (Math.asin(Math.max(0.05, 1 / machNumber)) * (180 / Math.PI)).toFixed(1)

  // High-Density Supersonic Navier-Stokes CFD Streamlines Engine
  useEffect(() => {
    const canvas = cfdCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let time = 0

    // 160 Dense Streamline particles
    const streamlines = Array.from({ length: 160 }).map(() => ({
      x: Math.random() * -400,
      y: (Math.random() - 0.5) * 400,
      speed: 16 + Math.random() * 12,
      length: 30 + Math.random() * 50
    }))

    const render = () => {
      animId = requestAnimationFrame(render)
      time += 0.035

      const w = (canvas.width = canvas.parentElement?.clientWidth || 740)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 470)
      const cx = w * 0.48
      const cy = h * 0.5

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      const betaRad = Math.asin(Math.max(0.06, 1 / machNumber))
      const noseX = cx - 75
      const noseY = cy

      // 1. Plasma Shock Stagnation Heat-Map Glow
      const shockGrad = ctx.createRadialGradient(noseX, noseY, 8, noseX, noseY, 260)
      shockGrad.addColorStop(0, "rgba(255, 69, 0, 0.42)")
      shockGrad.addColorStop(0.35, "rgba(255, 165, 0, 0.22)")
      shockGrad.addColorStop(0.75, "rgba(255, 255, 255, 0.04)")
      shockGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = shockGrad
      ctx.beginPath()
      ctx.arc(noseX, noseY, 260, 0, Math.PI * 2)
      ctx.fill()

      // 2. Continuous Curved Hyperbolic Shock Front
      ctx.save()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2.4
      ctx.shadowColor = "#f59e0b"
      ctx.shadowBlur = 18

      ctx.beginPath()
      for (let y = -220; y <= 220; y += 4) {
        const standoff = 24 / Math.sqrt(machNumber)
        const shockX = noseX - standoff - (Math.pow(y, 2) / (120 * Math.tan(betaRad)))
        if (y === -220) ctx.moveTo(shockX, noseY + y)
        else ctx.lineTo(shockX, noseY + y)
      }
      ctx.stroke()
      ctx.restore()

      // 3. Navier-Stokes High-Velocity Deflected Streamlines
      streamlines.forEach(s => {
        s.x += s.speed * (machNumber / 14)
        if (s.x > w + 60) {
          s.x = -60
          s.y = (Math.random() - 0.5) * 400
        }

        const dx = s.x - noseX
        const dy = s.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        let drawY = noseY + s.y
        if (dist < 105 && s.x > noseX - 45) {
          drawY += dy > 0 ? (105 - dist) * 0.75 : -(105 - dist) * 0.75
        }

        ctx.strokeStyle = dist < 130 
          ? "rgba(251, 191, 36, 0.65)" 
          : "rgba(255, 255, 255, 0.18)"
        ctx.lineWidth = dist < 130 ? 1.6 : 1.0

        ctx.beginPath()
        ctx.moveTo(s.x, drawY)
        ctx.lineTo(s.x + s.length, drawY)
        ctx.stroke()
      })

      // 4. Shaded AST-07 Capsule Cross-Section
      ctx.save()
      ctx.translate(noseX, noseY)
      ctx.rotate((angleAttackDeg * Math.PI) / 180)

      ctx.fillStyle = "#0f172a"
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1.8

      ctx.beginPath()
      ctx.arc(28, 0, 36, Math.PI * 0.55, Math.PI * 1.45)
      ctx.lineTo(125, -62)
      ctx.lineTo(125, 62)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Glowing PICA-X Thermal Shield
      ctx.strokeStyle = "#ff4500"
      ctx.lineWidth = 4.0
      ctx.beginPath()
      ctx.arc(28, 0, 37, Math.PI * 0.6, Math.PI * 1.4)
      ctx.stroke()

      // Stagnation Spark
      const stagPulse = Math.sin(time * 6) * 3 + 5
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(-8, 0, stagPulse * 0.7, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // HUD Metrics Callouts
      ctx.font = "9px monospace"
      ctx.fillStyle = "#ffffff"
      ctx.fillText(`BOW-SHOCK WAVE [ANGLE: ${shockAngleDeg}°]`, noseX - 160, noseY - 140)
      ctx.fillStyle = "#fbbf24"
      ctx.fillText(`STAGNATION HEATING: ${stagnationTempK.toLocaleString()} K`, noseX - 160, noseY + 160)
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      ctx.fillText(`STANDOFF DIST: ${(24 / Math.sqrt(machNumber)).toFixed(1)} cm`, noseX - 160, noseY + 175)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [machNumber, angleAttackDeg, shockAngleDeg, stagnationTempK])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-mono selection:bg-white/20 overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 pb-16 flex-1 flex flex-col gap-6">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-white/[0.03] border border-white/10 text-slate-300 text-[10px] font-bold tracking-[0.25em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>AERO-ORBITAL COMPUTATIONAL FLUID DYNAMICS (CFD) // HYPERSONIC RE-ENTRY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              HYPERSONIC BOW-SHOCK &amp; RE-ENTRY FOOTPRINT
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMagneticWindowActive(!magneticWindowActive)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${
                magneticWindowActive 
                  ? "bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                  : "bg-rose-500/15 border-rose-500 text-rose-300 animate-pulse"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{magneticWindowActive ? "MAGNETIC RF WINDOW ACTIVE" : "RF PLASMA BLACKOUT"}</span>
            </button>
          </div>
        </div>

        {/* 4 Aero-Thermal KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">STAGNATION TEMP (T0)</span>
            <div className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <span>{stagnationTempK.toLocaleString()} K</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-500/20 text-rose-300">
                IONIZED
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block">PEAK RADIATIVE ENTHALPY</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">MACH NUMBER</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>MACH {machNumber.toFixed(1)}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/10 text-slate-300">
                {(machNumber * 1225).toFixed(0)} km/h
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block">SHOCK CONE: {shockAngleDeg}°</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">HEAT FLUX (qw)</span>
            <div className="text-lg font-bold text-white">
              {heatFluxMW_m2} MW/m²
            </div>
            <span className="text-[9px] text-slate-400 block">SUTTON-GRAVES CONVECTIVE</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">DYNAMIC PRESSURE (q)</span>
            <div className="text-lg font-bold text-white">
              {dynamicPressureKPa} kPa
            </div>
            <span className="text-[9px] text-slate-400 block">MAX-Q ENVELOPE TOLERANCE</span>
          </div>
        </div>

        {/* Viewports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          
          {/* LEFT 7 COLS: SHOCKWAVE CFD COMPRESSION CANVAS */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative w-full h-[470px] border border-white/[0.08] bg-[#020408]">
              <canvas ref={cfdCanvasRef} className="w-full h-full" />

              <div className="absolute top-3 left-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">NAVIER-STOKES REAL-GAS RE-ENTRY SOLVER</div>
                <div className="text-slate-400">5-SPECIES REACTING AIR MODEL (N2, O2, NO, N, O)</div>
              </div>

              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">VEHICLE: AST-07 HYPERSONIC CAPSULE</div>
                <div className="text-slate-400">AERODYNAMIC RATIO: L/D = 0.38</div>
              </div>

              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px] text-right space-y-0.5">
                <div className={`font-bold ${magneticWindowActive ? "text-emerald-400" : "text-rose-400"}`}>
                  TELEMETRY: {magneticWindowActive ? "100 Gbps LASER LINK" : "RF ATTENUATED"}
                </div>
                <div className="text-slate-400">PLASMA FREQUENCY &gt; 12 GHz</div>
              </div>
            </div>

            {/* CFD Sliders Controls */}
            <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2 text-white font-bold tracking-wider text-[11px]">
                  <Sliders className="w-3.5 h-3.5 text-white" />
                  <span>AERO-THERMAL TRAJECTORY CONTROLS</span>
                </div>
                <button
                  onClick={() => { setMachNumber(22.4); setAltitudeKm(68.5); setAngleAttackDeg(18.0); }}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET PEAK HEATING</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-[11px]">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">MACH NUMBER:</span>
                    <span className="text-white font-bold">M {machNumber.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="28.0"
                    step="0.2"
                    value={machNumber}
                    onChange={(e) => setMachNumber(parseFloat(e.target.value))}
                    className="w-full accent-white bg-neutral-800 cursor-pointer h-1"
                  />
                  <span className="text-[8px] text-slate-500 block">Flight velocity ratio over sound speed</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ALTITUDE:</span>
                    <span className="text-white font-bold">{altitudeKm.toFixed(1)} km</span>
                  </div>
                  <input
                    type="range"
                    min="25.0"
                    max="110.0"
                    step="0.5"
                    value={altitudeKm}
                    onChange={(e) => setAltitudeKm(parseFloat(e.target.value))}
                    className="w-full accent-white bg-neutral-800 cursor-pointer h-1"
                  />
                  <span className="text-[8px] text-slate-500 block">Atmospheric boundary density</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ANGLE OF ATTACK (α):</span>
                    <span className="text-emerald-400 font-bold">{angleAttackDeg.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="40.0"
                    step="1.0"
                    value={angleAttackDeg}
                    onChange={(e) => setAngleAttackDeg(parseFloat(e.target.value))}
                    className="w-full accent-white bg-neutral-800 cursor-pointer h-1"
                  />
                  <span className="text-[8px] text-slate-500 block">Lifting body pitch attitude</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: AST-07 ASSET & FOOTPRINT CORRIDOR */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            
            <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">AST-07 HYPERSONIC VEHICLE</span>
                </div>
                <span className="text-[10px] text-slate-400">AUTONOMOUS ENTRY</span>
              </div>

              <div className="space-y-2 text-[10px] pt-1">
                <div className="flex justify-between border-b border-white/[0.08] pb-1">
                  <span className="text-slate-500">HEAT SHIELD RECESSION RATE</span>
                  <span className="text-white font-bold">0.14 mm/s (Pyrolysis Safe)</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.08] pb-1">
                  <span className="text-slate-500">CROSS-RANGE FOOTPRINT</span>
                  <span className="text-white font-bold">±420 km Dispersal Corridor</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.08] pb-1">
                  <span className="text-slate-500">DOWN-RANGE REACH</span>
                  <span className="text-white font-bold">1,850 km Glide Footprint</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TOUCHDOWN SITE TARGET</span>
                  <span className="text-emerald-400 font-bold">VANDENBERG SPACE FORCE BASE [34.7° N]</span>
                </div>
              </div>
            </div>

            {/* Landing Dispersal Ellipse Spec */}
            <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-2 text-[10px]">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block border-b border-white/[0.08] pb-1.5">
                3-SIGMA RE-ENTRY LANDING DISPERSAL ELLIPSE
              </span>

              <div className="space-y-1.5">
                <div className="flex justify-between border-b border-white/[0.05] pb-1">
                  <span className="text-slate-500">SEMI-MAJOR AXIS</span>
                  <span className="text-white font-bold">3.2 km (Parafoil Precision)</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.05] pb-1">
                  <span className="text-slate-500">SEMI-MINOR AXIS</span>
                  <span className="text-white font-bold">0.8 km (Active RCS Trim)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RETRO-PROPULSION</span>
                  <span className="text-white font-bold">4x SuperDraco Pulse at T-15s</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/[0.08] bg-black/90 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] text-slate-500 z-20">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider">VEROYX HYPERSONIC THEATER</span>
          <span className="text-neutral-800">|</span>
          <span>AIAA HYPERSONIC AERODYNAMICS COMPLIANT</span>
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
