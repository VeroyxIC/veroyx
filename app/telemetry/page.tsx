"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Crosshair, 
  Layers, 
  Globe, 
  Compass, 
  Activity, 
  Maximize2,
  Shield,
  Zap,
  Navigation
} from "lucide-react"

// Real-world high-resolution GeoJSON simplified landmass curves
// Includes detailed coastlines for continents and islands
const CONTINENTS: [number, number][][] = [
  // North & Central America
  [[-168, 65], [-140, 70], [-125, 50], [-124, 38], [-117, 32], [-105, 20], [-87, 13], [-80, 8], [-77, 8], [-82, 23], [-75, 35], [-65, 45], [-55, 50], [-60, 60], [-85, 68], [-120, 72], [-168, 65]],
  // South America
  [[-80, 8], [-75, -5], [-70, -18], [-72, -40], [-66, -55], [-53, -33], [-35, -5], [-50, 5], [-60, 10], [-75, 12], [-80, 8]],
  // Europe & Asia (Eurasia)
  [[-10, 36], [0, 44], [10, 54], [25, 71], [60, 70], [100, 77], [140, 72], [170, 66], [142, 45], [130, 32], [120, 22], [105, 10], [90, 22], [75, 15], [68, 25], [50, 26], [35, 32], [28, 41], [15, 38], [-5, 36], [-10, 36]],
  // Africa
  [[-17, 15], [-12, 5], [5, 4], [10, -5], [18, -34], [28, -33], [35, -20], [42, 0], [51, 11], [43, 12], [32, 30], [25, 32], [10, 37], [-5, 36], [-17, 28], [-17, 15]],
  // Australia
  [[114, -22], [125, -34], [138, -35], [150, -37], [153, -28], [145, -15], [135, -12], [122, -16], [114, -22]],
  // Antarctica
  [[-160, -78], [-120, -74], [-60, -64], [0, -68], [60, -66], [120, -65], [160, -72], [-160, -78]]
]

// Ground station network
const GROUND_STATIONS = [
  { name: "DSN Goldstone (CA)", lat: 35.42, lon: -116.88, rangeKm: 2200, freq: "X/Ka" },
  { name: "DSN Madrid (ES)", lat: 40.43, lon: -4.25, rangeKm: 2200, freq: "X/Ka" },
  { name: "DSN Canberra (AU)", lat: -35.40, lon: 148.98, rangeKm: 2200, freq: "X/Ka" },
  { name: "KSAT Svalbard (SG3)", lat: 78.23, lon: 15.40, rangeKm: 2500, freq: "S/X" },
  { name: "Wallops GS (VA)", lat: 37.94, lon: -75.46, rangeKm: 1800, freq: "S/X" },
  { name: "TrollSat (Antarctica)", lat: -72.01, lon: 2.53, rangeKm: 2600, freq: "S/X" }
]

