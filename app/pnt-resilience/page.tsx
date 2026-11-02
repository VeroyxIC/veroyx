"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Radio, ShieldAlert, ShieldCheck, Zap, Activity, 
  Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Target, Wifi, WifiOff, Cpu, Crosshair, Signal 
} from "lucide-react"

type EwThreatClass = "KRASUKHA_4_BARRAGE" | "ZHITEL_UHF_JAMMER" | "COGNITIVE_MEACONER" | "HIGH_POWER_CHIRP"

interface ThreatSpec {
  name: string
  threatType: "WIDEBAND_BARRAGE" | "SPOT_JAMMING" | "SPOOFING_MEACONER" | "CHIRP_SWEEP"
  originLocation: string
  lat: number
  lon: number
  erpKw: number
  bandwidthMhz: number
  targetFrequency: string
  nominalDistanceKm: number
  description: string
  colorHex: string
}

const THREAT_PRESETS: Record<EwThreatClass, ThreatSpec> = {
  "KRASUKHA_4_BARRAGE": {
    name: "Krasukha-4 Multifunctional EW System",
    threatType: "WIDEBAND_BARRAGE",
    originLocation: "Crimea Deployment Zone",
    lat: 45.2,
    lon: 34.1,
    erpKw: 85.0,
    bandwidthMhz: 40.0,
    targetFrequency: "GPS L1 / L2 / SAR X-band",
    nominalDistanceKm: 420,
    description: "High-power multi-beam ground station saturating satellite front-end LNAs across low Earth orbit.",
    colorHex: "#ef4444"
  },
  "ZHITEL_UHF_JAMMER": {
    name: "R-330Zh Zhitel Cellular & GNSS Jammer",
    threatType: "SPOT_JAMMING",
    originLocation: "Donbas Border Corridor",
    lat: 48.0,
    lon: 38.5,
    erpKw: 12.0,
    bandwidthMhz: 4.0,
    targetFrequency: "GPS L1 C/A (1575.42 MHz)",
    nominalDistanceKm: 180,
    description: "Tactical directional jammer denying civilian and commercial PNT access across operational corridors.",
    colorHex: "#f59e0b"
  },
  "COGNITIVE_MEACONER": {
    name: "Adaptive Asynchronous Meaconer",
    threatType: "SPOOFING_MEACONER",
    originLocation: "Maritime EW Vessel",
    lat: 42.8,
    lon: 31.5,
    erpKw: 4.5,
    bandwidthMhz: 2.046,
    targetFrequency: "GPS L1 / Galileo E1",
    nominalDistanceKm: 260,
    description: "Intercepts authentic navigation signals and rebroadcasts them with gradual time-delay offsets to inject false state vectors.",
    colorHex: "#d946ef"
  },
  "HIGH_POWER_CHIRP": {
    name: "Fast-Sweep Chirp Radar Jammer",
    threatType: "CHIRP_SWEEP",
    originLocation: "Baltic Enclave Array",
    lat: 54.7,
    lon: 20.5,
    erpKw: 35.0,
    bandwidthMhz: 20.0,
    targetFrequency: "GPS L1 / L5 / GLONASS",
    nominalDistanceKm: 340,
    description: "Sweeps linear FM pulses across GNSS passbands to break delay-locked loops (DLL) and phase-locked loops (PLL).",
    colorHex: "#38bdf8"
  }
}

