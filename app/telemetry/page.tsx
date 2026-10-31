"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import * as THREE from "three"
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
  Maximize2,
  Navigation
} from "lucide-react"

const GROUND_STATIONS = [
  { name: "DSN Goldstone (CA)", lon: -116.88, lat: 35.42, freq: "X/Ka" },
  { name: "DSN Madrid (ES)", lon: -4.25, lat: 40.43, freq: "X/Ka" },
  { name: "DSN Canberra (AU)", lon: 148.98, lat: -35.40, freq: "X/Ka" },
  { name: "KSAT Svalbard (SG3)", lon: 15.40, lat: 78.23, freq: "S/X" },
  { name: "Wallops GS (VA)", lon: -75.46, lat: 37.94, freq: "S/X" }
]

export default function TelemetryPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  const [simTimeSec, setSimTimeSec] = useState<number>(0)
  const [powerHistory, setPowerHistory] = useState<number[]>(Array(30).fill(280))

  // Astrodynamics parameters
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

  // Instantaneous state vector
  const stateVector = useMemo(() => {
    const t = simTimeSec
    const u = (orbit.n * t) % (2 * Math.PI)
    const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

    // Orbital plane position
    const xOrb = orbit.a * Math.cos(u)
    const yOrb = orbit.a * Math.sin(u)

    // J2000 ECI Position (km)
    const xEci = xOrb * Math.cos(raan) - yOrb * Math.cos(orbit.incRad) * Math.sin(raan)
    const yEci = xOrb * Math.sin(raan) + yOrb * Math.cos(orbit.incRad) * Math.cos(raan)
    const zEci = yOrb * Math.sin(orbit.incRad)

    // ECI Velocity (km/s)
    const vx = -orbit.velocityKmS * Math.sin(u) * Math.cos(raan) - orbit.velocityKmS * Math.cos(u) * Math.cos(orbit.incRad) * Math.sin(raan)
    const vy = -orbit.velocityKmS * Math.sin(u) * Math.sin(raan) + orbit.velocityKmS * Math.cos(u) * Math.cos(orbit.incRad) * Math.cos(raan)
    const vz = orbit.velocityKmS * Math.cos(u) * Math.sin(orbit.incRad)

    // Sub-satellite Lat / Lon
    const earthSpinRad = t * 7.2921159e-5
    const latRad = Math.asin(zEci / orbit.a)
    let lonRad = (Math.atan2(yEci, xEci) - earthSpinRad) % (2 * Math.PI)
    if (lonRad > Math.PI) lonRad -= 2 * Math.PI
    if (lonRad < -Math.PI) lonRad += 2 * Math.PI

    // Eclipse detection: Earth cylindrical umbra shadow
    const isEclipse = xEci < 0 && Math.sqrt(yEci * yEci + zEci * zEci) < orbit.rEarthKm

    // Check ground station contact
    let lockedStation: string | null = null
    let minRangeKm = 9999
    for (const gs of GROUND_STATIONS) {
      const gsLatRad = (gs.lat * Math.PI) / 180
      const gsLonRad = (gs.lon * Math.PI) / 180
      const dLon = lonRad - gsLonRad
      const dLat = latRad - gsLatRad
      const aH = Math.sin(dLat / 2) ** 2 + Math.cos(latRad) * Math.cos(gsLatRad) * Math.sin(dLon / 2) ** 2
      const distKm = orbit.rEarthKm * 2 * Math.asin(Math.min(1, Math.sqrt(aH)))
      if (distKm <= 2200) {
        lockedStation = gs.name
        minRangeKm = Math.round(distKm)
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
      minRangeKm,
      u,
      raan,
      currentPowerW
    }
  }, [simTimeSec, orbit, mission])

  // Sparkline trend buffer
  useEffect(() => {
    setPowerHistory(prev => [...prev.slice(1), stateVector.currentPowerW])
  }, [stateVector.currentPowerW])

  // WebGL Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 4.5, 9.5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // 2. Stars
    const starGeo = new THREE.BufferGeometry()
    const starCount = 800
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80
      starPositions[i + 1] = (Math.random() - 0.5) * 80
      starPositions[i + 2] = (Math.random() - 0.5) * 80
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.08, transparent: true, opacity: 0.7 })
    const starField = new THREE.Points(starGeo, starMat)
    scene.add(starField)

    // 3. Lighting (Sunlight Vector)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2)
    sunLight.position.set(10, 2, 8)
    scene.add(sunLight)

    const ambientLight = new THREE.AmbientLight(0x0c1e38, 0.6)
    scene.add(ambientLight)

    // 4. Procedural High-Definition Earth Mesh with Canvas Texture
    const earthRadius = 2.4
    const textureCanvas = document.createElement("canvas")
    textureCanvas.width = 2048
    textureCanvas.height = 1024
    const tCtx = textureCanvas.getContext("2d")!

    // Base deep oceanic fill
    tCtx.fillStyle = "#071e3d"
    tCtx.fillRect(0, 0, 2048, 1024)

    // High-contrast topographic continents
    tCtx.fillStyle = "#0f3a40"
    tCtx.strokeStyle = "#22d3ee"
    tCtx.lineWidth = 1.5

    // Draw coordinate grid on map
    tCtx.strokeStyle = "rgba(14, 165, 233, 0.12)"
    for (let x = 0; x <= 2048; x += 128) {
      tCtx.beginPath(); tCtx.moveTo(x, 0); tCtx.lineTo(x, 1024); tCtx.stroke()
    }
    for (let y = 0; y <= 1024; y += 128) {
      tCtx.beginPath(); tCtx.moveTo(0, y); tCtx.lineTo(2048, y); tCtx.stroke()
    }

    // Continents
    const mapContinents = [
      // N. America
      [[150, 200], [350, 150], [500, 250], [450, 450], [380, 500], [280, 380], [150, 200]],
      // S. America
      [[420, 520], [520, 580], [500, 750], [400, 900], [360, 750], [420, 520]],
      // Eurasia
      [[650, 180], [900, 120], [1300, 150], [1500, 300], [1200, 500], [900, 450], [700, 350], [650, 180]],
      // Africa
      [[680, 380], [850, 400], [900, 580], [800, 750], [680, 600], [680, 380]],
      // Australia
      [[1350, 620], [1550, 650], [1500, 800], [1320, 780], [1350, 620]]
    ]

    tCtx.fillStyle = "rgba(16, 185, 129, 0.45)"
    tCtx.strokeStyle = "rgba(52, 211, 153, 0.8)"
    tCtx.lineWidth = 2
    mapContinents.forEach(poly => {
      tCtx.beginPath()
      poly.forEach(([px, py], idx) => {
        if (idx === 0) tCtx.moveTo(px, py)
        else tCtx.lineTo(px, py)
      })
      tCtx.closePath()
      tCtx.fill()
      tCtx.stroke()
    })

    const earthTexture = new THREE.CanvasTexture(textureCanvas)
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64)
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.65,
      metalness: 0.1
    })
    const earthMesh = new THREE.Mesh(earthGeo, earthMat)
    earthMesh.rotation.z = (23.44 * Math.PI) / 180 // Earth obliquity
    scene.add(earthMesh)

    // 5. Volumetric Atmospheric Rayleigh Glow Shell
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.035, 64, 64)
    const atmosMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          gl_FragColor = vec4(0.05, 0.75, 1.0, 1.0) * intensity * 1.6;
        }
      `
    })
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat)
    scene.add(atmosMesh)

    // 6. 3D Orbital Trajectory Ring
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(120)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, linewidth: 2 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // 7. Spacecraft Node
    const satGroup = new THREE.Group()
    
    // Core satellite sphere
    const satGeo = new THREE.SphereGeometry(0.065, 16, 16)
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const satMesh = new THREE.Mesh(satGeo, satMat)
    satGroup.add(satMesh)

    // Solar panels
    const panelGeo = new THREE.BoxGeometry(0.3, 0.015, 0.08)
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8 })
    const panelMesh = new THREE.Mesh(panelGeo, panelMat)
    satGroup.add(panelMesh)

    // Halo glow
    const haloGeo = new THREE.RingGeometry(0.09, 0.15, 32)
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    const haloMesh = new THREE.Mesh(haloGeo, haloMat)
    satGroup.add(haloMesh)

    scene.add(satGroup)

    // 8. Volumetric Nadir Line (Satellite -> Earth Surface)
    const nadirGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)])
    const nadirMat = new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.08, gapSize: 0.04, transparent: true, opacity: 0.9 })
    const nadirLine = new THREE.Line(nadirGeo, nadirMat)
    scene.add(nadirLine)

    // 9. Interactive Drag to Orbit Controls
    let isDragging = false
    let prevMouse = { x: 0, y: 0 }
    let yaw = 0.3
    let pitch = 0.35

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevMouse.x
      const dy = e.clientY - prevMouse.y
      prevMouse = { x: e.clientX, y: e.clientY }
      yaw += dx * 0.006
      pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.006))
    }
    const onMouseUp = () => { isDragging = false }

    const dom = renderer.domElement
    dom.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    // 10. Master Animation Loop
    let animId: number
    let clock = performance.now()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = (now - clock) / 1000
      clock = now

      if (isPlaying) {
        setSimTimeSec(prev => {
          const next = prev + dt * timeScale
          return next
        })
      }

      // Rotate camera around center based on mouse drag
      const camDist = 8.5
      camera.position.x = camDist * Math.sin(yaw) * Math.cos(pitch)
      camera.position.y = camDist * Math.sin(pitch)
      camera.position.z = camDist * Math.cos(yaw) * Math.cos(pitch)
      camera.lookAt(0, 0, 0)

      // Earth rotational spin (ECEF frame)
      earthMesh.rotation.y = simTimeSec * 0.015

      // Position spacecraft in 3D orbit
      const u = (orbit.n * simTimeSec) % (2 * Math.PI)
      const raan = (0 - orbit.dRaanDt * simTimeSec) % (2 * Math.PI)

      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)

      // Incline orbit
      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satGroup.position.set(xE, yE, zE)
      satGroup.lookAt(0, 0, 0)

      // Update nadir beam to sub-satellite surface
      const surfaceNorm = new THREE.Vector3(xE, yE, zE).normalize()
      const surfacePoint = surfaceNorm.clone().multiplyScalar(earthRadius)
      nadirLine.geometry.setFromPoints([satGroup.position, surfacePoint])
      nadirLine.computeLineDistances()

      renderer.render(scene, camera)
    }

    animate()

    // Handle Resize
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", onResize)
      dom.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      renderer.dispose()
    }
  }, [isPlaying, timeScale, orbit, simTimeSec])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 sm:px-8 font-sans selection:bg-cyan-500 selection:text-slate-950 select-none">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Master Console Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "20s" }} />
              NASA GSFC FDF &middot; WebGL Hardware 3D Ephemeris Kernel
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TELEMETRY
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-3xl leading-relaxed">
              Full 3D GPU-accelerated orthographic orbital dynamics deck. Interactive physical camera, volumetric atmospheric scattering, and J2000 state vectors.
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

          {/* CENTER: HARDWARE ACCELERATED 3D WEBGL GLOBE */}
          <div className="lg:col-span-6 relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl flex flex-col">
            
            {/* Top Canvas Status Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between font-mono text-xs pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider">
                  3D GPU ORBITAL SIMULATION
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">| RAYLEIGH SHADER</span>
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

            {/* Three.js Mounting Container */}
            <div
              ref={mountRef}
              className="w-full h-[540px] block cursor-grab active:cursor-grabbing"
              title="Click and drag to rotate camera in 3D space"
            />

            {/* Bottom Contact & Control Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/85 backdrop-blur-md border-t border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs gap-3 pointer-events-none">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">GROUND STATION LINK:</span>
                <span className={stateVector.lockedStation ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                  {stateVector.lockedStation ? `AOS: ${stateVector.lockedStation} (${stateVector.minRangeKm}km)` : "LOS (SEARCHING CARRIER)"}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                <span>DRAG TO ORBIT CAMERA IN 3D</span>
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
