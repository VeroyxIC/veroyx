"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Zap, Activity, Radio, Eye, Crosshair, 
  ShieldCheck, ShieldAlert, Layers, Gauge, Play, Square, RotateCcw, Target 
} from "lucide-react"

type LasercomPreset = "SDA_SPACE_BACN" | "COMMERCIAL_OISL" | "DEEP_SPACE_DSOC" | "TACTICAL_AIR_SPACE"

interface TerminalSpec {
  name: string
  wavelengthNm: number
  apertureDiameterMm: number
  edfaTxPowerWatts: number
  dataRateGbps: number
  maxRangeKm: number
  reqPhotonsPerBit: number
  colorHex: string
}

const PRESETS: Record<LasercomPreset, TerminalSpec> = {
  "SDA_SPACE_BACN": {
    name: "SDA Space-BACN Standard Terminal",
    wavelengthNm: 1550,
    apertureDiameterMm: 80,
    edfaTxPowerWatts: 2.5,
    dataRateGbps: 2.5,
    maxRangeKm: 4200,
    reqPhotonsPerBit: 45,
    colorHex: "#38bdf8"
  },
  "COMMERCIAL_OISL": {
    name: "Commercial Constellation High-Throughput",
    wavelengthNm: 1550,
    apertureDiameterMm: 100,
    edfaTxPowerWatts: 5.0,
    dataRateGbps: 10.0,
    maxRangeKm: 5500,
    reqPhotonsPerBit: 75,
    colorHex: "#10b981"
  },
  "DEEP_SPACE_DSOC": {
    name: "Deep Space Optical Communications (DSOC)",
    wavelengthNm: 1550,
    apertureDiameterMm: 220,
    edfaTxPowerWatts: 15.0,
    dataRateGbps: 0.25,
    maxRangeKm: 45000,
    reqPhotonsPerBit: 25,
    colorHex: "#f59e0b"
  },
  "TACTICAL_AIR_SPACE": {
    name: "Tactical Air-to-Space Agile Terminal",
    wavelengthNm: 1550,
    apertureDiameterMm: 65,
    edfaTxPowerWatts: 3.0,
    dataRateGbps: 1.25,
    maxRangeKm: 1800,
    reqPhotonsPerBit: 85,
    colorHex: "#d946ef"
  }
}

