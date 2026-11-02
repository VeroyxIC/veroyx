"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Radio, Wifi, Activity, Zap, Layers, Gauge, 
  ShieldCheck, ShieldAlert, Sliders, ArrowUpRight, Signal, BarChart2 
} from "lucide-react"

type BandPreset = "S_BAND" | "X_BAND" | "KU_BAND" | "KA_BAND" | "Q_BAND"
type ModulationScheme = "QPSK_1_2" | "8PSK_3_4" | "16APSK_2_3" | "32APSK_3_4" | "64APSK_4_5"

interface BandSpec {
  name: string
  centerFreqGhz: number
  txPowerWatts: number
  satAntennaGainDbi: number
  atmAttenDb: number
  rainFadeDb: number
  pointingLossDb: number
  colorHex: number
}

const BAND_PRESETS: Record<BandPreset, BandSpec> = {
  S_BAND: {
    name: "S-Band TT&C Standard",
    centerFreqGhz: 2.25,
    txPowerWatts: 5,
    satAntennaGainDbi: 8.5,
    atmAttenDb: 0.12,
    rainFadeDb: 0.05,
    pointingLossDb: 0.2,
    colorHex: 0x38bdf8
  },
  X_BAND: {
    name: "X-Band High-Speed Payload Downlink",
    centerFreqGhz: 8.45,
    txPowerWatts: 15,
    satAntennaGainDbi: 28.5,
    atmAttenDb: 0.28,
    rainFadeDb: 0.45,
    pointingLossDb: 0.6,
    colorHex: 0x10b981
  },
  KU_BAND: {
    name: "Ku-Band Commercial Comms",
    centerFreqGhz: 12.5,
    txPowerWatts: 35,
    satAntennaGainDbi: 34.0,
    atmAttenDb: 0.42,
    rainFadeDb: 1.85,
    pointingLossDb: 0.8,
    colorHex: 0xf59e0b
  },
  KA_BAND: {
    name: "Ka-Band Broadband Trunking",
    centerFreqGhz: 26.5,
    txPowerWatts: 25,
    satAntennaGainDbi: 41.5,
    atmAttenDb: 0.85,
    rainFadeDb: 4.80,
    pointingLossDb: 1.2,
    colorHex: 0xa855f7
  },
  Q_BAND: {
    name: "Q/V-Band Feeder Gateway",
    centerFreqGhz: 40.0,
    txPowerWatts: 50,
    satAntennaGainDbi: 46.0,
    atmAttenDb: 1.95,
    rainFadeDb: 9.40,
    pointingLossDb: 1.5,
    colorHex: 0xf43f5e
  }
}

interface ModCodSpec {
  name: string
  spectralEfficiencyBpsHz: number
  reqEbN0Db: number
}

const MODCODS: Record<ModulationScheme, ModCodSpec> = {
  "QPSK_1_2": { name: "QPSK 1/2 (Robust)", spectralEfficiencyBpsHz: 0.98, reqEbN0Db: 2.2 },
  "8PSK_3_4": { name: "8PSK 3/4 (Standard)", spectralEfficiencyBpsHz: 2.22, reqEbN0Db: 6.8 },
  "16APSK_2_3": { name: "16APSK 2/3 (High Throughput)", spectralEfficiencyBpsHz: 2.65, reqEbN0Db: 9.4 },
  "32APSK_3_4": { name: "32APSK 3/4 (Dense Constellation)", spectralEfficiencyBpsHz: 3.70, reqEbN0Db: 13.2 },
  "64APSK_4_5": { name: "64APSK 4/5 (Max Capacity)", spectralEfficiencyBpsHz: 4.75, reqEbN0Db: 17.5 }
}

