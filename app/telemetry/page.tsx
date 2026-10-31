"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Activity, 
  Zap, 
  Compass, 
  Globe, 
  Layers, 
  ShieldCheck,
  Cpu,
  ChevronRight,
  Maximize2
} from "lucide-react"

// Simplified high-density continental coordinate paths (Spherical Lon/Lat in radians)
const SPHERICAL_LANDMASSED: [number, number][][] = [
  // North America
  [[-168, 65], [-140, 70], [-125, 50], [-124, 38], [-117, 32], [-105, 20], [-87, 13], [-80, 8], [-77, 8], [-82, 23], [-75, 35], [-65, 45], [-55, 50], [-60, 60], [-85, 68], [-120, 72], [-168, 65]],
  // South America
  [[-80, 8], [-75, -5], [-70, -18], [-72, -40], [-66, -55], [-53, -33], [-35, -5], [-50, 5], [-60, 10], [-75, 12], [-80, 8]],
  // Eurasia
  [[-10, 36], [0, 44], [10, 54], [25, 71], [60, 70], [100, 77], [140, 72], [170, 66], [142, 45], [130, 32], [120, 22], [105, 10], [90, 22], [75, 15], [68, 25], [50, 26], [35, 32], [28, 41], [15, 38], [-5, 36], [-10, 36]],
  // Africa
  [[-17, 15], [-12, 5], [5, 4], [10, -5], [18, -34], [28, -33], [35, -20], [42, 0], [51, 11], [43, 12], [32, 30], [25, 32], [10, 37], [-5, 36], [-17, 28], [-17, 15]],
  // Australia
  [[114, -22], [125, -34], [138, -35], [150, -37], [153, -28], [145, -15], [135, -12], [122, -16], [114, -22]],
  // Antarctica
  [[-160, -75], [-120, -72], [-60, -64], [0, -68], [60, -66], [120, -65], [160, -72], [-160, -75]]
].map(poly => poly.map(([lon, lat]) => [(lon * Math.PI) / 180, (lat * Math.PI) / 180]))

const GROUND_STATIONS = [
  { name: "DSN Goldstone (CA)", lon: (-116.88 * Math.PI) / 180, lat: (35.42 * Math.PI) / 180, rangeKm: 2200 },
  { name: "DSN Madrid (ES)", lon: (-4.25 * Math.PI) / 180, lat: (40.43 * Math.PI) / 180, rangeKm: 2200 },
  { name: "DSN Canberra (AU)", lon: (148.98 * Math.PI) / 180, lat: (-35.40 * Math.PI) / 180, rangeKm: 2200 },
  { name: "KSAT Svalbard (SG3)", lon: (15.40 * Math.PI) / 180, lat: (78.23 * Math.PI) / 180, rangeKm: 2500 },
  { name: "Wallops GS (VA)", lon: (-75.46 * Math.PI) / 180, lat: (37.94 * Math.PI) / 180, rangeKm: 1800 }
]