export default function LasercomPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [preset, setPreset] = useState<LasercomPreset>("SDA_SPACE_BACN")
  const [crosslinkDistanceKm, setCrosslinkDistanceKm] = useState(3200)
  const [rmsJitterUrad, setRmsJitterUrad] = useState(1.2)
  const [fsmTrackingActive, setFsmTrackingActive] = useState(true)

  const spec = PRESETS[preset]

  // Physical Constants
  const PLANCK_H = 6.62607015e-34
  const SPEED_OF_LIGHT = 299792458
  const WAVELENGTH_M = spec.wavelengthNm * 1e-9
  const APERTURE_M = spec.apertureDiameterMm * 1e-3
  const PHOTON_ENERGY_J = (PLANCK_H * SPEED_OF_LIGHT) / WAVELENGTH_M

  // Optical Beam Calculations
  const beamDivergenceRad = 1.27 * (WAVELENGTH_M / APERTURE_M)
  const beamDivergenceUrad = beamDivergenceRad * 1e6
  const beamFootprintDiameterM = crosslinkDistanceKm * 1000 * beamDivergenceRad

  const gainTxLinear = Math.pow((Math.PI * APERTURE_M) / WAVELENGTH_M, 2)
  const gainTxDbi = 10 * Math.log10(gainTxLinear)

  const distanceM = crosslinkDistanceKm * 1000
  const fsplDb = 20 * Math.log10(WAVELENGTH_M / (4 * Math.PI * distanceM))

  const effectiveJitterUrad = fsmTrackingActive ? rmsJitterUrad * 0.18 : rmsJitterUrad
  const effectiveJitterRad = effectiveJitterUrad * 1e-6
  const pointingLossDb = -4.343 * gainTxLinear * Math.pow(effectiveJitterRad, 2)

  const txPowerDbm = 10 * Math.log10(spec.edfaTxPowerWatts * 1000)
  const optEfficiencyDb = -3.5
  const rxPowerDbm = txPowerDbm + gainTxDbi + gainTxDbi + fsplDb + optEfficiencyDb + pointingLossDb
  const rxPowerWatts = Math.pow(10, (rxPowerDbm - 30) / 10)

  const bitRateBps = spec.dataRateGbps * 1e9
  const rxPhotonsPerBit = rxPowerWatts / (PHOTON_ENERGY_J * bitRateBps)
  const requiredRxPowerWatts = spec.reqPhotonsPerBit * PHOTON_ENERGY_J * bitRateBps
  const requiredRxPowerDbm = 10 * Math.log10(requiredRxPowerWatts * 1000)
  const linkMarginDb = rxPowerDbm - requiredRxPowerDbm
  const isLinkClosed = linkMarginDb >= 3.0

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 6, 16)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const spot = new THREE.DirectionalLight(0xfffaed, 2.5)
    spot.position.set(10, 15, 10)
    scene.add(spot)

    const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.6, 24)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.position.set(0, -1.8, 0)
    scene.add(baseMesh)

    const yokeGroup = new THREE.Group()
    yokeGroup.position.set(0, -1.5, 0)
    scene.add(yokeGroup)

    const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.4), baseMat)
    forkL.position.set(1.1, 0.8, 0)
    yokeGroup.add(forkL)

    const forkR = forkL.clone()
    forkR.position.set(-1.1, 0.8, 0)
    yokeGroup.add(forkR)

    const telescopeGroup = new THREE.Group()
    telescopeGroup.position.set(0, 0, 0)
    yokeGroup.add(telescopeGroup)

    const barrelGeo = new THREE.CylinderGeometry(0.85, 0.95, 2.8, 32, 1, true)
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide
    })
    const barrel = new THREE.Mesh(barrelGeo, barrelMat)
    barrel.rotation.x = Math.PI / 2
    telescopeGroup.add(barrel)

    const mirrorGeo = new THREE.CircleGeometry(0.82, 32)
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.98,
      roughness: 0.05
    })
    const primaryMirror = new THREE.Mesh(mirrorGeo, mirrorMat)
    primaryMirror.position.set(0, 0, -1.2)
    telescopeGroup.add(primaryMirror)

    const spiderGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.6, 8)
    const spiderMat = new THREE.MeshStandardMaterial({ color: 0x64748b })
    const spider1 = new THREE.Mesh(spiderGeo, spiderMat)
    spider1.position.set(0, 0, 1.2)
    telescopeGroup.add(spider1)

    const spider2 = spider1.clone()
    spider2.rotation.z = Math.PI / 2
    telescopeGroup.add(spider2)

    const secondaryGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16)
    const secondaryMirror = new THREE.Mesh(secondaryGeo, mirrorMat)
    secondaryMirror.rotation.x = Math.PI / 2
    secondaryMirror.position.set(0, 0, 1.2)
    telescopeGroup.add(secondaryMirror)

    const beamGeo = new THREE.CylinderGeometry(0.8, 2.4, 25, 32, 1, true)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: isLinkClosed ? 0.35 : 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const laserBeam = new THREE.Mesh(beamGeo, beamMat)
    laserBeam.rotation.x = Math.PI / 2
    laserBeam.position.set(0, 0, 13.5)
    telescopeGroup.add(laserBeam)

    const coreBeamGeo = new THREE.CylinderGeometry(0.12, 0.45, 25, 16, 1, true)
    const coreBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: isLinkClosed ? 0.75 : 0.15,
      blending: THREE.AdditiveBlending
    })
    const coreBeam = new THREE.Mesh(coreBeamGeo, coreBeamMat)
    coreBeam.rotation.x = Math.PI / 2
    coreBeam.position.set(0, 0, 13.5)
    telescopeGroup.add(coreBeam)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = Date.now() * 0.003
      const jitterAmplitude = (effectiveJitterUrad / 10) * 0.03
      const jitterX = Math.sin(t * 3.1) * jitterAmplitude + Math.sin(t * 7.7) * (jitterAmplitude * 0.5)
      const jitterY = Math.cos(t * 2.8) * jitterAmplitude + Math.cos(t * 6.3) * (jitterAmplitude * 0.5)

      telescopeGroup.rotation.x = jitterX
      yokeGroup.rotation.y = jitterY

      if (isLinkClosed) {
        beamMat.opacity = 0.30 + Math.sin(t * 8) * 0.06
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
  }, [spec, isLinkClosed, effectiveJitterUrad])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Zap className="w-5 h-5 text-cyan-400" /> Optical Lasercom
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            1550 nm OISL PAT &amp; Quantum Sensitivity Engine
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Optical Terminal Class
            </label>
            <div className="space-y-2">
              {(["SDA_SPACE_BACN", "COMMERCIAL_OISL", "DEEP_SPACE_DSOC", "TACTICAL_AIR_SPACE"] as LasercomPreset[]).map(p => {
                const item = PRESETS[p]
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setPreset(p)
                      setCrosslinkDistanceKm(Math.min(item.maxRangeKm, 3200))
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      preset === p 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Aperture: {item.apertureDiameterMm} mm | EDFA: {item.edfaTxPowerWatts} W
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.dataRateGbps} Gbps</span>
                      <span className="text-slate-500">{item.maxRangeKm} km max</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Crosslink Range &amp; PAT Dynamics
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">CROSSLINK DISTANCE:</span>
                <span className="text-cyan-400 font-bold">{crosslinkDistanceKm.toLocaleString()} km</span>
              </div>
              <input 
                type="range" min="200" max={spec.maxRangeKm} step="50"
                value={crosslinkDistanceKm}
                onChange={e => setCrosslinkDistanceKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Intra-Plane (500 km)</span>
                <span>Inter-Plane Crosslink ({spec.maxRangeKm} km)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">BUS PLATFORM JITTER:</span>
                <span className={`font-bold ${rmsJitterUrad <= 2.0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {rmsJitterUrad.toFixed(1)} μrad (1-σ)
                </span>
              </div>
              <input 
                type="range" min="0.2" max="6.0" step="0.1"
                value={rmsJitterUrad}
                onChange={e => setRmsJitterUrad(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">PIEZO FSM CLOSED-LOOP (1 kHz):</span>
              <button
                onClick={() => setFsmTrackingActive(!fsmTrackingActive)}
                className={`px-3 py-1 rounded border text-[10px] font-bold ${
                  fsmTrackingActive 
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300" 
                    : "bg-rose-950 border-rose-500 text-rose-300"
                }`}
              >
                {fsmTrackingActive ? "FSM LOCKED (82% DAMPING)" : "OPEN-LOOP DRIFT"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Optical Physics Breakdown</div>
            <div className="flex justify-between"><span className="text-slate-500">Carrier Wavelength:</span><span className="text-white font-bold">{spec.wavelengthNm} nm (C-Band)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Optical Directivity (G_T):</span><span className="text-cyan-400 font-bold">+{gainTxDbi.toFixed(1)} dBi</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Beam Divergence:</span><span className="text-amber-400 font-bold">{beamDivergenceUrad.toFixed(1)} μrad</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Footprint at Target:</span><span className="text-white">{beamFootprintDiameterM.toFixed(1)} m dia</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Residual Jitter (Post-FSM):</span><span className="text-emerald-400 font-bold">{effectiveJitterUrad.toFixed(2)} μrad</span></div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Coherent Optical Link Status</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isLinkClosed ? "text-emerald-400" : "text-rose-400"}`}>
              {linkMarginDb > 0 ? `+${linkMarginDb.toFixed(2)}` : linkMarginDb.toFixed(2)} dB
            </span>
            <span className="text-slate-500 text-sm">OPTICAL MARGIN</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">RECEIVED POWER: {rxPowerDbm.toFixed(1)} dBm</span>
            <span className="text-emerald-400">SENSITIVITY: {rxPhotonsPerBit.toFixed(0)} PHOTONS/BIT</span>
            <span className="text-amber-400">JITTER PENALTY: {pointingLossDb.toFixed(2)} dB</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">BEAM COLLIMATION GAIN</span>
              <span className="text-white font-bold text-sm">+{gainTxDbi.toFixed(1)} dBi</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">FREE-SPACE PATH LOSS</span>
            <span className="text-rose-400 font-bold text-sm">{fsplDb.toFixed(1)} dB</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">QPD CENTERING ERROR</span>
            <span className="text-cyan-400 font-bold text-sm">&lt; 0.08 μrad (LOCKED)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">LINK STATE</span>
            <span className={`text-sm font-bold ${isLinkClosed ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
              {isLinkClosed ? "COHERENT LOCK (BER &lt; 1e-12)" : "OUT OF LOCK (PAT RETRY)"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Optical Link Cascade
        </h2>

        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border ${isLinkClosed ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              OISL LINK CLOSURE VERIFICATION
            </div>
            <div className={`text-2xl font-black flex items-center gap-2 ${isLinkClosed ? "text-emerald-400" : "text-rose-400"}`}>
              {isLinkClosed ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              {isLinkClosed ? "NOMINAL CLOSURE" : "LINK DEFICIT"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isLinkClosed 
                ? `Terminal delivers ${spec.dataRateGbps} Gbps continuous crosslink with ${linkMarginDb.toFixed(1)} dB excess optical margin above quantum threshold.` 
                : "MARGIN DEFICIT: Received photon density below EDFA noise threshold. Increase optical aperture, activate FSM closed-loop, or reduce crosslink distance."}
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Photon Cascade Waterfall</div>
            <div className="flex justify-between"><span className="text-slate-500">EDFA Optical Power:</span><span className="text-white">+{txPowerDbm.toFixed(1)} dBm ({spec.edfaTxPowerWatts} W)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">TX Telescope Gain:</span><span className="text-emerald-400">+{gainTxDbi.toFixed(1)} dBi</span></div>
            <div className="flex justify-between"><span className="text-slate-500">RX Telescope Gain:</span><span className="text-emerald-400">+{gainTxDbi.toFixed(1)} dBi</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Free-Space Path Loss:</span><span className="text-rose-400">{fsplDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Optical Train Loss:</span><span className="text-rose-400">{optEfficiencyDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pointing Jitter Loss:</span><span className="text-amber-400">{pointingLossDb.toFixed(2)} dB</span></div>
            
            <div className="flex justify-between font-bold border-t border-slate-800 pt-1.5"><span className="text-white">Received Power (P_rx):</span><span className="text-cyan-400">{rxPowerDbm.toFixed(1)} dBm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Receiver Threshold:</span><span className="text-slate-400">{requiredRxPowerDbm.toFixed(1)} dBm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Photons / Bit (Received):</span><span className="text-white font-bold">{rxPhotonsPerBit.toFixed(0)} photons</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Threshold (Required):</span><span className="text-slate-400">{spec.reqPhotonsPerBit} photons</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">NET LINK MARGIN:</span><span className={isLinkClosed ? "text-emerald-400" : "text-rose-400"}>{linkMarginDb > 0 ? `+${linkMarginDb.toFixed(2)}` : linkMarginDb.toFixed(2)} dB</span></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">PAT Subsystem Architecture</div>
            <div className="flex justify-between"><span className="text-slate-500">Coarse Slewing:</span><span className="text-white">Direct-Drive Brushless</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Fine Steering Mirror:</span><span className="text-cyan-400 font-bold">Piezo (3-Axis, 1.2 kHz)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Acquisition Beacon:</span><span className="text-white">850 nm Wide-Angle</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Handshake Time:</span><span className="text-emerald-400 font-bold">&lt; 15 seconds</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
