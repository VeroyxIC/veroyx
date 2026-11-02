"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Zap, Flame, Target, Crosshair, ShieldAlert, ShieldCheck, 
  Activity, Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Terminal, ArrowRight, CheckCircle2, Eye, 
  Cpu, Radio, Sparkles, Download, Check 
} from "lucide-react"
import { createCinematicEarth, createMilitarySatellite, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

type DewEffectorType = "HEL_FIBER_100KW" | "COIL_MEGAWATT_1MW" | "ULTRA_SHORT_PULSE_TW" | "HPM_GIGAWATT_BURST"
type TargetMaterial = "AEROSPACE_AL_7075" | "TITANIUM_GRADE_5" | "CARBON_COMPOSITE" | "GAAS_SOLAR_CELL"

interface EffectorSpec {
  name: string
  classification: "HIGH_ENERGY_LASER" | "HIGH_POWER_MICROWAVE"
  wavelengthNm: number
  beamDirectorApertureM: number
  peakPowerKw: number
  beamQualityM2: number
  nominalRangeKm: number
  pulseDurationSec: number
  description: string
  colorHex: string
}

interface MaterialSpec {
  name: string
  densityKgM3: number
  thermalConductivity: number
  meltTempK: number
  enthalpyAblationJouleKg: number
  opticalAbsorptivity: number
  thicknessMm: number
}

const DEW_EFFECTORS: Record<DewEffectorType, EffectorSpec> = {
  "HEL_FIBER_100KW": {
    name: "IronBeam-Space 100 kW Fiber Laser",
    classification: "HIGH_ENERGY_LASER",
    wavelengthNm: 1064,
    beamDirectorApertureM: 0.8,
    peakPowerKw: 100,
    beamQualityM2: 1.15,
    nominalRangeKm: 450,
    pulseDurationSec: 5.0,
    description: "Compact continuous-wave fiber laser designed for surgical blinding of optical recon suites and solar wing shearing.",
    colorHex: "#00f0ff"
  },
  "COIL_MEGAWATT_1MW": {
    name: "Exo-Excalibur 1.2 MW Megawatt Chemical Laser",
    classification: "HIGH_ENERGY_LASER",
    wavelengthNm: 1315,
    beamDirectorApertureM: 1.6,
    peakPowerKw: 1200,
    beamQualityM2: 1.25,
    nominalRangeKm: 1200,
    pulseDurationSec: 3.0,
    description: "High-mass flux chemical oxygen-iodine laser delivering structural melt-through against ballistic missiles and hardened satellites.",
    colorHex: "#f59e0b"
  },
  "ULTRA_SHORT_PULSE_TW": {
    name: "Petawatt Femtosecond Pulsed Laser",
    classification: "HIGH_ENERGY_LASER",
    wavelengthNm: 800,
    beamDirectorApertureM: 1.0,
    peakPowerKw: 50000,
    beamQualityM2: 1.05,
    nominalRangeKm: 800,
    pulseDurationSec: 0.0001,
    description: "Ultra-short pulse laser triggering cold Coulomb explosion and non-thermal lattice ionization on target materials.",
    colorHex: "#d946ef"
  },
  "HPM_GIGAWATT_BURST": {
    name: "Thor-X High-Power Microwave (HPM)",
    classification: "HIGH_POWER_MICROWAVE",
    wavelengthNm: 100000000, // 3 GHz microwave (10 cm)
    beamDirectorApertureM: 3.5,
    peakPowerKw: 250000, // 250 MW peak
    beamQualityM2: 1.4,
    nominalRangeKm: 350,
    pulseDurationSec: 0.000001,
    description: "Repetitive pulse magnetron inducing fatal semiconductor burnout across all unshielded satellite wire harnesses.",
    colorHex: "#ef4444"
  }
}

const MATERIALS: Record<TargetMaterial, MaterialSpec> = {
  "AEROSPACE_AL_7075": { name: "Al 7075-T6 Aerospace Skin", densityKgM3: 2810, thermalConductivity: 130, meltTempK: 908, enthalpyAblationJouleKg: 1.15e7, opticalAbsorptivity: 0.18, thicknessMm: 2.5 },
  "TITANIUM_GRADE_5": { name: "Ti-6Al-4V Propellant Tank", densityKgM3: 4430, thermalConductivity: 6.7, meltTempK: 1933, enthalpyAblationJouleKg: 1.85e7, opticalAbsorptivity: 0.45, thicknessMm: 3.2 },
  "CARBON_COMPOSITE": { name: "Carbon-Fiber Reinforced Polymer", densityKgM3: 1600, thermalConductivity: 5.0, meltTempK: 3800, enthalpyAblationJouleKg: 3.2e7, opticalAbsorptivity: 0.88, thicknessMm: 2.0 },
  "GAAS_SOLAR_CELL": { name: "GaAs Triple-Junction Photovoltaic", densityKgM3: 5320, thermalConductivity: 55, meltTempK: 1511, enthalpyAblationJouleKg: 8.5e6, opticalAbsorptivity: 0.92, thicknessMm: 0.8 }
}

export default function DirectedEnergyPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [effectorKey, setEffectorKey] = useState<DewEffectorType>("COIL_MEGAWATT_1MW")
  const [materialKey, setMaterialKey] = useState<TargetMaterial>("AEROSPACE_AL_7075")
  const [slantRangeKm, setSlantRangeKm] = useState<number>(650)
  const [beamDwellTimeSec, setBeamDwellTimeSec] = useState<number>(2.5)
  const [isFiring, setIsFiring] = useState<boolean>(false)
  const [ablationCompleted, setAblationCompleted] = useState<boolean>(false)
  const [simStep, setSimStep] = useState<number>(0)

  const dew = DEW_EFFECTORS[effectorKey]
  const mat = MATERIALS[materialKey]

  // Laser Optics & Thermal Ablation Physics Engine
  const calculations = useMemo(() => {
    const lambdaM = dew.wavelengthNm * 1e-9
    const rangeM = slantRangeKm * 1000

    // 1. Diffraction-Limited Spot Diameter at Slant Range (w_spot in meters)
    const spotDiameterM = (1.22 * lambdaM * rangeM) / dew.beamDirectorApertureM * dew.beamQualityM2
    const spotAreaM2 = Math.PI * Math.pow(Math.max(0.01, spotDiameterM) / 2, 2)

    // 2. Focused Peak Surface Irradiance (MW/m2)
    const powerWatts = dew.peakPowerKw * 1000
    const peakIrradianceWm2 = powerWatts / spotAreaM2
    const peakIrradianceMwm2 = peakIrradianceWm2 / 1e6

    // 3. Absorbed Power & Thermal Melt Recession Rate
    const absorbedIrradianceWm2 = peakIrradianceWm2 * mat.opticalAbsorptivity
    const recessionRateMmPerSec = (absorbedIrradianceWm2 / (mat.densityKgM3 * mat.enthalpyAblationJouleKg)) * 1000

    // 4. Burn-Through Time for Skin Thickness (seconds)
    const burnThroughTimeSec = Number((mat.thicknessMm / Math.max(0.001, recessionRateMmPerSec)).toFixed(2))
    const isTargetPenetrated = beamDwellTimeSec >= burnThroughTimeSec

    // 5. High-Power Microwave Electric Field & Burnout Threshold
    const eta0 = 376.73 // Vacuum wave impedance (Ohms)
    const antennaGain = (4 * Math.PI * (Math.PI * Math.pow(dew.beamDirectorApertureM / 2, 2))) / Math.pow(lambdaM, 2)
    const peakElectricFieldVm = Number((Math.sqrt(2 * eta0 * powerWatts * Math.min(1e5, antennaGain)) / (4 * Math.PI * rangeM)).toFixed(0))
    const isHpmBurnout = dew.classification === "HIGH_POWER_MICROWAVE" && peakElectricFieldVm > 4500

    // Expected Kill Probability
    const pKill = isTargetPenetrated || isHpmBurnout ? 0.98 : Math.min(0.92, beamDwellTimeSec / burnThroughTimeSec)

    return {
      spotDiameterCm: Number((spotDiameterM * 100).toFixed(1)),
      peakIrradianceMwm2: Number(peakIrradianceMwm2.toFixed(1)),
      recessionRateMmPerSec: Number(recessionRateMmPerSec.toFixed(1)),
      burnThroughTimeSec,
      isTargetPenetrated,
      peakElectricFieldVm,
      isHpmBurnout,
      pKill: Number((pKill * 100).toFixed(1))
    }
  }, [dew, mat, slantRangeKm, beamDwellTimeSec])

  // Fire DEW Laser Trigger
  const triggerLaserFiring = () => {
    setIsFiring(true)
    setAblationCompleted(false)

    setTimeout(() => {
      setIsFiring(false)
      setAblationCompleted(true)
    }, beamDwellTimeSec * 1000)
  }

  // Clock Loop
  useEffect(() => {
    const timer = setInterval(() => setSimStep(s => s + 1), 50)
    return () => clearInterval(timer)
  }, [])

  // 3D Three.js High-Energy Laser Thermal Director Viewport
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 16, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.4)
    sun.position.set(30, 25, 20)
    scene.add(sun)

    // Starfield & Earth
    const starfield = createDeepSpaceStarfield(1200, 700)
    scene.add(starfield)

    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // Allied DEW Spacecraft Platform (Beam Emitter)
    const dewPlatform = new THREE.Group()
    dewPlatform.position.set(-9.5, earthRadius + 2.5, 0)
    scene.add(dewPlatform)

    const dewBus = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.2 })
    )
    dewPlatform.add(dewBus)

    // Optical Beam Director Telescope Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.5, 0.65, 1.8, 24)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
    const barrel = new THREE.Mesh(barrelGeo, barrelMat)
    barrel.rotation.z = Math.PI / 2
    barrel.position.set(1.2, 0, 0)
    dewPlatform.add(barrel)

    // Target Satellite (Hostile Reconnaissance Asset)
    const { group: targetGroup } = createMilitarySatellite({ scale: 0.55 })
    targetGroup.position.set(9.5, earthRadius + 2.5, 0)
    scene.add(targetGroup)

    // Continuous Laser Beam Vector
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const beamMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(dew.colorHex),
      linewidth: 4,
      transparent: true,
      opacity: isFiring ? 0.95 : 0.0
    })
    const beamLine = new THREE.Line(beamGeo, beamMat)
    scene.add(beamLine)

    // Target Thermal Hotspot Flare / Vaporization Hole
    const hotspotGeo = new THREE.SphereGeometry(0.45, 16, 16)
    const hotspotMat = new THREE.MeshBasicMaterial({
      color: ablationCompleted ? 0xef4444 : 0xffffff,
      transparent: true,
      opacity: isFiring ? 0.95 : ablationCompleted ? 0.6 : 0.0
    })
    const hotspotMesh = new THREE.Mesh(hotspotGeo, hotspotMat)
    hotspotMesh.position.set(8.9, earthRadius + 2.5, 0)
    scene.add(hotspotMesh)

    // Vaporized Spallation Plume (Molten Ejecta Particles)
    const ejectaCount = 180
    const ejectaGeo = new THREE.BufferGeometry()
    const ejectaPositions = new Float32Array(ejectaCount * 3)
    const ejectaVelocities: THREE.Vector3[] = []

    for (let i = 0; i < ejectaCount; i++) {
      ejectaPositions[i * 3 + 0] = 8.9
      ejectaPositions[i * 3 + 1] = earthRadius + 2.5
      ejectaPositions[i * 3 + 2] = 0

      ejectaVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08
      ))
    }
    ejectaGeo.setAttribute("position", new THREE.BufferAttribute(ejectaPositions, 3))
    const ejectaMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.12,
      transparent: true,
      opacity: isFiring ? 0.85 : 0.0
    })
    const ejectaPoints = new THREE.Points(ejectaGeo, ejectaMat)
    scene.add(ejectaPoints)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Aim Director at Target
      dewPlatform.lookAt(targetGroup.position)

      if (isFiring) {
        // Laser vector from director to target
        const posArr = new Float32Array([
          dewPlatform.position.x + 1.8, dewPlatform.position.y, dewPlatform.position.z,
          targetGroup.position.x - 0.6, targetGroup.position.y, targetGroup.position.z
        ])
        beamGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3))
        beamGeo.attributes.position.needsUpdate = true

        // Animate molten ejecta plume
        const pArr = ejectaGeo.attributes.position.array as Float32Array
        for (let i = 0; i < ejectaCount; i++) {
          pArr[i * 3 + 0] += ejectaVelocities[i].x
          pArr[i * 3 + 1] += ejectaVelocities[i].y
          pArr[i * 3 + 2] += ejectaVelocities[i].z
        }
        ejectaGeo.attributes.position.needsUpdate = true

        hotspotMesh.scale.setScalar(1.0 + Math.sin(simStep * 0.6) * 0.25)
      }

      earthMesh.rotation.y += 0.0006
      cloudsMesh.rotation.y += 0.00085

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
  }, [dew, mat, isFiring, ablationCompleted, simStep])

  return (
    <div className="w-full h-full pt-16 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: EFFECTOR ARSENAL & LASER PARAMETERS */}
      <div className="w-96 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-rose-500 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Zap className="w-4 h-4" /> Directed-Energy Warfare
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">DEW LASER ABLATION</h1>
          <p className="text-[10px] text-slate-500 uppercase">Megawatt CW &amp; Femtosecond Laser Terminal</p>
        </div>

        <div className="space-y-4">
          {/* Effector Weapon Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold flex justify-between">
              <span>Directed-Energy Source</span>
              <span className="text-cyan-400">{dew.peakPowerKw.toLocaleString()} kW PEAK</span>
            </label>
            <div className="space-y-1">
              {(["HEL_FIBER_100KW", "COIL_MEGAWATT_1MW", "ULTRA_SHORT_PULSE_TW", "HPM_GIGAWATT_BURST"] as DewEffectorType[]).map(key => {
                const item = DEW_EFFECTORS[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setEffectorKey(key)
                      setAblationCompleted(false)
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      effectorKey === key 
                        ? "bg-rose-950/60 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                        {item.name}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        Aperture: {item.beamDirectorApertureM}m | M² = {item.beamQualityM2}
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-rose-400 font-bold block">{item.wavelengthNm < 10000 ? `${item.wavelengthNm} nm` : "3 GHz"}</span>
                      <span className="text-slate-500">{item.nominalRangeKm} km</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Target Material Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Target Structural Material</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["AEROSPACE_AL_7075", "TITANIUM_GRADE_5", "CARBON_COMPOSITE", "GAAS_SOLAR_CELL"] as TargetMaterial[]).map(mKey => (
                <button
                  key={mKey}
                  onClick={() => {
                    setMaterialKey(mKey)
                    setAblationCompleted(false)
                  }}
                  className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                    materialKey === mKey 
                      ? "bg-cyan-950 border-cyan-500 text-cyan-200" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {mKey.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Slant Range & Dwell Time Sliders */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Firing Geometry &amp; Servo Dwell</span>
              <span className="text-amber-400 font-bold">SPOT: {calculations.spotDiameterCm} cm</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">SLANT RANGE:</span><span className="text-white font-bold">{slantRangeKm} km</span></div>
              <input type="range" min="100" max="1500" step="50" value={slantRangeKm} onChange={e => setSlantRangeKm(Number(e.target.value))} className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">BEAM DWELL DURATION:</span><span className="text-cyan-300 font-bold">{beamDwellTimeSec.toFixed(1)}s</span></div>
              <input type="range" min="0.5" max="10.0" step="0.5" value={beamDwellTimeSec} onChange={e => setBeamDwellTimeSec(Number(e.target.value))} className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>

          {/* High-Energy Firing Authorization */}
          <button
            onClick={triggerLaserFiring}
            disabled={isFiring}
            className={`w-full py-3.5 rounded-xl font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 ${
              isFiring 
                ? "bg-rose-600 text-white animate-pulse" 
                : "bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white"
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>{isFiring ? "DIRECTED-ENERGY BEAM FIRING..." : "DISCHARGE DIRECTED-ENERGY BEAM"}</span>
          </button>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS BEAM DIRECTOR & THERMAL FLUX HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        {/* Top Target Status Header */}
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            Directed-Energy Standoff Engagement // Thermal Ablation Solution
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">
              {dew.name}
            </span>
            <span className="text-rose-400 text-xs font-bold">
              [{dew.classification} // {dew.peakPowerKw.toLocaleString()} kW]
            </span>
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px]">
            <span className="text-emerald-400">FOCAL IRRADIANCE: {calculations.peakIrradianceMwm2} MW/m²</span>
            <span className="text-cyan-400">RECESSION RATE: {calculations.recessionRateMmPerSec} mm/s</span>
            <span className="text-amber-400">BURN-THROUGH: {calculations.burnThroughTimeSec}s</span>
            <span className="text-rose-400">P(KILL): {calculations.pKill}%</span>
          </div>
        </div>

        {/* 3D Canvas Mount */}
        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Tactical HUD Ribbon */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="w-4 h-4 text-rose-500" />
            <div>
              <span className="text-slate-500 block text-[9px]">TARGET THERMAL STATUS</span>
              <span className={`text-xs font-bold ${ablationCompleted ? "text-emerald-400" : isFiring ? "text-rose-400 animate-pulse" : "text-white"}`}>
                {ablationCompleted ? "STRUCTURAL RUPTURE & TANK EXPLOSION CONFIRMED" : isFiring ? "ABLATION DWELL IN PROGRESS" : "BEAM DIRECTOR LOCKED ON GIMBAL"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">FOCAL SPOT DIAMETER</span>
            <span className="text-cyan-400 font-bold text-sm">{calculations.spotDiameterCm} cm</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">TARGET MATERIAL THICKNESS</span>
            <span className="text-white font-bold text-sm">{mat.thicknessMm} mm ({mat.name})</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">HPM BACK-DOOR BURNOUT</span>
            <span className={`text-sm font-bold ${calculations.isHpmBurnout ? "text-emerald-400" : "text-slate-400"}`}>
              {calculations.peakElectricFieldVm} V/m ({calculations.isHpmBurnout ? "LETHAL" : "SUB-CRITICAL"})
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: THERMAL DIFFUSION MATHEMATICS & DAMAGE ASSESSMENT */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2 text-xs">
          <Activity className="w-4 h-4 text-cyan-400" /> Ablation Physics
        </h2>

        <div className="space-y-5">
          {/* Thermal Budget Breakdown Table */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Stefan Ablation Cascade</span>
              <span className="text-rose-400 font-bold">1D ENTHALPY</span>
            </div>

            <div className="flex justify-between"><span className="text-slate-500">Melt Temperature:</span><span className="text-white font-bold">{mat.meltTempK} K</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Latent Enthalpy (Q*):</span><span className="text-cyan-400 font-bold">{(mat.enthalpyAblationJouleKg / 1e6).toFixed(1)} MJ/kg</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Optical Absorption:</span><span className="text-emerald-400 font-bold">{(mat.opticalAbsorptivity * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Recession Velocity:</span><span className="text-amber-400 font-bold">{calculations.recessionRateMmPerSec} mm/s</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">BURN-THROUGH:</span><span className={calculations.isTargetPenetrated ? "text-emerald-400" : "text-amber-400"}>{calculations.burnThroughTimeSec} SEC</span></div>
          </div>

          {/* Damage Assessment Card */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${ablationCompleted ? "bg-emerald-950/20 border-emerald-500/40" : "bg-slate-900/40 border-slate-800"}`}>
            <div className="text-[10px] font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Battle Damage Assessment</span>
              <span className={ablationCompleted ? "text-emerald-400 font-bold" : "text-slate-400"}>
                {ablationCompleted ? "CATASTROPHIC KILL" : "PENDING"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {ablationCompleted 
                ? `Focused thermal flux of ${calculations.peakIrradianceMwm2} MW/m² fully melted through ${mat.thicknessMm} mm of ${mat.name}. High-pressure tank burst induces complete structural fragmentation.`
                : "Continuous-wave optical flux deposited on target face. Sub-surface heat diffusion rate determines mechanical failure threshold."}
            </p>
          </div>

          {/* Quick Nav to Allied Tactical Decks */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Allied Counter-Space Modules</span>
            <Link href="/kill-chain" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-rose-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>JADC2 Kill-Chain Engine</span>
              <ArrowRight className="w-3 h-3 text-rose-400" />
            </Link>
            <Link href="/intercept" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>Kinetic ASAT True ProNav</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