export default function PntResiliencePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [threatKey, setThreatKey] = useState<EwThreatClass>("KRASUKHA_4_BARRAGE")
  const [jammerDistanceKm, setJammerDistanceKm] = useState<number>(420)
  const [jammerErpKw, setJammerErpKw] = useState<number>(85.0)
  const [crpaElementsCount, setCrpaElementsCount] = useState<number>(7) // 7-element CRPA array
  const [crpaEnabled, setCrpaEnabled] = useState<boolean>(true)
  const [insCouplingMode, setInsCouplingMode] = useState<"TIGHTLY_COUPLED" | "LOOSELY_COUPLED" | "STANDALONE_GNSS">("TIGHTLY_COUPLED")
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = THREAT_PRESETS[threatKey]

  // RF Link Budget & Jamming Calculations
  const calculations = useMemo(() => {
    const SPEED_OF_LIGHT = 299792458
    const GPS_L1_FREQ = 1575.42e6
    const WAVELENGTH = SPEED_OF_LIGHT / GPS_L1_FREQ

    // Authentic GPS L1 Signal Reception in Orbit (Nominal ~ -158.5 dBW)
    const authenticSignalPowerDbw = -158.5

    // Jammer Received Power via Friis Path Loss
    const jammerRangeM = Math.max(10000, jammerDistanceKm * 1000)
    const freeSpacePathLossDb = 20 * Math.log10((4 * Math.PI * jammerRangeM) / WAVELENGTH)
    const jammerErpDbw = 10 * Math.log10(jammerErpKw * 1000)
    
    // CRPA Null Steering Attenuation
    const crpaNullDepthDb = crpaEnabled ? Math.min(55, 25 + crpaElementsCount * 4.2) : 0
    const netReceivedJammerPowerDbw = jammerErpDbw - freeSpacePathLossDb - crpaNullDepthDb

    // Raw Jammer-to-Signal Ratio (J/S)
    const rawJsRatioDb = (jammerErpDbw - freeSpacePathLossDb) - authenticSignalPowerDbw
    const netJsRatioDb = netReceivedJammerPowerDbw - authenticSignalPowerDbw

    // Carrier-to-Noise Density (C/N0)
    const nominalCn0DbHz = 44.0
    const spectralSpreadingFactor = 2.22 // BPSK(1)
    const jammerBwHz = spec.bandwidthMhz * 1e6
    const jammerToSignalLinear = Math.pow(10, Math.max(0, netJsRatioDb) / 10)
    const effectiveCn0DbHz = Math.max(12.0, 10 * Math.log10(1 / ((1 / Math.pow(10, nominalCn0DbHz / 10)) + (jammerToSignalLinear / (spectralSpreadingFactor * jammerBwHz)))))

    // Tracking Thresholds
    const isReceiverLocked = effectiveCn0DbHz >= 28.0
    const isSpoofingAttack = spec.threatType === "SPOOFING_MEACONER"
    const chiSquareResidual = isSpoofingAttack ? 38.4 : (isReceiverLocked ? 2.1 : 14.8)
    const isSpoofingDetected = isSpoofingAttack && chiSquareResidual > 7.81 // 3 DOF 95% threshold

    // Navigation Solution Error
    const horizontalErrorM = !isReceiverLocked
      ? (insCouplingMode === "TIGHTLY_COUPLED" ? 4.5 : 85.0)
      : isSpoofingDetected
      ? (insCouplingMode === "TIGHTLY_COUPLED" ? 1.8 : 28.0)
      : 0.85

    return {
      rawJsRatioDb,
      netJsRatioDb,
      crpaNullDepthDb,
      effectiveCn0DbHz,
      isReceiverLocked,
      isSpoofingDetected,
      chiSquareResidual,
      horizontalErrorM
    }
  }, [threatKey, jammerDistanceKm, jammerErpKw, crpaElementsCount, crpaEnabled, insCouplingMode, spec.bandwidthMhz, spec.threatType])

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

  // 3D Three.js Tactical Theater & Adaptive Antenna Nulling Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 14, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.8)
    sun.position.set(25, 20, 15)
    scene.add(sun)

    // 1. Curved Earth Surface Arc
    const earthRadius = 36
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.16)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      wireframe: true,
      roughness: 0.9
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earth.position.set(0, -earthRadius - 2.0, 0)
    scene.add(earth)

    // 2. Tactical Allied Spacecraft Platform
    const satGroup = new THREE.Group()
    satGroup.position.set(0, 3.5, 0)
    scene.add(satGroup)

    const satGeo = new THREE.BoxGeometry(1.4, 1.4, 2.2)
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.85,
      roughness: 0.2
    })
    const satMesh = new THREE.Mesh(satGeo, satMat)
    satGroup.add(satMesh)

    // Solar Arrays
    const wingGeo = new THREE.BoxGeometry(2.8, 0.05, 1.0)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0369a1 })
    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(2.1, 0, 0)
    satGroup.add(wingL)
    const wingR = wingL.clone()
    wingR.position.set(-2.1, 0, 0)
    satGroup.add(wingR)

    // CRPA Antenna Array Base on Satellite Nadir Deck
    const crpaGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.12, 16)
    const crpaMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 })
    const crpaMesh = new THREE.Mesh(crpaGeo, crpaMat)
    crpaMesh.position.set(0, -0.75, 0)
    satGroup.add(crpaMesh)

    // 3. Ground EW Jammer Installation
    const jammerGroup = new THREE.Group()
    jammerGroup.position.set(-9.5, -2.8, 2.0)
    scene.add(jammerGroup)

    const jBaseGeo = new THREE.ConeGeometry(0.6, 1.2, 12)
    const jBaseMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 })
    const jBaseMesh = new THREE.Mesh(jBaseGeo, jBaseMat)
    jammerGroup.add(jBaseMesh)

    // Emitted Jamming Wavefront Cones
    const waveCount = 4
    const waveCones: THREE.Mesh[] = []
    for (let i = 0; i < waveCount; i++) {
      const cGeo = new THREE.ConeGeometry(2.5 + i * 2.5, 8 + i * 4, 16, 1, true)
      const cMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(spec.colorHex),
        wireframe: true,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
      })
      const cMesh = new THREE.Mesh(cGeo, cMat)
      cMesh.rotation.z = -Math.PI / 3.2
      cMesh.position.set(3.5, 4.0, 0)
      jammerGroup.add(cMesh)
      waveCones.push(cMesh)
    }

    // 4. CRPA Adaptive Reception Pattern Radiation Lobe (3D Toroid / Null Wedge)
    const lobeGeo = new THREE.SphereGeometry(2.8, 24, 24)
    const lobeMat = new THREE.MeshBasicMaterial({
      color: crpaEnabled ? 0x10b981 : 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    })
    const lobeMesh = new THREE.Mesh(lobeGeo, lobeMat)
    lobeMesh.position.copy(satGroup.position)
    scene.add(lobeMesh)

    // 5. Authentic GPS Constellation Signal Beams (from high MEO)
    const gpsBeamsGroup = new THREE.Group()
    scene.add(gpsBeamsGroup)

    const gpsSatPositions = [
      new THREE.Vector3(-8, 14, -6),
      new THREE.Vector3(6, 15, -4),
      new THREE.Vector3(10, 13, 8)
    ]

    gpsSatPositions.forEach(pos => {
      const gSat = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      )
      gSat.position.copy(pos)
      gpsBeamsGroup.add(gSat)

      const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, satGroup.position])
      const lineMat = new THREE.LineBasicMaterial({
        color: calculations.isReceiverLocked ? 0x10b981 : 0x64748b,
        transparent: true,
        opacity: calculations.isReceiverLocked ? 0.75 : 0.2
      })
      const beamLine = new THREE.Line(lineGeo, lineMat)
      gpsBeamsGroup.add(beamLine)
    })

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Oscillate jammer RF waves
      const t = simStep * 0.05
      waveCones.forEach((c, idx) => {
        const scaleFactor = 1.0 + Math.sin(t + idx * 0.8) * 0.15
        c.scale.set(scaleFactor, scaleFactor, scaleFactor)
      })

      // Steer CRPA null toward jammer when enabled
      if (crpaEnabled) {
        lobeMesh.scale.set(0.65, 1.2, 1.2) // Deep null along X-axis toward jammer
      } else {
        lobeMesh.scale.set(1.0, 1.0, 1.0) // Omnidirectional corrupted pattern
      }

      satMesh.rotation.y += 0.002

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
  }, [threatKey, crpaEnabled, calculations.isReceiverLocked, simStep, spec])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: THREAT EMITTER & ANTENNA CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Radio className="w-5 h-5 text-rose-500" /> Counter-PNT &amp; EW
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            CRPA Adaptive Nulling &amp; Anti-Spoofing Architecture
          </p>
        </div>

        <div className="space-y-6">
          {/* Threat Emitter Presets */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-rose-500" /> Electronic Warfare Emitter
            </label>
            <div className="space-y-2">
              {(["KRASUKHA_4_BARRAGE", "ZHITEL_UHF_JAMMER", "COGNITIVE_MEACONER", "HIGH_POWER_CHIRP"] as EwThreatClass[]).map(key => {
                const item = THREAT_PRESETS[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setThreatKey(key)
                      setJammerDistanceKm(item.nominalDistanceKm)
                      setJammerErpKw(item.erpKw)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      threatKey === key 
                        ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.originLocation} | {item.targetFrequency}
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-rose-400 font-bold block">{item.erpKw} kW ERP</span>
                      <span className="text-slate-500">{item.nominalDistanceKm} km</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Electronic Warfare Parameters */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Jammer Power &amp; Geometry</span>
              <span className="text-rose-400 font-bold">RAW J/S: +{calculations.rawJsRatioDb.toFixed(1)} dB</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">SLANT RANGE TO EMITTER:</span>
                <span className="text-white font-bold">{jammerDistanceKm} km</span>
              </div>
              <input 
                type="range" min="50" max="800" step="10"
                value={jammerDistanceKm}
                onChange={e => setJammerDistanceKm(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">TRANSMITTER ERP (POWER):</span>
                <span className="text-amber-400 font-bold">{jammerErpKw.toFixed(1)} kW ({(10 * Math.log10(jammerErpKw * 1000)).toFixed(1)} dBW)</span>
              </div>
              <input 
                type="range" min="1.0" max="150.0" step="5.0"
                value={jammerErpKw}
                onChange={e => setJammerErpKw(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">CRPA ARRAY ELEMENTS:</span>
                <span className="text-cyan-400 font-bold">{crpaElementsCount} ELEMENTS ({crpaElementsCount - 1} NULLING DOFs)</span>
              </div>
              <input 
                type="range" min="4" max="16" step="1"
                value={crpaElementsCount}
                onChange={e => setCrpaElementsCount(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Defense Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Adaptive Beamforming</span>
              <button
                onClick={() => setCrpaEnabled(!crpaEnabled)}
                className={`px-2.5 py-1 rounded border text-[10px] font-bold ${
                  crpaEnabled ? "bg-emerald-950 border-emerald-500 text-emerald-300" : "bg-rose-950 border-rose-500 text-rose-300"
                }`}
              >
                {crpaEnabled ? "CRPA NULLING ACTIVE" : "CRPA BYPASSED"}
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <label className="text-[10px] text-slate-500 uppercase block">Inertial Navigation Fusion</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["TIGHTLY_COUPLED", "LOOSELY_COUPLED", "STANDALONE_GNSS"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setInsCouplingMode(mode)}
                    className={`py-1.5 px-1 rounded border text-[9px] font-bold text-center transition-all ${
                      insCouplingMode === mode 
                        ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    {mode.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS TACTICAL HUD & RF SPECTRUM */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Resilient PNT Reception [Adaptive Nulling Matrix]
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${calculations.isReceiverLocked ? "text-emerald-400" : "text-rose-500"}`}>
              {calculations.effectiveCn0DbHz.toFixed(1)} dB-Hz
            </span>
            <span className="text-slate-500 text-sm">
              EFFECTIVE CARRIER-TO-NOISE (LOCK THRESHOLD: 28 dB-Hz)
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-rose-400">NET J/S: +{calculations.netJsRatioDb.toFixed(1)} dB</span>
            <span className="text-emerald-400">CRPA NULL DEPTH: -{calculations.crpaNullDepthDb.toFixed(1)} dB</span>
            <span className="text-cyan-400">PNT ERROR: ±{calculations.horizontalErrorM.toFixed(2)} meters</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Signal className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">GNSS TRACKING STATUS</span>
              <span className={`font-bold text-sm ${calculations.isReceiverLocked ? "text-emerald-400" : "text-rose-400"}`}>
                {calculations.isReceiverLocked ? "TRACKING LOCKED (4+ SVs)" : "RECEIVER CODE/CARRIER LOSS"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SPOOFING ANOMALY MONITOR</span>
            <span className={`text-sm font-bold ${calculations.isSpoofingDetected ? "text-rose-400 font-black animate-pulse" : "text-emerald-400"}`}>
              {calculations.isSpoofingDetected ? "MEACONING SPOOF DETECTED" : "SIGNALS AUTHENTIC"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">TIGHTLY-COUPLED INS RESIDUAL</span>
            <span className="text-cyan-400 font-bold text-sm">χ² = {calculations.chiSquareResidual.toFixed(1)}</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CRYPTOGRAPHIC AUTHENTICATION</span>
            <span className="text-amber-400 font-bold text-sm">M-CODE CHIMERA VERIFIED</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: LINK BUDGET & EKF INTEGRATION TELEMETRY */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> PNT Link Budget
        </h2>

        <div className="space-y-6">
          {/* System Defense Health Card */}
          <div className={`p-5 rounded-2xl border ${calculations.isReceiverLocked ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              PNT SYSTEM RESILIENCE
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${calculations.isReceiverLocked ? "text-emerald-400" : "text-rose-400"}`}>
              {calculations.isReceiverLocked ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              {calculations.isReceiverLocked ? "TACTICAL POSITION ASSURED" : "CRITICAL PNT DENIAL"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {calculations.isReceiverLocked 
                ? `CRPA adaptive array steers a ${calculations.crpaNullDepthDb.toFixed(1)} dB spatial null toward the ${spec.name}, suppressing jamming power below thermal threshold. Tightly-coupled INS maintains sub-2m position certainty.`
                : "Excess Jammer-to-Signal ratio exceeds receiver dynamic range, triggering PLL loss of lock. Spacecraft dead-reckoning on unassisted ring-laser gyro inertial drift."}
            </p>
          </div>

          {/* Link Budget Metrics */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">RF Intercept Link Cascade</div>
            <div className="flex justify-between"><span className="text-slate-500">Authentic GPS Power:</span><span className="text-emerald-400">-158.5 dBW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Jammer Emitter ERP:</span><span className="text-rose-400">+{(10 * Math.log10(jammerErpKw * 1000)).toFixed(1)} dBW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Free-Space Path Loss:</span><span className="text-slate-400">-{(20 * Math.log10((4 * Math.PI * jammerDistanceKm * 1000) / (299792458 / 1575.42e6))).toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">CRPA Adaptive Null:</span><span className="text-cyan-400 font-bold">-{calculations.crpaNullDepthDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Net Jammer-to-Signal:</span><span className={calculations.netJsRatioDb > 35 ? "text-rose-400" : "text-amber-400"}>+{calculations.netJsRatioDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">EFFECTIVE C/N0:</span><span className={calculations.isReceiverLocked ? "text-emerald-400" : "text-rose-400"}>{calculations.effectiveCn0DbHz.toFixed(1)} dB-Hz</span></div>
          </div>

          {/* Frost Adaptive Nulling Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Frost Constrained MVDR Dynamics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Minimum Variance Distortionless Response updates spatial weights every millisecond. By placing linear equality constraints along authentic satellite vectors, the array creates deep spatial notches toward high-power emitters without attenuating authentic downlinks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
