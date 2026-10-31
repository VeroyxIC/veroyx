"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { 
  Orbit, 
  Sun, 
  Globe, 
  Compass, 
  RotateCw, 
  Activity, 
  Crosshair, 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  Rocket, 
  Radio, 
  Sliders, 
  Download,
  Flame,
  Layers,
  ShieldAlert
} from "lucide-react"

// Enhanced continental vector coordinates [lat, lon]
const CONTINENTS: [number, number][][] = [
  // North America & Greenland
  [[83, -30], [75, -20], [60, -45], [60, -65], [47, -53], [44, -64], [30, -81], [25, -80], [29, -95], [26, -97], [18, -96], [15, -88], [9, -78], [17, -100], [32, -117], [38, -123], [48, -125], [58, -137], [64, -165], [71, -156], [71, -128], [69, -98], [76, -82], [83, -30]],
  // South America
  [[12, -72], [10, -62], [5, -52], [-5, -35], [-23, -42], [-35, -57], [-53, -68], [-55, -73], [-42, -74], [-18, -70], [-5, -81], [5, -77], [12, -72]],
  // Europe & British Isles
  [[71, 28], [60, 28], [54, 14], [44, 9], [36, -5], [43, -9], [48, -5], [54, 6], [58, 6], [70, 20], [71, 28]],
  [[58, -6], [50, -5], [51, 1], [58, -3], [58, -6]],
  // Africa
  [[37, 10], [32, 32], [22, 37], [12, 51], [2, 45], [-12, 40], [-26, 33], [-34, 20], [-34, 18], [-18, 12], [-5, 12], [4, 7], [5, -2], [14, -17], [28, -13], [36, -6], [37, 10]],
  // Asia
  [[77, 105], [72, 140], [65, 178], [55, 162], [43, 145], [38, 120], [22, 114], [10, 104], [13, 80], [25, 68], [25, 57], [15, 44], [30, 34], [40, 27], [55, 38], [60, 60], [70, 75], [77, 105]],
  // Australia
  [[-11, 142], [-16, 146], [-28, 153], [-37, 150], [-39, 144], [-35, 117], [-22, 114], [-14, 129], [-11, 142]]
]

// Night-side major city light coordinate clusters [lat, lon, intensity]
const CITY_LIGHTS: [number, number, number][] = [
  [40.7, -74.0, 1.0], [34.0, -118.2, 0.9], [41.8, -87.6, 0.8], [29.7, -95.3, 0.7],
  [51.5, -0.1, 1.0], [48.8, 2.3, 0.9], [52.5, 13.4, 0.8], [41.9, 12.5, 0.7],
  [35.6, 139.6, 1.0], [31.2, 121.4, 0.9], [22.3, 114.1, 0.8], [37.5, 126.9, 0.8],
  [19.0, 72.8, 0.8], [28.6, 77.2, 0.8], [-23.5, -46.6, 0.8], [-34.6, -58.3, 0.7],
  [-33.8, 151.2, 0.8], [1.3, 103.8, 0.8], [25.2, 55.2, 0.8], [55.7, 37.6, 0.8]
]

