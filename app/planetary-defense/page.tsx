"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Globe, Target, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Activity, Layers, Gauge, Crosshair, 
  ArrowRight, ShieldCheck, ShieldAlert, Zap, Orbit, Flame, Rocket 
} from "lucide-react"

type AsteroidPreset = "DIMORPHOS_DART" | "APOPHIS_99942" | "BENNU_101955" | "EXTINCTION_CLASS_1KM"

interface AsteroidSpec {
  name: string
  diameterM: number
  massKg: number
  densityGcm3: number
  composition: "RUBBLE_PILE_CHONDRITE" | "METALLIC_NIFE" | "CARBONACEOUS_B_TYPE" | "MONOLITHIC_SILICATE"
  nominalRelativeVelKms: number
  leadTimeYears: number
  baselineImpactProbPct: number
  description: string
  colorHex: string
}

const PRESETS: Record<AsteroidPreset, AsteroidSpec> = {
  "DIMORPHOS_DART": {
    name: "Dimorphos (Didymos B Binary)",
    diameterM: 160,
    massKg: 4.3e9,
    densityGcm3: 2.1,
    composition: "RUBBLE_PILE_CHONDRITE",
    nominalRelativeVelKms: 6.14,
    leadTimeYears: 4.5,
    baselineImpactProbPct: 100.0,
    description: "NASA DART mission target validating momentum enhancement factor beta = 3.6 from high-speed ejecta momentum recoil.",
    colorHex: "#38bdf8"
  },
  "APOPHIS_99942": {
    name: "99942 Apophis (Potentially Hazardous)",
    diameterM: 340,
    massKg: 6.1e10,
    densityGcm3: 2.6,
    composition: "MONOLITHIC_SILICATE",
    nominalRelativeVelKms: 12.8,
    leadTimeYears: 8.0,
    baselineImpactProbPct: 14.5,
    description: "Near-Earth asteroid approaching within geosynchronous altitude (31,600 km) requiring early B-plane deflection.",
    colorHex: "#f59e0b"
  },
  "BENNU_101955": {
    name: "101955 Bennu (OSIRIS-REx Target)",
    diameterM: 490,
    massKg: 7.3e10,
    densityGcm3: 1.19,
    composition: "CARBONACEOUS_B_TYPE",
    nominalRelativeVelKms: 10.5,
    leadTimeYears: 12.0,
    baselineImpactProbPct: 8.2,
    description: "Extremely porous micro-gravity aggregate with low cohesive strength producing massive conical ejecta excavation.",
    colorHex: "#10b981"
  },
  "EXTINCTION_CLASS_1KM": {
    name: "Chicxulub Class Impactor (1.2 km)",
    diameterM: 1200,
    massKg: 2.2e12,
    densityGcm3: 2.8,
    composition: "METALLIC_NIFE",
    nominalRelativeVelKms: 18.5,
    leadTimeYears: 15.0,
    baselineImpactProbPct: 100.0,
    description: "Continental extinction-tier threat requiring multi-impactor kinetic campaign or nuclear standoff diversion.",
    colorHex: "#ef4444"
  }
}

