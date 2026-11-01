"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import * as THREE from "three"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldAlert, 
  Activity, 
  Compass, 
  Target, 
  AlertTriangle, 
  Flame, 
  CheckCircle2, 
  Radio, 
  Maximize2,
  ZoomIn,
  ZoomOut
} from "lucide-react"

interface ConjunctionEvent {
  cdmId: string
  chaserName: string
  targetName: string
  targetNorad: number
  targetType: string
  tcaSec: number // Time of Closest Approach relative to epoch
  missDistanceM: number
  radialM: number
  inTrackM: number
  crossTrackM: number
  relSpeedKmS: number
  pcInitial: string
  status: "CRITICAL" | "ELEVATED" | "NOMINAL"
}

const CONJUNCTION_EVENTS: ConjunctionEvent[] = [
  {
    cdmId: "CDM-2026-8812-USSPACECOM",
    chaserName: "PRIMARY PAYLOAD",
    targetName: "COSMOS 1408 DEBRIS (FRAGMENT #412)",
    targetNorad: 49450,
    targetType: "LEO DEBRIS CLOUD",
    tcaSec: 842,
    missDistanceM: 284,
    radialM: -32,
    inTrackM: 268,
    crossTrackM: 88,
    relSpeedKmS: 14.82,
    pcInitial: "4.82e-4",
    status: "CRITICAL"
  },
  {
    cdmId: "CDM-2026-8814-USSPACECOM",
    chaserName: "PRIMARY PAYLOAD",
    targetName: "FENGYUN 1C DEBRIS",
    targetNorad: 31210,
    targetType: "ASAT FRAGMENT",
    tcaSec: 2190,
    missDistanceM: 1420,
    radialM: 110,
    inTrackM: 1380,
    crossTrackM: -310,
    relSpeedKmS: 12.15,
    pcInitial: "1.15e-6",
    status: "ELEVATED"
  },
  {
    cdmId: "CDM-2026-8819-USSPACECOM",
    chaserName: "PRIMARY PAYLOAD",
    targetName: "STARLINK-3814 (NON-MANEUVERABLE)",
    targetNorad: 51204,
    targetType: "DERELICT SATELLITE",
    tcaSec: 4620,
    missDistanceM: 3840,
    radialM: -420,
    inTrackM: 3790,
    crossTrackM: 520,
    relSpeedKmS: 7.64,
    pcInitial: "2.10e-8",
    status: "NOMINAL"
  }
]

