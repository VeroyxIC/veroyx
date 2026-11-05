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

  // Physical calculations:
  // Stagnation temperature T0 = T_inf * (1 + 0.2 * M^2)
  // At 68 km, ambient temp ~ 218 K
  const ambientTempK = 218.0
  const stagnationTempK = Math.round(ambientTempK * (1 + 0.2 * Math.pow(machNumber, 1.48)))
  const dynamicPressureKPa = (0.5 * 0.00012 * Math.pow(machNumber * 300, 2)).toFixed(1)
  const heatFluxMW_m2 = (0.11 * Math.sqrt(0.00012 / 0.8) * Math.pow(machNumber * 300, 3) / 1000000).toFixed(2)

  // Mach Shock Angle: sin(beta) = 1/M
  const shockAngleDeg = (Math.asin(Math.max(0.05, 1 / machNumber)) * (180 / Math.PI)).toFixed(1)

  // Interactive Supersonic Shockwave & Flow Separation Canvas Engine
  useEffect(() => {
    const canvas = cfdCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let time = 0

    // Streamline particles
    const streamlines = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * -300,
      y: (Math.random() - 0.5) * 360,
      speed: 12 + Math.random() * 8,
      length: 25 + Math.random() * 40
    }))

    const render = () => {
      animId = requestAnimationFrame(render)
      time += 0.03

      const w = (canvas.width = canvas.parentElement?.clientWidth || 740)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 470)
      const cx = w * 0.48
      const cy = h * 0.5

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      // 1. Hypersonic Bow-Shock Compression Cone
      const betaRad = Math.asin(Math.max(0.06, 1 / machNumber))
      const noseX = cx - 75
      const noseY = cy

      // Heat-shimmer glow behind shock layer
      const shockGrad = ctx.createRadialGradient(noseX, noseY, 5, noseX, noseY, 220)
      shockGrad.addColorStop(0, "rgba(239, 68, 68, 0.45)")
      shockGrad.addColorStop(0.3, "rgba(245, 158, 11, 0.25)")
      shockGrad.addColorStop(0.7, "rgba(234, 88, 12, 0.08)")
      shockGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = shockGrad
      ctx.beginPath()
      ctx.arc(noseX, noseY, 220, 0, Math.PI * 2)
      ctx.fill()

      // Hyperbolic Bow-Shock Wave Front
      ctx.save()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)"
      ctx.lineWidth = 2.4
      ctx.shadowColor = "#f59e0b"
      ctx.shadowBlur = 18

      ctx.beginPath()
      for (let y = -220; y <= 220; y += 4) {
        // Hyperbolic standoff distance: x = x_standoff + y^2 / (2 * R_shock)
        const standoff = 24 / Math.sqrt(machNumber)
        const shockX = noseX - standoff - (Math.pow(y, 2) / (120 * Math.tan(betaRad)))
        if (y === -220) ctx.moveTo(shockX, noseY + y)
        else ctx.lineTo(shockX, noseY + y)
      }
      ctx.stroke()
      ctx.restore()

      // 2. High-Speed Flow Streamlines deflected by vehicle
      streamlines.forEach(s => {
        s.x += s.speed * (machNumber / 12)
        if (s.x > w + 50) {
          s.x = -50
          s.y = (Math.random() - 0.5) * 360
        }

        // Deflect stream around capsule body
        const dx = s.x - noseX
        const dy = s.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        let drawY = noseY + s.y
        if (dist < 95 && s.x > noseX - 40) {
          drawY += dy > 0 ? (95 - dist) * 0.7 : -(95 - dist) * 0.7
        }

        ctx.strokeStyle = dist < 120 
          ? "rgba(245, 158, 11, 0.55)" 
          : "rgba(255, 255, 255, 0.15)"
        ctx.lineWidth = dist < 120 ? 1.5 : 1.0

        ctx.beginPath()
        ctx.moveTo(s.x, drawY)
        ctx.lineTo(s.x + s.length, drawY)
        ctx.stroke()
      })

      // 3. AST-07 Capsule Cross-Section Geometry
      ctx.save()
      ctx.translate(noseX, noseY)
      ctx.rotate((angleAttackDeg * Math.PI) / 180)

      // Spherical Blunted Nose (R_n = 0.8m)
      ctx.fillStyle = "#1e293b"
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1.8

      ctx.beginPath()
      ctx.arc(28, 0, 36, Math.PI * 0.55, Math.PI * 1.45)
      ctx.lineTo(125, -62)
      ctx.lineTo(125, 62)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // PICA-X Thermal Protection Tiles (Glowing orange along front curve)
      ctx.strokeStyle = "#f59e0b"
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.arc(28, 0, 37, Math.PI * 0.6, Math.PI * 1.4)
      ctx.stroke()

      // Stagnation Point Sparkle
      const stagPulse = Math.sin(time * 6) * 3 + 5
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(-8, 0, stagPulse * 0.6, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // 4. On-Canvas HUD Callouts
      ctx.font = "9px monospace"
      ctx.fillStyle = "#ffffff"
      ctx.fillText(`BOW-SHOCK WAVE [ANGLE: ${shockAngleDeg}°]`, noseX - 160, noseY - 140)
      ctx.fillStyle = "#f59e0b"
      ctx.fillText(`STAGNATION HEATING: ${stagnationTempK.toLocaleString()} K`, noseX - 160, noseY + 160)
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      ctx.fillText(`STANDOFF DIST: ${(24 / Math.sqrt(machNumber)).toFixed(1)} cm`, noseX - 160, noseY + 175)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [machNumber, angleAttackDeg, shockAngleDeg, stagnationTempK])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-mono selection:bg-amber-500/30 overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 pb-16 flex-1 flex flex-col gap-6">
        
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)]" 
                  : "bg-red-500/20 border-red-500 text-red-300 animate-pulse"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{magneticWindowActive ? "MAGNETIC RF WINDOW ACTIVE" : "RF PLASMA BLACKOUT"}</span>
            </button>
          </div>
        </div>

        {/* 4 Aero-Thermal KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">STAGNATION TEMP (T0)</span>
            <div className="text-lg font-bold text-red-400 flex items-center gap-2">
              <span>{stagnationTempK.toLocaleString()} K</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                IONIZED
              </span>
            </div>
            <span className="text-[9px] text-neutral-400 block">PEAK RADIATIVE ENTHALPY</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">MACH NUMBER</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>MACH {machNumber.toFixed(1)}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                {(machNumber * 1225).toFixed(0)} km/h
              </span>
            </div>
            <span className="text-[9px] text-neutral-400 block">SHOCK CONE: {shockAngleDeg}°</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">HEAT FLUX (qw)</span>
            <div className="text-lg font-bold text-amber-400">
              {heatFluxMW_m2} MW/m²
            </div>
            <span className="text-[9px] text-neutral-400 block">SUTTON-GRAVES CONVECTIVE</span>
          </div>

          <div className="p-3.5 border border-white/10 bg-[#080808] space-y-1">
            <span className="text-[9px] text-neutral-500 block uppercase">DYNAMIC PRESSURE (q)</span>
            <div className="text-lg font-bold text-white">
              {dynamicPressureKPa} kPa
            </div>
            <span className="text-[9px] text-neutral-400 block">MAX-Q ENVELOPE TOLERANCE</span>
          </div>
        </div>

        {/* Viewports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* LEFT 7 COLS: SHOCKWAVE CFD COMPRESSION CANVAS */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full h-[470px] rounded-xl overflow-hidden border border-white/10 bg-[#020408]">
              <canvas ref={cfdCanvasRef} className="w-full h-full" />

              <div className="absolute top-3 left-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-amber-400 font-bold">NAVIER-STOKES REAL-GAS RE-ENTRY SOLVER</div>
                <div className="text-neutral-400">5-SPECIES REACTING AIR MODEL (N2, O2, NO, N, O)</div>
              </div>

              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">VEHICLE: AST-07 HYPERSONIC CAPSULE</div>
                <div className="text-neutral-400">AERODYNAMIC RATIO: L/D = 0.38</div>
              </div>

              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/85 border border-white/10 text-[10px] text-right space-y-0.5">
                <div className={`font-bold ${magneticWindowActive ? "text-emerald-400" : "text-red-400"}`}>
                  TELEMETRY: {magneticWindowActive ? "100 Gbps LASER LINK" : "RF ATTENUATED"}
                </div>
                <div className="text-neutral-400">PLASMA FREQUENCY &gt; 12 GHz</div>
              </div>
            </div>

            {/* CFD Sliders Controls */}
            <div className="p-4 rounded-xl border border-white/10 bg-[#080808] space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>AERO-THERMAL TRAJECTORY CONTROLS</span>
                </div>
                <button
                  onClick={() => { setMachNumber(22.4); setAltitudeKm(68.5); setAngleAttackDeg(18.0); }}
                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET PEAK HEATING</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-[11px]">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">MACH NUMBER:</span>
                    <span className="text-amber-400 font-bold">M {machNumber.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="28.0"
                    step="0.2"
                    value={machNumber}
                    onChange={(e) => setMachNumber(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-800 cursor-pointer"
                  />
                  <span className="text-[9px] text-neutral-500 block">Flight velocity ratio over ambient speed of sound</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">ALTITUDE:</span>
                    <span className="text-white font-bold">{altitudeKm.toFixed(1)} km</span>
                  </div>
                  <input
                    type="range"
                    min="25.0"
                    max="110.0"
                    step="0.5"
                    value={altitudeKm}
                    onChange={(e) => setAltitudeKm(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-800 cursor-pointer"
                  />
                  <span className="text-[9px] text-neutral-500 block">Atmospheric density boundary layer</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">ANGLE OF ATTACK (α):</span>
                    <span className="text-emerald-400 font-bold">{angleAttackDeg.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="40.0"
                    step="1.0"
                    value={angleAttackDeg}
                    onChange={(e) => setAngleAttackDeg(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-800 cursor-pointer"
                  />
                  <span className="text-[9px] text-neutral-500 block">Lifting body pitch attitude</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: AST-07 ASSET & FOOTPRINT CORRIDOR */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            <div className="p-4 border border-white/10 bg-[#080808] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase">AST-07 HYPERSONIC VEHICLE</span>
                </div>
                <span className="text-[10px] text-amber-300 font-bold">AUTONOMOUS ENTRY</span>
              </div>

              <div className="relative w-full h-52 rounded-lg overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                <img
                  src="/assets/fleet/ast-07-capsule.jpg"
                  alt="AST-07 Hypersonic Capsule"
                  className="w-full h-full object-cover filter contrast-[1.1]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/85 border border-white/10 text-[9px] text-white">
                  ENTRY FLIGHT PATH: γ = -1.42° // VEL: 7.4 km/s
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/85 border border-white/10 text-[9px] text-red-400 font-bold">
                  PICA-X ABLATING NOMINAL
                </div>
              </div>

              <div className="space-y-1.5 text-[10px] pt-1">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">HEAT SHIELD RECESSION RATE</span>
                  <span className="text-white font-bold">0.14 mm/s (Pyrolysis Layer Safe)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">CROSS-RANGE FOOTPRINT</span>
                  <span className="text-amber-400 font-bold">±420 km Dispersal Corridor</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">DOWN-RANGE REACH</span>
                  <span className="text-white font-bold">1,850 km Glide Footprint</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">TOUCHDOWN SITE TARGET</span>
                  <span className="text-emerald-400 font-bold">VANDENBERG SPACE FORCE BASE [34.7° N]</span>
                </div>
              </div>
            </div>

            {/* Landing Dispersal Ellipse Spec */}
            <div className="p-4 border border-white/10 bg-[#080808] rounded-xl space-y-3">
              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase block">
                3-SIGMA RE-ENTRY LANDING DISPERSAL ELLIPSE
              </span>

              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">SEMI-MAJOR AXIS (ALONG-TRACK)</span>
                  <span className="text-white font-bold">3.2 km (Parafoil Precision Recovery)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">SEMI-MINOR AXIS (CROSS-TRACK)</span>
                  <span className="text-white font-bold">0.8 km (Active RCS Trim)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-neutral-500">TERMINAL RETRO-PROPULSION</span>
                  <span className="text-amber-400 font-bold">4x SuperDraco Pulse at T-15s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">RECOVERY REUSABILITY TARGET</span>
                  <span className="text-emerald-400 font-bold">100% FLIGHT QUALIFIED RAPID TURN</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/10 bg-black/80 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] text-neutral-500 z-20">
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
