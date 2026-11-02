"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Flame, Radar, Wind, Thermometer, Activity, ShieldAlert, 
  ShieldCheck, Layers, Gauge, Compass, Play, Square, 
  RotateCcw, Crosshair, AlertTriangle, Globe, Target 
} from "lucide-react"

type HgvClass = "AVANGARD_WAVERIDER" | "DF_ZF_GLIDER" | "DARK_EAGLE_LRHW" | "ZIRCON_SCRAMJET"

interface HgvSpec {
  name: string
  country: string
  entryMach: number
  nominalAltitudeKm: number
  liftToDrag: number
  noseRadiusMm: number
  massKg: number
  rangeKm: number
  maneuverEnvelope: string
  colorHex: string
}

const HGV_PRESETS: Record<HgvClass, HgvSpec> = {
  "AVANGARD_WAVERIDER": {
    name: "Avangard Intercontinental Waverider",
    country: "RUSSIAN FEDERATION",
    entryMach: 22.5,
    nominalAltitudeKm: 58,
    liftToDrag: 4.2,
    noseRadiusMm: 22,
    massKg: 2100,
    rangeKm: 6200,
    maneuverEnvelope: "Dynamic Skip-Glide & ±800 km Cross-Range Weave",
    colorHex: "#ef4444"
  },
  "DF_ZF_GLIDER": {
    name: "DF-ZF Hypersonic Glide Vehicle",
    country: "PRC",
    entryMach: 15.2,
    nominalAltitudeKm: 46,
    liftToDrag: 3.6,
    noseRadiusMm: 28,
    massKg: 1400,
    rangeKm: 2800,
    maneuverEnvelope: "Mid-Atmospheric Equilibrium Glide with Dive-Pullup",
    colorHex: "#f59e0b"
  },
  "DARK_EAGLE_LRHW": {
    name: "Dark Eagle Long-Range Hypersonic Weapon (LRHW)",
    country: "UNITED STATES",
    entryMach: 17.0,
    nominalAltitudeKm: 52,
    liftToDrag: 3.1,
    noseRadiusMm: 35,
    massKg: 1800,
    rangeKm: 3100,
    maneuverEnvelope: "Common Hypersonic Glide Body (C-HGB) Precision Strike",
    colorHex: "#38bdf8"
  },
  "ZIRCON_SCRAMJET": {
    name: "3M22 Zircon Hypersonic Scramjet Cruise",
    country: "RUSSIAN FEDERATION",
    entryMach: 8.5,
    nominalAltitudeKm: 32,
    liftToDrag: 4.8,
    noseRadiusMm: 45,
    massKg: 950,
    rangeKm: 1100,
    maneuverEnvelope: "Sustained Scramjet Air-Breathing Cruise Maneuvers",
    colorHex: "#d946ef"
  }
}

