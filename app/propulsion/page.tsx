"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Flame, Gauge, Scale, Zap, Timer, 
  Activity, Play, Square, RotateCcw, AlertTriangle, CheckCircle2 
} from "lucide-react"

type PropSystemType = "COLD_GAS" | "MONOPROP" | "BIPROP" | "HALL_EFFECT"

interface ThrusterSpec {
  name: string
  ispSec: number
  thrustN: number
  feedPressureBar: number
  propellant: string
  colorHex: number
}

const THRUSTER_PRESETS: Record<PropSystemType, ThrusterSpec> = {
  COLD_GAS: {
    name: "GN2 Cold Gas System",
    ispSec: 68,
    thrustN: 0.5,
    feedPressureBar: 12.0,
    propellant: "High-Pressure N2",
    colorHex: 0x38bdf8
  },
  MONOPROP: {
    name: "Hydrazine Monopropellant",
    ispSec: 225,
    thrustN: 5.0,
    feedPressureBar: 22.0,
    propellant: "Anhydrous N2H4",
    colorHex: 0xf59e0b
  },
  BIPROP: {
    name: "Hypergolic Bipropellant",
    ispSec: 318,
    thrustN: 22.0,
    feedPressureBar: 18.5,
    propellant: "MMH / NTO",
    colorHex: 0xf43f5e
  },
  HALL_EFFECT: {
    name: "Hall Effect Electric Thruster",
    ispSec: 1750,
    thrustN: 0.085,
    feedPressureBar: 2.8,
    propellant: "Xenon Gas (Xe)",
    colorHex: 0xa855f7
  }
}

