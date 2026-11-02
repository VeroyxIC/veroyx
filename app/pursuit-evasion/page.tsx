"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Crosshair, ShieldAlert, ShieldCheck, Zap, Activity, 
  Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Target, Radio, Flame, ArrowUpRight 
} from "lucide-react"

type GameClass = "CO_ORBITAL_INTERCEPT" | "GEO_INSPECTION_DEFENSE" | "LEO_ASAT_EVASION" | "PROXIMITY_DOGFIGHT"

interface EngagementPreset {
  name: string
  pursuerName: string
  evaderName: string
  orbitRegime: string
  initialRangeKm: number
  pursuerAccelMax: number // m/s^2
  evaderAccelMax: number // m/s^2
  pursuerDeltaVMs: number
  evaderDeltaVMs: number
  captureRadiusM: number
  description: string
  colorHex: string
}

const PRESETS: Record<GameClass, EngagementPreset> = {
  "CO_ORBITAL_INTERCEPT": {
    name: "Co-Orbital Kinetic Intercept",
    pursuerName: "ASAT Kill Vehicle (KKV)",
    evaderName: "Allied Tactical Optical Recon",
    orbitRegime: "LEO SSO (520 km)",
    initialRangeKm: 8.5,
    pursuerAccelMax: 12.5,
    evaderAccelMax: 4.2,
    pursuerDeltaVMs: 320,
    evaderDeltaVMs: 180,
    captureRadiusM: 15,
    description: "High-thrust divert kinetic vehicle closing on an evading high-value reconnaissance satellite.",
    colorHex: "#ef4444"
  },
  "GEO_INSPECTION_DEFENSE": {
    name: "GEO High-Value Asset Defense",
    pursuerName: "Foreign RPO Inspector",
    evaderName: "Milstar Feeder Gateway",
    orbitRegime: "GEO (35,786 km)",
    initialRangeKm: 14.0,
    pursuerAccelMax: 1.8,
    evaderAccelMax: 2.5,
    pursuerDeltaVMs: 140,
    evaderDeltaVMs: 210,
    captureRadiusM: 35,
    description: "Low-thrust electric/chemical stationkeeping maneuvering against a foreign proximity inspection craft.",
    colorHex: "#38bdf8"
  },
  "LEO_ASAT_EVASION": {
    name: "Direct-Ascent ASAT Evasive Burn",
    pursuerName: "SC-19 Suborbital Interceptor",
    evaderName: "Aegis-SAR Recon Platform",
    orbitRegime: "LEO (610 km)",
    initialRangeKm: 22.0,
    pursuerAccelMax: 25.0,
    evaderAccelMax: 6.0,
    pursuerDeltaVMs: 450,
    evaderDeltaVMs: 220,
    captureRadiusM: 20,
    description: "Hypersonic closing burn requiring maximum transverse burn to displace orbital cross-track position.",
    colorHex: "#f59e0b"
  },
  "PROXIMITY_DOGFIGHT": {
    name: "Autonomous RPO Dogfight",
    pursuerName: "Combat Chaser Drone",
    evaderName: "Hostile Relay Node",
    orbitRegime: "MEO (12,000 km)",
    initialRangeKm: 5.0,
    pursuerAccelMax: 8.0,
    evaderAccelMax: 7.5,
    pursuerDeltaVMs: 280,
    evaderDeltaVMs: 260,
    captureRadiusM: 10,
    description: "Near-matched acceleration ratio where delta-v management and trajectory curvature dictate outcome.",
    colorHex: "#d946ef"
  }
}

