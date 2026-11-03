"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, ShieldCheck, Zap, ArrowRight, Terminal, 
  Lock, Database, Cpu, Unlock, ShieldAlert, Fingerprint, 
  Crosshair, Activity, Radio, BarChart3, ChevronRight, Sliders,
  Compass, Eye
} from "lucide-react"
import { 
  createCinematicEarth, createDeepSpaceStarfield, 
  createHyperspaceTunnel 
} from "@/components/three/CinematicSpaceEngine"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isWarping, setIsWarping] = useState<boolean>(false)

  // Ephemeris Clock & Telemetry
  const [simSeconds, setSimSeconds] = useState<number>(13150)
  const [showGravityField, setShowGravityField] = useState<boolean>(true)
  const [showLaserMesh, setShowLaserMesh] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Execute Star Wars Hyperspace Jump
  const handleInitiateWarp = () => {
    setIsWarping(true)
    setTimeout(() => {
      setIsWarping(false)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("veroyx_clearance_active", "true")
      }
    }, 1600)
  }

  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  // 1. 3D WEBGL EARTH THEATER & CONSTELLATION MESH
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020409")

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 2000)
    camera.position.set(0, 3.5, 21)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep-Space Background Starfield
    const starfield = createDeepSpaceStarfield(1800, 800)
    scene.add(starfield)

    // Directional Solar Illumination (Matches sunlight in Video 1)
    const sunLight = new THREE.DirectionalLight(0xfffaee, 4.2)
    sunLight.position.set(-26, 14, 16)
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x0a1128, 1.5))

    // NASA Blue Marble Earth
    const earthRadius = 5.6
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // Atmospheric Rayleigh Limb Glow Ring
    const atmoGlowGeo = new THREE.RingGeometry(earthRadius * 1.002, earthRadius * 1.085, 96)
    const atmoGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    })
    const atmoGlow = new THREE.Mesh(atmoGlowGeo, atmoGlowMat)
    atmoGlow.lookAt(camera.position)
    scene.add(atmoGlow)

    // =========================================================================
    // 2. EARTH GRAVITY POTENTIAL POINTS & MASCON FIELD (J2 Geoid Harmonics)
    // =========================================================================
    const gravityGroup = new THREE.Group()
    const numGravPoints = 240
    const gravGeo = new THREE.BufferGeometry()
    const gravPositions = new Float32Array(numGravPoints * 3)
    const gravColors = new Float32Array(numGravPoints * 3)

    for (let i = 0; i < numGravPoints; i++) {
      const lat = (Math.random() - 0.5) * Math.PI
      const lon = Math.random() * Math.PI * 2
      
      // J2 Gravitational harmonic perturbation factor:
      // g_eff increases near poles, decreases at equator
      const j2Factor = 1.0 + 0.00108263 * (1.5 * Math.sin(lat) * Math.sin(lat) - 0.5)
      const r = earthRadius * 1.045 * j2Factor

      const x = r * Math.cos(lat) * Math.cos(lon)
      const y = r * Math.sin(lat)
      const z = r * Math.cos(lat) * Math.sin(lon)

      gravPositions[i * 3 + 0] = x
      gravPositions[i * 3 + 1] = y
      gravPositions[i * 3 + 2] = z

      // Color code by gravitational deviation (Cyan = Nominal, Emerald = Mascon High, Indigo = Geoid Low)
      if (Math.abs(lat) > 0.8) {
        gravColors[i * 3 + 0] = 0.1; gravColors[i * 3 + 1] = 0.9; gravColors[i * 3 + 2] = 0.5 // High gravity at poles
      } else if (Math.random() > 0.85) {
        gravColors[i * 3 + 0] = 0.95; gravColors[i * 3 + 1] = 0.7; gravColors[i * 3 + 2] = 0.1 // Local Mascon anomaly
      } else {
        gravColors[i * 3 + 0] = 0.2; gravColors[i * 3 + 1] = 0.6; gravColors[i * 3 + 2] = 1.0 // Nominal geoid
      }
    }

    gravGeo.setAttribute("position", new THREE.BufferAttribute(gravPositions, 3))
    gravGeo.setAttribute("color", new THREE.BufferAttribute(gravColors, 3))
    const gravPointsMesh = new THREE.Points(
      gravGeo,
      new THREE.PointsMaterial({
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      })
    )
    gravityGroup.add(gravPointsMesh)
    earthGroup.add(gravityGroup)

    // =========================================================================
    // 3. MULTI-PLANE CONSTELLATION & DYNAMIC LASER CROSSLINKS (OISL)
    // =========================================================================
    const ringConfigs = [
      { r: earthRadius * 1.34, inc: 51.6, color: 0x10b981 }, // Green LEO Constellation
      { r: earthRadius * 1.46, inc: 97.4, color: 0x06b6d4 }, // Cyan SSO Polar Ring
      { r: earthRadius * 1.60, inc: 28.5, color: 0x3b82f6 }, // Blue Equatorial Shell
      { r: earthRadius * 1.72, inc: -45.0, color: 0x10b981 } // Counter-Inclined Green Shell
    ]

    const orbitRingsGroup = new THREE.Group()
    const satelliteNodes: { mesh: THREE.Mesh; r: number; inc: number; speed: number; angle: number }[] = []

    ringConfigs.forEach((cfg, idx) => {
      const pts: THREE.Vector3[] = []
      const segs = 96
      const incRad = (cfg.inc * Math.PI) / 180.0

      for (let i = 0; i <= segs; i++) {
        const theta = (i / segs) * Math.PI * 2
        const x = cfg.r * Math.cos(theta)
        const y = cfg.r * Math.sin(theta) * Math.sin(incRad)
        const z = cfg.r * Math.sin(theta) * Math.cos(incRad)
        pts.push(new THREE.Vector3(x, y, z))
      }

      const ringGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const ringMat = new THREE.LineBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.75,
        linewidth: 1.8
      })
      orbitRingsGroup.add(new THREE.Line(ringGeo, ringMat))

      // 2 Satellite Nodes per Orbital Ring
      for (let s = 0; s < 2; s++) {
        const nodeGeo = new THREE.SphereGeometry(0.18, 16, 16)
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat)
        orbitRingsGroup.add(nodeMesh)
        satelliteNodes.push({
          mesh: nodeMesh,
          r: cfg.r,
          inc: cfg.inc,
          speed: 0.32 + idx * 0.06,
          angle: (s * Math.PI) + idx * 0.6
        })
      }
    })
    scene.add(orbitRingsGroup)

    // Dynamic Inter-Satellite Laser Links (OISL)
    const laserMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      linewidth: 2.0
    })
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(),
      new THREE.Vector3(), new THREE.Vector3()
    ])
    const laserLines = new THREE.LineSegments(laserGeo, laserMat)
    scene.add(laserLines)

    // Star Wars Hyperspace Warp Lines
    const { warpLines, velocities } = createHyperspaceTunnel(1200)
    scene.add(warpLines)

    // Interactive Drag Controls
    let isDragging = false
    let prevX = 0, prevY = 0
    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      earthGroup.rotation.y += (e.clientX - prevX) * 0.005
      earthGroup.rotation.x += (e.clientY - prevY) * 0.005
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(10, Math.min(36, camera.position.z + e.deltaY * 0.02))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      // Star Wars Lightspeed Warp Jump State
      if (isWarping) {
        warpLines.material.opacity = Math.min(0.95, warpLines.material.opacity + delta * 3.0)
        camera.fov = Math.min(100.0, camera.fov + delta * 45.0)
        camera.updateProjectionMatrix()

        const pArr = warpLines.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < 1200; i++) {
          pArr[i * 6 + 2] += velocities[i] * delta * 2.8
          pArr[i * 6 + 5] += velocities[i] * delta * 2.8
          if (pArr[i * 6 + 2] > 30) {
            pArr[i * 6 + 2] = -80
            pArr[i * 6 + 5] = -83.5
          }
        }
        warpLines.geometry.attributes.position.needsUpdate = true
      } else {
        warpLines.material.opacity = Math.max(0.0, warpLines.material.opacity - delta * 3.0)
        if (camera.fov > 38.0) {
          camera.fov = Math.max(38.0, camera.fov - delta * 40.0)
          camera.updateProjectionMatrix()
        }
      }

      // Rotate Earth, Atmosphere, and Gravity Anomalies
      earthMesh.rotation.y += 0.035 * delta
      cloudsMesh.rotation.y += 0.055 * delta

      // Keep atmospheric limb facing camera
      atmoGlow.lookAt(camera.position)

      // Orbit satellite nodes along their true orbital inclinations
      const currentPositions: THREE.Vector3[] = []
      satelliteNodes.forEach(sat => {
        sat.angle += sat.speed * delta
        const incRad = (sat.inc * Math.PI) / 180.0
        const x = sat.r * Math.cos(sat.angle)
        const y = sat.r * Math.sin(sat.angle) * Math.sin(incRad)
        const z = sat.r * Math.sin(sat.angle) * Math.cos(incRad)
        sat.mesh.position.set(x, y, z)
        currentPositions.push(new THREE.Vector3(x, y, z))
      })

      // Update Laser Crosslinks between adjacent constellation nodes
      if (currentPositions.length >= 4) {
        const laserPts = [
          currentPositions[0], currentPositions[2],
          currentPositions[1], currentPositions[3],
          currentPositions[2], currentPositions[5],
          currentPositions[4], currentPositions[6]
        ]
        laserLines.geometry.setFromPoints(laserPts)
        laserLines.geometry.attributes.position.needsUpdate = true
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      container.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      container.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [isWarping])

  // 2. POLAR SGP4 RADAR RETICLE CANVAS (Matches Video 1 Right Panel 00:01)
  useEffect(() => {
    const canvas = radarCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let sweepAngle = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      sweepAngle += 0.03
      const w = canvas.width, h = canvas.height
      const cx = w / 2, cy = h / 2
      const rMax = Math.min(cx, cy) - 8

      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, w, h)

      // Range Rings (500 km, 1000 km, 2000 km)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.22)"
      ctx.lineWidth = 1
      for (let r = rMax * 0.33; r <= rMax; r += rMax * 0.33) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Compass Crosshairs & Azimuth Ticks
      ctx.strokeStyle = "rgba(148, 163, 184, 0.3)"
      ctx.beginPath()
      ctx.moveTo(cx, 4); ctx.lineTo(cx, h - 4)
      ctx.moveTo(4, cy); ctx.lineTo(w - 4, cy)
      ctx.stroke()

      // Rotating Phosphor Sweep Line
      const sweepX = cx + Math.cos(sweepAngle) * rMax
      const sweepY = cy + Math.sin(sweepAngle) * rMax
      ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(sweepX, sweepY)
      ctx.stroke()

      // Radar Target Blips
      const blips = [
        { r: rMax * 0.52, a: 1.15, id: "T-01" },
        { r: rMax * 0.75, a: 2.75, id: "T-02" },
        { r: rMax * 0.38, a: 4.45, id: "T-03" }
      ]
      blips.forEach(b => {
        const bx = cx + Math.cos(b.a) * b.r
        const by = cy + Math.sin(b.a) * b.r
        ctx.fillStyle = "#00f0ff"
        ctx.beginPath()
        ctx.arc(bx, by, 3, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    render()

    return () => cancelAnimationFrame(animId)
  }, [])

  // Timer Tick
  useEffect(() => {
    const interval = setInterval(() => {
      setSimSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatHMS = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600) % 24
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* 3D WebGL World Canvas */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

      {/* STATE 1: ZERO-TRUST WARP GATEWAY (Preserved Star Wars Entrance) */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20 select-none">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#020617]/90 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_0_70px_rgba(6,182,212,0.25)] space-y-6 font-mono text-xs pointer-events-auto">
            
            <div className="text-center space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                AUTHORIZED DEFENSE ENCLAVE. SGP4 ORBIT PROPAGATION &amp; JADC2 TELEMETRY INITIALIZED.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>CLEARANCE: TOP SECRET SI-TK</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">AUTH PIN: 8942-0129</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] text-cyan-300">
                <span className="font-bold">[ ZERO-KNOWLEDGE CRYPTOGRAPHIC TOKEN VERIFIED ]</span>
              </div>
            </div>

            <button
              onClick={handleInitiateWarp}
              disabled={isWarping}
              className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
            >
              {isWarping ? <Zap className="w-4 h-4 animate-spin text-cyan-200" /> : <Unlock className="w-4 h-4" />}
              <span>{isWarping ? "ENGAGING HYPERSPACE WARP JUMP..." : "ENTER OPERATIONAL PROPAGATOR"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: THE FLAGSHIP MISSION PROPAGATION THEATER (Matches Video 1 Exactly) */
        <div className="relative w-full min-h-screen z-10 pointer-events-none select-none">
          
          {/* Top Session Security Banner */}
          <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/30 px-6 py-2 flex items-center justify-between font-mono text-[11px] pointer-events-auto">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">VEROYX SPACE DOMAIN AWARENESS // TS-SCI</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">109 PRODUCTION MODULES DEPLOYED</span>
            </div>
            <button onClick={handleLockTerminal} className="px-2.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          {/* MAIN WORKSTATION HUD OVERLAY */}
          <div className="relative w-full min-h-screen pt-24 px-6 pb-12 flex justify-between items-start">
            
            {/* LEFT HUD PANEL: VEROYX MISSION PROPAGATION (Matches Video 1 Left 00:00) */}
            <div className="w-80 p-5 rounded-2xl bg-[#020617]/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl font-mono text-xs space-y-4 pointer-events-auto">
              
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black text-white tracking-widest uppercase">VEROYX</h1>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold">LIVE</span>
                </div>
                <div className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase mt-0.5">
                  MISSION PROPAGATION
                </div>
              </div>

              {/* Subsystem Summary */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800/60 pb-1 flex justify-between">
                  <span>SUBSYSTEM SUMMARY</span>
                  <span className="text-emerald-400 font-bold">98.4%</span>
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500">NORAD ID:</span><span className="text-white font-bold">48219</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">INCLINATION:</span><span className="text-cyan-300 font-bold">51.64°</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ALTITUDE:</span><span className="text-white font-bold">550.2 km</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ORBITAL VELOCITY:</span><span className="text-amber-400 font-bold">7.612 km/s</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">PERIOD:</span><span className="text-white">95.3 min</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">OISL CROSSLINK:</span><span className="text-emerald-400 font-bold">100 Gbps</span></div>
                </div>
              </div>

              {/* Power / Battery Telemetry Graph */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between">
                  <span>EPS BATTERY CAPACITY</span>
                  <span className="text-cyan-400 font-bold">99.2%</span>
                </div>
                <div className="h-10 w-full rounded bg-black/60 border border-slate-800 p-1 flex items-end gap-1">
                  {[45, 60, 75, 80, 85, 92, 99, 98, 99].map((val, idx) => (
                    <div key={idx} style={{ height: `${val}%` }} className="flex-1 rounded-sm bg-gradient-to-t from-cyan-600 to-emerald-400" />
                  ))}
                </div>
              </div>

              {/* Quick Navigation to Other Video Flagships */}
              <div className="pt-2 space-y-2">
                <Link href="/hypersonic" className="w-full py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all text-[10px] font-bold tracking-wider uppercase flex items-center justify-between px-3">
                  <span>AERO-ORBITAL SIMULATOR</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </Link>
                <Link href="/planetary-defense" className="w-full py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/60 text-slate-300 hover:text-white transition-all text-[10px] font-bold tracking-wider uppercase flex items-center justify-between px-3">
                  <span>KINETIC INTERCEPT MODEL</span>
                  <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                </Link>
              </div>

            </div>

            {/* RIGHT HUD PANEL: SGP4 PROPAGATOR & POLAR RADAR (Matches Video 1 Right 00:01) */}
            <div className="w-80 p-5 rounded-2xl bg-[#020617]/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl font-mono text-xs space-y-4 pointer-events-auto">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">PROPAGATION ENGINE</div>
                  <div className="text-xl font-black text-white tracking-widest">SGP4</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">EPOCH TIME</div>
                  <div className="text-sm font-bold text-cyan-400">{formatHMS(simSeconds)}</div>
                </div>
              </div>

              {/* Polar Radar Tracking Reticle Canvas */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between">
                  <span>POLAR RADAR TRACKING</span>
                  <span className="text-emerald-400 font-bold">SWEEP ACTIVE</span>
                </div>
                <canvas ref={radarCanvasRef} width={280} height={180} className="w-full h-40 rounded-xl border border-slate-800 bg-black" />
              </div>

              {/* Vicinity Metric Counters (Matches Video 1 00:01 Counters) */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">COVERAGE</div>
                  <div className="text-2xl font-black text-white tracking-wider">5697</div>
                  <div className="text-[9px] text-cyan-400 font-bold">GLOBAL NODES</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">SURVIVAL</div>
                  <div className="text-2xl font-black text-emerald-400 tracking-wider">538</div>
                  <div className="text-[9px] text-emerald-300 font-bold">CONSTELLATION</div>
                </div>
              </div>

            </div>

          </div>

          {/* BOTTOM CENTER 3D BRANDING EMBLEM (Matches Video 1 00:07 - 00:09) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
            <h2 className="text-5xl font-black tracking-[0.3em] text-white uppercase drop-shadow-[0_0_35px_rgba(6,182,212,0.85)]">
              VEROYX
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest mt-1">
              <span>Space Domain Awareness</span>
              <span>•</span>
              <span>Kinetic Intercept</span>
              <span>•</span>
              <span>Allied JADC2</span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
