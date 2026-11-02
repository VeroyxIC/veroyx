"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  ShieldAlert, ShieldCheck, Radio, Zap, Activity, 
  Crosshair, Lock, Unlock, WifiOff, Signal, Layers, Gauge, AlertTriangle 
} from "lucide-react"

type ThreatType = "UPLINK_JAMMING" | "GPS_PNT_SPOOFING" | "DOWNLINK_RADAR_JAM" | "WIDEBAND_BARRAGE"

interface ThreatSpec {
  name: string
  threatBand: string
  emitterPowerKw: number
  targetFrequencyGhz: number
  jammerAntennaGainDbi: number
  threatDescription: string
  colorHex: string
}

const THREAT_PRESETS: Record<ThreatType, ThreatSpec> = {
  "UPLINK_JAMMING": {
    name: "High-Power Ground Uplink Jammer",
    threatBand: "S-Band TT&C (2.05 GHz)",
    emitterPowerKw: 15.0,
    targetFrequencyGhz: 2.05,
    jammerAntennaGainDbi: 42.0,
    threatDescription: "High-power directional ground dish attempting command receiver saturation and carrier denial.",
    colorHex: "#ef4444"
  },
  "GPS_PNT_SPOOFING": {
    name: "L1/L2 PNT Denial & Spoofing",
    threatBand: "L-Band Navigation (1.575 GHz)",
    emitterPowerKw: 1.5,
    targetFrequencyGhz: 1.575,
    jammerAntennaGainDbi: 28.0,
    threatDescription: "Coordinated false ephemeris and clock phase injection to disrupt satellite orbital positioning.",
    colorHex: "#f59e0b"
  },
  "DOWNLINK_RADAR_JAM": {
    name: "Coherent Deception SAR Repeater",
    threatBand: "X-Band Radar (9.6 GHz)",
    emitterPowerKw: 8.0,
    targetFrequencyGhz: 9.6,
    jammerAntennaGainDbi: 38.0,
    threatDescription: "Digital Radio Frequency Memory (DRFM) repeater synthesizing false radar targets and noise stripes.",
    colorHex: "#d946ef"
  },
  "WIDEBAND_BARRAGE": {
    name: "Counter-Space Tactical Barrage",
    threatBand: "Ku/Ka Band (18.0 GHz)",
    emitterPowerKw: 25.0,
    targetFrequencyGhz: 18.0,
    jammerAntennaGainDbi: 45.0,
    threatDescription: "High-flux wideband noise swamping designed to break inter-satellite and ground gateway links.",
    colorHex: "#38bdf8"
  }
}

