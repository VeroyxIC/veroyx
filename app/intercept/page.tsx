"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Crosshair, Target, ShieldAlert, Zap, Flame, 
  Orbit, Activity, Play, Square, RotateCcw, AlertTriangle, 
  Layers, Gauge, Radar, ShieldCheck, Compass 
} from "lucide-react"

type InterceptClass = "DA_ASAT_KINETIC" | "HEL_LASER_DEW" | "CO_ORBITAL_RAM" | "SM3_EXO_ATMOSPHERIC"

interface WeaponSpec {
  name: string
  classification: "KINETIC_KILL" | "DIRECTED_ENERGY"
  killMechanism: string
  standoffRangeKm: number
  closingVelocityKms: number
  beamPowerMw: number
  proNavConstant: number
  targetMassKg: number
  description: string
  colorHex: string
}

const WEAPON_PRESETS: Record<InterceptClass, WeaponSpec> = {
  "DA_ASAT_KINETIC": {
    name: "Direct-Ascent Kinetic Kill Vehicle (SC-19 Class)",
    classification: "KINETIC_KILL",
    killMechanism: "Hypervelocity Hit-to-Kill (H2K) Impactor",
    standoffRangeKm: 850,
    closingVelocityKms: 10.4,
    beamPowerMw: 0,
    proNavConstant: 4.2,
    targetMassKg: 650,
    description: "Lofted solid-rocket suborbital booster deploying a divert-and-attitude control kill vehicle (DACS) on collision course.",
    colorHex: "#ef4444"
  },
  "HEL_LASER_DEW": {
    name: "Megawatt Ground-Based High-Energy Laser (HEL)",
    classification: "DIRECTED_ENERGY",
    killMechanism: "Photothermal Structural Skin Melt-Through",
    standoffRangeKm: 620,
    closingVelocityKms: 299792,
    beamPowerMw: 1.5,
    proNavConstant: 0,
    targetMassKg: 420,
    description: "Coherent continuous-wave adaptive optics laser directing gigawatt fluence to puncture bus structure and solar cells.",
    colorHex: "#00f0ff"
  },
  "CO_ORBITAL_RAM": {
    name: "Co-Orbital Kinetic Shunt (Pellet Dispersion)",
    classification: "KINETIC_KILL",
    killMechanism: "Dense Tungsten Pellet Swarm Cloud",
    standoffRangeKm: 180,
    closingVelocityKms: 3.8,
    beamPowerMw: 0,
    proNavConstant: 3.5,
    targetMassKg: 1200,
    description: "Co-planar trailing spacecraft releasing high-density fragment swarm into the target flight corridor.",
    colorHex: "#f59e0b"
  },
  "SM3_EXO_ATMOSPHERIC": {
    name: "SM-3 Block IIA Exo-Atmospheric Interceptor",
    classification: "KINETIC_KILL",
    killMechanism: "Cryogenic IR Seeker Hit-to-Kill",
    standoffRangeKm: 420,
    closingVelocityKms: 8.9,
    beamPowerMw: 0,
    proNavConstant: 4.8,
    targetMassKg: 350,
    description: "Maritime Aegis-launched three-stage interceptor engaging target spacecraft at low Earth orbital perigee.",
    colorHex: "#d946ef"
  }
}

