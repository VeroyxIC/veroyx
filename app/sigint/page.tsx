"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Radio, Target, Crosshair, Activity, Layers, 
  Gauge, Compass, Play, Square, RotateCcw, 
  ShieldAlert, ShieldCheck, Cpu, Signal, ArrowRight, Eye 
} from "lucide-react"

type EmitterTargetClass = "S400_ACQUISITION_RADAR" | "COASTAL_SURFACE_SEARCH" | "MOBILE_SAM_ENGAGEMENT" | "DARK_VESSEL_AIS"

interface EmitterSpec {
  name: string
  classification: "ELINT_RADAR" | "COMINT_UPLINK" | "TACTICAL_NAV"
  carrierFreqGhz: number
  pulseRepetitionFreqHz: number
  pulseWidthMicroSec: number
  erpKw: number
  lat: number
  lon: number
  locationName: string
  modulation: string
  description: string
  colorHex: string
}

const EMITTER_PRESETS: Record<EmitterTargetClass, EmitterSpec> = {
  "S400_ACQUISITION_RADAR": {
    name: "91N6E Big Bird Acquisition Radar",
    classification: "ELINT_RADAR",
    carrierFreqGhz: 2.85,
    pulseRepetitionFreqHz: 1200,
    pulseWidthMicroSec: 15.0,
    erpKw: 2500,
    lat: 44.6,
    lon: 33.5,
    locationName: "Sevastopol Naval Complex",
    modulation: "Chirp Linear FM (Pulse-Doppler)",
    description: "S-band long-range target acquisition radar providing air-picture track data to S-400 battalions.",
    colorHex: "#ef4444"
  },
  "COASTAL_SURFACE_SEARCH": {
    name: "Monolit-B Coastal Over-the-Horizon Radar",
    classification: "ELINT_RADAR",
    carrierFreqGhz: 9.35,
    pulseRepetitionFreqHz: 2400,
    pulseWidthMicroSec: 1.2,
    erpKw: 450,
    lat: 46.5,
    lon: 30.7,
    locationName: "Odesa Littoral Approach",
    modulation: "Agile Frequency Hopping (I-Band)",
    description: "Anti-ship targeting radar operating in atmospheric ducting mode to detect allied maritime vessels.",
    colorHex: "#f59e0b"
  },
  "MOBILE_SAM_ENGAGEMENT": {
    name: "92N6E Tomb Stone Fire Control Radar",
    classification: "ELINT_RADAR",
    carrierFreqGhz: 5.65,
    pulseRepetitionFreqHz: 4800,
    pulseWidthMicroSec: 0.8,
    erpKw: 800,
    lat: 51.5,
    lon: 31.2,
    locationName: "Northern Border Axis",
    modulation: "Track-While-Scan Interrupted CW",
    description: "Phased-array target tracking and missile engagement radar with narrow pencil beams.",
    colorHex: "#d946ef"
  },
  "DARK_VESSEL_AIS": {
    name: "Spoofed VHF Maritime AIS Transceiver",
    classification: "COMINT_UPLINK",
    carrierFreqGhz: 0.162,
    pulseRepetitionFreqHz: 15,
    pulseWidthMicroSec: 26600,
    erpKw: 0.025,
    lat: 38.2,
    lon: 24.5,
    locationName: "Aegean Chokepoint Transit",
    modulation: "GMSK Packet Burst (162 MHz)",
    description: "Non-compliant dark merchant vessel transponder transmitting falsified maritime MMSI coordinates.",
    colorHex: "#38bdf8"
  }
}