export default function ConjunctionPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(5)
  const [activeEventIndex, setActiveEventIndex] = useState<number>(0)
  const [camDeltaVMps, setCamDeltaVMps] = useState<number>(0.85) // Collision Avoidance Maneuver impulse
  const [camExecuted, setCamExecuted] = useState<boolean>(false)

  const activeEvent = CONJUNCTION_EVENTS[activeEventIndex]

  // Kinetic Ref state for 60fps WebGL loop
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 5,
    simTimeSec: 0,
    camExecuted: false,
    camDeltaVMps: 0.85,
    yaw: 0.85,
    pitch: 0.35,
    targetYaw: 0.85,
    targetPitch: 0.35,
    distance: 4.8,
    targetDistance: 4.8,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 }
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    timeToTcaSec: 842,
    currentMissDistanceM: 284,
    currentPc: "4.82e-4",
    radialSeparationM: -32,
    inTrackSeparationM: 268,
    crossTrackSeparationM: 88,
    isCamActive: false
  })

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
    simStateRef.current.camExecuted = camExecuted
    simStateRef.current.camDeltaVMps = camDeltaVMps
  }, [isPlaying, timeScale, camExecuted, camDeltaVMps])

  // Orbital parameters
  const orbit = useMemo(() => {
    const mu = 398600.4418
    const rEarthKm = 6378.137
    const a = rEarthKm + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3))
    const periodSec = (2 * Math.PI) / n
    const velocityKmS = Math.sqrt(mu / a)

    return { a, incRad, n, periodSec, velocityKmS, rEarthKm }
  }, [mission.altitudeKm, mission.inclinationDeg])

  // CAM Fuel Budget calculation (Tsiolkovsky)
  const camBudget = useMemo(() => {
    const dryMassKg = mission.dryMassKg || 180
    const fuelMassKg = mission.propellantMassKg || 45
    const wetMassKg = dryMassKg + fuelMassKg
    const ispSec = (mission as any)?.propulsionType?.includes("Electric") ? 1650 : 310
    const g0 = 9.80665

    // Post-burn mitigated miss distance: deltaR ~ 2 * (dv / n)
    const dvMps = camExecuted ? camDeltaVMps : 0
    const additionalSeparationM = Math.round((2 * dvMps) / orbit.n)
    const finalMissDistanceM = activeEvent.missDistanceM + (camExecuted ? additionalSeparationM : 0)
    const finalPc = camExecuted ? "< 1.0e-8" : activeEvent.pcInitial

    // Tsiolkovsky: dm = wetMass * (1 - e^(-dv / (Isp * g0)))
    const fuelUsedKg = (wetMassKg * (1 - Math.exp(-camDeltaVMps / (ispSec * g0)))).toFixed(3)
    const fuelRemainingKg = Math.max(0, fuelMassKg - parseFloat(fuelUsedKg)).toFixed(3)

    return {
      finalMissDistanceM,
      finalPc,
      fuelUsedKg,
      fuelRemainingKg,
      additionalSeparationM
    }
  }, [mission, camDeltaVMps, camExecuted, activeEvent, orbit.n])

  // Master WebGL Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040a")

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 3000)
    camera.position.set(0, 1.8, 4.8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Starfield
    const starCount = 3000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 180
      starPos[i + 1] = (Math.random() - 0.5) * 180
      starPos[i + 2] = (Math.random() - 0.5) * 180
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.12, transparent: true, opacity: 0.85 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Lighting
    const sunDir = new THREE.Vector3(7.0, 3.0, 6.0).normalize()
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.0)
    sunLight.position.copy(sunDir.clone().multiplyScalar(40))
    scene.add(sunLight)

    const ambientLight = new THREE.AmbientLight(0x061224, 0.45)
    scene.add(ambientLight)

    const earthRadius = 1.75
    const textureLoader = new THREE.TextureLoader()

    const dayTexture = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      () => renderer.render(scene, camera)
    )
    dayTexture.colorSpace = THREE.SRGBColorSpace

    const nightTexture = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-night.jpg",
      () => renderer.render(scene, camera)
    )
    nightTexture.colorSpace = THREE.SRGBColorSpace

    // Physically-calibrated Earth Material
    const earthGeo = new THREE.SphereGeometry(earthRadius, 96, 96)
    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: sunDir }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vSunDir;
        varying vec3 vViewDir;
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
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vSunDir;
        varying vec3 vViewDir;

        void main() {
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);

          float cosTheta = dot(vNormal, vSunDir);
          float dayFactor = smoothstep(-0.04, 0.14, cosTheta);

          vec3 nightLights = nightColor.rgb * vec3(1.7, 1.4, 0.95) * 2.2;
          vec3 dayAlbedo = dayColor.rgb;

          if (dayColor.b > dayColor.r * 1.12 && cosTheta > 0.0) {
            vec3 halfVector = normalize(vSunDir + vViewDir);
            float spec = pow(max(dot(vNormal, halfVector), 0.0), 32.0);
            float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 5.0);
            dayAlbedo += vec3(0.5, 0.8, 1.0) * spec * fresnel * 2.2;
          }

          vec3 finalColor = mix(nightLights, dayAlbedo, dayFactor);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    })

    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = (23.44 * Math.PI) / 180
    scene.add(earthGroup)

    const earthMesh = new THREE.Mesh(earthGeo, earthShaderMat)
    earthGroup.add(earthMesh)

    // Tropospheric Clouds
    const cloudsTexture = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-clouds.png",
      () => renderer.render(scene, camera)
    )
    cloudsTexture.colorSpace = THREE.SRGBColorSpace

    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.006, 96, 96)
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      roughness: 1.0
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat)
    earthGroup.add(cloudsMesh)

    // Rayleigh Atmospheric Glow
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.012, 96, 96)
    const atmosMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          float rayleigh = pow(rim, 4.5) * 1.2;
          vec3 atmosColor = vec3(0.18, 0.65, 1.0) * rayleigh;
          gl_FragColor = vec4(atmosColor, rayleigh * 0.7);
        }
      `
    })
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat))

    // Primary Satellite Orbit
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, linewidth: 2 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // Primary Vehicle Assembly
    const satGroup = new THREE.Group()

    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.95 })
    )
    satGroup.add(busMesh)

    const solarWingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85 })
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.07), solarWingMat)
    leftWing.position.set(0.16, 0, 0)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.07), solarWingMat)
    rightWing.position.set(-0.16, 0, 0)
    satGroup.add(leftWing)
    satGroup.add(rightWing)

    // Primary Vehicle 1-Sigma Covariance Safety Bubble (Cyan)
    const chaserCovGeo = new THREE.SphereGeometry(0.09, 16, 16)
    chaserCovGeo.scale(1.4, 0.8, 1.1)
    const chaserCovMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    })
    satGroup.add(new THREE.Mesh(chaserCovGeo, chaserCovMat))
    scene.add(satGroup)

    // Conjunction Debris Target Assembly
    const targetGroup = new THREE.Group()
    const targetMesh = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.05),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.8 })
    )
    targetGroup.add(targetMesh)

    // 3D B-Plane Covariance Collision Ellipsoid (3-Sigma Hazard Volume)
    const bPlaneCovGeo = new THREE.SphereGeometry(0.16, 20, 20)
    bPlaneCovGeo.scale(2.2, 0.7, 1.2) // Foster encounter dispersion shape
    const bPlaneCovMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    })
    targetGroup.add(new THREE.Mesh(bPlaneCovGeo, bPlaneCovMat))
    scene.add(targetGroup)

    // Relative Miss-Distance Vector (Laser Strobe)
    const missVecGeo = new THREE.BufferGeometry()
    missVecGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3))
    const missVecMat = new THREE.LineDashedMaterial({
      color: 0xef4444,
      dashSize: 0.08,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.95
    })
    const missVecLine = new THREE.Line(missVecGeo, missVecMat)
    scene.add(missVecLine)

    // Post-CAM Mitigated Safe Trajectory Arc (Golden Dashed)
    const camArcGeo = new THREE.BufferGeometry()
    camArcGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(60 * 3), 3))
    const camArcMat = new THREE.LineDashedMaterial({
      color: 0x10b981,
      dashSize: 0.1,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.85
    })
    const camArcLine = new THREE.Line(camArcGeo, camArcMat)
    scene.add(camArcLine)

    // Mouse Interaction with Damping
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

    const onMouseUp = () => {
      simStateRef.current.isDragging = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomDelta = e.deltaY * 0.003
      simStateRef.current.targetDistance = Math.max(2.2, Math.min(18.0, simStateRef.current.targetDistance + zoomDelta))
    }

    const dom = renderer.domElement
    dom.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    dom.addEventListener("wheel", onWheel, { passive: false })

    // Decoupled 60fps Loop
    let animId: number
    let lastTime = performance.now()
    let lastUiSync = performance.now()

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      if (simStateRef.current.isPlaying) {
        simStateRef.current.simTimeSec += dt * simStateRef.current.timeScale
      }

      const t = simStateRef.current.simTimeSec

      // Rotation
      earthMesh.rotation.y = t * 0.012
      cloudsMesh.rotation.y = t * 0.015

      // Propagate Primary Spacecraft
      const u = (orbit.n * t) % (2 * Math.PI)
      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)

      let xE = xOrb
      let zE = zOrb * Math.cos(orbit.incRad)
      let yE = zOrb * Math.sin(orbit.incRad)

      // Apply CAM burn deflection offset if executed
      if (simStateRef.current.camExecuted) {
        const deflectionScale = 0.08
        xE += deflectionScale * Math.cos(u + Math.PI / 2)
        yE += deflectionScale * 0.5
      }

      satGroup.position.set(xE, yE, zE)
      satGroup.lookAt(0, 0, 0)

      // Propagate Conjunction Target along intersecting plane
      const uTarg = (orbit.n * t + 0.04) % (2 * Math.PI) // Encounters closely at node
      const xTOrb = orbitRadius * Math.cos(uTarg)
      const zTOrb = orbitRadius * Math.sin(uTarg)
      const targetIncRad = (82.5 * Math.PI) / 180 // High-inclination debris orbit

      const xTE = xTOrb
      const zTE = zTOrb * Math.cos(targetIncRad)
      const yTE = zTOrb * Math.sin(targetIncRad)

      targetGroup.position.set(xTE, yTE, zTE)

      // Update Miss-Distance Laser Vector
      const missPos = missVecGeo.attributes.position as THREE.BufferAttribute
      missPos.setXYZ(0, xE, yE, zE)
      missPos.setXYZ(1, xTE, yTE, zTE)
      missPos.needsUpdate = true
      missVecLine.computeLineDistances()

      // Camera Damping
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
      camera.position.x = curDist * Math.sin(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.position.y = curDist * Math.sin(simStateRef.current.pitch)
      camera.position.z = curDist * Math.cos(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.lookAt(satGroup.position) // Track conjunction encounter directly

      renderer.render(scene, camera)

      // Throttled UI Dispatch (4 Hz = 250ms)
      if (now - lastUiSync > 250) {
        lastUiSync = now

        const satVec = new THREE.Vector3(xE, yE, zE)
        const targVec = new THREE.Vector3(xTE, yTE, zTE)
        const currentMissM = Math.round(satVec.distanceTo(targVec) * (orbit.rEarthKm / earthRadius) * 1000)

        const timeRemaining = Math.max(0, Math.round(activeEvent.tcaSec - (t % activeEvent.tcaSec)))

        setTelemetryUI({
          simTimeSec: Math.round(t),
          timeToTcaSec: timeRemaining,
          currentMissDistanceM: simStateRef.current.camExecuted ? currentMissM + 1450 : currentMissM,
          currentPc: simStateRef.current.camExecuted ? "< 1.0e-8" : activeEvent.pcInitial,
          radialSeparationM: simStateRef.current.camExecuted ? activeEvent.radialM + 280 : activeEvent.radialM,
          inTrackSeparationM: activeEvent.inTrackM,
          crossTrackSeparationM: activeEvent.crossTrackM,
          isCamActive: simStateRef.current.camExecuted
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
  }, [orbit, activeEvent])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      {/* 1. FULL VIEWPORT EDGE-TO-EDGE 3D WEBGL ENGINE */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        title="Drag to orbit encounter camera, wheel to zoom"
      />

      {/* 2. TOP TACTICAL FLIGHT BAR */}
      <div className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white font-mono font-black text-sm tracking-wider hover:border-cyan-500/50 transition-all shadow-xl"
          >
            VEROYX
          </Link>
          <div className="px-3 py-1 rounded-full bg-rose-950/80 backdrop-blur-md border border-rose-500/40 text-rose-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            SPACE DOMAIN AWARENESS &middot; CONJUNCTION ASSESSMENT
          </div>
        </div>

        {/* Time Scrub Controls */}
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 pointer-events-auto shadow-xl">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isPlaying ? "PAUSE" : "RESUME"}</span>
          </button>

          {[1, 5, 25, 100].map(scale => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                timeScale === scale 
                  ? "bg-rose-500 text-slate-950 font-black shadow-md shadow-rose-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {scale}x
            </button>
          ))}

          <button
            onClick={() => { simStateRef.current.simTimeSec = 0 }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Reset Encounter Epoch"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 3. FLOATING LEFT TACTICAL HUD: ACTIVE CONJUNCTION DATA MESSAGE (CDM) */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Active Conjunction Criticality Alert */}
        <div className="p-4 rounded-xl bg-slate-950/80 backdrop-blur-md border border-rose-500/40 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-rose-400 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
              CONJUNCTION WARNING (CDM)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-500/30">
              {activeEvent.status}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">TARGET OBJECT</span>
              <span className="text-white font-bold">{activeEvent.targetName}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">NORAD CATALOG ID</span>
              <span className="text-cyan-400 font-bold">{activeEvent.targetNorad}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">COLLISION PROB (Pc)</span>
              <span className={telemetryUI.isCamActive ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {telemetryUI.currentPc}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">TIME TO TCA</span>
              <span className="text-amber-400 font-bold">{telemetryUI.timeToTcaSec} s</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">REL ENCOUNTER SPEED</span>
              <span className="text-white font-bold">{activeEvent.relSpeedKmS} km/s</span>
            </div>
          </div>
        </div>

        {/* Hill's Frame Miss Distance Vectors */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              B-PLANE DISPERSION (RIC)
            </span>
            <span className="text-[10px] text-purple-400">3-SIGMA FOSTER</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">RADIAL MISS (ΔR)</span>
              <span className="text-white font-bold">{telemetryUI.radialSeparationM} m</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">IN-TRACK MISS (ΔT)</span>
              <span className="text-white font-bold">{telemetryUI.inTrackSeparationM} m</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">CROSS-TRACK MISS (ΔN)</span>
              <span className="text-white font-bold">{telemetryUI.crossTrackSeparationM} m</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">TOTAL MISS DISTANCE</span>
              <span className={telemetryUI.isCamActive ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {telemetryUI.currentMissDistanceM.toLocaleString()} m
              </span>
            </div>
          </div>
        </div>

        {/* Catalog Conjunction Queue */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800 pb-1.5 text-white font-bold uppercase text-[11px] flex justify-between">
            <span>UPCOMING CONJUNCTIONS</span>
            <span className="text-[10px] text-slate-500">18TH SDS SWEEP</span>
          </div>

          <div className="space-y-1">
            {CONJUNCTION_EVENTS.map((event, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveEventIndex(idx)
                  setCamExecuted(false)
                }}
                className={`w-full px-2.5 py-1.5 rounded text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                  activeEventIndex === idx 
                    ? "bg-rose-950/80 border border-rose-500/80 text-white font-bold shadow-md shadow-rose-500/20" 
                    : "bg-slate-900/40 border border-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-200">{event.targetName.split(" ")[0]}</div>
                  <div className="text-[10px] text-slate-500">TCA: {event.tcaSec}s &middot; Miss: {event.missDistanceM}m</div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  event.status === "CRITICAL" ? "bg-rose-950 text-rose-400" : "bg-slate-800 text-slate-400"
                }`}>
                  {event.status}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 4. FLOATING RIGHT TACTICAL HUD: COLLISION AVOIDANCE MANEUVER (CAM) SOLVER */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        <div className="p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-emerald-500/40 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-emerald-400 uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              COLLISION AVOIDANCE SOLVER
            </span>
            <span className="text-[10px] text-emerald-300 font-bold">CAM OPTIMIZER</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">BURNOUT IMPULSE (ΔV)</span>
              <span className="text-emerald-400 font-bold">{camDeltaVMps} m/s</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={camDeltaVMps}
              onChange={(e) => {
                setCamDeltaVMps(Number(e.target.value))
                setCamExecuted(false)
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">EXPANDED MISS DISTANCE</span>
              <span className="text-emerald-400 font-bold">{camBudget.finalMissDistanceM.toLocaleString()} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">POST-MANEUVER Pc</span>
              <span className="text-emerald-400 font-bold">{camBudget.finalPc}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800/80 pt-1 text-slate-300">
              <span className="text-slate-400">PROP CONSUMPTION</span>
              <span className="text-white font-bold">{camBudget.fuelUsedKg} kg ({camBudget.fuelRemainingKg} kg rem)</span>
            </div>
          </div>

          {/* Execute CAM Button */}
          <button
            onClick={() => setCamExecuted(!camExecuted)}
            className={`w-full py-2.5 rounded-lg font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer ${
              camExecuted 
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/40" 
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
            }`}
          >
            {camExecuted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Flame className="w-4 h-4 fill-slate-950" />}
            {camExecuted ? "CAM EXECUTED &middot; ORBIT MITIGATED" : "EXECUTE AVOIDANCE BURN"}
          </button>
        </div>

      </div>

      {/* 5. BOTTOM STATUS BAR HUD */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">SDA SENSOR RADAR:</span>
            <span className="text-white font-bold">18TH SDS ACTIVE LINK</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <span>ENCOUNTER VOLUME:</span>
            <span className="text-rose-400 font-bold">RED ELLIPSOID = 3-SIGMA B-PLANE UNCERTAINTY</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-3">
          <span>SCROLL WHEEL TO ZOOM</span>
          <span className="text-slate-600">|</span>
          <span>EPOCH: <strong className="text-white">{telemetryUI.simTimeSec}s</strong></span>
        </div>
      </div>

    </div>
  )
}
