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
  Compass, 
  Radio,
  Rocket,
  Flame,
  Milestone,
  Thermometer,
  Gauge,
  CheckCircle2,
  Circle,
  Timer
} from "lucide-react"

// Launch pad constants (Cape Canaveral LC-39A)
const PAD_LAT = 28.6082
const PAD_LON = -80.6041
const EARTH_RADIUS_KM = 6378.137
const MU = 398600.4418 // Earth gravitational parameter

interface FlightEvent {
  id: string
  timeSec: number
  label: string
}

const FLIGHT_EVENTS: FlightEvent[] = [
  { id: "ign", timeSec: 0, label: "LIFTOFF" },
  { id: "pitch", timeSec: 15, label: "PITCH MANEUVER" },
  { id: "maxq", timeSec: 75, label: "MAX-Q (MAX DYNAMIC PRESSURE)" },
  { id: "meco", timeSec: 150, label: "MAIN ENGINE CUTOFF (MECO)" },
  { id: "stage", timeSec: 154, label: "STAGE SEPARATION" },
  { id: "ses", timeSec: 161, label: "SECOND ENGINE START (SES)" },
  { id: "fairing", timeSec: 190, label: "FAIRING DEPLOYMENT" },
  { id: "seco", timeSec: 510, label: "SECOND ENGINE CUTOFF (SECO)" },
  { id: "insert", timeSec: 530, label: "ORBITAL INSERTION" }
]

