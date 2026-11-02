"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Crosshair, Target, ShieldCheck, ShieldAlert, Activity, 
  RotateCcw, Play, Square, Compass, Layers, Zap, Gauge 
} from "lucide-react"

type ApproachProfile = "V_BAR_GLIDESLOPE" | "R_BAR_HOP" | "FLYAROUND_INSPECTION" | "TERMINAL_CAPTURE"

interface ProfileSpec {
  name: string
  axis: "V-BAR" | "R-BAR" | "CIRCUMFERENTIAL"
  initialPosM: [number, number, number]
  approachRateMs: number
  coneAngleDeg: number
  colorHex: string
}

const PROFILES: Record<ApproachProfile, ProfileSpec> = {
  "V_BAR_GLIDESLOPE": {
    name: "V-Bar Co-Elliptic Glideslope",
    axis: "V-BAR",
    initialPosM: [0, -120, 0],
    approachRateMs: 0.15,
    coneAngleDeg: 15,
    colorHex: "#38bdf8"
  },
  "R_BAR_HOP": {
    name: "R-Bar Nadir Coordinated Pitch",
    axis: "R-BAR",
    initialPosM: [-80, 0, 0],
    approachRateMs: 0.10,
    coneAngleDeg: 20,
    colorHex: "#10b981"
  },
  "FLYAROUND_INSPECTION": {
    name: "Inspection 360° Safety Ellipsoid",
    axis: "CIRCUMFERENTIAL",
    initialPosM: [40, -40, 25],
    approachRateMs: 0.08,
    coneAngleDeg: 45,
    colorHex: "#f59e0b"
  },
  "TERMINAL_CAPTURE": {
    name: "Terminal Capture (<10m Soft Dock)",
    axis: "V-BAR",
    initialPosM: [0, -12, 0],
    approachRateMs: 0.03,
    coneAngleDeg: 8,
    colorHex: "#d946ef"
  }
}