export default function PropulsionPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // System Configuration State
  const [propType, setPropType] = useState<PropSystemType>("MONOPROP")
  const [dryMassKg, setDryMassKg] = useState(350)
  const [propLoadKg, setPropLoadKg] = useState(42)
  const [targetDeltaV, setTargetDeltaV] = useState(180)

  // Live Hot-Fire Simulation State
  const [isFiring, setIsFiring] = useState(false)
  const [burnElapsedSec, setBurnElapsedSec] = useState(0)
  const [currentPropMass, setCurrentPropMass] = useState(42)

  const spec = THRUSTER_PRESETS[propType]
  const G0 = 9.80665

  // Tsiolkovsky Rocket Equation: Δv = Isp * g0 * ln(m0 / mf)
  const totalMass0 = dryMassKg + propLoadKg
  const totalCapacityDeltaV = spec.ispSec * G0 * Math.log(totalMass0 / dryMassKg)

  // Mass flow rate: m_dot = F / (Isp * g0)
  const massFlowKgSec = spec.thrustN / (spec.ispSec * G0)

  // Propellant required for user-demanded Target Δv:
  // mf = m0 / exp(Δv / (Isp * g0)) => m_prop_req = m0 - mf
  const massRatioRequired = Math.exp(targetDeltaV / (spec.ispSec * G0))
  const finalMassForTarget = totalMass0 / massRatioRequired
  const propRequiredKg = Math.max(0, totalMass0 - finalMassForTarget)
  const propMarginPct = ((propLoadKg - propRequiredKg) / propLoadKg) * 100

  // Tank Blowdown Calculation: Assumes isothermal expansion (P1 * V_ullage1 = P2 * V_ullage2)
  const tankTotalVolL = 50
  const propDensityKgL = propType === "HALL_EFFECT" ? 5.89 : propType === "COLD_GAS" ? 0.8 : 1.02
  const propVolumeL = currentPropMass / propDensityKgL
  const ullageVolL = Math.max(5, tankTotalVolL - propVolumeL)
  const initialUllageL = Math.max(5, tankTotalVolL - (propLoadKg / propDensityKgL))
  const currentTankPressBar = spec.feedPressureBar * (initialUllageL / ullageVolL)

  // 3D Thruster Plume & Tank Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 0, 4.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 1.5))
    const spot = new THREE.DirectionalLight(0xffffff, 2.5)
    spot.position.set(5, 5, 5)
    scene.add(spot)

    const engineGroup = new THREE.Group()

    // 1. Titanium Diaphragm Tank (Translucent outer shell)
    const tankGeo = new THREE.SphereGeometry(0.8, 32, 32)
    const tankMat = new THREE.MeshPhysicalMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.35,
      wireframe: false
    })
    const tankMesh = new THREE.Mesh(tankGeo, tankMat)
    tankMesh.position.set(0, 0.5, 0)
    engineGroup.add(tankMesh)

    // Fluid Core
    const fluidFillRatio = Math.max(0.1, currentPropMass / propLoadKg)
    const fluidGeo = new THREE.SphereGeometry(0.72 * fluidFillRatio, 24, 24)
    const fluidMat = new THREE.MeshStandardMaterial({
      color: spec.colorHex,
      metalness: 0.3,
      roughness: 0.4,
      emissive: spec.colorHex,
      emissiveIntensity: 0.2
    })
    const fluidMesh = new THREE.Mesh(fluidGeo, fluidMat)
    fluidMesh.position.set(0, 0.5 - (1 - fluidFillRatio) * 0.3, 0)
    engineGroup.add(fluidMesh)

    // 2. Convergent-Divergent Nozzle Bell
    const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.32, 0.5, 24, 1, true)
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.95,
      roughness: 0.2,
      side: THREE.DoubleSide
    })
    const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat)
    nozzleMesh.position.set(0, -0.6, 0)
    engineGroup.add(nozzleMesh)

    // 3. Exhaust Plume Particle System
    const particleCount = 240
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities: { x: number; y: number; z: number; life: number }[] = []

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = 0
      positions[i * 3 + 1] = -0.8
      positions[i * 3 + 2] = 0
      velocities.push({
        x: (Math.random() - 0.5) * 0.15,
        y: -(Math.random() * 0.08 + 0.04),
        z: (Math.random() - 0.5) * 0.15,
        life: Math.random()
      })
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    const particleMat = new THREE.PointsMaterial({
      color: spec.colorHex,
      size: 0.06,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const plume = new THREE.Points(particleGeo, particleMat)
    engineGroup.add(plume)

    scene.add(engineGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      engineGroup.rotation.y += 0.003

      // Animate Plume Particles
      if (isFiring) {
        plume.visible = true
        const pos = particleGeo.attributes.position.array as Float32Array
        for (let i = 0; i < particleCount; i++) {
          velocities[i].life += 0.04
          pos[i * 3 + 0] += velocities[i].x
          pos[i * 3 + 1] += velocities[i].y
          pos[i * 3 + 2] += velocities[i].z

          if (velocities[i].life > 1.0) {
            velocities[i].life = 0
            pos[i * 3 + 0] = (Math.random() - 0.5) * 0.05
            pos[i * 3 + 1] = -0.8
            pos[i * 3 + 2] = (Math.random() - 0.5) * 0.05
          }
        }
        particleGeo.attributes.position.needsUpdate = true
      } else {
        plume.visible = false
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
  }, [propType, isFiring, currentPropMass, propLoadKg, spec])

  // Live Firing Clock Loop
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isFiring) {
      timer = setInterval(() => {
        setBurnElapsedSec(s => s + 0.5)
        setCurrentPropMass(m => {
          const next = m - massFlowKgSec * 0.5
          if (next <= 0) {
            setIsFiring(false)
            return 0
          }
          return next
        })
      }, 500)
    }
    return () => clearInterval(timer)
  }, [isFiring, massFlowKgSec])

  const resetTank = () => {
    setIsFiring(false)
    setBurnElapsedSec(0)
    setCurrentPropMass(propLoadKg)
  }

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: PROPULSION CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Flame className="w-5 h-5 text-amber-500" /> Propulsion &amp; Kinetics
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-1 uppercase tracking-wider">
            Tsiolkovsky Budget &amp; Blowdown Dynamics
          </p>
        </div>

        <div className="space-y-6 font-mono text-xs">
          {/* Thruster Class Selection */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Thruster Architecture
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["COLD_GAS", "MONOPROP", "BIPROP", "HALL_EFFECT"] as PropSystemType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setPropType(t); resetTank() }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    propType === t 
                      ? "bg-amber-950/40 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-[11px]">{t.replace("_", " ")}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Isp: {THRUSTER_PRESETS[t].ispSec}s</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mass Load Controls */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-2"><Scale className="w-3.5 h-3.5 text-cyan-400" /> DRY MASS:</span>
              <span className="text-white font-bold">{dryMassKg} kg</span>
            </div>
            <input 
              type="range" min="50" max="1500" step="10"
              value={dryMassKg}
              onChange={e => setDryMassKg(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-amber-400" /> PROP LOAD:</span>
              <span className="text-amber-400 font-bold">{propLoadKg} kg</span>
            </div>
            <input 
              type="range" min="5" max="300" step="1"
              value={propLoadKg}
              onChange={e => {
                const val = Number(e.target.value)
                setPropLoadKg(val)
                setCurrentPropMass(val)
              }}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-emerald-400" /> TARGET ΔV:</span>
              <span className="text-emerald-400 font-bold">{targetDeltaV} m/s</span>
            </div>
            <input 
              type="range" min="10" max="1200" step="10"
              value={targetDeltaV}
              onChange={e => setTargetDeltaV(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Hot Fire Test Control */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="text-slate-300 font-bold uppercase text-[11px] flex justify-between">
              <span>Hot-Fire Test Stand</span>
              <span className={isFiring ? "text-amber-400 animate-pulse font-bold" : "text-slate-500"}>
                {isFiring ? "FIRING ACTIVE" : "STANDBY"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFiring(!isFiring)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isFiring 
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
                    : "bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                }`}
              >
                {isFiring ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-slate-950" />}
                {isFiring ? "ABORT BURN" : "IGNITE THRUSTER"}
              </button>

              <button
                onClick={resetTank}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Tank"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Burn Time: {burnElapsedSec.toFixed(1)}s</span>
              <span>Flow: {(massFlowKgSec * 1000).toFixed(2)} g/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D CAD TANK & NOZZLE */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Hardware Inspection</div>
          <div className="text-xl font-black text-white">{spec.name}</div>
          <div className="text-xs text-amber-400 font-mono mt-0.5">Propellant: {spec.propellant}</div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Live Blowdown Gauge Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xl border border-slate-700 px-6 py-3 rounded-2xl flex items-center gap-8 font-mono text-xs shadow-2xl">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">TANK PRESSURE</span>
              <span className="text-white font-bold">{currentTankPressBar.toFixed(1)} bar</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">NOMINAL THRUST</span>
              <span className="text-amber-400 font-bold">{spec.thrustN} N</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">REMAINING MASS</span>
              <span className="text-emerald-400 font-bold">{currentPropMass.toFixed(2)} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: KINETIC BUDGETING */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" /> Kinetic Budget
        </h2>

        <div className="space-y-6">
          {/* Total Mission Capacity Highlight */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5">
            <div className="text-[10px] font-bold tracking-wider mb-1 text-amber-400/80">TOTAL MISSION CAPACITY ΔV</div>
            <div className="text-3xl font-black text-amber-400">
              {totalCapacityDeltaV.toFixed(1)} <span className="text-sm font-normal text-slate-400">m/s</span>
            </div>
          </div>

          {/* Mission Requirement Check */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="text-slate-400 font-bold tracking-wider border-b border-slate-800 pb-2 flex justify-between">
              <span>TARGET ΔV MARGIN</span>
              <span className={propMarginPct >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {propMarginPct >= 0 ? `+${propMarginPct.toFixed(1)}%` : `${propMarginPct.toFixed(1)}% DEFICIT`}
              </span>
            </div>
            
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Demanded Δv:</span>
                <span className="text-white font-bold">{targetDeltaV} m/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Propellant Required:</span>
                <span className={propRequiredKg > propLoadKg ? "text-rose-400 font-bold" : "text-white"}>
                  {propRequiredKg.toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Propellant Loaded:</span>
                <span className="text-amber-400">{propLoadKg} kg</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${propRequiredKg > propLoadKg ? "bg-rose-500" : "bg-emerald-500"}`} 
                style={{ width: `${Math.min(100, (propRequiredKg / propLoadKg) * 100)}%` }} 
              />
            </div>
          </div>

          {/* Blowdown Characteristics */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Feed System Specs</div>
            <div className="flex justify-between"><span className="text-slate-500">Feed Cycle:</span><span className="text-white">Regulated Blowdown</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Specific Impulse:</span><span className="text-amber-400">{spec.ispSec} s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Thrust-to-Weight (T/W):</span><span className="text-white">{(spec.thrustN / (totalMass0 * G0)).toFixed(4)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Burn Capacity:</span><span className="text-cyan-400">{(propLoadKg / massFlowKgSec).toFixed(0)} s</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
