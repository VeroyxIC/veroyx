"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Zap, Radio, AlertTriangle, ShieldAlert, ShieldCheck, 
  Activity, Layers, Gauge, Globe, Compass, Play, Square, 
  RotateCcw, Flame, Orbit, Cpu, ArrowRight 
} from "lucide-react"

type DetonationPreset = "STARFISH_PRIME_1962" | "SOVIET_TEST_184" | "TACTICAL_EXO_50KT" | "SUPER_EMP_300KT"

interface HandPresetSpec {
  name: string
  yieldKt: number
  burstAltitudeKm: number
  locationName: string
  burstLat: number
  burstLon: number
  geomagneticLShell: number
  promptGammaFraction: number
  description: string
  colorHex: string
}

const HAND_PRESETS: Record<DetonationPreset, HandPresetSpec> = {
  "STARFISH_PRIME_1962": {
    name: "Starfish Prime Historical Event (1.4 Mt)",
    yieldKt: 1400,
    burstAltitudeKm: 400,
    locationName: "Johnston Atoll, Pacific",
    burstLat: 16.7,
    burstLon: -169.5,
    geomagneticLShell: 1.25,
    promptGammaFraction: 0.001,
    description: "Historical 1962 test creating an artificial radiation belt that disabled Telstar 1, Ariel 1, and Transit 4B.",
    colorHex: "#ef4444"
  },
  "SOVIET_TEST_184": {
    name: "Soviet Project K-3 / Test 184 (300 kt)",
    yieldKt: 300,
    burstAltitudeKm: 290,
    locationName: "Saryshagan, Kazakhstan",
    burstLat: 46.3,
    burstLon: 73.6,
    geomagneticLShell: 1.95,
    promptGammaFraction: 0.0015,
    description: "Massive E3 geomagnetic heave test inducing 1,500A currents in underground telecommunication cables.",
    colorHex: "#f59e0b"
  },
  "TACTICAL_EXO_50KT": {
    name: "Tactical Exoatmospheric Interceptor (50 kt)",
    yieldKt: 50,
    burstAltitudeKm: 135,
    locationName: "Baltic Theater Corridor",
    burstLat: 56.5,
    burstLon: 21.0,
    geomagneticLShell: 2.8,
    promptGammaFraction: 0.002,
    description: "Localized high-voltage E1 strike designed to blind tactical SAR/optical recon satellites without persistent belts.",
    colorHex: "#38bdf8"
  },
  "SUPER_EMP_300KT": {
    name: "Enhanced-Radiation Super-EMP (300 kt)",
    yieldKt: 300,
    burstAltitudeKm: 250,
    locationName: "Mid-Atlantic Strategic Area",
    burstLat: 38.0,
    burstLon: -45.0,
    geomagneticLShell: 1.6,
    promptGammaFraction: 0.005,
    description: "Optimized gamma emitter producing >85 kV/m E1 peak fields and injecting long-lived relativistic electron swarms.",
    colorHex: "#d946ef"
  }
}