export default function MissionVisualizerPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.64) // ISS nominal inclination
  const [targetType, setTargetType] = useState<"ISS Rendezvous" | "Orbital Debris" | "Cape Canaveral SLC-40">("ISS Rendezvous")
  const [pointingMode, setPointingMode] = useState<"Nadir Pointing" | "Target Track" | "Sun Pointing">("Target Track")
  const [showGraticule, setShowGraticule] = useState<boolean>(true)
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(true)
  const [simSpeed, setSimSpeed] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [zoomFactor, setZoomFactor] = useState<number>(1.1)

  // 3D Orbit Camera Angles
  const [camYaw, setCamYaw] = useState<number>(0.95)
  const [camPitch, setCamPitch] = useState<number>(0.38)
  const isDraggingRef = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Simulation time angles
  const satAngleRef = useRef<number>(0.2)
  const targetAngleRef = useRef<number>(0.75)
  const earthSpinRef = useRef<number>(0)
  const debrisTumbleRef = useRef<number>(0)

  // Flight Dynamics Telemetry
  const telemetry = useMemo(() => {
    const rEarthKm = 6378.137
    const mu = 398600.4418
    const rSat = rEarthKm + altitudeKm
    const vSat = Math.sqrt(mu / rSat)
    const periodMin = (2 * Math.PI * Math.sqrt(Math.pow(rSat, 3) / mu)) / 60

    const targetAlt = targetType === "ISS Rendezvous" ? 420 : targetType === "Orbital Debris" ? 640 : 0
    const rTgt = rEarthKm + targetAlt
    const vTgt = targetType === "Cape Canaveral SLC-40" ? 0.465 : Math.sqrt(mu / rTgt)

    // Range vector calculation
    const dTheta = Math.abs(satAngleRef.current - targetAngleRef.current)
    const rangeKm = Math.round(
      Math.sqrt(Math.pow(rSat, 2) + Math.pow(rTgt, 2) - 2 * rSat * rTgt * Math.cos(dTheta))
    )
    const rangeRateKmS = ((vSat - vTgt * Math.cos(dTheta)) * Math.sin(dTheta)).toFixed(2)

    return {
      vSat: vSat.toFixed(2),
      periodMin: periodMin.toFixed(1),
      rangeKm,
      rangeRateKmS,
      trueAnomalyDeg: Math.round(((satAngleRef.current * 180) / Math.PI) % 360)
    }
  }, [altitudeKm, targetType])

  useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 1000
      canvas.height = Math.min(720, window.innerHeight * 0.75)
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    // Realistic Starfield with magnitude distribution
    const stars: { x: number; y: number; r: number; b: number; pulse: number }[] = []
    for (let i = 0; i < 160; i++) {
      stars.push({
        x: Math.sin(i * 13.7) * 0.5 + 0.5,
        y: Math.cos(i * 41.3) * 0.5 + 0.5,
        r: (i % 5 === 0) ? 1.6 : (i % 2 === 0) ? 1.0 : 0.6,
        b: 0.3 + (i % 7) * 0.1,
        pulse: (i % 3) * 0.05
      })
    }

    const render = () => {
      if (isPlaying) {
        satAngleRef.current += 0.011 * simSpeed
        targetAngleRef.current += 0.0095 * simSpeed
        earthSpinRef.current += 0.0012 * simSpeed
        debrisTumbleRef.current += 0.035 * simSpeed
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const rBase = Math.min(canvas.width, canvas.height) * 0.29 * zoomFactor

      // 3D Matrix Projection Transform
      const project = (x: number, y: number, z: number) => {
        // Yaw (Y rotation)
        const x1 = x * Math.cos(camYaw) - z * Math.sin(camYaw)
        const z1 = x * Math.sin(camYaw) + z * Math.cos(camYaw)
        // Pitch (X rotation)
        const y2 = y * Math.cos(camPitch) - z1 * Math.sin(camPitch)
        const z2 = y * Math.sin(camPitch) + z1 * Math.cos(camPitch)

        const fov = 900
        const pz = fov / (fov + z2 * rBase)
        return {
          px: cx + x1 * rBase * pz,
          py: cy + y2 * rBase * pz,
          depth: z2,
          scale: pz
        }
      }

      // 1. Deep Space Starfield Background
      ctx.fillStyle = "#01040f"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        ctx.fillStyle = `rgba(224, 242, 254, ${s.b})`
        ctx.fillRect(s.x * canvas.width, s.y * canvas.height, s.r, s.r)
      })

      // 2. Solar Vector Light Source (Fixed Sun Vector in ECI)
      const sunV = { x: -0.707, y: -0.4, z: -0.58 }
      const sunP = project(sunV.x * 2.6, sunV.y * 2.6, sunV.z * 2.6)
      ctx.strokeStyle = "rgba(251, 191, 36, 0.45)"
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.moveTo(sunP.px, sunP.py)
      ctx.lineTo(cx, cy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "#fbbf24"
      ctx.font = "10px monospace"
      ctx.fillText("☀️ SOLAR RADIATION VECTOR (1361 W/m²)", sunP.px - 60, sunP.py - 12)

      // 3. Occluded Far-Side Orbit Trajectories (Drawn BEHIND the Earth)
      const rOrb = (6378.137 + altitudeKm) / 6378.137
      const incRad = (inclinationDeg * Math.PI) / 180
      const tgtAlt = targetType === "ISS Rendezvous" ? 420 : targetType === "Orbital Debris" ? 640 : 0
      const rTgtOrb = (6378.137 + tgtAlt) / 6378.137
      const tgtIncRad = targetType === "ISS Rendezvous" ? incRad : incRad * 0.85

      // Helper to draw orbit track in 2 passes (back-half dim, front-half bright)
      const drawOrbitSegments = (rRadius: number, inclination: number, isFarSide: boolean, strokeColor: string) => {
        ctx.beginPath()
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = isFarSide ? 1.0 : 1.8
        let started = false

        for (let theta = 0; theta <= Math.PI * 2 + 0.05; theta += 0.04) {
          const ox = Math.cos(theta) * rRadius
          const oy = Math.sin(theta) * rRadius * Math.sin(inclination)
          const oz = Math.sin(theta) * rRadius * Math.cos(inclination)
          const pt = project(ox, oy, oz)

          const inBack = pt.depth < 0
          if (inBack === isFarSide) {
            if (!started) {
              ctx.moveTo(pt.px, pt.py)
              started = true
            } else {
              ctx.lineTo(pt.px, pt.py)
            }
          } else {
            started = false
          }
        }
        ctx.stroke()
      }

      // Draw far-side orbits
      drawOrbitSegments(rOrb, incRad, true, "rgba(6, 182, 212, 0.15)")
      if (targetType !== "Cape Canaveral SLC-40") {
        drawOrbitSegments(rTgtOrb, tgtIncRad, true, targetType === "Orbital Debris" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)")
      }

      // 4. Volumetric Atmospheric Limb Haze (Rayleigh Gradient)
      const rEarth = 1.0
      if (showAtmosphere) {
        const atmoGrad = ctx.createRadialGradient(cx, cy, rEarth * rBase * 0.96, cx, cy, rEarth * rBase * 1.28)
        atmoGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)")
        atmoGrad.addColorStop(0.25, "rgba(14, 165, 233, 0.22)")
        atmoGrad.addColorStop(0.65, "rgba(2, 132, 199, 0.06)")
        atmoGrad.addColorStop(1, "rgba(1, 4, 15, 0)")
        ctx.fillStyle = atmoGrad
        ctx.beginPath()
        ctx.arc(cx, cy, rEarth * rBase * 1.28, 0, Math.PI * 2)
        ctx.fill()
      }

      // 5. Earth Sphere Body & Geography
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * rBase, 0, Math.PI * 2)
      ctx.clip()

      // Ocean Base Lighting
      const oceanGrad = ctx.createRadialGradient(
        cx - rBase * 0.42, cy - rBase * 0.42, 25,
        cx, cy, rEarth * rBase
      )
      oceanGrad.addColorStop(0, "#2563eb")
      oceanGrad.addColorStop(0.35, "#1d4ed8")
      oceanGrad.addColorStop(0.75, "#0f172a")
      oceanGrad.addColorStop(1, "#020617")
      ctx.fillStyle = oceanGrad
      ctx.fillRect(cx - rBase, cy - rBase, rBase * 2, rBase * 2)

      // Latitude/Longitude Graticule Lines
      if (showGraticule) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.12)"
        ctx.lineWidth = 0.8
        // Parallels (-60 to +60 in 30 deg steps)
        for (let lat = -60; lat <= 60; lat += 30) {
          ctx.beginPath()
          const latR = (lat * Math.PI) / 180
          const rLat = Math.cos(latR)
          const yLat = Math.sin(latR)
          for (let lon = 0; lon <= 360; lon += 5) {
            const lonR = ((lon + (earthSpinRef.current * 180) / Math.PI) * Math.PI) / 180
            const pt = project(Math.cos(lonR) * rLat, yLat, Math.sin(lonR) * rLat)
            if (pt.depth > -0.15) {
              if (lon === 0) ctx.moveTo(pt.px, pt.py)
              else ctx.lineTo(pt.px, pt.py)
            }
          }
          ctx.stroke()
        }
      }

      // Detailed Vector Landmasses
      CONTINENTS.forEach(poly => {
        ctx.beginPath()
        let started = false
        poly.forEach(([lat, lon]) => {
          const latR = (lat * Math.PI) / 180
          const lonR = ((lon + (earthSpinRef.current * 180) / Math.PI) * Math.PI) / 180
          const ex = Math.cos(latR) * Math.cos(lonR)
          const ey = Math.sin(latR)
          const ez = Math.cos(latR) * Math.sin(lonR)
          const pt = project(ex, ey, ez)

          if (pt.depth > -0.15) {
            if (!started) {
              ctx.moveTo(pt.px, pt.py)
              started = true
            } else {
              ctx.lineTo(pt.px, pt.py)
            }
          }
        })
        ctx.closePath()
        ctx.fillStyle = "rgba(34, 197, 94, 0.38)"
        ctx.fill()
        ctx.strokeStyle = "rgba(74, 222, 128, 0.65)"
        ctx.lineWidth = 1.0
        ctx.stroke()
      })

      // Night-Side City Lights (Yellow/Amber Glow on Dark Hemisphere)
      CITY_LIGHTS.forEach(([lat, lon, intensity]) => {
        const latR = (lat * Math.PI) / 180
        const lonR = ((lon + (earthSpinRef.current * 180) / Math.PI) * Math.PI) / 180
        const ex = Math.cos(latR) * Math.cos(lonR)
        const ey = Math.sin(latR)
        const ez = Math.cos(latR) * Math.sin(lonR)
        const pt = project(ex, ey, ez)

        // Only illuminate on night side (sun dot product < 0) and facing camera
        const sunDot = ex * sunV.x + ey * sunV.y + ez * sunV.z
        if (pt.depth > 0 && sunDot < 0.2) {
          const alpha = Math.min(1.0, (0.2 - sunDot) * 1.5) * intensity
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`
          ctx.beginPath()
          ctx.arc(pt.px, pt.py, 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Day/Night Terminator Shadow Gradient
      const termGrad = ctx.createLinearGradient(
        cx - rBase * 0.7, cy - rBase * 0.7,
        cx + rBase * 0.7, cy + rBase * 0.7
      )
      termGrad.addColorStop(0, "rgba(0, 0, 0, 0)")
      termGrad.addColorStop(0.48, "rgba(2, 6, 23, 0.32)")
      termGrad.addColorStop(1, "rgba(1, 4, 15, 0.95)")
      ctx.fillStyle = termGrad
      ctx.fillRect(cx - rBase, cy - rBase, rBase * 2, rBase * 2)

      ctx.restore()

      // Atmospheric Rim Crisp Highlight
      ctx.beginPath()
      ctx.arc(cx, cy, rEarth * rBase, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.75)"
      ctx.lineWidth = 1.8
      ctx.stroke()

      // 6. Near-Side Orbit Trajectories (Foreground Glow)
      drawOrbitSegments(rOrb, incRad, false, "rgba(6, 182, 212, 0.75)")
      if (targetType !== "Cape Canaveral SLC-40") {
        drawOrbitSegments(rTgtOrb, tgtIncRad, false, targetType === "Orbital Debris" ? "rgba(239, 68, 68, 0.75)" : "rgba(16, 185, 129, 0.75)")
      }

      // 7. Calculate 3D Ephemeris Positions
      // Primary Spacecraft
      const satTh = satAngleRef.current
      const satX = Math.cos(satTh) * rOrb
      const satY = Math.sin(satTh) * rOrb * Math.sin(incRad)
      const satZ = Math.sin(satTh) * rOrb * Math.cos(incRad)
      const satPt = project(satX, satY, satZ)

      // Target Object Position
      let tgtX = 0, tgtY = 0, tgtZ = 0
      if (targetType === "Cape Canaveral SLC-40") {
        const capeLatR = (28.5 * Math.PI) / 180
        const capeLonR = ((-80.5 + (earthSpinRef.current * 180) / Math.PI) * Math.PI) / 180
        tgtX = Math.cos(capeLatR) * Math.cos(capeLonR)
        tgtY = Math.sin(capeLatR)
        tgtZ = Math.cos(capeLatR) * Math.sin(capeLonR)
      } else {
        const tgtTh = targetAngleRef.current
        tgtX = Math.cos(tgtTh) * rTgtOrb
        tgtY = Math.sin(tgtTh) * rTgtOrb * Math.sin(tgtIncRad)
        tgtZ = Math.sin(tgtTh) * rTgtOrb * Math.cos(tgtIncRad)
      }
      const tgtPt = project(tgtX, tgtY, tgtZ)

      // 8. Intercept Laser Ranging & Targeting Vector
      ctx.beginPath()
      ctx.strokeStyle = targetType === "Orbital Debris" ? "rgba(239, 68, 68, 0.85)" : "rgba(34, 197, 94, 0.85)"
      ctx.lineWidth = 1.6
      ctx.setLineDash([3, 3])
      ctx.moveTo(satPt.px, satPt.py)
      ctx.lineTo(tgtPt.px, tgtPt.py)
      ctx.stroke()
      ctx.setLineDash([])

      // Clean Non-Overlapping Intercept Ranging Tag
      const midPx = (satPt.px + tgtPt.px) / 2
      const midPy = (satPt.py + tgtPt.py) / 2
      ctx.fillStyle = targetType === "Orbital Debris" ? "#ef4444" : "#22c55e"
      ctx.font = "10px monospace"
      ctx.fillText(`RANGE: ${telemetry.rangeKm} km [${telemetry.rangeRateKmS} km/s]`, midPx + 12, midPy - 8)

      // 9. True-to-Life Render: TARGET OBJECT
      ctx.save()
      ctx.translate(tgtPt.px, tgtPt.py)

      if (targetType === "ISS Rendezvous") {
        // High-Fidelity 3D International Space Station (ISS) Model
        const issScale = 1.0 * zoomFactor

        // Main Integrated Truss Structure (Transverse silver girder)
        ctx.strokeStyle = "#94a3b8"
        ctx.lineWidth = 2.5 * issScale
        ctx.beginPath()
        ctx.moveTo(-32 * issScale, 0)
        ctx.lineTo(32 * issScale, 0)
        ctx.stroke()

        // 8 Massive Solar Array Wings (Photovoltaic Gold-Copper matrix)
        const drawIssWing = (wx: number, wy: number) => {
          ctx.fillStyle = "#b45309"
          ctx.strokeStyle = "#f59e0b"
          ctx.lineWidth = 0.8
          ctx.fillRect(wx, wy, 8 * issScale, 18 * issScale)
          ctx.strokeRect(wx, wy, 8 * issScale, 18 * issScale)
          // Cell line grid
          ctx.beginPath()
          ctx.strokeStyle = "rgba(251, 191, 36, 0.4)"
          ctx.moveTo(wx, wy + 6 * issScale)
          ctx.lineTo(wx + 8 * issScale, wy + 6 * issScale)
          ctx.moveTo(wx, wy + 12 * issScale)
          ctx.lineTo(wx + 8 * issScale, wy + 12 * issScale)
          ctx.stroke()
        }

        // Port & Starboard solar array pairs
        drawIssWing(-32 * issScale, -22 * issScale)
        drawIssWing(-32 * issScale, 4 * issScale)
        drawIssWing(-20 * issScale, -22 * issScale)
        drawIssWing(-20 * issScale, 4 * issScale)

        drawIssWing(12 * issScale, -22 * issScale)
        drawIssWing(12 * issScale, 4 * issScale)
        drawIssWing(24 * issScale, -22 * issScale)
        drawIssWing(24 * issScale, 4 * issScale)

        // Pressurized Module Cluster (Destiny, Unity, Zarya, Zvezda cylinders)
        ctx.fillStyle = "#e2e8f0"
        ctx.fillRect(-5 * issScale, -10 * issScale, 10 * issScale, 20 * issScale)
        ctx.strokeStyle = "#64748b"
        ctx.lineWidth = 1.2
        ctx.strokeRect(-5 * issScale, -10 * issScale, 10 * issScale, 20 * issScale)

        // Thermal Radiator Panels (White rectangular heat rejection)
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(-12 * issScale, -8 * issScale, 6 * issScale, 16 * issScale)
        ctx.fillRect(6 * issScale, -8 * issScale, 6 * issScale, 16 * issScale)

      } else if (targetType === "Orbital Debris") {
        // Tumbling Multi-Faceted Debris Shrapnel
        ctx.rotate(debrisTumbleRef.current)
        ctx.fillStyle = "#ef4444"
        ctx.strokeStyle = "#f87171"
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(-7 * zoomFactor, -5 * zoomFactor)
        ctx.lineTo(6 * zoomFactor, -8 * zoomFactor)
        ctx.lineTo(8 * zoomFactor, 3 * zoomFactor)
        ctx.lineTo(1 * zoomFactor, 7 * zoomFactor)
        ctx.lineTo(-6 * zoomFactor, 4 * zoomFactor)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

      } else {
        // Ground Spaceport Launchpad Target (SLC-40)
        ctx.fillStyle = "#f97316"
        ctx.beginPath()
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#fdba74"
        ctx.strokeRect(-6, -6, 12, 12)
      }
      ctx.restore()

      // Target Label
      ctx.fillStyle = targetType === "Orbital Debris" ? "#ef4444" : "#38bdf8"
      ctx.font = "10px monospace"
      ctx.fillText(`TARGET: ${targetType}`, tgtPt.px + 24, tgtPt.py + 4)

      // 10. True-to-Life Render: VEROYX-SAT-1 SPACECRAFT
      ctx.save()
      ctx.translate(satPt.px, satPt.py)
      const satScale = 1.1 * zoomFactor

      // Dual Gallium-Arsenide Solar Array Wings
      const drawSatWing = (wx: number) => {
        ctx.fillStyle = "#0284c7"
        ctx.strokeStyle = "#38bdf8"
        ctx.lineWidth = 1.2
        ctx.fillRect(wx, -6 * satScale, 24 * satScale, 12 * satScale)
        ctx.strokeRect(wx, -6 * satScale, 24 * satScale, 12 * satScale)
        // Sub-panel divide lines
        ctx.beginPath()
        ctx.strokeStyle = "rgba(56, 189, 248, 0.5)"
        ctx.moveTo(wx + 8 * satScale, -6 * satScale)
        ctx.lineTo(wx + 8 * satScale, 6 * satScale)
        ctx.moveTo(wx + 16 * satScale, -6 * satScale)
        ctx.lineTo(wx + 16 * satScale, 6 * satScale)
        ctx.stroke()
      }
      // Port & Starboard wings
      drawSatWing(-34 * satScale)
      drawSatWing(10 * satScale)

      // Gold MLI-Wrapped Main Satellite Bus Core
      ctx.fillStyle = "#fbbf24"
      ctx.strokeStyle = "#d97706"
      ctx.lineWidth = 1.5
      ctx.fillRect(-10 * satScale, -10 * satScale, 20 * satScale, 20 * satScale)
      ctx.strokeRect(-10 * satScale, -10 * satScale, 20 * satScale, 20 * satScale)

      // Parabolic High-Gain Antenna (HGA) Reflector Dish
      ctx.beginPath()
      ctx.strokeStyle = "#e2e8f0"
      ctx.lineWidth = 2.0
      ctx.arc(0, -12 * satScale, 8 * satScale, Math.PI * 0.9, Math.PI * 2.1)
      ctx.stroke()
      // Feed horn
      ctx.beginPath()
      ctx.strokeStyle = "#94a3b8"
      ctx.lineWidth = 1.2
      ctx.moveTo(0, -12 * satScale)
      ctx.lineTo(0, -16 * satScale)
      ctx.stroke()

      // Nadir Optical Sensor Barrel (Pointing downward to Earth)
      ctx.fillStyle = "#06b6d4"
      ctx.beginPath()
      ctx.arc(0, 8 * satScale, 4 * satScale, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#22d3ee"
      ctx.stroke()

      ctx.restore()

      // Primary Spacecraft Label Tag (Offset cleanly to avoid overlap)
      ctx.fillStyle = "#38bdf8"
      ctx.font = "11px monospace"
      ctx.fillText(`VEROYX-SAT-1 (${altitudeKm}km)`, satPt.px + 28, satPt.py - 16)

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
    }
  }, [altitudeKm, inclinationDeg, targetType, pointingMode, showGraticule, showAtmosphere, simSpeed, isPlaying, zoomFactor, camYaw, camPitch, telemetry])

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
              NASA-Grade Orbital Ephemeris &amp; Vehicle Intercept Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              3D MISSION &amp; TARGET VISUALIZER
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              High-fidelity 3D Earth globe rendering depth-occluded Keplerian orbits, photorealistic ISS structure with photovoltaic wings, gold-MLI satellite with HGA dish, night-side city lights, and real-time rangefinder vectors.
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
              onClick={() => { setCamYaw(0.95); setCamPitch(0.38); setZoomFactor(1.1) }}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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

          {/* NASA Flight Telemetry HUD */}
          <div className="absolute top-4 left-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-[11px] backdrop-blur-md space-y-1.5 shadow-xl">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Activity className="w-3.5 h-3.5" /> FLIGHT EPHEMERIS TELEMETRY
            </div>
            <div className="text-slate-300">Spacecraft Altitude: <strong className="text-white">{altitudeKm} km</strong></div>
            <div className="text-slate-300">Orbital Velocity: <strong className="text-white">{telemetry.vSat} km/s</strong></div>
            <div className="text-slate-300">Orbit Period: <strong className="text-white">{telemetry.periodMin} min</strong></div>
            <div className="text-slate-300">True Anomaly (&nu;): <strong className="text-white">{telemetry.trueAnomalyDeg}&deg;</strong></div>
            <div className="text-slate-300 border-t border-slate-800 pt-1.5">
              Tracked Target: <strong className="text-cyan-400">{targetType}</strong>
            </div>
            <div className="text-slate-300">
              Inter-Vehicle Range (&rho;): <strong className={targetType === "Orbital Debris" ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{telemetry.rangeKm} km</strong>
            </div>
            <div className="text-slate-300">
              Range Rate (&rho;&#775;): <strong className="text-white">{telemetry.rangeRateKmS} km/s</strong>
            </div>
            <div className="text-slate-500 text-[9px] pt-1 border-t border-slate-800">
              Drag mouse to orbit camera &middot; Real-time depth sorted
            </div>
          </div>

          {/* Zoom Overlay Pill */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-950/85 border border-slate-800 rounded-lg p-1 backdrop-blur-md">
            <button
              onClick={() => setZoomFactor(prev => Math.min(2.5, prev + 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={() => setZoomFactor(prev => Math.max(0.6, prev - 0.15))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-cyan-400" />
            </button>
          </div>

          {/* Bottom Interactive HUD Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">TARGET OBJECT:</span>
              {(["ISS Rendezvous", "Orbital Debris", "Cape Canaveral SLC-40"] as const).map(tgt => (
                <button
                  key={tgt}
                  onClick={() => setTargetType(tgt)}
                  className={`px-3 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                    targetType === tgt
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/40"
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
                  checked={showGraticule}
                  onChange={e => setShowGraticule(e.target.checked)}
                  className="accent-cyan-400 cursor-pointer"
                />
                Graticule Grid
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showAtmosphere}
                  onChange={e => setShowAtmosphere(e.target.checked)}
                  className="accent-cyan-400 cursor-pointer"
                />
                Rayleigh Haze
              </label>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="text-slate-400 text-[10px]">TIME WARP</span>
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

        {/* Orbit Tuning Configuration Desk */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
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
              <span>420 km (ISS Co-Orbit)</span>
              <span>1200 km</span>
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
              step={0.5}
              value={inclinationDeg}
              onChange={e => setInclinationDeg(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>28.5&deg; (Cape)</span>
              <span>51.64&deg; (ISS Orbit)</span>
              <span>98&deg; (Sun-Sync)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" /> Correlated Flight Engines
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
              <Link href="/pass-schedule" className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300">
                /pass-schedule
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