export default function InterceptPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [weaponClass, setWeaponClass] = useState<InterceptClass>("DA_ASAT_KINETIC")
  const [targetAltitudeKm, setTargetAltitudeKm] = useState(650)
  const [proNavGain, setProNavGain] = useState(4.2)
  const [laserPowerMw, setLaserPowerMw] = useState(1.5)
  const [beamApertureM, setBeamApertureM] = useState(1.8)
  const [hullThicknessMm, setHullThicknessMm] = useState(3.0)
  const [simTimeSec, setSimTimeSec] = useState(-20)
  const [isPlaying, setIsPlaying] = useState(true)

  const spec = WEAPON_PRESETS[weaponClass]

  // Kinematic & ProNav Calculations
  const closingVelMs = spec.closingVelocityKms * 1000
  const timeToGoSec = Math.max(0, -simTimeSec)
  const currentRangeKm = Math.max(0.05, (timeToGoSec * spec.closingVelocityKms))
  const losRateRadS = timeToGoSec > 0.1 ? (0.008 / Math.max(1, timeToGoSec)) : 0
  const commandedAccelMs2 = spec.classification === "KINETIC_KILL" 
    ? proNavGain * closingVelMs * losRateRadS 
    : 0
  const commandedG = commandedAccelMs2 / 9.80665

  // Kinetic Impact Energy & NASA Breakup Fragment Yield
  const impactorMassKg = 35
  const impactKineticEnergyMj = (0.5 * impactorMassKg * Math.pow(closingVelMs, 2)) / 1e6
  const specificEnergyJg = (impactKineticEnergyMj * 1e6) / (spec.targetMassKg * 1000)
  const isCatastrophic = specificEnergyJg >= 40
  const trackableFragmentsL10cm = Math.round(0.1 * Math.pow(spec.targetMassKg, 0.75) * Math.pow(0.1, -1.71))
  const lethalSmallFragmentsL1cm = Math.round(0.1 * Math.pow(spec.targetMassKg, 0.75) * Math.pow(0.01, -1.71))

  // Directed Energy Calculations (HEL)
  const WAVELENGTH_M = 1.064e-6
  const spotDiameterM = (2.44 * WAVELENGTH_M * (targetAltitudeKm * 1000)) / beamApertureM
  const spotAreaCm2 = (Math.PI * Math.pow((spotDiameterM * 100) / 2, 2))
  const laserIrradianceWcm2 = ((laserPowerMw * 1e6) * 0.72) / Math.max(1, spotAreaCm2)
  const aluVolumetricHeatJcm3 = 2.7 * 0.9 * 600
  const ablationRateMmPerSec = (laserIrradianceWcm2 * 0.15) / (aluVolumetricHeatJcm3 / 10)
  const timeToPunctureSec = hullThicknessMm / Math.max(0.1, ablationRateMmPerSec)

  const isImpactReached = simTimeSec >= 0

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSec(t => {
          if (t >= 15) return -20
          return t + 0.25
        })
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 8, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.0)
    sun.position.set(20, 25, 15)
    scene.add(sun)

    const earthRadius = 35
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.15)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      wireframe: true,
      roughness: 0.9
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earth.position.set(0, -earthRadius - 1.5, 0)
    scene.add(earth)

    const targetGroup = new THREE.Group()
    scene.add(targetGroup)

    const busGeo = new THREE.BoxGeometry(1.6, 1.6, 2.4)
    const busMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 })
    const targetBus = new THREE.Mesh(busGeo, busMat)
    targetGroup.add(targetBus)

    const wingGeo = new THREE.BoxGeometry(3.0, 0.05, 1.2)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(2.4, 0, 0)
    targetGroup.add(wingL)
    const wingR = wingL.clone()
    wingR.position.set(-2.4, 0, 0)
    targetGroup.add(wingR)

    const kkvGroup = new THREE.Group()
    scene.add(kkvGroup)

    const kkvGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.4, 16)
    const kkvMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
    const kkvMesh = new THREE.Mesh(kkvGeo, kkvMat)
    kkvMesh.rotation.z = Math.PI / 4
    kkvGroup.add(kkvMesh)

    const plumeGeo = new THREE.ConeGeometry(0.25, 0.9, 16)
    const plumeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true })
    const plume = new THREE.Mesh(plumeGeo, plumeMat)
    plume.position.set(-0.8, -0.8, 0)
    plume.rotation.z = -Math.PI / 4
    kkvGroup.add(plume)

    const laserBeamGeo = new THREE.CylinderGeometry(0.08, 0.08, 22, 16)
    const laserBeamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: spec.classification === "DIRECTED_ENERGY" ? 0.85 : 0.0,
      blending: THREE.AdditiveBlending
    })
    const laserBeam = new THREE.Mesh(laserBeamGeo, laserBeamMat)
    laserBeam.position.set(0, -6, 0)
    scene.add(laserBeam)

    const fragmentCount = 350
    const fragmentGeo = new THREE.BufferGeometry()
    const fragmentPositions = new Float32Array(fragmentCount * 3)
    const fragmentVelocities: { x: number; y: number; z: number }[] = []

    for (let i = 0; i < fragmentCount; i++) {
      fragmentPositions[i * 3 + 0] = 0
      fragmentPositions[i * 3 + 1] = 0
      fragmentPositions[i * 3 + 2] = 0

      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const speed = (0.2 + Math.random() * 0.8) * 0.25

      fragmentVelocities.push({
        x: speed * Math.sin(phi) * Math.cos(theta),
        y: speed * Math.sin(phi) * Math.sin(theta),
        z: speed * Math.cos(phi)
      })
    }
    fragmentGeo.setAttribute("position", new THREE.BufferAttribute(fragmentPositions, 3))

    const fragmentMat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const debrisCloud = new THREE.Points(fragmentGeo, fragmentMat)
    scene.add(debrisCloud)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      if (simTimeSec < 0) {
        const factor = Math.abs(simTimeSec) / 20
        kkvGroup.position.set(-factor * 16, -factor * 12, factor * 8)
        kkvGroup.lookAt(0, 0, 0)
        kkvGroup.visible = spec.classification === "KINETIC_KILL"
        targetGroup.visible = true
        debrisCloud.visible = false

        const pos = fragmentGeo.attributes.position.array as Float32Array
        for (let i = 0; i < fragmentCount; i++) {
          pos[i * 3 + 0] = 0
          pos[i * 3 + 1] = 0
          pos[i * 3 + 2] = 0
        }
        fragmentGeo.attributes.position.needsUpdate = true
      } else {
        kkvGroup.visible = false
        targetGroup.visible = spec.classification === "DIRECTED_ENERGY"
        debrisCloud.visible = spec.classification === "KINETIC_KILL"

        if (spec.classification === "KINETIC_KILL") {
          const pos = fragmentGeo.attributes.position.array as Float32Array
          const postT = simTimeSec * 4
          for (let i = 0; i < fragmentCount; i++) {
            pos[i * 3 + 0] = fragmentVelocities[i].x * postT * 4
            pos[i * 3 + 1] = fragmentVelocities[i].y * postT * 4
            pos[i * 3 + 2] = fragmentVelocities[i].z * postT * 4
          }
          fragmentGeo.attributes.position.needsUpdate = true
        }
      }

      if (spec.classification === "DIRECTED_ENERGY") {
        laserBeamMat.opacity = 0.65 + Math.sin(Date.now() * 0.015) * 0.25
        targetBus.rotation.y += 0.005
      }

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
  }, [simTimeSec, spec])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Flame className="w-5 h-5 text-rose-500" /> Kinetic ASAT &amp; DEW
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Counter-Space Intercept &amp; NASA Breakup Model
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-rose-500" /> Counter-Space Engagement Class
            </label>
            <div className="space-y-2">
              {(["DA_ASAT_KINETIC", "HEL_LASER_DEW", "CO_ORBITAL_RAM", "SM3_EXO_ATMOSPHERIC"] as InterceptClass[]).map(c => {
                const item = WEAPON_PRESETS[c]
                return (
                  <button
                    key={c}
                    onClick={() => setWeaponClass(c)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      weaponClass === c 
                        ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.killMechanism}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-rose-400 font-bold block">
                        {item.classification === "DIRECTED_ENERGY" ? `${item.beamPowerMw} MW` : `${item.closingVelocityKms} km/s`}
                      </span>
                      <span className="text-slate-500">{item.standoffRangeKm} km</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Engagement Kinematics
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">TARGET ORBITAL ALTITUDE:</span>
                <span className="text-white font-bold">{targetAltitudeKm} km</span>
              </div>
              <input 
                type="range" min="300" max="1200" step="25"
                value={targetAltitudeKm}
                onChange={e => setTargetAltitudeKm(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {spec.classification === "KINETIC_KILL" ? (
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">PRONAV CONSTANT (N):</span>
                  <span className="text-emerald-400 font-bold">{proNavGain.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="2.5" max="5.5" step="0.1"
                  value={proNavGain}
                  onChange={e => setProNavGain(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Under-Damped (2.5)</span>
                  <span>Optimal TPN (4.2)</span>
                  <span>Over-Damped (5.5)</span>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">LASER CW POWER:</span>
                    <span className="text-cyan-400 font-bold">{laserPowerMw.toFixed(1)} MW</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="5.0" step="0.1"
                    value={laserPowerMw}
                    onChange={e => setLaserPowerMw(Number(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">DIRECTOR APERTURE:</span>
                    <span className="text-amber-400 font-bold">{beamApertureM.toFixed(1)} meters</span>
                  </div>
                  <input 
                    type="range" min="0.8" max="3.5" step="0.1"
                    value={beamApertureM}
                    onChange={e => setBeamApertureM(Number(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">TARGET HULL THICKNESS:</span>
                <span className="text-cyan-400 font-bold">{hullThicknessMm.toFixed(1)} mm (Al 6061)</span>
              </div>
              <input 
                type="range" min="1.0" max="8.0" step="0.5"
                value={hullThicknessMm}
                onChange={e => setHullThicknessMm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Time to Impact (TCA)</span>
              <span className={`font-mono font-bold text-sm ${simTimeSec >= 0 ? "text-rose-500 animate-pulse" : "text-cyan-400"}`}>
                {simTimeSec < 0 ? `T-${Math.abs(simTimeSec).toFixed(1)}s` : `IMPACT T+${simTimeSec.toFixed(1)}s`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "FREEZE INTERCEPT" : "RUN CLOSING RUN"}
              </button>

              <button
                onClick={() => setSimTimeSec(-20)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Approach"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Engagement Geometry (Terminal Handoff)</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isImpactReached ? "text-rose-500 animate-pulse" : "text-white"}`}>
              {isImpactReached ? "KINETIC IMPACT // TARGET DESTROYED" : `${currentRangeKm.toFixed(1)} km`}
            </span>
            {!isImpactReached && <span className="text-slate-500 text-sm">SLANT RANGE TO TARGET</span>}
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-rose-400">CLOSING RATE: {spec.closingVelocityKms.toLocaleString()} km/s</span>
            <span className="text-emerald-400">GUIDANCE: {spec.classification === "KINETIC_KILL" ? `TPN (N=${proNavGain})` : "OPTICAL CW"}</span>
            <span className="text-amber-400">ALTITUDE: {targetAltitudeKm} km</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-rose-500" />
            <div>
              <span className="text-slate-500 block text-[9px]">TERMINAL G-COMMAND</span>
              <span className="text-white font-bold text-sm">
                {spec.classification === "KINETIC_KILL" ? `${commandedG.toFixed(1)} G (DACS COLD-GAS)` : "0.0 G (DIRECTED SPEED OF LIGHT)"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">DELIVERED ENERGY</span>
            <span className="text-amber-400 font-bold text-sm">
              {spec.classification === "KINETIC_KILL" ? `${impactKineticEnergyMj.toFixed(1)} MJ (H2K)` : `${(laserIrradianceWcm2 / 1000).toFixed(1)} kW/cm²`}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">BREAKUP SEVERITY</span>
            <span className={`text-sm font-bold ${isCatastrophic ? "text-rose-400 font-black" : "text-emerald-400"}`}>
              {isCatastrophic ? "CATASTROPHIC DISPERSAL (≥40 J/g)" : "LOCALIZED PUNCTURE"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">NASA SBM TRACKABLE FRAGMENTS</span>
            <span className="text-rose-400 font-bold text-sm">~{trackableFragmentsL10cm} DEBRIS PIECES</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Damage Assessment
        </h2>

        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border ${isImpactReached ? "bg-rose-950/30 border-rose-500/50" : "bg-slate-900/40 border-slate-800"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              BDA (BATTLE DAMAGE ASSESSMENT)
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${isImpactReached ? "text-rose-400" : "text-slate-300"}`}>
              {isImpactReached ? <Flame className="w-5 h-5 text-rose-500" /> : <Radar className="w-5 h-5 text-cyan-400" />}
              {isImpactReached ? "MISSION KILL ACHIEVED" : "INBOUND TERMINAL FLYOUT"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {spec.classification === "KINETIC_KILL" 
                ? `Kinetic impact at ${spec.closingVelocityKms} km/s imparts ${specificEnergyJg.toFixed(0)} J/g specific energy, exceeding the 40 J/g threshold required to atomize the ${spec.targetMassKg} kg satellite bus into orbital shrapnel.`
                : `Ground laser delivers continuous spot irradiance of ${laserIrradianceWcm2.toFixed(0)} W/cm², achieving structural burn-through across ${hullThicknessMm} mm aluminum hull in ${timeToPunctureSec.toFixed(2)} seconds.`}
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">NASA Breakup Model (SBM)</div>
            <div className="flex justify-between"><span className="text-slate-500">Target Bus Mass:</span><span className="text-white font-bold">{spec.targetMassKg} kg</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Specific Energy:</span><span className="text-amber-400 font-bold">{specificEnergyJg.toFixed(0)} J/g</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Catalogable (≥10 cm):</span><span className="text-rose-400 font-bold">~{trackableFragmentsL10cm} pieces</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Lethal Shrapnel (≥1 cm):</span><span className="text-rose-500 font-bold">~{lethalSmallFragmentsL1cm.toLocaleString()} pieces</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Peak Velocity Spread (Δv):</span><span className="text-white">±1.45 km/s</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">ORBITAL RESIDENCE:</span><span className="text-rose-400">18–45 YEARS</span></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              True ProNav (TPN) Vector Dynamics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              True Proportional Navigation nulls the Line-of-Sight rate by steering lateral acceleration perpendicular to the instantaneous target vector. Even high-g evasive satellite maneuvers are countered within the final 3.5 seconds of DACS terminal burn.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