export default function HempSimPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [presetKey, setPresetKey] = useState<DetonationPreset>("STARFISH_PRIME_1962")
  const [burstAltitudeKm, setBurstAltitudeKm] = useState<number>(400)
  const [weaponYieldKt, setWeaponYieldKt] = useState<number>(1400)
  const [satelliteHardeningLevel, setSatelliteHardeningLevel] = useState<"UNHARDENED_COMMERCIAL" | "MIL_STD_188_HARDENED" | "RAD_HARD_STRATEGIC">("MIL_STD_188_HARDENED")
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = HAND_PRESETS[presetKey]

  // Physical & Electromagnetic Equations
  const calculations = useMemo(() => {
    // 1. Peak E1 Electric Field Calculation (IEC 61000-2-9 model)
    // Gamma yield driving Compton electrons in 20-40km stratospheric layer
    const gammaYieldKt = weaponYieldKt * spec.promptGammaFraction
    const baseE1KvM = Math.min(95, 25 * Math.sqrt(gammaYieldKt) * Math.pow(burstAltitudeKm / 200, 0.25))
    const peakE1KvPerMeter = Number(baseE1KvM.toFixed(1))

    // 2. E3 Late-Time Geomagnetic Heave (MHD Field)
    const e3HeaveVPerKm = Number((Math.min(42, 8.5 * Math.pow(weaponYieldKt / 100, 0.4))).toFixed(1))

    // 3. Tangent Line-of-Sight Ground Footprint (Radio Horizon of Burst)
    const EARTH_RADIUS_KM = 6371
    const horizonDistanceKm = Math.sqrt(2 * EARTH_RADIUS_KM * burstAltitudeKm + burstAltitudeKm * burstAltitudeKm)
    const empFootprintRadiusKm = Number(Math.min(2800, horizonDistanceKm).toFixed(0))

    // 4. Trapped Relativistic Electron Belt Density (Starfish Effect)
    // Trapped flux in electrons/cm2/sec for E > 1 MeV
    const trappedFluxExponent = Math.min(8.8, 6.2 + Math.log10(weaponYieldKt) * 0.75)
    const peakTrappedFlux = Math.pow(10, trappedFluxExponent)
    const beltDecayLifetimeDays = Math.round(180 * Math.pow(burstAltitudeKm / 200, 1.2))

    // 5. Satellite Degradation Rate (Total Ionizing Dose in rad(Si)/day)
    const dailyDoseRadSi = (peakTrappedFlux / 1e8) * 450
    
    // Attenuation based on shielding
    const shieldingFactor = satelliteHardeningLevel === "RAD_HARD_STRATEGIC" ? 0.05 : satelliteHardeningLevel === "MIL_STD_188_HARDENED" ? 0.25 : 1.0
    const netDosePerDay = dailyDoseRadSi * shieldingFactor
    const daysUntilSolarPanel50PctLoss = Math.max(2, Math.round(45000 / netDosePerDay))

    const isE1Critical = peakE1KvPerMeter >= 50.0

    return {
      peakE1KvPerMeter,
      e3HeaveVPerKm,
      empFootprintRadiusKm,
      peakTrappedFlux,
      beltDecayLifetimeDays,
      netDosePerDay,
      daysUntilSolarPanel50PctLoss,
      isE1Critical
    }
  }, [weaponYieldKt, burstAltitudeKm, spec.promptGammaFraction, satelliteHardeningLevel])

  // Simulation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Earth, Dipole Field Lines & Trapped Radiation Belt Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 16, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.8)
    sun.position.set(30, 20, 20)
    scene.add(sun)

    // 1. Earth Body (Radius 5.5 units)
    const earthR = 5.5
    const earthGeo = new THREE.SphereGeometry(earthR, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.85,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 })
    const earthWire = new THREE.Mesh(new THREE.SphereGeometry(earthR * 1.005, 36, 18), wireMat)
    earth.add(earthWire)

    // 2. Earth Dipole Magnetic Field Lines
    const fieldLinesGroup = new THREE.Group()
    scene.add(fieldLinesGroup)

    const lShells = [1.3, 1.6, 2.0, 2.5]
    lShells.forEach(L => {
      const fieldLineCount = 12
      for (let j = 0; j < fieldLineCount; j++) {
        const azim = (j * 2 * Math.PI) / fieldLineCount
        const points: THREE.Vector3[] = []
        for (let latDeg = -75; latDeg <= 75; latDeg += 3) {
          const latRad = (latDeg * Math.PI) / 180
          const r = earthR * L * Math.pow(Math.cos(latRad), 2)
          const x = r * Math.cos(latRad) * Math.cos(azim)
          const z = r * Math.cos(latRad) * Math.sin(azim)
          const y = r * Math.sin(latRad)
          points.push(new THREE.Vector3(x, y, z))
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.25
        })
        const fieldLine = new THREE.Line(lineGeo, lineMat)
        fieldLinesGroup.add(fieldLine)
      }
    })

    // 3. High-Altitude Detonation Point & Expanding Fireball
    const burstAltitudeUnits = earthR + (burstAltitudeKm / 6371) * earthR
    const burstLatRad = (spec.burstLat * Math.PI) / 180
    const burstLonRad = (spec.burstLon * Math.PI) / 180

    const burstPos = new THREE.Vector3(
      burstAltitudeUnits * Math.cos(burstLatRad) * Math.cos(burstLonRad),
      burstAltitudeUnits * Math.sin(burstLatRad),
      burstAltitudeUnits * Math.cos(burstLatRad) * Math.sin(burstLonRad)
    )

    // Fireball Pulsing Core
    const fireballGeo = new THREE.SphereGeometry(0.65, 24, 24)
    const fireballMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    })
    const fireball = new THREE.Mesh(fireballGeo, fireballMat)
    fireball.position.copy(burstPos)
    scene.add(fireball)

    // EMP Shock Wave Expanding Shell
    const shockGeo = new THREE.SphereGeometry(1.2, 32, 32)
    const shockMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.colorHex),
      wireframe: true,
      transparent: true,
      opacity: 0.65
    })
    const shockWave = new THREE.Mesh(shockGeo, shockMat)
    shockWave.position.copy(burstPos)
    scene.add(shockWave)

    // 4. Trapped Relativistic Beta-Decay Electron Particle Torus (Starfish Belt)
    const particleCount = 650
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const az = Math.random() * Math.PI * 2
      const lat = (Math.random() - 0.5) * 1.6
      const rad = earthR * (1.25 + Math.random() * 0.65) * Math.pow(Math.cos(lat), 2)
      particlePositions[i * 3 + 0] = rad * Math.cos(lat) * Math.cos(az)
      particlePositions[i * 3 + 1] = rad * Math.sin(lat)
      particlePositions[i * 3 + 2] = rad * Math.cos(lat) * Math.sin(az)
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))

    const particleMat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.14,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    })
    const electronBelt = new THREE.Points(particleGeo, particleMat)
    scene.add(electronBelt)

    // 5. Constellation Satellites Traversing Artificial Belt
    const satGroup = new THREE.Group()
    scene.add(satGroup)

    const satGeo = new THREE.BoxGeometry(0.35, 0.35, 0.5)
    const satMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.5 })
    const sat1 = new THREE.Mesh(satGeo, satMat)
    satGroup.add(sat1)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Oscillate Shockwave and EMP pulse
      const t = simStep * 0.08
      const pulseScale = 1.0 + (Math.sin(t) + 1.0) * 1.8
      shockWave.scale.set(pulseScale, pulseScale, pulseScale)
      shockMat.opacity = Math.max(0.1, 0.8 - (pulseScale / 3.0) * 0.5)

      fireball.scale.setScalar(0.85 + Math.sin(t * 2) * 0.2)

      // Rotate trapped particle belt around geomagnetic axis
      electronBelt.rotation.y += 0.003
      earth.rotation.y += 0.0006

      // Move satellite along polar LEO trajectory
      const orbR = earthR + 0.95
      const u = simStep * 0.015
      sat1.position.set(orbR * Math.cos(u), orbR * Math.sin(u), 0)
      sat1.lookAt(0, 0, 0)

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
  }, [burstAltitudeKm, spec, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: DETONATION SPECIFICATIONS & SHIELDING */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Flame className="w-5 h-5 text-rose-500" /> HEMP &amp; Trapped Belts
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            High-Altitude Nuclear EMP &amp; Starfish Belt Simulator
          </p>
        </div>

        <div className="space-y-6">
          {/* Preset Selectors */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-rose-500" /> Detonation Profile Preset
            </label>
            <div className="space-y-2">
              {(["STARFISH_PRIME_1962", "SOVIET_TEST_184", "TACTICAL_EXO_50KT", "SUPER_EMP_300KT"] as DetonationPreset[]).map(key => {
                const item = HAND_PRESETS[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setPresetKey(key)
                      setBurstAltitudeKm(item.burstAltitudeKm)
                      setWeaponYieldKt(item.yieldKt)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      presetKey === key 
                        ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.locationName} | L = {item.geomagneticLShell}
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-rose-400 font-bold block">{item.yieldKt.toLocaleString()} kt</span>
                      <span className="text-slate-500">{item.burstAltitudeKm} km</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Burst Physics Scaling */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Burst Parameters</span>
              <span className="text-rose-400 font-bold">{calculations.peakE1KvPerMeter} kV/m E1</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">WEAPON YIELD:</span>
                <span className="text-white font-bold">{weaponYieldKt.toLocaleString()} Kilotons (TNT)</span>
              </div>
              <input 
                type="range" min="10" max="3000" step="50"
                value={weaponYieldKt}
                onChange={e => setWeaponYieldKt(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">BURST ALTITUDE (HOB):</span>
                <span className="text-amber-400 font-bold">{burstAltitudeKm} km (EXOATMOSPHERIC)</span>
              </div>
              <input 
                type="range" min="80" max="600" step="10"
                value={burstAltitudeKm}
                onChange={e => setBurstAltitudeKm(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Spacecraft Fleet Hardening Standard</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["UNHARDENED_COMMERCIAL", "MIL_STD_188_HARDENED", "RAD_HARD_STRATEGIC"] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setSatelliteHardeningLevel(level)}
                    className={`py-1.5 px-1 rounded border text-[9px] font-bold text-center transition-all ${
                      satelliteHardeningLevel === level 
                        ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    {level === "UNHARDENED_COMMERCIAL" ? "COMMERCIAL" : level === "MIL_STD_188_HARDENED" ? "MIL-STD-188" : "RAD-HARD"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Radiation Environment</span>
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> TRAPPED FLUX ACTIVE
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
                {isPlaying ? "FREEZE SIMULATION" : "RUN DETONATION"}
              </button>

              <button
                onClick={() => setSimStep(0)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Event"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS HEMP HUD & RADIATION BELT */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Exoatmospheric EMP &amp; Relativistic Trapping [Starfish Belt]
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${calculations.isE1Critical ? "text-rose-500 animate-pulse" : "text-amber-400"}`}>
              {calculations.peakE1KvPerMeter} kV/m
            </span>
            <span className="text-slate-500 text-sm">
              PEAK E1 COMPTON FIELD (RISE TIME &lt; 2.5 ns)
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-amber-400">E3 HEAVE: {calculations.e3HeaveVPerKm} V/km</span>
            <span className="text-rose-400">EMP FOOTPRINT: {calculations.empFootprintRadiusKm.toLocaleString()} km RADIUS</span>
            <span className="text-cyan-400">INJECTED BELT LIFETIME: ~{calculations.beltDecayLifetimeDays} DAYS</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Orbit className="w-5 h-5 text-rose-500" />
            <div>
              <span className="text-slate-500 block text-[9px]">SOLAR ARRAY 50% POWER SURVIVAL</span>
              <span className="text-white font-bold text-sm">~{calculations.daysUntilSolarPanel50PctLoss} DAYS (TID LIMIT)</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">PEAK ELECTRON FLUX (E &gt; 1 MeV)</span>
            <span className="text-rose-400 font-bold text-sm">{(calculations.peakTrappedFlux).toExponential(2)} e⁻/cm²/s</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">LEO SATELLITE DOSE ACCUMULATION</span>
            <span className="text-amber-400 font-bold text-sm">{calculations.netDosePerDay.toFixed(0)} rad(Si)/day</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GEOMAGNETIC SHELL</span>
            <span className="text-cyan-400 font-bold text-sm">L = {spec.geomagneticLShell}</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: EMP TEMPORAL PHASES & SATELLITE IMPACT */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Damage &amp; Hardening
        </h2>

        <div className="space-y-6">
          {/* Constellation Damage Status Card */}
          <div className="p-5 rounded-2xl border bg-rose-950/20 border-rose-500/40">
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              CONSTELLATION SURVIVABILITY ASSESSMENT
            </div>
            <div className="text-xl font-black flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" /> CATASTROPHIC ATTRITION
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Exoatmospheric detonation at {burstAltitudeKm} km traps {(calculations.peakTrappedFlux).toExponential(1)} relativistic electrons/cm²/s in the geomagnetic field lines. Unhardened commercial LEO satellites suffer solar cell glass darkening and memory single-event upsets (SEU), degrading fleet capability by 50% within {calculations.daysUntilSolarPanel50PctLoss} days.
            </p>
          </div>

          {/* Temporal Phase Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">HEMP Temporal Phase Cascade</div>
            <div className="flex justify-between"><span className="text-slate-500">E1 Fast Pulse (0–100 ns):</span><span className="text-rose-400 font-bold">{calculations.peakE1KvPerMeter} kV/m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">E2 Intermediate (1µs–1s):</span><span className="text-amber-400 font-bold">120 V/m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">E3 Late Heave (1s–300s):</span><span className="text-cyan-400 font-bold">{calculations.e3HeaveVPerKm} V/km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Coverage Footprint:</span><span className="text-white font-bold">{calculations.empFootprintRadiusKm} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Shielding Attenuation:</span><span className="text-emerald-400 font-bold">{satelliteHardeningLevel === "RAD_HARD_STRATEGIC" ? "-26 dB" : satelliteHardeningLevel === "MIL_STD_188_HARDENED" ? "-12 dB" : "0 dB (NONE)"}</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">DAILY SATELLITE DOSE:</span><span className="text-rose-400">{calculations.netDosePerDay.toFixed(0)} rad/day</span></div>
          </div>

          {/* Starfish Prime Historic Fact Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Geomagnetic Mirroring Mechanics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Beta-decay electrons undergo cyclotron gyrations around geomagnetic field lines while bouncing between North and South magnetic mirror points. The first adiabatic invariant mu = p_perp^2 / (2mB) preserves trapping for years in the inner magnetosphere.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
