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
  Zap, 
  Compass, 
  Globe, 
  Cpu
} from "lucide-react"

const GROUND_STATIONS = [
  { name: "DSN Goldstone (CA)", lon: -116.88, lat: 35.42 },
  { name: "DSN Madrid (ES)", lon: -4.25, lat: 40.43 },
  { name: "DSN Canberra (AU)", lon: 148.98, lat: -35.40 },
  { name: "KSAT Svalbard (SG3)", lon: 15.40, lat: 78.23 },
  { name: "Wallops GS (VA)", lon: -75.46, lat: 37.94 }
]

export default function TelemetryPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 0,
    yaw: 0.5,
    pitch: 0.3,
    targetYaw: 0.5,
    targetPitch: 0.3,
    isDragging: false,
    prevMouse: { x: 0, y: 0 }
  })

  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    xEci: 0,
    yEci: 0,
    zEci: 0,
    vx: "0.000",
    vy: "0.000",
    vz: "0.000",
    latDeg: "0.00",
    lonDeg: "0.00",
    isEclipse: false,
    lockedStation: null as string | null,
    minRangeKm: 0,
    currentPowerW: 0
  })

  const [powerHistory, setPowerHistory] = useState<number[]>(Array(24).fill(280))

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

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
  }, [isPlaying, timeScale])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 2.5, 6.2)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Starfield
    const starCount = 1800
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 120
      starPos[i + 1] = (Math.random() - 0.5) * 120
      starPos[i + 2] = (Math.random() - 0.5) * 120
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.12, transparent: true, opacity: 0.9 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Lighting Configuration
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8)
    sunLight.position.set(8, 4, 8)
    scene.add(sunLight)

    const spaceAmbient = new THREE.AmbientLight(0x0e1c2e, 0.45)
    scene.add(spaceAmbient)

    // Earth Setup
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

    // Atmospheric Shader with Day/Night Urban Blending & Specular Ocean Reflection
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64)
    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3(8, 4, 8).normalize() }
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
          float dayFactor = clamp(cosTheta * 3.0, 0.0, 1.0);

          vec3 finalColor = mix(nightColor.rgb * 1.6, dayColor.rgb, dayFactor);

          // Specular water flare
          if (dayColor.b > dayColor.r * 1.15 && cosTheta > 0.0) {
            vec3 viewDir = vec3(0.0, 0.0, 1.0);
            vec3 halfDir = normalize(vSunDir + viewDir);
            float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
            finalColor += vec3(0.4, 0.7, 1.0) * spec * dayFactor;
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

    // Tropospheric Cloud Layer with Parallax Elevation
    const cloudsTexture = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-clouds.png",
      () => renderer.render(scene, camera)
    )
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.008, 64, 64)
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat)
    earthGroup.add(cloudsMesh)

    // Atmospheric Rayleigh Glow Limb
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.035, 64, 64)
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
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          gl_FragColor = vec4(0.12, 0.75, 1.0, 1.0) * intensity * 1.8;
        }
      `
    })
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat))

    // Ground Station Surface Nodes
    GROUND_STATIONS.forEach(gs => {
      const phi = (90 - gs.lat) * (Math.PI / 180)
      const theta = (gs.lon + 180) * (Math.PI / 180)
      const x = -(earthRadius * Math.sin(phi) * Math.cos(theta))
      const z = earthRadius * Math.sin(phi) * Math.sin(theta)
      const y = earthRadius * Math.cos(phi)

      const pinGeo = new THREE.SphereGeometry(0.02, 16, 16)
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      const pinMesh = new THREE.Mesh(pinGeo, pinMat)
      pinMesh.position.set(x, y, z)
      earthMesh.add(pinMesh)

      // Ring dome
      const ringGeo = new THREE.RingGeometry(0.028, 0.065, 24)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.position.set(x, y, z)
      ringMesh.lookAt(x * 2, y * 2, z * 2)
      earthMesh.add(ringMesh)
    })

    // 3D Orbital Trajectory Ring
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9, linewidth: 2 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // Spacecraft Vehicle
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

    // Volumetric Nadir Sensor Laser
    const nadirGeo = new THREE.BufferGeometry()
    nadirGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3))
    const nadirMat = new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.08, gapSize: 0.04, transparent: true, opacity: 0.9 })
    const nadirLine = new THREE.Line(nadirGeo, nadirMat)
    scene.add(nadirLine)

    // Interactive Drag Controls
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
      simStateRef.current.targetPitch = Math.max(-1.25, Math.min(1.25, simStateRef.current.targetPitch + dy * 0.005))
    }

    const onMouseUp = () => {
      simStateRef.current.isDragging = false
    }

    const dom = renderer.domElement
    dom.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    // Decoupled 60fps Loop
    let animId: number
    let lastTime = performance.now()
    let lastUiSync = performance.now()

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      simStateRef.current.yaw += (simStateRef.current.targetYaw - simStateRef.current.yaw) * 0.1
      simStateRef.current.pitch += (simStateRef.current.targetPitch - simStateRef.current.pitch) * 0.1

      const camDist = 6.2
      camera.position.x = camDist * Math.sin(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.position.y = camDist * Math.sin(simStateRef.current.pitch)
      camera.position.z = camDist * Math.cos(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.lookAt(0, 0, 0)

      if (simStateRef.current.isPlaying) {
        simStateRef.current.simTimeSec += dt * simStateRef.current.timeScale
      }

      const t = simStateRef.current.simTimeSec

      // Rotation & Cloud Layer Dynamics
      earthMesh.rotation.y = t * 0.015
      cloudsMesh.rotation.y = t * 0.018

      // Propagate in 3D
      const u = (orbit.n * t) % (2 * Math.PI)
      const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)

      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satGroup.position.set(xE, yE, zE)
      satGroup.lookAt(0, 0, 0)

      const norm = new THREE.Vector3(xE, yE, zE).normalize()
      const surf = norm.clone().multiplyScalar(earthRadius)
      const posAttr = nadirGeo.attributes.position as THREE.BufferAttribute
      posAttr.setXYZ(0, xE, yE, zE)
      posAttr.setXYZ(1, surf.x, surf.y, surf.z)
      posAttr.needsUpdate = true
      nadirLine.computeLineDistances()

      renderer.render(scene, camera)

      // UI Dispatch (4 Hz)
      if (now - lastUiSync > 250) {
        lastUiSync = now

        const xPosKm = orbit.a * Math.cos(u)
        const yPosKm = orbit.a * Math.sin(u)
        const xEciKm = xPosKm * Math.cos(raan) - yPosKm * Math.cos(orbit.incRad) * Math.sin(raan)
        const yEciKm = xPosKm * Math.sin(raan) + yPosKm * Math.cos(orbit.incRad) * Math.cos(raan)
        const zEciKm = yPosKm * Math.sin(orbit.incRad)

        const vx = -orbit.velocityKmS * Math.sin(u) * Math.cos(raan) - orbit.velocityKmS * Math.cos(u) * Math.cos(orbit.incRad) * Math.sin(raan)
        const vy = -orbit.velocityKmS * Math.sin(u) * Math.sin(raan) + orbit.velocityKmS * Math.cos(u) * Math.cos(orbit.incRad) * Math.cos(raan)
        const vz = orbit.velocityKmS * Math.cos(u) * Math.sin(orbit.incRad)

        const earthSpin = t * 7.2921159e-5
        const latR = Math.asin(zEciKm / orbit.a)
        let lonR = (Math.atan2(yEciKm, xEciKm) - earthSpin) % (2 * Math.PI)
        if (lonR > Math.PI) lonR -= 2 * Math.PI
        if (lonR < -Math.PI) lonR += 2 * Math.PI

        const isEclipse = xEciKm < 0 && Math.sqrt(yEciKm * yEciKm + zEciKm * zEciKm) < orbit.rEarthKm

        let lockedStation: string | null = null
        let minRangeKm = 9999
        for (const gs of GROUND_STATIONS) {
          const gsLat = (gs.lat * Math.PI) / 180
          const gsLon = (gs.lon * Math.PI) / 180
          const dLon = lonR - gsLon
          const dLat = latR - gsLat
          const aH = Math.sin(dLat / 2) ** 2 + Math.cos(latR) * Math.cos(gsLat) * Math.sin(dLon / 2) ** 2
          const dKm = orbit.rEarthKm * 2 * Math.asin(Math.min(1, Math.sqrt(aH)))
          if (dKm <= 2200) {
            lockedStation = gs.name
            minRangeKm = Math.round(dKm)
            break
          }
        }

        const pwr = isEclipse ? 0 : mission.busPowerW + mission.payloadPowerW

        setTelemetryUI({
          simTimeSec: Math.round(t),
          xEci: Math.round(xEciKm),
          yEci: Math.round(yEciKm),
          zEci: Math.round(zEciKm),
          vx: vx.toFixed(3),
          vy: vy.toFixed(3),
          vz: vz.toFixed(3),
          latDeg: ((latR * 180) / Math.PI).toFixed(2),
          lonDeg: ((lonR * 180) / Math.PI).toFixed(2),
          isEclipse,
          lockedStation,
          minRangeKm,
          currentPowerW: pwr
        })

        setPowerHistory(prev => [...prev.slice(1), pwr])
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
      renderer.dispose()
    }
  }, [orbit, mission])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 sm:px-8 font-sans selection:bg-cyan-500 selection:text-slate-950 select-none">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Master Console Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "20s" }} />
              NASA GSFC FDF &middot; Multi-Layer High-Fidelity Ephemeris Kernel
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TELEMETRY
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-3xl leading-relaxed">
              NASA Blue Marble day/night urban illumination, dynamic specular ocean glint, elevated tropospheric cloud layer, and real-time J2000 state vectors.
            </p>
          </div>

          {/* Time Controls */}
          <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isPlaying ? "PAUSE" : "RESUME"}</span>
            </button>

            {[1, 5, 25, 100].map(scale => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
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
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Reset Orbit Epoch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN NASA MISSION CONTROL FLIGHT DECK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* LEFT RAIL: J2000 STATE VECTORS & POSITION */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  J2000 STATE VECTOR
                </span>
                <span className="text-[10px] text-cyan-400">ECI FRAME</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">POS X</span>
                  <span className="text-white font-bold">{telemetryUI.xEci.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">POS Y</span>
                  <span className="text-white font-bold">{telemetryUI.yEci.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">POS Z</span>
                  <span className="text-white font-bold">{telemetryUI.zEci.toLocaleString()} km</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vx</span>
                  <span className="text-cyan-400 font-bold">{telemetryUI.vx} km/s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vy</span>
                  <span className="text-cyan-400 font-bold">{telemetryUI.vy} km/s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vz</span>
                  <span className="text-cyan-400 font-bold">{telemetryUI.vz} km/s</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2 text-white font-bold uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-400" /> SUB-SATELLITE NADIR POINT
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">LATITUDE</span>
                <span className="text-white font-bold">{telemetryUI.latDeg}&deg;</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">LONGITUDE</span>
                <span className="text-white font-bold">{telemetryUI.lonDeg}&deg;</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ALTITUDE</span>
                <span className="text-cyan-400 font-bold">{mission.altitudeKm} km</span>
              </div>
            </div>
          </div>

          {/* CENTER: 3D PHOTOREALISTIC MULTI-LAYER EARTH */}
          <div className="lg:col-span-6 relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl flex flex-col">
            
            {/* Top Status Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between font-mono text-xs pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider">
                  NASA BLUE/BLACK MARBLE
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">| SPECULAR GLINT</span>
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
              className="w-full h-[540px] block cursor-grab active:cursor-grabbing"
              title="Click and drag to rotate camera in 3D space"
            />

            {/* Bottom Contact & Control Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/85 backdrop-blur-md border-t border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs gap-3 pointer-events-none">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">GROUND STATION LINK:</span>
                <span className={telemetryUI.lockedStation ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                  {telemetryUI.lockedStation ? `AOS: ${telemetryUI.lockedStation} (${telemetryUI.minRangeKm}km)` : "LOS (SEARCHING CARRIER)"}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                <span>DRAG TO ROTATE 3D VIEW</span>
                <span className="text-slate-600">|</span>
                <span>EPOCH: <strong className="text-white">{telemetryUI.simTimeSec}s</strong></span>
              </div>
            </div>

          </div>

          {/* RIGHT RAIL: EPS BUS, SPARKLINE POWER & GNC */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  ELECTRICAL POWER BUS
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">NOMINAL</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">BUS VOLTAGE</span>
                  <span className="text-white font-bold">28.4 VDC</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">SOLAR ARRAY GEN</span>
                  <span className={telemetryUI.isEclipse ? "text-slate-500 font-bold" : "text-amber-400 font-bold"}>
                    {telemetryUI.currentPowerW} W
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">BATTERY STATE</span>
                  <span className={telemetryUI.isEclipse ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {telemetryUI.isEclipse ? "DISCHARGING (89%)" : "FLOAT TRICKLE (100%)"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">TOTAL BUS LOAD</span>
                  <span className="text-white font-bold">{mission.busPowerW + mission.payloadPowerW} W</span>
                </div>
              </div>

              {/* Real-time Oscilloscope / Sparkline Graph */}
              <div className="pt-2">
                <div className="text-[10px] text-slate-500 mb-1.5 flex justify-between">
                  <span>EPS POWER PROFILE TREND</span>
                  <span className="text-amber-400 font-bold">{telemetryUI.currentPowerW} W</span>
                </div>
                <div className="h-10 w-full bg-slate-950 rounded-lg border border-slate-800 flex items-end px-1 gap-0.5 overflow-hidden">
                  {powerHistory.map((val, idx) => {
                    const maxP = mission.busPowerW + mission.payloadPowerW + 50
                    const hPercent = Math.max(8, Math.min(100, (val / maxP) * 100))
                    return (
                      <div
                        key={idx}
                        className={`flex-1 transition-all rounded-t-sm ${val > 0 ? "bg-amber-400/80" : "bg-purple-500/40"}`}
                        style={{ height: `${hPercent}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2 text-white font-bold uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> ONBOARD GNC CONSOLE
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ORBIT INCLINATION</span>
                <span className="text-white font-bold">{mission.inclinationDeg}&deg;</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ORBITAL PERIOD</span>
                <span className="text-white font-bold">{Math.round(orbit.periodSec / 60)} min</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">VELOCITY MAGNITUDE</span>
                <span className="text-cyan-400 font-bold">{orbit.velocityKmS.toFixed(2)} km/s</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
