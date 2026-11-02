"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Lock, Key, ShieldCheck, ShieldAlert, Zap, Activity, 
  Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Radio, Network, Cpu, CheckCircle2, ArrowRight, EyeOff, Sparkles 
} from "lucide-react"

type QkdMissionPreset = "MICIUS_LEO_RELAY" | "EAGLE1_EUROPE" | "QEYSSAT_POLAR" | "CISLUNAR_GATEWAY"

interface QkdSpec {
  name: string
  orbitAltitudeKm: number
  groundBaselineKm: number
  protocol: "BBM92_ENTANGLEMENT" | "DECOY_STATE_BB84"
  sourceRateMhz: number
  satTxApertureMm: number
  groundRxApertureM: number
  wavelengthNm: number
  darkCountRateHz: number
  opticalMisalignmentPct: number
  station1Name: string
  station2Name: string
  description: string
  colorHex: string
}

const PRESETS: Record<QkdMissionPreset, QkdSpec> = {
  "MICIUS_LEO_RELAY": {
    name: "Micius (QUESS) Quantum Satellite",
    orbitAltitudeKm: 500,
    groundBaselineKm: 1203,
    protocol: "BBM92_ENTANGLEMENT",
    sourceRateMhz: 50.0,
    satTxApertureMm: 300,
    groundRxApertureM: 1.2,
    wavelengthNm: 810,
    darkCountRateHz: 25,
    opticalMisalignmentPct: 1.2,
    station1Name: "Delingha Observatory (Qinghai)",
    station2Name: "Nanshan Station (Xinjiang)",
    description: "Space-to-ground dual downlink generating polarization-entangled photon pairs across 1,200 km baselines.",
    colorHex: "#38bdf8"
  },
  "EAGLE1_EUROPE": {
    name: "ESA EAGLE-1 Sovereign QKD",
    orbitAltitudeKm: 600,
    groundBaselineKm: 850,
    protocol: "DECOY_STATE_BB84",
    sourceRateMhz: 100.0,
    satTxApertureMm: 250,
    groundRxApertureM: 1.0,
    wavelengthNm: 850,
    darkCountRateHz: 40,
    opticalMisalignmentPct: 1.5,
    station1Name: "Graz Lustbühel (Austria)",
    station2Name: "Tenerife Teide OGS (Spain)",
    description: "European sovereign quantum cryptographic backbone testing end-to-end PQC hybrid key distribution.",
    colorHex: "#10b981"
  },
  "QEYSSAT_POLAR": {
    name: "QEYSSat High-Latitude Polar Relay",
    orbitAltitudeKm: 650,
    groundBaselineKm: 1450,
    protocol: "BBM92_ENTANGLEMENT",
    sourceRateMhz: 40.0,
    satTxApertureMm: 350,
    groundRxApertureM: 1.5,
    wavelengthNm: 785,
    darkCountRateHz: 15,
    opticalMisalignmentPct: 0.9,
    station1Name: "Churchill Research Base (Canada)",
    station2Name: "Svalbard Arctic Station (Norway)",
    description: "High-inclination microsatellite demonstrating Arctic entanglement distribution immune to solar storms.",
    colorHex: "#d946ef"
  },
  "CISLUNAR_GATEWAY": {
    name: "Deep-Space Cislunar Quantum Relay",
    orbitAltitudeKm: 384400,
    groundBaselineKm: 4500,
    protocol: "BBM92_ENTANGLEMENT",
    sourceRateMhz: 200.0,
    satTxApertureMm: 1200,
    groundRxApertureM: 4.0,
    wavelengthNm: 1550,
    darkCountRateHz: 5,
    opticalMisalignmentPct: 0.6,
    station1Name: "Haleakala AEOS (Hawaii)",
    station2Name: "Paranal UT4 (Chile)",
    description: "Ultra-long baseline interplanetary quantum link probing fundamental spacetime-induced decoherence.",
    colorHex: "#f59e0b"
  }
}

