"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { 
  Orbit, 
  Sun, 
  Globe, 
  Compass, 
  RotateCw, 
  Gauge, 
  Download, 
  ArrowRight, 
  Activity, 
  Eye, 
  Radio, 
  Crosshair, 
  Sliders, 
  Play, 
  Pause, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  Target,
  Rocket,
  ShieldAlert,
  Flame
} from "lucide-react"

// Continental boundaries [lat, lon]
const CONTINENTS: [number, number][][] = [
  // North America
  [[72, -165], [70, -135], [58, -95], [52, -55], [30, -82], [15, -85], [10, -75], [20, -105], [32, -118], [55, -135], [72, -165]],
  // South America
  [[12, -72], [5, -50], [-10, -35], [-23, -42], [-54, -68], [-44, -75], [-18, -72], [0, -80], [12, -72]],
  // Eurasia
  [[38, -9], [44, 12], [58, 25], [71, 28], [74, 105], [68, 170], [42, 132], [22, 118], [12, 104], [22, 70], [14, 44], [32, 34], [38, -9]],
  // Africa
  [[36, 10], [30, 32], [12, 51], [-12, 40], [-34, 20], [-15, 12], [5, 2], [15, -17], [32, -10], [36, 10]],
  // Australia
  [[-12, 132], [-14, 144], [-28, 153], [-38, 145], [-35, 116], [-20, 115], [-12, 132]]
]