export default function HypersonicPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [threatClass, setThreatClass] = useState<HgvClass>("AVANGARD_WAVERIDER")
  const [velocityKms, setVelocityKms] = useState<number>(6.2) // ~Mach 20
  const [altitudeKm, setAltitudeKm] = useState<number>(55)
  const [liftToDragRatio, setLiftToDragRatio] = useState<number>(3.8)
  const [bankAngleDeg, setBankAngleDeg] = useState<number>(25)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = HGV_PRESETS[threatClass]

  // Atmospheric Model (US Standard Atmosphere approx)
  const RHO_0 = 1.225 // kg/m3 sea level
  const SCALE_HEIGHT_M = 7200
  const currentDensityKgM3 = RHO_0 * Math.exp(-(altitudeKm * 1000) / SCALE_HEIGHT_M)
  const localSpeedOfSoundMs = 300 // approx at 50 km stratopause
  const currentMach = (velocityKms * 1000) / localSpeedOfSoundMs

  // Aerothermal Stagnation Point Heating (Sutton-Graves)
  const noseRadiusM = spec.noseRadiusMm / 1000
  const K_SUTTON = 1.74e-4
  const velMs = velocityKms * 1000
  const stagnationHeatFluxWcm2 = (K_SUTTON * Math.sqrt(currentDensityKgM3 / noseRadiusM) * Math.pow(velMs, 3)) / 1e4
  const heatFluxMwM2 = stagnationHeatFluxWcm2 / 100

  // Surface Radiative Equilibrium Wall Temperature
  const STEFAN_BOLTZMANN = 5.670374e-8
  const EMISSIVITY = 0.88 // Ultra-High Temperature Ceramic (UHTC ZrB2-SiC)
  const wallTempKelvin = Math.pow((heatFluxMwM2 * 1e6) / (EMISSIVITY * STEFAN_BOLTZMANN), 0.25)
  const wallTempCelsius = wallTempKelvin - 273.15

  // Lift, Drag, and G-Force
  const refAreaM2 = 0.65
  const dynPressureKpa = (0.5 * currentDensityKgM3 * Math.pow(velMs, 2)) / 1000
  const liftForceKn = (dynPressureKpa * 1000 * refAreaM2 * 0.45 * liftToDragRatio) / 1000
  const dragForceKn = liftForceKn / liftToDragRatio
  const decelGs = (dragForceKn * 1000) / (spec.massKg * 9.80665)

  // Overhead Persistent Infrared (OPIR) Tracking Detection
  const trackingSatAltitudeKm = 550
  const slantRangeToSatKm = Math.sqrt(Math.pow(trackingSatAltitudeKm - altitudeKm, 2) + Math.pow(180, 2))
  const isDetectedByOpir = wallTempKelvin >= 900 // Intense thermal signature detection gate
  const iipDivergenceKm = Math.min(650, Math.pow(currentMach, 1.4) * liftToDragRatio * (bankAngleDeg / 20))

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Hypersonic Skip-Glide & OPIR Sensor Visualization
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
    const sun = new THREE.DirectionalLight(0xfffaed, 3.0)
    sun.position.set(20, 25, 15)
    scene.add(sun)

    // 1. Curved Earth Surface & Atmospheric Glow Rim
    const earthRadius = 38
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.18)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.8,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earth.position.set(0, -earthRadius - 1.2, 0)
    scene.add(earth)

    // Atmosphere Layer (Stratosphere to Mesosphere Shell)
    const atmoGeo = new THREE.SphereGeometry(earthRadius + 2.2, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.18)
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    })
    const atmo = new THREE.Mesh(atmoGeo, atmoMat)
    atmo.position.copy(earth.position)
    scene.add(atmo)

    // 2. Hypersonic Waverider Glide Vehicle
    const hgvGroup = new THREE.Group()
    scene.add(hgvGroup)

    // Sharp Wedge Waverider Hull
    const hgvGeo = new THREE.ConeGeometry(0.8, 3.2, 4)
    const hgvMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2
    })
    const hgvBody = new THREE.Mesh(hgvGeo, hgvMat)
    hgvBody.rotation.z = Math.PI / 2
    hgvBody.scale.set(0.6, 1.0, 1.8) // Flattened lifting body
    hgvGroup.add(hgvBody)

    // Blazing Plasma Shock Wave Cone (High Temperature Glow)
    const plasmaGeo = new THREE.ConeGeometry(1.2, 3.6, 16, 1, true)
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.colorHex),
      wireframe: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    })
    const plasmaShock = new THREE.Mesh(plasmaGeo, plasmaMat)
    plasmaShock.rotation.z = -Math.PI / 2
    plasmaShock.position.set(-0.5, 0, 0)
    hgvGroup.add(plasmaShock)

    // Plasma Wake Trail Particles
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3 + 0] = -(i * 0.15)
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const wakePoints = new THREE.Points(particleGeo, particleMat)
    hgvGroup.add(wakePoints)

    // 3. Space-Layer Overhead OPIR Tracking Satellite
    const satGroup = new THREE.Group()
    satGroup.position.set(4, 7.5, 0)
    scene.add(satGroup)

    const satGeo = new THREE.BoxGeometry(0.5, 0.5, 0.7)
    const satMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 })
    const satMesh = new THREE.Mesh(satGeo, satMat)
    satGroup.add(satMesh)

    // OPIR Sensor Beam Cone
    const beamGeo = new THREE.ConeGeometry(3.5, 8.5, 16, 1, true)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    })
    const beamCone = new THREE.Mesh(beamGeo, beamMat)
    beamCone.position.set(0, -4.2, 0)
    satGroup.add(beamCone)

    // OPIR Tracking Laser Line
    const irTrackGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const irTrackMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 2,
      transparent: true,
      opacity: isDetectedByOpir ? 0.9 : 0.0
    })
    const irTrackLine = new THREE.Line(irTrackGeo, irTrackMat)
    scene.add(irTrackLine)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Oscillating Skip-Glide Altitude Dynamics
      const skipAltitude = Math.sin(simStep * 0.04) * 0.65
      const bankRad = (bankAngleDeg * Math.PI) / 180
      hgvGroup.position.set(-2, skipAltitude, 0)
      hgvGroup.rotation.x = bankRad * 0.5

      // Jitter wake particles
      const pos = particleGeo.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 0] -= 0.04
        if (pos[i * 3 + 0] < -18.0) {
          pos[i * 3 + 0] = -0.5
        }
      }
      particleGeo.attributes.position.needsUpdate = true

      // Update OPIR Tracking Vector
      const satPos = satGroup.position
      const hgvPos = hgvGroup.position
      const linePositions = new Float32Array([
        satPos.x, satPos.y, satPos.z,
        hgvPos.x, hgvPos.y, hgvPos.z
      ])
      irTrackGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3))
      irTrackGeo.attributes.position.needsUpdate = true

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
  }, [threatClass, bankAngleDeg, isDetectedByOpir, simStep, spec])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: THREAT VEHICLE PROFILES & GLIDE PARAMETERS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Wind className="w-5 h-5 text-amber-500" /> Hypersonic &amp; OPIR
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Non-Keplerian Glide &amp; Space-Layer Tracking
          </p>
        </div>

        <div className="space-y-6">
          {/* Threat Class Selection */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Hypersonic Glide Profiles
            </label>
            <div className="space-y-2">
              {(["AVANGARD_WAVERIDER", "DF_ZF_GLIDER", "DARK_EAGLE_LRHW", "ZIRCON_SCRAMJET"] as HgvClass[]).map(c => {
                const item = HGV_PRESETS[c]
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setThreatClass(c)
                      setAltitudeKm(item.nominalAltitudeKm)
                      setVelocityKms((item.entryMach * 300) / 1000)
                      setLiftToDragRatio(item.liftToDrag)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      threatClass === c 
                        ? "bg-amber-950/40 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.country} | L/D: {item.liftToDrag} | Rn: {item.noseRadiusMm} mm
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-amber-400 font-bold block">Mach {item.entryMach}</span>
                      <span className="text-slate-500">{item.rangeKm.toLocaleString()} km</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dynamic Flight Parameter Controls */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Atmospheric Entry &amp; Glide Envelope
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">FLIGHT VELOCITY:</span>
                <span className="text-white font-bold">{velocityKms.toFixed(2)} km/s (Mach {currentMach.toFixed(1)})</span>
              </div>
              <input 
                type="range" min="2.5" max="7.8" step="0.1"
                value={velocityKms}
                onChange={e => setVelocityKms(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">GLIDE ALTITUDE:</span>
                <span className="text-cyan-400 font-bold">{altitudeKm} km (MESOSPHERE)</span>
              </div>
              <input 
                type="range" min="25" max="85" step="1"
                value={altitudeKm}
                onChange={e => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">LIFT-TO-DRAG RATIO (L/D):</span>
                <span className="text-emerald-400 font-bold">{liftToDragRatio.toFixed(1)}</span>
              </div>
              <input 
                type="range" min="1.5" max="5.5" step="0.1"
                value={liftToDragRatio}
                onChange={e => setLiftToDragRatio(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">AERODYNAMIC BANK ANGLE (σ):</span>
                <span className="text-rose-400 font-bold">{bankAngleDeg}° (CROSS-RANGE WEAVE)</span>
              </div>
              <input 
                type="range" min="0" max="65" step="5"
                value={bankAngleDeg}
                onChange={e => setBankAngleDeg(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">OPIR Stereo Tracking</span>
              <span className={`font-bold ${isDetectedByOpir ? "text-cyan-400" : "text-slate-500"}`}>
                {isDetectedByOpir ? "SPACE-LAYER TRACK LOCKED" : "SIGNATURE SUB-THRESHOLD"}
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
                {isPlaying ? "HOLD TRAJECTORY" : "RUN SKIP-GLIDE"}
              </button>

              <button
                onClick={() => setSimStep(0)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Approach"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS ATMOSPHERIC VISUALIZER & FLIGHT HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Aerothermal Hypersonic Tracking [SDA PWSA Tracking Layer]
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-amber-400">
              {wallTempCelsius.toFixed(0)}°C
            </span>
            <span className="text-slate-500 text-sm">STAGNATION WALL TEMP ({wallTempKelvin.toFixed(0)} K)</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-rose-400">HEAT FLUX: {heatFluxMwM2.toFixed(2)} MW/m²</span>
            <span className="text-cyan-400">DYNAMIC PRESSURE: {dynPressureKpa.toFixed(1)} kPa</span>
            <span className="text-emerald-400">DECELERATION: {decelGs.toFixed(1)} G</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical Status HUD Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-slate-500 block text-[9px]">AERODYNAMIC REGIME</span>
              <span className="text-white font-bold text-sm">EQUILIBRIUM GLIDE (L/D = {liftToDragRatio.toFixed(1)})</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">BALLISTIC TRAJECTORY DIVERGENCE</span>
            <span className="text-rose-400 font-bold text-sm">+{iipDivergenceKm.toFixed(0)} km CROSS-RANGE</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">OVERHEAD SENSOR (LEO)</span>
            <span className="text-cyan-400 font-bold text-sm">SDA-TRACK-08 (MWIR 3–5µm)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SLANT RANGE TO OPIR</span>
            <span className="text-emerald-400 font-bold text-sm">{slantRangeToSatKm.toFixed(0)} km</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: AEROTHERMAL ANALYTICS & SENSOR FUSION */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Aerothermal Telemetry
        </h2>

        <div className="space-y-6">
          {/* Threat Detection Card */}
          <div className={`p-5 rounded-2xl border ${isDetectedByOpir ? "bg-amber-950/20 border-amber-500/40" : "bg-slate-900/40 border-slate-800"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              OVERHEAD SENSOR CUSTODY
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${isDetectedByOpir ? "text-amber-400" : "text-slate-400"}`}>
              {isDetectedByOpir ? <Radar className="w-5 h-5 text-cyan-400" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {isDetectedByOpir ? "OPIR TRACK VALIDATED" : "INFRARED DORMANT"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isDetectedByOpir 
                ? `Stagnation shock wave temperature of ${(wallTempCelsius).toFixed(0)}°C generates intense mid-wavelength infrared (MWIR) radiant flux, enabling overhead LEO Tracking Layer satellites to compute stereoscopic state vectors despite non-Keplerian weave maneuvers.`
                : "Atmospheric density is insufficient to sustain luminous aerothermal shock wave emissions. Object remains undetectable to satellite optical IR payloads."}
            </p>
          </div>

          {/* Aerothermal Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Aerodynamic Boundary Layer</div>
            <div className="flex justify-between"><span className="text-slate-500">Free Stream Velocity:</span><span className="text-white font-bold">{velocityKms.toFixed(2)} km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mach Number:</span><span className="text-amber-400 font-bold">Mach {currentMach.toFixed(1)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Atmospheric Density:</span><span className="text-white">{(currentDensityKgM3 * 1000).toFixed(3)} g/m³</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Stagnation Heat Flux:</span><span className="text-rose-400 font-bold">{heatFluxMwM2.toFixed(2)} MW/m²</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Aero Lift Force:</span><span className="text-emerald-400 font-bold">{liftForceKn.toFixed(1)} kN</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Aero Drag Force:</span><span className="text-white">{dragForceKn.toFixed(1)} kN</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">WALL TEMP:</span><span className="text-amber-400">{wallTempCelsius.toFixed(0)}°C</span></div>
          </div>

          {/* Skip-Glide Mechanics Principle */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Non-Keplerian Glide Dynamics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Unlike classical ballistic missiles whose impact point is fixed at booster burnout, waveriders bounce against dense atmospheric layers like a flat stone on water. Real-time OPIR stereo track correlation is mandatory to counter evasive bank-to-turn maneuvers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
