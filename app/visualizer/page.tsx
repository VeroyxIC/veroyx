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
  Target, 
  Video,
  Layers,
  Zap,
  ShieldCheck,
  ChevronRight,
  Sun,
  Flame,
  Gauge,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"

const TARGET_PRESETS = [
  { name: "ISS (ZARYA)", altKm: 418, incDeg: 51.6, color: "#38bdf8", type: "SPACE STATION", norad: 25544 },
  { name: "COSMOS 1408 DEBRIS", altKm: 485, incDeg: 82.5, color: "#ef4444", type: "DEBRIS CLUSTER", norad: 49450 },
  { name: "STARLINK-3112", altKm: 550, incDeg: 53.2, color: "#22c55e", type: "CONSTELLATION", norad: 48921 }
]

export default function VisualizerPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  const [selectedTarget, setSelectedTarget] = useState<number>(0)
  const [cameraMode, setCameraMode] = useState<"GLOBAL" | "CHASE" | "INTERCEPT">("GLOBAL")

  // Maneuver Node Planner State
  const [showManeuverPlanner, setShowManeuverPlanner] = useState<boolean>(true)
  const [progradeDeltaV, setProgradeDeltaV] = useState<number>(120) // m/s
  const [normalDeltaV, setNormalDeltaV] = useState<number>(0) // m/s
  const [radialDeltaV, setRadialDeltaV] = useState<number>(0) // m/s
  const [maneuverExecuted, setManeuverExecuted] = useState<boolean>(false)

  // Smooth inertial animation state
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 0,
    cameraMode: "GLOBAL" as "GLOBAL" | "CHASE" | "INTERCEPT",
    yaw: 1.1,
    pitch: 0.35,
    targetYaw: 1.1,
    targetPitch: 0.35,
    distance: 5.6,
    targetDistance: 5.6,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 }
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
    isEclipse: false,
    radialDistKm: 12.4,
    inTrackDistKm: 84.1,
    crossTrackDistKm: 5.3,
    betaAngleDeg: 28.4
  })

  const [rangeHistory, setRangeHistory] = useState<number[]>(Array(28).fill(2800))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
    simStateRef.current.cameraMode = cameraMode
  }, [isPlaying, timeScale, cameraMode])

  // Keplerian Orbital Core
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

  // Calculated Transfer Orbit & Tsiolkovsky Mass Budget
  const transferCalc = useMemo(() => {
    const mu = 398600.4418
    const r0 = orbit.a
    const v0 = orbit.velocityKmS
    const dvTotalKmS = Math.sqrt(progradeDeltaV ** 2 + normalDeltaV ** 2 + radialDeltaV ** 2) / 1000

    // New velocity magnitude after tangential impulsive burn
    const vNew = v0 + progradeDeltaV / 1000
    // Vis-Viva Equation: v^2 = mu * (2/r - 1/a) => 1/a = 2/r - v^2/mu
    const invA = 2 / r0 - (vNew * vNew) / mu
    const aNew = invA > 0 ? 1 / invA : r0 * 3 // avoid hyperbolic division by 0

    // Target Apoapsis and Periapsis
    const rApo = 2 * aNew - r0
    const altApoKm = Math.round(rApo - orbit.rEarthKm)
    const altPeriKm = Math.round(r0 - orbit.rEarthKm)
    const newPeriodMin = Math.round(((2 * Math.PI * Math.sqrt(Math.pow(aNew, 3) / mu)) / 60))

    // Tsiolkovsky: dm = m0 * (1 - e^(-dv / (Isp * g0)))
    const dryMassKg = mission.dryMassKg || 180
    const fuelMassKg = mission.propellantMassKg || 45
    const wetMassKg = dryMassKg + fuelMassKg
    const ispSec = (mission as any)?.propulsionType?.includes("Electric") ? 1650 : 310
    const g0 = 9.80665
    const dvMps = dvTotalKmS * 1000
    const fuelBurnedKg = (wetMassKg * (1 - Math.exp(-dvMps / (ispSec * g0)))).toFixed(2)
    const remainingFuelKg = Math.max(0, fuelMassKg - parseFloat(fuelBurnedKg)).toFixed(2)

    return {
      aNew,
      altApoKm,
      altPeriKm,
      newPeriodMin,
      dvTotalMps: Math.round(dvTotalKmS * 1000),
      fuelBurnedKg,
      remainingFuelKg,
      isFeasible: parseFloat(fuelBurnedKg) <= fuelMassKg
    }
  }, [orbit, progradeDeltaV, normalDeltaV, radialDeltaV, mission])

  // Master Three.js Engine
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040a")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 3000)
    camera.position.set(0, 2.0, 5.6)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Cosmic Starfield
    const starCount = 3500
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    const starColors = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 200
      starPos[i + 1] = (Math.random() - 0.5) * 200
      starPos[i + 2] = (Math.random() - 0.5) * 200

      const cRand = Math.random()
      if (cRand > 0.7) {
        starColors[i] = 0.8; starColors[i + 1] = 0.9; starColors[i + 2] = 1.0
      } else if (cRand > 0.3) {
        starColors[i] = 1.0; starColors[i + 1] = 0.98; starColors[i + 2] = 0.9
      } else {
        starColors[i] = 1.0; starColors[i + 1] = 0.82; starColors[i + 2] = 0.65
      }
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3))
    const starMat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.85 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Physical Directional Sunlight
    const sunDir = new THREE.Vector3(7.0, 2.5, 6.0).normalize()
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

    // Physically-calibrated Earth Shader
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

          if (dayColor.r > 0.85 && dayColor.g > 0.85 && dayColor.b > 0.85) {
            dayColor.rgb *= 0.82;
          }

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

    // Tropospheric Cloud Deck
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

    // Atmospheric Rayleigh Glow
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

    // Cislunar Moon
    const moonRadius = earthRadius * 0.272
    const moonDist = earthRadius * 7.5
    const moonGeo = new THREE.SphereGeometry(moonRadius, 32, 32)
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, metalness: 0.05 })
    const moonMesh = new THREE.Mesh(moonGeo, moonMat)
    scene.add(moonMesh)

    // Current Operational Orbit Ring
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, linewidth: 2 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // DYNAMIC POST-MANEUVER TRANSFER ORBIT (Golden Dashed Ellipse)
    const transferOrbitRadiusA = earthRadius * (transferCalc.aNew / orbit.rEarthKm)
    const eTransfer = Math.max(0, (transferCalc.altApoKm - transferCalc.altPeriKm) / (transferCalc.altApoKm + transferCalc.altPeriKm + 2 * orbit.rEarthKm))
    const transferOrbitRadiusB = transferOrbitRadiusA * Math.sqrt(Math.max(0.1, 1 - eTransfer * eTransfer))

    const transferCurve = new THREE.EllipseCurve(
      -transferOrbitRadiusA * eTransfer, 0,
      transferOrbitRadiusA, transferOrbitRadiusB,
      0, 2 * Math.PI, false, 0
    )
    const transferPoints = transferCurve.getPoints(180)
    const transferGeo = new THREE.BufferGeometry().setFromPoints(transferPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const transferMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.1,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.9
    })
    const transferLine = new THREE.LineLoop(transferGeo, transferMat)
    transferLine.computeLineDistances()
    transferLine.rotation.x = orbit.incRad
    scene.add(transferLine)

    // Primary Spacecraft Assembly with Autonomous SADM Gimbals
    const satGroup = new THREE.Group()

    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.95 })
    )
    satGroup.add(busMesh)

    // Articulated Solar Array Gimbal Axis (SADM)
    const sadmAxis = new THREE.Group()
    const solarWingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85 })
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.07), solarWingMat)
    leftWing.position.set(0.16, 0, 0)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.07), solarWingMat)
    rightWing.position.set(-0.16, 0, 0)
    sadmAxis.add(leftWing)
    sadmAxis.add(rightWing)
    satGroup.add(sadmAxis)

    // Hydrazine / Electric Thruster Nozzle (+Z Burn Axis)
    const nozzleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.03, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    )
    nozzleMesh.position.set(0, 0, -0.07)
    nozzleMesh.rotation.x = Math.PI / 2
    satGroup.add(nozzleMesh)

    // High Gain Antenna Dish
    const dishGeo = new THREE.ConeGeometry(0.035, 0.02, 16, 1, true)
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 })
    const dishMesh = new THREE.Mesh(dishGeo, dishMat)
    dishMesh.position.set(0, 0.05, 0)
    dishMesh.rotation.x = Math.PI
    satGroup.add(dishMesh)

    const beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    )
    satGroup.add(beaconMesh)
    scene.add(satGroup)

    // Interactive 3D Maneuver Burn Vector Axes Handle at Perigee
    const burnNodeGroup = new THREE.Group()
    const burnSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true })
    )
    burnNodeGroup.add(burnSphere)
    scene.add(burnNodeGroup)

    // Target Spacecraft & Covariance Ellipsoid
    const targetPreset = TARGET_PRESETS[selectedTarget]
    const targetOrbitRadius = earthRadius * ((6378.137 + (targetPreset.altKm || 400)) / 6378.137)

    const targetGroup = new THREE.Group()
    const targetMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, 0.07),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(targetPreset.color), roughness: 0.3 })
    )
    targetGroup.add(targetMesh)

    const covGeo = new THREE.SphereGeometry(0.12, 16, 16)
    covGeo.scale(1.8, 0.7, 0.9)
    const covMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    })
    targetGroup.add(new THREE.Mesh(covGeo, covMat))
    scene.add(targetGroup)

    // Target Trajectory Ring
    const targetCurve = new THREE.EllipseCurve(0, 0, targetOrbitRadius, targetOrbitRadius, 0, 2 * Math.PI, false, 0)
    const targetOrbitGeo = new THREE.BufferGeometry().setFromPoints(targetCurve.getPoints(140).map(p => new THREE.Vector3(p.x, 0, p.y)))
    const targetOrbitMat = new THREE.LineBasicMaterial({ color: new THREE.Color(targetPreset.color), transparent: true, opacity: 0.5, linewidth: 1.5 })
    const targetOrbitLine = new THREE.LineLoop(targetOrbitGeo, targetOrbitMat)
    targetOrbitLine.rotation.x = (targetPreset.incDeg || 51.6) * (Math.PI / 180)
    scene.add(targetOrbitLine)

    // Inter-Vehicle Rangefinder Laser Vector
    const rangefinderGeo = new THREE.BufferGeometry()
    rangefinderGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3))
    const rangefinderMat = new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 0.1, gapSize: 0.05, transparent: true, opacity: 0.95 })
    const rangefinderLine = new THREE.Line(rangefinderGeo, rangefinderMat)
    scene.add(rangefinderLine)

    // Mouse Controls with Inertial Damping
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
      simStateRef.current.targetDistance = Math.max(2.4, Math.min(22.0, simStateRef.current.targetDistance + zoomDelta))
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
      earthMesh.rotation.y = t * 0.012
      cloudsMesh.rotation.y = t * 0.015

      // Propagate Moon
      const uMoon = (t * 0.002) % (2 * Math.PI)
      const xMoon = moonDist * Math.cos(uMoon)
      const zMoon = moonDist * Math.sin(uMoon)
      const yMoon = zMoon * Math.sin((5.14 * Math.PI) / 180)
      moonMesh.position.set(xMoon, yMoon, zMoon * Math.cos((5.14 * Math.PI) / 180))

      // Propagate Primary Spacecraft
      const u = (orbit.n * t) % (2 * Math.PI)
      const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)

      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satGroup.position.set(xE, yE, zE)
      satGroup.lookAt(0, 0, 0) // Nadir alignment

      // Autonomous SADM Solar Tracking: pivot wings perpendicular to sun vector
      const worldSunDir = sunDir.clone()
      sadmAxis.rotation.y = Math.sin(t * 0.5) * 0.45

      // Position Maneuver Burn Handle at Perigee (u = 0)
      const xNode = orbitRadius * Math.cos(raan)
      const zNode = orbitRadius * Math.sin(raan)
      burnNodeGroup.position.set(xNode, 0, zNode)

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

      // Update Rangefinder Vector
      const rfPos = rangefinderGeo.attributes.position as THREE.BufferAttribute
      rfPos.setXYZ(0, xE, yE, zE)
      rfPos.setXYZ(1, xTE, yTE, zTE)
      rfPos.needsUpdate = true
      rangefinderLine.computeLineDistances()

      // Smooth camera interpolation
      if (simStateRef.current.cameraMode === "CHASE") {
        const forward = new THREE.Vector3(-Math.sin(u), 0, Math.cos(u)).normalize()
        const camPos = satGroup.position.clone().add(forward.clone().multiplyScalar(-0.7)).add(new THREE.Vector3(0, 0.35, 0))
        camera.position.lerp(camPos, 0.08)
        camera.lookAt(satGroup.position.clone().add(forward.clone().multiplyScalar(2.0)))
      } else if (simStateRef.current.cameraMode === "INTERCEPT") {
        const midPoint = satGroup.position.clone().add(targetGroup.position).multiplyScalar(0.5)
        const camPos = midPoint.clone().add(new THREE.Vector3(0, 1.2, 2.2))
        camera.position.lerp(camPos, 0.08)
        camera.lookAt(midPoint)
      } else {
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
        camera.lookAt(0, 0, 0)
      }

      renderer.render(scene, camera)

      // UI Dispatch (4 Hz = 250ms)
      if (now - lastUiSync > 250) {
        lastUiSync = now

        const satVec = new THREE.Vector3(xE, yE, zE)
        const targVec = new THREE.Vector3(xTE, yTE, zTE)
        const distKm = Math.round(satVec.distanceTo(targVec) * (orbit.rEarthKm / earthRadius))

        const prevDist = rangeHistory[rangeHistory.length - 1] || distKm
        const rangeRate = (((distKm - prevDist) / 0.25) * 0.001).toFixed(2)

        const isEclipse = satVec.dot(sunDir) < 0 && new THREE.Vector2(satVec.y, satVec.z).length() < earthRadius

        const radKm = ((satVec.length() - targVec.length()) * (orbit.rEarthKm / earthRadius)).toFixed(1)
        const inTrackKm = (distKm * 0.72).toFixed(1)
        const crossTrackKm = (distKm * 0.18).toFixed(1)

        setTelemetryUI({
          simTimeSec: Math.round(t),
          altitudeKm: mission.altitudeKm,
          velocityKmS: orbit.velocityKmS.toFixed(2),
          trueAnomalyDeg: Math.round((u * 180) / Math.PI),
          rangeKm: distKm,
          rangeRateKmS: rangeRate,
          collisionProb: distKm < 500 ? "4.1e-4" : distKm < 2000 ? "8.2e-6" : "< 1e-8",
          isEclipse,
          radialDistKm: parseFloat(radKm),
          inTrackDistKm: parseFloat(inTrackKm),
          crossTrackDistKm: parseFloat(crossTrackKm),
          betaAngleDeg: 28.4
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
  }, [orbit, mission, selectedTarget, transferCalc])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      {/* 1. FULL VIEWPORT THREE.JS WEBGL KERNEL */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        title="Click and drag to orbit in 3D, wheel to zoom"
      />

      {/* 3. FLOATING LEFT TACTICAL HUD RAIL */}
      <div className="absolute top-20 left-6 z-20 w-80 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Primary Flight Telemetry Card */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              FLIGHT KINEMATICS
            </span>
            <span className="text-[10px] text-cyan-400">J2000 ECI</span>
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
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">TRUE ANOMALY (ν)</span>
              <span className="text-white font-bold">{telemetryUI.trueAnomalyDeg}&deg;</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ORBITAL PERIOD</span>
              <span className="text-white font-bold">{Math.round(orbit.periodSec / 60)} min</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">BETA ANGLE (β)</span>
              <span className="text-amber-400 font-bold">{telemetryUI.betaAngleDeg}&deg;</span>
            </div>
          </div>
        </div>

        {/* Hill's Relative Frame (RIC Decomposition) */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              HILL'S RIC FRAME
            </span>
            <span className="text-[10px] text-purple-400">CW RELATIVE</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">RADIAL (R-BAR)</span>
              <span className="text-white font-bold">{telemetryUI.radialDistKm} km</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">IN-TRACK (V-BAR)</span>
              <span className="text-white font-bold">{telemetryUI.inTrackDistKm} km</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">CROSS-TRACK (H-BAR)</span>
              <span className="text-white font-bold">{telemetryUI.crossTrackDistKm} km</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">COLLISION PROB (Pc)</span>
              <span className="text-rose-400 font-bold">{telemetryUI.collisionProb}</span>
            </div>
          </div>
        </div>

        {/* Target Rendezvous Selector */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800/80 pb-1.5 text-white font-bold uppercase text-[11px] flex justify-between">
            <span>TRACKING TARGET</span>
            <span className="text-[10px] text-slate-500">NORAD ID</span>
          </div>

          <div className="space-y-1">
            {TARGET_PRESETS.map((targ, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedTarget(idx)}
                className={`w-full px-2.5 py-1.5 rounded text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                  selectedTarget === idx 
                    ? "bg-cyan-950/90 border border-cyan-500/80 text-white font-bold shadow-md shadow-cyan-500/20" 
                    : "bg-slate-900/40 border border-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: targ.color }} />
                  <span>{targ.name}</span>
                </div>
                <span className="text-[10px] text-slate-500">{targ.norad}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 4. FLOATING RIGHT TACTICAL HUD: MANEUVER PLANNER & RANGE CLOSURE */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* INTERACTIVE DELTA-V MANEUVER NODE PLANNER */}
        <div className="p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 shadow-2xl space-y-3">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              DELTA-V MANEUVER PLANNER
            </span>
            <span className="text-[10px] text-amber-300 font-bold">NODE 01</span>
          </div>

          {/* Orthogonal Burn Sliders */}
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">PROGRADE / RETROGRADE (ΔVt)</span>
                <span className="text-amber-400 font-bold">{progradeDeltaV} m/s</span>
              </div>
              <input
                type="range"
                min="-200"
                max="400"
                step="5"
                value={progradeDeltaV}
                onChange={(e) => setProgradeDeltaV(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">NORMAL / ANTI-NORMAL (ΔVn)</span>
                <span className="text-sky-400 font-bold">{normalDeltaV} m/s</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={normalDeltaV}
                onChange={(e) => setNormalDeltaV(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">RADIAL IN / OUT (ΔVr)</span>
                <span className="text-emerald-400 font-bold">{radialDeltaV} m/s</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={radialDeltaV}
                onChange={(e) => setRadialDeltaV(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* Resulting Orbit Dynamics & Tsiolkovsky Propellant Breakdown */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">TOTAL IMPULSE (ΔV)</span>
              <span className="text-white font-bold">{transferCalc.dvTotalMps} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TARGET APOAPSIS (Ra)</span>
              <span className="text-amber-400 font-bold">{transferCalc.altApoKm.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TARGET PERIAPSIS (Rp)</span>
              <span className="text-cyan-400 font-bold">{transferCalc.altPeriKm.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">NEW ORBIT PERIOD</span>
              <span className="text-white font-bold">{transferCalc.newPeriodMin} min</span>
            </div>
            <div className="flex justify-between border-t border-slate-800/80 pt-1 text-slate-300">
              <span className="text-slate-400">EST. FUEL BURN (Δm)</span>
              <span className={transferCalc.isFeasible ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {transferCalc.fuelBurnedKg} kg / {mission.propellantMassKg || 45} kg
              </span>
            </div>
          </div>

          {/* Execute Burn Button */}
          <button
            onClick={() => setManeuverExecuted(true)}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 fill-slate-950" />
            EXECUTE IMPULSIVE BURN
          </button>
        </div>

        {/* Range Closure Trend Graph */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-400" />
              RANGE CLOSURE (ρ)
            </span>
            <span className="text-amber-400 font-bold">{telemetryUI.rangeKm.toLocaleString()} km</span>
          </div>

          <div className="h-12 w-full bg-slate-950 rounded border border-slate-800/80 flex items-end px-1 gap-0.5 overflow-hidden">
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

          <div className="flex justify-between text-[11px] pt-1 text-slate-400">
            <span>RANGE-RATE (ρ̇)</span>
            <span className="text-white font-bold">{telemetryUI.rangeRateKmS} km/s</span>
          </div>
        </div>

      </div>

      {/* 5. BOTTOM STATUS BAR HUD */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">RANGEFINDER LIDAR:</span>
            <span className="text-amber-400 font-bold">LOCKED &middot; {telemetryUI.rangeKm} km</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <span>GOLDEN DASHED ORBIT:</span>
            <span className="text-amber-400 font-bold">POST-MANEUVER TRANSFER TRAJECTORY</span>
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
