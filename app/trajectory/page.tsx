"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Rocket, Activity, Gauge, Timer, Layers, ShieldCheck, 
  Play, Square, RotateCcw, Compass, BarChart3, AlertCircle 
} from "lucide-react"

type VehiclePreset = "FALCON_HEAVY" | "ELECTRON" | "ARIANE_6" | "VULCAN"

interface VehicleSpec {
  name: string
  liftoffMassKg: number
  liftoffThrustKn: number
  stages: number
  maxPayloadKg: number
  mecoSec: number
  fairingSepSec: number
  secoSec: number
  colorHex: number
}

const VEHICLES: Record<VehiclePreset, VehicleSpec> = {
  FALCON_HEAVY: {
    name: "Falcon-Class Heavy Lift",
    liftoffMassKg: 549000,
    liftoffThrustKn: 7607,
    stages: 2,
    maxPayloadKg: 22800,
    mecoSec: 162,
    fairingSepSec: 215,
    secoSec: 510,
    colorHex: 0x38bdf8
  },
  ELECTRON: {
    name: "Electron-Class Dedicated SmallSat",
    liftoffMassKg: 13000,
    liftoffThrustKn: 224,
    stages: 2,
    maxPayloadKg: 300,
    mecoSec: 150,
    fairingSepSec: 185,
    secoSec: 540,
    colorHex: 0xf59e0b
  },
  ARIANE_6: {
    name: "Ariane 6 Heavy Lift",
    liftoffMassKg: 530000,
    liftoffThrustKn: 8500,
    stages: 2,
    maxPayloadKg: 21500,
    mecoSec: 135,
    fairingSepSec: 202,
    secoSec: 525,
    colorHex: 0x10b981
  },
  VULCAN: {
    name: "Vulcan Centaur Next-Gen",
    liftoffMassKg: 546700,
    liftoffThrustKn: 8900,
    stages: 2,
    maxPayloadKg: 19000,
    mecoSec: 140,
    fairingSepSec: 210,
    secoSec: 515,
    colorHex: 0xa855f7
  }
}

