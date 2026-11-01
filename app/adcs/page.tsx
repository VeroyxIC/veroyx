"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import * as THREE from "three"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  Compass, 
  Crosshair, 
  Navigation,
  RefreshCcw,
  Aperture,
  Target,
  Gauge
} from "lucide-react"

type AdcsMode = "NADIR_TRACKING" | "SUN_POINTING" | "TARGET_SLEW" | "SAFE_HOLD"

export default function AdcsPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [controlMode, setControlMode] = useState<AdcsMode>("NADIR_TRACKING")

  // Kinetic state for decoupled WebGL loop
  const simStateRef = useRef({
    isPlaying: true,
    controlMode: "NADIR_TRACKING" as AdcsMode,
    simTimeSec: 0,
    cameraYaw: 0.8,
    cameraPitch: 0.4,
    targetCameraYaw: 0.8,
    targetCameraPitch: 0.4,
    cameraDistance: 3.5,
    targetCameraDistance: 3.5,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 },
    // Vehicle Attitude State
    currentQuat: new THREE.Quaternion(),
    targetQuat: new THREE.Quaternion(),
    wheelRpms: [3500, 3500, 3500, 3500] // Tetrahedral RWA
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    qx: "0.0000", qy: "0.0000", qz: "0.0000", qw: "1.0000",
    rollDeg: "0.0", pitchDeg: "0.0", yawDeg: "0.0",
    slewRateDegS: "0.00",
    pointingErrorDeg: "0.00",
    rw1Rpm: 3500, rw2Rpm: 3500, rw3Rpm: 3500, rw4Rpm: 3500,
    starTrackerStatus: "LOCKED (3 STARS)"
  })

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.controlMode = controlMode
  }, [isPlaying, controlMode])

  // Master WebGL Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040a")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 1000)
    camera.position.set(0, 1.5, 3.5)
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
    const starField = new THREE.Points(starGeo, starMat)
    scene.add(starField)

    // Directional Sunlight (Fixed in Inertial Frame)
    const sunDir = new THREE.Vector3(5.0, 2.0, -3.0).normalize()
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.0)
    sunLight.position.copy(sunDir.clone().multiplyScalar(10))
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x061224, 0.6))

    // Inertial Frame Grid & Reference Vectors
    const gridHelper = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a)
    scene.add(gridHelper)

    // Sun Vector (Yellow)
    const sunArrow = new THREE.ArrowHelper(sunDir, new THREE.Vector3(0,0,0), 2, 0xf59e0b, 0.1, 0.05)
    scene.add(sunArrow)
    
    // Nadir Vector (Cyan, simulating Earth below)
    const nadirDir = new THREE.Vector3(0, -1, 0)
    const nadirArrow = new THREE.ArrowHelper(nadirDir, new THREE.Vector3(0,0,0), 2, 0x06b6d4, 0.1, 0.05)
    scene.add(nadirArrow)

    // Spacecraft Assembly (Body Frame)
    const satGroup = new THREE.Group()

    // Chassis
    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.8 })
    )
    satGroup.add(busMesh)

    // Solar Panels
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.1, metalness: 0.9 })
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.35), wingMat)
    leftWing.position.set(0.8, 0, 0)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.35), wingMat)
    rightWing.position.set(-0.8, 0, 0)
    satGroup.add(leftWing)
    satGroup.add(rightWing)

    // Payload Boresight Instrument (+Z Axis)
    const payloadMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.7 })
    )
    payloadMesh.rotation.x = Math.PI / 2
    payloadMesh.position.set(0, 0, 0.4)
    satGroup.add(payloadMesh)

    // Local Body Axes (RGB = XYZ)
    const axesHelper = new THREE.AxesHelper(0.8)
    satGroup.add(axesHelper)

    scene.add(satGroup)

    // Set initial target quaternion
    simStateRef.current.targetQuat.setFromUnitVectors(new THREE.Vector3(0,0,1), nadirDir)
    simStateRef.current.currentQuat.copy(simStateRef.current.targetQuat)

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
        simStateRef.current.simTimeSec += dt
      }

      const t = simStateRef.current.simTimeSec

      // Determine Target Quaternion based on Mode
      const targetQ = simStateRef.current.targetQuat
      if (simStateRef.current.controlMode === "NADIR_TRACKING") {
        // Orbit progression logic to rotate nadir vector slowly
        const orbitAngle = t * 0.05
        const currentNadir = new THREE.Vector3(0, -Math.cos(orbitAngle), -Math.sin(orbitAngle)).normalize()
        nadirArrow.setDirection(currentNadir)
        targetQ.setFromUnitVectors(new THREE.Vector3(0,0,1), currentNadir)
      } else if (simStateRef.current.controlMode === "SUN_POINTING") {
        targetQ.setFromUnitVectors(new THREE.Vector3(0,0,1), sunDir)
      } else if (simStateRef.current.controlMode === "SAFE_HOLD") {
        // Slow tumble/drift
        targetQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,1,0).normalize(), 0.001))
      }

      // Slerp current attitude towards target attitude (simulating PD control loop)
      const currentQ = simStateRef.current.currentQuat
      const angleDiff = currentQ.angleTo(targetQ)
      
      // Calculate instantaneous slew rate (deg/sec)
      let slewRateDegS = 0
      if (angleDiff > 0.001) {
        const slewStep = Math.min(1.0, (0.8 * dt) / angleDiff) // Max slew rate limiter
        currentQ.slerp(targetQ, slewStep)
        slewRateDegS = ((angleDiff * slewStep) / dt) * (180 / Math.PI)
      }

      satGroup.quaternion.copy(currentQ)

      // Simulate Reaction Wheel RPM responses based on angular acceleration
      // Simplified: If slewing, wheels spin up/down proportionally to angular distance
      const baseRpm = 3500
      const rpmDelta = slewRateDegS * 50
      
      if (simStateRef.current.isPlaying) {
        if (slewRateDegS > 0.1) {
          simStateRef.current.wheelRpms[0] = baseRpm + rpmDelta * Math.sin(t*5)
          simStateRef.current.wheelRpms[1] = baseRpm - rpmDelta * Math.cos(t*5)
          simStateRef.current.wheelRpms[2] = baseRpm + rpmDelta * 0.5
          simStateRef.current.wheelRpms[3] = baseRpm - rpmDelta * 0.5
        } else {
          // Nominal desaturation / noise
          simStateRef.current.wheelRpms = simStateRef.current.wheelRpms.map(r => r + (baseRpm - r) * 0.05 + (Math.random()-0.5)*10)
        }
      }

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

        const euler = new THREE.Euler().setFromQuaternion(currentQ, 'ZYX')
        const pointingErr = (angleDiff * (180 / Math.PI)).toFixed(2)

        setTelemetryUI({
          simTimeSec: Math.round(t),
          qx: currentQ.x.toFixed(4),
          qy: currentQ.y.toFixed(4),
          qz: currentQ.z.toFixed(4),
          qw: currentQ.w.toFixed(4),
          rollDeg: (euler.z * (180/Math.PI)).toFixed(1),
          pitchDeg: (euler.x * (180/Math.PI)).toFixed(1),
          yawDeg: (euler.y * (180/Math.PI)).toFixed(1),
          slewRateDegS: slewRateDegS.toFixed(2),
          pointingErrorDeg: pointingErr,
          rw1Rpm: Math.round(simStateRef.current.wheelRpms[0]),
          rw2Rpm: Math.round(simStateRef.current.wheelRpms[1]),
          rw3Rpm: Math.round(simStateRef.current.wheelRpms[2]),
          rw4Rpm: Math.round(simStateRef.current.wheelRpms[3]),
          starTrackerStatus: simStateRef.current.controlMode === "SAFE_HOLD" ? "LOST TRACK" : "LOCKED (3 STARS)"
        })
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
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      {/* 3D WEBGL KERNEL */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* TOP TACTICAL FLIGHT BAR */}
      <div className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white font-mono font-black text-sm tracking-wider hover:border-purple-500/50 transition-all shadow-xl"
          >
            VEROYX
          </Link>
          <div className="px-3 py-1 rounded-full bg-purple-950/80 backdrop-blur-md border border-purple-500/40 text-purple-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-xl">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            ATTITUDE DETERMINATION &amp; CONTROL SYSTEM (ADCS)
          </div>
        </div>

        {/* Command Mode Switcher & Time */}
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 pointer-events-auto shadow-xl">
          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setControlMode("NADIR_TRACKING")}
              className={`px-3 py-1 rounded cursor-pointer transition-all ${controlMode === "NADIR_TRACKING" ? "bg-purple-500 text-slate-950 font-bold shadow-md shadow-purple-500/20" : "text-slate-400 hover:text-white"}`}
            >
              NADIR POINT
            </button>
            <button
              onClick={() => setControlMode("SUN_POINTING")}
              className={`px-3 py-1 rounded cursor-pointer transition-all ${controlMode === "SUN_POINTING" ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20" : "text-slate-400 hover:text-white"}`}
            >
              SUN POINT
            </button>
            <button
              onClick={() => setControlMode("SAFE_HOLD")}
              className={`px-3 py-1 rounded cursor-pointer transition-all ${controlMode === "SAFE_HOLD" ? "bg-rose-500 text-slate-950 font-bold shadow-md shadow-rose-500/20" : "text-slate-400 hover:text-white"}`}
            >
              SAFE HOLD
            </button>
          </div>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>

      </div>

      {/* FLOATING LEFT HUD: QUATERNIONS & EULERS */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Orientation State */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-purple-400" />
              ATTITUDE STATE
            </span>
            <span className="text-[10px] text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 bg-purple-950/50">
              J2000 INERTIAL
            </span>
          </div>

          <div className="space-y-1 text-slate-300 pt-1">
            <div className="text-[10px] text-slate-500 mb-1">QUATERNION (BODY TO INERTIAL)</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded flex justify-between">
                <span className="text-slate-500">Qx</span><span className="font-bold">{telemetryUI.qx}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded flex justify-between">
                <span className="text-slate-500">Qy</span><span className="font-bold">{telemetryUI.qy}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded flex justify-between">
                <span className="text-slate-500">Qz</span><span className="font-bold">{telemetryUI.qz}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded flex justify-between">
                <span className="text-slate-500">Qw</span><span className="font-bold text-cyan-400">{telemetryUI.qw}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="text-[10px] text-slate-500 mb-1">EULER ANGLES (ZYX)</div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ROLL (X)</span>
              <span className="text-rose-400 font-bold">{telemetryUI.rollDeg}&deg;</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">PITCH (Y)</span>
              <span className="text-emerald-400 font-bold">{telemetryUI.pitchDeg}&deg;</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">YAW (Z)</span>
              <span className="text-blue-400 font-bold">{telemetryUI.yawDeg}&deg;</span>
            </div>
          </div>
        </div>

        {/* Guidance / Error */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-400" />
              GUIDANCE / POINTING
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">POINTING ERROR</span>
              <span className={parseFloat(telemetryUI.pointingErrorDeg) > 1.0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                {telemetryUI.pointingErrorDeg}&deg;
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SLEW RATE (ω)</span>
              <span className="text-white font-bold">{telemetryUI.slewRateDegS}&deg;/s</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">STAR TRACKER</span>
              <span className={telemetryUI.starTrackerStatus.includes("LOST") ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {telemetryUI.starTrackerStatus}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* FLOATING RIGHT HUD: REACTION WHEELS */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <RefreshCcw className="w-4 h-4 text-cyan-400" />
              MOMENTUM CONTROL
            </span>
            <span className="text-[10px] text-cyan-400">TETRAHEDRAL RWA</span>
          </div>

          <div className="space-y-2">
            {[
              { id: 1, rpm: telemetryUI.rw1Rpm },
              { id: 2, rpm: telemetryUI.rw2Rpm },
              { id: 3, rpm: telemetryUI.rw3Rpm },
              { id: 4, rpm: telemetryUI.rw4Rpm }
            ].map(rw => (
              <div key={rw.id} className="bg-slate-900/60 border border-slate-800/80 p-2 rounded flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">REACTION WHEEL {rw.id}</span>
                  <span className="text-cyan-400 font-bold">{rw.rpm} RPM</span>
                </div>
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{ width: `${(Math.abs(rw.rpm) / 6000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">VECTORS:</span>
            <span className="text-cyan-400 font-bold">CYAN = NADIR</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-bold">YELLOW = SUN</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-slate-400">BODY AXES:</span>
            <span className="text-rose-400 font-bold">R=X</span>
            <span className="text-emerald-400 font-bold">G=Y</span>
            <span className="text-blue-400 font-bold">B=Z</span>
          </div>
        </div>
      </div>

    </div>
  )
}