export default function PlanetaryDefensePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [presetKey, setPresetKey] = useState<AsteroidPreset>("DIMORPHOS_DART")
  const [impactorMassKg, setImpactorMassKg] = useState<number>(600) // DART dry mass ~570kg
  const [impactVelocityKms, setImpactVelocityKms] = useState<number>(6.14) // 6.14 km/s
  const [betaMomentumFactor, setBetaMomentumFactor] = useState<number>(3.6) // DART measured beta ~3.6
  const [leadTimeYears, setLeadTimeYears] = useState<number>(4.5)
  const [simStep, setSimStep] = useState<number>(-15)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = PRESETS[presetKey]

  // Kinetic Impactor Planetary Defense Physics Engine
  const calculations = useMemo(() => {
    const EARTH_RADIUS_KM = 6371
    const JOULES_PER_MEGATON_TNT = 4.184e15

    // Asteroid Impact Kinetic Energy (if Earth collided)
    const earthImpactVelMs = spec.nominalRelativeVelKms * 1000
    const kineticEnergyJoules = 0.5 * spec.massKg * Math.pow(earthImpactVelMs, 2)
    const kineticEnergyMegatons = kineticEnergyJoules / JOULES_PER_MEGATON_TNT

    // Impactor Delivered Momentum and Delta-V
    const impactorVelMs = impactVelocityKms * 1000
    const rawImpactorMomentumNs = impactorMassKg * impactorVelMs
    const totalImpartedMomentumNs = betaMomentumFactor * rawImpactorMomentumNs

    // Delta-v imparted to asteroid (m/s)
    const deltaVMs = totalImpartedMomentumNs / spec.massKg
    const deltaVMmS = deltaVMs * 1000 // Millimeters per second

    // Secular Along-Track B-Plane Deflection after Lead Time (meters)
    const leadTimeSec = leadTimeYears * 365.25 * 86400
    // Secular orbit along-track deflection formula: delta_s = 3 * delta_v * t_lead
    const deflectionDistanceM = 3.0 * deltaVMs * leadTimeSec
    const deflectionDistanceKm = deflectionDistanceM / 1000
    const deflectionEarthRadii = deflectionDistanceKm / EARTH_RADIUS_KM

    // Critical Deflection Threshold: 2.5 Earth Radii (~16,000 km) guarantees miss
    const isDeflectionSuccessful = deflectionEarthRadii >= 2.5

    // Residual Impact Probability & Torino Scale Downgrade
    const initialTorino = spec.diameterM >= 1000 ? 10 : spec.diameterM >= 300 ? 8 : 6
    const residualImpactProbPct = isDeflectionSuccessful 
      ? 0.0001 
      : Math.max(0.1, spec.baselineImpactProbPct * (1.0 - Math.min(0.99, deflectionEarthRadii / 2.5)))
    
    const postDeflectionTorino = isDeflectionSuccessful ? 0 : Math.max(1, Math.round(initialTorino * (residualImpactProbPct / spec.baselineImpactProbPct)))

    // Palermo Technical Hazard Scale
    const palermoRating = (Math.log10(Math.max(1e-6, residualImpactProbPct / 100) / (0.03 * Math.pow(Math.max(1, kineticEnergyMegatons), -0.8) * leadTimeYears))).toFixed(2)

    return {
      kineticEnergyMegatons: Number(kineticEnergyMegatons.toFixed(1)),
      deltaVMmS: Number(deltaVMmS.toFixed(2)),
      deflectionDistanceKm: Number(deflectionDistanceKm.toFixed(0)),
      deflectionEarthRadii: Number(deflectionEarthRadii.toFixed(2)),
      isDeflectionSuccessful,
      initialTorino,
      postDeflectionTorino,
      residualImpactProbPct: Number(residualImpactProbPct.toFixed(2)),
      palermoRating
    }
  }, [spec, impactorMassKg, impactVelocityKms, betaMomentumFactor, leadTimeYears])

  // Simulation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => {
          if (s >= 25) return -15
          return s + 0.35
        })
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Procedural Asteroid & Kinetic Impactor Collision Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 10, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.2)
    sun.position.set(25, 25, 20)
    scene.add(sun)

    // 1. Procedural 3D Asteroid Rubble Mesh with Bumps & Craters
    const astGeo = new THREE.IcosahedronGeometry(2.8, 4)
    const pos = astGeo.attributes.position.array as Float32Array

    for (let i = 0; i < pos.length; i += 3) {
      const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2])
      const length = v.length()
      const noise = Math.sin(v.x * 1.8) * Math.cos(v.y * 1.8) * Math.sin(v.z * 1.8) * 0.45
      const craterNoise = Math.sin(v.x * 4.2) * Math.cos(v.z * 4.2) * 0.15
      v.setLength(length + noise + craterNoise)
      pos[i] = v.x
      pos[i + 1] = v.y
      pos[i + 2] = v.z
    }
    astGeo.computeVertexNormals()

    const astMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.92,
      metalness: 0.15,
      flatShading: true
    })
    const asteroidMesh = new THREE.Mesh(astGeo, astMat)
    scene.add(asteroidMesh)

    // 2. Kinetic Impactor Spacecraft
    const scGroup = new THREE.Group()
    scene.add(scGroup)

    const scBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
    )
    scGroup.add(scBody)

    // Solar Wings
    const wingGeo = new THREE.BoxGeometry(2.0, 0.04, 0.6)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    const wings = new THREE.Mesh(wingGeo, wingMat)
    scGroup.add(wings)

    // High Gain Antenna Dish
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.05, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 })
    )
    dish.rotation.z = Math.PI / 2
    dish.position.set(-0.35, 0.25, 0)
    scGroup.add(dish)

    // Impactor Trajectory Line
    const trajGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-18, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ])
    const trajMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.5,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.5
    })
    const trajLine = new THREE.Line(trajGeo, trajMat)
    trajLine.computeLineDistances()
    scene.add(trajLine)

    // 3. Impact Flash & High-Speed Ejecta Particles (Momentum Recoil Plume)
    const flashGeo = new THREE.SphereGeometry(0.8, 16, 16)
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    const flashMesh = new THREE.Mesh(flashGeo, flashMat)
    flashMesh.position.set(-2.6, 0, 0)
    scene.add(flashMesh)

    const ejectaCount = 350
    const ejectaGeo = new THREE.BufferGeometry()
    const ejectaPositions = new Float32Array(ejectaCount * 3)
    const ejectaVelocities: THREE.Vector3[] = []

    for (let i = 0; i < ejectaCount; i++) {
      ejectaPositions[i * 3 + 0] = -2.6
      ejectaPositions[i * 3 + 1] = 0
      ejectaPositions[i * 3 + 2] = 0

      const coneAngle = (Math.random() * 0.6 + 0.1) * Math.PI
      const phi = Math.random() * Math.PI * 2
      const speed = 0.08 + Math.random() * 0.25

      ejectaVelocities.push(new THREE.Vector3(
        -Math.cos(coneAngle * 0.5) * speed,
        Math.sin(coneAngle * 0.5) * Math.cos(phi) * speed,
        Math.sin(coneAngle * 0.5) * Math.sin(phi) * speed
      ))
    }
    ejectaGeo.setAttribute("position", new THREE.BufferAttribute(ejectaPositions, 3))

    const ejectaMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const ejectaPoints = new THREE.Points(ejectaGeo, ejectaMat)
    scene.add(ejectaPoints)

    // 4. Earth Model in Distant Background
    const earthGroup = new THREE.Group()
    earthGroup.position.set(12, -4, -12)
    scene.add(earthGroup)

    const earthR = 3.2
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(earthR, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.8 })
    )
    earthGroup.add(earthMesh)

    // B-Plane Deflection Crosshair Vector
    const deflColor = calculations.isDeflectionSuccessful ? 0x10b981 : 0xef4444
    const bPlaneGeo = new THREE.RingGeometry(earthR * 1.1, earthR * 1.25, 32)
    const bPlaneMat = new THREE.MeshBasicMaterial({ color: deflColor, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    const bPlaneRing = new THREE.Mesh(bPlaneGeo, bPlaneMat)
    earthGroup.add(bPlaneRing)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Slow asteroid tumbling rotation
      asteroidMesh.rotation.y += 0.002
      asteroidMesh.rotation.x += 0.001

      // Impactor Flight & Impact Phasing
      if (simStep < 0) {
        const flightFraction = (simStep + 15) / 15
        const posX = -18 + flightFraction * (18 - 2.6)
        scGroup.position.set(posX, 0, 0)
        scGroup.visible = true
        flashMat.opacity = 0
        ejectaPoints.visible = false

        const pArr = ejectaGeo.attributes.position.array as Float32Array
        for (let i = 0; i < ejectaCount; i++) {
          pArr[i * 3 + 0] = -2.6
          pArr[i * 3 + 1] = 0
          pArr[i * 3 + 2] = 0
        }
        ejectaGeo.attributes.position.needsUpdate = true
      } else {
        scGroup.visible = false
        const tPost = simStep

        flashMat.opacity = Math.max(0, 1.0 - tPost * 0.3)
        flashMesh.scale.setScalar(1.0 + tPost * 0.6)

        ejectaPoints.visible = true
        const pArr = ejectaGeo.attributes.position.array as Float32Array
        for (let i = 0; i < ejectaCount; i++) {
          pArr[i * 3 + 0] = -2.6 + ejectaVelocities[i].x * tPost * 3.5
          pArr[i * 3 + 1] = ejectaVelocities[i].y * tPost * 3.5
          pArr[i * 3 + 2] = ejectaVelocities[i].z * tPost * 3.5
        }
        ejectaGeo.attributes.position.needsUpdate = true
      }

      earthMesh.rotation.y += 0.0008

      renderer.render(scene, camera)
    }
    animate()

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
      renderer.dispose()
    }
  }, [spec, calculations.isDeflectionSuccessful, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: ASTEROID TARGET & IMPACTION DYNAMICS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Orbit className="w-5 h-5 text-amber-500" /> Planetary Defense
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Kinetic Impactor &amp; DART Ejecta Momentum Recoil
          </p>
        </div>

        <div className="space-y-6">
          {/* Asteroid Presets */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-500" /> Potentially Hazardous Asteroid (PHA)
            </label>
            <div className="space-y-2">
              {(["DIMORPHOS_DART", "APOPHIS_99942", "BENNU_101955", "EXTINCTION_CLASS_1KM"] as AsteroidPreset[]).map(key => {
                const item = PRESETS[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setPresetKey(key)
                      setImpactVelocityKms(item.nominalRelativeVelKms)
                      setLeadTimeYears(item.leadTimeYears)
                      setSimStep(-15)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      presetKey === key 
                        ? "bg-amber-950/40 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Diameter: {item.diameterM}m | {(item.massKg / 1e9).toFixed(1)}M tonnes
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-amber-400 font-bold block">{item.nominalRelativeVelKms} km/s</span>
                      <span className="text-slate-500">{item.leadTimeYears} yrs lead</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Kinetic Impactor Sizing */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Kinetic Impactor Spacecraft Parameters</span>
              <span className="text-cyan-400 font-bold">Δv = {calculations.deltaVMmS} mm/s</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">IMPACTOR DRY MASS:</span>
                <span className="text-white font-bold">{impactorMassKg} kg</span>
              </div>
              <input 
                type="range" min="200" max="4000" step="50"
                value={impactorMassKg}
                onChange={e => setImpactorMassKg(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">RELATIVE IMPACT SPEED:</span>
                <span className="text-amber-400 font-bold">{impactVelocityKms.toFixed(2)} km/s</span>
              </div>
              <input 
                type="range" min="3.0" max="25.0" step="0.2"
                value={impactVelocityKms}
                onChange={e => setImpactVelocityKms(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">EJECTA MOMENTUM FACTOR (β):</span>
                <span className="text-emerald-400 font-bold">β = {betaMomentumFactor.toFixed(1)}x ({(betaMomentumFactor - 1.0).toFixed(1)}x RECOIL)</span>
              </div>
              <input 
                type="range" min="1.0" max="5.0" step="0.1"
                value={betaMomentumFactor}
                onChange={e => setBetaMomentumFactor(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Inelastic Plastic (1.0)</span>
                <span>NASA DART (3.6)</span>
                <span>High Porosity (5.0)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">WARNING / DEFLECTION LEAD TIME:</span>
                <span className="text-cyan-400 font-bold">{leadTimeYears.toFixed(1)} YEARS</span>
              </div>
              <input 
                type="range" min="1.0" max="25.0" step="0.5"
                value={leadTimeYears}
                onChange={e => setLeadTimeYears(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Terminal Handoff Fly-In</span>
              <span className={`font-bold ${simStep >= 0 ? "text-amber-400" : "text-cyan-400"}`}>
                {simStep < 0 ? `T-${Math.abs(Math.round(simStep))}s APPROACH` : "IMPACT T+SEC"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "HOLD APPROACH" : "RUN IMPACT RUN"}
              </button>

              <button
                onClick={() => setSimStep(-15)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Impact"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS ASTEROID COLLISION VIEWPORT */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Planetary Defense Terminal Engagement [B-Plane Deflection]
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${calculations.isDeflectionSuccessful ? "text-emerald-400" : "text-rose-500"}`}>
              {calculations.deflectionDistanceKm.toLocaleString()} KM
            </span>
            <span className="text-slate-500 text-sm">
              MISS DISTANCE ({calculations.deflectionEarthRadii} EARTH RADII)
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">IMPARTED Δv: {calculations.deltaVMmS} mm/s</span>
            <span className="text-amber-400">IMPACT ENERGY: {calculations.kineticEnergyMegatons.toLocaleString()} MT TNT</span>
            <span className={calculations.isDeflectionSuccessful ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              TORINO SCALE: {calculations.initialTorino} &rarr; {calculations.postDeflectionTorino}
            </span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">PLANETARY IMPACT OUTCOME</span>
              <span className={`font-bold text-sm ${calculations.isDeflectionSuccessful ? "text-emerald-400" : "text-rose-400 font-black animate-pulse"}`}>
                {calculations.isDeflectionSuccessful ? "EARTH IMPACT PRECLUDED (SAFE BYPASS)" : "CRITICAL IMPACT OCCURS"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">RESIDUAL IMPACT PROBABILITY</span>
            <span className="text-white font-bold text-sm">{calculations.residualImpactProbPct}%</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">PALERMO HAZARD RATING</span>
            <span className="text-amber-400 font-bold text-sm">P = {calculations.palermoRating}</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">EJECTA RECOIL BOOST</span>
            <span className="text-emerald-400 font-bold text-sm">+{((betaMomentumFactor - 1.0) * 100).toFixed(0)}% MOMENTUM MULTIPLIER</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: IMPACT RISK METRICS & GAUSS PERTURBATION CASCADE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Planetary Defense Risk
        </h2>

        <div className="space-y-6">
          {/* Deflection Status Card */}
          <div className={`p-5 rounded-2xl border ${calculations.isDeflectionSuccessful ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              EARTH B-PLANE MISS ANALYSIS
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${calculations.isDeflectionSuccessful ? "text-emerald-400" : "text-rose-400"}`}>
              {calculations.isDeflectionSuccessful ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {calculations.isDeflectionSuccessful ? "DEFLECTION ASSURED" : "INSUFFICIENT MISS MARGIN"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {calculations.isDeflectionSuccessful 
                ? `Kinetic impact imparts ${calculations.deltaVMmS} mm/s change in velocity. Over ${leadTimeYears} years, this propagates into ${calculations.deflectionDistanceKm.toLocaleString()} km of along-track displacement, exceeding the 2.5 Earth-radii safety threshold.`
                : "Deflection delta-v or lead time is insufficient to divert the asteroid's b-plane impact parameter outside the gravitational capture cross-section. Staged nuclear standoff detonation or multi-impactor fleet required."}
            </p>
          </div>

          {/* Physics Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Impact Kinetic &amp; Orbital Budget</div>
            <div className="flex justify-between"><span className="text-slate-500">Asteroid Target Mass:</span><span className="text-white font-bold">{(spec.massKg / 1e9).toFixed(1)}M tonnes</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Asteroid Diameter:</span><span className="text-white font-bold">{spec.diameterM} meters</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Impactor Energy:</span><span className="text-amber-400 font-bold">{calculations.kineticEnergyMegatons} MT TNT</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Velocity Change (Δv):</span><span className="text-emerald-400 font-bold">{calculations.deltaVMmS} mm/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">B-Plane Offset:</span><span className="text-cyan-400 font-bold">{calculations.deflectionDistanceKm.toLocaleString()} km</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">POST-TORINO LEVEL:</span><span className={calculations.isDeflectionSuccessful ? "text-emerald-400" : "text-rose-400"}>LEVEL {calculations.postDeflectionTorino}</span></div>
          </div>

          {/* DART beta Momentum Principle */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Ejecta Momentum Enhancement Factor
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              When an impactor strikes a rubble-pile asteroid at hypervelocity, excavated rock fragments are blown backward into space. Under Newton's third law, this high-speed ejecta plume exerts a rocket-like thrust, multiplying the momentum transfer factor beta up to 3.6x beyond the spacecraft's mass alone.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
