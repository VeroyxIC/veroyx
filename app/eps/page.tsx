"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import * as THREE from "three"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  Battery, 
  BatteryCharging,
  BatteryWarning,
  Sun,
  Zap,
  Cpu,
  Power
} from "lucide-react"

export default function EpsPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)

  // Hardware Constants (Spacecraft Class dependent)
  const ARRAY_AREA_M2 = 4.2 // Total active cell area
  const CELL_EFFICIENCY = 0.295 // 29.5% GaInP/GaAs/Ge
  const SOLAR_CONSTANT_W_M2 = 1361 // Average at 1 AU
  const MAX_POWER_W = ARRAY_AREA_M2 * SOLAR_CONSTANT_W_M2 * CELL_EFFICIENCY
  const BATTERY_CAPACITY_WH = 1200 // 1.2 kWh Li-Ion bus
  const NOMINAL_LOAD_W = 450 // Baseline avionics + payload

  // Kinetic state for decoupled WebGL loop
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 1500, // Start slightly before eclipse
    cameraYaw: 0.8,
    cameraPitch: 0.3,
    targetCameraYaw: 0.8,
    targetCameraPitch: 0.3,
    cameraDistance: 3.2,
    targetCameraDistance: 3.2,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 },
    batteryEnergyWh: 1200 // Start fully charged
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 1500,
    incidenceAngleDeg: "0.0",
    solarFluxWm2: "1361",
    generatedPowerW: MAX_POWER_W.toFixed(1),
    busLoadW: NOMINAL_LOAD_W.toFixed(1),
    netPowerW: (MAX_POWER_W - NOMINAL_LOAD_W).toFixed(1),
    batterySocPct: "100.0",
    batteryDodPct: "0.0",
    eclipseState: "SUNLIT",
    timeToEclipseSec: "0"
  })

  const [socHistory, setSocHistory] = useState<number[]>(Array(40).fill(100))
  const [powerHistory, setPowerHistory] = useState<number[]>(Array(40).fill(MAX_POWER_W))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
  }, [isPlaying, timeScale])

  // Orbital Mechanics
  const orbit = useMemo(() => {
    const mu = 398600.4418
    const rEarthKm = 6378.137
    const a = rEarthKm + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3))
    const periodSec = (2 * Math.PI) / n
    return { a, incRad, n, periodSec, rEarthKm }
  }, [mission.altitudeKm, mission.inclinationDeg])

  // Master WebGL Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 1000)
    camera.position.set(0, 1.5, 3.2)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Space Environment
    const starCount = 2000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 100
      starPos[i + 1] = (Math.random() - 0.5) * 100
      starPos[i + 2] = (Math.random() - 0.5) * 100
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.1, transparent: true, opacity: 0.6 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Physical Sunlight
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.5)
    scene.add(sunLight) // Position updated dynamically in loop
    const ambientLight = new THREE.AmbientLight(0x061224, 0.2)
    scene.add(ambientLight)

    // Spacecraft Assembly
    const satGroup = new THREE.Group()

    // Chassis
    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.8 })
    )
    satGroup.add(busMesh)

    // Solar Arrays (Interactive Glow based on power generation)
    const wingMat = new THREE.MeshStandardMaterial({ 
      color: 0x0369a1, 
      roughness: 0.1, 
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5 // Modulated in loop
    })
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.4), wingMat)
    leftWing.position.set(0.9, 0, 0)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.4), wingMat)
    rightWing.position.set(-0.9, 0, 0)
    
    const sadmGroup = new THREE.Group()
    sadmGroup.add(leftWing)
    sadmGroup.add(rightWing)
    satGroup.add(sadmGroup)
    scene.add(satGroup)

    // Sun Vector Line
    const sunVecGeo = new THREE.BufferGeometry()
    sunVecGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0,0,0, 0,0,2]), 3))
    const sunVecMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 })
    const sunVecLine = new THREE.Line(sunVecGeo, sunVecMat)
    scene.add(sunVecLine)

    // Mouse Interaction
    const onMouseDown = (e: MouseEvent) => {
      simStateRef.current.isDragging = true
      simStateRef.current.prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!simStateRef.current.isDragging) return
      const dx = e.clientX - simStateRef.current.prevMouse.x
      const dy = e.clientY - simStateRef.current.prevMouse.y
      simStateRef.current.prevMouse = { x: e.clientX, y: e.clientY }
      simStateRef.current.dragVelocity = { x: dx, y: dy }
      simStateRef.current.targetCameraYaw += dx * 0.005
      simStateRef.current.targetCameraPitch = Math.max(-1.3, Math.min(1.3, simStateRef.current.targetCameraPitch + dy * 0.005))
    }
    const onMouseUp = () => { simStateRef.current.isDragging = false }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomDelta = e.deltaY * 0.003
      simStateRef.current.targetCameraDistance = Math.max(1.5, Math.min(8.0, simStateRef.current.targetCameraDistance + zoomDelta))
    }

    const dom = renderer.domElement
    dom.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    dom.addEventListener("wheel", onWheel, { passive: false })

    let animId: number
    let lastTime = performance.now()
    let lastUiSync = performance.now()

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      if (simStateRef.current.isPlaying) {
        simStateRef.current.simTimeSec += dt * simStateRef.current.timeScale
      }

      const t = simStateRef.current.simTimeSec

      // Simulate Orbit Physics & Eclipse Geometry
      // Assuming a simplified Beta angle of 0 for max eclipse duration
      const u = (orbit.n * t) % (2 * Math.PI) // True anomaly
      const xOrb = orbit.a * Math.cos(u)
      const zOrb = orbit.a * Math.sin(u)
      const rVec = new THREE.Vector3(xOrb, 0, zOrb)

      // Assume Sun is at fixed +X direction in this local orbital frame
      const sunLocalDir = new THREE.Vector3(1, 0, 0)
      
      // Eclipse Detection (Cylindrical shadow model)
      const projection = rVec.clone().projectOnVector(sunLocalDir)
      const perpDist = rVec.clone().sub(projection).length()
      const isBehindEarth = projection.dot(sunLocalDir) < 0
      
      let eclipseState = "SUNLIT"
      let eclipseFactor = 1.0 // 1.0 = full sun, 0.0 = full umbra

      if (isBehindEarth) {
        if (perpDist < orbit.rEarthKm) {
          eclipseState = "UMBRA (FULL ECLIPSE)"
          eclipseFactor = 0.0
        } else if (perpDist < orbit.rEarthKm + 100) {
          // Penumbra transition band (soft shadow)
          eclipseState = "PENUMBRA"
          eclipseFactor = (perpDist - orbit.rEarthKm) / 100
        }
      }

      // Update Lighting & Vectors
      sunLight.position.copy(sunLocalDir.clone().multiplyScalar(10))
      sunLight.intensity = 3.5 * eclipseFactor
      
      // Align Sun Vector Line indicator
      const linePositions = sunVecGeo.attributes.position as THREE.BufferAttribute
      linePositions.setXYZ(1, sunLocalDir.x * 2, sunLocalDir.y * 2, sunLocalDir.z * 2)
      linePositions.needsUpdate = true
      sunVecMat.opacity = 0.8 * eclipseFactor

      // Spacecraft Attitude (Nadir Pointing +X Forward, -Z Down)
      // For visual simplicity in this local frame, we keep the bus fixed 
      // and rotate the SADM to track the sun.
      const sunAngle = Math.atan2(sunLocalDir.z, sunLocalDir.x)
      
      // Add slight pointing error noise to demonstrate cosine loss
      const pointingError = Math.sin(t * 0.1) * 0.15 
      sadmGroup.rotation.y = -sunAngle + pointingError

      // Power Generation Calculation (P_gen = Area * Flux * Eff * cos(theta))
      const panelNormal = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0,0,1), sadmGroup.rotation.y) // Simplified panel normal
      // Actual incidence angle
      const incidenceRad = Math.abs(pointingError) 
      const incidenceDeg = (incidenceRad * 180) / Math.PI
      
      const generatedW = MAX_POWER_W * Math.cos(incidenceRad) * eclipseFactor
      const netPowerW = generatedW - NOMINAL_LOAD_W

      // Battery Kinetics Integration (Wh)
      // Energy = Power (W) * Time (h). dt is in seconds, so (dt/3600) hours.
      if (simStateRef.current.isPlaying) {
        const energyDeltaWh = netPowerW * (dt * simStateRef.current.timeScale / 3600)
        simStateRef.current.batteryEnergyWh = Math.max(0, Math.min(BATTERY_CAPACITY_WH, simStateRef.current.batteryEnergyWh + energyDeltaWh))
      }

      const socPct = (simStateRef.current.batteryEnergyWh / BATTERY_CAPACITY_WH) * 100
      const dodPct = 100 - socPct

      // Visual feedback: Solar panels dim when losing power
      wingMat.emissiveIntensity = 0.6 * (generatedW / MAX_POWER_W)

      // Camera Damping
      if (!simStateRef.current.isDragging) {
        simStateRef.current.targetCameraYaw += simStateRef.current.dragVelocity.x * 0.002
        simStateRef.current.targetCameraPitch += simStateRef.current.dragVelocity.y * 0.002
        simStateRef.current.dragVelocity.x *= 0.92
        simStateRef.current.dragVelocity.y *= 0.92
      }
      simStateRef.current.cameraYaw += (simStateRef.current.targetCameraYaw - simStateRef.current.cameraYaw) * 0.08
      simStateRef.current.cameraPitch += (simStateRef.current.targetCameraPitch - simStateRef.current.cameraPitch) * 0.08
      simStateRef.current.cameraDistance += (simStateRef.current.targetCameraDistance - simStateRef.current.cameraDistance) * 0.08

      const curDist = simStateRef.current.cameraDistance
      camera.position.x = curDist * Math.sin(simStateRef.current.cameraYaw) * Math.cos(simStateRef.current.cameraPitch)
      camera.position.y = curDist * Math.sin(simStateRef.current.cameraPitch)
      camera.position.z = curDist * Math.cos(simStateRef.current.cameraYaw) * Math.cos(simStateRef.current.cameraPitch)
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)

      // UI Dispatch (4 Hz = 250ms)
      if (now - lastUiSync > 250) {
        lastUiSync = now

        // Calculate time to next eclipse event
        // Simplified based on circular orbit anomaly
        let timeToEclipse = 0
        if (eclipseState === "SUNLIT") {
           const anomalyToEclipse = (Math.PI / 2) - u
           timeToEclipse = anomalyToEclipse > 0 ? (anomalyToEclipse / orbit.n) : ((Math.PI * 2.5 - u) / orbit.n)
        }

        setTelemetryUI({
          simTimeSec: Math.round(t),
          incidenceAngleDeg: incidenceDeg.toFixed(1),
          solarFluxWm2: (SOLAR_CONSTANT_W_M2 * eclipseFactor).toFixed(1),
          generatedPowerW: generatedW.toFixed(1),
          busLoadW: NOMINAL_LOAD_W.toFixed(1),
          netPowerW: netPowerW.toFixed(1),
          batterySocPct: socPct.toFixed(2),
          batteryDodPct: dodPct.toFixed(2),
          eclipseState,
          timeToEclipseSec: eclipseState === "SUNLIT" ? Math.round(timeToEclipse).toString() : "ACTIVE"
        })

        setSocHistory(prev => [...prev.slice(1), socPct])
        setPowerHistory(prev => [...prev.slice(1), generatedW])
      }
    }

    animId = requestAnimationFrame(animate)

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
      dom.removeEventListener("wheel", onWheel)
      renderer.dispose()
    }
  }, [orbit])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* TOP TACTICAL FLIGHT BAR */}
      <div className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white font-mono font-black text-sm tracking-wider hover:border-amber-500/50 transition-all shadow-xl"
          >
            VEROYX
          </Link>
          <div className="px-3 py-1 rounded-full bg-amber-950/80 backdrop-blur-md border border-amber-500/40 text-amber-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-xl">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            ELECTRICAL POWER SYSTEM (EPS) &amp; BATTERY DYNAMICS
          </div>
        </div>

        {/* Time Scrub Controls */}
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 pointer-events-auto shadow-xl">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {[1, 10, 60, 120].map(scale => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                timeScale === scale 
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {scale}x
            </button>
          ))}

          <button
            onClick={() => { simStateRef.current.simTimeSec = 1500; simStateRef.current.batteryEnergyWh = 1200; }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* FLOATING LEFT HUD: POWER GENERATION */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Array Generation */}
        <div className={`p-4 rounded-xl backdrop-blur-md border shadow-2xl space-y-2.5 transition-all ${
          telemetryUI.eclipseState === "SUNLIT" 
            ? "bg-slate-950/85 border-amber-500/40" 
            : "bg-slate-950/75 border-slate-800/80"
        }`}>
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Sun className={`w-4 h-4 ${telemetryUI.eclipseState === "SUNLIT" ? "text-amber-400" : "text-slate-500"}`} />
              SOLAR ARRAY KINETICS
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${
              telemetryUI.eclipseState === "SUNLIT" 
                ? "text-amber-400 border-amber-500/20 bg-amber-950/50"
                : "text-slate-400 border-slate-700 bg-slate-800"
            }`}>
              {telemetryUI.eclipseState}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SOLAR FLUX</span>
              <span className="text-amber-400 font-bold">{telemetryUI.solarFluxWm2} W/m&sup2;</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SUN INCIDENCE ANGLE (θ)</span>
              <span className="text-white font-bold">{telemetryUI.incidenceAngleDeg}&deg;</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">COSINE LOSS</span>
              <span className="text-white font-bold">{(1 - Math.cos((parseFloat(telemetryUI.incidenceAngleDeg) * Math.PI) / 180)).toFixed(3)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">GENERATED POWER (Pgen)</span>
              <span className="text-emerald-400 font-bold">{telemetryUI.generatedPowerW} W</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">NEXT ECLIPSE IN</span>
              <span className="text-slate-300 font-bold">{telemetryUI.timeToEclipseSec} s</span>
            </div>
          </div>
        </div>

        {/* Rolling Generation Graph */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Pgen PROFILE
            </span>
            <span className="text-cyan-400 font-bold">{telemetryUI.generatedPowerW} W</span>
          </div>

          <div className="h-14 w-full bg-slate-950 rounded border border-slate-800/80 flex items-end px-0.5 gap-px overflow-hidden">
            {powerHistory.map((val, idx) => {
              const hPercent = Math.max(2, Math.min(100, (val / MAX_POWER_W) * 100))
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-t-sm transition-all ${val > 100 ? "bg-amber-400/80" : "bg-slate-700"}`}
                  style={{ height: `${hPercent}%` }}
                />
              )
            })}
          </div>
        </div>

      </div>

      {/* FLOATING RIGHT HUD: BATTERY & BUS LOAD */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Power Bus Budget */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-rose-400" />
              ELECTRICAL BUS BUDGET
            </span>
            <span className="text-[10px] text-rose-400">28V BUS</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">AVIONICS + PAYLOAD LOAD</span>
              <span className="text-rose-400 font-bold">-{telemetryUI.busLoadW} W</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">POWER GENERATION</span>
              <span className="text-emerald-400 font-bold">+{telemetryUI.generatedPowerW} W</span>
            </div>
            <div className="flex justify-between pt-1 font-bold">
              <span className="text-white">NET POWER</span>
              <span className={parseFloat(telemetryUI.netPowerW) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {parseFloat(telemetryUI.netPowerW) > 0 ? "+" : ""}{telemetryUI.netPowerW} W
              </span>
            </div>
          </div>
        </div>

        {/* Battery State of Charge */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              {parseFloat(telemetryUI.netPowerW) >= 0 ? (
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              ) : (
                <BatteryWarning className="w-4 h-4 text-rose-400" />
              )}
              BATTERY KINETICS
            </span>
            <span className="text-[10px] text-slate-400">Li-Ion 1.2kWh</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">STATE OF CHARGE (SoC)</span>
              <span className={parseFloat(telemetryUI.batterySocPct) < 50 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {telemetryUI.batterySocPct} %
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-200 ${parseFloat(telemetryUI.batterySocPct) < 50 ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${telemetryUI.batterySocPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-slate-400">DEPTH OF DISCHARGE (DoD)</span>
              <span className="text-white font-bold">{telemetryUI.batteryDodPct} %</span>
            </div>
          </div>

          {/* SoC Graph */}
          <div className="pt-2">
            <div className="h-10 w-full bg-slate-950 rounded border border-slate-800 flex items-end px-0.5 gap-px overflow-hidden">
              {socHistory.map((val, idx) => {
                const hPercent = Math.max(5, Math.min(100, val))
                return (
                  <div
                    key={idx}
                    className={`flex-1 transition-all rounded-t-sm ${val < 50 ? "bg-rose-500/80" : "bg-emerald-500/80"}`}
                    style={{ height: `${hPercent}%` }}
                  />
                )
              })}
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">STATUS:</span>
            <span className={telemetryUI.eclipseState === "SUNLIT" ? "text-amber-400 font-bold" : "text-rose-400 font-bold"}>
              {telemetryUI.eclipseState === "SUNLIT" ? "NOMINAL CHARGING" : "ECLIPSE DISCHARGING"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>SIM TIME: <strong className="text-white">{telemetryUI.simTimeSec}s</strong></span>
        </div>
      </div>

    </div>
  )
}
