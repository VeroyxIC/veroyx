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
  Sun,
  Eye,
  Sliders,
  Maximize2
} from "lucide-react"

// High-resolution spherical landmass paths (Lon/Lat in radians)
const DETAILED_CONTINENTS: [number, number][][] = [
  // North America & Arctic
  [[-168, 65], [-160, 71], [-140, 70], [-125, 60], [-125, 49], [-124, 38], [-117, 32], [-110, 24], [-105, 20], [-97, 18], [-87, 13], [-80, 8], [-77, 8], [-82, 23], [-81, 28], [-75, 35], [-70, 42], [-65, 45], [-55, 50], [-60, 60], [-64, 62], [-85, 68], [-95, 75], [-120, 72], [-140, 72], [-168, 65]],
  // South America
  [[-80, 8], [-75, 11], [-60, 10], [-50, 5], [-35, -5], [-37, -12], [-41, -22], [-53, -33], [-66, -45], [-66, -55], [-74, -52], [-72, -40], [-70, -18], [-75, -5], [-80, 8]],
  // Europe & Scandinavia
  [[-9, 39], [-9, 43], [0, 44], [-4, 48], [4, 52], [8, 55], [10, 54], [12, 58], [15, 65], [25, 71], [30, 70], [35, 65], [30, 60], [20, 55], [15, 45], [15, 38], [-5, 36], [-9, 39]],
  // Asia
  [[35, 65], [60, 70], [75, 72], [100, 77], [130, 73], [170, 66], [180, 65], [160, 55], [142, 45], [130, 32], [120, 22], [108, 12], [100, 5], [90, 22], [80, 10], [75, 15], [68, 25], [55, 25], [50, 26], [43, 12], [35, 32], [35, 65]],
  // Africa
  [[-17, 15], [-12, 5], [2, 4], [10, -5], [12, -18], [18, -34], [28, -33], [32, -28], [35, -20], [42, 0], [51, 11], [43, 12], [38, 28], [32, 30], [25, 32], [10, 37], [-5, 36], [-17, 28], [-17, 15]],
  // Australia
  [[114, -22], [116, -34], [125, -34], [138, -35], [150, -37], [153, -28], [145, -15], [135, -12], [122, -16], [114, -22]],
  // Antarctica
  [[-180, -78], [-120, -74], [-60, -64], [0, -68], [60, -66], [120, -65], [180, -78]]
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
  
  // Interactive 3D Camera Angles
  const [camYaw, setCamYaw] = useState<number>(0.2)
  const [camPitch, setCamPitch] = useState<number>(0.35)
  const [zoomFactor, setZoomFactor] = useState<number>(1.0)
  const isDragging = useRef<boolean>(false)
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Power telemetry history buffer for sparkline graph
  const [powerHistory, setPowerHistory] = useState<number[]>(Array(30).fill(280))

  // Orbital Mechanics Core (J2 Perturbations & Vis-Viva)
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

  // Animation Loop
  useEffect(() => {
    let animId: number
    let last = performance.now()

    const step = (now: number) => {
      const dt = (now - last) / 1000
      last = now

      if (isPlaying) {
        setSimTimeSec(prev => prev + dt * timeScale)
      }
      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, timeScale])

  // Earth Self-Rotation (7.2921159e-5 rad/s)
  const earthSpinRad = simTimeSec * 7.2921159e-5

  // State Vector calculations
  const stateVector = useMemo(() => {
    const t = simTimeSec
    const u = (orbit.n * t) % (2 * Math.PI)
    const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

    // Orbital plane position
    const xOrb = orbit.a * Math.cos(u)
    const yOrb = orbit.a * Math.sin(u)

    // ECI Coordinates (km)
    const xEci = xOrb * Math.cos(raan) - yOrb * Math.cos(orbit.incRad) * Math.sin(raan)
    const yEci = xOrb * Math.sin(raan) + yOrb * Math.cos(orbit.incRad) * Math.cos(raan)
    const zEci = yOrb * Math.sin(orbit.incRad)

    // ECI Velocities (km/s)
    const vx = -orbit.velocityKmS * Math.sin(u) * Math.cos(raan) - orbit.velocityKmS * Math.cos(u) * Math.cos(orbit.incRad) * Math.sin(raan)
    const vy = -orbit.velocityKmS * Math.sin(u) * Math.sin(raan) + orbit.velocityKmS * Math.cos(u) * Math.cos(orbit.incRad) * Math.cos(raan)
    const vz = orbit.velocityKmS * Math.cos(u) * Math.sin(orbit.incRad)

    // Sub-satellite Lat / Lon
    const latRad = Math.asin(zEci / orbit.a)
    let lonRad = (Math.atan2(yEci, xEci) - earthSpinRad) % (2 * Math.PI)
    if (lonRad > Math.PI) lonRad -= 2 * Math.PI
    if (lonRad < -Math.PI) lonRad += 2 * Math.PI

    // Sun Vector in ECI (simplified at vernal equinox + earth tilt 23.44 deg)
    const sunEci = { x: 1, y: 0, z: 0 }
    // Eclipse: satellite behind Earth relative to Sun
    const isEclipse = xEci < 0 && Math.sqrt(yEci * yEci + zEci * zEci) < orbit.rEarthKm

    // Ground Station Contact & Doppler Shift
    let lockedStation: string | null = null
    let stationDistKm = 0
    for (const gs of GROUND_STATIONS) {
      const dLon = lonRad - gs.lon
      const dLat = latRad - gs.lat
      const hDist = 2 * Math.asin(Math.sqrt(Math.sin(dLat/2)**2 + Math.cos(latRad)*Math.cos(gs.lat)*Math.sin(dLon/2)**2))
      const surfaceKm = hDist * orbit.rEarthKm
      if (surfaceKm <= gs.rangeKm) {
        lockedStation = gs.name
        stationDistKm = Math.round(surfaceKm)
        break
      }
    }

    const currentPowerW = isEclipse ? 0 : mission.busPowerW + mission.payloadPowerW

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
      stationDistKm,
      u,
      raan,
      currentPowerW
    }
  }, [simTimeSec, earthSpinRad, orbit, mission])

  // Update power history buffer
  useEffect(() => {
    setPowerHistory(prev => [...prev.slice(1), stateVector.currentPowerW])
  }, [stateVector.currentPowerW])

  // Mouse drag handlers for full 3D viewport control
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }

    setCamYaw(prev => prev + dx * 0.008)
    setCamPitch(prev => Math.max(-1.4, Math.min(1.4, prev + dy * 0.008)))
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  // 3D Canvas Projection & Render Engine
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
    const R = Math.min(w, h) * 0.36 * zoomFactor
    const obliquityRad = (23.44 * Math.PI) / 180 // Earth's actual axial tilt

    // --- 3D ROTATION & PROJECTION MATRIX ---
    const project3D = (x: number, y: number, z: number): [number, number, number] => {
      // Rotate around Earth axis with axial tilt
      // Apply Camera Yaw (around Y axis)
      const x1 = x * Math.cos(camYaw) - z * Math.sin(camYaw)
      const z1 = x * Math.sin(camYaw) + z * Math.cos(camYaw)
      const y1 = y

      // Apply Camera Pitch (around X axis)
      const y2 = y1 * Math.cos(camPitch) - z1 * Math.sin(camPitch)
      const z2 = y1 * Math.sin(camPitch) + z1 * Math.cos(camPitch)
      const x2 = x1

      const scrX = cx + x2
      const scrY = cy - y2
      return [scrX, scrY, z2]
    }

    // Convert Earth surface [Lon, Lat] in radians to 3D Sphere coordinates
    const sphereTo3D = (lonRad: number, latRad: number): [number, number, number] => {
      const lonRel = lonRad + earthSpinRad
      const x0 = R * Math.cos(latRad) * Math.sin(lonRel)
      const y0 = R * Math.sin(latRad)
      const z0 = R * Math.cos(latRad) * Math.cos(lonRel)

      // Apply Earth's 23.44 deg Obliquity tilt
      const yTilted = y0 * Math.cos(obliquityRad) - z0 * Math.sin(obliquityRad)
      const zTilted = y0 * Math.sin(obliquityRad) + z0 * Math.cos(obliquityRad)

      return project3D(x0, yTilted, zTilted)
    }

    // 1. DEEP SPACE HORIZON & STARFIELD
    ctx.fillStyle = "#01040d"
    ctx.fillRect(0, 0, w, h)

    // Starfield with slight twinkle
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
    const stars = [[0.08, 0.15], [0.88, 0.12], [0.93, 0.65], [0.12, 0.78], [0.72, 0.85], [0.25, 0.9], [0.82, 0.42]]
    stars.forEach(([sx, sy]) => {
      ctx.fillRect(w * sx, h * sy, 1.5, 1.5)
    })

    // 2. SUN DIRECTION VECTOR ARROW
    const sunScreenX = cx + (R * 1.5) * Math.cos(camYaw)
    const sunScreenY = cy - 40
    ctx.strokeStyle = "rgba(251, 191, 36, 0.4)"
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(sunScreenX, sunScreenY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = "#fbbf24"
    ctx.font = "bold 9px monospace"
    ctx.fillText("SOLAR VECTOR [1, 0, 0]", sunScreenX + 8, sunScreenY + 3)

    // 3. 3D ATMOSPHERIC RAYLEIGH LIMB GLOW
    const limbGrad = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.28)
    limbGrad.addColorStop(0, "rgba(6, 182, 212, 0.45)")
    limbGrad.addColorStop(0.35, "rgba(14, 165, 233, 0.18)")
    limbGrad.addColorStop(0.7, "rgba(2, 132, 199, 0.04)")
    limbGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = limbGrad
    ctx.beginPath()
    ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2)
    ctx.fill()

    // 4. PLANETARY BASE SPHERE WITH DEPTH GRADIENT
    const oceanGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R)
    oceanGrad.addColorStop(0, "#0e3a5d") // Deep vibrant oceanic blue
    oceanGrad.addColorStop(0.7, "#062138")
    oceanGrad.addColorStop(1, "#020c18") // Edge horizon
    ctx.fillStyle = oceanGrad
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()

    // Clip rendering to spherical Earth disc
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()

    // 5. SPHERICAL LAT/LON COORDINATE GRID
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)"
    ctx.lineWidth = 1

    // Parallels (Latitudes)
    for (let latDeg = -75; latDeg <= 75; latDeg += 30) {
      const latR = (latDeg * Math.PI) / 180
      ctx.beginPath()
      let first = true
      for (let lonDeg = -180; lonDeg <= 180; lonDeg += 6) {
        const [px, py, pz] = sphereTo3D((lonDeg * Math.PI) / 180, latR)
        if (pz > 0) {
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
      for (let latDeg = -90; latDeg <= 90; latDeg += 5) {
        const [px, py, pz] = sphereTo3D(lonR, (latDeg * Math.PI) / 180)
        if (pz > 0) {
          if (first) { ctx.moveTo(px, py); first = false }
          else { ctx.lineTo(px, py) }
        } else {
          first = true
        }
      }
      ctx.stroke()
    }

    // 6. DETAILED CONTINENTAL TOPOGRAPHY
    DETAILED_CONTINENTS.forEach(poly => {
      ctx.beginPath()
      let started = false
      poly.forEach(([lonR, latR]) => {
        const [px, py, pz] = sphereTo3D(lonR, latR)
        if (pz > 0) {
          if (!started) { ctx.moveTo(px, py); started = true }
          else { ctx.lineTo(px, py) }
        } else {
          started = false
        }
      })
      ctx.closePath()

      // High-tech emerald/cyan terrain fill
      ctx.fillStyle = "rgba(16, 185, 129, 0.22)"
      ctx.fill()
      ctx.strokeStyle = "rgba(52, 211, 153, 0.55)"
      ctx.lineWidth = 1.2
      ctx.stroke()
    })

    // 7. GROUND TRACK RIBBON PAINTED ON SPHERICAL SURFACE
    const ribbonSteps = 90
    ctx.strokeStyle = "rgba(245, 158, 11, 0.6)"
    ctx.lineWidth = 2
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    let ribbonStarted = false

    for (let s = -30; s <= 60; s++) {
      const pastT = simTimeSec + s * 40
      const pastU = (orbit.n * pastT) % (2 * Math.PI)
      const pastRaan = (0 - orbit.dRaanDt * pastT) % (2 * Math.PI)
      const pxOrb = orbit.a * Math.cos(pastU)
      const pyOrb = orbit.a * Math.sin(pastU)
      const pxEci = pxOrb * Math.cos(pastRaan) - pyOrb * Math.cos(orbit.incRad) * Math.sin(pastRaan)
      const pyEci = pxOrb * Math.sin(pastRaan) + pyOrb * Math.cos(orbit.incRad) * Math.cos(pastRaan)
      const pzEci = pyOrb * Math.sin(orbit.incRad)

      const pLat = Math.asin(pzEci / orbit.a)
      const pLon = (Math.atan2(pyEci, pxEci) - pastT * 7.2921159e-5) % (2 * Math.PI)

      const [sx, sy, sz] = sphereTo3D(pLon, pLat)
      if (sz > 0) {
        if (!ribbonStarted) { ctx.moveTo(sx, sy); ribbonStarted = true }
        else { ctx.lineTo(sx, sy) }
      } else {
        ribbonStarted = false
      }
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 8. GROUND STATIONS ON SPHERE
    GROUND_STATIONS.forEach(gs => {
      const [gx, gy, gz] = sphereTo3D(gs.lon, gs.lat)
      if (gz > 0) {
        // Station Mask Zone
        const maskR = (gs.rangeKm / orbit.rEarthKm) * R * 0.7
        ctx.fillStyle = "rgba(14, 165, 233, 0.18)"
        ctx.beginPath()
        ctx.arc(gx, gy, maskR, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "rgba(56, 189, 248, 0.5)"
        ctx.lineWidth = 1
        ctx.stroke()

        // Center Pin
        ctx.fillStyle = "#38bdf8"
        ctx.beginPath()
        ctx.arc(gx, gy, 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "rgba(224, 242, 254, 0.9)"
        ctx.font = "9px monospace"
        ctx.fillText(gs.name, gx + 6, gy - 2)
      }
    })

    // 9. DAY / NIGHT TERMINATOR SHADOW (UMBRA HEMISPHERE)
    const termX = cx + (R * 0.4) * Math.cos(camYaw)
    const termGrad = ctx.createLinearGradient(termX - R, cy, termX + R, cy)
    termGrad.addColorStop(0, "rgba(0, 0, 0, 0.82)") // True deep shadow
    termGrad.addColorStop(0.5, "rgba(2, 6, 23, 0.35)")
    termGrad.addColorStop(0.65, "rgba(0, 0, 0, 0)")
    termGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = termGrad
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

    ctx.restore() // End sphere clip

    // 10. 3D ORBITAL TRAJECTORY ELLIPSE IN FREE SPACE
    const rOrbit = R * (orbit.a / orbit.rEarthKm)
    ctx.strokeStyle = "rgba(34, 211, 238, 0.75)"
    ctx.lineWidth = 2
    ctx.beginPath()

    const orbitSteps = 140
    for (let i = 0; i <= orbitSteps; i++) {
      const ang = (i / orbitSteps) * 2 * Math.PI
      const xO = rOrbit * Math.cos(ang)
      const yO = rOrbit * Math.sin(ang)

      // Incline and orient orbit in 3D
      const xRot = xO * Math.cos(stateVector.raan) - yO * Math.cos(orbit.incRad) * Math.sin(stateVector.raan)
      const yRot = xO * Math.sin(stateVector.raan) + yO * Math.cos(orbit.incRad) * Math.cos(stateVector.raan)
      const zRot = yO * Math.sin(orbit.incRad)

      const [ox, oy] = project3D(xRot, yRot, zRot)
      if (i === 0) ctx.moveTo(ox, oy)
      else ctx.lineTo(ox, oy)
    }
    ctx.stroke()

    // 11. SATELLITE VEHICLE & VOLUMETRIC NADIR CONE
    const satOrbX = rOrbit * Math.cos(stateVector.u)
    const satOrbY = rOrbit * Math.sin(stateVector.u)
    const satX = satOrbX * Math.cos(stateVector.raan) - satOrbY * Math.cos(orbit.incRad) * Math.sin(stateVector.raan)
    const satY = satOrbX * Math.sin(stateVector.raan) + satOrbY * Math.cos(orbit.incRad) * Math.cos(stateVector.raan)
    const satZ = satOrbY * Math.sin(orbit.incRad)

    const [satScreenX, satScreenY, satZDepth] = project3D(satX, satY, satZ)
    const [subX, subY, subZDepth] = sphereTo3D(stateVector.lonRad, stateVector.latRad)

    // A. Volumetric Nadir Laser Beam
    if (subZDepth > 0) {
      const nadirGrad = ctx.createLinearGradient(satScreenX, satScreenY, subX, subY)
      nadirGrad.addColorStop(0, "rgba(245, 158, 11, 0.95)")
      nadirGrad.addColorStop(0.7, "rgba(245, 158, 11, 0.3)")
      nadirGrad.addColorStop(1, "rgba(245, 158, 11, 0.05)")

      ctx.strokeStyle = nadirGrad
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(satScreenX, satScreenY)
      ctx.lineTo(subX, subY)
      ctx.stroke()

      // Nadir Footprint Reticle on Earth Surface
      ctx.fillStyle = "rgba(245, 158, 11, 0.3)"
      ctx.beginPath()
      ctx.ellipse(subX, subY, 12, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#f59e0b"
      ctx.stroke()
    }

    // B. Elevated Spacecraft Floating Node
    const satHalo = ctx.createRadialGradient(satScreenX, satScreenY, 0, satScreenX, satScreenY, 26)
    satHalo.addColorStop(0, "rgba(245, 158, 11, 1)")
    satHalo.addColorStop(0.35, "rgba(245, 158, 11, 0.45)")
    satHalo.addColorStop(1, "rgba(245, 158, 11, 0)")
    ctx.fillStyle = satHalo
    ctx.beginPath()
    ctx.arc(satScreenX, satScreenY, 26, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.shadowColor = "#f59e0b"
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(satScreenX, satScreenY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Pulsing reticle ring
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(satScreenX, satScreenY, 13, 0, Math.PI * 2)
    ctx.stroke()

    // HUD Identification Tag Box
    ctx.fillStyle = "rgba(2, 6, 23, 0.92)"
    ctx.strokeStyle = "rgba(245, 158, 11, 0.8)"
    ctx.lineWidth = 1
    const tag = `${mission.missionName || "VEROYX-SAT"} // ${mission.altitudeKm}km`
    ctx.font = "bold 10px monospace"
    const tw = ctx.measureText(tag).width
    ctx.fillRect(satScreenX + 18, satScreenY - 14, tw + 12, 22)
    ctx.strokeRect(satScreenX + 18, satScreenY - 14, tw + 12, 22)
    ctx.fillStyle = "#fbbf24"
    ctx.fillText(tag, satScreenX + 24, satScreenY + 1)

  }, [camYaw, camPitch, zoomFactor, earthSpinRad, stateVector, orbit, mission])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 sm:px-8 font-sans selection:bg-cyan-500 selection:text-slate-950 select-none">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Console Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "20s" }} />
              NASA GSFC FDF &middot; Real-Time Orbital Telemetry Deck
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TELEMETRY
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-3xl leading-relaxed">
              Interactive 3D orthographic globe tracking J2000 state vectors, Earth axial obliquity ($23.44^\circ$), sub-satellite surface ribbon projections, and Deep Space Network acquisitions.
            </p>
          </div>

          {/* Time & Camera Controls */}
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
              onClick={() => { setSimTimeSec(0); setCamYaw(0.2); setCamPitch(0.35); setZoomFactor(1.0) }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Reset View & Epoch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN NASA MISSION CONTROL FLIGHT DECK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* LEFT RAIL: J2000 STATE VECTORS & POSITION */}
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
                <Compass className="w-4 h-4 text-purple-400" /> SUB-SATELLITE NADIR POINT
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

          {/* CENTER: 3D INTERACTIVE ORTHOGRAPHIC GLOBE CANVAS */}
          <div className="lg:col-span-6 relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl flex flex-col">
            
            {/* Top Canvas Status Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider">
                  ORTHOGRAPHIC 3D TRACKER
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">| AXIAL TILT 23.44&deg;</span>
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

            {/* Interactive 3D Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-[530px] block cursor-grab active:cursor-grabbing"
              title="Click and drag to rotate view in 3D"
            />

            {/* Bottom Contact & Control Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/85 backdrop-blur-md border-t border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs gap-3">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">GROUND STATION LINK:</span>
                <span className={stateVector.lockedStation ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                  {stateVector.lockedStation ? `AOS: ${stateVector.lockedStation} (${stateVector.stationDistKm}km)` : "LOS (SEARCHING CARRIER)"}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                <span>DRAG TO ROTATE 3D VIEW</span>
                <span className="text-slate-600">|</span>
                <span>EPOCH: <strong className="text-white">{Math.round(simTimeSec)}s</strong></span>
              </div>
            </div>

          </div>

          {/* RIGHT RAIL: EPS BUS, SPARKLINE POWER & GNC */}
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
                    {stateVector.currentPowerW} W
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">BATTERY STATE</span>
                  <span className={stateVector.isEclipse ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {stateVector.isEclipse ? "DISCHARGING (89%)" : "FLOAT TRICKLE (100%)"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">TOTAL BUS LOAD</span>
                  <span className="text-white font-bold">{mission.busPowerW + mission.payloadPowerW} W</span>
                </div>
              </div>

              {/* Real-time Oscilloscope / Sparkline Graph */}
              <div className="pt-2">
                <div className="text-[10px] text-slate-500 mb-1.5 flex justify-between">
                  <span>EPS POWER PROFILE TREND</span>
                  <span className="text-amber-400 font-bold">{stateVector.currentPowerW} W</span>
                </div>
                <div className="h-10 w-full bg-slate-950 rounded-lg border border-slate-800 flex items-end px-1 gap-0.5 overflow-hidden">
                  {powerHistory.map((val, idx) => {
                    const maxP = mission.busPowerW + mission.payloadPowerW + 50
                    const hPercent = Math.max(8, Math.min(100, (val / maxP) * 100))
                    return (
                      <div
                        key={idx}
                        className={`flex-1 transition-all rounded-t-sm ${val > 0 ? "bg-amber-400/80" : "bg-purple-500/40"}`}
                        style={{ height: `${hPercent}%` }}
                      />
                    )
                  })}
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
