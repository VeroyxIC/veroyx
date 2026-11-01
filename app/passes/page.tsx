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
  Signal, 
  Wifi, 
  CheckCircle2, 
  Clock, 
  Maximize2,
  ChevronRight,
  TrendingDown,
  Volume2
} from "lucide-react"

interface GroundStation {
  name: string
  code: string
  lat: number
  lon: number
  elevMaskDeg: number
  carrierFreqGhz: number
  color: string
}

const STATIONS: GroundStation[] = [
  { name: "DSN Goldstone", code: "GDS-14", lat: 35.42, lon: -116.88, elevMaskDeg: 10, carrierFreqGhz: 8.45, color: "#38bdf8" },
  { name: "DSN Madrid", code: "MDR-65", lat: 40.43, lon: -4.25, elevMaskDeg: 10, carrierFreqGhz: 8.45, color: "#a855f7" },
  { name: "DSN Canberra", code: "CBR-43", lat: -35.40, lon: 148.98, elevMaskDeg: 10, carrierFreqGhz: 8.45, color: "#f59e0b" },
  { name: "KSAT Svalbard", code: "SG3-POL", lat: 78.23, lon: 15.40, elevMaskDeg: 5, carrierFreqGhz: 2.25, color: "#10b981" },
  { name: "Wallops Flight Facility", code: "WFF-1", lat: 37.94, lon: -75.46, elevMaskDeg: 7, carrierFreqGhz: 2.21, color: "#ec4899" }
]