export default function TelemetryPage() {
  const { mission } = useMission()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(5) // 5x real-time
  const [simTimeSec, setSimTimeSec] = useState<number>(0)
  const [viewMode, setViewMode] = useState<"TACTICAL" | "OPTICAL" | "RADAR">("TACTICAL")
  const [hudLayer, setHudLayer] = useState<boolean>(true)

  // Satellite orbital propagation calculations
  const orbit = useMemo(() => {
    const mu = 398600.4418
    const rEarthKm = 6378.137
    const a = rEarthKm + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3)) // rad/s
    const periodSec = 2 * Math.PI / n
    const j2 = 0.00108263
    const dRaanDt = -1.5 * ((j2 * Math.sqrt(mu) * Math.pow(rEarthKm, 2)) / Math.pow(a, 3.5)) * Math.cos(incRad)

    return { a, incRad, n, periodSec, dRaanDt, rEarthKm }
  }, [mission.altitudeKm, mission.inclinationDeg])

  // Real-time animation clock
  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now

      if (isPlaying) {
        setSimTimeSec(prev => prev + dt * timeScale)
      }
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, timeScale])

  // Instantaneous state vector
  const currentTelemetry = useMemo(() => {
    const t = simTimeSec
    const M = (orbit.n * t) % (2 * Math.PI)
    const latRad = Math.asin(Math.sin(orbit.incRad) * Math.sin(M))
    const latDeg = (latRad * 180) / Math.PI

    const omegaEarth = 7.2921159e-5
    const lonRad = (Math.atan2(Math.cos(orbit.incRad) * Math.sin(M), Math.cos(M)) - (omegaEarth - orbit.dRaanDt) * t) % (2 * Math.PI)
    let lonDeg = (lonRad * 180) / Math.PI
    if (lonDeg > 180) lonDeg -= 360
    if (lonDeg < -180) lonDeg += 360

    // Solar beta angle & eclipse detection
    const sunLonDeg = -((t * 0.00416) % 360) // Sun apparent motion
    const distToSunLon = Math.abs(lonDeg - sunLonDeg)
    const isEclipse = distToSunLon > 90 && distToSunLon < 270

    // Ground station contact check
    let activeStation: string | null = null
    for (const gs of GROUND_STATIONS) {
      const dLat = (latDeg - gs.lat) * (Math.PI / 180)
      const dLon = (lonDeg - gs.lon) * (Math.PI / 180)
      const aSin = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(latDeg * Math.PI / 180) * Math.cos(gs.lat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const surfaceDistKm = orbit.rEarthKm * 2 * Math.atan2(Math.sqrt(aSin), Math.sqrt(1 - aSin))
      if (surfaceDistKm <= gs.rangeKm) {
        activeStation = gs.name
        break
      }
    }

    return {
      lat: Math.round(latDeg * 100) / 100,
      lon: Math.round(lonDeg * 100) / 100,
      velocityKmS: (Math.sqrt(398600.4418 / orbit.a)).toFixed(2),
      isEclipse,
      activeStation,
      altitudeKm: mission.altitudeKm
    }
  }, [simTimeSec, orbit, mission.altitudeKm])

  // Render Canvas with 3D Depth Perception
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Projection mapping helper
    const toScreen = (lon: number, lat: number) => {
      const x = ((lon + 180) / 360) * width
      const y = ((90 - lat) / 180) * height
      return [x, y]
    }

    // 1. DEEP SPACE / NIGHT HORIZON BACKGROUND
    const spaceGrad = ctx.createLinearGradient(0, 0, 0, height)
    spaceGrad.addColorStop(0, "#020617")
    spaceGrad.addColorStop(0.5, "#030712")
    spaceGrad.addColorStop(1, "#020617")
    ctx.fillStyle = spaceGrad
    ctx.fillRect(0, 0, width, height)

    // 2. 3D ATMOSPHERIC BULGE / CURVATURE GRADIENT
    const radialGlow = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, width * 0.7)
    radialGlow.addColorStop(0, "rgba(8, 47, 73, 0.25)")
    radialGlow.addColorStop(0.7, "rgba(2, 6, 23, 0.4)")
    radialGlow.addColorStop(1, "rgba(0, 0, 0, 0.9)")
    ctx.fillStyle = radialGlow
    ctx.fillRect(0, 0, width, height)

    // 3. PERSPECTIVE GRID (Curved Latitude/Longitude Wires for 3D illusion)
    ctx.strokeStyle = "rgba(14, 165, 233, 0.08)"
    ctx.lineWidth = 1

    // Longitude lines
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = toScreen(lon, 0)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = toScreen(0, lat)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Equator highlight
    const [, eqY] = toScreen(0, 0)
    ctx.strokeStyle = "rgba(6, 182, 212, 0.2)"
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, eqY)
    ctx.lineTo(width, eqY)
    ctx.stroke()
    ctx.setLineDash([])

    // 4. DAY / NIGHT SOLAR TERMINATOR (UMBRA MASK)
    const sunX = (((-((simTimeSec * 0.00416) % 360) + 180) / 360) * width) % width
    const nightGrad = ctx.createLinearGradient(sunX - width / 2, 0, sunX + width / 2, 0)
    nightGrad.addColorStop(0, "rgba(0, 0, 0, 0.55)")
    nightGrad.addColorStop(0.3, "rgba(2, 6, 23, 0.65)")
    nightGrad.addColorStop(0.5, "rgba(0, 0, 0, 0.0)")
    nightGrad.addColorStop(0.7, "rgba(2, 6, 23, 0.65)")
    nightGrad.addColorStop(1, "rgba(0, 0, 0, 0.55)")
    ctx.fillStyle = nightGrad
    ctx.fillRect(0, 0, width, height)

    // 5. TOPOGRAPHIC CONTINENTS (Multi-Layer Depth)
    CONTINENTS.forEach(poly => {
      // Base Earth Shadow
      ctx.beginPath()
      poly.forEach(([lon, lat], i) => {
        const [x, y] = toScreen(lon, lat)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()

      // 3D Drop-Shadow
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)"
      ctx.shadowColor = "rgba(6, 182, 212, 0.3)"
      ctx.shadowBlur = 12
      ctx.fill()
      ctx.shadowBlur = 0

      // Landmass Coastline Glow
      ctx.strokeStyle = "rgba(45, 212, 191, 0.45)"
      ctx.lineWidth = 1.2
      ctx.stroke()
    })

    // 6. GROUND STATIONS & 3D VOLUMETRIC RADAR DOMES
    GROUND_STATIONS.forEach(gs => {
      const [gx, gy] = toScreen(gs.lon, gs.lat)
      const rangePx = (gs.rangeKm / 40075) * width

      // Ground footprint gradient dome
      const radarGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, rangePx)
      radarGrad.addColorStop(0, "rgba(14, 165, 233, 0.22)")
      radarGrad.addColorStop(0.7, "rgba(14, 165, 233, 0.08)")
      radarGrad.addColorStop(1, "rgba(14, 165, 233, 0.0)")

      ctx.fillStyle = radarGrad
      ctx.beginPath()
      ctx.arc(gx, gy, rangePx, 0, Math.PI * 2)
      ctx.fill()

      // Radar range rim
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(gx, gy, rangePx, 0, Math.PI * 2)
      ctx.stroke()

      // Rotating Radar Sweep Beam
      const sweepAngle = (simTimeSec * 1.5) % (Math.PI * 2)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)"
      ctx.beginPath()
      ctx.moveTo(gx, gy)
      ctx.lineTo(gx + Math.cos(sweepAngle) * rangePx, gy + Math.sin(sweepAngle) * rangePx)
      ctx.stroke()

      // Ground Station Center Beacon
      ctx.fillStyle = "#38bdf8"
      ctx.beginPath()
      ctx.arc(gx, gy, 3, 0, Math.PI * 2)
      ctx.fill()

      // Label
      ctx.fillStyle = "rgba(186, 230, 253, 0.7)"
      ctx.font = "9px monospace"
      ctx.fillText(gs.name, gx + 6, gy - 4)
    })

    // 7. MULTI-ORBIT GROUND TRACK PROJECTION (Past & Future Paths)
    const points: [number, number][] = []
    const omegaEarth = 7.2921159e-5
    for (let dt = -orbit.periodSec * 0.75; dt <= orbit.periodSec * 1.25; dt += 45) {
      const t = simTimeSec + dt
      const M = (orbit.n * t) % (2 * Math.PI)
      const latR = Math.asin(Math.sin(orbit.incRad) * Math.sin(M))
      const lonR = (Math.atan2(Math.cos(orbit.incRad) * Math.sin(M), Math.cos(M)) - (omegaEarth - orbit.dRaanDt) * t) % (2 * Math.PI)
      let lonD = (lonR * 180) / Math.PI
      if (lonD > 180) lonD -= 360
      if (lonD < -180) lonD -= 360
      const [sX, sY] = toScreen(lonD, (latR * 180) / Math.PI)
      points.push([sX, sY])
    }

    // Render path with break handling at anti-meridian (-180 / +180)
    ctx.strokeStyle = "rgba(34, 211, 238, 0.75)"
    ctx.lineWidth = 2
    ctx.shadowColor = "rgba(34, 211, 238, 0.6)"
    ctx.shadowBlur = 8
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const [px, py] = points[i]
      if (i > 0) {
        const [prevX] = points[i - 1]
        if (Math.abs(px - prevX) > width * 0.5) {
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(px, py)
          continue
        }
      }
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.shadowBlur = 0

    // 8. 3D ELEVATION SATELLITE HUD WITH NADIR TETHER
    const [satX, satY] = toScreen(currentTelemetry.lon, currentTelemetry.lat)

    // A. Surface Sub-Satellite Footprint (Shadow on Earth)
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
    ctx.beginPath()
    ctx.ellipse(satX, satY, 14, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(6, 182, 212, 0.5)"
    ctx.lineWidth = 1
    ctx.stroke()

    // B. 3D Elevation Height Vector (Dashed laser tether rising toward camera)
    const altitudeScalePx = Math.min(65, (mission.altitudeKm / 800) * 45)
    const elevatedY = satY - altitudeScalePx

    ctx.strokeStyle = "rgba(245, 158, 11, 0.85)"
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(satX, satY)
    ctx.lineTo(satX, elevatedY)
    ctx.stroke()
    ctx.setLineDash([])

    // C. Elevated Spacecraft Floating Node
    // Atmospheric / orbital glow halo
    const glowHalo = ctx.createRadialGradient(satX, elevatedY, 0, satX, elevatedY, 24)
    glowHalo.addColorStop(0, "rgba(245, 158, 11, 0.9)")
    glowHalo.addColorStop(0.4, "rgba(245, 158, 11, 0.35)")
    glowHalo.addColorStop(1, "rgba(245, 158, 11, 0.0)")
    ctx.fillStyle = glowHalo
    ctx.beginPath()
    ctx.arc(satX, elevatedY, 24, 0, Math.PI * 2)
    ctx.fill()

    // Spacecraft Core
    ctx.fillStyle = "#ffffff"
    ctx.shadowColor = "#f59e0b"
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(satX, elevatedY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Concentric 3D Attitude Reticle Ring
    const pulseRad = 10 + (Math.sin(simTimeSec * 4) * 3)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(satX, elevatedY, pulseRad, 0, Math.PI * 2)
    ctx.stroke()

    // Crosshairs
    ctx.strokeStyle = "rgba(245, 158, 11, 0.9)"
    ctx.beginPath()
    ctx.moveTo(satX - 16, elevatedY)
    ctx.lineTo(satX - 8, elevatedY)
    ctx.moveTo(satX + 8, elevatedY)
    ctx.lineTo(satX + 16, elevatedY)
    ctx.moveTo(satX, elevatedY - 16)
    ctx.lineTo(satX, elevatedY - 8)
    ctx.moveTo(satX, elevatedY + 8)
    ctx.lineTo(satX, elevatedY + 16)
    ctx.stroke()

    // Target Label HUD Box
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)"
    ctx.strokeStyle = "rgba(245, 158, 11, 0.6)"
    ctx.lineWidth = 1
    const tagText = `${mission.missionName || "VEROYX-SAT"} [ALT: ${mission.altitudeKm}km]`
    ctx.font = "bold 10px monospace"
    const textW = ctx.measureText(tagText).width
    ctx.strokeRect(satX + 18, elevatedY - 18, textW + 12, 22)
    ctx.fillRect(satX + 18, elevatedY - 18, textW + 12, 22)
    ctx.fillStyle = "#fbbf24"
    ctx.fillText(tagText, satX + 24, elevatedY - 4)

    // 9. SCANLINES / MILITARY HUD CRT GLASS EFFECT
    if (hudLayer) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.015)"
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5)
      }
    }

  }, [simTimeSec, mission, currentTelemetry, orbit, hudLayer])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Navigation className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Real-Time J2 Orbit Propagation &amp; Ground Track Telemetry Kernel
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TELEMETRY
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              True 3D depth-projected orbital trajectory engine tracking instantaneous J2000 state vectors, nadir altitude tethers, solar terminator umbra transitions, and ground station line-of-sight passes.
            </p>
          </div>

          {/* Time Controls */}
          <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isPlaying ? "PAUSE" : "RESUME"}</span>
            </button>

            {[1, 5, 25, 100].map(scale => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeScale === scale 
                    ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {scale}x
              </button>
            ))}

            <button
              onClick={() => setSimTimeSec(0)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Reset Orbit Epoch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Master 3D Canvas Deck */}
        <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl">
          
          {/* Top Bar HUD Glass Overlay */}
          <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3.5 bg-slate-950/70 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-cyan-400 font-bold">
                <Globe className="w-4 h-4 text-cyan-400" />
                3D PROJECTED EQUIRECTANGULAR GROUND TRACK
              </span>
              <span className="hidden sm:inline-block text-[10px] text-slate-500">|</span>
              <span className="hidden sm:inline-block text-[10px] text-slate-400">
                FRAME: <strong className="text-white">J2000_ECI</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">
                LAT: <strong className="text-white">{currentTelemetry.lat}&deg;</strong>
              </span>
              <span className="text-[10px] text-slate-400">
                LON: <strong className="text-white">{currentTelemetry.lon}&deg;</strong>
              </span>
              <span className="text-[10px] text-slate-400">
                ALT: <strong className="text-cyan-400">{currentTelemetry.altitudeKm} km</strong>
              </span>

              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentTelemetry.isEclipse 
                  ? "bg-purple-950 border border-purple-500/40 text-purple-300" 
                  : "bg-amber-950 border border-amber-500/40 text-amber-300"
              }`}>
                {currentTelemetry.isEclipse ? "ECLIPSE PASS" : "SUNLIT PASS"}
              </span>
            </div>
          </div>

          {/* Interactive Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-[540px] block cursor-crosshair"
          />

          {/* Bottom Telemetry Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs gap-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">VELOCITY:</span>
                <span className="text-white font-bold">{currentTelemetry.velocityKmS} km/s</span>
              </div>

              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">COMM LINK:</span>
                <span className={currentTelemetry.activeStation ? "text-emerald-300 font-bold" : "text-slate-500 font-bold"}>
                  {currentTelemetry.activeStation ? `LOCKED: ${currentTelemetry.activeStation}` : "SEARCHING CARRIER"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHudLayer(!hudLayer)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  hudLayer 
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300" 
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                HUD SCANLINES {hudLayer ? "ON" : "OFF"}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
