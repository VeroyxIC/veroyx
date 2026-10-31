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
  Cpu,
  Layers,
  ZoomIn,
  ZoomOut,
  Target,
  ShieldAlert
} from "lucide-react"

const GROUND_STATIONS = [
  { name: "DSN Goldstone (CA)", lon: -116.88, lat: 35.42 },
  { name: "DSN Madrid (ES)", lon: -4.25, lat: 40.43 },
  { name: "DSN Canberra (AU)", lon: 148.98, lat: -35.40 },
  { name: "KSAT Svalbard (SG3)", lon: 15.40, lat: 78.23 },
  { name: "Wallops GS (VA)", lon: -75.46, lat: 37.94 }
]

// Prominent Resident Space Objects (RSOs) for SSA situational awareness
const CATALOGED_OBJECTS = [
  { name: "ISS (ZARYA)", altKm: 418, incDeg: 51.6, type: "STATION", color: "#38bdf8" },
  { name: "TIANGONG (CSS)", altKm: 390, incDeg: 41.5, type: "STATION", color: "#f43f5e" },
  { name: "HST (HUBBLE)", altKm: 535, incDeg: 28.5, type: "PAYLOAD", color: "#a855f7" },
  { name: "STARLINK-4128", altKm: 550, incDeg: 53.2, type: "CONSTELLATION", color: "#22c55e" },
  { name: "STARLINK-5012", altKm: 550, incDeg: 53.2, type: "CONSTELLATION", color: "#22c55e" },
  { name: "ONEWEB-0184", altKm: 1200, incDeg: 87.9, type: "CONSTELLATION", color: "#eab308" },
  { name: "NAVSTAR GPS-78", altKm: 20180, incDeg: 55.0, type: "MEO NAV", color: "#ec4899" },
  { name: "DEBRIS (SL-16 R/B)", altKm: 830, incDeg: 71.0, type: "DEBRIS", color: "#ef4444" },
  { name: "DEBRIS (COSMOS 1408)", altKm: 480, incDeg: 82.5, type: "DEBRIS", color: "#ef4444" },
  { name: "DEBRIS (FENGYUN 1C)", altKm: 865, incDeg: 98.6, type: "DEBRIS", color: "#ef4444" }
]

