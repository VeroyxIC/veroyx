"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import * as THREE from "three"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Thermometer, 
  ThermometerSnowflake, 
  ThermometerSun, 
  Activity, 
  Sun,
  Flame,
  Radio
} from "lucide-react"

export default function ThermalPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)

  // Thermal Constants
  const SIGMA = 5.67e-8 // Stefan-Boltzmann constant (W/m^2*K^4)
  const SOLAR_FLUX = 1361 // W/m^2
  const EARTH_IR = 237 // W/m^2 (Average Earth Infrared)
  const ALBEDO_FACTOR = 0.3 // Earth average reflectance

  // Spacecraft Thermal Properties
  const BUS_AREA = 2.4 // m^2
  const ARRAY_AREA = 4.2 // m^2
  const MASS_BUS = 400 // kg
  const CP_BUS = 900 // Specific heat capacity (J/kg*K) aluminum approx
  const MASS_ARRAY = 20 // kg
  const CP_ARRAY = 800 // Specific heat
  const INTERNAL_HEAT_W = 150 // Internal avionics dissipation
  
  // Optical properties (MLI for Bus, Solar Cells for Arrays)
  const ALPHA_BUS = 0.2 // Absorptivity
  const EPSILON_BUS = 0.8 // Emissivity (Radiator surface)
  const ALPHA_ARRAY = 0.85
  const EPSILON_ARRAY = 0.85

  // Kinetic state
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 0,
    cameraYaw: 0.8,
    cameraPitch: 0.4,
    targetCameraYaw: 0.8,
    targetCameraPitch: 0.4,
    cameraDistance: 2.8,
    targetCameraDistance: 2.8,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 },
    
    // Multi-Node Thermal State (Kelvin)
    tempBusK: 293.15, // 20 C
    tempArrayK: 293.15 // 20 C
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    tempBusC: "20.0",
    tempArrayC: "20.0",
    qSolarBus: "0.0",
    qSolarArray: "0.0",
    qAlbedo: "0.0",
    qEarthIR: "0.0",
    qRadiatedBus: "0.0",
    qRadiatedArray: "0.0",
    eclipseState: "SUNLIT"
  })

  const [tempHistory, setTempHistory] = useState<{bus: number, arr: number}[]>(Array(40).fill({bus: 20, arr: 20}))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
  }, [isPlaying, timeScale])

  const orbit = useMemo(() => {
    const mu = 398600.4418
    const rEarthKm = 6378.137
    const a = rEarthKm + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3))
    const periodSec = (2 * Math.PI) / n
    return { a, incRad, n, periodSec, rEarthKm }
  }, [mission.altitudeKm, mission.inclinationDeg])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 1000)
    camera.position.set(0, 1.5, 2.8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Starfield
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(2000 * 3)
    for (let i = 0; i < 6000; i++) starPos[i] = (Math.random() - 0.5) * 100
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.1, transparent: true, opacity: 0.4 })))

    // Spacecraft Thermal Assembly
    const satGroup = new THREE.Group()

    // FLIR-style Thermal Shader Material
    const thermalShader = {
      uniforms: {
        uTempK: { value: 293.15 },
        uMinK: { value: 173.15 }, // -100C (Deep Blue)
        uMaxK: { value: 393.15 }  // +120C (Red/White)
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTempK;
        uniform float uMinK;
        uniform float uMaxK;
        varying vec3 vNormal;

        // Simple jet colormap approximation
        vec3 jet(float t) {
          return clamp(vec3(1.5 - abs(4.0 * t - 3.0), 1.5 - abs(4.0 * t - 2.0), 1.5 - abs(4.0 * t - 1.0)), vec3(0.0), vec3(1.0));
        }

        void main() {
          float normT = clamp((uTempK - uMinK) / (uMaxK - uMinK), 0.0, 1.0);
          vec3 baseColor = jet(normT);
          
          // Add mild edge lighting for 3D definition
          float edge = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          gl_FragColor = vec4(baseColor + vec3(edge * 0.2), 1.0);
        }
      `
    }

    const busMat = new THREE.ShaderMaterial({ ...thermalShader, uniforms: { ...thermalShader.uniforms, uTempK: { value: 293.15 } } })
    const arrayMat = new THREE.ShaderMaterial({ ...thermalShader, uniforms: { ...thermalShader.uniforms, uTempK: { value: 293.15 } } })

    const busMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.6), busMat)
    satGroup.add(busMesh)

    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.4), arrayMat)
    leftWing.position.set(0.9, 0, 0)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.4), arrayMat)
    rightWing.position.set(-0.9, 0, 0)
    
    const sadmGroup = new THREE.Group()
    sadmGroup.add(leftWing)
    sadmGroup.add(rightWing)
    satGroup.add(sadmGroup)
    scene.add(satGroup)

    // Sun Vector indicator
    const sunDir = new THREE.Vector3(1, 0, 0).normalize() // Starts from +X
    
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
      simStateRef.current.targetCameraDistance = Math.max(1.5, Math.min(8.0, simStateRef.current.targetCameraDistance + e.deltaY * 0.003))
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
      const t = simStateRef.current.simTimeSec + (simStateRef.current.isPlaying ? timeStep : 0)
      if (simStateRef.current.isPlaying) simStateRef.current.simTimeSec = t

      // Orbit physics for eclipse detection
      const u = (orbit.n * t) % (2 * Math.PI)
      const xOrb = orbit.a * Math.cos(u)
      const zOrb = orbit.a * Math.sin(u)
      
      let eclipseFactor = 1.0
      if (xOrb < 0 && Math.abs(zOrb) < orbit.rEarthKm) {
         eclipseFactor = 0.0 // Umbra
      }

      // Sun Incidence
      const sunLocalAngle = Math.atan2(zOrb, xOrb)
      sadmGroup.rotation.y = -sunLocalAngle // Arrays track the sun

      const incidenceArray = 0 // Arrays track perfectly
      const incidenceBus = Math.abs(Math.sin(sunLocalAngle)) // Bus faces nadir, sun crosses its sides

      // Heat Loads (Watts)
      const qSolarBusIn = ALPHA_BUS * BUS_AREA * SOLAR_FLUX * incidenceBus * eclipseFactor
      const qSolarArrayIn = ALPHA_ARRAY * ARRAY_AREA * SOLAR_FLUX * Math.cos(incidenceArray) * eclipseFactor
      
      const qAlbedo = eclipseFactor > 0.5 ? ALPHA_BUS * BUS_AREA * (SOLAR_FLUX * ALBEDO_FACTOR) * 0.3 : 0 // Simplified view factor
      const qEarthIR = EPSILON_BUS * BUS_AREA * EARTH_IR * 0.5 // Constant view factor to Earth

      // Radiated Heat (Watts)
      const tBusK = simStateRef.current.tempBusK
      const tArrK = simStateRef.current.tempArrayK
      
      const qRadBus = EPSILON_BUS * SIGMA * BUS_AREA * Math.pow(tBusK, 4)
      const qRadArray = EPSILON_ARRAY * SIGMA * ARRAY_AREA * 2 * Math.pow(tArrK, 4) // Array radiates from both sides

      // Thermal Kinetics: dT = (Q_in - Q_out) * dt / (m * Cp)
      if (simStateRef.current.isPlaying) {
        const dTempBus = ((qSolarBusIn + qAlbedo + qEarthIR + INTERNAL_HEAT_W - qRadBus) * timeStep) / (MASS_BUS * CP_BUS)
        const dTempArray = ((qSolarArrayIn - qRadArray) * timeStep) / (MASS_ARRAY * CP_ARRAY)

        simStateRef.current.tempBusK = Math.max(0, tBusK + dTempBus)
        simStateRef.current.tempArrayK = Math.max(0, tArrK + dTempArray)
      }

      // Update Shaders
      busMat.uniforms.uTempK.value = simStateRef.current.tempBusK
      arrayMat.uniforms.uTempK.value = simStateRef.current.tempArrayK

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

      camera.position.x = simStateRef.current.cameraDistance * Math.sin(simStateRef.current.cameraYaw) * Math.cos(simStateRef.current.cameraPitch)
      camera.position.y = simStateRef.current.cameraDistance * Math.sin(simStateRef.current.cameraPitch)
      camera.position.z = simStateRef.current.cameraDistance * Math.cos(simStateRef.current.cameraYaw) * Math.cos(simStateRef.current.cameraPitch)
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)

      if (now - lastUiSync > 250) {
        lastUiSync = now

        const busC = simStateRef.current.tempBusK - 273.15
        const arrC = simStateRef.current.tempArrayK - 273.15

        setTelemetryUI({
          simTimeSec: Math.round(t),
          tempBusC: busC.toFixed(1),
          tempArrayC: arrC.toFixed(1),
          qSolarBus: qSolarBusIn.toFixed(1),
          qSolarArray: qSolarArrayIn.toFixed(1),
          qAlbedo: qAlbedo.toFixed(1),
          qEarthIR: qEarthIR.toFixed(1),
          qRadiatedBus: qRadBus.toFixed(1),
          qRadiatedArray: qRadArray.toFixed(1),
          eclipseState: eclipseFactor < 0.5 ? "UMBRA (ECLIPSE)" : "SUNLIT"
        })

        setTempHistory(prev => [...prev.slice(1), { bus: busC, arr: arrC }])
      }
    }

    animId = requestAnimationFrame(animate)

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
      dom.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      dom.removeEventListener("wheel", onWheel)
      renderer.dispose()
    }
  }, [orbit])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0" />

      {/* TOP TACTICAL FLIGHT BAR */}
      <div className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href="/" className="px-3.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white font-mono font-black text-sm hover:border-rose-500/50 transition-all shadow-xl">
            VEROYX
          </Link>
          <div className="px-3 py-1 rounded-full bg-rose-950/80 backdrop-blur-md border border-rose-500/40 text-rose-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-xl">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            THERMAL CONTROL SYSTEM (TCS) & HEAT BALANCE
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 pointer-events-auto shadow-xl">
          <button onClick={() => setIsPlaying(!isPlaying)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-all">
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          {[1, 10, 60, 120].map(scale => (
            <button key={scale} onClick={() => setTimeScale(scale)} className={`px-2 py-1 rounded-lg transition-all ${timeScale === scale ? "bg-rose-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"}`}>
              {scale}x
            </button>
          ))}
          <button onClick={() => { simStateRef.current.simTimeSec = 0; simStateRef.current.tempBusK = 293.15; simStateRef.current.tempArrayK = 293.15; }} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FLOATING LEFT HUD: THERMAL NODES */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-rose-400" />
              NODE TEMPERATURES
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${telemetryUI.eclipseState.includes("UMBRA") ? "border-sky-500/40 text-sky-400 bg-sky-950/50" : "border-amber-500/40 text-amber-400 bg-amber-950/50"}`}>
              {telemetryUI.eclipseState}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">CHASSIS BUS (MLI)</span>
              <span className={`font-bold ${parseFloat(telemetryUI.tempBusC) < -10 ? "text-sky-400" : parseFloat(telemetryUI.tempBusC) > 50 ? "text-rose-400" : "text-emerald-400"}`}>
                {telemetryUI.tempBusC} &deg;C
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SOLAR ARRAYS</span>
              <span className={`font-bold ${parseFloat(telemetryUI.tempArrayC) < -50 ? "text-sky-400" : parseFloat(telemetryUI.tempArrayC) > 80 ? "text-rose-400" : "text-amber-400"}`}>
                {telemetryUI.tempArrayC} &deg;C
              </span>
            </div>
          </div>
        </div>

        {/* Heat Transfer Timeline */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              THERMAL GRADIENT
            </span>
          </div>
          <div className="h-20 w-full bg-slate-950 rounded border border-slate-800/80 flex items-end px-0.5 gap-px overflow-hidden relative">
            {/* 0 C line */}
            <div className="absolute w-full border-b border-slate-700 top-1/2 pointer-events-none" />
            {tempHistory.map((val, idx) => {
              // Map -100C to 0%, +100C to 100%
              const hArr = Math.max(0, Math.min(100, (val.arr + 100) / 2))
              const hBus = Math.max(0, Math.min(100, (val.bus + 100) / 2))
              return (
                <div key={idx} className="flex-1 h-full relative">
                  <div className="absolute bottom-0 w-full bg-amber-500/80 rounded-t-sm" style={{ height: `${hArr}%` }} />
                  <div className="absolute bottom-0 w-full bg-rose-500/90 rounded-t-sm w-1/2 mx-auto" style={{ height: `${hBus}%` }} />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[9px] text-slate-500">
            <span className="text-rose-400">BUS</span>
            <span className="text-amber-400">ARRAYS</span>
          </div>
        </div>
      </div>

      {/* FLOATING RIGHT HUD: HEAT BALANCE (STEFAN-BOLTZMANN) */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        <div className="p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <ThermometerSun className="w-4 h-4 text-amber-400" />
              HEAT ABSORPTION (Qin)
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">DIRECT SOLAR (ARRAYS)</span>
              <span className="text-amber-400 font-bold">+{telemetryUI.qSolarArray} W</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">EARTH ALBEDO REFLECTANCE</span>
              <span className="text-white font-bold">+{telemetryUI.qAlbedo} W</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">EARTH INFRARED (IR)</span>
              <span className="text-rose-400 font-bold">+{telemetryUI.qEarthIR} W</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <ThermometerSnowflake className="w-4 h-4 text-sky-400" />
              HEAT DISSIPATION (Qout)
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">BUS RADIATOR EMISSION</span>
              <span className="text-sky-400 font-bold">-{telemetryUI.qRadiatedBus} W</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ARRAY BLACKBODY RADIATION</span>
              <span className="text-blue-400 font-bold">-{telemetryUI.qRadiatedArray} W</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">VIEW:</span>
            <span className="text-rose-400 font-bold">FLIR THERMAL-CAM OVERLAY</span>
          </div>
        </div>
      </div>
    </div>
  )
}