export default function LinkBudgetPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [band, setBand] = useState<BandPreset>("X_BAND")
  const [modCod, setModCod] = useState<ModulationScheme>("8PSK_3_4")
  const [slantRangeKm, setSlantRangeKm] = useState(1250)
  const [groundGtDbK, setGroundGtDbK] = useState(26.5)
  const [dataRateMbps, setDataRateMbps] = useState(150)
  const [isPrecipitating, setIsPrecipitating] = useState(false)

  const spec = BAND_PRESETS[band]
  const modSpec = MODCODS[modCod]

  const BOLTZMANN_K_DBW = -228.6
  const SPEED_OF_LIGHT = 299792458

  const txPowerDbw = 10 * Math.log10(spec.txPowerWatts)
  const lineLossDb = 1.2
  const eirpDbw = txPowerDbw + spec.satAntennaGainDbi - lineLossDb

  const freqHz = spec.centerFreqGhz * 1e9
  const distanceM = slantRangeKm * 1000
  const fsplDb = 20 * Math.log10(distanceM) + 20 * Math.log10(freqHz) + 20 * Math.log10((4 * Math.PI) / SPEED_OF_LIGHT)

  const rainLossDb = isPrecipitating ? spec.rainFadeDb * 2.5 : spec.rainFadeDb * 0.1
  const totalPathLossDb = fsplDb + spec.atmAttenDb + rainLossDb + spec.pointingLossDb

  const cn0DbHz = eirpDbw - totalPathLossDb + groundGtDbK - BOLTZMANN_K_DBW

  const dataRateBps = dataRateMbps * 1e6
  const dataRateDbHz = 10 * Math.log10(dataRateBps)
  const receivedEbN0Db = cn0DbHz - dataRateDbHz

  const linkMarginDb = receivedEbN0Db - modSpec.reqEbN0Db
  const isLinkClosed = linkMarginDb >= 3.0
  const isMarginal = linkMarginDb >= 0 && linkMarginDb < 3.0

  const bandwidthMhz = dataRateMbps / modSpec.spectralEfficiencyBpsHz
  const snrLinear = Math.pow(10, (receivedEbN0Db * modSpec.spectralEfficiencyBpsHz) / 10)
  const shannonCapacityMbps = bandwidthMhz * Math.log2(1 + snrLinear)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 6, 12)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const sun = new THREE.DirectionalLight(0xffffff, 2.5)
    sun.position.set(10, 10, 10)
    scene.add(sun)

    const antGroup = new THREE.Group()

    const dishGeo = new THREE.SphereGeometry(1.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3)
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide
    })
    const dish = new THREE.Mesh(dishGeo, dishMat)
    dish.rotation.x = Math.PI / 2
    antGroup.add(dish)

    const hornGeo = new THREE.CylinderGeometry(0.1, 0.18, 0.6, 16)
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
    const horn = new THREE.Mesh(hornGeo, hornMat)
    horn.position.set(0, 0, 1.2)
    horn.rotation.x = Math.PI / 2
    antGroup.add(horn)

    const gainFactor = spec.satAntennaGainDbi / 15
    const lobeGeo = new THREE.SphereGeometry(2.4 * gainFactor, 48, 48)
    const pos = lobeGeo.attributes.position.array as Float32Array

    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i]
      const y = pos[i + 1]
      const z = pos[i + 2]
      const r = Math.sqrt(x * x + y * y + z * z)
      const theta = Math.acos(z / (r || 1))

      const pattern = Math.pow(Math.cos(theta / 2), spec.satAntennaGainDbi * 0.4)
      const modulatedR = 0.4 + pattern * 3.5

      pos[i] = (x / (r || 1)) * modulatedR
      pos[i + 1] = (y / (r || 1)) * modulatedR
      pos[i + 2] = (z / (r || 1)) * modulatedR
    }
    lobeGeo.computeVertexNormals()

    const lobeMat = new THREE.MeshPhysicalMaterial({
      color: spec.colorHex,
      emissive: spec.colorHex,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.45,
      wireframe: true
    })
    const lobeMesh = new THREE.Mesh(lobeGeo, lobeMat)
    lobeMesh.position.set(0, 0, 1.2)
    antGroup.add(lobeMesh)

    scene.add(antGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      antGroup.rotation.y += 0.004
      antGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.08
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
  }, [spec, band])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Radio className="w-5 h-5 text-cyan-400" /> RF Link Budget
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Friis Path Loss &amp; DVB-S2X Margin Engine
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Carrier Frequency Band
            </label>
            <div className="space-y-2">
              {(["S_BAND", "X_BAND", "KU_BAND", "KA_BAND", "Q_BAND"] as BandPreset[]).map(b => {
                const item = BAND_PRESETS[b]
                return (
                  <button
                    key={b}
                    onClick={() => setBand(b)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      band === b 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Freq: {item.centerFreqGhz} GHz | Gain: +{item.satAntennaGainDbi} dBi
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-slate-500 block">TX POWER</span>
                      <span className="text-cyan-400 font-bold">{item.txPowerWatts} W</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Adaptive Coding &amp; Modulation (ACM)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(["QPSK_1_2", "8PSK_3_4", "16APSK_2_3", "32APSK_3_4", "64APSK_4_5"] as ModulationScheme[]).map(m => (
                <button
                  key={m}
                  onClick={() => setModCod(m)}
                  className={`p-2.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                    modCod === m 
                      ? "bg-emerald-950/60 border-emerald-500 text-emerald-300" 
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="font-bold">{MODCODS[m].name}</span>
                  <span className="text-[10px] text-slate-500">Req Eb/N0: {MODCODS[m].reqEbN0Db} dB</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">SLANT RANGE:</span>
                <span className="text-cyan-400 font-bold">{slantRangeKm.toLocaleString()} km</span>
              </div>
              <input 
                type="range" min="400" max="42000" step="100"
                value={slantRangeKm}
                onChange={e => setSlantRangeKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">DATA THROUGHPUT:</span>
                <span className="text-emerald-400 font-bold">{dataRateMbps} Mbps</span>
              </div>
              <input 
                type="range" min="1" max="1200" step="5"
                value={dataRateMbps}
                onChange={e => setDataRateMbps(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">GROUND TERMINAL G/T:</span>
                <span className="text-amber-400 font-bold">+{groundGtDbK.toFixed(1)} dB/K</span>
              </div>
              <input 
                type="range" min="10" max="42" step="0.5"
                value={groundGtDbK}
                onChange={e => setGroundGtDbK(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">ITU-R P.838 RAIN ATTENUATION:</span>
              <button
                onClick={() => setIsPrecipitating(!isPrecipitating)}
                className={`px-3 py-1 rounded border text-[10px] font-bold ${
                  isPrecipitating 
                    ? "bg-rose-950 border-rose-500 text-rose-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {isPrecipitating ? "HEAVY RAIN (35 mm/hr)" : "CLEAR SKY (0 mm/hr)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Signal Quality &amp; Margin</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isLinkClosed ? "text-emerald-400" : isMarginal ? "text-amber-400" : "text-rose-400"}`}>
              {linkMarginDb > 0 ? `+${linkMarginDb.toFixed(2)}` : linkMarginDb.toFixed(2)} dB
            </span>
            <span className="text-slate-500 text-sm">LINK MARGIN</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">RECEIVED Eb/N0: {receivedEbN0Db.toFixed(2)} dB</span>
            <span className="text-slate-400">REQ Eb/N0: {modSpec.reqEbN0Db} dB</span>
            <span className="text-emerald-400">EIRP: +{eirpDbw.toFixed(1)} dBW</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Signal className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">CARRIER-TO-NOISE (C/N0)</span>
              <span className="text-white font-bold text-sm">+{cn0DbHz.toFixed(1)} dB-Hz</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">FREE-SPACE PATH LOSS</span>
            <span className="text-rose-400 font-bold text-sm">-{fsplDb.toFixed(1)} dB</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ATMOSPHERIC + RAIN FADE</span>
            <span className="text-amber-400 font-bold text-sm">-{(spec.atmAttenDb + rainLossDb).toFixed(2)} dB</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">LINK STATUS</span>
            <span className={`text-sm font-bold ${isLinkClosed ? "text-emerald-400" : isMarginal ? "text-amber-400" : "text-rose-400 animate-pulse"}`}>
              {isLinkClosed ? "LINK CLOSED (≥3 dB)" : isMarginal ? "MARGINAL LINK" : "LINK DROPPED"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Link Budget Table
        </h2>

        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border ${isLinkClosed ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              COMMUNICATION CLOSURE
            </div>
            <div className={`text-2xl font-black flex items-center gap-2 ${isLinkClosed ? "text-emerald-400" : "text-rose-400"}`}>
              {isLinkClosed ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              {isLinkClosed ? "NOMINAL CLOSURE" : "INSUFFICIENT MARGIN"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isLinkClosed 
                ? "Downlink budget satisfies commercial and defense criteria with over 3.0 dB excess margin against bit-error rate thresholds (BER < 1e-9)." 
                : "LINK CLOSURE FAILURE: Bit error rate exceeds operational limits. Reduce throughput, upgrade ground dish G/T, or switch to more robust ModCod."}
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">RF Downlink Cascade</div>
            <div className="flex justify-between"><span className="text-slate-500">Transmitter RF Power:</span><span className="text-white">+{txPowerDbw.toFixed(1)} dBW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">RF Feeder / Line Loss:</span><span className="text-rose-400">-{lineLossDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Spacecraft Antenna Gain:</span><span className="text-emerald-400">+{spec.satAntennaGainDbi.toFixed(1)} dBi</span></div>
            <div className="flex justify-between font-bold border-t border-slate-800 pt-1"><span className="text-white">Transmitter EIRP:</span><span className="text-cyan-400">+{eirpDbw.toFixed(1)} dBW</span></div>
            
            <div className="flex justify-between pt-1"><span className="text-slate-500">Free-Space Loss (FSPL):</span><span className="text-rose-400">-{fsplDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Atmospheric Absorption:</span><span className="text-rose-400">-{spec.atmAttenDb.toFixed(2)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rain Fade (ITU-R P.838):</span><span className="text-rose-400">-{rainLossDb.toFixed(2)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Antenna Pointing Depointing:</span><span className="text-rose-400">-{spec.pointingLossDb.toFixed(1)} dB</span></div>
            
            <div className="flex justify-between font-bold border-t border-slate-800 pt-1"><span className="text-white">Total Path Loss:</span><span className="text-rose-400">-{totalPathLossDb.toFixed(1)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ground Terminal G/T:</span><span className="text-emerald-400">+{groundGtDbK.toFixed(1)} dB/K</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Boltzmann Constant (k):</span><span className="text-white">-228.6 dBW/K·Hz</span></div>
            
            <div className="flex justify-between font-bold border-t border-slate-800 pt-1"><span className="text-white">Carrier-to-Noise (C/N0):</span><span className="text-cyan-400">+{cn0DbHz.toFixed(1)} dB-Hz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Data Rate Penalty (10logR):</span><span className="text-rose-400">-{dataRateDbHz.toFixed(1)} dB</span></div>
            <div className="flex justify-between font-bold"><span className="text-white">Energy per Bit (Eb/N0):</span><span className="text-amber-400">+{receivedEbN0Db.toFixed(2)} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Required Eb/N0 (Threshold):</span><span className="text-white">+{modSpec.reqEbN0Db.toFixed(1)} dB</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">NET LINK MARGIN:</span><span className={isLinkClosed ? "text-emerald-400" : "text-rose-400"}>{linkMarginDb > 0 ? `+${linkMarginDb.toFixed(2)}` : linkMarginDb.toFixed(2)} dB</span></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Information Theory Limits</div>
            <div className="flex justify-between"><span className="text-slate-500">Channel Bandwidth:</span><span className="text-white">{bandwidthMhz.toFixed(1)} MHz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Spectral Efficiency:</span><span className="text-cyan-400 font-bold">{modSpec.spectralEfficiencyBpsHz} bps/Hz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Shannon Capacity Limit:</span><span className="text-emerald-400 font-bold">{shannonCapacityMbps.toFixed(0)} Mbps</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