export default function MissionVisualizerPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.6) // ISS inclination
  const [launchSite, setLaunchSite] = useState<"Cape Canaveral (28.5°N)" | "Vandenberg SFB (34.6°N)">("Cape Canaveral (28.5°N)")
  const [targetType, setTargetType] = useState<"ISS Rendezvous" | "Debris Intercept" | "Optical Ground Target">("ISS Rendezvous")
  const [trackingBeam, setTrackingBeam] = useState<boolean>(true)
  const [showLaunchTrajectory, setShowLaunchTrajectory] = useState<boolean>(true)
  const [simSpeed, setSimSpeed] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [zoomFactor, setZoomFactor] = useState<number>(1.0)

  // 3D Camera Angles
  const [camYaw, setCamYaw] = useState<number>(0.9)
  const [camPitch, setCamPitch] = useState<number>(0.4)
  const isDraggingRef = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Simulation parameters
  const satAngleRef = useRef<number>(0)
  const targetAngleRef = useRef<number>(0.45)
  const earthSpinRef = useRef<number>(0)

  // Live Telemetry
  const telemetry = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418
    const rSat = rEarthKm + altitudeKm
    const vSat = Math.sqrt(mu / rSat)
    const periodMin = (2 * Math.PI * Math.sqrt(Math.pow(rSat, 3) / mu)) / 60

    // Target Range approximation
    const targetAltKm = targetType === "ISS Rendezvous" ? 420 : targetType === "Debris Intercept" ? 610 : 0
    const rTarget = rEarthKm + targetAltKm
    const angleDelta = Math.abs(satAngleRef.current - targetAngleRef.current)
    const rangeKm = Math.round(
      Math.sqrt(Math.pow(rSat, 2) + Math.pow(rTarget, 2) - 2 * rSat * rTarget * Math.cos(angleDelta))
    )

    return {
      vSat: vSat.toFixed(2),
      periodMin: periodMin.toFixed(1),
      rangeKm,
      closingSpeedKmS: ((vSat * Math.sin(angleDelta)) * 0.4).toFixed(2)
    }
  }, [altitudeKm, targetType])

  useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 950
      canvas.height = Math.min(680, window.innerHeight * 0.75)
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    // Cosmic background starfield
    const stars: { x: number; y: number; s: number; a: number }[] = []
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.sin(i * 19.3) * 0.5 + 0.5,
        y: Math.cos(i * 37.1) * 0.5 + 0.5,
        s: (i % 4) === 0 ? 2.0 : 1.0,
        a: 0.25 + (i % 6) * 0.12,
      })
    }

    const render = () => {
      if (isPlaying) {
        satAngleRef.current += 0.012 * simSpeed
        targetAngleRef.current += 0.011 * simSpeed
        earthSpinRef.current += 0.0015 * simSpeed
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const baseR = Math.min(canvas.width, canvas.height) * 0.30 * zoomFactor

      // 3D vector projection
      const project = (x: number, y: number, z: number) => {
        // Yaw
        const x1 = x * Math.cos(camYaw) - z * Math.sin(camYaw)
        const z1 = x * Math.sin(camYaw) + z * Math.cos(camYaw)
        // Pitch
        const y2 = y * Math.cos(camPitch) - z1 * Math.sin(camPitch)
        const z2 = y * Math.sin(camPitch) + z1 * Math.cos(camPitch)

        const fov = 850
        const pz = fov / (fov + z2 * baseR)
        return {
          px: cx + x1 * baseR * pz,
          py: cy + y2 * baseR * pz,
          depth: z2,
          scale: pz
        }
      }

      // 1. Draw Starfield
      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.a})`
        ctx.fillRect(s.x * canvas.width, s.y * canvas.height, s.s, s.s)
      })

      // 2. Solar Direction Lighting Vector
      const sunV = { x: -0.707, y: -0.5, z: -0.5 }
      const sunProj = project(sunV.x * 2.5, sunV.y * 2.5, sunV.z * 2.5)
      ctx.strokeStyle = "rgba(251, 191, 36, 0.45)"
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(sunProj.px, sunProj.py)
      ctx.lineTo(cx, cy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "#fbbf24"
      ctx.font = "10px monospace"
      ctx.fillText("☀️ SOLAR INCIDENCE VECTOR (1361 W/m²)", sunProj.px - 60, sunProj.py - 10)

      // 3. Volumetric Earth Atmospheric Halo (Multi-layered Rayleigh Scattering)
      const rEarth = 1.0
      const haloGrad = ctx.createRadialGradient(cx, cy, rEarth * baseR * 0.95, cx, cy, rEarth * baseR * 1.25)
      haloGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)")
      haloGrad.addColorStop(0.3, "rgba(14, 165, 233, 0.25)")
      haloGrad.addColorStop(0.7, "rgba(2, 132, 199, 0.08)")
      haloGrad.addColorStop(1, "rgba(2, 6, 23, 0)")
      ctx.fillStyle = haloGrad
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * baseR * 1.25, 0, Math.PI * 2)
      ctx.fill()

      // 4. Photorealistic Earth Sphere
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * baseR, 0, Math.PI * 2)
      ctx.clip()

      // Deep ocean gradient
      const oceanGrad = ctx.createRadialGradient(
        cx - baseR * 0.4, cy - baseR * 0.4, 20,
        cx, cy, rEarth * baseR
      )
      oceanGrad.addColorStop(0, "#2563eb")
      oceanGrad.addColorStop(0.4, "#1e3a8a")
      oceanGrad.addColorStop(0.85, "#0f172a")
      oceanGrad.addColorStop(1, "#020617")
      ctx.fillStyle = oceanGrad
      ctx.fillRect(cx - baseR, cy - baseR, baseR * 2, baseR * 2)

      // Continents with night-side darkening
      CONTINENTS.forEach(poly => {
        ctx.beginPath()
        let first = true
        poly.forEach(([lat, lon]) => {
          const latRad = (lat * Math.PI) / 180
          const lonRad = ((lon + (earthSpinRef.current * 180) / Math.PI) * Math.PI) / 180

          const ex = Math.cos(latRad) * Math.cos(lonRad)
          const ey = Math.sin(latRad)
          const ez = Math.cos(latRad) * Math.sin(lonRad)

          const pt = project(ex, ey, ez)
          if (pt.depth > -0.2) {
            if (first) {
              ctx.moveTo(pt.px, pt.py)
              first = false
            } else {
              ctx.lineTo(pt.px, pt.py)
            }
          }
        })
        ctx.closePath()
        ctx.fillStyle = "rgba(34, 197, 94, 0.42)"
        ctx.fill()
        ctx.strokeStyle = "rgba(74, 222, 128, 0.7)"
        ctx.lineWidth = 1.2
        ctx.stroke()
      })

      // Day/Night Twilight Terminator Shadow
      const termGrad = ctx.createLinearGradient(
        cx - baseR * 0.7, cy - baseR * 0.7,
        cx + baseR * 0.7, cy + baseR * 0.7
      )
      termGrad.addColorStop(0, "rgba(0, 0, 0, 0)")
      termGrad.addColorStop(0.5, "rgba(2, 6, 23, 0.35)")
      termGrad.addColorStop(1, "rgba(2, 6, 23, 0.96)")
      ctx.fillStyle = termGrad
      ctx.fillRect(cx - baseR, cy - baseR, baseR * 2, baseR * 2)

      ctx.restore()

      // Atmospheric Limb Ring
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * baseR, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.8)"
      ctx.lineWidth = 2
      ctx.stroke()

      // 5. Draw Launch Trajectory Arc from Spaceport (Cape or Vandenberg)
      const rOrb = (6378.1 + altitudeKm) / 6378.1
      const incRad = (inclinationDeg * Math.PI) / 180

      if (showLaunchTrajectory) {
        ctx.beginPath()
        ctx.strokeStyle = "rgba(249, 115, 22, 0.75)"
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        // Ascent arc starting on surface and curving into orbit
        const launchLat = launchSite.includes("Cape") ? 28.5 : 34.6
        const launchLatRad = (launchLat * Math.PI) / 180
        const padPt = project(Math.cos(launchLatRad), Math.sin(launchLatRad), 0)
        ctx.moveTo(padPt.px, padPt.py)

        for (let t = 0; t <= 1.0; t += 0.1) {
          const arcR = 1.0 + (rOrb - 1.0) * t
          const arcTheta = t * 0.8
          const ax = Math.cos(arcTheta) * arcR
          const ay = Math.sin(arcTheta) * arcR * Math.sin(incRad)
          const az = Math.sin(arcTheta) * arcR * Math.cos(incRad)
          const pt = project(ax, ay, az)
          ctx.lineTo(pt.px, pt.py)
        }
        ctx.stroke()
        ctx.setLineDash([])

        // Spaceport Launch Site Marker
        ctx.fillStyle = "#f97316"
        ctx.beginPath()
        ctx.arc(padPt.px, padPt.py, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.font = "9px monospace"
        ctx.fillText(`🚀 ${launchSite.split(" ")[0]} LAUNCHPAD`, padPt.px + 8, padPt.py - 4)
      }

      // 6. Draw Primary Orbit Trajectory Ring
      ctx.beginPath()
      ctx.strokeStyle = "rgba(6, 182, 212, 0.65)"
      ctx.lineWidth = 1.8
      for (let theta = 0; theta <= Math.PI * 2 + 0.05; theta += 0.05) {
        const ox = Math.cos(theta) * rOrb
        const oy = Math.sin(theta) * rOrb * Math.sin(incRad)
        const oz = Math.sin(theta) * rOrb * Math.cos(incRad)
        const pt = project(ox, oy, oz)
        if (theta === 0) ctx.moveTo(pt.px, pt.py)
        else ctx.lineTo(pt.px, pt.py)
      }
      ctx.stroke()

      // 7. Compute Spacecraft & Target Positions
      const satTheta = satAngleRef.current
      const satX = Math.cos(satTheta) * rOrb
      const satY = Math.sin(satTheta) * rOrb * Math.sin(incRad)
      const satZ = Math.sin(satTheta) * rOrb * Math.cos(incRad)
      const satPt = project(satX, satY, satZ)

      // Target Object (ISS / Debris / Ground Target)
      const targetAlt = targetType === "ISS Rendezvous" ? 420 : targetType === "Debris Intercept" ? 610 : 0
      const rTgt = (6378.1 + targetAlt) / 6378.1
      const tgtTheta = targetAngleRef.current
      const tgtInc = targetType === "ISS Rendezvous" ? incRad : incRad * 0.8
      const tgtX = Math.cos(tgtTheta) * rTgt
      const tgtY = Math.sin(tgtTheta) * rTgt * Math.sin(tgtInc)
      const tgtZ = Math.sin(tgtTheta) * rTgt * Math.cos(tgtInc)
      const tgtPt = project(tgtX, tgtY, tgtZ)

      // 8. Render Intercept / Tracking Laser Beam
      if (trackingBeam) {
        ctx.beginPath()
        ctx.strokeStyle = targetType === "Debris Intercept" ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.8)"
        ctx.lineWidth = 1.5
        ctx.setLineDash([2, 2])
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(tgtPt.px, tgtPt.py)
        ctx.stroke()
        ctx.setLineDash([])

        // Range Tag midpoint
        const midX = (satPt.px + tgtPt.px) / 2
        const midY = (satPt.py + tgtPt.py) / 2
        ctx.fillStyle = targetType === "Debris Intercept" ? "#ef4444" : "#22c55e"
        ctx.font = "10px monospace"
        ctx.fillText(`TARGET RANGE: ${telemetry.rangeKm} km (${telemetry.closingSpeedKmS} km/s)`, midX + 10, midY)
      }

      // 9. Draw Target Object
      ctx.save()
      ctx.translate(tgtPt.px, tgtPt.py)
      if (targetType === "ISS Rendezvous") {
        // Render ISS-style solar cross
        ctx.fillStyle = "#38bdf8"
        ctx.fillRect(-12 * zoomFactor, -2 * zoomFactor, 24 * zoomFactor, 4 * zoomFactor)
        ctx.fillRect(-2 * zoomFactor, -10 * zoomFactor, 4 * zoomFactor, 20 * zoomFactor)
        ctx.strokeStyle = "#ffffff"
        ctx.strokeRect(-12 * zoomFactor, -2 * zoomFactor, 24 * zoomFactor, 4 * zoomFactor)
      } else {
        // Red debris diamond
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.moveTo(0, -6 * zoomFactor)
        ctx.lineTo(6 * zoomFactor, 0)
        ctx.lineTo(0, 6 * zoomFactor)
        ctx.lineTo(-6 * zoomFactor, 0)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      ctx.fillStyle = targetType === "Debris Intercept" ? "#ef4444" : "#38bdf8"
      ctx.font = "9px monospace"
      ctx.fillText(`TARGET: ${targetType.toUpperCase()}`, tgtPt.px + 14, tgtPt.py + 4)

      // 10. Draw Primary VEROYX Spacecraft
      ctx.save()
      ctx.translate(satPt.px, satPt.py)
      // Blue Solar Wings
      ctx.fillStyle = "#0284c7"
      ctx.strokeStyle = "#38bdf8"
      ctx.lineWidth = 1.2
      ctx.fillRect(-30 * zoomFactor, -5 * zoomFactor, 20 * zoomFactor, 10 * zoomFactor)
      ctx.strokeRect(-30 * zoomFactor, -5 * zoomFactor, 20 * zoomFactor, 10 * zoomFactor)
      ctx.fillRect(10 * zoomFactor, -5 * zoomFactor, 20 * zoomFactor, 10 * zoomFactor)
      ctx.strokeRect(10 * zoomFactor, -5 * zoomFactor, 20 * zoomFactor, 10 * zoomFactor)

      // Gold MLI Core Bus
      ctx.fillStyle = "#fbbf24"
      ctx.strokeStyle = "#d97706"
      ctx.lineWidth = 1.5
      ctx.fillRect(-9 * zoomFactor, -9 * zoomFactor, 18 * zoomFactor, 18 * zoomFactor)
      ctx.strokeRect(-9 * zoomFactor, -9 * zoomFactor, 18 * zoomFactor, 18 * zoomFactor)

      // Forward Sensor Lens
      ctx.fillStyle = "#06b6d4"
      ctx.beginPath()
      ctx.arc(0, 6 * zoomFactor, 3.5 * zoomFactor, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = "#38bdf8"
      ctx.font = "10px monospace"
      ctx.fillText(`VEROYX-SAT-1 [ALT: ${altitudeKm}km]`, satPt.px + 22, satPt.py - 16)

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
    }
  }, [altitudeKm, inclinationDeg, launchSite, targetType, trackingBeam, showLaunchTrajectory, simSpeed, isPlaying, zoomFactor, camYaw, camPitch, telemetry])

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    setCamYaw(prev => prev + dx * 0.007)
    setCamPitch(prev => Math.max(-1.3, Math.min(1.3, prev + dy * 0.007)))
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Crosshair className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Orbital Insertion &amp; Target Intercept 3D Visualization Canvas
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              3D MISSION &amp; TARGET VISUALIZER
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Photorealistic 3D Earth globe with dynamic Day/Night atmospheric Rayleigh glow, launch ascent staging arcs from Cape Canaveral/Vandenberg, and real-time rangefinder target intercept tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              {isPlaying ? "PAUSE" : "RESUME"}
            </button>
            <button
              onClick={() => { setCamYaw(0.9); setCamPitch(0.4); setZoomFactor(1.0) }}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              RESET CAMERA
            </button>
          </div>
        </div>

        {/* 3D Canvas Screen */}
        <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full cursor-grab active:cursor-grabbing block"
          />

          {/* Telemetry HUD */}
          <div className="absolute top-4 left-4 p-4 rounded-xl bg-slate-950/85 border border-slate-800 font-mono text-[11px] backdrop-blur-md space-y-1.5">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Activity className="w-3.5 h-3.5" /> INTERCEPT TELEMETRY
            </div>
            <div className="text-slate-300">Spacecraft Alt: <strong className="text-white">{altitudeKm} km</strong></div>
            <div className="text-slate-300">Velocity: <strong className="text-white">{telemetry.vSat} km/s</strong></div>
            <div className="text-slate-300">Period: <strong className="text-white">{telemetry.periodMin} min</strong></div>
            <div className="text-slate-300 border-t border-slate-800 pt-1">
              Target Mode: <strong className="text-cyan-400">{targetType}</strong>
            </div>
            <div className="text-slate-300">
              Range to Target: <strong className={targetType === "Debris Intercept" ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{telemetry.rangeKm} km</strong>
            </div>
            <div className="text-slate-400 text-[9px] pt-1 border-t border-slate-800">
              Drag mouse to rotate 3D camera
            </div>
          </div>

          {/* Zoom Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-1 backdrop-blur-md">
            <button
              onClick={() => setZoomFactor(prev => Math.min(2.2, prev + 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ZoomIn className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={() => setZoomFactor(prev => Math.max(0.6, prev - 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ZoomOut className="w-4 h-4 text-cyan-400" />
            </button>
          </div>

          {/* Bottom Interactive HUD Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">TARGET OBJECT:</span>
              {(["ISS Rendezvous", "Debris Intercept", "Optical Ground Target"] as const).map(tgt => (
                <button
                  key={tgt}
                  onClick={() => setTargetType(tgt)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                    targetType === tgt
                      ? "bg-cyan-950 border-cyan-500/60 text-cyan-300 shadow-md shadow-cyan-950/40"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {tgt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showLaunchTrajectory}
                  onChange={e => setShowLaunchTrajectory(e.target.checked)}
                  className="accent-orange-500 cursor-pointer"
                />
                Ascent Arc
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={trackingBeam}
                  onChange={e => setTrackingBeam(e.target.checked)}
                  className="accent-emerald-500 cursor-pointer"
                />
                Ranging Laser
              </label>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="text-slate-400 text-[10px]">SPEED</span>
                <input
                  type="range"
                  min={0.2}
                  max={3.0}
                  step={0.2}
                  value={simSpeed}
                  onChange={e => setSimSpeed(Number(e.target.value))}
                  className="w-16 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mission Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-orange-400" /> Spaceport Ascent
              </span>
              <span className="text-orange-400 font-bold">{launchSite.split(" ")[0]}</span>
            </div>
            <select
              value={launchSite}
              onChange={e => setLaunchSite(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Cape Canaveral (28.5°N)">Cape Canaveral SLC-40 (28.5°N)</option>
              <option value="Vandenberg SFB (34.6°N)">Vandenberg SFB SLC-4E (34.6°N)</option>
            </select>
            <div className="text-[10px] text-slate-500">
              Ascent arc models gravity-turn boost profile into target inclination.
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Orbit className="w-4 h-4 text-cyan-400" /> Orbit Altitude
              </span>
              <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
            </div>
            <input
              type="range"
              min={300}
              max={1200}
              step={25}
              value={altitudeKm}
              onChange={e => setAltitudeKm(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>300 km (VLEO)</span>
              <span>550 km (Nominal)</span>
              <span>1200 km</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" /> Correlated Engines
              </span>
              <span className="text-emerald-400 font-bold">CONNECTED</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[9px]">
              <Link href="/docking" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /docking (C-W)
              </Link>
              <Link href="/conjunction" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /conjunction (CAM)
              </Link>
              <Link href="/launch-vehicle" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /launch-vehicle
              </Link>
              <Link href="/compliance" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /compliance
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