export default function TelemetryPage() {
  const { mission } = useMission()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Simulation timeline & controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  const [simTimeSec, setSimTimeSec] = useState<number>(0)
  const [globeRotationRad, setGlobeRotationRad] = useState<number>(0)
  const [pitchAngleRad, setPitchAngleRad] = useState<number>(0.28) // Slight downward tilt for 3D depth

  // Orbital Mechanics
  const orbit = useMemo(() => {
    const mu = 398600.4418
    const rEarthKm = 6378.137
    const a = rEarthKm + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3))
    const periodSec = (2 * Math.PI) / n
    const j2 = 0.00108263
    const dRaanDt = -1.5 * ((j2 * Math.sqrt(mu) * Math.pow(rEarthKm, 2)) / Math.pow(a, 3.5)) * Math.cos(incRad)
    const velocityKmS = Math.sqrt(mu / a)

    return { a, incRad, n, periodSec, dRaanDt, velocityKmS, rEarthKm }
  }, [mission.altitudeKm, mission.inclinationDeg])

  // Live animation loop
  useEffect(() => {
    let animId: number
    let last = performance.now()

    const step = (now: number) => {
      const dt = (now - last) / 1000
      last = now

      if (isPlaying) {
        setSimTimeSec(prev => prev + dt * timeScale)
        // Earth self-rotation (7.2921159e-5 rad/s)
        setGlobeRotationRad(prev => prev + 7.2921159e-5 * dt * timeScale)
      }
      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, timeScale])

  // Instantaneous orbital state vector (J2000 ECI & ECEF)
  const stateVector = useMemo(() => {
    const t = simTimeSec
    const u = (orbit.n * t) % (2 * Math.PI) // Mean argument of latitude
    const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

    // Position in orbital plane
    const xOrb = orbit.a * Math.cos(u)
    const yOrb = orbit.a * Math.sin(u)

    // J2000 ECI Coordinates (km)
    const xEci = xOrb * Math.cos(raan) - yOrb * Math.cos(orbit.incRad) * Math.sin(raan)
    const yEci = xOrb * Math.sin(raan) + yOrb * Math.cos(orbit.incRad) * Math.cos(raan)
    const zEci = yOrb * Math.sin(orbit.incRad)

    // Velocity in ECI (km/s)
    const vx = -orbit.velocityKmS * Math.sin(u)
    const vy = orbit.velocityKmS * Math.cos(u) * Math.cos(orbit.incRad)
    const vz = orbit.velocityKmS * Math.cos(u) * Math.sin(orbit.incRad)

    // Sub-satellite Lat / Lon
    const latRad = Math.asin(zEci / orbit.a)
    let lonRad = (Math.atan2(yEci, xEci) - globeRotationRad) % (2 * Math.PI)
    if (lonRad > Math.PI) lonRad -= 2 * Math.PI
    if (lonRad < -Math.PI) lonRad += 2 * Math.PI

    // Eclipse detection: Earth shadow cylinder test
    // Sun position in ECI (simplified zero-inclination equinox solar vector)
    const isEclipse = xEci < 0 && Math.sqrt(yEci * yEci + zEci * zEci) < orbit.rEarthKm

    // Check ground station contact
    let lockedStation: string | null = null
    for (const gs of GROUND_STATIONS) {
      const dLon = lonRad - gs.lon
      const dLat = latRad - gs.lat
      const hDist = 2 * Math.asin(Math.sqrt(Math.sin(dLat/2)**2 + Math.cos(latRad)*Math.cos(gs.lat)*Math.sin(dLon/2)**2))
      if (hDist * orbit.rEarthKm <= gs.rangeKm) {
        lockedStation = gs.name
        break
      }
    }

    return {
      xEci: Math.round(xEci),
      yEci: Math.round(yEci),
      zEci: Math.round(zEci),
      vx: vx.toFixed(3),
      vy: vy.toFixed(3),
      vz: vz.toFixed(3),
      latDeg: ((latRad * 180) / Math.PI).toFixed(2),
      lonDeg: ((lonRad * 180) / Math.PI).toFixed(2),
      latRad,
      lonRad,
      isEclipse,
      lockedStation,
      u,
      raan
    }
  }, [simTimeSec, globeRotationRad, orbit])

  // 3D Canvas Projection & Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const cx = w * 0.5
    const cy = h * 0.52
    const R = Math.min(w, h) * 0.35 // Globe screen radius
    const scale = R / orbit.rEarthKm

    // --- 3D ORTHOGRAPHIC PROJECTION MATRIX ---
    // Rotates [lon, lat] on Earth sphere around center [lonCenter, latCenter]
    const projectSphere = (lon: number, lat: number): [number, number, boolean] => {
      // Relative longitude relative to center facing prime meridian + rotation
      const relLon = lon + globeRotationRad
      // Convert to 3D unit coordinates on sphere
      const x = Math.cos(lat) * Math.sin(relLon)
      const y = Math.sin(lat)
      const z = Math.cos(lat) * Math.cos(relLon)

      // Pitch tilt around X-axis
      const yPitched = y * Math.cos(pitchAngleRad) - z * Math.sin(pitchAngleRad)
      const zPitched = y * Math.sin(pitchAngleRad) + z * Math.cos(pitchAngleRad)

      const screenX = cx + x * R
      const screenY = cy - yPitched * R
      const isVisible = zPitched > 0 // Front-facing hemisphere test

      return [screenX, screenY, isVisible]
    }

    // 1. DEEP SPACE BACKDROP & NASA MISSION CONTROL RETICLE
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, w, h)

    // Subtle star field
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
    const starCoords = [[0.1, 0.2], [0.85, 0.15], [0.92, 0.7], [0.15, 0.8], [0.75, 0.88], [0.08, 0.5]]
    starCoords.forEach(([sx, sy]) => {
      ctx.fillRect(w * sx, h * sy, 1.5, 1.5)
    })

    // 2. ATMOSPHERIC LIMB GLOW (RAYLEIGH SCATTERING 3D HALO)
    const limbGrad = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.25)
    limbGrad.addColorStop(0, "rgba(14, 165, 233, 0.45)")
    limbGrad.addColorStop(0.3, "rgba(56, 189, 248, 0.18)")
    limbGrad.addColorStop(0.7, "rgba(2, 132, 199, 0.05)")
    limbGrad.addColorStop(1, "rgba(0, 0, 0, 0)")

    ctx.fillStyle = limbGrad
    ctx.beginPath()
    ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2)
    ctx.fill()

    // 3. 3D SPHERICAL PLANET BODY (BASE SPHERE SHADING)
    const sphereGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R)
    sphereGrad.addColorStop(0, "#0c4a6e") // Luminous sunlit ocean
    sphereGrad.addColorStop(0.65, "#072740")
    sphereGrad.addColorStop(1, "#020e1a") // Deep edge horizon

    ctx.fillStyle = sphereGrad
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()

    // Clip to sphere for surface features
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()

    // 4. SPHERICAL LATITUDE & LONGITUDE GRATICULE MESH
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)"
    ctx.lineWidth = 1

    // Parallels (Latitudes)
    for (let latDeg = -75; latDeg <= 75; latDeg += 25) {
      const latR = (latDeg * Math.PI) / 180
      ctx.beginPath()
      let first = true
      for (let lonDeg = -180; lonDeg <= 180; lonDeg += 8) {
        const [px, py, vis] = projectSphere((lonDeg * Math.PI) / 180, latR)
        if (vis) {
          if (first) { ctx.moveTo(px, py); first = false }
          else { ctx.lineTo(px, py) }
        } else {
          first = true
        }
      }
      ctx.stroke()
    }

    // Meridians (Longitudes)
    for (let lonDeg = -180; lonDeg < 180; lonDeg += 30) {
      const lonR = (lonDeg * Math.PI) / 180
      ctx.beginPath()
      let first = true
      for (let latDeg = -90; latDeg <= 90; latDeg += 6) {
        const [px, py, vis] = projectSphere(lonR, (latDeg * Math.PI) / 180)
        if (vis) {
          if (first) { ctx.moveTo(px, py); first = false }
          else { ctx.lineTo(px, py) }
        } else {
          first = true
        }
      }
      ctx.stroke()
    }

    // 5. CONTINENTAL LANDMASSES PROJECTED ON SPHERE
    SPHERICAL_LANDMASSED.forEach(poly => {
      ctx.beginPath()
      let started = false
      poly.forEach(([lonR, latR]) => {
        const [px, py, vis] = projectSphere(lonR, latR)
        if (vis) {
          if (!started) { ctx.moveTo(px, py); started = true }
          else { ctx.lineTo(px, py) }
        } else {
          started = false
        }
      })
      ctx.closePath()

      // Luminous cyan-tinted landmass fill
      ctx.fillStyle = "rgba(16, 185, 129, 0.18)"
      ctx.fill()
      ctx.strokeStyle = "rgba(52, 211, 153, 0.45)"
      ctx.lineWidth = 1.2
      ctx.stroke()
    })

    // 6. GROUND STATIONS & SENSOR MASKS
    GROUND_STATIONS.forEach(gs => {
      const [gx, gy, vis] = projectSphere(gs.lon, gs.lat)
      if (vis) {
        // Station mask footprint
        const maskR = (gs.rangeKm / orbit.rEarthKm) * R * 0.7
        ctx.fillStyle = "rgba(14, 165, 233, 0.15)"
        ctx.beginPath()
        ctx.arc(gx, gy, maskR, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)"
        ctx.lineWidth = 1
        ctx.stroke()

        // Core Beacon
        ctx.fillStyle = "#38bdf8"
        ctx.beginPath()
        ctx.arc(gx, gy, 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "rgba(224, 242, 254, 0.85)"
        ctx.font = "9px monospace"
        ctx.fillText(gs.name, gx + 6, gy - 2)
      }
    })

    // 7. DAY / NIGHT TERMINATOR SHADOW (3D SPHERICAL SHADING)
    const terminatorGrad = ctx.createLinearGradient(cx - R, cy, cx + R, cy)
    terminatorGrad.addColorStop(0, "rgba(0, 0, 0, 0.75)") // Night side
    terminatorGrad.addColorStop(0.48, "rgba(2, 6, 23, 0.4)")
    terminatorGrad.addColorStop(0.55, "rgba(0, 0, 0, 0)") // Sunlit hemisphere
    terminatorGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = terminatorGrad
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

    ctx.restore() // End sphere clip

    // 8. 3D ORBITAL TRAJECTORY ELLIPSE IN PHYSICAL SPACE
    const rOrbit = R * (orbit.a / orbit.rEarthKm)
    ctx.strokeStyle = "rgba(34, 211, 238, 0.75)"
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()

    const orbitSteps = 120
    for (let i = 0; i <= orbitSteps; i++) {
      const ang = (i / orbitSteps) * 2 * Math.PI
      const xO = rOrbit * Math.cos(ang)
      const yO = rOrbit * Math.sin(ang)

      // Project into 3D camera frame
      const xRot = xO * Math.cos(stateVector.raan) - yO * Math.cos(orbit.incRad) * Math.sin(stateVector.raan)
      const yRot = xO * Math.sin(stateVector.raan) + yO * Math.cos(orbit.incRad) * Math.cos(stateVector.raan)
      const zRot = yO * Math.sin(orbit.incRad)

      const yP = yRot * Math.cos(pitchAngleRad) - zRot * Math.sin(pitchAngleRad)
      const scrX = cx + xRot
      const scrY = cy - yP

      if (i === 0) ctx.moveTo(scrX, scrY)
      else ctx.lineTo(scrX, scrY)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 9. INSTANTANEOUS 3D SATELLITE VEHICLE & VOLUMETRIC NADIR CONE
    const satOrbX = rOrbit * Math.cos(stateVector.u)
    const satOrbY = rOrbit * Math.sin(stateVector.u)
    const satXRot = satOrbX * Math.cos(stateVector.raan) - satOrbY * Math.cos(orbit.incRad) * Math.sin(stateVector.raan)
    const satYRot = satOrbX * Math.sin(stateVector.raan) + satOrbY * Math.cos(orbit.incRad) * Math.cos(stateVector.raan)
    const satZRot = satOrbY * Math.sin(orbit.incRad)

    const satYPitched = satYRot * Math.cos(pitchAngleRad) - satZRot * Math.sin(pitchAngleRad)
    const satScreenX = cx + satXRot
    const satScreenY = cy - satYPitched

    // Sub-satellite surface point
    const [subSatX, subSatY, subVis] = projectSphere(stateVector.lonRad, stateVector.latRad)

    // A. Volumetric Nadir Laser Cone (Satellite -> Earth Surface)
    if (subVis) {
      const coneGrad = ctx.createLinearGradient(satScreenX, satScreenY, subSatX, subSatY)
      coneGrad.addColorStop(0, "rgba(245, 158, 11, 0.8)")
      coneGrad.addColorStop(0.7, "rgba(245, 158, 11, 0.2)")
      coneGrad.addColorStop(1, "rgba(245, 158, 11, 0.05)")

      ctx.strokeStyle = coneGrad
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(satScreenX, satScreenY)
      ctx.lineTo(subSatX, subSatY)
      ctx.stroke()

      // Surface impact footprint ellipse
      ctx.fillStyle = "rgba(245, 158, 11, 0.25)"
      ctx.beginPath()
      ctx.ellipse(subSatX, subSatY, 14, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#f59e0b"
      ctx.stroke()
    }

    // B. Spacecraft Node in 3D Space
    const satHalo = ctx.createRadialGradient(satScreenX, satScreenY, 0, satScreenX, satScreenY, 26)
    satHalo.addColorStop(0, "rgba(245, 158, 11, 1)")
    satHalo.addColorStop(0.3, "rgba(245, 158, 11, 0.4)")
    satHalo.addColorStop(1, "rgba(245, 158, 11, 0)")

    ctx.fillStyle = satHalo
    ctx.beginPath()
    ctx.arc(satScreenX, satScreenY, 26, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.shadowColor = "#f59e0b"
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(satScreenX, satScreenY, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Targeting Crosshairs
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(satScreenX, satScreenY, 12, 0, Math.PI * 2)
    ctx.stroke()

    // Spacecraft Tag HUD Card
    ctx.fillStyle = "rgba(2, 6, 23, 0.9)"
    ctx.strokeStyle = "rgba(245, 158, 11, 0.7)"
    ctx.lineWidth = 1
    const tag = `${mission.missionName || "VEROYX-SAT"} // ${mission.altitudeKm}km`
    ctx.font = "bold 10px monospace"
    const tw = ctx.measureText(tag).width
    ctx.fillRect(satScreenX + 16, satScreenY - 14, tw + 12, 20)
    ctx.strokeRect(satScreenX + 16, satScreenY - 14, tw + 12, 20)
    ctx.fillStyle = "#fbbf24"
    ctx.fillText(tag, satScreenX + 22, satScreenY)

  }, [globeRotationRad, stateVector, pitchAngleRad, orbit, mission])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 sm:px-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-[1550px] mx-auto space-y-6">

        {/* Master NASA Console Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "18s" }} />
              NASA GSFC FDF &middot; J2 Ephemeris Step-Propagator
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TELEMETRY
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-3xl leading-relaxed">
              Real-time 3D orthographic spherical flight tracker with J2 secular J2000 state vectors, nadir altitude vector projection, and deep-space network line-of-sight tracking.
            </p>
          </div>

          {/* Time Warp Controls */}
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
              onClick={() => { setSimTimeSec(0); setGlobeRotationRad(0) }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Reset Epoch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN NASA MISSION CONTROL FLIGHT DECK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* LEFT RAIL: ORBITAL STATE VECTOR */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  J2000 STATE VECTOR
                </span>
                <span className="text-[10px] text-cyan-400">ECI FRAME</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">POS X</span>
                  <span className="text-white font-bold">{stateVector.xEci.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">POS Y</span>
                  <span className="text-white font-bold">{stateVector.yEci.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">POS Z</span>
                  <span className="text-white font-bold">{stateVector.zEci.toLocaleString()} km</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vx</span>
                  <span className="text-cyan-400 font-bold">{stateVector.vx} km/s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vy</span>
                  <span className="text-cyan-400 font-bold">{stateVector.vy} km/s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vz</span>
                  <span className="text-cyan-400 font-bold">{stateVector.vz} km/s</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2 text-white font-bold uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-400" /> SUB-SATELLITE POINT
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">LATITUDE</span>
                <span className="text-white font-bold">{stateVector.latDeg}&deg;</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">LONGITUDE</span>
                <span className="text-white font-bold">{stateVector.lonDeg}&deg;</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ALTITUDE</span>
                <span className="text-cyan-400 font-bold">{mission.altitudeKm} km</span>
              </div>
            </div>
          </div>

          {/* CENTER: 3D ROTATING ORTHOGRAPHIC GLOBE CANVAS */}
          <div className="lg:col-span-6 relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl flex flex-col">
            
            {/* Top Canvas Status Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3.5 bg-slate-950/70 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider">
                  ORTHOGRAPHIC 3D TRACKER
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  stateVector.isEclipse 
                    ? "bg-purple-950 border border-purple-500/40 text-purple-300"
                    : "bg-amber-950 border border-amber-500/40 text-amber-300"
                }`}>
                  {stateVector.isEclipse ? "ECLIPSE PASS (UMBRA)" : "SUNLIT PASS"}
                </span>
              </div>
            </div>

            {/* The 3D Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-[520px] block cursor-grab active:cursor-grabbing"
            />

            {/* Bottom Contact Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">GROUND STATION LINK:</span>
                <span className={stateVector.lockedStation ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                  {stateVector.lockedStation ? `AOS: ${stateVector.lockedStation}` : "LOS (SEARCHING)"}
                </span>
              </div>

              <div className="text-[10px] text-slate-500">
                DRAG TO ROTATE PITCH &middot; TIME: {Math.round(simTimeSec)}s
              </div>
            </div>

          </div>

          {/* RIGHT RAIL: EPS, THERMAL & VEHICLE TELEMETRY */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  ELECTRICAL POWER BUS
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">NOMINAL</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">BUS VOLTAGE</span>
                  <span className="text-white font-bold">28.4 VDC</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">SOLAR ARRAY GEN</span>
                  <span className={stateVector.isEclipse ? "text-slate-500 font-bold" : "text-amber-400 font-bold"}>
                    {stateVector.isEclipse ? "0 W (ECLIPSE)" : `${mission.busPowerW + mission.payloadPowerW} W`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">BATTERY STATE</span>
                  <span className={stateVector.isEclipse ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {stateVector.isEclipse ? "DISCHARGING (89%)" : "TRICKLE CHARGE (100%)"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">BUS LOAD</span>
                  <span className="text-white font-bold">{mission.busPowerW + mission.payloadPowerW} W</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2 text-white font-bold uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> ONBOARD GNC CONSOLE
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ORBIT INCLINATION</span>
                <span className="text-white font-bold">{mission.inclinationDeg}&deg;</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ORBITAL PERIOD</span>
                <span className="text-white font-bold">{Math.round(orbit.periodSec / 60)} min</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">VELOCITY MAGNITUDE</span>
                <span className="text-cyan-400 font-bold">{orbit.velocityKmS.toFixed(2)} km/s</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