export default function SigintPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [targetClass, setTargetClass] = useState<EmitterTargetClass>("S400_ACQUISITION_RADAR")
  const [clusterBaselineKm, setClusterBaselineKm] = useState<number>(85) // Distance between collector sats
  const [timingJitterNs, setTimingJitterNs] = useState<number>(12) // TDOA receiver timing accuracy
  const [dopplerAccuracyHz, setDopplerAccuracyHz] = useState<number>(1.5) // FDOA measurement error
  const [snrMarginDb, setSnrMarginDb] = useState<number>(24.5)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = EMITTER_PRESETS[targetClass]

  // TDOA / FDOA Math & Geolocation Error Ellipse (CRLB)
  const calculations = useMemo(() => {
    const SPEED_OF_LIGHT = 299792458
    const orbitAltKm = 560
    const slantRangeM = Math.sqrt(Math.pow(orbitAltKm * 1000, 2) + Math.pow(250000, 2))

    // TDOA Range Variance: sigma_r = c * sigma_tau
    const sigmaTdoaM = (SPEED_OF_LIGHT * (timingJitterNs * 1e-9))

    // FDOA Velocity Error component
    const lambdaM = SPEED_OF_LIGHT / (spec.carrierFreqGhz * 1e9)
    const sigmaFdoaMs = dopplerAccuracyHz * lambdaM

    // Geometric Dilution of Precision (GDOP) based on cluster baseline
    const baselineRatio = (clusterBaselineKm * 1000) / slantRangeM
    const gdop = Math.max(1.8, Math.min(25.0, 1.2 / Math.pow(Math.max(0.01, baselineRatio), 1.15)))

    // Semi-Major and Semi-Minor Axes of 95% Confidence Ellipse (Meters)
    const semiMajorM = gdop * sigmaTdoaM * (30 / Math.max(10, snrMarginDb))
    const semiMinorM = semiMajorM * 0.45 * (1.0 + sigmaFdoaMs)

    // Circular Error Probable (CEP 50%)
    const cep50M = Number((0.589 * (semiMajorM + semiMinorM)).toFixed(1))
    const isTargetPinpointed = cep50M <= 150.0

    return {
      sigmaTdoaM,
      sigmaFdoaMs,
      gdop,
      semiMajorM,
      semiMinorM,
      cep50M,
      isTargetPinpointed
    }
  }, [spec.carrierFreqGhz, clusterBaselineKm, timingJitterNs, dopplerAccuracyHz, snrMarginDb])

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

  // 3D Three.js Planet, Satellite Triplet Formation & TDOA/FDOA Hyperbolas
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
    sun.position.set(25, 20, 15)
    scene.add(sun)

    // 1. Earth Body (Radius 5.6 units)
    const earthR = 5.6
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

    // 2. Terrestrial Emitter Location
    const emitterPhi = (90 - spec.lat) * (Math.PI / 180)
    const emitterTheta = (spec.lon + 180) * (Math.PI / 180)
    const emitterPos = new THREE.Vector3(
      -earthR * Math.sin(emitterPhi) * Math.cos(emitterTheta),
      earthR * Math.cos(emitterPhi),
      earthR * Math.sin(emitterPhi) * Math.sin(emitterTheta)
    )

    const eMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.colorHex), metalness: 0.9 })
    )
    eMesh.position.copy(emitterPos)
    eMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), emitterPos.clone().normalize())
    scene.add(eMesh)

    // Emitter Pulsing Beacon Rings
    const ringGeo = new THREE.RingGeometry(0.2, 0.35, 24)
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.colorHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.position.copy(emitterPos).addScaledVector(emitterPos.clone().normalize(), 0.05)
    ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), emitterPos.clone().normalize())
    scene.add(ringMesh)

    // 3. SIGINT Collector Satellite Triplet (Formation Flying Cluster)
    const satGroup = new THREE.Group()
    scene.add(satGroup)

    const baselineUnits = (clusterBaselineKm / 100) * 0.8
    const tripletOffsets = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(baselineUnits, baselineUnits * 0.6, -baselineUnits * 0.3),
      new THREE.Vector3(-baselineUnits * 0.8, baselineUnits * 0.8, baselineUnits * 0.5)
    ]

    const satMeshes: THREE.Mesh[] = []
    const beamLines: THREE.Line[] = []

    tripletOffsets.forEach(off => {
      const sGeo = new THREE.BoxGeometry(0.35, 0.35, 0.55)
      const sMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 })
      const sat = new THREE.Mesh(sGeo, sMat)
      sat.position.copy(off)
      satGroup.add(sat)
      satMeshes.push(sat)

      // Signal Intercept Lines (Emitter -> Satellite)
      const bGeo = new THREE.BufferGeometry().setFromPoints([emitterPos, new THREE.Vector3()])
      const bMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(spec.colorHex),
        transparent: true,
        opacity: 0.75
      })
      const line = new THREE.Line(bGeo, bMat)
      scene.add(line)
      beamLines.push(line)
    })

    // 4. Geolocation CEP Error Ellipse Projector on Earth Surface
    const cepGeo = new THREE.RingGeometry(0.35, 0.55, 32)
    const cepMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    })
    const cepMesh = new THREE.Mesh(cepGeo, cepMat)
    cepMesh.position.copy(emitterPos).addScaledVector(emitterPos.clone().normalize(), 0.06)
    cepMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), emitterPos.clone().normalize())
    scene.add(cepMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Rotate Satellite Cluster along Polar Orbit
      const orbR = earthR + 1.8
      const u = simStep * 0.008
      satGroup.position.set(
        orbR * Math.cos(u) * 0.8,
        orbR * Math.sin(u),
        orbR * Math.cos(u) * 0.6
      )
      satGroup.lookAt(0, 0, 0)

      // Update Intercept Lines
      satMeshes.forEach((sat, idx) => {
        const worldPos = new THREE.Vector3()
        sat.getWorldPosition(worldPos)

        const posArr = new Float32Array([
          emitterPos.x, emitterPos.y, emitterPos.z,
          worldPos.x, worldPos.y, worldPos.z
        ])
        beamLines[idx].geometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3))
        beamLines[idx].geometry.attributes.position.needsUpdate = true
      })

      // Pulsing Beacon & CEP Ellipse Sizing
      const t = simStep * 0.1
      const scaleVal = 1.0 + Math.sin(t) * 0.3
      ringMesh.scale.set(scaleVal, scaleVal, scaleVal)

      const cepVisualScale = Math.max(0.4, Math.min(2.5, calculations.cep50M / 150))
      cepMesh.scale.set(cepVisualScale, cepVisualScale * 0.5, 1)

      earth.rotation.y += 0.0006

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
  }, [spec, calculations, clusterBaselineKm, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: EMITTER TARGETS & CLUSTER CONFIGURATION */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Radio className="w-5 h-5 text-cyan-400" /> Space-Based SIGINT
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            TDOA / FDOA Differential Geolocation Suite
          </p>
        </div>

        <div className="space-y-6">
          {/* Emitter Target Selection */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Intercepted Emitter Target
            </label>
            <div className="space-y-2">
              {(["S400_ACQUISITION_RADAR", "COASTAL_SURFACE_SEARCH", "MOBILE_SAM_ENGAGEMENT", "DARK_VESSEL_AIS"] as EmitterTargetClass[]).map(key => {
                const item = EMITTER_PRESETS[key]
                return (
                  <button
                    key={key}
                    onClick={() => setTargetClass(key)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      targetClass === key 
                        ? "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.locationName} | {item.classification}
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.carrierFreqGhz} GHz</span>
                      <span className="text-slate-500">{item.erpKw} kW</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sensor Cluster & Geometry Parameters */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Formation Cluster Geometry</span>
              <span className="text-emerald-400 font-bold">GDOP = {calculations.gdop.toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">CLUSTER BASELINE DISTANCE:</span>
                <span className="text-cyan-400 font-bold">{clusterBaselineKm} km (INTER-SATELLITE)</span>
              </div>
              <input 
                type="range" min="20" max="250" step="5"
                value={clusterBaselineKm}
                onChange={e => setClusterBaselineKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">TDOA RECEIVER TIMING JITTER:</span>
                <span className="text-amber-400 font-bold">±{timingJitterNs} ns ({(calculations.sigmaTdoaM).toFixed(1)}m RANGE UNCERTAINTY)</span>
              </div>
              <input 
                type="range" min="2" max="50" step="1"
                value={timingJitterNs}
                onChange={e => setTimingJitterNs(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">FDOA DOPPLER ACCURACY:</span>
                <span className="text-white font-bold">±{dopplerAccuracyHz.toFixed(1)} Hz ({calculations.sigmaFdoaMs.toFixed(3)} m/s)</span>
              </div>
              <input 
                type="range" min="0.2" max="10.0" step="0.2"
                value={dopplerAccuracyHz}
                onChange={e => setDopplerAccuracyHz(Number(e.target.value))}
                className="w-full accent-white bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">PRE-DETECTION SNR:</span>
                <span className="text-emerald-400 font-bold">+{snrMarginDb.toFixed(1)} dB</span>
              </div>
              <input 
                type="range" min="8" max="40" step="1"
                value={snrMarginDb}
                onChange={e => setSnrMarginDb(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Multilateration Solver</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" /> GAUSS-NEWTON CONVERGED
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "HOLD PASS" : "RUN PASS TRACK"}
              </button>

              <button
                onClick={() => setSimStep(0)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Track"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS TACTICAL GLOBE & CEP HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Geolocation Error Ellipse [Cramer-Rao Lower Bound]
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${calculations.isTargetPinpointed ? "text-emerald-400" : "text-amber-400"}`}>
              {calculations.cep50M} METERS
            </span>
            <span className="text-slate-500 text-sm">
              50% CIRCULAR ERROR PROBABLE (CEP-50)
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">SEMI-MAJOR: {calculations.semiMajorM.toFixed(0)} m</span>
            <span className="text-amber-400">SEMI-MINOR: {calculations.semiMinorM.toFixed(0)} m</span>
            <span className="text-emerald-400">CARRIER: {spec.carrierFreqGhz} GHz</span>
            <span className="text-rose-400">TARGET: {spec.name}</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Signal className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">PULSE MODULATION TYPE</span>
              <span className="text-white font-bold text-sm">{spec.modulation}</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">PULSE REPETITION FREQ (PRF)</span>
            <span className="text-amber-400 font-bold text-sm">{spec.pulseRepetitionFreqHz.toLocaleString()} Hz</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">EFFECTIVE RADIATED POWER (ERP)</span>
            <span className="text-rose-400 font-bold text-sm">{spec.erpKw.toLocaleString()} kW</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">COLLECTOR FORMATION</span>
            <span className="text-emerald-400 font-bold text-sm">TRIPLET (3 SATELLITES)</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: INTERCEPT TELEMETRY & RF PARAMETER CASCADE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Intercept Analysis
        </h2>

        <div className="space-y-6">
          {/* Target Fix Quality Card */}
          <div className={`p-5 rounded-2xl border ${calculations.isTargetPinpointed ? "bg-emerald-950/20 border-emerald-500/40" : "bg-amber-950/20 border-amber-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              TARGET GEOLOCATION ACCURACY
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${calculations.isTargetPinpointed ? "text-emerald-400" : "text-amber-400"}`}>
              {calculations.isTargetPinpointed ? <ShieldCheck className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              {calculations.isTargetPinpointed ? "WEAPONS-QUALITY FIX" : "SEARCH SECTOR IDENTIFIED"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {calculations.isTargetPinpointed 
                ? `TDOA/FDOA multilateration across the ${clusterBaselineKm} km satellite baseline compresses the 50% Circular Error Probable to ${calculations.cep50M} meters. Accuracy exceeds the targeting threshold required for kinetic or electronic strike handoff.`
                : "Baseline geometry or timing jitter limits horizontal accuracy. Additional orbital passes or cross-sensor tasking required to contract the confidence ellipse."}
            </p>
          </div>

          {/* Signal Decomposition Matrix */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">RF Parametric Extraction</div>
            <div className="flex justify-between"><span className="text-slate-500">Center Frequency:</span><span className="text-white font-bold">{spec.carrierFreqGhz} GHz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pulse Width (PW):</span><span className="text-white">{spec.pulseWidthMicroSec} µs</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pulse Interval (PRI):</span><span className="text-cyan-400 font-bold">{((1 / spec.pulseRepetitionFreqHz) * 1e6).toFixed(1)} µs</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Range Error (c·στ):</span><span className="text-amber-400 font-bold">±{calculations.sigmaTdoaM.toFixed(1)} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Doppler Error (λ·σf):</span><span className="text-white">±{calculations.sigmaFdoaMs.toFixed(3)} m/s</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">GEOMETRIC DILUTION:</span><span className="text-emerald-400">{calculations.gdop.toFixed(2)} GDOP</span></div>
          </div>

          {/* Technical Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Cross-Ambiguity Surface (CAF)
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Correlating baseband signals across satellite pairs generates a 2D Cross-Ambiguity Function surface in time delay tau and Doppler offset f_d. The global maximum defines the exact emitter isochrone and isodop intersection.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
