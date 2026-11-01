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
  Video,
  Layers,
  Zap,
  Camera,
  Aperture,
  Scan,
  Map as MapIcon,
  Maximize2
} from "lucide-react"

export default function SwathPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  
  // Payload Steering Controls
  const [sensorRollDeg, setSensorRollDeg] = useState<number>(0)
  const [sensorPitchDeg, setSensorPitchDeg] = useState<number>(0)
  const [sensorFovDeg, setSensorFovDeg] = useState<number>(15)

  // Kinetic state for decoupled 60 FPS animation
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 0,
    sensorRoll: 0,
    sensorPitch: 0,
    sensorFov: 15,
    yaw: 0.6,
    pitch: 0.45,
    targetYaw: 0.6,
    targetPitch: 0.45,
    distance: 4.2,
    targetDistance: 4.2,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 }
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    altitudeKm: 550,
    velocityKmS: "7.59",
    targetLatDeg: "0.00",
    targetLonDeg: "0.00",
    slantRangeKm: 550,
    swathWidthKm: 145,
    gsdCm: 32.5,
    isTargetingSurface: true,
    isEclipse: false
  })

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
    simStateRef.current.sensorRoll = (sensorRollDeg * Math.PI) / 180
    simStateRef.current.sensorPitch = (sensorPitchDeg * Math.PI) / 180
    simStateRef.current.sensorFov = (sensorFovDeg * Math.PI) / 180
  }, [isPlaying, timeScale, sensorRollDeg, sensorPitchDeg, sensorFovDeg])

  // Orbital Mechanics
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

  // Master WebGL Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040a")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 3000)
    camera.position.set(0, 2.0, 4.2)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Cosmic Starfield
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

    // Directional Sunlight
    const sunDir = new THREE.Vector3(7.0, 2.5, 6.0).normalize()
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.0)
    sunLight.position.copy(sunDir.clone().multiplyScalar(40))
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x061224, 0.45))

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
    const earthGeo = new THREE.SphereGeometry(earthRadius, 128, 128)
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
          if (dayColor.r > 0.85 && dayColor.g > 0.85 && dayColor.b > 0.85) { dayColor.rgb *= 0.82; }

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

    // Atmosphere
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.012, 96, 96)
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
          float rayleigh = pow(rim, 4.5) * 1.2;
          gl_FragColor = vec4(vec3(0.18, 0.65, 1.0) * rayleigh, rayleigh * 0.7);
        }
      `
    })
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat))

    // Orbit Ring
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, linewidth: 1.5 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // Satellite Assembly
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

    // Articulated Payload Gimbal
    const payloadGimbal = new THREE.Group()
    payloadGimbal.position.set(0, -0.04, 0)
    
    // Camera / SAR Lens
    const lensMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.9 })
    )
    lensMesh.rotation.x = Math.PI / 2
    lensMesh.position.set(0, 0, 0.03)
    payloadGimbal.add(lensMesh)

    // Volumetric FOV Cone
    const fovConeGeo = new THREE.ConeGeometry(0.3, 1.0, 32, 1, true)
    const fovConeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
      side: THREE.DoubleSide
    })
    const fovConeMesh = new THREE.Mesh(fovConeGeo, fovConeMat)
    fovConeMesh.rotation.x = -Math.PI / 2
    fovConeMesh.position.set(0, 0, 0.5)
    payloadGimbal.add(fovConeMesh)

    // Central Boresight Laser
    const boresightGeo = new THREE.BufferGeometry()
    boresightGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0,0,0, 0,0,2]), 3))
    const boresightMat = new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.05, gapSize: 0.05 })
    const boresightLine = new THREE.Line(boresightGeo, boresightMat)
    boresightLine.computeLineDistances()
    payloadGimbal.add(boresightLine)

    satGroup.add(payloadGimbal)
    scene.add(satGroup)

    // Ground Footprint Swath (Projected on Earth)
    const footprintGeo = new THREE.RingGeometry(0.01, 0.03, 32)
    const footprintMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    const footprintMesh = new THREE.Mesh(footprintGeo, footprintMat)
    scene.add(footprintMesh)

    // Raycaster for surface projection
    const raycaster = new THREE.Raycaster()

    // Controls
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
      const zoomDelta = e.deltaY * 0.003
      simStateRef.current.targetDistance = Math.max(1.8, Math.min(12.0, simStateRef.current.targetDistance + zoomDelta))
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
        simStateRef.current.simTimeSec += dt * simStateRef.current.timeScale
      }
      const t = simStateRef.current.simTimeSec

      // Rotation
      earthMesh.rotation.y = t * 0.012
      earthMesh.updateMatrixWorld()

      // Propagate
      const u = (orbit.n * t) % (2 * Math.PI)
      const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)
      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satGroup.position.set(xE, yE, zE)
      
      // Local coordinate frame (LVLH-ish) to keep nadir pointing standard
      satGroup.lookAt(0, 0, 0)
      
      // Articulate Gimbal based on UI sliders
      payloadGimbal.rotation.order = "ZYX"
      payloadGimbal.rotation.z = simStateRef.current.sensorRoll // Roll (Cross-track)
      payloadGimbal.rotation.x = simStateRef.current.sensorPitch // Pitch (In-track)
      
      // Scale FOV Cone
      const fovRad = simStateRef.current.sensorFov
      const coneHeight = 1.5 // visual representation length
      const coneRadius = coneHeight * Math.tan(fovRad / 2)
      fovConeMesh.scale.set(coneRadius / 0.3, 1, coneRadius / 0.3)

      // Raycast to find intersection with Earth
      const worldGimbalPos = new THREE.Vector3()
      const worldBoresightDir = new THREE.Vector3(0, 0, 1)
      payloadGimbal.getWorldPosition(worldGimbalPos)
      worldBoresightDir.transformDirection(payloadGimbal.matrixWorld).normalize()

      raycaster.set(worldGimbalPos, worldBoresightDir)
      const intersects = raycaster.intersectObject(earthMesh)
      
      let slantRangeKm = 0
      let isTargetingSurface = false
      let latDeg = 0
      let lonDeg = 0

      if (intersects.length > 0) {
        isTargetingSurface = true
        const hit = intersects[0]
        footprintMesh.visible = true
        footprintMesh.position.copy(hit.point)
        footprintMesh.lookAt(0, 0, 0) // Orient flat to surface normal

        // Calculate Slant Range
        slantRangeKm = Math.round(hit.distance * (orbit.rEarthKm / earthRadius))

        // Scale footprint based on slant range and FOV
        const footprintRadius = hit.distance * Math.tan(fovRad / 2)
        footprintMesh.scale.set(footprintRadius / 0.02, footprintRadius / 0.02, 1)

        // Calculate Lat/Lon (convert hit point to local sphere coordinates)
        const localHit = earthMesh.worldToLocal(hit.point.clone()).normalize()
        latDeg = Math.asin(localHit.y) * (180 / Math.PI)
        lonDeg = Math.atan2(localHit.z, localHit.x) * (180 / Math.PI)
      } else {
        footprintMesh.visible = false
      }

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
      
      // Track the satellite or the footprint
      camera.lookAt(satGroup.position.clone().multiplyScalar(0.7))

      renderer.render(scene, camera)

      // UI Dispatch
      if (now - lastUiSync > 250) {
        lastUiSync = now

        // Swath Width Calculation: W = 2 * R * tan(FOV/2)
        const swathWidthKm = isTargetingSurface ? Math.round(2 * slantRangeKm * Math.tan(fovRad / 2)) : 0
        
        // Simplified GSD approximation based on slant range
        // Assumes a 10um pixel pitch and 1.5m focal length
        const gsdCm = isTargetingSurface ? ((slantRangeKm * 1000) * (10e-6) / 1.5) * 100 : 0

        const satVec = new THREE.Vector3(xE, yE, zE)
        const isEclipse = satVec.dot(sunDir) < 0 && new THREE.Vector2(satVec.y, satVec.z).length() < earthRadius

        setTelemetryUI({
          simTimeSec: Math.round(t),
          altitudeKm: mission.altitudeKm,
          velocityKmS: orbit.velocityKmS.toFixed(2),
          targetLatDeg: latDeg.toFixed(3),
          targetLonDeg: lonDeg.toFixed(3),
          slantRangeKm,
          swathWidthKm,
          gsdCm: parseFloat(gsdCm.toFixed(1)),
          isTargetingSurface,
          isEclipse
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
  }, [orbit])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        title="Click and drag to orbit camera, wheel to zoom"
      />

      {/* FLOATING LEFT TACTICAL HUD */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Payload Steering Controls */}
        <div className="p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" />
              PAYLOAD GIMBAL STEERING
            </span>
            <span className="text-[10px] text-amber-300 font-bold">OFF-NADIR PKG</span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">ROLL (CROSS-TRACK)</span>
                <span className="text-white font-bold">{sensorRollDeg}&deg;</span>
              </div>
              <input
                type="range"
                min="-45" max="45" step="1"
                value={sensorRollDeg}
                onChange={(e) => setSensorRollDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">PITCH (IN-TRACK)</span>
                <span className="text-sky-400 font-bold">{sensorPitchDeg}&deg;</span>
              </div>
              <input
                type="range"
                min="-45" max="45" step="1"
                value={sensorPitchDeg}
                onChange={(e) => setSensorPitchDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">APERTURE FOV</span>
                <span className="text-emerald-400 font-bold">{sensorFovDeg}&deg;</span>
              </div>
              <input
                type="range"
                min="5" max="40" step="1"
                value={sensorFovDeg}
                onChange={(e) => setSensorFovDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setSensorRollDeg(0); setSensorPitchDeg(0); }}
              className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
            >
              RESET NADIR
            </button>
          </div>
        </div>

        {/* Flight Kinematics */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              FLIGHT KINEMATICS
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ALTITUDE</span>
              <span className="text-white font-bold">{telemetryUI.altitudeKm} km</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ORBITAL VELOCITY</span>
              <span className="text-cyan-400 font-bold">{telemetryUI.velocityKmS} km/s</span>
            </div>
          </div>
        </div>

      </div>

      {/* FLOATING RIGHT TACTICAL HUD: REMOTE SENSING TARGET */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Ground Intercept Coordinates */}
        <div className={`p-4 rounded-xl backdrop-blur-md border shadow-2xl space-y-2.5 transition-all ${
          telemetryUI.isTargetingSurface 
            ? "bg-slate-950/85 border-amber-500/60 shadow-amber-500/10" 
            : "bg-slate-950/75 border-rose-500/60"
        }`}>
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <MapIcon className={`w-4 h-4 ${telemetryUI.isTargetingSurface ? "text-amber-400" : "text-rose-500"}`} />
              SURFACE TARGET
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              telemetryUI.isTargetingSurface 
                ? "bg-amber-950 border border-amber-500/40 text-amber-300" 
                : "bg-rose-950 border border-rose-500/40 text-rose-300"
            }`}>
              {telemetryUI.isTargetingSurface ? "SURFACE ACQUIRED" : "LOOKING AT SPACE"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">LATITUDE</span>
              <span className="text-white font-bold">{telemetryUI.isTargetingSurface ? `${telemetryUI.targetLatDeg}°` : "N/A"}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">LONGITUDE</span>
              <span className="text-white font-bold">{telemetryUI.isTargetingSurface ? `${telemetryUI.targetLonDeg}°` : "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Optical/SAR Telemetry */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Aperture className="w-4 h-4 text-cyan-400" />
              SWATH TELEMETRY
            </span>
            <span className="text-[10px] text-cyan-400">MULTISPECTRAL</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SLANT RANGE</span>
              <span className="text-white font-bold">{telemetryUI.isTargetingSurface ? `${telemetryUI.slantRangeKm.toLocaleString()} km` : "N/A"}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SWATH WIDTH</span>
              <span className="text-amber-400 font-bold">{telemetryUI.isTargetingSurface ? `${telemetryUI.swathWidthKm.toLocaleString()} km` : "N/A"}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ESTIMATED GSD</span>
              <span className="text-emerald-400 font-bold">{telemetryUI.isTargetingSurface ? `${telemetryUI.gsdCm} cm/px` : "N/A"}</span>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM STATUS BAR HUD */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">SENSOR STATE:</span>
            <span className={telemetryUI.isTargetingSurface ? "text-amber-400 font-bold" : "text-rose-400 font-bold"}>
              {telemetryUI.isTargetingSurface ? "COLLECTING DATA" : "OFF-NADIR (SPACE)"}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-3">
          <span>EPOCH: <strong className="text-white">{telemetryUI.simTimeSec}s</strong></span>
        </div>
      </div>

    </div>
  )
}