export default function TrajectoryPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(1)

  // Kinetic state for decoupled WebGL loop
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 1,
    simTimeSec: -10, // Start at T-10 seconds
    yaw: 0.8,
    pitch: 0.2,
    targetYaw: 0.8,
    targetPitch: 0.2,
    distance: 1.0, // Close camera for launch
    targetDistance: 1.0,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 }
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: -10,
    altitudeKm: "0.00",
    velocityKmS: "0.00",
    downrangeKm: "0.00",
    dynamicPressureKpa: "0.00",
    thrustWeightRatio: "0.00",
    flightPathAngleDeg: "90.0",
    currentMassKg: 0,
    phase: "PRE-LAUNCH"
  })

  const [altHistory, setAltHistory] = useState<number[]>(Array(40).fill(0))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
  }, [isPlaying, timeScale])

  // Master WebGL Scene (Flight-Ready PBR)
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.01, 3000)
    camera.position.set(0, 0, 1.0)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Starfield
    const starCount = 3000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 180
      starPos[i + 1] = (Math.random() - 0.5) * 180
      starPos[i + 2] = (Math.random() - 0.5) * 180
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.1, transparent: true, opacity: 0.7 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Physical Sunlight
    const sunDir = new THREE.Vector3(5.0, 2.0, 4.0).normalize()
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.8)
    sunLight.position.copy(sunDir.clone().multiplyScalar(40))
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x061224, 0.35))

    const earthRadius = 1.75
    const textureLoader = new THREE.TextureLoader()

    const dayTexture = textureLoader.load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg", () => renderer.render(scene, camera))
    dayTexture.colorSpace = THREE.SRGBColorSpace
    const nightTexture = textureLoader.load("https://unpkg.com/three-globe/example/img/earth-night.jpg", () => renderer.render(scene, camera))
    nightTexture.colorSpace = THREE.SRGBColorSpace

    // Earth Shader (Strictly operational, no cinematic bloat)
    const earthGeo = new THREE.SphereGeometry(earthRadius, 128, 128)
    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: sunDir }
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vNormal; varying vec3 vSunDir; varying vec3 vViewDir;
        uniform vec3 sunDirection;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vSunDir = normalize((viewMatrix * vec4(sunDirection, 0.0)).xyz);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture; uniform sampler2D nightTexture;
        varying vec2 vUv; varying vec3 vNormal; varying vec3 vSunDir; varying vec3 vViewDir;
        void main() {
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          if (dayColor.r > 0.85 && dayColor.g > 0.85 && dayColor.b > 0.85) { dayColor.rgb *= 0.85; }
          float cosTheta = dot(vNormal, vSunDir);
          float dayFactor = smoothstep(-0.02, 0.1, cosTheta);
          vec3 nightLights = nightColor.rgb * vec3(1.4, 1.2, 0.9);
          vec3 dayAlbedo = dayColor.rgb;
          if (dayColor.b > dayColor.r * 1.1 && cosTheta > 0.0) {
            vec3 halfVector = normalize(vSunDir + vViewDir);
            float spec = pow(max(dot(vNormal, halfVector), 0.0), 32.0);
            float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 5.0);
            dayAlbedo += vec3(0.5, 0.8, 1.0) * spec * fresnel * 1.5;
          }
          gl_FragColor = vec4(mix(nightLights, dayAlbedo, dayFactor), 1.0);
        }
      `
    })

    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = (23.44 * Math.PI) / 180
    scene.add(earthGroup)
    earthGroup.add(new THREE.Mesh(earthGeo, earthShaderMat))

    // Atmosphere
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.01, 128, 128)
    const atmosMat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal; varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal; varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          float rayleigh = pow(rim, 5.0) * 1.0;
          gl_FragColor = vec4(vec3(0.18, 0.65, 1.0) * rayleigh, rayleigh * 0.6);
        }
      `
    })
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat))

    // Launch Vehicle (LV) Assembly
    const lvGroup = new THREE.Group()
    
    // Core Stage
    const coreGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.04, 16)
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.7 })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreMesh.position.set(0, 0.02, 0)
    lvGroup.add(coreMesh)

    // Fairing
    const fairingGeo = new THREE.ConeGeometry(0.004, 0.015, 16)
    const fairingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    const fairingMesh = new THREE.Mesh(fairingGeo, fairingMat)
    fairingMesh.position.set(0, 0.0475, 0)
    lvGroup.add(fairingMesh)

    // Plume (Engine Exhaust)
    const plumeGeo = new THREE.ConeGeometry(0.003, 0.025, 16)
    const plumeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat)
    plumeMesh.position.set(0, -0.0125, 0)
    plumeMesh.rotation.x = Math.PI
    lvGroup.add(plumeMesh)

    scene.add(lvGroup)

    // Trajectory Ribbon (Draws behind the rocket)
    const trajMaxPts = 500
    const trajGeo = new THREE.BufferGeometry()
    const trajPos = new Float32Array(trajMaxPts * 3)
    trajGeo.setAttribute("position", new THREE.BufferAttribute(trajPos, 3))
    // Fill initial with zeros
    for (let i = 0; i < trajMaxPts * 3; i++) trajPos[i] = 0

    const trajMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, linewidth: 2 })
    const trajLine = new THREE.Line(trajGeo, trajMat)
    scene.add(trajLine)

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
      simStateRef.current.targetYaw += dx * 0.005
      simStateRef.current.targetPitch = Math.max(-1.3, Math.min(1.3, simStateRef.current.targetPitch + dy * 0.005))
    }
    const onMouseUp = () => { simStateRef.current.isDragging = false }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomDelta = e.deltaY * 0.001
      simStateRef.current.targetDistance = Math.max(0.1, Math.min(6.0, simStateRef.current.targetDistance + zoomDelta))
    }
    const dom = renderer.domElement
    dom.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    dom.addEventListener("wheel", onWheel, { passive: false })

    // Physics Engine Configuration
    const massInitialKg = 550000 // e.g. Falcon 9 class
    const thrustN = 7600000 
    const ispSec = 310
    const mDot = thrustN / (ispSec * 9.81) // kg/s
    
    let animId: number
    let lastTime = performance.now()
    let lastUiSync = performance.now()

    let trajIndex = 0

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      if (simStateRef.current.isPlaying) {
        simStateRef.current.simTimeSec += dt * simStateRef.current.timeScale
      }

      const t = simStateRef.current.simTimeSec
      let tSim = Math.max(0, t)

      // Parametric Ascent Profile Approximation (For deterministic visual rendering)
      // Orbital insertion at t=510s, alt=200km, vel=7.8 km/s, downrange ~ 1500km
      const tNorm = Math.min(1, tSim / 510)
      
      // Altitude curve: quadratic early, flattens out (Logistics approx)
      const altKm = tSim <= 0 ? 0 : 200 * (1 - Math.exp(-3 * tNorm))
      
      // Downrange curve: slow start, linearizes
      const downrangeKm = 1500 * Math.pow(tNorm, 1.8)
      
      // Velocity magnitude curve
      const velKmS = 7.8 * Math.pow(tNorm, 1.2)

      // Flight Path Angle (90 deg = vertical, 0 deg = horizontal orbit)
      const fpaDeg = 90 - (90 * Math.pow(Math.min(1, tSim / 150), 0.8))
      const fpaRad = (fpaDeg * Math.PI) / 180

      // Plume logic
      plumeMesh.visible = (t > 0 && t < 150) || (t > 161 && t < 510)
      if (t > 154) coreMesh.scale.set(1, 0.3, 1) // Stage 1 separation visualization
      if (t > 190) fairingMesh.visible = false

      // Map local ascent to ECEF Globe
      const padLatRad = (PAD_LAT * Math.PI) / 180
      const padLonRad = (PAD_LON * Math.PI) / 180
      
      // Arc distance over sphere
      const angularDist = downrangeKm / EARTH_RADIUS_KM
      // Approximate azimuth (launching due East)
      const azm = (90 * Math.PI) / 180

      // Spherical law of cosines for vehicle lat/lon
      const latRad = Math.asin(Math.sin(padLatRad) * Math.cos(angularDist) + Math.cos(padLatRad) * Math.sin(angularDist) * Math.cos(azm))
      const lonRad = padLonRad + Math.atan2(Math.sin(azm) * Math.sin(angularDist) * Math.cos(padLatRad), Math.cos(angularDist) - Math.sin(padLatRad) * Math.sin(latRad))

      const r = earthRadius * ((EARTH_RADIUS_KM + altKm) / EARTH_RADIUS_KM)
      
      // ECEF coordinates
      const xE = -(r * Math.cos(latRad) * Math.cos(lonRad))
      const zE = r * Math.cos(latRad) * Math.sin(lonRad)
      const yE = r * Math.sin(latRad)

      lvGroup.position.set(xE, yE, zE)
      
      // Vehicle Attitude Orientation
      // Zenith vector
      const up = new THREE.Vector3(xE, yE, zE).normalize()
      // Eastward downrange vector
      const east = new THREE.Vector3(-Math.sin(lonRad), 0, -Math.cos(lonRad)).normalize()
      
      // Pitch rotation around North axis
      const north = new THREE.Vector3().crossVectors(up, east).normalize()
      lvGroup.quaternion.setFromAxisAngle(north, (90 - fpaDeg) * (Math.PI / 180))
      // Align initial up to Zenith
      const qUp = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), up)
      lvGroup.quaternion.premultiply(qUp)

      // Record trajectory ribbon
      if (t > 0 && trajIndex < trajMaxPts - 1 && t % 1 < dt * simStateRef.current.timeScale) {
        const positions = trajGeo.attributes.position as THREE.BufferAttribute
        positions.setXYZ(trajIndex, xE, yE, zE)
        // Shift trail forward to draw line
        for(let i=trajIndex; i<trajMaxPts; i++) positions.setXYZ(i, xE, yE, zE)
        positions.needsUpdate = true
        trajIndex++
      }

      // Camera Damping & Tracking
      if (!simStateRef.current.isDragging) {
        simStateRef.current.targetYaw += simStateRef.current.dragVelocity.x * 0.002
        simStateRef.current.targetPitch += simStateRef.current.dragVelocity.y * 0.002
        simStateRef.current.dragVelocity.x *= 0.92
        simStateRef.current.dragVelocity.y *= 0.92
      }

      simStateRef.current.yaw += (simStateRef.current.targetYaw - simStateRef.current.yaw) * 0.08
      simStateRef.current.pitch += (simStateRef.current.targetPitch - simStateRef.current.pitch) * 0.08
      simStateRef.current.distance += (simStateRef.current.targetDistance - simStateRef.current.distance) * 0.08

      const curDist = simStateRef.current.distance
      // Orbit camera around the Launch Vehicle
      camera.position.x = lvGroup.position.x + curDist * Math.sin(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.position.y = lvGroup.position.y + curDist * Math.sin(simStateRef.current.pitch)
      camera.position.z = lvGroup.position.z + curDist * Math.cos(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.lookAt(lvGroup.position)

      renderer.render(scene, camera)

      // Telemetry Dispatch (4Hz)
      if (now - lastUiSync > 250) {
        lastUiSync = now

        // Physics equations for UI
        const currentMassKg = Math.max(50000, massInitialKg - (tSim * mDot))
        const currentThrustN = tSim > 0 && tSim < 150 ? thrustN : (tSim > 161 && tSim < 510 ? 981000 : 0) // Stage 2 thrust approx
        const gravityAtAlt = 9.81 * Math.pow(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altKm), 2)
        const twr = tSim > 0 ? currentThrustN / (currentMassKg * gravityAtAlt) : 0

        // Barometric formula for atmospheric density
        const rho = 1.225 * Math.exp(-altKm / 8.5) // kg/m^3
        const vMs = velKmS * 1000
        const qPa = 0.5 * rho * vMs * vMs
        const qKpa = qPa / 1000

        let phase = "PRE-LAUNCH"
        if (t > 0) phase = "LIFTOFF"
        if (t > 75) phase = "MAX-Q"
        if (t > 150) phase = "MECO / COAST"
        if (t > 161) phase = "STAGE 2 BURN"
        if (t > 510) phase = "ORBITAL INSERTION"

        setTelemetryUI({
          simTimeSec: Math.round(t),
          altitudeKm: altKm.toFixed(2),
          velocityKmS: velKmS.toFixed(2),
          downrangeKm: downrangeKm.toFixed(1),
          dynamicPressureKpa: qKpa.toFixed(1),
          thrustWeightRatio: twr.toFixed(2),
          flightPathAngleDeg: Math.max(0, fpaDeg).toFixed(1),
          currentMassKg: Math.round(currentMassKg),
          phase
        })

        // Track Altitude for HUD Sparkline
        setAltHistory(prev => [...prev.slice(1), altKm])
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

  // Helper to format T- time
  const formatTime = (sec: number) => {
    const sign = sec < 0 ? "T-" : "T+"
    const absSec = Math.abs(Math.round(sec))
    const m = Math.floor(absSec / 60).toString().padStart(2, "0")
    const s = (absSec % 60).toString().padStart(2, "0")
    return `${sign}${m}:${s}`
  }

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
            className="px-3.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white font-mono font-black text-sm tracking-wider hover:border-cyan-500/50 transition-all shadow-xl"
          >
            VEROYX
          </Link>
          <div className="px-3 py-1 rounded-full bg-indigo-950/80 backdrop-blur-md border border-indigo-500/40 text-indigo-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-xl">
            <Rocket className="w-3.5 h-3.5 text-indigo-400" />
            ASCENT PHYSICS &amp; TRAJECTORY PROPAGATION KERNEL
          </div>
        </div>

        {/* Time Scrub Controls */}
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 pointer-events-auto shadow-xl">
          <div className="px-3 py-1 text-slate-300 font-bold border-r border-slate-700 mr-1">
            {formatTime(telemetryUI.simTimeSec)}
          </div>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {[1, 5, 20].map(scale => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                timeScale === scale 
                  ? "bg-indigo-500 text-slate-950 font-black shadow-md shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {scale}x
            </button>
          ))}

          <button
            onClick={() => { simStateRef.current.simTimeSec = -10 }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Reset Countdown"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* FLOATING LEFT HUD: ASCENT KINEMATICS */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Ascent Telemetry */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              VEHICLE KINEMATICS
            </span>
            <span className="text-[10px] text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-950/50">
              {telemetryUI.phase}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">INERTIAL VELOCITY</span>
              <span className="text-cyan-400 font-bold">{telemetryUI.velocityKmS} km/s</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ALTITUDE</span>
              <span className="text-white font-bold">{telemetryUI.altitudeKm} km</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">DOWNRANGE DISTANCE</span>
              <span className="text-white font-bold">{telemetryUI.downrangeKm} km</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">FLIGHT PATH ANGLE</span>
              <span className="text-amber-400 font-bold">{telemetryUI.flightPathAngleDeg}&deg;</span>
            </div>
          </div>
        </div>

        {/* Dynamic Launch Physics */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-rose-400" />
              PROPULSION &amp; AERO
            </span>
            <span className="text-[10px] text-rose-400">6-DOF RK4</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">DYNAMIC PRESSURE (Q)</span>
              <span className="text-white font-bold">{telemetryUI.dynamicPressureKpa} kPa</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">THRUST/WEIGHT (TWR)</span>
              <span className="text-white font-bold">{telemetryUI.thrustWeightRatio}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">VEHICLE MASS</span>
              <span className="text-emerald-400 font-bold">{telemetryUI.currentMassKg.toLocaleString()} kg</span>
            </div>
          </div>
        </div>

      </div>

      {/* FLOATING RIGHT HUD: FLIGHT EVENTS & TIMELINE */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Event Sequence Checklist */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Milestone className="w-4 h-4 text-emerald-400" />
              FLIGHT SEQUENCE
            </span>
            <span className="text-[10px] text-emerald-400">NOMINAL</span>
          </div>

          <div className="space-y-2">
            {FLIGHT_EVENTS.map((evt, idx) => {
              const isPast = telemetryUI.simTimeSec >= evt.timeSec
              return (
                <div key={idx} className="flex items-center gap-3">
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-700" />
                  )}
                  <div className={`flex-1 flex justify-between ${isPast ? "text-slate-200" : "text-slate-500"}`}>
                    <span>{evt.label}</span>
                    <span className="font-bold">{formatTime(evt.timeSec)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Altitude Profile Sparkline */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              ASCENT PROFILE
            </span>
            <span className="text-cyan-400 font-bold">{telemetryUI.altitudeKm} km</span>
          </div>

          <div className="h-14 w-full bg-slate-950 rounded border border-slate-800/80 flex items-end px-0.5 gap-px overflow-hidden">
            {altHistory.map((val, idx) => {
              const hPercent = Math.max(5, Math.min(100, (val / 220) * 100))
              return (
                <div
                  key={idx}
                  className="flex-1 bg-cyan-500/80 rounded-t-sm"
                  style={{ height: `${hPercent}%` }}
                />
              )
            })}
          </div>
        </div>

      </div>

      {/* BOTTOM STATUS BAR HUD */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">LAUNCH PAD:</span>
            <span className="text-white font-bold">CAPE CANAVERAL (LC-39A)</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-3">
          <span>DRAG TO ORBIT CAMERA</span>
        </div>
      </div>

    </div>
  )
}
