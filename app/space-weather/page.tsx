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
  ShieldAlert, 
  Zap, 
  
  CloudLightning,
  Sun,
  Globe2,
  Crosshair
} from "lucide-react"

export default function SpaceWeatherPage() {
  const { mission } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeScale, setTimeScale] = useState<number>(10)
  const [kpIndex, setKpIndex] = useState<number>(2) // Geomagnetic storm scale 0-9

  // Physics Constants
  const EARTH_RADIUS_KM = 6378.137
  const SAA_LAT_DEG = -25.0
  const SAA_LON_DEG = -45.0
  const SAA_RADIUS_KM = 2800
  const NOMINAL_FLUX = 15 // protons/cm^2/s
  const SAA_FLUX = 25000 // Severe trapped proton flux
  const VAN_ALLEN_FLUX = 120000

  // Kinetic state
  const simStateRef = useRef({
    isPlaying: true,
    timeScale: 10,
    kpIndex: 2,
    simTimeSec: 0,
    cameraYaw: 1.1,
    cameraPitch: 0.3,
    targetCameraYaw: 1.1,
    targetCameraPitch: 0.3,
    cameraDistance: 6.5,
    targetCameraDistance: 6.5,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    dragVelocity: { x: 0, y: 0 },
    accumulatedDoseKrad: 2.45 // Starting degraded state
  })

  // Throttled UI Telemetry (4 Hz)
  const [telemetryUI, setTelemetryUI] = useState({
    simTimeSec: 0,
    environmentState: "NOMINAL LEO PLASMA",
    fluxDensity: "15",
    doseRateRadHr: "0.01",
    totalDoseKrad: "2.450",
    seuProbability: "0.0001",
    isInsideSAA: false,
    isInsideBelt: false
  })

  const [fluxHistory, setFluxHistory] = useState<number[]>(Array(40).fill(NOMINAL_FLUX))

  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying
    simStateRef.current.timeScale = timeScale
    simStateRef.current.kpIndex = kpIndex
  }, [isPlaying, timeScale, kpIndex])

  const orbit = useMemo(() => {
    const mu = 398600.4418
    const a = EARTH_RADIUS_KM + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3))
    return { a, incRad, n }
  }, [mission.altitudeKm, mission.inclinationDeg])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 2000)
    camera.position.set(0, 2.0, 6.5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Space Starfield
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(3000 * 3)
    for (let i = 0; i < 9000; i++) starPos[i] = (Math.random() - 0.5) * 200
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.1, transparent: true, opacity: 0.6 })))

    const sunDir = new THREE.Vector3(7.0, 3.0, 5.0).normalize()
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.5)
    sunLight.position.copy(sunDir.clone().multiplyScalar(40))
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x061224, 0.5))

    const earthRadius = 1.75
    const textureLoader = new THREE.TextureLoader()
    const dayTexture = textureLoader.load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg", () => renderer.render(scene, camera))
    dayTexture.colorSpace = THREE.SRGBColorSpace
    const nightTexture = textureLoader.load("https://unpkg.com/three-globe/example/img/earth-night.jpg", () => renderer.render(scene, camera))
    nightTexture.colorSpace = THREE.SRGBColorSpace

    // Earth Shader
    const earthGeo = new THREE.SphereGeometry(earthRadius, 96, 96)
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { dayTexture: { value: dayTexture }, nightTexture: { value: nightTexture }, sunDirection: { value: sunDir } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vNormal; varying vec3 vSunDir;
        uniform vec3 sunDirection;
        void main() {
          vUv = uv; vNormal = normalize(normalMatrix * normal);
          vSunDir = normalize((viewMatrix * vec4(sunDirection, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture; uniform sampler2D nightTexture;
        varying vec2 vUv; varying vec3 vNormal; varying vec3 vSunDir;
        void main() {
          vec4 dayC = texture2D(dayTexture, vUv); vec4 nightC = texture2D(nightTexture, vUv);
          if (dayC.r > 0.85 && dayC.g > 0.85 && dayC.b > 0.85) { dayC.rgb *= 0.82; }
          float cosTheta = dot(vNormal, vSunDir);
          float dayFactor = smoothstep(-0.04, 0.14, cosTheta);
          vec3 finalC = mix(nightC.rgb * vec3(1.7, 1.4, 0.95) * 2.2, dayC.rgb, dayFactor);
          gl_FragColor = vec4(finalC, 1.0);
        }
      `
    })
    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = (23.44 * Math.PI) / 180
    scene.add(earthGroup)
    const earthMesh = new THREE.Mesh(earthGeo, earthMat); earthGroup.add(earthMesh)

    // Magnetic Dipole Frame (Tilted 11 degrees from rotation axis)
    const magFrame = new THREE.Group()
    magFrame.rotation.z = (11 * Math.PI) / 180
    earthGroup.add(magFrame)

    // Volumetric Van Allen Belt (Plasma Glow Shader)
    const beltGeo = new THREE.TorusGeometry(earthRadius * 1.8, earthRadius * 0.4, 32, 100)
    const beltMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
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
          float intensity = pow(rim, 2.5);
          gl_FragColor = vec4(0.8, 0.2, 1.0, intensity * 0.4); // Purple/Violet plasma
        }
      `
    })
    const beltMesh = new THREE.Mesh(beltGeo, beltMat)
    beltMesh.rotation.x = Math.PI / 2
    magFrame.add(beltMesh)

    // South Atlantic Anomaly (SAA) Volume
    const saaPhi = (90 - SAA_LAT_DEG) * (Math.PI / 180)
    const saaTheta = (SAA_LON_DEG + 180) * (Math.PI / 180)
    const saaX = -(earthRadius * Math.sin(saaPhi) * Math.cos(saaTheta))
    const saaZ = earthRadius * Math.sin(saaPhi) * Math.sin(saaTheta)
    const saaY = earthRadius * Math.cos(saaPhi)

    const saaGeo = new THREE.SphereGeometry(earthRadius * (SAA_RADIUS_KM / EARTH_RADIUS_KM), 32, 32)
    const saaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
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
          float rim = 1.0 - abs(dot(vNormal, vViewDir));
          float pulse = 0.5 + 0.5 * sin(gl_FragCoord.w * 10.0); // simple pulse
          gl_FragColor = vec4(1.0, 0.2, 0.0, pow(rim, 3.0) * 0.5);
        }
      `
    })
    const saaMesh = new THREE.Mesh(saaGeo, saaMat)
    saaMesh.position.set(saaX, saaY, saaZ)
    earthGroup.add(saaMesh)

    // Orbit Ring
    const orbitRadius = earthRadius * (orbit.a / EARTH_RADIUS_KM)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(180)
    const orbitLineGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)))
    const orbitLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 })
    const orbitLine = new THREE.LineLoop(orbitLineGeo, orbitLineMat)
    orbitLine.rotation.x = orbit.incRad
    scene.add(orbitLine)

    // Satellite
    const satMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.8, roughness: 0.2 })
    )
    scene.add(satMesh)

    // Interaction
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
      simStateRef.current.targetCameraDistance = Math.max(2.0, Math.min(15.0, simStateRef.current.targetCameraDistance + zoomDelta))
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
      if (simStateRef.current.isPlaying) {
        simStateRef.current.simTimeSec += timeStep
      }

      const t = simStateRef.current.simTimeSec

      // Rotate Earth ECEF
      earthMesh.rotation.y = t * 0.012
      saaMesh.rotation.y = t * 0.012 // Lock SAA to Earth's surface
      earthMesh.updateMatrixWorld()

      // Expand/Contract Belts based on Kp-Index Storm Severity
      const scaleFactor = 1.0 + (simStateRef.current.kpIndex * 0.05)
      beltMesh.scale.set(scaleFactor, scaleFactor, 1)

      // Propagate Satellite in ECI
      const u = (orbit.n * t) % (2 * Math.PI)
      const xOrb = orbitRadius * Math.cos(u)
      const zOrb = orbitRadius * Math.sin(u)
      
      const raan = (0 - 0.0001 * t) % (2 * Math.PI) // Simplified nodal precession
      const xE = xOrb * Math.cos(raan) - zOrb * Math.cos(orbit.incRad) * Math.sin(raan)
      const zE = xOrb * Math.sin(raan) + zOrb * Math.cos(orbit.incRad) * Math.cos(raan)
      const yE = zOrb * Math.sin(orbit.incRad)

      satMesh.position.set(xE, yE, zE)
      satMesh.lookAt(0, 0, 0)

      // Radiation Hazard Intersection Logic
      const satWorldPos = satMesh.position.clone()
      
      // 1. SAA Intersection (Earth coordinates)
      const saaWorldPos = new THREE.Vector3()
      saaMesh.getWorldPosition(saaWorldPos)
      const distToSaaKm = satWorldPos.distanceTo(saaWorldPos) * (EARTH_RADIUS_KM / earthRadius)
      const isInsideSAA = distToSaaKm < SAA_RADIUS_KM

      // 2. Van Allen Belt Intersection (Geomagnetic altitude constraint)
      const isInsideBelt = mission.altitudeKm > 1000 * (1 - simStateRef.current.kpIndex * 0.08)

      let currentFlux = NOMINAL_FLUX
      let envState = "NOMINAL LEO PLASMA"
      
      if (isInsideSAA) {
        currentFlux = SAA_FLUX * (1 - distToSaaKm / SAA_RADIUS_KM)
        envState = "CRITICAL: SOUTH ATLANTIC ANOMALY"
        satMesh.material.color.setHex(0xef4444) // Glow red
      } else if (isInsideBelt) {
        currentFlux = VAN_ALLEN_FLUX * (simStateRef.current.kpIndex / 5)
        envState = "WARNING: INNER RADIATION BELT"
        satMesh.material.color.setHex(0xa855f7) // Glow purple
      } else {
        satMesh.material.color.setHex(0xf1f5f9) // Nominal
      }

      // Add ambient Kp noise
      currentFlux += currentFlux * (simStateRef.current.kpIndex * 0.1 * Math.random())

      // Integration of Total Ionizing Dose (TID)
      // Shielding coefficient based on typical 4mm Aluminum equivalent
      const shieldingAttenuation = 0.00000002 
      const doseRateRadSec = currentFlux * shieldingAttenuation
      
      if (simStateRef.current.isPlaying) {
        simStateRef.current.accumulatedDoseKrad += (doseRateRadSec * timeStep) / 1000
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

      if (now - lastUiSync > 250) {
        lastUiSync = now
        
        // Single Event Upset (SEU) Probability Model (Weibull approximation)
        const seuProb = (currentFlux / 1000000) * 100

        setTelemetryUI({
          simTimeSec: Math.round(t),
          environmentState: envState,
          fluxDensity: Math.round(currentFlux).toLocaleString(),
          doseRateRadHr: (doseRateRadSec * 3600).toFixed(2),
          totalDoseKrad: simStateRef.current.accumulatedDoseKrad.toFixed(4),
          seuProbability: seuProb.toFixed(4),
          isInsideSAA,
          isInsideBelt
        })

        setFluxHistory(prev => [...prev.slice(1), currentFlux])
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

      {/* FLOATING LEFT HUD: DOSIMETRY & SAA */}
      <div className="absolute top-20 left-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        {/* Environment Alert Box */}
        <div className={`p-4 rounded-xl backdrop-blur-md border shadow-2xl space-y-2.5 transition-all ${
          telemetryUI.isInsideSAA ? "bg-rose-950/80 border-rose-500/60 shadow-rose-500/20" : 
          telemetryUI.isInsideBelt ? "bg-fuchsia-950/80 border-fuchsia-500/60 shadow-fuchsia-500/20" : 
          "bg-slate-950/75 border-slate-800/80"
        }`}>
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className={`font-bold uppercase flex items-center gap-1.5 ${telemetryUI.isInsideSAA ? "text-rose-400 animate-pulse" : telemetryUI.isInsideBelt ? "text-fuchsia-400" : "text-emerald-400"}`}>
              <ShieldAlert className="w-4 h-4" />
              FLIGHT ENVIRONMENT
            </span>
          </div>
          <div className={`font-black tracking-wide text-sm ${telemetryUI.isInsideSAA ? "text-rose-400" : telemetryUI.isInsideBelt ? "text-fuchsia-400" : "text-emerald-400"}`}>
            {telemetryUI.environmentState}
          </div>
          <div className="flex justify-between py-0.5 border-t border-slate-800/40 pt-1.5 mt-1.5">
            <span className="text-slate-400">PROTON FLUX DENSITY</span>
            <span className="text-white font-bold">{telemetryUI.fluxDensity} p/cm&sup2;/s</span>
          </div>
        </div>

        {/* Dosimetry Accumulator */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2.5">
          <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              TOTAL IONIZING DOSE (TID)
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">EXPOSURE RATE</span>
              <span className="text-amber-400 font-bold">{telemetryUI.doseRateRadHr} Rad/hr</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-500">LIFETIME ACCUMULATION</span>
              <span className="text-fuchsia-400 font-bold text-sm">{telemetryUI.totalDoseKrad} kRad</span>
            </div>
            <div className="flex justify-between py-0.5 pt-1">
              <span className="text-slate-500">SEU PROBABILITY (1Hz)</span>
              <span className={parseFloat(telemetryUI.seuProbability) > 0.05 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {telemetryUI.seuProbability} %
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* FLOATING RIGHT HUD: GEOMAGNETIC STORM Kp-INDEX */}
      <div className="absolute top-20 right-6 z-20 w-84 space-y-3 pointer-events-auto font-mono text-xs">
        
        <div className="p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-3">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <CloudLightning className="w-4 h-4 text-amber-400" />
              GEOMAGNETIC Kp-INDEX
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
              Kp {kpIndex}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">STORM INTENSITY (0-9)</span>
              <span className={kpIndex > 5 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {kpIndex < 4 ? "QUIET" : kpIndex < 6 ? "ACTIVE" : "SEVERE STORM (CME)"}
              </span>
            </div>
            <input
              type="range"
              min="0" max="9" step="1"
              value={kpIndex}
              onChange={(e) => setKpIndex(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <p className="text-[10px] text-slate-500 leading-tight pt-1">
              High Kp values compress the magnetosphere, pushing the Van Allen belts down into LEO altitudes and severely increasing radiation flux.
            </p>
          </div>
        </div>

        {/* Flux History Graph */}
        <div className="p-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-2xl space-y-2">
          <div className="border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-fuchsia-400" />
              FLUX PROFILE
            </span>
          </div>
          <div className="h-16 w-full bg-slate-950 rounded border border-slate-800/80 flex items-end px-0.5 gap-px overflow-hidden relative">
            {fluxHistory.map((val, idx) => {
              const maxScale = Math.max(30000, val)
              const hPercent = Math.max(2, Math.min(100, (val / maxScale) * 100))
              return (
                <div key={idx} className="flex-1 h-full relative flex items-end">
                  <div 
                    className={`w-full rounded-t-sm transition-all ${val > 20000 ? "bg-rose-500/90" : val > 1000 ? "bg-fuchsia-500/80" : "bg-emerald-500/60"}`}
                    style={{ height: `${hPercent}%` }}
                  />
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <div className="absolute bottom-4 left-6 right-6 z-20 px-5 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 flex items-center justify-between font-mono text-xs pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">VOLUMETRIC DATA:</span>
            <span className="text-rose-400 font-bold">RED = S.A.A.</span>
            <span className="text-slate-600">|</span>
            <span className="text-fuchsia-400 font-bold">PURPLE = VAN ALLEN BELT</span>
          </div>
        </div>
      </div>
    </div>
  )
}
