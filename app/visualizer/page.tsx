"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import * as THREE from "three"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Activity, 
  Compass, 
  Globe, 
  Crosshair, 
  Eye, 
  ShieldAlert, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  Target,
  Video
} from "lucide-react"

const TARGET_PRESETS = [
  { name: "ISS (ZARYA)", altKm: 418, incDeg: 51.6, color: "#38bdf8", type: "STATION" },
  { name: "COSMOS 1408 DEBRIS", altKm: 485, incDeg: 82.5, color: "#ef4444", type: "DEBRIS" },
  { name: "CAPE CANAVERAL SLC-40", lat: 28.56, lon: -80.57, color: "#10b981", type: "GROUND" }
]

export default function VisualizerPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Simulation timeline & controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  const [selectedTarget, setSelectedTarget] = useState<number>(0)
  const [cameraMode, setCameraMode] = useState<"GLOBAL" | "CHASE" | "INTERCEPT">("GLOBAL")
  
  // Real-time animation refs (Decoupled 60fps)
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 0,
    cameraMode: "GLOBAL" as "GLOBAL" | "CHASE" | "INTERCEPT",
    yaw: 0.7,
    pitch: 0.35,
    targetYaw: 0.7,
    targetPitch: 0.35,
    distance: 6.2,
    targetDistance: 6.2,
    isDragging: false,
    prevMouse: { x: 0, y: 0 }
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    altitudeKm: 550,
    velocityKmS: "7.59",
    trueAnomalyDeg: 12,
    rangeKm: 2840,
    rangeRateKmS: "-0.45",
    collisionProb: "3.2e-6",
    isEclipse: false
  })

  const [rangeHistory, setRangeHistory] = useState<number[]>(Array(24).fill(2800))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
    simStateRef.current.cameraMode = cameraMode
  }, [isPlaying, timeScale, cameraMode])

  // Orbital Mechanics Core
  const orbit = useMemo(() => {
    const mu = 398600.4418
    const rEarthKm = 6378.137
    const a = rEarthKm + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3))
    const periodSec = (2 * Math.PI) / n
    const j2 = 0.00108263
    const dRaanDt = -1.5 * ((j2 * Math.sqrt(mu) * Math.pow(rEarthKm, 2)) / Math.pow(a, 3.5)) * Math.cos(incRad)
    const velocityKmS = Math.sqrt(mu / a)

    return { a, incRad, n, periodSec, dRaanDt, velocityKmS, rEarthKm }
  }, [mission.altitudeKm, mission.inclinationDeg])

  // Three.js High-Fidelity Scene Setup
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 2.8, 6.2)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Starfield
    const starCount = 2000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 150
      starPos[i + 1] = (Math.random() - 0.5) * 150
      starPos[i + 2] = (Math.random() - 0.5) * 150
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.12, transparent: true, opacity: 0.85 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Directional Sunlight (Sun Vector along +X/+Z)
    const sunDir = new THREE.Vector3(9, 3, 7).normalize()
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8)
    sunLight.position.copy(sunDir.clone().multiplyScalar(15))
    scene.add(sunLight)

    const ambientLight = new THREE.AmbientLight(0x0e1726, 0.6)
    scene.add(ambientLight)

    const earthRadius = 1.75
    const textureLoader = new THREE.TextureLoader()

    // 1. PHOTOREALISTIC BLUE/BLACK MARBLE SPHERE
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

    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64)
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
        uniform vec3 sunDirection;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vSunDir = normalize((viewMatrix * vec4(sunDirection, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vSunDir;

        void main() {
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);

          float cosTheta = dot(vNormal, vSunDir);
          float dayFactor = clamp(cosTheta * 2.8, 0.0, 1.0);

          vec3 finalColor = mix(nightColor.rgb * 1.5, dayColor.rgb, dayFactor);

          if (dayColor.b > dayColor.r * 1.15 && cosTheta > 0.0) {
            vec3 viewDir = vec3(0.0, 0.0, 1.0);
            vec3 halfDir = normalize(vSunDir + viewDir);
            float spec = pow(max(dot(vNormal, halfDir), 0.0), 30.0);
            finalColor += vec3(0.35, 0.65, 0.95) * spec * dayFactor;
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    })

    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = (23.44 * Math.PI) / 180
    scene.add(earthGroup)

    const earthMesh = new THREE.Mesh(earthGeo, earthShaderMat)
    earthGroup.add(earthMesh)

    // Tropospheric Cloud Layer
    const cloudsTexture = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-clouds.png",
      () => renderer.render(scene, camera)
    )
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.008, 64, 64)
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat)
    earthGroup.add(cloudsMesh)

    // Atmospheric Rayleigh Glow Limb
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.032, 64, 64)
    const atmosMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
          gl_FragColor = vec4(0.14, 0.72, 1.0, 1.0) * intensity * 1.7;
        }
      `
    })
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat))

    // 2. 3D VOLUMETRIC UMBRA SHADOW CYLINDER (Deep Space Eclipse Cone)
    const shadowConeGeo = new THREE.CylinderGeometry(earthRadius, earthRadius * 1.3, 14, 32, 1, true)
    const shadowConeMat = new THREE.MeshBasicMaterial({
      color: 0x010309,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    const shadowConeMesh = new THREE.Mesh(shadowConeGeo, shadowConeMat)
    // Align cylinder opposite to sunlight vector
    const shadowDir = sunDir.clone().negate()
    shadowConeMesh.position.copy(shadowDir.clone().multiplyScalar(7))
    shadowConeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shadowDir)
    scene.add(shadowConeMesh)

    // 3. PRIMARY SPACECRAFT MODEL
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, linewidth: 2 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    const satGroup = new THREE.Group()

    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.13),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.9 })
    )
    satGroup.add(busMesh)

    const solarWingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.85 })
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.075), solarWingMat)
    leftWing.position.set(0.18, 0, 0)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.075), solarWingMat)
    rightWing.position.set(-0.18, 0, 0)
    satGroup.add(leftWing)
    satGroup.add(rightWing)

    const beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    )
    satGroup.add(beaconMesh)
    scene.add(satGroup)

    // 4. INTERCEPT TARGET (ISS / DEBRIS / LAUNCH SITE)
    const targetPreset = TARGET_PRESETS[selectedTarget]
    const targetOrbitRadius = earthRadius * ((6378.137 + (targetPreset.altKm || 400)) / 6378.137)

    const targetGroup = new THREE.Group()
    const targetMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(targetPreset.color), roughness: 0.3 })
    )
    targetGroup.add(targetMesh)

    // 3D Covariance Collision Ellipsoid (1-Sigma & 3-Sigma Foster Uncertainty Sphere)
    const covGeo = new THREE.SphereGeometry(0.14, 16, 16)
    covGeo.scale(1.8, 0.7, 0.9) // B-Plane covariance dispersion
    const covMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.22,
      wireframe: true
    })
    const covMesh = new THREE.Mesh(covGeo, covMat)
    targetGroup.add(covMesh)
    scene.add(targetGroup)

    // Target Trajectory Ring
    const targetCurve = new THREE.EllipseCurve(0, 0, targetOrbitRadius, targetOrbitRadius, 0, 2 * Math.PI, false, 0)
    const targetOrbitGeo = new THREE.BufferGeometry().setFromPoints(targetCurve.getPoints(140).map(p => new THREE.Vector3(p.x, 0, p.y)))
    const targetOrbitMat = new THREE.LineBasicMaterial({ color: new THREE.Color(targetPreset.color), transparent: true, opacity: 0.5, linewidth: 1.5 })
    const targetOrbitLine = new THREE.LineLoop(targetOrbitGeo, targetOrbitMat)
    targetOrbitLine.rotation.x = (targetPreset.incDeg || 51.6) * (Math.PI / 180)
    scene.add(targetOrbitLine)

    // 5. INTER-VEHICLE RANGEFINDER LASER VECTOR (Chaser -> Target)
    const rangefinderGeo = new THREE.BufferGeometry()
    rangefinderGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3))
    const rangefinderMat = new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 0.1, gapSize: 0.05, transparent: true, opacity: 0.95 })
    const rangefinderLine = new THREE.Line(rangefinderGeo, rangefinderMat)
    scene.add(rangefinderLine)

    // Nadir Swath Laser (Chaser -> Earth)
    const nadirGeo = new THREE.BufferGeometry()
    nadirGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3))
    const nadirMat = new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.08, gapSize: 0.04, transparent: true, opacity: 0.8 })
    const nadirLine = new THREE.Line(nadirGeo, nadirMat)
    scene.add(nadirLine)

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

      simStateRef.current.targetYaw += dx * 0.005
      simStateRef.current.targetPitch = Math.max(-1.3, Math.min(1.3, simStateRef.current.targetPitch + dy * 0.005))
    }

    const onMouseUp = () => {
      simStateRef.current.isDragging = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomDelta = e.deltaY * 0.003
      simStateRef.current.targetDistance = Math.max(2.4, Math.min(18.0, simStateRef.current.targetDistance + zoomDelta))
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

      // Rotate Earth & Clouds
      earthMesh.rotation.y = t * 0.015
      cloudsMesh.rotation.y = t * 0.018

      // Propagate Primary Spacecraft
      const u = (orbit.n * t) % (2 * Math.PI)
      const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)

      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satGroup.position.set(xE, yE, zE)
      satGroup.lookAt(0, 0, 0)

      // Propagate Target Object
      const targetSpeed = 0.065
      const uTarg = (t * targetSpeed + 0.8) % (2 * Math.PI)
      const xTOrb = targetOrbitRadius * Math.cos(uTarg)
      const zTOrb = targetOrbitRadius * Math.sin(uTarg)
      const targIncRad = (targetPreset.incDeg || 51.6) * (Math.PI / 180)

      const xTE = xTOrb
      const zTE = zTOrb * Math.cos(targIncRad)
      const yTE = zTOrb * Math.sin(targIncRad)

      targetGroup.position.set(xTE, yTE, zTE)

      // Update Rangefinder Laser (Sat -> Target)
      const rfPos = rangefinderGeo.attributes.position as THREE.BufferAttribute
      rfPos.setXYZ(0, xE, yE, zE)
      rfPos.setXYZ(1, xTE, yTE, zTE)
      rfPos.needsUpdate = true
      rangefinderLine.computeLineDistances()

      // Update Nadir Vector (Sat -> Earth Surface)
      const norm = new THREE.Vector3(xE, yE, zE).normalize()
      const surf = norm.clone().multiplyScalar(earthRadius * 1.002)
      const nadirPos = nadirGeo.attributes.position as THREE.BufferAttribute
      nadirPos.setXYZ(0, xE, yE, zE)
      nadirPos.setXYZ(1, surf.x, surf.y, surf.z)
      nadirPos.needsUpdate = true
      nadirLine.computeLineDistances()

      // Camera Modes Handling
      if (simStateRef.current.cameraMode === "CHASE") {
        // Locked Chase Camera: positioned directly behind spacecraft
        const forward = new THREE.Vector3(-Math.sin(u), 0, Math.cos(u)).normalize()
        const camPos = satGroup.position.clone().add(forward.clone().multiplyScalar(-0.6)).add(new THREE.Vector3(0, 0.35, 0))
        camera.position.lerp(camPos, 0.1)
        camera.lookAt(satGroup.position.clone().add(forward.clone().multiplyScalar(2.0)))
      } else if (simStateRef.current.cameraMode === "INTERCEPT") {
        // Intercept Framing: Midpoint between Chaser & Target
        const midPoint = satGroup.position.clone().add(targetGroup.position).multiplyScalar(0.5)
        const camPos = midPoint.clone().add(new THREE.Vector3(0, 1.2, 2.2))
        camera.position.lerp(camPos, 0.1)
        camera.lookAt(midPoint)
      } else {
        // Global Orbit View with Damping
        simStateRef.current.yaw += (simStateRef.current.targetYaw - simStateRef.current.yaw) * 0.1
        simStateRef.current.pitch += (simStateRef.current.targetPitch - simStateRef.current.pitch) * 0.1
        simStateRef.current.distance += (simStateRef.current.targetDistance - simStateRef.current.distance) * 0.1

        const curDist = simStateRef.current.distance
        camera.position.x = curDist * Math.sin(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
        camera.position.y = curDist * Math.sin(simStateRef.current.pitch)
        camera.position.z = curDist * Math.cos(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
        camera.lookAt(0, 0, 0)
      }

      renderer.render(scene, camera)

      // UI Dispatch (4 Hz = 250ms)
      if (now - lastUiSync > 250) {
        lastUiSync = now

        const satVec = new THREE.Vector3(xE, yE, zE)
        const targVec = new THREE.Vector3(xTE, yTE, zTE)
        const distKm = Math.round(satVec.distanceTo(targVec) * (orbit.rEarthKm / earthRadius))

        // Range-rate (relative radial velocity)
        const prevDist = rangeHistory[rangeHistory.length - 1] || distKm
        const rangeRate = (((distKm - prevDist) / 0.25) * 0.001).toFixed(2)

        const isEclipse = satVec.dot(sunDir) < 0 && new THREE.Vector2(satVec.y, satVec.z).length() < earthRadius

        setTelemetryUI({
          simTimeSec: Math.round(t),
          altitudeKm: mission.altitudeKm,
          velocityKmS: orbit.velocityKmS.toFixed(2),
          trueAnomalyDeg: Math.round((u * 180) / Math.PI),
          rangeKm: distKm,
          rangeRateKmS: rangeRate,
          collisionProb: distKm < 500 ? "4.1e-4" : distKm < 2000 ? "8.2e-6" : "< 1e-8",
          isEclipse
        })

        setRangeHistory(prev => [...prev.slice(1), distKm])
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
  }, [orbit, mission, selectedTarget])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-12 px-4 sm:px-8 font-sans selection:bg-cyan-500 selection:text-slate-950 select-none">
      <div className="max-w-[1720px] mx-auto space-y-4">

        {/* Master Console Header */}
        <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-1">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "20s" }} />
              NASA GSFC FDF &middot; ORBITAL RENDEZVOUS &amp; INTERCEPT ENGINE
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white font-mono uppercase">
              3D MISSION &amp; TARGET VISUALIZER
            </h1>
          </div>

          {/* Time & Camera Mode Controls */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
            {/* Camera View Switcher */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setCameraMode("GLOBAL")}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${cameraMode === "GLOBAL" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
              >
                GLOBAL 3D
              </button>
              <button
                onClick={() => setCameraMode("CHASE")}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${cameraMode === "CHASE" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
              >
                CHASE POV
              </button>
              <button
                onClick={() => setCameraMode("INTERCEPT")}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${cameraMode === "INTERCEPT" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
              >
                RPO CORRIDOR
              </button>
            </div>

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
                    ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {scale}x
              </button>
            ))}

            <button
              onClick={() => { simStateRef.current.simTimeSec = 0 }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Reset Orbit Epoch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN UNIFIED MISSION CONTROL FLIGHT DECK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

          {/* LEFT RAIL: KINEMATICS & PROXIMITY TELEMETRY */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  FLIGHT KINEMATICS
                </span>
                <span className="text-[10px] text-cyan-400">J2000 ECI</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">ALTITUDE</span>
                  <span className="text-white font-bold">{telemetryUI.altitudeKm} km</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">ORBITAL VELOCITY</span>
                  <span className="text-cyan-400 font-bold">{telemetryUI.velocityKmS} km/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">TRUE ANOMALY (ν)</span>
                  <span className="text-white font-bold">{telemetryUI.trueAnomalyDeg}&deg;</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">ORBITAL PERIOD</span>
                  <span className="text-white font-bold">{Math.round(orbit.periodSec / 60)} min</span>
                </div>
              </div>
            </div>

            {/* Inter-Vehicle RPO Telemetry */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="border-b border-slate-800 pb-2 text-white font-bold uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Target className="w-4 h-4 text-amber-400" />
                  INTER-VEHICLE RPO
                </span>
                <span className="text-[10px] text-amber-400">HILL'S LVLH</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-slate-800/40">
                  <span className="text-slate-500">TRACKED TARGET</span>
                  <span className="text-white font-bold">{TARGET_PRESETS[selectedTarget].name}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/40">
                  <span className="text-slate-500">RANGE (ρ)</span>
                  <span className="text-amber-400 font-bold">{telemetryUI.rangeKm.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/40">
                  <span className="text-slate-500">RANGE-RATE (ρ̇)</span>
                  <span className="text-white font-bold">{telemetryUI.rangeRateKmS} km/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/40">
                  <span className="text-slate-500">COLLISION PROB (Pc)</span>
                  <span className="text-rose-400 font-bold">{telemetryUI.collisionProb}</span>
                </div>
              </div>

              {/* Range Profile Trend Sparkline */}
              <div className="pt-1.5">
                <div className="text-[10px] text-slate-500 mb-1 flex justify-between">
                  <span>RANGE CLOSURE TREND</span>
                  <span className="text-amber-400 font-bold">{telemetryUI.rangeKm} km</span>
                </div>
                <div className="h-8 w-full bg-slate-950 rounded border border-slate-800 flex items-end px-1 gap-0.5 overflow-hidden">
                  {rangeHistory.map((val, idx) => {
                    const hPercent = Math.max(10, Math.min(100, (val / 5000) * 100))
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-amber-400/80 rounded-t-sm"
                        style={{ height: `${hPercent}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Target Selectors */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="border-b border-slate-800 pb-1.5 text-white font-bold uppercase text-[11px]">
                SELECT TRACKING TARGET
              </div>

              <div className="space-y-1">
                {TARGET_PRESETS.map((targ, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTarget(idx)}
                    className={`w-full px-2.5 py-1.5 rounded text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                      selectedTarget === idx 
                        ? "bg-cyan-950 border border-cyan-500/60 text-white font-bold shadow-md shadow-cyan-500/20" 
                        : "bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>{targ.name}</span>
                    <span className="text-[10px] text-slate-500">{targ.type}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: 3D PHOTOREALISTIC INTERCEPT ENGINE WITH COVARIANCE & SHADOW CONE */}
          <div className="lg:col-span-9 relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl flex flex-col">
            
            {/* Top Status Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between font-mono text-xs pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider">
                  CLOHESSY-WILTSHIRE RELATIVE ORBIT ENGINE
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">| CAMERA: {cameraMode}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  telemetryUI.isEclipse 
                    ? "bg-purple-950 border border-purple-500/40 text-purple-300"
                    : "bg-amber-950 border border-amber-500/40 text-amber-300"
                }`}>
                  {telemetryUI.isEclipse ? "ECLIPSE PASS (UMBRA)" : "SUNLIT PASS"}
                </span>
              </div>
            </div>

            {/* Three.js Mounting Container */}
            <div
              ref={mountRef}
              className="w-full h-[620px] block cursor-grab active:cursor-grabbing"
              title="Drag to orbit camera in 3D space"
            />

            {/* Bottom Contact & Control Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/85 backdrop-blur-md border-t border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs gap-3 pointer-events-none">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">RANGEFINDER LIDAR:</span>
                <span className="text-amber-400 font-bold">LOCKED &middot; {telemetryUI.rangeKm} km</span>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                <span>RED CONE = 3D VOLUMETRIC UMBRA SHADOW</span>
                <span className="text-slate-600">|</span>
                <span>EPOCH: <strong className="text-white">{telemetryUI.simTimeSec}s</strong></span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
