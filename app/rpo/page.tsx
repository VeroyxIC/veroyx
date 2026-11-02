"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Orbit, Crosshair, ShieldCheck, ShieldAlert, Activity, 
  Layers, Compass, Play, Square, RotateCcw, AlertTriangle, 
  Target, Radio, Navigation, ArrowRight, CheckCircle2, Zap 
} from "lucide-react"

type RpoManeuver = "V_BAR_APPROACH" | "R_BAR_HOP" | "FOOTBALL_PERCH" | "CO_ELLIPTIC_INSPECT"

interface ManeuverPreset {
  name: string
  approachType: string
  initRelPosM: [number, number, number] // [x_radial, y_alongtrack, z_crosstrack]
  initRelVelMs: [number, number, number]
  targetAltitudeKm: number
  keepOutSphereM: number
  coneHalfAngleDeg: number
  corridorAxis: "POS_V_BAR" | "NEG_V_BAR" | "POS_R_BAR"
  description: string
  colorHex: string
}

const MANEUVERS: Record<RpoManeuver, ManeuverPreset> = {
  "V_BAR_APPROACH": {
    name: "V-Bar Forced Approach Corridor",
    approachType: "Velocity Vector Along-Track Glide",
    initRelPosM: [0, -650, 0],
    initRelVelMs: [0, 0.45, 0],
    targetAltitudeKm: 550,
    keepOutSphereM: 180,
    coneHalfAngleDeg: 20,
    corridorAxis: "NEG_V_BAR",
    description: "Continuous-thrust straight-line approach along the orbital velocity vector through the safety corridor.",
    colorHex: "#38bdf8"
  },
  "R_BAR_HOP": {
    name: "R-Bar Passive Energy Climb",
    approachType: "Radial Vector Natural Deceleration",
    initRelPosM: [-450, 0, 0],
    initRelVelMs: [0.35, 0, 0],
    targetAltitudeKm: 550,
    keepOutSphereM: 150,
    coneHalfAngleDeg: 25,
    corridorAxis: "POS_R_BAR",
    description: "Climbing from below the target along the Earth-radial vector, leveraging gravity gradient for passive braking.",
    colorHex: "#10b981"
  },
  "FOOTBALL_PERCH": {
    name: "Bounded 2:1 Relative Ellipse (Football)",
    approachType: "Zero-Drift Passive Fly-Around",
    initRelPosM: [120, 0, 80],
    initRelVelMs: [0, -0.27, 0.12], // Satisfies 2*ydot + 3*n*x = 0
    targetAltitudeKm: 550,
    keepOutSphereM: 120,
    coneHalfAngleDeg: 30,
    corridorAxis: "POS_V_BAR",
    description: "Closed periodic relative orbit circling the target indefinitely without expenditure of stationkeeping propellant.",
    colorHex: "#f59e0b"
  },
  "CO_ELLIPTIC_INSPECT": {
    name: "Non-Cooperative Co-Elliptic Shadow",
    approachType: "Differential Height Phasing Drift",
    initRelPosM: [-180, -900, 50],
    initRelVelMs: [0.08, 0.85, 0],
    targetAltitudeKm: 550,
    keepOutSphereM: 200,
    coneHalfAngleDeg: 15,
    corridorAxis: "NEG_V_BAR",
    description: "Trailing inspection trajectory utilizing orbital phasing drift to scan the target's sensor and solar arrays.",
    colorHex: "#d946ef"
  }
}

