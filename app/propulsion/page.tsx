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
  Flame, 
  Gauge, 
  Droplet,
  Thermometer,
  Rocket,
  ArrowDownToLine,
  Target
} from "lucide-react"

export default function PropulsionPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(1)
  const [isThrusting, setIsThrusting] = useState<boolean>(false)

  // Hardware Constants (Monopropellant Hydrazine System)
  const TANK_VOLUME_L = 60 // 60 Liter Titanium Tank
  const PROPELLANT_DENSITY_KG_L = 1.004 // Hydrazine (N2H4) density
  const INITIAL_PRESSANT_VOL_L = 15 // Initial Helium Ullage volume
  const INITIAL_PRESSURE_PSIA = 350 // Initial tank pressure
  
  const THRUST_N = 22 // 22 Newton main thruster
  const ISP_SEC = 230 // Monopropellant specific impulse
  const G0 = 9.80665 // Gravity constant
  const MASS_FLOW_RATE_KG_S = THRUST_N / (ISP_SEC * G0)

  // Kinetic state for decoupled WebGL loop
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 1,
    isThrusting: false,
    simTimeSec: 0,
    cameraYaw: 0.7,
    cameraPitch: 0.3,
    targetCameraYaw: 0.7,
    targetCameraPitch: 0.3,
    cameraDistance: 2.2,
    targetCameraDistance: 2.2,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 },
    
    // Thermodynamics State
    fuelMassKg: (TANK_VOLUME_L - INITIAL_PRESSANT_VOL_L) * PROPELLANT_DENSITY_KG_L,
    initialFuelMassKg: (TANK_VOLUME_L - INITIAL_PRESSANT_VOL_L) * PROPELLANT_DENSITY_KG_L,
    expendedDeltaVMps: 0
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    fuelMassKg: "0.00",
    fillFractionPct: "0.0",
    ullageVolL: "0.0",
    tankPressurePsia: "0.0",
    tankTempC: "21.5",
    massFlowRate: "0.000",
    thrustN: "0.0",
    expendedDeltaVMps: "0.0",
    remainingDeltaVMps: "0.0",
    isFiring: false
  })

  const [pressureHistory, setPressureHistory] = useState<number[]>(Array(40).fill(INITIAL_PRESSURE_PSIA))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
    simStateRef.current.isThrusting = isThrusting
  }, [isPlaying, timeScale, isThrusting])

  // Master WebGL Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 1000)
    camera.position.set(0, 1.0, 2.2)
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

    // Lighting
    const sunDir = new THREE.Vector3(5.0, 2.0, -3.0).normalize()
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.0)
    sunLight.position.copy(sunDir.clone().multiplyScalar(10))
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x061224, 1.2))

    // Inertial Frame Grid
    const gridHelper = new THREE.GridHelper(5, 10, 0x1e293b, 0x0f172a)
    scene.add(gridHelper)

    // Spacecraft Assembly (X-Ray Mode)
    const satGroup = new THREE.Group()

    // Translucent Chassis Bus
    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.6),
      new THREE.MeshStandardMaterial({ 
        color: 0x38bdf8, 
        roughness: 0.1, 
        metalness: 0.2,
        transparent: true,
        opacity: 0.15,
        wireframe: true
      })
    )
    satGroup.add(busMesh)
    
    // Internal Propellant Tank (Titanium Sphere)
    const tankGeo = new THREE.SphereGeometry(0.16, 32, 32)
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.9 })
    const tankMesh = new THREE.Mesh(tankGeo, tankMat)
    satGroup.add(tankMesh)

    // Propellant Plumbing / Feed Lines
    const pipeGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8)
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 1.0, roughness: 0.2 })
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat)
    pipeMesh.position.set(0, 0, -0.2)
    pipeMesh.rotation.x = Math.PI / 2
    satGroup.add(pipeMesh)

    // Main Engine Nozzle
    const nozzleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.05, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.8 })
    )
    nozzleMesh.position.set(0, 0, -0.34)
    nozzleMesh.rotation.x = Math.PI / 2
    satGroup.add(nozzleMesh)

    // Dynamic Thrust Plume
    const plumeGeo = new THREE.ConeGeometry(0.06, 0.4, 16, 1, true)
    const plumeMat = new THREE.MeshBasicMaterial({ 
      color: 0x38bdf8, 
      transparent: true, 
      opacity: 0.0, 
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat)
    plumeMesh.position.set(0, 0, -0.54)
    plumeMesh.rotation.x = -Math.PI / 2
    satGroup.add(plumeMesh)

    scene.add(satGroup)

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
      simStateRef.current.targetCameraDistance = Math.max(1.0, Math.min(5.0, simStateRef.current.targetCameraDistance + zoomDelta))
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

      const timeStep = dt * simStateRef.current.timeScale

      if (simStateRef.current.isPlaying) {
        simStateRef.current.simTimeSec += timeStep
        
        // Propellant Drain Physics
        if (simStateRef.current.isThrusting && simStateRef.current.fuelMassKg > 0) {
          const massBurned = Math.min(simStateRef.current.fuelMassKg, MASS_FLOW_RATE_KG_S * timeStep)
          simStateRef.current.fuelMassKg -= massBurned
          
          // Tsiolkovsky integration: dV = Isp * g0 * ln(m0 / m1)
          const dryMass = (mission.dryMassKg || 180)
          const m0 = dryMass + simStateRef.current.fuelMassKg + massBurned
          const m1 = dryMass + simStateRef.current.fuelMassKg
          if (m1 > 0) {
            simStateRef.current.expendedDeltaVMps += ISP_SEC * G0 * Math.log(m0 / m1)
          }
        }
      }

      // Visual Plume Feedback
      if (simStateRef.current.isThrusting && simStateRef.current.fuelMassKg > 0) {
        plumeMat.opacity = 0.8 + Math.random() * 0.2 // Flicker
        plumeMesh.scale.set(1.0 + Math.random()*0.1, 1.0 + Math.random()*0.2, 1.0 + Math.random()*0.1)
      } else {
        plumeMat.opacity = 0
      }

      // Slow idle rotation of the vehicle
      satGroup.rotation.y = simStateRef.current.simTimeSec * 0.05
      satGroup.rotation.x = Math.sin(simStateRef.current.simTimeSec * 0.02) * 0.1

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

      // UI Dispatch
      if (now - lastUiSync > 250) {
        lastUiSync = now

        // Thermodynamic Blowdown Curve Calculation (P1 V1 = P2 V2)
        const fuelVolL = simStateRef.current.fuelMassKg / PROPELLANT_DENSITY_KG_L
        const ullageVolL = TANK_VOLUME_L - fuelVolL
        // Isothermal assumption for simplicity: P = P0 * (V0 / V)
        const currentPressurePsia = INITIAL_PRESSURE_PSIA * (INITIAL_PRESSANT_VOL_L / ullageVolL)
        
        const isFiring = simStateRef.current.isThrusting && simStateRef.current.fuelMassKg > 0
        const fillFraction = (simStateRef.current.fuelMassKg / simStateRef.current.initialFuelMassKg) * 100

        // Remaining Delta V calculation
        const dryMass = (mission.dryMassKg || 180)
        const mWet = dryMass + simStateRef.current.fuelMassKg
        const remDeltaV = ISP_SEC * G0 * Math.log(mWet / dryMass)

        setTelemetryUI({
          simTimeSec: Math.round(simStateRef.current.simTimeSec),
          fuelMassKg: simStateRef.current.fuelMassKg.toFixed(2),
          fillFractionPct: fillFraction.toFixed(1),
          ullageVolL: ullageVolL.toFixed(1),
          tankPressurePsia: currentPressurePsia.toFixed(1),
          tankTempC: isFiring ? (21.5 - (fillFraction < 50 ? 2.5 : 0)).toFixed(1) : "21.5", // Simulating slight adiabatic cooling
          massFlowRate: isFiring ? MASS_FLOW_RATE_KG_S.toFixed(4) : "0.0000",
          thrustN: isFiring ? THRUST_N.toFixed(1) : "0.0",
          expendedDeltaVMps: simStateRef.current.expendedDeltaVMps.toFixed(1),
          remainingDeltaVMps: remDeltaV.toFixed(1),
          isFiring
        })

        setPressureHistory(prev => [...prev.slice(1), currentPressurePsia])
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
  }, [mission])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      {/* 3D WEBGL KERNEL */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* FLOATING LEFT HUD: THERMODYNAMICS */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Tank State */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-cyan-400" />
              PROPELLANT TANK STATE
            </span>
            <span className="text-[10px] text-cyan-400 border border-cyan-500/20 bg-cyan-950/50 px-2 py-0.5 rounded">
              N2H4 / He PRESSANT
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">LIQUID MASS REMAINING</span>
              <span className="text-white font-bold">{telemetryUI.fuelMassKg} kg</span>
            </div>
            
            <div className="pt-1 pb-2">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>TANK FILL LEVEL</span>
                <span>{telemetryUI.fillFractionPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-200 ${parseFloat(telemetryUI.fillFractionPct) < 20 ? "bg-rose-500" : "bg-cyan-500"}`}
                  style={{ width: `${telemetryUI.fillFractionPct}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">GAS ULLAGE VOLUME (He)</span>
              <span className="text-amber-400 font-bold">{telemetryUI.ullageVolL} L</span>
            </div>
          </div>
        </div>

        {/* Blowdown Thermodynamics */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-orange-400" />
              BLOWDOWN KINETICS
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">TANK PRESSURE</span>
              <span className={parseFloat(telemetryUI.tankPressurePsia) < 120 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {telemetryUI.tankPressurePsia} psia
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">BULK TEMPERATURE</span>
              <span className="text-white font-bold">{telemetryUI.tankTempC} &deg;C</span>
            </div>
          </div>

          {/* Pressure Decay Curve */}
          <div className="pt-2">
            <div className="text-[10px] text-slate-500 mb-1 flex justify-between">
              <span>P1 V1 = P2 V2 CURVE</span>
            </div>
            <div className="h-10 w-full bg-slate-950 rounded border border-slate-800 flex items-end px-0.5 gap-px overflow-hidden">
              {pressureHistory.map((val, idx) => {
                const hPercent = Math.max(5, Math.min(100, (val / 350) * 100))
                return (
                  <div
                    key={idx}
                    className={`flex-1 transition-all rounded-t-sm ${val < 150 ? "bg-rose-500/80" : "bg-orange-500/80"}`}
                    style={{ height: `${hPercent}%` }}
                  />
                )
              })}
            </div>
          </div>
        </div>

      </div>

      {/* FLOATING RIGHT HUD: ENGINE FIRING & DELTA-V */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Engine Kinematics */}
        <div className={`p-4 rounded-xl backdrop-blur-md border shadow-2xl space-y-3 transition-all ${
          telemetryUI.isFiring 
            ? "bg-slate-950/90 border-orange-500/60 shadow-orange-500/20" 
            : "bg-slate-950/75 border-slate-800/80"
        }`}>
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Rocket className={`w-4 h-4 ${telemetryUI.isFiring ? "text-orange-400 animate-pulse" : "text-slate-500"}`} />
              THRUSTER KINEMATICS
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              telemetryUI.isFiring 
                ? "bg-orange-950 border border-orange-500/40 text-orange-300" 
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}>
              {telemetryUI.isFiring ? "ENGINE BURNING" : "IDLE"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SPECIFIC IMPULSE (Isp)</span>
              <span className="text-white font-bold">230 s</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">MASS FLOW RATE (ṁ)</span>
              <span className={telemetryUI.isFiring ? "text-amber-400 font-bold" : "text-slate-500 font-bold"}>
                {telemetryUI.massFlowRate} kg/s
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">GENERATED THRUST</span>
              <span className={telemetryUI.isFiring ? "text-orange-400 font-bold" : "text-white font-bold"}>
                {telemetryUI.thrustN} N
              </span>
            </div>
          </div>

          {/* Manual Fire Button */}
          <button
            onMouseDown={() => setIsThrusting(true)}
            onMouseUp={() => setIsThrusting(false)}
            onMouseLeave={() => setIsThrusting(false)}
            onTouchStart={() => setIsThrusting(true)}
            onTouchEnd={() => setIsThrusting(false)}
            className={`w-full py-3 rounded-lg font-black uppercase tracking-widest transition-all cursor-crosshair select-none ${
              telemetryUI.isFiring 
                ? "bg-orange-500 text-slate-950 scale-[0.98] shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)]" 
                : "bg-slate-800 text-orange-400 hover:bg-slate-700 border border-orange-500/20 shadow-lg shadow-orange-500/10"
            }`}
          >
            {telemetryUI.isFiring ? "FIRING THRUSTER..." : "HOLD TO FIRE THRUSTER"}
          </button>
        </div>

        {/* Delta-V Budget */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              DELTA-V BUDGET
            </span>
            <span className="text-[10px] text-emerald-400">TSIOLKOVSKY EQ</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">EXPENDED ΔV</span>
              <span className="text-amber-400 font-bold">{telemetryUI.expendedDeltaVMps} m/s</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">REMAINING ΔV</span>
              <span className="text-emerald-400 font-bold">{telemetryUI.remainingDeltaVMps} m/s</span>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">VIEW:</span>
            <span className="text-cyan-400 font-bold">X-RAY TRANSLUCENT BUS</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>SIM TIME: <strong className="text-white">{telemetryUI.simTimeSec}s</strong></span>
        </div>
      </div>

    </div>
  )
}