export default function ElectronicWarfarePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [threatType, setThreatType] = useState<ThreatType>("UPLINK_JAMMING")
  const [jammerDistanceKm, setJammerDistanceKm] = useState(650)
  const [crpaNullSteeringActive, setCrpaNullSteeringActive] = useState(true)
  const [crpaNullDepthDb, setCrpaNullDepthDb] = useState(38) // Adaptive null depth
  const [freqHoppingRateKhz, setFreqHoppingRateKhz] = useState(15) // 15,000 hops/sec
  const [satelliteTxPowerWatts, setSatelliteTxPowerWatts] = useState(25)

  const threat = THREAT_PRESETS[threatType]

  // Electronic Warfare Mathematics:
  // 1. Jammer ERP (Effective Radiated Power):
  const jammerPowerDbw = 10 * Math.log10(threat.emitterPowerKw * 1000)
  const jammerErpDbw = jammerPowerDbw + threat.jammerAntennaGainDbi

  // 2. Legitimate Signal ERP:
  const satPowerDbw = 10 * Math.log10(satelliteTxPowerWatts)
  const satAntennaGainDbi = 18.0 // S-Band / X-Band patch array
  const signalErpDbw = satPowerDbw + satAntennaGainDbi

  // 3. Free-Space Path Loss Ratio between Jammer & Legitimate Emitter:
  // Legitimate ground station at 850 km
  const legitStationDistKm = 850
  const distanceRatioDb = 20 * Math.log10(legitStationDistKm / jammerDistanceKm)

  // 4. Raw Jammer-to-Signal (J/S) Ratio at Satellite Aperture:
  const rawJsRatioDb = jammerErpDbw - signalErpDbw + distanceRatioDb

  // 5. Electronic Protection (EP) Attenuation:
  // CRPA Adaptive Nulling + Direct Sequence / Frequency Hopping Processing Gain (Gp)
  const crpaAttenuationDb = crpaNullSteeringActive ? crpaNullDepthDb : 0
  const processingGainDb = 10 * Math.log10((freqHoppingRateKhz * 1000 * 20) / (250 * 1000))
  const netJsRatioDb = rawJsRatioDb - crpaAttenuationDb - processingGainDb

  // Operational Verdict
  const isLinkSurvivable = netJsRatioDb <= 0
  const isSeverelyDegraded = netJsRatioDb > 0 && netJsRatioDb < 10
  const isDenied = netJsRatioDb >= 10

  // 3D Three.js Contested Battlespace Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 10, 22)
    camera.lookAt(0, 1, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.5)
    sun.position.set(15, 20, 15)
    scene.add(sun)

    // 1. Earth Curved Horizon
    const earthRadius = 40
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.12)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.9,
      wireframe: true
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earth.position.set(0, -earthRadius, 0)
    scene.add(earth)

    // 2. Satellite (Target Platform)
    const satGroup = new THREE.Group()
    satGroup.position.set(0, 6, 0)
    scene.add(satGroup)

    const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.6)
    const busMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
    const bus = new THREE.Mesh(busGeo, busMat)
    satGroup.add(bus)

    // CRPA Phased Array Antenna (4-Element Patch Array)
    const crpaBaseGeo = new THREE.BoxGeometry(1.0, 0.08, 1.0)
    const crpaBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
    const crpaBase = new THREE.Mesh(crpaBaseGeo, crpaBaseMat)
    crpaBase.position.set(0, -0.65, 0)
    satGroup.add(crpaBase)

    // 3. Ground Threat Jammer Emitter
    const jammerMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 })
    )
    jammerMesh.position.set(6, 0.2, 2)
    scene.add(jammerMesh)

    // Directed RF Jamming Cone
    const jammerDir = new THREE.Vector3().subVectors(satGroup.position, jammerMesh.position).normalize()
    const dist = satGroup.position.distanceTo(jammerMesh.position)

    const coneGeo = new THREE.ConeGeometry(2.4, dist, 24, 1, true)
    const coneMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(threat.colorHex),
      wireframe: true,
      transparent: true,
      opacity: isDenied ? 0.45 : isSeverelyDegraded ? 0.25 : 0.08
    })
    const jamCone = new THREE.Mesh(coneGeo, coneMat)
    jamCone.position.copy(jammerMesh.position).addScaledVector(jammerDir, dist / 2)
    jamCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), jammerDir)
    scene.add(jamCone)

    // 4. CRPA Spatial Null Beam (Visualized as protective counter-cone)
    const nullConeGeo = new THREE.ConeGeometry(1.8, 6, 16, 1, true)
    const nullConeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: crpaNullSteeringActive ? 0.35 : 0.0
    })
    const nullCone = new THREE.Mesh(nullConeGeo, nullConeMat)
    nullCone.position.set(0, 3, 0)
    nullCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), jammerDir)
    satGroup.add(nullCone)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = Date.now() * 0.003
      
      // Microwave interference pulsation
      coneMat.opacity = (isDenied ? 0.4 : 0.15) + Math.sin(t * 8) * 0.08

      // Slow orbital track
      satGroup.rotation.y = Math.sin(t * 0.3) * 0.05

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
  }, [threat, isDenied, isSeverelyDegraded, crpaNullSteeringActive])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: EW THREAT PARAMETERS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Radio className="w-5 h-5 text-rose-500" /> Electronic Warfare (EW)
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            RF Contested Domain &amp; CRPA Null Steering
          </p>
        </div>

        <div className="space-y-6">
          {/* Threat Class Selection */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Directed Threat Profile
            </label>
            <div className="space-y-2">
              {(["UPLINK_JAMMING", "GPS_PNT_SPOOFING", "DOWNLINK_RADAR_JAM", "WIDEBAND_BARRAGE"] as ThreatType[]).map(t => {
                const item = THREAT_PRESETS[t]
                return (
                  <button
                    key={t}
                    onClick={() => setThreatType(t)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      threatType === t 
                        ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.threatBand}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-rose-400 font-bold block">{item.emitterPowerKw} kW</span>
                      <span className="text-slate-500">+{item.jammerAntennaGainDbi} dBi</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Jammer Slant Range & Emitter Tuning */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Threat Geometry &amp; Standoff Range
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">JAMMER STANDOFF RANGE:</span>
                <span className="text-rose-400 font-bold">{jammerDistanceKm} km</span>
              </div>
              <input 
                type="range" min="150" max="2500" step="25"
                value={jammerDistanceKm}
                onChange={e => setJammerDistanceKm(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">SATELLITE TX TRANSMIT POWER:</span>
                <span className="text-cyan-400 font-bold">{satelliteTxPowerWatts} W</span>
              </div>
              <input 
                type="range" min="5" max="250" step="5"
                value={satelliteTxPowerWatts}
                onChange={e => setSatelliteTxPowerWatts(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Electronic Protection (EP) Controls */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Electronic Protection (EP)</span>
              <span className="text-emerald-400 font-bold">{crpaNullSteeringActive ? "ACTIVE DEFENSE" : "UNPROTECTED"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">CRPA ADAPTIVE NULL STEERING:</span>
              <button
                onClick={() => setCrpaNullSteeringActive(!crpaNullSteeringActive)}
                className={`px-3 py-1 rounded border text-[10px] font-bold ${
                  crpaNullSteeringActive 
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300" 
                    : "bg-rose-950 border-rose-500 text-rose-300"
                }`}
              >
                {crpaNullSteeringActive ? "ENABLED (-38 dB)" : "DISABLED"}
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">FREQUENCY HOPPING RATE:</span>
                <span className="text-emerald-400 font-bold">{freqHoppingRateKhz.toLocaleString()} hops/s</span>
              </div>
              <input 
                type="range" min="1" max="50" step="1"
                value={freqHoppingRateKhz}
                onChange={e => setFreqHoppingRateKhz(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Standard (1k)</span>
                <span>Fast Hopping (15k)</span>
                <span>Ultra-Agile (50k)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D CONTESTED BATTLESPACE HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Contested RF Link Integrity</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isLinkSurvivable ? "text-emerald-400" : isSeverelyDegraded ? "text-amber-400" : "text-rose-400"}`}>
              {netJsRatioDb > 0 ? `+${netJsRatioDb.toFixed(1)}` : netJsRatioDb.toFixed(1)} dB
            </span>
            <span className="text-slate-500 text-sm">NET J/S RATIO</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-rose-400">RAW J/S: +{rawJsRatioDb.toFixed(1)} dB</span>
            <span className="text-emerald-400">CRPA NULL: -{crpaAttenuationDb} dB</span>
            <span className="text-cyan-400">HOPPING GAIN: +{processingGainDb.toFixed(1)} dB</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical EP Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-rose-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">JAMMER EMITTED ERP</span>
              <span className="text-rose-400 font-bold text-sm">+{jammerErpDbw.toFixed(1)} dBW</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">LEGITIMATE SIGNAL ERP</span>
            <span className="text-cyan-400 font-bold text-sm">+{signalErpDbw.toFixed(1)} dBW</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SPATIAL ISOLATION</span>
            <span className="text-emerald-400 font-bold text-sm">CRPA 4-NULL ADAPTIVE</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">COMMUNICATION TIER</span>
            <span className={`text-sm font-bold ${isLinkSurvivable ? "text-emerald-400" : isSeverelyDegraded ? "text-amber-400 animate-pulse" : "text-rose-400 animate-pulse"}`}>
              {isLinkSurvivable ? "OPERATIONAL (LINK PROTECTED)" : isSeverelyDegraded ? "MARGINAL THROUGHPUT" : "COMMUNICATION DENIED"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: LINK BUDGET & COUNTERMEASURES */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Anti-Jam Analysis
        </h2>

        <div className="space-y-6">
          {/* Survivability Card */}
          <div className={`p-5 rounded-2xl border ${isLinkSurvivable ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              ANTI-JAM SURVIVABILITY STATUS
            </div>
            <div className={`text-2xl font-black flex items-center gap-2 ${isLinkSurvivable ? "text-emerald-400" : "text-rose-400"}`}>
              {isLinkSurvivable ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              {isLinkSurvivable ? "LINK SECURED" : "LINK SEVERED"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isLinkSurvivable 
                ? "Adaptive CRPA spatial nulling suppresses the jammer direction by 38 dB, maintaining carrier lock and command execution without telemetry drop." 
                : "JAMMER DOMINANCE: Jammer power exceeds receiver dynamic range. Enable CRPA null steering or increase frequency agility to restore TT&C command authority."}
            </p>
          </div>

          {/* EW Threat Profile Metrics */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Electronic Threat Summary</div>
            <div className="flex justify-between"><span className="text-slate-500">Threat Preset:</span><span className="text-white font-bold">{threat.name.split(" ")[0]}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Carrier Target:</span><span className="text-amber-400">{threat.targetFrequencyGhz} GHz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Jammer RF Power:</span><span className="text-rose-400 font-bold">{threat.emitterPowerKw} kW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Jammer Gain (G_j):</span><span className="text-white">+{threat.jammerAntennaGainDbi} dBi</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Raw J/S at Aperture:</span><span className="text-rose-400 font-bold">+{rawJsRatioDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">CRPA Suppression:</span><span className="text-emerald-400 font-bold">-{crpaAttenuationDb} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Spread Spectrum Gain:</span><span className="text-cyan-400 font-bold">+{processingGainDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">NET RESIDUAL J/S:</span><span className={isLinkSurvivable ? "text-emerald-400" : "text-rose-400"}>{netJsRatioDb > 0 ? `+${netJsRatioDb.toFixed(1)}` : netJsRatioDb.toFixed(1)} dB</span></div>
          </div>

          {/* Electronic Protection Technical Architecture */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Counter-Countermeasure Architecture
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Spatial beamforming creates deep destructive interference pattern notches directly along the threat line-of-sight vector, suppressing coherent repeater deception without requiring satellite reorientation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