export default function PursuitEvasionPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [gameMode, setGameMode] = useState<GameClass>("CO_ORBITAL_INTERCEPT")
  const [pursuerAccel, setPursuerAccel] = useState<number>(12.5)
  const [evaderAccel, setEvaderAccel] = useState<number>(4.2)
  const [pursuerDeltaV, setPursuerDeltaV] = useState<number>(320)
  const [evaderDeltaV, setEvaderDeltaV] = useState<number>(180)
  const [simTimeSec, setSimTimeSec] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = PRESETS[gameMode]

  // Differential Game Metrics
  const accelRatioGamma = pursuerAccel / Math.max(0.1, evaderAccel)
  const isPursuerDominant = accelRatioGamma > 1.05
  const isEvaderDominant = accelRatioGamma < 0.95

  // Closed-loop Pursuit-Evasion Kinematics
  const relativeDistanceM = useMemo(() => {
    const initialM = spec.initialRangeKm * 1000
    const netAccel = pursuerAccel - evaderAccel
    const closingDist = 0.5 * netAccel * Math.pow(simTimeSec, 2)
    return Math.max(0, initialM - closingDist)
  }, [spec.initialRangeKm, pursuerAccel, evaderAccel, simTimeSec])

  const isCaptured = relativeDistanceM <= spec.captureRadiusM
  const pursuerFuelExpendedMs = Math.min(pursuerDeltaV, pursuerAccel * simTimeSec)
  const evaderFuelExpendedMs = Math.min(evaderDeltaV, evaderAccel * simTimeSec)

  const pursuerFuelRemainingMs = Math.max(0, pursuerDeltaV - pursuerFuelExpendedMs)
  const evaderFuelRemainingMs = Math.max(0, evaderDeltaV - evaderFuelExpendedMs)

  // Estimated Time to Capture
  const timeToCaptureSec = isPursuerDominant 
    ? Math.sqrt((2 * (spec.initialRangeKm * 1000)) / (pursuerAccel - evaderAccel))
    : Infinity

  // Simulation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSec(t => {
          if (t >= 60 || isCaptured) return 0
          return t + 0.2
        })
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying, isCaptured])

  // 3D Three.js Differential Game Scene in Hill RIC Frame
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 14, 26)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.8)
    sun.position.set(20, 20, 15)
    scene.add(sun)

    // 1. Relative Reference Frame Grid (Hill LVLH Frame)
    const gridHelper = new THREE.GridHelper(30, 30, 0x0284c7, 0x1e293b)
    gridHelper.position.set(0, -2, 0)
    scene.add(gridHelper)

    // 2. Evader Satellite (Origin / Center of relative motion)
    const evaderGroup = new THREE.Group()
    scene.add(evaderGroup)

    const evaderGeo = new THREE.BoxGeometry(0.8, 0.8, 1.2)
    const evaderMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.2
    })
    const evaderMesh = new THREE.Mesh(evaderGeo, evaderMat)
    evaderGroup.add(evaderMesh)

    // Evader Thruster Plumes
    const ePlumeGeo = new THREE.ConeGeometry(0.2, 0.6, 12)
    const ePlumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true })
    const ePlume = new THREE.Mesh(ePlumeGeo, ePlumeMat)
    ePlume.position.set(0, -0.7, 0)
    evaderGroup.add(ePlume)

    // 3. Pursuer Interceptor
    const pursuerGroup = new THREE.Group()
    scene.add(pursuerGroup)

    const pGeo = new THREE.ConeGeometry(0.4, 1.5, 16)
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.9,
      roughness: 0.1
    })
    const pMesh = new THREE.Mesh(pGeo, pMat)
    pMesh.rotation.z = -Math.PI / 2
    pursuerGroup.add(pMesh)

    // Pursuer Thruster Plume
    const pPlumeGeo = new THREE.ConeGeometry(0.3, 0.9, 12)
    const pPlumeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true })
    const pPlume = new THREE.Mesh(pPlumeGeo, pPlumeMat)
    pPlume.position.set(-1.1, 0, 0)
    pPlume.rotation.z = Math.PI / 2
    pursuerGroup.add(pPlume)

    // 4. Reachability Basin Envelope (Expanding Ellipsoid around Pursuer)
    const basinGeo = new THREE.SphereGeometry(1, 24, 24)
    const basinMat = new THREE.MeshBasicMaterial({
      color: isPursuerDominant ? 0xef4444 : 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    })
    const basinMesh = new THREE.Mesh(basinGeo, basinMat)
    scene.add(basinMesh)

    // 5. Dynamic Intercept Vector Line
    const trackGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const trackMat = new THREE.LineBasicMaterial({
      color: isCaptured ? 0xef4444 : 0x38bdf8,
      transparent: true,
      opacity: 0.85
    })
    const trackLine = new THREE.Line(trackGeo, trackMat)
    scene.add(trackLine)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Animate Pursuer closing on Evader along relative trajectory
      const fraction = Math.min(1.0, relativeDistanceM / (spec.initialRangeKm * 1000))
      const pX = -(fraction * 16.0) + 1.2
      const pY = Math.sin(simTimeSec * 0.3) * 1.5
      const pZ = Math.cos(simTimeSec * 0.3) * 2.0

      pursuerGroup.position.set(pX, pY, pZ)
      pursuerGroup.lookAt(evaderGroup.position)

      // Evader reactive evasive weave
      evaderGroup.position.set(0, Math.sin(simTimeSec * 0.2) * 1.0, 0)

      // Reachability Basin Expansion
      const basinScale = Math.max(1.5, (1.0 - fraction) * 10.0)
      basinMesh.position.copy(pursuerGroup.position)
      basinMesh.scale.set(basinScale * 1.4, basinScale, basinScale * 0.8)

      // Update Intercept Vector Line
      const pPos = pursuerGroup.position
      const ePos = evaderGroup.position
      const linePositions = new Float32Array([
        pPos.x, pPos.y, pPos.z,
        ePos.x, ePos.y, ePos.z
      ])
      trackGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3))
      trackGeo.attributes.position.needsUpdate = true

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
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [relativeDistanceM, spec, isPursuerDominant, isCaptured, simTimeSec])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: GAME ENGAGEMENT MATRIX */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Crosshair className="w-5 h-5 text-rose-500" /> Pursuit-Evasion Game
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Hamilton-Jacobi-Isaacs Orbital Differential Combat
          </p>
        </div>

        <div className="space-y-6">
          {/* Preset Selectors */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-rose-500" /> Space Combat Preset
            </label>
            <div className="space-y-2">
              {(["CO_ORBITAL_INTERCEPT", "GEO_INSPECTION_DEFENSE", "LEO_ASAT_EVASION", "PROXIMITY_DOGFIGHT"] as GameClass[]).map(c => {
                const item = PRESETS[c]
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setGameMode(c)
                      setPursuerAccel(item.pursuerAccelMax)
                      setEvaderAccel(item.evaderAccelMax)
                      setPursuerDeltaV(item.pursuerDeltaVMs)
                      setEvaderDeltaV(item.evaderDeltaVMs)
                      setSimTimeSec(0)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      gameMode === c 
                        ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.orbitRegime}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-rose-400 font-bold block">{item.initialRangeKm} km</span>
                      <span className="text-slate-500">Rc: {item.captureRadiusM}m</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Differential Acceleration Controls */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Maneuver Authority (γ = {accelRatioGamma.toFixed(2)})</span>
              <span className={`font-bold ${isPursuerDominant ? "text-rose-400" : isEvaderDominant ? "text-emerald-400" : "text-amber-400"}`}>
                {isPursuerDominant ? "PURSUER DOMINANT" : isEvaderDominant ? "EVADER ESCAPE" : "SADDLE EQUILIBRIUM"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">PURSUER MAX THRUST ACCEL:</span>
                <span className="text-rose-400 font-bold">{pursuerAccel.toFixed(1)} m/s² ({(pursuerAccel / 9.80665).toFixed(2)} G)</span>
              </div>
              <input 
                type="range" min="0.5" max="30.0" step="0.5"
                value={pursuerAccel}
                onChange={e => setPursuerAccel(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">EVADER REACTION ACCEL:</span>
                <span className="text-cyan-400 font-bold">{evaderAccel.toFixed(1)} m/s² ({(evaderAccel / 9.80665).toFixed(2)} G)</span>
              </div>
              <input 
                type="range" min="0.5" max="30.0" step="0.5"
                value={evaderAccel}
                onChange={e => setEvaderAccel(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-[10px]">
              <div>
                <span className="text-slate-500 block">PURSUER REMAINING Δv:</span>
                <span className="text-white font-bold text-xs">{pursuerFuelRemainingMs.toFixed(0)} / {pursuerDeltaV} m/s</span>
              </div>
              <div>
                <span className="text-slate-500 block">EVADER REMAINING Δv:</span>
                <span className="text-white font-bold text-xs">{evaderFuelRemainingMs.toFixed(0)} / {evaderDeltaV} m/s</span>
              </div>
            </div>
          </div>

          {/* Engagement Playback Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Differential Game Clock</span>
              <span className={`font-bold ${isCaptured ? "text-rose-500 animate-pulse" : "text-cyan-400"}`}>
                {isCaptured ? "TERMINAL CAPTURE REACHED" : `T+${simTimeSec.toFixed(1)}s`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "FREEZE DOGFIGHT" : "RUN DIFFERENTIAL GAME"}
              </button>

              <button
                onClick={() => setSimTimeSec(0)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Trajectory"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS RELATIVE HILL FRAME HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Hill Relative Frame (LVLH / RIC Coordinate System)
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isCaptured ? "text-rose-500 animate-pulse" : "text-white"}`}>
              {isCaptured ? "TERMINAL INTERCEPT // CAPTURE" : `${(relativeDistanceM / 1000).toFixed(2)} km`}
            </span>
            {!isCaptured && <span className="text-slate-500 text-sm">RELATIVE SLANT SEPARATION</span>}
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-rose-400">PURSUER ACCEL: {pursuerAccel} m/s²</span>
            <span className="text-cyan-400">EVADER ACCEL: {evaderAccel} m/s²</span>
            <span className="text-amber-400">
              EST. TIME TO INTERCEPT: {isFinite(timeToCaptureSec) ? `${timeToCaptureSec.toFixed(1)}s` : "ESCAPE ASSURED"}
            </span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical Status HUD Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-rose-500" />
            <div>
              <span className="text-slate-500 block text-[9px]">PURSUER TARGET DESIGNATION</span>
              <span className="text-white font-bold text-sm">{spec.pursuerName}</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">DIFFERENTIAL RATIO (γ)</span>
            <span className={`text-sm font-bold ${isPursuerDominant ? "text-rose-400" : "text-emerald-400"}`}>
              γ = {accelRatioGamma.toFixed(2)} ({isPursuerDominant ? "INTERCEPT BOUND" : "ESCAPE REACHABLE"})
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CAPTURE THRESHOLD</span>
            <span className="text-cyan-400 font-bold text-sm">Rc ≤ {spec.captureRadiusM} meters</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SADDLE-POINT INTEGRITY</span>
            <span className="text-emerald-400 font-bold text-sm">CONVERGED HJI</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: GAME THEORY MECHANICS & CO-STATE DYNAMICS */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Game Theory Telemetry
        </h2>

        <div className="space-y-6">
          {/* Outcome Card */}
          <div className={`p-5 rounded-2xl border ${isCaptured ? "bg-rose-950/30 border-rose-500/50" : isPursuerDominant ? "bg-amber-950/20 border-amber-500/40" : "bg-emerald-950/20 border-emerald-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              DIFFERENTIAL GAME STATUS
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${isCaptured ? "text-rose-400" : isPursuerDominant ? "text-amber-400" : "text-emerald-400"}`}>
              {isCaptured ? <Crosshair className="w-5 h-5 text-rose-500" /> : <ShieldCheck className="w-5 h-5" />}
              {isCaptured ? "CAPTURE CONFIRMED" : isPursuerDominant ? "PURSUER CLOSING" : "EVADER ESCAPING"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isCaptured 
                ? `Pursuer achieved capture within terminal perimeter (${(relativeDistanceM).toFixed(1)}m ≤ ${spec.captureRadiusM}m). Evader delta-v was insufficient to evade terminal guidance cone.`
                : isPursuerDominant 
                ? `Acceleration ratio γ = ${accelRatioGamma.toFixed(2)} guarantees the pursuer's reachability basin intersects the evader's trajectory prior to delta-v exhaustion.`
                : `Acceleration ratio γ = ${accelRatioGamma.toFixed(2)} provides the evader an open saddle-point trajectory, out-accelerating the pursuer and precluding capture.`}
            </p>
          </div>

          {/* Differential Parameters Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Isaacs Differential Game Parameters</div>
            <div className="flex justify-between"><span className="text-slate-500">Pursuer Accel (ap):</span><span className="text-rose-400 font-bold">{pursuerAccel.toFixed(1)} m/s²</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Evader Accel (ae):</span><span className="text-cyan-400 font-bold">{evaderAccel.toFixed(1)} m/s²</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Acceleration Ratio (γ):</span><span className="text-white font-bold">{accelRatioGamma.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Relative Distance:</span><span className="text-amber-400 font-bold">{(relativeDistanceM / 1000).toFixed(2)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pursuer Fuel Burned:</span><span className="text-slate-400">{pursuerFuelExpendedMs.toFixed(0)} m/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Evader Fuel Burned:</span><span className="text-slate-400">{evaderFuelExpendedMs.toFixed(0)} m/s</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">OUTCOME:</span><span className={isPursuerDominant ? "text-rose-400" : "text-emerald-400"}>{isPursuerDominant ? "INTERCEPTABLE" : "EVADED"}</span></div>
          </div>

          {/* Game Mechanics Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Hamilton-Jacobi-Isaacs Saddle Dynamics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Under Isaacs' Minimax theorem, neither spacecraft can unilaterally deviate from their optimal co-state control law without degrading their terminal outcome. Fuel depletion alters the reachability basin dynamically in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