export default function QkdPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [presetKey, setPresetKey] = useState<QkdMissionPreset>("MICIUS_LEO_RELAY")
  const [eveInterceptActive, setEveInterceptActive] = useState<boolean>(false)
  const [pointingJitterUrad, setPointingJitterUrad] = useState<number>(1.2)
  const [atmosphereSeeingArcsec, setAtmosphereSeeingArcsec] = useState<number>(1.4)
  const [pqcHybridEnabled, setPqcHybridEnabled] = useState<boolean>(true)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = PRESETS[presetKey]

  // Quantum Optics & Link Budget Calculations
  const metrics = useMemo(() => {
    const SPEED_OF_LIGHT = 299792458
    const lambdaM = spec.wavelengthNm * 1e-9
    const slantRangeKm = Math.sqrt(Math.pow(spec.orbitAltitudeKm, 2) + Math.pow(spec.groundBaselineKm / 2, 2))
    const slantRangeM = slantRangeKm * 1000

    // Beam waist at ground from diffraction and pointing jitter
    const txRadiusM = (spec.satTxApertureMm / 1000) / 2
    const diffDivergenceRad = (1.22 * lambdaM) / (2 * txRadiusM)
    const jitterRad = pointingJitterUrad * 1e-6
    const totalDivergenceRad = Math.sqrt(diffDivergenceRad * diffDivergenceRad + jitterRad * jitterRad)
    const groundSpotDiameterM = 2 * totalDivergenceRad * slantRangeM

    // Geometric Collection Efficiency (eta_diff)
    const rxAreaM2 = Math.PI * Math.pow(spec.groundRxApertureM / 2, 2)
    const spotAreaM2 = Math.PI * Math.pow(Math.max(1.0, groundSpotDiameterM) / 2, 2)
    const geometricCoupling = Math.min(1.0, rxAreaM2 / spotAreaM2)

    // Atmospheric Attenuation (zenith + slant airmass scaling)
    const airmass = Math.max(1.0, slantRangeKm / spec.orbitAltitudeKm)
    const zenithTransDb = -2.5 * (1.0 + (atmosphereSeeingArcsec - 1.0) * 0.3)
    const slantTransDb = zenithTransDb * airmass
    const atmTransLinear = Math.pow(10, slantTransDb / 10)

    // Detector & Optical Transmission
    const opticalTrainEfficiency = 0.45
    const detectorQuantumEfficiency = 0.55
    const totalChannelTrans = geometricCoupling * atmTransLinear * opticalTrainEfficiency * detectorQuantumEfficiency

    // Photon detection event rates
    const rawCoincidenceRateHz = spec.sourceRateMhz * 1e6 * (totalChannelTrans * totalChannelTrans)

    // Quantum Bit Error Rate (QBER)
    const baseOptError = spec.opticalMisalignmentPct / 100
    const darkCountError = (spec.darkCountRateHz * 2) / Math.max(1.0, rawCoincidenceRateHz + spec.darkCountRateHz)
    let totalQber = baseOptError + darkCountError

    // If Eve (Eavesdropper) is executing an intercept-resend attack
    if (eveInterceptActive) {
      totalQber += 0.25 // Induces 25% fundamental error rate on non-orthogonal bases
    }

    const qberPct = Math.min(50.0, totalQber * 100)

    // Bell-CHSH Parameter |S|: S = 2 * sqrt(2) * (1 - 2*Q)
    const bellParameterS = Math.max(0, 2 * Math.SQRT2 * (1 - 2 * totalQber))
    const isBellInequalityViolated = bellParameterS > 2.0 // Quantum signature confirmed

    // Binary Shannon Entropy for Secret Key Rate: h2(x)
    const h2 = (x: number) => {
      if (x <= 0.0001 || x >= 0.9999) return 0
      return -x * Math.log2(x) - (1 - x) * Math.log2(1 - x)
    }

    // Asymptotic Secret Key Rate (Shor-Preskill / GLLP security threshold Q < 11%)
    const isSecureThreshold = totalQber < 0.11
    const secretFraction = isSecureThreshold ? Math.max(0, 1 - 2 * h2(totalQber)) : 0
    const secretKeyRateBps = Math.round(rawCoincidenceRateHz * secretFraction)
    const secretKeyRateKbps = Number((secretKeyRateBps / 1000).toFixed(2))

    return {
      slantRangeKm: Math.round(slantRangeKm),
      groundSpotDiameterM: Math.round(groundSpotDiameterM),
      geometricCouplingDb: (10 * Math.log10(geometricCoupling)).toFixed(1),
      slantTransDb: slantTransDb.toFixed(1),
      rawCoincidenceRateHz: Math.round(rawCoincidenceRateHz),
      qberPct: Number(qberPct.toFixed(2)),
      bellParameterS: Number(bellParameterS.toFixed(3)),
      isBellInequalityViolated,
      isSecureThreshold,
      secretKeyRateKbps,
      secretKeyRateBps
    }
  }, [spec, eveInterceptActive, pointingJitterUrad, atmosphereSeeingArcsec])

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

  // 3D Three.js Entanglement Distribution & Twin Optical Downlinks
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

    // 2. Dual Optical Ground Stations on Earth Surface
    const baselineAngle = Math.min(0.7, (spec.groundBaselineKm / 6371))
    const stationPos1 = new THREE.Vector3(
      earthR * Math.sin(-baselineAngle / 2),
      earthR * Math.cos(-baselineAngle / 2) * 0.95,
      earthR * Math.sin(baselineAngle / 3)
    )
    const stationPos2 = new THREE.Vector3(
      earthR * Math.sin(baselineAngle / 2),
      earthR * Math.cos(baselineAngle / 2) * 0.95,
      earthR * Math.sin(baselineAngle / 3)
    )

    // Ground Station Domes
    const domeGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8 })
    
    const dome1 = new THREE.Mesh(domeGeo, domeMat)
    dome1.position.copy(stationPos1)
    dome1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stationPos1.clone().normalize())
    scene.add(dome1)

    const dome2 = new THREE.Mesh(domeGeo, domeMat)
    dome2.position.copy(stationPos2)
    dome2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stationPos2.clone().normalize())
    scene.add(dome2)

    // 3. QKD Satellite in LEO / Orbit
    const satGroup = new THREE.Group()
    const satAltitudeUnits = earthR + 3.2
    satGroup.position.set(0, satAltitudeUnits, 0.4)
    scene.add(satGroup)

    const satGeo = new THREE.BoxGeometry(0.8, 0.8, 1.4)
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.9,
      roughness: 0.2
    })
    const satMesh = new THREE.Mesh(satGeo, satMat)
    satGroup.add(satMesh)

    // Solar Wings
    const wingGeo = new THREE.BoxGeometry(2.2, 0.04, 0.7)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(1.5, 0, 0)
    satGroup.add(wingL)
    const wingR = wingL.clone()
    wingR.position.set(-1.5, 0, 0)
    satGroup.add(wingR)

    // SPDC Entangled Source Crystal Emitter Core
    const crystalGeo = new THREE.OctahedronGeometry(0.25, 0)
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true })
    const crystal = new THREE.Mesh(crystalGeo, crystalMat)
    crystal.position.set(0, -0.45, 0)
    satGroup.add(crystal)

    // 4. Twin Optical Downlink Quantum Channels (Laser Beams)
    const beamColor = eveInterceptActive ? 0xef4444 : metrics.isSecureThreshold ? 0x00f0ff : 0xf59e0b

    const beamGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), stationPos1])
    const beamMat1 = new THREE.LineBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0.85
    })
    const beamLine1 = new THREE.Line(beamGeo1, beamMat1)
    scene.add(beamLine1)

    const beamGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), stationPos2])
    const beamMat2 = new THREE.LineBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0.85
    })
    const beamLine2 = new THREE.Line(beamGeo2, beamMat2)
    scene.add(beamLine2)

    // 5. Entangled Photon Packet Wavefronts
    const photonGeo = new THREE.SphereGeometry(0.12, 12, 12)
    const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const photonA = new THREE.Mesh(photonGeo, photonMat)
    const photonB = new THREE.Mesh(photonGeo, photonMat)
    scene.add(photonA)
    scene.add(photonB)

    // 6. Eavesdropper (Eve) Intercept Probe (Visible when active)
    const eveGroup = new THREE.Group()
    eveGroup.visible = eveInterceptActive
    scene.add(eveGroup)

    const eveMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, wireframe: true })
    )
    eveMesh.rotation.z = Math.PI / 4
    eveGroup.add(eveMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = simStep * 0.02
      satGroup.position.x = Math.sin(t * 0.5) * 1.5

      const satWorldPos = new THREE.Vector3()
      satGroup.getWorldPosition(satWorldPos)

      // Update Laser Downlink Vectors
      const pos1 = new Float32Array([
        satWorldPos.x, satWorldPos.y - 0.4, satWorldPos.z,
        stationPos1.x, stationPos1.y, stationPos1.z
      ])
      beamGeo1.setAttribute("position", new THREE.BufferAttribute(pos1, 3))
      beamGeo1.attributes.position.needsUpdate = true

      const pos2 = new Float32Array([
        satWorldPos.x, satWorldPos.y - 0.4, satWorldPos.z,
        stationPos2.x, stationPos2.y, stationPos2.z
      ])
      beamGeo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3))
      beamGeo2.attributes.position.needsUpdate = true

      // Move entangled photons down the beam in lock-step
      const photonProgress = (simStep * 0.04) % 1.0
      photonA.position.lerpVectors(satWorldPos, stationPos1, photonProgress)
      photonB.position.lerpVectors(satWorldPos, stationPos2, photonProgress)

      // Position Eve intercepting Beam 1
      if (eveInterceptActive) {
        eveGroup.visible = true
        eveGroup.position.lerpVectors(satWorldPos, stationPos1, 0.45)
      } else {
        eveGroup.visible = false
      }

      crystal.rotation.y += 0.03
      crystal.rotation.x += 0.02
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
  }, [spec, eveInterceptActive, metrics, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: MISSIONS & QUANTUM LINK CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Key className="w-5 h-5 text-cyan-400" /> Quantum Key Relays
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Satellite Entanglement &amp; PQC Hybrid Cryptography
          </p>
        </div>

        <div className="space-y-6">
          {/* Mission Presets */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Sovereign QKD Architecture
            </label>
            <div className="space-y-2">
              {(["MICIUS_LEO_RELAY", "EAGLE1_EUROPE", "QEYSSAT_POLAR", "CISLUNAR_GATEWAY"] as QkdMissionPreset[]).map(key => {
                const item = PRESETS[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setPresetKey(key)
                      setEveInterceptActive(false)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      presetKey === key 
                        ? "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.protocol.replace("_", " ")} | Baseline: {item.groundBaselineKm} km
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.sourceRateMhz} MHz</span>
                      <span className="text-slate-500">{item.wavelengthNm} nm</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Optical Ground Stations */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 space-y-2 text-[10px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Entangled Ground Stations</span>
              <span className="text-emerald-400 font-bold">{spec.groundBaselineKm} km BASELINE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-slate-300 font-bold">Node Alice:</span>
              <span className="text-slate-400">{spec.station1Name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-bold">Node Bob:</span>
              <span className="text-slate-400">{spec.station2Name}</span>
            </div>
          </div>

          {/* Optical Link & Atmospheric Disturbances */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Optomechanical &amp; Atmospheric Link</span>
              <span className="text-emerald-400 font-bold">{metrics.slantTransDb} dB ATM</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">POINTING JITTER (RMS):</span>
                <span className="text-cyan-400 font-bold">±{pointingJitterUrad.toFixed(1)} µrad</span>
              </div>
              <input 
                type="range" min="0.2" max="6.0" step="0.2"
                value={pointingJitterUrad}
                onChange={e => setPointingJitterUrad(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">ATMOSPHERIC TURBULENCE (SEEING):</span>
                <span className="text-amber-400 font-bold">{atmosphereSeeingArcsec.toFixed(1)} arcsec</span>
              </div>
              <input 
                type="range" min="0.5" max="4.0" step="0.1"
                value={atmosphereSeeingArcsec}
                onChange={e => setAtmosphereSeeingArcsec(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60 text-[10px]">
              <span className="text-slate-400">DIFFRACTION SPOT DIAMETER:</span>
              <span className="text-white font-bold">{metrics.groundSpotDiameterM} meters</span>
            </div>
          </div>

          {/* Security & Adversary Attack Injection */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Quantum Eavesdropper (Eve)</span>
              <button
                onClick={() => setEveInterceptActive(!eveInterceptActive)}
                className={`px-2.5 py-1 rounded border text-[10px] font-bold transition-all ${
                  eveInterceptActive 
                    ? "bg-rose-950 border-rose-500 text-rose-300 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]" 
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {eveInterceptActive ? "EVE INTERCEPT ACTIVE" : "EVE DORMANT"}
              </button>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">PQC HYBRID ENCAPSULATION:</span>
              <button
                onClick={() => setPqcHybridEnabled(!pqcHybridEnabled)}
                className={`px-2.5 py-1 rounded border text-[10px] font-bold ${
                  pqcHybridEnabled ? "bg-emerald-950 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {pqcHybridEnabled ? "ML-KEM-1024 + OTP" : "RAW QKD ONLY"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS ENTANGLEMENT HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Bell State Inequality &amp; Entanglement Verification
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${metrics.isBellInequalityViolated ? "text-emerald-400" : "text-rose-500"}`}>
              |S| = {metrics.bellParameterS}
            </span>
            <span className="text-slate-500 text-sm">
              CHSH BELL PARAMETER ({metrics.isBellInequalityViolated ? "> 2.0 QUANTUM ENTANGLED" : "<= 2.0 CLASSICAL / COMPROMISED"})
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className={metrics.isSecureThreshold ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              QBER: {metrics.qberPct}% {metrics.isSecureThreshold ? "(SECURE < 11%)" : "(EXCEEDS ABORT THRESHOLD)"}
            </span>
            <span className="text-cyan-400">SECRET KEY: {metrics.secretKeyRateKbps} kbps</span>
            <span className="text-amber-400">PAIR RATE: {metrics.rawCoincidenceRateHz.toLocaleString()} Hz</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">ENCRYPTION REGIME</span>
              <span className="text-white font-bold text-sm">
                {pqcHybridEnabled ? "NIST ML-KEM-1024 + QKD ONE-TIME PAD" : "UNENCRYPTED QUANTUM STREAM"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SECURITY STATUS</span>
            <span className={`text-sm font-bold ${metrics.isSecureThreshold ? "text-emerald-400" : "text-rose-400 font-black animate-pulse"}`}>
              {metrics.isSecureThreshold ? "INFORMATION-THEORETIC SECURE" : "KEY EXCHANGE ABORTED"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">BELL PARAMETER INTEGRITY</span>
            <span className="text-cyan-400 font-bold text-sm">{((metrics.bellParameterS / (2 * Math.SQRT2)) * 100).toFixed(1)}% OF TSIRELSON LIMIT</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">PAIR DETECTIONS</span>
            <span className="text-amber-400 font-bold text-sm">{metrics.rawCoincidenceRateHz} COINCIDENCES/S</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: TELEMETRY & QUANTUM SECURITY PROOFS */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Quantum Telemetry
        </h2>

        <div className="space-y-6">
          {/* Security Verification Card */}
          <div className={`p-5 rounded-2xl border ${metrics.isSecureThreshold ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              PHYSICAL LAYER SECURITY PROOF
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${metrics.isSecureThreshold ? "text-emerald-400" : "text-rose-400"}`}>
              {metrics.isSecureThreshold ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              {metrics.isSecureThreshold ? "QUANTUM SECURE" : "EAVESDROPPING DETECTED"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {metrics.isSecureThreshold 
                ? `Bell parameter S = ${metrics.bellParameterS} validates non-local entanglement between Alice and Bob. Information leakage to any potential eavesdropper is bounded to strictly zero by quantum mechanics.`
                : "Quantum Bit Error Rate exceeds the 11.0% Shor-Preskill threshold. Measurement collapse indicates active wiretapping or decoherence on the optical downlink. Key stream generation halted."}
            </p>
          </div>

          {/* Link Budget Metrics */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Dual Downlink Budget</div>
            <div className="flex justify-between"><span className="text-slate-500">Slant Range:</span><span className="text-white font-bold">{metrics.slantRangeKm} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Diffraction Footprint:</span><span className="text-white font-bold">{metrics.groundSpotDiameterM} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Geometric Loss:</span><span className="text-rose-400 font-bold">{metrics.geometricCouplingDb} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Atmospheric Fade:</span><span className="text-amber-400 font-bold">{metrics.slantTransDb} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Quantum Bit Error (QBER):</span><span className={metrics.isSecureThreshold ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{metrics.qberPct}%</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">SECRET KEY RATE:</span><span className="text-cyan-400">{metrics.secretKeyRateKbps} kbps</span></div>
          </div>

          {/* BBM92 Protocol Engineering Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              BBM92 Entanglement Sifting
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Polarization-entangled photon pairs are produced via spontaneous parametric down-conversion (SPDC). Alice and Bob measure independently across randomly chosen rectilinear and diagonal bases. Measurement sifting and error correction (CASCADE/LDPC) synthesize uncompromised cryptographic keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