export default function TrajectoryPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Configuration
  const [vehicle, setVehicle] = useState<VehiclePreset>("FALCON_HEAVY")
  const [targetAltKm, setTargetAltKm] = useState(300) // LEO insertion altitude
  const [azimuthDeg, setAzimuthDeg] = useState(90) // Eastward prograde launch
  const [payloadMassKg, setPayloadMassKg] = useState(4500)

  // Simulation Clock (T-0 to T+540s)
  const [simTimeSec, setSimTimeSec] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  const spec = VEHICLES[vehicle]

  // Flight Dynamics Kinematic Model (Parametric Gravity Turn Ascent)
  const progress = Math.min(1.0, simTimeSec / spec.secoSec)

  // Altitude curve: quadratic ramp in dense atmosphere, exponential orbital flattening
  const altitudeKm = Math.min(targetAltKm, Math.pow(progress, 1.8) * targetAltKm)

  // Velocity: Starts at 0, ramps to orbital injection velocity (~7,780 m/s for 300km LEO)
  const targetOrbitalVelKms = Math.sqrt(398600.4418 / (6371 + targetAltKm))
  const velocityKms = progress * targetOrbitalVelKms
  const velocityMs = velocityKms * 1000

  // Downrange distance (km)
  const downrangeKm = Math.pow(progress, 2.2) * 1450

  // Atmospheric Density & Dynamic Pressure (Max-Q):
  // q = 0.5 * rho * v^2
  const scaleHeightKm = 7.2
  const rho0 = 1.225 // kg/m^3
  const rho = altitudeKm > 100 ? 0 : rho0 * Math.exp(-altitudeKm / scaleHeightKm)
  const dynamicPressureKpa = (0.5 * rho * Math.pow(velocityMs, 2)) / 1000 // kPa

  // Flight Path Angle (γ): Starts at 90° (vertical liftoff), pitches down to 0° (horizontal insertion)
  const flightPathAngleDeg = Math.max(0, 90 * (1 - Math.pow(progress, 0.7)))

  // Acceleration / G-Force
  const gForce = simTimeSec < 5 ? 1.2 : 1.2 + Math.pow(progress, 1.5) * 2.8

  // Flight Events
  const isMECO = simTimeSec >= spec.mecoSec
  const isFairingSep = simTimeSec >= spec.fairingSepSec
  const isSECO = simTimeSec >= spec.secoSec

  // Timeline loop
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSec(t => {
          if (t >= spec.secoSec) {
            setIsPlaying(false)
            return spec.secoSec
          }
          return t + 2
        })
      }, 100)
    }
    return () => clearInterval(timer)
  }, [isPlaying, spec.secoSec])

  // 3D Ascent Trajectory Visualizer
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 80, 220)
    camera.lookAt(60, 20, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.5))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.0)
    sun.position.set(100, 150, 80)
    scene.add(sun)

    // 1. Earth Curvature Arc
    const earthRadius = 600
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.15)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earth.position.set(0, -earthRadius, 0)
    scene.add(earth)

    // Atmospheric Glow Layer
    const atmoGeo = new THREE.SphereGeometry(earthRadius + 15, 64, 16, 0, Math.PI * 2, 0, Math.PI * 0.15)
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    })
    const atmo = new THREE.Mesh(atmoGeo, atmoMat)
    atmo.position.copy(earth.position)
    scene.add(atmo)

    // 2. Trajectory Profile Curve (From Launch Pad to Orbital Insertion)
    const curvePoints: THREE.Vector3[] = []
    const totalSteps = 120
    for (let i = 0; i <= totalSteps; i++) {
      const p = i / totalSteps
      const x = p * 150 // Downrange scale
      const y = Math.pow(p, 1.8) * 35 // Altitude scale
      const z = Math.sin(p * Math.PI * 0.5) * 8 // Azimuth deviation
      curvePoints.push(new THREE.Vector3(x, y, z))
    }
    const trajCurve = new THREE.CatmullRomCurve3(curvePoints)
    const trajGeo = new THREE.BufferGeometry().setFromPoints(trajCurve.getPoints(120))
    const trajMat = new THREE.LineBasicMaterial({ color: spec.colorHex, linewidth: 2 })
    const trajLine = new THREE.Line(trajGeo, trajMat)
    scene.add(trajLine)

    // Key Event Markers along Trajectory
    const addMarker = (tRatio: number, labelColor: number) => {
      const pt = trajCurve.getPoint(tRatio)
      const markerGeo = new THREE.SphereGeometry(0.8, 16, 16)
      const markerMat = new THREE.MeshBasicMaterial({ color: labelColor })
      const marker = new THREE.Mesh(markerGeo, markerMat)
      marker.position.copy(pt)
      scene.add(marker)
    }

    addMarker(spec.mecoSec / spec.secoSec, 0xf59e0b) // MECO
    addMarker(spec.fairingSepSec / spec.secoSec, 0x10b981) // Fairing Sep
    addMarker(1.0, 0x38bdf8) // SECO Insertion

    // 3. Rocket Vehicle Marker
    const rocketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.0, 4.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 })
    )
    rocketMesh.rotation.z = -Math.PI / 2
    scene.add(rocketMesh)

    // Exhaust Flame
    const flameGeo = new THREE.ConeGeometry(0.8, 3.5, 16)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    const flameMesh = new THREE.Mesh(flameGeo, flameMat)
    flameMesh.rotation.z = Math.PI / 2
    flameMesh.position.set(-3.0, 0, 0)
    rocketMesh.add(flameMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Position rocket along trajectory curve based on current progress
      const currentPoint = trajCurve.getPoint(progress)
      rocketMesh.position.copy(currentPoint)

      // Orient vehicle tangent to trajectory curve
      const tangent = trajCurve.getTangent(progress).normalize()
      rocketMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent)

      // Flicker flame
      if (simTimeSec < spec.secoSec) {
        flameMesh.visible = true
        flameMesh.scale.set(1 + Math.random() * 0.2, 1 + Math.random() * 0.4, 1 + Math.random() * 0.2)
      } else {
        flameMesh.visible = false
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
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [spec, progress, simTimeSec])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: LAUNCH VEHICLE & TARGETS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Rocket className="w-5 h-5 text-cyan-400" /> Ascent &amp; Trajectory
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Multi-Stage Gravity Turn &amp; Max-Q Kinematics
          </p>
        </div>

        <div className="space-y-6">
          {/* Vehicle Selector */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Launch Vehicle Architecture
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["FALCON_HEAVY", "ELECTRON", "ARIANE_6", "VULCAN"] as VehiclePreset[]).map(v => (
                <button
                  key={v}
                  onClick={() => { setVehicle(v); setSimTimeSec(0); setIsPlaying(true) }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    vehicle === v 
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-[11px] truncate">{VEHICLES[v].name.split(" ")[0]}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cap: {VEHICLES[v].maxPayloadKg.toLocaleString()} kg</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mission Targets */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Target Insertion Vector
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">TARGET ALTITUDE:</span>
                <span className="text-emerald-400 font-bold">{targetAltKm} km LEO</span>
              </div>
              <input 
                type="range" min="180" max="800" step="10"
                value={targetAltKm}
                onChange={e => setTargetAltKm(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">LAUNCH AZIMUTH:</span>
                <span className="text-cyan-400 font-bold">{azimuthDeg}° (PROGRADE)</span>
              </div>
              <input 
                type="range" min="35" max="145" step="1"
                value={azimuthDeg}
                onChange={e => setAzimuthDeg(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">PAYLOAD MASS:</span>
                <span className="text-amber-400 font-bold">{payloadMassKg.toLocaleString()} kg</span>
              </div>
              <input 
                type="range" min="100" max={spec.maxPayloadKg} step="100"
                value={payloadMassKg}
                onChange={e => setPayloadMassKg(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Timeline Playback Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Mission Clock</span>
              <span className="text-cyan-400 font-bold font-mono text-sm">
                T+{simTimeSec.toString().padStart(3, "0")}s
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
                {isPlaying ? "HOLD TRAJECTORY" : "RESUME ASCENT"}
              </button>

              <button
                onClick={() => { setSimTimeSec(0); setIsPlaying(true) }}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart T-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Flight Milestones */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[10px]">
              <div className="flex justify-between items-center">
                <span className={simTimeSec >= 75 && simTimeSec <= 85 ? "text-rose-400 font-bold animate-pulse" : "text-slate-500"}>
                  • MAX-Q (MAX DYNAMIC PRESSURE)
                </span>
                <span className="text-slate-400">T+80s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isMECO ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  • MAIN ENGINE CUTOFF (MECO)
                </span>
                <span className="text-slate-400">T+{spec.mecoSec}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isFairingSep ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  • PAYLOAD FAIRING JETTISON
                </span>
                <span className="text-slate-400">T+{spec.fairingSepSec}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isSECO ? "text-cyan-400 font-bold" : "text-slate-500"}>
                  • ORBITAL INJECTION (SECO)
                </span>
                <span className="text-slate-400">T+{spec.secoSec}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D TRAJECTORY FLIGHT VIEW */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Ascent Profile</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">{velocityKms.toFixed(2)} km/s</span>
            <span className="text-slate-500 text-sm">INERTIAL VELOCITY</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-emerald-400">ALTITUDE: {altitudeKm.toFixed(1)} km</span>
            <span className="text-cyan-400">DOWNRANGE: {downrangeKm.toFixed(0)} km</span>
            <span className="text-amber-400">PITCH: {flightPathAngleDeg.toFixed(1)}°</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Telemetry Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">DYNAMIC PRESSURE (q)</span>
              <span className={`text-sm font-bold ${dynamicPressureKpa > 30 ? "text-rose-400 font-black animate-pulse" : "text-white"}`}>
                {dynamicPressureKpa.toFixed(1)} kPa
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">LONGITUDINAL ACCEL</span>
            <span className="text-cyan-400 font-bold text-sm">+{gForce.toFixed(2)} G</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">STAGE STATUS</span>
            <span className="text-emerald-400 font-bold text-sm">
              {simTimeSec < spec.mecoSec ? "STAGE 1 BOOST" : simTimeSec < spec.secoSec ? "STAGE 2 VACUUM" : "ORBIT INSERTION"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">REMAINING ΔV TO ORBIT</span>
            <span className="text-amber-400 font-bold text-sm">
              {Math.max(0, targetOrbitalVelKms * 1000 - velocityMs).toFixed(0)} m/s
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: LAUNCH VEHICLE DYNAMICS */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Vehicle Telemetry
        </h2>

        <div className="space-y-6">
          {/* Max-Q Alert Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Max-Q Dynamic Stress</span>
              <span className={dynamicPressureKpa > 30 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {dynamicPressureKpa > 30 ? "HIGH STRESS" : "NOMINAL"}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${dynamicPressureKpa > 30 ? "bg-rose-500" : "bg-cyan-500"}`} 
                style={{ width: `${Math.min(100, (dynamicPressureKpa / 40) * 100)}%` }} 
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Limit: 38.5 kPa</span>
              <span>Alt: {altitudeKm.toFixed(1)} km</span>
            </div>
          </div>

          {/* Staging & Burn Times */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Ascent Milestone Schedule</div>
            <div className="flex justify-between"><span className="text-slate-500">Liftoff Thrust:</span><span className="text-white font-bold">{spec.liftoffThrustKn} kN</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Liftoff T/W Ratio:</span><span className="text-emerald-400 font-bold">{(spec.liftoffThrustKn / ((spec.liftoffMassKg * 9.80665) / 1000)).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">MECO Window:</span><span className="text-amber-400">{spec.mecoSec}s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Target Injection:</span><span className="text-cyan-400 font-bold">{targetOrbitalVelKms.toFixed(3)} km/s</span></div>
          </div>

          {/* Payload Margin */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Fairing Capacity</span>
              <span className="text-emerald-400 font-bold">
                {(((spec.maxPayloadKg - payloadMassKg) / spec.maxPayloadKg) * 100).toFixed(1)}% MARGIN
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Payload mass fits comfortably within vehicle SSO envelope with sufficient performance reserves for reserve margins.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