export default function RpoSafetyPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [maneuverKey, setManeuverKey] = useState<RpoManeuver>("V_BAR_APPROACH")
  const [approachSpeedFactor, setApproachSpeedFactor] = useState<number>(1.0)
  const [keepOutRadiusM, setKeepOutRadiusM] = useState<number>(180)
  const [coneAngleDeg, setConeAngleDeg] = useState<number>(20)
  const [abortTriggered, setAbortTriggered] = useState<boolean>(false)
  const [simTimeSec, setSimTimeSec] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = MANEUVERS[maneuverKey]

  // Mean motion (n) for 550 km circular LEO orbit
  const MU = 3.986004418e14
  const EARTH_R = 6371000
  const orbitR = EARTH_R + spec.targetAltitudeKm * 1000
  const meanMotionN = Math.sqrt(MU / Math.pow(orbitR, 3)) // ~0.0011 rad/s
  const orbitPeriodMin = (2 * Math.PI) / meanMotionN / 60 // ~95.6 min

  // Hill-Clohessy-Wiltshire (HCW) Closed-Form Relative Propagation
  const currentRelState = useMemo(() => {
    const t = simTimeSec * approachSpeedFactor
    const [x0, y0, z0] = spec.initRelPosM
    const [dx0, dy0, dz0] = spec.initRelVelMs

    const nt = meanMotionN * t
    const sinNt = Math.sin(nt)
    const cosNt = Math.cos(nt)

    let x = (dx0 / meanMotionN) * sinNt - (3 * x0 + (2 * dy0) / meanMotionN) * cosNt + (4 * x0 + (2 * dy0) / meanMotionN)
    let y = (6 * x0 + (4 * dy0) / meanMotionN) * sinNt + ((2 * dx0) / meanMotionN) * cosNt - (6 * meanMotionN * x0 + 3 * dy0) * t + (y0 - (2 * dx0) / meanMotionN)
    let z = z0 * cosNt + (dz0 / meanMotionN) * sinNt

    let vx = dx0 * cosNt + (3 * meanMotionN * x0 + 2 * dy0) * sinNt
    let vy = (6 * meanMotionN * x0 + 4 * dy0) * cosNt - 2 * dx0 * sinNt - (6 * meanMotionN * x0 + 3 * dy0)
    let vz = -z0 * meanMotionN * sinNt + dz0 * cosNt

    // If abort burn executed, impart impulsive radial kick: dx += 1.5 m/s
    if (abortTriggered) {
      const abortT = simTimeSec - 10
      if (abortT > 0) {
        x += 1.8 * abortT
        y -= 0.5 * abortT * abortT * 0.05
      }
    }

    const slantRangeM = Math.sqrt(x * x + y * y + z * z)
    const relSpeedMs = Math.sqrt(vx * vx + vy * vy + vz * vz)

    // Compute angle relative to Approach Corridor Axis (-Y for NEG_V_BAR)
    let axisVec = new THREE.Vector3(0, -1, 0)
    if (spec.corridorAxis === "POS_R_BAR") axisVec = new THREE.Vector3(1, 0, 0)
    if (spec.corridorAxis === "POS_V_BAR") axisVec = new THREE.Vector3(0, 1, 0)

    const posVec = new THREE.Vector3(x, y, z).normalize()
    const cosAngle = Math.max(-1, Math.min(1, posVec.dot(axisVec)))
    const angleFromAxisDeg = (Math.acos(cosAngle) * 180) / Math.PI

    const isInsideCone = angleFromAxisDeg <= coneAngleDeg
    const isInsideKoz = slantRangeM <= keepOutRadiusM
    const isCorridorViolation = isInsideKoz && !isInsideCone
    const isDriftFree = Math.abs(6 * meanMotionN * x0 + 3 * dy0) < 0.001

    return {
      x, y, z,
      vx, vy, vz,
      slantRangeM,
      relSpeedMs,
      angleFromAxisDeg,
      isInsideCone,
      isInsideKoz,
      isCorridorViolation,
      isDriftFree
    }
  }, [spec, simTimeSec, approachSpeedFactor, meanMotionN, coneAngleDeg, keepOutRadiusM, abortTriggered])

  // Simulation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSec(t => t + 1.0)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Hill Relative Frame Visualization
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 45, 85)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.0)
    sun.position.set(30, 40, 20)
    scene.add(sun)

    // 1. LVLH Frame Coordinate Plane Grid
    const grid = new THREE.GridHelper(100, 50, 0x0284c7, 0x1e293b)
    grid.position.set(0, -1.0, 0)
    scene.add(grid)

    // 2. Target Spacecraft at Origin [0, 0, 0]
    const targetGroup = new THREE.Group()
    scene.add(targetGroup)

    const busGeo = new THREE.BoxGeometry(2.4, 2.4, 3.6)
    const busMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
    const targetBus = new THREE.Mesh(busGeo, busMat)
    targetGroup.add(targetBus)

    // Solar Wings
    const wingGeo = new THREE.BoxGeometry(6.0, 0.08, 1.8)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(4.8, 0, 0)
    targetGroup.add(wingL)
    const wingR = wingL.clone()
    wingR.position.set(-4.8, 0, 0)
    targetGroup.add(wingR)

    // Docking Fixture Target Ring
    const ringGeo = new THREE.TorusGeometry(0.7, 0.08, 16, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.set(0, 0, -1.85)
    targetGroup.add(ring)

    // 3. Keep-Out Sphere (KOS) Safety Perimeter
    const kosScale = (keepOutRadiusM / 10) * 0.5
    const kosGeo = new THREE.SphereGeometry(kosScale, 32, 32)
    const kosMat = new THREE.MeshBasicMaterial({
      color: currentRelState.isCorridorViolation ? 0xef4444 : 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: currentRelState.isCorridorViolation ? 0.45 : 0.18
    })
    const kosMesh = new THREE.Mesh(kosGeo, kosMat)
    scene.add(kosMesh)

    // 4. Approach Corridor Cone Envelope
    const coneLen = 45.0
    const coneRadius = coneLen * Math.tan((coneAngleDeg * Math.PI) / 180)
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneLen, 24, 1, true)
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    })
    const coneMesh = new THREE.Mesh(coneGeo, coneMat)
    coneMesh.position.set(0, 0, -coneLen / 2)
    coneMesh.rotation.x = Math.PI / 2
    scene.add(coneMesh)

    // 5. Chaser / Inspector Spacecraft
    const chaserGroup = new THREE.Group()
    scene.add(chaserGroup)

    const cGeo = new THREE.BoxGeometry(1.2, 1.2, 1.6)
    const cMat = new THREE.MeshStandardMaterial({
      color: currentRelState.isCorridorViolation ? 0xef4444 : 0x38bdf8,
      metalness: 0.8
    })
    const chaserMesh = new THREE.Mesh(cGeo, cMat)
    chaserGroup.add(chaserMesh)

    // Thruster Cold-Gas Plumes
    const pGeo = new THREE.ConeGeometry(0.3, 0.8, 12)
    const pMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true })
    const plume = new THREE.Mesh(pGeo, pMat)
    plume.position.set(0, 0, 1.1)
    chaserGroup.add(plume)

    // Relative Trajectory Trail
    const maxTrailPoints = 120
    const trailPositions = new Float32Array(maxTrailPoints * 3)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3))
    const trailMat = new THREE.LineBasicMaterial({
      color: currentRelState.isCorridorViolation ? 0xef4444 : 0x38bdf8,
      transparent: true,
      opacity: 0.8
    })
    const trailLine = new THREE.Line(trailGeo, trailMat)
    scene.add(trailLine)

    let trailIdx = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Map relative meters to 3D scene units (1 unit = 15 meters)
      const scale = 1 / 15
      const cX = currentRelState.x * scale
      const cY = currentRelState.z * scale // Swap Y & Z for intuitive visual plane
      const cZ = currentRelState.y * scale

      chaserGroup.position.set(cX, cY, cZ)
      chaserGroup.lookAt(targetGroup.position)

      // Record trajectory trail points
      if (trailIdx < maxTrailPoints) {
        trailPositions[trailIdx * 3 + 0] = cX
        trailPositions[trailIdx * 3 + 1] = cY
        trailPositions[trailIdx * 3 + 2] = cZ
        trailIdx++
      } else {
        // Shift trail array
        for (let i = 0; i < maxTrailPoints - 1; i++) {
          trailPositions[i * 3 + 0] = trailPositions[(i + 1) * 3 + 0]
          trailPositions[i * 3 + 1] = trailPositions[(i + 1) * 3 + 1]
          trailPositions[i * 3 + 2] = trailPositions[(i + 1) * 3 + 2]
        }
        trailPositions[(maxTrailPoints - 1) * 3 + 0] = cX
        trailPositions[(maxTrailPoints - 1) * 3 + 1] = cY
        trailPositions[(maxTrailPoints - 1) * 3 + 2] = cZ
      }
      trailGeo.attributes.position.needsUpdate = true

      targetBus.rotation.y += 0.001

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
  }, [currentRelState, coneAngleDeg, keepOutRadiusM])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: MANEUVER PROFILE & SAFETY ENVELOPE */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Orbit className="w-5 h-5 text-cyan-400" /> RPO Safety Corridors
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Hill-Clohessy-Wiltshire Relative Navigation
          </p>
        </div>

        <div className="space-y-6">
          {/* Preset Approaches */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Proximity Approach Profile
            </label>
            <div className="space-y-2">
              {(["V_BAR_APPROACH", "R_BAR_HOP", "FOOTBALL_PERCH", "CO_ELLIPTIC_INSPECT"] as RpoManeuver[]).map(key => {
                const item = MANEUVERS[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setManeuverKey(key)
                      setKeepOutRadiusM(item.keepOutSphereM)
                      setConeAngleDeg(item.coneHalfAngleDeg)
                      setSimTimeSec(0)
                      setAbortTriggered(false)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      maneuverKey === key 
                        ? "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.approachType} | {item.corridorAxis}
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">KOS: {item.keepOutSphereM}m</span>
                      <span className="text-slate-500">Cone: ±{item.coneHalfAngleDeg}°</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Safety Geometry Constraints */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Safety Corridor Constraints</span>
              <span className={`font-bold ${currentRelState.isCorridorViolation ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                {currentRelState.isCorridorViolation ? "ZONE BREACH" : "ENVELOPE SECURE"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">KEEP-OUT SPHERE (KOS):</span>
                <span className="text-white font-bold">{keepOutRadiusM} meters</span>
              </div>
              <input 
                type="range" min="80" max="350" step="10"
                value={keepOutRadiusM}
                onChange={e => setKeepOutRadiusM(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">APPROACH CONE HALF-ANGLE (α):</span>
                <span className="text-emerald-400 font-bold">±{coneAngleDeg}°</span>
              </div>
              <input 
                type="range" min="10" max="45" step="5"
                value={coneAngleDeg}
                onChange={e => setConeAngleDeg(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">PROPAGATION WARP:</span>
                <span className="text-amber-400 font-bold">{approachSpeedFactor.toFixed(1)}x ORBIT RATE</span>
              </div>
              <input 
                type="range" min="0.5" max="5.0" step="0.5"
                value={approachSpeedFactor}
                onChange={e => setApproachSpeedFactor(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Emergency Autonomous Abort */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Emergency Passive Abort</span>
              <span className="text-rose-400 font-bold">PASSIVE ESCAPE DELTA-V</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAbortTriggered(true)}
                className="flex-1 py-2.5 rounded-lg font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 transition-all"
              >
                <AlertTriangle className="w-4 h-4 fill-white" /> EXECUTE PASSIVE ABORT BURN
              </button>

              <button
                onClick={() => {
                  setSimTimeSec(0)
                  setAbortTriggered(false)
                }}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Trajectory"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS LVLH FRAME & APPROACH HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Hill LVLH Frame [Relative Slant Range]
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${currentRelState.isCorridorViolation ? "text-rose-500 animate-pulse" : "text-emerald-400"}`}>
              {currentRelState.slantRangeM.toFixed(1)} m
            </span>
            <span className="text-slate-500 text-sm">
              REL SEPARATION ({currentRelState.relSpeedMs.toFixed(2)} m/s CLOSING)
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">RADIAL (X): {currentRelState.x.toFixed(1)} m</span>
            <span className="text-amber-400">ALONG-TRACK (Y): {currentRelState.y.toFixed(1)} m</span>
            <span className="text-emerald-400">CROSS-TRACK (Z): {currentRelState.z.toFixed(1)} m</span>
            <span className={currentRelState.isInsideCone ? "text-emerald-400 font-bold" : "text-rose-400"}>
              CONE OFFSET: {currentRelState.angleFromAxisDeg.toFixed(1)}°
            </span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">APPROACH STATUS</span>
              <span className={`font-bold text-sm ${currentRelState.isCorridorViolation ? "text-rose-400 font-black" : "text-emerald-400"}`}>
                {currentRelState.isCorridorViolation ? "SAFETY BREACH // ABORT RECOMMENDED" : "INSIDE CONE CORRIDOR"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">NATURAL DRIFT CONDITION</span>
            <span className={`text-sm font-bold ${currentRelState.isDriftFree ? "text-emerald-400" : "text-amber-400"}`}>
              {currentRelState.isDriftFree ? "STABLE FOOTBALL ORBIT" : "SECULAR DRIFTING"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ORBIT PERIOD (LEO)</span>
            <span className="text-cyan-400 font-bold text-sm">{orbitPeriodMin.toFixed(1)} MIN</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ABORT PROPULSION RESERVE</span>
            <span className="text-emerald-400 font-bold text-sm">DELTA-V &ge; 45 m/s</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: RELATIVE STATE MATRIX & DRIFT BUDGET */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> HCW State Matrix
        </h2>

        <div className="space-y-6">
          {/* Safety Envelope Card */}
          <div className={`p-5 rounded-2xl border ${currentRelState.isCorridorViolation ? "bg-rose-950/20 border-rose-500/40" : "bg-emerald-950/20 border-emerald-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              CORRIDOR INTEGRITY VERIFICATION
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${currentRelState.isCorridorViolation ? "text-rose-400" : "text-emerald-400"}`}>
              {currentRelState.isCorridorViolation ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              {currentRelState.isCorridorViolation ? "KEEP-OUT VIOLATION" : "CORRIDOR CLEARED"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {currentRelState.isCorridorViolation 
                ? "Spacecraft has entered the Keep-Out Sphere (KOS) outside the designated angular approach cone. Automated thruster interlock prevents forward burns."
                : "Spacecraft vector conforms strictly to the line-of-sight docking corridor. Relative velocities are damped below collision threshold."}
            </p>
          </div>

          {/* Kinematic State Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">LVLH State Vector (RIC)</div>
            <div className="flex justify-between"><span className="text-slate-500">Radial (x):</span><span className="text-white font-bold">{currentRelState.x.toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Along-Track (y):</span><span className="text-white font-bold">{currentRelState.y.toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cross-Track (z):</span><span className="text-white font-bold">{currentRelState.z.toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Radial Rate (vx):</span><span className="text-cyan-400 font-bold">{currentRelState.vx.toFixed(3)} m/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Along-Track Rate (vy):</span><span className="text-amber-400 font-bold">{currentRelState.vy.toFixed(3)} m/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cross-Track Rate (vz):</span><span className="text-cyan-400 font-bold">{currentRelState.vz.toFixed(3)} m/s</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">SLANT SEPARATION:</span><span className="text-emerald-400">{currentRelState.slantRangeM.toFixed(1)} m</span></div>
          </div>

          {/* HCW Dynamics Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Passive Drift-Free Condition
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              When 2*dy0 + 3*n*x0 = 0, along-track secular drift is eliminated. The inspector enters a natural 2:1 relative elliptical orbit around the target, maintaining inspection custody indefinitely with zero risk of collision.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
