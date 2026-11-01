"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { createHighFidelitySatellite } from "@/lib/cad"
import { 
  Compass, RotateCw, Gauge, Zap, Crosshair, 
  ShieldCheck, AlertCircle, RefreshCw, Activity 
} from "lucide-react"

type PointingMode = "NADIR" | "SUN" | "TARGET_TRACK" | "INERTIAL_HOLD"

export default function ADCSPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Attitude State (Euler Angles in Degrees)
  const [pitchDeg, setPitchDeg] = useState(0)
  const [rollDeg, setRollDeg] = useState(0)
  const [yawDeg, setYawDeg] = useState(0)
  const [mode, setMode] = useState<PointingMode>("NADIR")
  const [isSlewing, setIsSlewing] = useState(false)

  // Reaction Wheel Momentum Saturation (Max 0.2 Nms per wheel)
  const [wheelMomentum, setWheelMomentum] = useState({
    rw1: 0.08,
    rw2: 0.12,
    rw3: 0.05,
    rw4: 0.17 // Near saturation limit
  })

  // Quaternion Calculations
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(pitchDeg),
    THREE.MathUtils.degToRad(yawDeg),
    THREE.MathUtils.degToRad(rollDeg),
    'XYZ'
  )
  const quaternion = new THREE.Quaternion().setFromEuler(euler)

  // 3D Gimbal & Spacecraft Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(3, 2, 4)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 2.0))
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0)
    sunLight.position.set(10, 5, 8)
    scene.add(sunLight)

    // Reference Gimbal Rings
    const createGimbalRing = (radius: number, color: number, axis: 'x' | 'y' | 'z') => {
      const ringGeo = new THREE.RingGeometry(radius, radius + 0.015, 64)
      const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      if (axis === 'x') ring.rotation.y = Math.PI / 2
      if (axis === 'y') ring.rotation.x = Math.PI / 2
      return ring
    }

    const gimbalGroup = new THREE.Group()
    gimbalGroup.add(createGimbalRing(1.8, 0x38bdf8, 'x')) // Pitch (X)
    gimbalGroup.add(createGimbalRing(1.9, 0xf43f5e, 'y')) // Yaw (Y)
    gimbalGroup.add(createGimbalRing(2.0, 0x10b981, 'z')) // Roll (Z)
    scene.add(gimbalGroup)

    // Spacecraft Model
    const satGroup = createHighFidelitySatellite(0.9)
    scene.add(satGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Smooth interpolation toward target Euler angles
      satGroup.quaternion.slerp(quaternion, 0.1)

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
  }, [pitchDeg, rollDeg, yawDeg])

  const executeSlew = (targetP: number, targetR: number, targetY: number, newMode: PointingMode) => {
    setIsSlewing(true)
    setMode(newMode)
    setPitchDeg(targetP)
    setRollDeg(targetR)
    setYawDeg(targetY)
    setTimeout(() => setIsSlewing(false), 800)
  }

  const dumpMomentum = () => {
    setWheelMomentum({ rw1: 0.02, rw2: 0.03, rw3: 0.02, rw4: 0.03 })
  }

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: POINTING MODES & SLEW CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Compass className="w-5 h-5 text-cyan-400" /> ADCS Kinematics
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-1 uppercase tracking-wider">
            Attitude Determination &amp; Pointing Control
          </p>
        </div>

        <div className="space-y-6 font-mono text-xs">
          {/* Pointing Modes */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" /> Target Pointing Frame
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => executeSlew(0, 0, 0, "NADIR")}
                className={`p-3 rounded-xl border text-left transition-all ${mode === "NADIR" ? "bg-cyan-950/60 border-cyan-500 text-cyan-400" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"}`}
              >
                <div className="font-bold">NADIR POINT</div>
                <div className="text-[10px] text-slate-500 mt-1">Earth Center Align</div>
              </button>

              <button 
                onClick={() => executeSlew(-45, 15, 90, "SUN")}
                className={`p-3 rounded-xl border text-left transition-all ${mode === "SUN" ? "bg-amber-950/60 border-amber-500 text-amber-400" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"}`}
              >
                <div className="font-bold">SUN SAFE</div>
                <div className="text-[10px] text-slate-500 mt-1">Array Max Solar Lux</div>
              </button>

              <button 
                onClick={() => executeSlew(35, -20, 180, "TARGET_TRACK")}
                className={`p-3 rounded-xl border text-left transition-all ${mode === "TARGET_TRACK" ? "bg-fuchsia-950/60 border-fuchsia-500 text-fuchsia-400" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"}`}
              >
                <div className="font-bold">GS TRACK</div>
                <div className="text-[10px] text-slate-500 mt-1">Ground Station Slew</div>
              </button>

              <button 
                onClick={() => executeSlew(10, 10, 45, "INERTIAL_HOLD")}
                className={`p-3 rounded-xl border text-left transition-all ${mode === "INERTIAL_HOLD" ? "bg-emerald-950/60 border-emerald-500 text-emerald-400" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"}`}
              >
                <div className="font-bold">INERTIAL</div>
                <div className="text-[10px] text-slate-500 mt-1">ECI Fixed Vector</div>
              </button>
            </div>
          </div>

          {/* Manual Euler Angle Sliders */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
              Manual Gimbal Override
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>PITCH (X):</span>
                <span className="text-cyan-400 font-bold">{pitchDeg}°</span>
              </div>
              <input 
                type="range" min="-180" max="180" value={pitchDeg}
                onChange={e => { setPitchDeg(Number(e.target.value)); setMode("INERTIAL_HOLD") }}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>ROLL (Z):</span>
                <span className="text-emerald-400 font-bold">{rollDeg}°</span>
              </div>
              <input 
                type="range" min="-180" max="180" value={rollDeg}
                onChange={e => { setRollDeg(Number(e.target.value)); setMode("INERTIAL_HOLD") }}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>YAW (Y):</span>
                <span className="text-rose-400 font-bold">{yawDeg}°</span>
              </div>
              <input 
                type="range" min="-180" max="180" value={yawDeg}
                onChange={e => { setYawDeg(Number(e.target.value)); setMode("INERTIAL_HOLD") }}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D INTERACTIVE GIMBAL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Attitude State</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white">{mode}</span>
            {isSlewing && (
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-400 text-[10px] animate-pulse">
                SLEWING 1.4°/s
              </span>
            )}
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Quaternion HUD Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xl border border-slate-700 px-6 py-3 rounded-2xl flex items-center gap-6 font-mono text-xs shadow-2xl">
          <div><span className="text-slate-500">q0: </span><span className="text-white font-bold">{quaternion.w.toFixed(4)}</span></div>
          <div><span className="text-slate-500">q1: </span><span className="text-cyan-400 font-bold">{quaternion.x.toFixed(4)}</span></div>
          <div><span className="text-slate-500">q2: </span><span className="text-rose-400 font-bold">{quaternion.y.toFixed(4)}</span></div>
          <div><span className="text-slate-500">q3: </span><span className="text-emerald-400 font-bold">{quaternion.z.toFixed(4)}</span></div>
        </div>
      </div>

      {/* RIGHT PANEL: REACTION WHEELS & MAGNETORQUERS */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" /> Reaction Wheels (4x)
        </h2>

        <div className="space-y-5">
          {([
            { id: "RW-1", val: wheelMomentum.rw1, rpm: 2420 },
            { id: "RW-2", val: wheelMomentum.rw2, rpm: 3680 },
            { id: "RW-3", val: wheelMomentum.rw3, rpm: 1540 },
            { id: "RW-4", val: wheelMomentum.rw4, rpm: 5120 }
          ]).map((rw, i) => {
            const pct = (rw.val / 0.2) * 100
            const isWarn = pct > 80
            return (
              <div key={i} className="bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{rw.id}</span>
                  <span className={`text-[11px] font-bold ${isWarn ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                    {rw.val.toFixed(3)} / 0.20 Nms
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${isWarn ? "bg-rose-500" : "bg-cyan-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Speed: {rw.rpm} RPM</span>
                  <span>{pct.toFixed(0)}% Capacity</span>
                </div>
              </div>
            )
          })}

          {/* Magnetorquer Desaturation Command */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="text-slate-400 font-bold uppercase mb-2">Magnetic Desaturation</div>
            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
              Fire magnetic torque rods against Earth's B-field to dump accumulated wheel angular momentum without expending thruster propellant.
            </p>
            <button 
              onClick={dumpMomentum}
              className="w-full py-3 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-400 font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Desaturate Wheels
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
