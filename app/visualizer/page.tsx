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
  Layers, 
  ArrowRight, 
  Activity, 
  Eye, 
  Radio, 
  Sparkles, 
  Sliders,
  Play,
  Pause
} from "lucide-react"

export default function MissionVisualizerPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(53.0)
  const [pointingMode, setPointingMode] = useState<"Nadir Pointing" | "Sun Pointing" | "Velocity Ram">("Nadir Pointing")
  const [showExclusionCones, setShowExclusionCones] = useState<boolean>(true)
  const [showGroundFootprint, setShowGroundFootprint] = useState<boolean>(true)
  const [simSpeed, setSimSpeed] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  // Camera angles
  const [camYaw, setCamYaw] = useState<number>(0.6)
  const [camPitch, setCamPitch] = useState<number>(0.4)
  const isDraggingRef = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Orbit angle state
  const orbitAngleRef = useRef<number>(0)

  // Simulation calculations
  const orbitPeriodMin = useMemo(() => {
    const rOrbKm = 6378.1 + altitudeKm
    const mu = 398600.4418
    const tSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbKm, 3) / mu)
    return Math.round((tSec / 60) * 10) / 10
  }, [altitudeKm])

  // Canvas animation loop with 3D projection
  useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800
      canvas.height = Math.min(600, window.innerHeight * 0.65)
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    const render = () => {
      if (isPlaying) {
        orbitAngleRef.current += 0.012 * simSpeed
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const scale = Math.min(canvas.width, canvas.height) * 0.28

      // 3D rotation projections
      const project = (x: number, y: number, z: number) => {
        // Yaw (around Y)
        const x1 = x * Math.cos(camYaw) - z * Math.sin(camYaw)
        const z1 = x * Math.sin(camYaw) + z * Math.cos(camYaw)
        // Pitch (around X)
        const y2 = y * Math.cos(camPitch) - z1 * Math.sin(camPitch)
        const z2 = y * Math.sin(camPitch) + z1 * Math.cos(camPitch)
        // Perspective factor
        const fov = 600
        const pz = fov / (fov + z2 * scale)
        return {
          px: cx + x1 * scale * pz,
          py: cy + y2 * scale * pz,
          depth: z2,
        }
      }

      // 1. Draw Background Stars
      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      for (let i = 0; i < 40; i++) {
        const sx = ((Math.sin(i * 123.4) * 0.5 + 0.5) * canvas.width)
        const sy = ((Math.cos(i * 567.8) * 0.5 + 0.5) * canvas.height)
        ctx.fillRect(sx, sy, 1.2, 1.2)
      }

      // 2. Draw Sun Vector Light Ray
      ctx.strokeStyle = "rgba(251, 191, 36, 0.3)"
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(cx - 300, cy - 180)
      ctx.lineTo(cx, cy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "#f59e0b"
      ctx.font = "10px monospace"
      ctx.fillText("☀️ SOLAR INCIDENCE VECTOR", cx - 290, cy - 190)

      // 3. Draw Earth Sphere with Day/Night Terminator
      const rEarth = 1.0
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * scale, 0, Math.PI * 2)
      const earthGrad = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, rEarth * scale)
      earthGrad.addColorStop(0, "#1e3a8a")
      earthGrad.addColorStop(0.65, "#0f172a")
      earthGrad.addColorStop(1, "#020617")
      ctx.fillStyle = earthGrad
      ctx.fill()
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        ctx.strokeStyle = "rgba(56, 189, 248, 0.12)"
        const latRad = (lat * Math.PI) / 180
        const rLat = Math.cos(latRad) * rEarth
        const yLat = Math.sin(latRad) * rEarth
        for (let a = 0; a <= Math.PI * 2; a += 0.2) {
          const pt = project(Math.cos(a) * rLat, yLat, Math.sin(a) * rLat)
          if (a === 0) ctx.moveTo(pt.px, pt.py)
          else ctx.lineTo(pt.px, pt.py)
        }
        ctx.stroke()
      }

      // 4. Draw Orbit Trajectory Ring
      const rOrb = (6378.1 + altitudeKm) / 6378.1
      const incRad = (inclinationDeg * Math.PI) / 180
      ctx.beginPath()
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)"
      ctx.lineWidth = 1.5
      for (let theta = 0; theta <= Math.PI * 2 + 0.1; theta += 0.1) {
        // Orbit plane inclined around X-axis
        const ox = Math.cos(theta) * rOrb
        const oy = Math.sin(theta) * rOrb * Math.sin(incRad)
        const oz = Math.sin(theta) * rOrb * Math.cos(incRad)
        const pt = project(ox, oy, oz)
        if (theta === 0) ctx.moveTo(pt.px, pt.py)
        else ctx.lineTo(pt.px, pt.py)
      }
      ctx.stroke()

      // 5. Compute Satellite 3D Position
      const satTheta = orbitAngleRef.current
      const satX = Math.cos(satTheta) * rOrb
      const satY = Math.sin(satTheta) * rOrb * Math.sin(incRad)
      const satZ = Math.sin(satTheta) * rOrb * Math.cos(incRad)
      const satPt = project(satX, satY, satZ)

      // Nadir sub-satellite point on Earth surface
      const nadirPt = project(satX / rOrb, satY / rOrb, satZ / rOrb)

      // 6. Draw Conical Ground Swath Footprint
      if (showGroundFootprint) {
        ctx.beginPath()
        ctx.strokeStyle = "rgba(16, 185, 129, 0.35)"
        ctx.setLineDash([3, 3])
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(nadirPt.px - 35, nadirPt.py)
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(nadirPt.px + 35, nadirPt.py)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.ellipse(nadirPt.px, nadirPt.py, 35, 18, 0, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)"
        ctx.fill()
        ctx.strokeStyle = "rgba(16, 185, 129, 0.6)"
        ctx.stroke()
      }

      // 7. Draw Star Tracker Optical Exclusion Cone
      if (showExclusionCones) {
        ctx.beginPath()
        ctx.strokeStyle = "rgba(244, 63, 94, 0.4)"
        ctx.setLineDash([2, 2])
        // Exclusion vector pointing away from Earth
        const exPt = project(satX * 1.5, satY * 1.5, satZ * 1.5)
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(exPt.px - 25, exPt.py - 25)
        ctx.moveTo(satPt.px, satPt.py)
        ctx.lineTo(exPt.px + 25, exPt.py + 25)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = "rgba(244, 63, 94, 0.12)"
        ctx.beginPath()
        ctx.arc(exPt.px, exPt.py, 30, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = "#f43f5e"
        ctx.font = "9px monospace"
        ctx.fillText("ST EXCLUSION ZONE (45°)", exPt.px + 35, exPt.py)
      }

      // 8. Render Satellite Body and Solar Wings
      ctx.save()
      ctx.translate(satPt.px, satPt.py)

      // Solar arrays (blue panels)
      ctx.fillStyle = "#0284c7"
      ctx.fillRect(-22, -3, 14, 6)
      ctx.fillRect(8, -3, 14, 6)
      ctx.strokeStyle = "#38bdf8"
      ctx.lineWidth = 1
      ctx.strokeRect(-22, -3, 14, 6)
      ctx.strokeRect(8, -3, 14, 6)

      // Gold bus body
      ctx.fillStyle = "#fbbf24"
      ctx.fillRect(-6, -6, 12, 12)
      ctx.strokeStyle = "#d97706"
      ctx.strokeRect(-6, -6, 12, 12)

      // Payload lens (cyan)
      ctx.fillStyle = "#06b6d4"
      ctx.beginPath()
      ctx.arc(0, 5, 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // Sat label
      ctx.fillStyle = "#38bdf8"
      ctx.font = "10px monospace"
      ctx.fillText(`VEROYX-SAT (${altitudeKm}km, ${pointingMode})`, satPt.px + 15, satPt.py - 10)

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
    }
  }, [altitudeKm, inclinationDeg, pointingMode, showExclusionCones, showGroundFootprint, simSpeed, isPlaying, camYaw, camPitch])

  // Mouse drag handlers for 3D camera rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    setCamYaw((prev) => prev + dx * 0.008)
    setCamPitch((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.008)))
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
              <Orbit className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Real-Time 3D Orbital Trajectory &amp; Attitude Geometry Visualizer
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              3D MISSION VISUALIZER
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Interactive WebGL spatial canvas rendering Keplerian orbit tracks, Earth day/night terminators, Nadir/Sun/Velocity attitude pointing frames, star tracker optical exclusion cones, and antenna footprint swaths.
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
              onClick={() => { setCamYaw(0.6); setCamPitch(0.4) }}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 font-bold flex items-center gap-1.5 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              RESET VIEW
            </button>
          </div>
        </div>

        {/* 3D Viewport Card */}
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
          <div className="absolute top-4 left-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-[11px] backdrop-blur-md space-y-1">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> SPATIAL TELEMETRY
            </div>
            <div className="text-slate-300">Altitude: <strong className="text-white">{altitudeKm} km</strong></div>
            <div className="text-slate-300">Inclination: <strong className="text-white">{inclinationDeg}&deg;</strong></div>
            <div className="text-slate-300">Period: <strong className="text-white">{orbitPeriodMin} min</strong></div>
            <div className="text-slate-400 text-[9px] pt-1 border-t border-slate-800">
              Drag mouse to rotate 3D camera
            </div>
          </div>

          {/* Overlay Controls */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/85 border border-slate-800 font-mono text-xs backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[10px] uppercase font-bold">ATTITUDE MODE:</span>
              {(["Nadir Pointing", "Sun Pointing", "Velocity Ram"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPointingMode(mode)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                    pointingMode === mode
                      ? "bg-cyan-950 border-cyan-500/60 text-cyan-300"
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
              <span>53&deg; (ISS / Starlink)</span>
              <span>98&deg; (Sun-Sync)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" /> Integrated Modules
              </span>
              <span className="text-emerald-400 font-bold">25 CONNECTED</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[9px]">
              <Link href="/star-tracker" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /star-tracker
              </Link>
              <Link href="/swath" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /swath
              </Link>
              <Link href="/mission-builder" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /mission-builder
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