export default function TelemetryPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  const [showDebrisCloud, setShowDebrisCloud] = useState<boolean>(true)
  const [cameraMode, setCameraMode] = useState<"ORBIT" | "TARGET">("ORBIT")
  
  // High-performance animation ref with zoom and damping
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 0,
    yaw: 0.8,
    pitch: 0.35,
    targetYaw: 0.8,
    targetPitch: 0.35,
    distance: 5.6,
    targetDistance: 5.6,
    isDragging: false,
    prevMouse: { x: 0, y: 0 }
  })

  // Throttled UI state (4 Hz)
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
    camera.position.set(0, 2.5, 5.6)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Starfield
    const starCount = 2000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 140
      starPos[i + 1] = (Math.random() - 0.5) * 140
      starPos[i + 2] = (Math.random() - 0.5) * 140
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.12, transparent: true, opacity: 0.85 })
    scene.add(new THREE.Points(starGeo, starMat))

    // High-Resolution Resident Space Object (RSO) Debris Cloud (500 cataloged background fragments)
    const rsoCount = 500
    const rsoGeo = new THREE.BufferGeometry()
    const rsoPos = new Float32Array(rsoCount * 3)
    const earthRadius = 1.75
    
    // Store orbital parameters for animated background RSOs
    const rsoOrbits: { r: number; inc: number; raan: number; speed: number; u0: number }[] = []
    for (let i = 0; i < rsoCount; i++) {
      const altKm = 300 + Math.random() * 900 // LEO cluster
      const r = earthRadius * ((6378.137 + altKm) / 6378.137)
      const inc = (Math.random() * 110) * (Math.PI / 180)
      const raan = Math.random() * Math.PI * 2
      const speed = (0.6 + Math.random() * 0.8) * 0.05
      const u0 = Math.random() * Math.PI * 2
      rsoOrbits.push({ r, inc, raan, speed, u0 })
    }
    rsoGeo.setAttribute("position", new THREE.BufferAttribute(rsoPos, 3))
    const rsoMat = new THREE.PointsMaterial({ 
      color: 0x64748b, 
      size: 0.045, 
      transparent: true, 
      opacity: 0.65 
    })
    const rsoPoints = new THREE.Points(rsoGeo, rsoMat)
    scene.add(rsoPoints)

    // Lighting Configuration
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.7)
    sunLight.position.set(9, 4, 8)
    scene.add(sunLight)

    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.6)
    scene.add(ambientLight)

    // Earth Setup
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

    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64)
    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3(9, 4, 8).normalize() }
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

          // Specular water sheen
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

    // Atmospheric Cloud Layer
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

    // Rayleigh Scattering Atmospheric Glow
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

    // Ground Station Surface Nodes
    GROUND_STATIONS.forEach(gs => {
      const phi = (90 - gs.lat) * (Math.PI / 180)
      const theta = (gs.lon + 180) * (Math.PI / 180)
      const x = -(earthRadius * Math.sin(phi) * Math.cos(theta))
      const z = earthRadius * Math.sin(phi) * Math.sin(theta)
      const y = earthRadius * Math.cos(phi)

      const pinMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      )
      pinMesh.position.set(x, y, z)
      earthMesh.add(pinMesh)

      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.024, 0.055, 24),
        new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      )
      ringMesh.position.set(x, y, z)
      ringMesh.lookAt(x * 2, y * 2, z * 2)
      earthMesh.add(ringMesh)
    })

    // Prominent Resident Space Objects (ISS, Tiangong, Hubble, Starlink)
    const rsoMeshes: THREE.Mesh[] = []
    CATALOGED_OBJECTS.forEach(obj => {
      const objMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 12, 12),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(obj.color) })
      )
      scene.add(objMesh)
      rsoMeshes.push(objMesh)
    })

    // Primary Mission Orbital Trajectory Ring
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, linewidth: 2 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // Primary Spacecraft Vehicle
    const satGroup = new THREE.Group()

    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.9 })
    )
    satGroup.add(busMesh)

    const solarWingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.85 })
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.07), solarWingMat)
    leftWing.position.set(0.16, 0, 0)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.07), solarWingMat)
    rightWing.position.set(-0.16, 0, 0)
    satGroup.add(leftWing)
    satGroup.add(rightWing)

    const beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    )
    satGroup.add(beaconMesh)
    scene.add(satGroup)

    // Volumetric Nadir Vector Line
    const nadirGeo = new THREE.BufferGeometry()
    nadirGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3))
    const nadirMat = new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.08, gapSize: 0.04, transparent: true, opacity: 0.9 })
    const nadirLine = new THREE.Line(nadirGeo, nadirMat)
    scene.add(nadirLine)

    // Mouse Interaction: Click Drag + Wheel Zoom
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
      simStateRef.current.targetDistance = Math.max(2.6, Math.min(18.0, simStateRef.current.targetDistance + zoomDelta))
    }

    const dom = renderer.domElement
    dom.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    dom.addEventListener("wheel", onWheel, { passive: false })

    // Decoupled 60fps Animation Loop
    let animId: number
    let lastTime = performance.now()
    let lastUiSync = performance.now()

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      // Smooth camera interpolation (Damping for rotation & zoom)
      simStateRef.current.yaw += (simStateRef.current.targetYaw - simStateRef.current.yaw) * 0.1
      simStateRef.current.pitch += (simStateRef.current.targetPitch - simStateRef.current.pitch) * 0.1
      simStateRef.current.distance += (simStateRef.current.targetDistance - simStateRef.current.distance) * 0.1

      const curDist = simStateRef.current.distance
      camera.position.x = curDist * Math.sin(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.position.y = curDist * Math.sin(simStateRef.current.pitch)
      camera.position.z = curDist * Math.cos(simStateRef.current.yaw) * Math.cos(simStateRef.current.pitch)
      camera.lookAt(0, 0, 0)

      if (simStateRef.current.isPlaying) {
        simStateRef.current.simTimeSec += dt * simStateRef.current.timeScale
      }

      const t = simStateRef.current.simTimeSec

      // Rotate Earth & Clouds
      earthMesh.rotation.y = t * 0.015
      cloudsMesh.rotation.y = t * 0.018

      // Propagate Primary Mission Vehicle
      const u = (orbit.n * t) % (2 * Math.PI)
      const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)

      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satGroup.position.set(xE, yE, zE)
      satGroup.lookAt(0, 0, 0)

      // Update Nadir Vector Line
      const norm = new THREE.Vector3(xE, yE, zE).normalize()
      const surf = norm.clone().multiplyScalar(earthRadius)
      const posAttr = nadirGeo.attributes.position as THREE.BufferAttribute
      posAttr.setXYZ(0, xE, yE, zE)
      posAttr.setXYZ(1, surf.x, surf.y, surf.z)
      posAttr.needsUpdate = true
      nadirLine.computeLineDistances()

      // Propagate Cataloged RSOs (ISS, Starlink, Debris)
      CATALOGED_OBJECTS.forEach((obj, idx) => {
        const objMesh = rsoMeshes[idx]
        if (!objMesh) return

        const rObj = earthRadius * ((6378.137 + obj.altKm) / 6378.137)
        const incRad = (obj.incDeg * Math.PI) / 180
        const nObj = Math.sqrt(398600.4418 / Math.pow(6378.137 + obj.altKm, 3))
        const uObj = (nObj * t + idx * 1.2) % (2 * Math.PI)
        const raanObj = idx * 0.65

        const xo = rObj * Math.cos(uObj)
        const zo = rObj * Math.sin(uObj)

        const xe = xo * Math.cos(raanObj) - zo * Math.cos(incRad) * Math.sin(raanObj)
        const ze = xo * Math.sin(raanObj) + zo * Math.cos(incRad) * Math.cos(raanObj)
        const ye = zo * Math.sin(incRad)

        objMesh.position.set(xe, ye, ze)
      })

      // Animate Background RSO Debris Cloud Points
      const rsoPositions = rsoGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < rsoCount; i++) {
        const orb = rsoOrbits[i]
        const uCurrent = (orb.u0 + t * orb.speed) % (Math.PI * 2)
        const xo = orb.r * Math.cos(uCurrent)
        const zo = orb.r * Math.sin(uCurrent)

        const xe = xo * Math.cos(orb.raan) - zo * Math.cos(orb.inc) * Math.sin(orb.raan)
        const ze = xo * Math.sin(orb.raan) + zo * Math.cos(orb.inc) * Math.cos(orb.raan)
        const ye = zo * Math.sin(orb.inc)

        rsoPositions.setXYZ(i, xe, ye, ze)
      }
      rsoPositions.needsUpdate = true

      renderer.render(scene, camera)

      // UI Dispatch (4 Hz = 250ms)
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
      dom.removeEventListener("wheel", onWheel)
      renderer.dispose()
    }
  }, [orbit, mission])

  const handleZoom = (direction: "IN" | "OUT") => {
    if (direction === "IN") {
      simStateRef.current.targetDistance = Math.max(2.6, simStateRef.current.targetDistance - 1.0)
    } else {
      simStateRef.current.targetDistance = Math.min(18.0, simStateRef.current.targetDistance + 1.0)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-12 px-4 sm:px-8 font-sans selection:bg-cyan-500 selection:text-slate-950 select-none">
      <div className="max-w-[1720px] mx-auto space-y-4">

        {/* Console Header */}
        <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-1">
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "20s" }} />
              USSPACECOM 18TH SDS &middot; SPACE DOMAIN AWARENESS (SDA) TELEMETRY DECK
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TELEMETRY &middot; J2 PROPAGATION
            </h1>
          </div>

          {/* Time & Camera Controls */}
          <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
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

          {/* LEFT RAIL: J2000 STATE VECTORS & RSO CATALOG */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  J2000 STATE VECTOR
                </span>
                <span className="text-[10px] text-cyan-400">ECI FRAME</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">POS X</span>
                  <span className="text-white font-bold">{telemetryUI.xEci.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">POS Y</span>
                  <span className="text-white font-bold">{telemetryUI.yEci.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">POS Z</span>
                  <span className="text-white font-bold">{telemetryUI.zEci.toLocaleString()} km</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vx</span>
                  <span className="text-cyan-400 font-bold">{telemetryUI.vx} km/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vy</span>
                  <span className="text-cyan-400 font-bold">{telemetryUI.vy} km/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">VEL Vz</span>
                  <span className="text-cyan-400 font-bold">{telemetryUI.vz} km/s</span>
                </div>
              </div>
            </div>

            {/* Resident Space Objects (RSOs) Live Radar List */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="border-b border-slate-800 pb-2 text-white font-bold uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  SDA OBJECT PROXIMITY
                </span>
                <span className="text-[10px] text-slate-400">510 TRACKED</span>
              </div>

              <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                {CATALOGED_OBJECTS.map((obj, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: obj.color }} />
                      <span className="text-slate-300 font-bold">{obj.name}</span>
                    </div>
                    <span className="text-slate-500">{obj.altKm}km &middot; {obj.incDeg}&deg;</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: FULL-DEPTH 3D INTERACTIVE WEBGL GLOBE WITH ZOOM & RSO CLOUD */}
          <div className="lg:col-span-6 relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl flex flex-col">
            
            {/* Top Status Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between font-mono text-xs pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider">
                  SPACE DOMAIN AWARENESS ENGINE
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">| AXIAL TILT 23.44&deg;</span>
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

            {/* Interactive Zoom Overlay Controls */}
            <div className="absolute right-4 top-16 z-10 flex flex-col gap-1.5 font-mono">
              <button
                onClick={() => handleZoom("IN")}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-md"
                title="Zoom Camera In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom("OUT")}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-md"
                title="Zoom Camera Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Three.js Mounting Container */}
            <div
              ref={mountRef}
              className="w-full h-[560px] block cursor-grab active:cursor-grabbing"
              title="Drag to orbit, scroll to zoom"
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
                <span>SCROLL WHEEL TO ZOOM</span>
                <span className="text-slate-600">|</span>
                <span>EPOCH: <strong className="text-white">{telemetryUI.simTimeSec}s</strong></span>
              </div>
            </div>

          </div>

          {/* RIGHT RAIL: EPS BUS, SPARKLINE POWER & GNC */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  ELECTRICAL POWER BUS
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">NOMINAL</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">BUS VOLTAGE</span>
                  <span className="text-white font-bold">28.4 VDC</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">SOLAR ARRAY GEN</span>
                  <span className={telemetryUI.isEclipse ? "text-slate-500 font-bold" : "text-amber-400 font-bold"}>
                    {telemetryUI.currentPowerW} W
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">BATTERY STATE</span>
                  <span className={telemetryUI.isEclipse ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {telemetryUI.isEclipse ? "DISCHARGING (89%)" : "FLOAT TRICKLE (100%)"}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-500">TOTAL BUS LOAD</span>
                  <span className="text-white font-bold">{mission.busPowerW + mission.payloadPowerW} W</span>
                </div>
              </div>

              {/* Real-time Oscilloscope / Sparkline Graph */}
              <div className="pt-1.5">
                <div className="text-[10px] text-slate-500 mb-1 flex justify-between">
                  <span>EPS POWER PROFILE TREND</span>
                  <span className="text-amber-400 font-bold">{telemetryUI.currentPowerW} W</span>
                </div>
                <div className="h-9 w-full bg-slate-950 rounded border border-slate-800 flex items-end px-1 gap-0.5 overflow-hidden">
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

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="border-b border-slate-800 pb-2 text-white font-bold uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> ONBOARD GNC &amp; ORBIT
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
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ALTITUDE</span>
                <span className="text-cyan-400 font-bold">{mission.altitudeKm} km</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