export default function PassesPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  const [selectedStationIndex, setSelectedStationIndex] = useState<number>(0)

  const activeStation = STATIONS[selectedStationIndex]

  // Kinetic state for decoupled 60 FPS animation
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    simTimeSec: 0,
    selectedStationIndex: 0,
    yaw: 1.2,
    pitch: 0.35,
    targetYaw: 1.2,
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
    isAosActive: false,
    currentStationName: "DSN Goldstone",
    currentElevationDeg: 0,
    currentAzimuthDeg: 0,
    slantRangeKm: 3420,
    rangeRateKmS: "0.00",
    dopplerShiftKhz: "0.0",
    pathLossDb: 182.4,
    linkMarginDb: 8.4,
    nextAosSec: 640
  })

  const [rfHistory, setRfHistory] = useState<number[]>(Array(28).fill(0))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
    simStateRef.current.selectedStationIndex = selectedStationIndex
  }, [isPlaying, timeScale, selectedStationIndex])

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
    camera.position.set(0, 2.0, 5.6)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Cosmic Starfield
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

    // Rayleigh Atmosphere Limb
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

    // 3D INVERTED GROUND STATION ELEVATION CONES & SURFACE PINS
    const stationNodes: { group: THREE.Group; coneMesh: THREE.Mesh; posVec: THREE.Vector3; station: GroundStation }[] = []

    STATIONS.forEach((gs) => {
      const phi = (90 - gs.lat) * (Math.PI / 180)
      const theta = (gs.lon + 180) * (Math.PI / 180)
      const x = -(earthRadius * Math.sin(phi) * Math.cos(theta))
      const z = earthRadius * Math.sin(phi) * Math.sin(theta)
      const y = earthRadius * Math.cos(phi)

      const stGroup = new THREE.Group()
      stGroup.position.set(x, y, z)
      stGroup.lookAt(x * 2, y * 2, z * 2) // Orient outward along surface normal

      // Base Pin
      const pinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.02, 0.03, 16),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(gs.color), metalness: 0.8, roughness: 0.2 })
      )
      pinMesh.rotation.x = Math.PI / 2
      stGroup.add(pinMesh)

      // Inverted 3D Elevation Cone (Horizon Mask Volume)
      const coneHeight = 0.85
      const halfAngleRad = ((90 - gs.elevMaskDeg) * Math.PI) / 180
      const coneTopRadius = coneHeight * Math.tan(halfAngleRad * 0.45)

      const coneGeo = new THREE.ConeGeometry(coneTopRadius, coneHeight, 24, 1, true)
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(gs.color),
        transparent: true,
        opacity: 0.15,
        wireframe: true,
        side: THREE.DoubleSide
      })
      const coneMesh = new THREE.Mesh(coneGeo, coneMat)
      coneMesh.position.set(0, 0, coneHeight / 2)
      coneMesh.rotation.x = Math.PI / 2
      stGroup.add(coneMesh)

      earthMesh.add(stGroup)
      stationNodes.push({ group: stGroup, coneMesh, posVec: new THREE.Vector3(x, y, z), station: gs })
    })

    // Primary Satellite Trajectory Ring
    const orbitRadius = earthRadius * (orbit.a / orbit.rEarthKm)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, linewidth: 2 })
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // Primary Spacecraft Vehicle Assembly
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

    // Parabolic High-Gain Antenna (HGA) Dish
    const dishGeo = new THREE.ConeGeometry(0.04, 0.02, 16, 1, true)
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 })
    const dishMesh = new THREE.Mesh(dishGeo, dishMat)
    dishMesh.position.set(0, 0.05, 0)
    dishMesh.rotation.x = Math.PI
    satGroup.add(dishMesh)

    scene.add(satGroup)

    // Real-Time Active RF Contact Laser Beam (Sat -> Ground Station)
    const rfBeamGeo = new THREE.BufferGeometry()
    rfBeamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3))
    const rfBeamMat = new THREE.LineDashedMaterial({
      color: 0x10b981,
      dashSize: 0.08,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.95
    })
    const rfBeamLine = new THREE.Line(rfBeamGeo, rfBeamMat)
    scene.add(rfBeamLine)

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
      simStateRef.current.targetDistance = Math.max(2.4, Math.min(20.0, simStateRef.current.targetDistance + zoomDelta))
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

      // Rotate Earth (ECEF frame)
      earthMesh.rotation.y = t * 0.012
      cloudsMesh.rotation.y = t * 0.015

      // Propagate Primary Spacecraft (ECI frame)
      const u = (orbit.n * t) % (2 * Math.PI)
      const raan = (0 - orbit.dRaanDt * t) % (2 * Math.PI)

      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)

      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satGroup.position.set(xE, yE, zE)
      satGroup.lookAt(0, 0, 0) // Nadir pointing

      // Calculate Target Ground Station position in world coordinates
      const activeNode = stationNodes[simStateRef.current.selectedStationIndex]
      let stationWorldPos = new THREE.Vector3()
      let isInContact = false
      let elevationDeg = 0
      let azimuthDeg = 0
      let slantRangeKm = 3000
      let rangeRateKmS = 0

      if (activeNode) {
        activeNode.group.getWorldPosition(stationWorldPos)

        const satWorldPos = new THREE.Vector3(xE, yE, zE)
        const rhoVec = satWorldPos.clone().sub(stationWorldPos)
        slantRangeKm = Math.round(rhoVec.length() * (orbit.rEarthKm / earthRadius))

        // Surface normal at station
        const stationZenith = stationWorldPos.clone().normalize()
        const rhoNorm = rhoVec.clone().normalize()

        // Elevation angle
        const sinElev = rhoNorm.dot(stationZenith)
        elevationDeg = Math.round((Math.asin(Math.max(-1, Math.min(1, sinElev))) * 180) / Math.PI)

        // Contact condition
        isInContact = elevationDeg >= activeNode.station.elevMaskDeg

        // Point satellite dish toward active station if in contact
        if (isInContact) {
          dishMesh.lookAt(stationWorldPos)
        } else {
          dishMesh.rotation.set(Math.PI, 0, 0)
        }

        // Update RF contact beam
        const beamPos = rfBeamGeo.attributes.position as THREE.BufferAttribute
        beamPos.setXYZ(0, xE, yE, zE)
        beamPos.setXYZ(1, stationWorldPos.x, stationWorldPos.y, stationWorldPos.z)
        beamPos.needsUpdate = true
        rfBeamLine.computeLineDistances()
        rfBeamLine.visible = isInContact

        // Station cone highlight (safely bypass ASI)
        const coneMat = activeNode.coneMesh.material as THREE.MeshBasicMaterial
        coneMat.opacity = isInContact ? 0.35 : 0.12
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
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)

      // UI Dispatch (4 Hz = 250ms)
      if (now - lastUiSync > 250) {
        lastUiSync = now

        // Calculate Doppler shift
        const cKmS = 299792.458
        const f0Mhz = (activeNode?.station.carrierFreqGhz || 8.45) * 1000
        const vRadialApprox = isInContact ? (orbit.velocityKmS * (1 - (elevationDeg / 90)) * (t % 2 === 0 ? -1 : 1)) : 0
        const dopplerKhz = (-(f0Mhz * (vRadialApprox / cKmS)) * 1000).toFixed(1)

        // Free Space Path Loss
        const fsplDb = Math.round(20 * Math.log10(Math.max(100, slantRangeKm)) + 20 * Math.log10(activeNode?.station.carrierFreqGhz || 8.45) + 92.45)
        const linkMargin = isInContact ? (22.5 - (fsplDb - 170) * 0.15).toFixed(1) : "0.0"

        setTelemetryUI({
          simTimeSec: Math.round(t),
          isAosActive: isInContact,
          currentStationName: activeNode?.station.name || "DSN Goldstone",
          currentElevationDeg: Math.max(0, elevationDeg),
          currentAzimuthDeg: Math.round(((t * 3) % 360)),
          slantRangeKm,
          rangeRateKmS: vRadialApprox.toFixed(2),
          dopplerShiftKhz: dopplerKhz,
          pathLossDb: fsplDb,
          linkMarginDb: parseFloat(linkMargin),
          nextAosSec: isInContact ? 0 : Math.round(Math.max(30, 900 - (t % 900)))
        })

        setRfHistory(prev => [...prev.slice(1), isInContact ? parseFloat(linkMargin) : 0])
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
      
      {/* 1. FULL VIEWPORT THREE.JS WEBGL ENGINE */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        title="Click and drag to orbit camera, wheel to zoom"
      />

      {/* 3. FLOATING LEFT TACTICAL HUD: GROUND NETWORK & CONTACT STATUS */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Active Contact State Alert */}
        <div className={`p-4 rounded-xl backdrop-blur-md border shadow-2xl space-y-2.5 transition-all ${
          telemetryUI.isAosActive 
            ? "bg-slate-950/85 border-emerald-500/60 shadow-emerald-500/10" 
            : "bg-slate-950/75 border-slate-800/80"
        }`}>
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Wifi className={`w-4 h-4 ${telemetryUI.isAosActive ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
              CONTACT STATE
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              telemetryUI.isAosActive 
                ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300" 
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}>
              {telemetryUI.isAosActive ? "AOS (CARRIER LOCKED)" : "LOS (STANDBY)"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ACTIVE GROUND NODE</span>
              <span className="text-white font-bold">{activeStation.name} ({activeStation.code})</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ANTENNA ELEVATION</span>
              <span className={telemetryUI.isAosActive ? "text-emerald-400 font-bold" : "text-white font-bold"}>
                {telemetryUI.currentElevationDeg}&deg; (MASK: {activeStation.elevMaskDeg}&deg;)
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">ANTENNA AZIMUTH</span>
              <span className="text-cyan-400 font-bold">{telemetryUI.currentAzimuthDeg}&deg;</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">SLANT RANGE (ρ)</span>
              <span className="text-white font-bold">{telemetryUI.slantRangeKm.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">NEXT PASS AOS IN</span>
              <span className="text-amber-400 font-bold">
                {telemetryUI.isAosActive ? "CURRENTLY ACTIVE" : `${telemetryUI.nextAosSec} s`}
              </span>
            </div>
          </div>
        </div>

        {/* Ground Station Selection List */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800 pb-1.5 text-white font-bold uppercase text-[11px] flex justify-between">
            <span>NETWORK SITES (5 NODES)</span>
            <span className="text-[10px] text-slate-500">DSN / KSAT</span>
          </div>

          <div className="space-y-1">
            {STATIONS.map((gs, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedStationIndex(idx)}
                className={`w-full px-2.5 py-2 rounded text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                  selectedStationIndex === idx 
                    ? "bg-cyan-950/90 border border-cyan-500/80 text-white font-bold shadow-md shadow-cyan-500/20" 
                    : "bg-slate-900/40 border border-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: gs.color }} />
                    <span className="text-slate-200">{gs.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-4">{gs.code} &middot; {gs.carrierFreqGhz} GHz</div>
                </div>
                <span className="text-[10px] text-slate-400">{gs.elevMaskDeg}&deg; mask</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 4. FLOATING RIGHT TACTICAL HUD: RF LINK BUDGET & DOPPLER SHIFT */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* RF Physics Telemetry Card */}
        <div className="p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Signal className="w-4 h-4 text-cyan-400" />
              RF DOWNLINK BUDGET
            </span>
            <span className="text-[10px] text-cyan-400 font-bold">{activeStation.carrierFreqGhz} GHz</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">CARRIER FREQUENCY</span>
              <span className="text-white font-bold">{activeStation.carrierFreqGhz}00 GHz</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">DOPPLER FREQ SHIFT (Δf)</span>
              <span className={telemetryUI.isAosActive ? "text-amber-400 font-bold" : "text-slate-500 font-bold"}>
                {telemetryUI.dopplerShiftKhz} kHz
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">FREE-SPACE PATH LOSS</span>
              <span className="text-white font-bold">{telemetryUI.pathLossDb} dB</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">LINK MARGIN (Eb/N0)</span>
              <span className={telemetryUI.isAosActive ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                +{telemetryUI.linkMarginDb} dB
              </span>
            </div>
          </div>

          {/* Rolling Link Quality Graph */}
          <div>
            <div className="text-[10px] text-slate-500 mb-1 flex justify-between">
              <span>DOWNLINK MARGIN PROFILE</span>
              <span className="text-emerald-400 font-bold">+{telemetryUI.linkMarginDb} dB</span>
            </div>
            <div className="h-10 w-full bg-slate-950 rounded border border-slate-800 flex items-end px-1 gap-0.5 overflow-hidden">
              {rfHistory.map((val, idx) => {
                const hPercent = Math.max(8, Math.min(100, (val / 15) * 100))
                return (
                  <div
                    key={idx}
                    className={`flex-1 transition-all rounded-t-sm ${val > 0 ? "bg-emerald-400/80" : "bg-slate-800"}`}
                    style={{ height: `${hPercent}%` }}
                  />
                )
              })}
            </div>
          </div>
        </div>

      </div>

      {/* 5. BOTTOM STATUS BAR HUD */}
      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">GROUND TRACK:</span>
            <span className="text-white font-bold">5 RECEPTIVE STATIONS OPERATIONAL</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <span>CONES:</span>
            <span className="text-cyan-400 font-bold">INVERTED 3D HORIZON ELEVATION MASKS</span>
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
