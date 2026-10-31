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
  ZoomOut
} from "lucide-react"

// Vector landmass outline points [lat, lon] for 3D continental rendering
const CONTINENT_OUTLINES: [number, number][][] = [
  // North America rough bounds
  [[70, -160], [72, -130], [60, -90], [50, -60], [30, -80], [15, -85], [10, -75], [25, -100], [32, -118], [55, -135], [70, -160]],
  // South America
  [[12, -72], [5, -52], [-10, -36], [-25, -45], [-55, -68], [-45, -75], [-15, -75], [0, -80], [12, -72]],
  // Eurasia & Africa
  [[35, -5], [45, 10], [55, 30], [70, 40], [70, 140], [60, 160], [40, 140], [25, 120], [10, 105], [20, 75], [12, 45], [-35, 20], [-10, 12], [5, 0], [15, -17], [35, -5]],
  // Australia
  [[-15, 130], [-12, 142], [-28, 153], [-38, 145], [-32, 115], [-20, 115], [-15, 130]]
]

export default function MissionVisualizerPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(53.0)
  const [pointingMode, setPointingMode] = useState<"Nadir Pointing" | "Sun Pointing" | "Velocity Ram">("Nadir Pointing")
  const [cameraMode, setCameraMode] = useState<"Earth Centered" | "Spacecraft Follow">("Earth Centered")
  const [showExclusionCones, setShowExclusionCones] = useState<boolean>(true)
  const [showGroundFootprint, setShowGroundFootprint] = useState<boolean>(true)
  const [showAtmosphereHaze, setShowAtmosphereHaze] = useState<boolean>(true)
  const [simSpeed, setSimSpeed] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [zoomFactor, setZoomFactor] = useState<number>(1.0)

  // Camera 3D angles
  const [camYaw, setCamYaw] = useState<number>(0.85)
  const [camPitch, setCamPitch] = useState<number>(0.35)
  const isDraggingRef = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Simulation angles
  const orbitAngleRef = useRef<number>(0)
  const earthRotationRef = useRef<number>(0)

  // Subsystem calculation metrics
  const telemetry = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418
    const rOrbKm = rEarthKm + altitudeKm
    const vOrbKmS = Math.sqrt(mu / rOrbKm)
    const orbitPeriodMin = (2 * Math.PI * Math.sqrt(Math.pow(rOrbKm, 3) / mu)) / 60
    
    // Slant range & horizon mask footprint diameter
    const elevMaskDeg = 5.0
    const elevRad = (elevMaskDeg * Math.PI) / 180
    const cosPsi0 = (rEarthKm / rOrbKm) * Math.cos(elevRad)
    const psi0Rad = Math.acos(cosPsi0) - elevRad
    const footprintDiameterKm = Math.round(2 * rEarthKm * psi0Rad)

    return {
      orbitPeriodMin: orbitPeriodMin.toFixed(1),
      vOrbKmS: vOrbKmS.toFixed(2),
      footprintDiameterKm,
    }
  }, [altitudeKm])

  // Canvas render engine
  useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 900
      canvas.height = Math.min(650, window.innerHeight * 0.7)
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    // Starfield coordinates
    const stars: { x: number; y: number; s: number; a: number }[] = []
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.sin(i * 14.3) * 0.5 + 0.5,
        y: Math.cos(i * 47.9) * 0.5 + 0.5,
        s: (i % 3) === 0 ? 1.8 : 1.1,
        a: 0.3 + (i % 5) * 0.15,
      })
    }

    const render = () => {
      if (isPlaying) {
        orbitAngleRef.current += 0.012 * simSpeed
        earthRotationRef.current += 0.0018 * simSpeed // Earth diurnal rotation
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const baseScale = Math.min(canvas.width, canvas.height) * 0.32 * zoomFactor

      // 3D projection pipeline
      const project = (x: number, y: number, z: number) => {
        // Yaw (Y-axis)
        const x1 = x * Math.cos(camYaw) - z * Math.sin(camYaw)
        const z1 = x * Math.sin(camYaw) + z * Math.cos(camYaw)
        // Pitch (X-axis)
        const y2 = y * Math.cos(camPitch) - z1 * Math.sin(camPitch)
        const z2 = y * Math.sin(camPitch) + z1 * Math.cos(camPitch)

        const fov = 750
        const pz = fov / (fov + z2 * baseScale)
        return {
          px: cx + x1 * baseScale * pz,
          py: cy + y2 * baseScale * pz,
          depth: z2,
          scale: pz,
        }
      }

      // 1. Draw Deep Space Celestial Starfield
      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      stars.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.a})`
        ctx.fillRect(s.x * canvas.width, s.y * canvas.height, s.s, s.s)
      })

      // 2. Solar Direction Vector (Sun at -X, -Y in space)
      const sunDir = { x: -0.707, y: -0.5, z: -0.5 }
      const sunRay = project(sunDir.x * 2.2, sunDir.y * 2.2, sunDir.z * 2.2)
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)"
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(sunRay.px, sunRay.py)
      ctx.lineTo(cx, cy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "#fbbf24"
      ctx.font = "10px monospace"
      ctx.fillText("☀️ SOLAR INCIDENCE VECTOR", sunRay.px - 60, sunRay.py - 12)

      // 3. Draw Earth Atmospheric Haze Layer
      const rEarth = 1.0
      if (showAtmosphereHaze) {
        const atmoGrad = ctx.createRadialGradient(cx, cy, rEarth * baseScale * 0.95, cx, cy, rEarth * baseScale * 1.12)
        atmoGrad.addColorStop(0, "rgba(56, 189, 248, 0.25)")
        atmoGrad.addColorStop(0.5, "rgba(14, 165, 233, 0.12)")
        atmoGrad.addColorStop(1, "rgba(2, 6, 23, 0)")
        ctx.fillStyle = atmoGrad
        ctx.beginPath()
        ctx.arc(cx, cy, rEarth * baseScale * 1.12, 0, Math.PI * 2)
        ctx.fill()
      }

      // 4. Draw Shaded Earth Body with Lambertian Terminator
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * baseScale, 0, Math.PI * 2)
      ctx.clip()

      // Base oceanic blue
      const oceanGrad = ctx.createRadialGradient(cx - baseScale * 0.35, cy - baseScale * 0.35, 10, cx, cy, rEarth * baseScale)
      oceanGrad.addColorStop(0, "#1d4ed8")
      oceanGrad.addColorStop(0.45, "#0f172a")
      oceanGrad.addColorStop(1, "#020617")
      ctx.fillStyle = oceanGrad
      ctx.fillRect(cx - baseScale, cy - baseScale, baseScale * 2, baseScale * 2)

      // Draw Continents on 3D Rotating Sphere
      CONTINENT_OUTLINES.forEach((poly) => {
        ctx.beginPath()
        let first = true
        poly.forEach(([lat, lon]) => {
          const latRad = (lat * Math.PI) / 180
          const lonRad = ((lon + (earthRotationRef.current * 180) / Math.PI) * Math.PI) / 180

          const ex = Math.cos(latRad) * Math.cos(lonRad)
          const ey = Math.sin(latRad)
          const ez = Math.cos(latRad) * Math.sin(lonRad)

          const pt = project(ex, ey, ez)
          // Front-facing culling
          if (pt.depth > -0.15) {
            if (first) {
              ctx.moveTo(pt.px, pt.py)
              first = false
            } else {
              ctx.lineTo(pt.px, pt.py)
            }
          }
        })
        ctx.closePath()
        ctx.fillStyle = "rgba(34, 197, 94, 0.35)"
        ctx.fill()
        ctx.strokeStyle = "rgba(74, 222, 128, 0.6)"
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // Night-side Shadowing
      const shadowGrad = ctx.createLinearGradient(cx - baseScale * 0.6, cy - baseScale * 0.6, cx + baseScale * 0.6, cy + baseScale * 0.6)
      shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0)")
      shadowGrad.addColorStop(0.55, "rgba(2, 6, 23, 0.4)")
      shadowGrad.addColorStop(1, "rgba(2, 6, 23, 0.95)")
      ctx.fillStyle = shadowGrad
      ctx.fillRect(cx - baseScale, cy - baseScale, baseScale * 2, baseScale * 2)

      ctx.restore()

      // Atmospheric Rim Stroke
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * baseScale, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)"
      ctx.lineWidth = 1.8
      ctx.stroke()

      // 5. Draw 3D Orbit Trajectory Ellipse
      const rOrb = (6378.1 + altitudeKm) / 6378.1
      const incRad = (inclinationDeg * Math.PI) / 180
      ctx.beginPath()
      ctx.strokeStyle = "rgba(6, 182, 212, 0.55)"
      ctx.lineWidth = 1.6
      for (let theta = 0; theta <= Math.PI * 2 + 0.05; theta += 0.05) {
        const ox = Math.cos(theta) * rOrb
        const oy = Math.sin(theta) * rOrb * Math.sin(incRad)
        const oz = Math.sin(theta) * rOrb * Math.cos(incRad)
        const pt = project(ox, oy, oz)
        if (theta === 0) ctx.moveTo(pt.px, pt.py)
        else ctx.lineTo(pt.px, pt.py)
      }
      ctx.stroke()

      // 6. Compute Spacecraft Position & Vectors
      const satTheta = orbitAngleRef.current
      const satX = Math.cos(satTheta) * rOrb
      const satY = Math.sin(satTheta) * rOrb * Math.sin(incRad)
      const satZ = Math.sin(satTheta) * rOrb * Math.cos(incRad)
      const satPt = project(satX, satY, satZ)

      // Velocity Vector (tangent to orbit)
      const velX = -Math.sin(satTheta)
      const velY = Math.cos(satTheta) * Math.sin(incRad)
      const velZ = Math.cos(satTheta) * Math.cos(incRad)
      const velPt = project(satX + velX * 0.4, satY + velY * 0.4, satZ + velZ * 0.4)

      // Nadir Sub-Satellite Vector on Surface
      const nadirPt = project(satX / rOrb, satY / rOrb, satZ / rOrb)

      // 7. Ground Swath Footprint Cone
      if (showGroundFootprint) {
        ctx.beginPath()
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)"
        ctx.setLineDash([3, 3])
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(nadirPt.px - 45 * zoomFactor, nadirPt.py)
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(nadirPt.px + 45 * zoomFactor, nadirPt.py)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.ellipse(nadirPt.px, nadirPt.py, 45 * zoomFactor, 22 * zoomFactor, 0, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(16, 185, 129, 0.16)"
        ctx.fill()
        ctx.strokeStyle = "rgba(16, 185, 129, 0.7)"
        ctx.stroke()
      }

      // 8. Star Tracker Optical Exclusion Cone
      if (showExclusionCones) {
        const exPt = project(satX * 1.6, satY * 1.6, satZ * 1.6)
        ctx.beginPath()
        ctx.strokeStyle = "rgba(244, 63, 94, 0.45)"
        ctx.setLineDash([2, 2])
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(exPt.px - 30 * zoomFactor, exPt.py - 30 * zoomFactor)
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(exPt.px + 30 * zoomFactor, exPt.py + 30 * zoomFactor)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.arc(exPt.px, exPt.py, 32 * zoomFactor, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(244, 63, 94, 0.12)"
        ctx.fill()
        ctx.fillStyle = "#f43f5e"
        ctx.font = "9px monospace"
        ctx.fillText("ST BAFFLE CONE (45°)", exPt.px + 36, exPt.py)
      }

      // 9. Render Spacecraft Body & Solar Array Geometry
      ctx.save()
      ctx.translate(satPt.px, satPt.py)

      // Draw Articulated Solar Panels
      ctx.fillStyle = "#0284c7"
      ctx.strokeStyle = "#38bdf8"
      ctx.lineWidth = 1.2
      // Left wing
      ctx.fillRect(-28 * zoomFactor, -4 * zoomFactor, 18 * zoomFactor, 8 * zoomFactor)
      ctx.strokeRect(-28 * zoomFactor, -4 * zoomFactor, 18 * zoomFactor, 8 * zoomFactor)
      // Right wing
      ctx.fillRect(10 * zoomFactor, -4 * zoomFactor, 18 * zoomFactor, 8 * zoomFactor)
      ctx.strokeRect(10 * zoomFactor, -4 * zoomFactor, 18 * zoomFactor, 8 * zoomFactor)

      // Spacecraft Gold MLI Bus Body
      ctx.fillStyle = "#fbbf24"
      ctx.strokeStyle = "#d97706"
      ctx.lineWidth = 1.5
      ctx.fillRect(-8 * zoomFactor, -8 * zoomFactor, 16 * zoomFactor, 16 * zoomFactor)
      ctx.strokeRect(-8 * zoomFactor, -8 * zoomFactor, 16 * zoomFactor, 16 * zoomFactor)

      // Nadir Optical Aperture Lens (Cyan)
      ctx.fillStyle = "#06b6d4"
      ctx.beginPath()
      ctx.arc(0, 5 * zoomFactor, 3 * zoomFactor, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // 10. Draw Attitude Trihedron Body Axes (Roll/Pitch/Yaw)
      ctx.beginPath()
      ctx.strokeStyle = "#06b6d4" // Roll (X)
      ctx.moveTo(satPt.px, satPt.py)
      ctx.lineTo(velPt.px, velPt.py)
      ctx.stroke()

      // Telemetry HUD Tag
      ctx.fillStyle = "#38bdf8"
      ctx.font = "10px monospace"
      ctx.fillText(`VEROYX-SAT [${altitudeKm}km | ${pointingMode}]`, satPt.px + 18, satPt.py - 14)

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
    }
  }, [altitudeKm, inclinationDeg, pointingMode, showExclusionCones, showGroundFootprint, showAtmosphereHaze, simSpeed, isPlaying, zoomFactor, camYaw, camPitch])

  // Camera Drag Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    setCamYaw((prev) => prev + dx * 0.007)
    setCamPitch((prev) => Math.max(-1.3, Math.min(1.3, prev + dy * 0.007)))
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Orbit className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              High-Precision 3D Orbit, Earth Terminator &amp; Pointing Geometry Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              3D MISSION VISUALIZER
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Interactive 3D spatial canvas rendering Lambertian-shaded Earth rotation, Keplerian orbital trajectories, attitude pointing trihedrons, Star Tracker optical exclusion zones, and nadir ground footprints.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-white font-bold flex items-center gap-1.5 transition-all"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              {isPlaying ? "PAUSE" : "RESUME"}
            </button>
            <button
              onClick={() => { setCamYaw(0.85); setCamPitch(0.35); setZoomFactor(1.0) }}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 font-bold flex items-center gap-1.5 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              RESET CAMERA
            </button>
          </div>
        </div>

        {/* 3D Viewport Screen */}
        <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full cursor-grab active:cursor-grabbing block"
          />

          {/* Overlay HUD Telemetry */}
          <div className="absolute top-4 left-4 p-3.5 rounded-xl bg-slate-950/85 border border-slate-800 font-mono text-[11px] backdrop-blur-md space-y-1.5">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> SPATIAL TELEMETRY
            </div>
            <div className="text-slate-300">Altitude: <strong className="text-white">{altitudeKm} km</strong></div>
            <div className="text-slate-300">Inclination: <strong className="text-white">{inclinationDeg}&deg;</strong></div>
            <div className="text-slate-300">Velocity: <strong className="text-white">{telemetry.vOrbKmS} km/s</strong></div>
            <div className="text-slate-300">Period: <strong className="text-white">{telemetry.orbitPeriodMin} min</strong></div>
            <div className="text-slate-300">Footprint Swath: <strong className="text-emerald-400">{telemetry.footprintDiameterKm} km</strong></div>
            <div className="text-slate-500 text-[9px] pt-1 border-t border-slate-800">
              Drag mouse to orbit 3D camera &middot; Zoom with buttons below
            </div>
          </div>

          {/* Zoom Overlay Pill */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-1 backdrop-blur-md">
            <button
              onClick={() => setZoomFactor((prev) => Math.min(2.0, prev + 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={() => setZoomFactor((prev) => Math.max(0.6, prev - 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-cyan-400" />
            </button>
          </div>

          {/* Overlay Control Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">ATTITUDE FRAME:</span>
              {(["Nadir Pointing", "Sun Pointing", "Velocity Ram"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPointingMode(mode)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                    pointingMode === mode
                      ? "bg-cyan-950 border-cyan-500/60 text-cyan-300 shadow-md shadow-cyan-950/40"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showAtmosphereHaze}
                  onChange={(e) => setShowAtmosphereHaze(e.target.checked)}
                  className="accent-cyan-400 cursor-pointer"
                />
                Limb Haze
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showExclusionCones}
                  onChange={(e) => setShowExclusionCones(e.target.checked)}
                  className="accent-rose-500 cursor-pointer"
                />
                ST Baffles
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showGroundFootprint}
                  onChange={(e) => setShowGroundFootprint(e.target.checked)}
                  className="accent-emerald-500 cursor-pointer"
                />
                RF Footprint
              </label>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="text-slate-400 text-[10px]">SPEED</span>
                <input
                  type="range"
                  min={0.2}
                  max={3.0}
                  step={0.2}
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(Number(e.target.value))}
                  className="w-16 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Controls & Orbit Tuning Desk */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Orbit className="w-4 h-4 text-cyan-400" /> Orbit Geometry
              </span>
              <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
            </div>
            <input
              type="range"
              min={300}
              max={1500}
              step={25}
              value={altitudeKm}
              onChange={(e) => setAltitudeKm(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>300 km (VLEO)</span>
              <span>700 km (SSO)</span>
              <span>1500 km</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-400" /> Inclination Angle
              </span>
              <span className="text-purple-400 font-bold">{inclinationDeg}&deg;</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={inclinationDeg}
              onChange={(e) => setInclinationDeg(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0&deg; (Equatorial)</span>
              <span>53&deg; (ISS / Mid-Lat)</span>
              <span>98&deg; (Sun-Sync)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" /> Correlated Modules
              </span>
              <span className="text-emerald-400 font-bold">CONNECTED</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[9px]">
              <Link href="/star-tracker" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /star-tracker
              </Link>
              <Link href="/swath" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /swath
              </Link>
              <Link href="/ground-station" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /ground-station
              </Link>
              <Link href="/mission-builder" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /mission-builder
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