export default function DockingPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [profile, setProfile] = useState<ApproachProfile>("V_BAR_GLIDESLOPE")
  const [approachVelocityMs, setApproachVelocityMs] = useState(0.12)
  const [rangeM, setRangeM] = useState(120)
  const [lateralOffsetM, setLateralOffsetM] = useState(1.4)
  const [isPlaying, setIsPlaying] = useState(true)

  const spec = PROFILES[profile]

  const MAX_CAPTURE_VELOCITY_MS = 0.10
  const MAX_LATERAL_TOLERANCE_M = 0.25
  const isTerminalZone = rangeM <= 10
  const isVelocitySafe = isTerminalZone ? approachVelocityMs <= MAX_CAPTURE_VELOCITY_MS : approachVelocityMs <= 0.35
  const isCorridorAligned = lateralOffsetM <= (isTerminalZone ? MAX_LATERAL_TOLERANCE_M : rangeM * Math.tan((spec.coneAngleDeg * Math.PI) / 180))

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setRangeM(r => {
          if (r <= 0.4) {
            setIsPlaying(false)
            return 0.4
          }
          return Math.max(0.4, r - approachVelocityMs * 0.5)
        })
        setLateralOffsetM(l => Math.max(0.04, l * 0.985))
      }, 100)
    }
    return () => clearInterval(timer)
  }, [isPlaying, approachVelocityMs])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 8, 22)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.0)
    sun.position.set(15, 20, 15)
    scene.add(sun)

    const targetGroup = new THREE.Group()
    
    const busGeo = new THREE.BoxGeometry(2.0, 2.0, 2.8)
    const busMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
    const bus = new THREE.Mesh(busGeo, busMat)
    targetGroup.add(bus)

    const ringGeo = new THREE.TorusGeometry(0.6, 0.08, 16, 32)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 })
    const portRing = new THREE.Mesh(ringGeo, ringMat)
    portRing.position.set(0, 0, -1.45)
    targetGroup.add(portRing)

    const targetCrossGeo = new THREE.RingGeometry(0.18, 0.22, 16)
    const targetCrossMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    const targetCross = new THREE.Mesh(targetCrossGeo, targetCrossMat)
    targetCross.position.set(0, 0, -1.42)
    targetGroup.add(targetCross)

    scene.add(targetGroup)

    const coneDepth = 18
    const coneRadius = coneDepth * Math.tan((spec.coneAngleDeg * Math.PI) / 180)
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneDepth, 24, 1, true)
    const coneMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.colorHex),
      wireframe: true,
      transparent: true,
      opacity: 0.2
    })
    const cone = new THREE.Mesh(coneGeo, coneMat)
    cone.rotation.x = Math.PI / 2
    cone.position.set(0, 0, -coneDepth / 2 - 1.45)
    scene.add(cone)

    const chaserGroup = new THREE.Group()
    const chaserBus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.8, 1.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
    )
    chaserBus.rotation.x = Math.PI / 2
    chaserGroup.add(chaserBus)

    const probeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16)
    const probeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
    const probe = new THREE.Mesh(probeGeo, probeMat)
    probe.rotation.x = Math.PI / 2
    probe.position.set(0, 0, 1.1)
    chaserGroup.add(probe)

    const lidarGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 1.5),
      new THREE.Vector3(0, 0, 8)
    ])
    const lidarMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.8
    })
    const lidarBeam = new THREE.Line(lidarGeo, lidarMat)
    chaserGroup.add(lidarBeam)

    scene.add(chaserGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const scaleZ = -(rangeM / 120) * 16 - 2.5
      chaserGroup.position.set(lateralOffsetM * 1.5, lateralOffsetM * 0.8, scaleZ)

      targetGroup.rotation.y = Math.sin(Date.now() * 0.0005) * 0.04
      targetGroup.rotation.x = Math.cos(Date.now() * 0.0004) * 0.02

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
  }, [rangeM, lateralOffsetM, spec])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Target className="w-5 h-5 text-cyan-400" /> Autonomous Docking
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Hill-Clohessy-Wiltshire (CW) RPO Engine
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Relative Approach Corridor
            </label>
            <div className="space-y-2">
              {(["V_BAR_GLIDESLOPE", "R_BAR_HOP", "FLYAROUND_INSPECTION", "TERMINAL_CAPTURE"] as ApproachProfile[]).map(p => {
                const item = PROFILES[p]
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setProfile(p)
                      setRangeM(Math.abs(item.initialPosM[1] || item.initialPosM[0]))
                      setApproachVelocityMs(item.approachRateMs)
                      setIsPlaying(true)
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      profile === p 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Axis: {item.axis} | Cone: ±{item.coneAngleDeg}°</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.approachRateMs} m/s</span>
                      <span className="text-slate-500">Nominal V_rel</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Relative Kinematic Parameters
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">RELATIVE RANGE:</span>
                <span className="text-cyan-400 font-bold">{rangeM.toFixed(1)} m</span>
              </div>
              <input 
                type="range" min="0.4" max="150" step="0.5"
                value={rangeM}
                onChange={e => setRangeM(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">APPROACH VELOCITY (V_REL):</span>
                <span className={`font-bold ${isVelocitySafe ? "text-emerald-400" : "text-rose-400"}`}>
                  {(approachVelocityMs * 100).toFixed(0)} cm/s
                </span>
              </div>
              <input 
                type="range" min="0.01" max="0.50" step="0.01"
                value={approachVelocityMs}
                onChange={e => setApproachVelocityMs(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">LATERAL DISPERSION:</span>
                <span className={`font-bold ${isCorridorAligned ? "text-emerald-400" : "text-amber-400"}`}>
                  {(lateralOffsetM * 100).toFixed(0)} cm
                </span>
              </div>
              <input 
                type="range" min="0.0" max="5.0" step="0.1"
                value={lateralOffsetM}
                onChange={e => setLateralOffsetM(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Guidance State</span>
              <span className={`font-bold ${rangeM <= 0.5 ? "text-emerald-400" : "text-cyan-400"}`}>
                {rangeM <= 0.5 ? "HARD DOCK ACHIEVED" : isPlaying ? "GLIDESLOPE ACTIVE" : "STATION KEEPING HOLD"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "HOLD POINT" : "RESUME GLIDESLOPE"}
              </button>

              <button
                onClick={() => {
                  setRangeM(120)
                  setLateralOffsetM(1.4)
                  setIsPlaying(true)
                }}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Sequence"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Optical Guidance (LiDAR / Vision)</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">{rangeM.toFixed(2)} m</span>
            <span className="text-cyan-400 font-bold text-lg">TO HARD DOCK</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className={isVelocitySafe ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              CLOSING RATE: {(approachVelocityMs * 100).toFixed(1)} cm/s
            </span>
            <span className="text-slate-400">LATERAL ERROR: {(lateralOffsetM * 100).toFixed(0)} cm</span>
            <span className="text-amber-400">CORRIDOR: ±{spec.coneAngleDeg}° CONE</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">RELATIVE LVLH VECTOR</span>
              <span className="text-white font-bold text-sm">[0.0, -{rangeM.toFixed(1)}, +{lateralOffsetM.toFixed(1)}] m</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CORRIDOR ALIGNMENT</span>
            <span className={`text-sm font-bold ${isCorridorAligned ? "text-emerald-400" : "text-rose-400"}`}>
              {isCorridorAligned ? "INSIDE APPROACH CONE" : "CORRIDOR EXCURSION"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CAPTURE LATCH STATUS</span>
            <span className="text-cyan-400 font-bold text-sm">
              {rangeM <= 0.5 ? "READY TO LOCK (PASSIVE IDSS)" : "STANDBY READY"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ABORT CORRIDOR ΔV</span>
            <span className="text-emerald-400 font-bold text-sm">+2.4 m/s (RCS COLD GAS)</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Guidance Sensors
        </h2>

        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border ${isVelocitySafe && isCorridorAligned ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              SAFETY ENVELOPE VERIFICATION
            </div>
            <div className={`text-2xl font-black flex items-center gap-2 ${isVelocitySafe && isCorridorAligned ? "text-emerald-400" : "text-rose-400"}`}>
              {isVelocitySafe && isCorridorAligned ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              {isVelocitySafe && isCorridorAligned ? "APPROACH NOMINAL" : "LIMIT EXCEEDED"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isVelocitySafe 
                ? "Relative velocity satisfies structural kinetic energy absorption thresholds for IDSS mechanical capture latches (<10 cm/s)." 
                : "VELOCITY VIOLATION: Excessive kinetic energy at interface. Fire retro-RCS thrusters to arrest closure rate."}
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Sensor Avionics</div>
            <div className="flex justify-between"><span className="text-slate-500">Flash LiDAR:</span><span className="text-emerald-400 font-bold">LOCKED (10 Hz)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Star Trackers:</span><span className="text-white">Dual Optical Heads</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Relative GPS (CDGPS):</span><span className="text-cyan-400 font-bold">Carrier-Phase RTK</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Target Range Uncertainty:</span><span className="text-white">±0.02 m (1-sigma)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Relative Attitude Pitch:</span><span className="text-white">0.08°</span></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              CW Dynamics Mechanics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Along V-bar glideslope, Coriolis acceleration (2n · v_y) pulls the chaser toward Earth. Continuous open-loop pulsed micro-thruster firings counteract orbital drift to maintain straight-line corridor transit.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
