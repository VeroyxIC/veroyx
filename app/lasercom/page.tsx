"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Zap, 
  Radio, 
  Target, 
  Activity, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Crosshair, 
  Maximize2, 
  Wifi, 
  Sparkles,
  Sliders
} from "lucide-react"

interface LasercomPreset {
  name: string
  classType: string
  linkDistanceKm: number
  wavelengthNm: number
  txPowerWatts: number
  apertureDiameterMm: number
  dataRateGbps: number
  rmsPointingJitterUrad: number
  detectorSensitivityPhotonsPerBit: number
  description: string
}

const LASERCOM_PRESETS: Record<string, LasercomPreset> = {
  sda_tranche_crosslink: {
    name: "SDA Tranche Standard OISL Crosslink",
    classType: "Proliferated LEO Mesh Backhaul",
    linkDistanceKm: 2500,
    wavelengthNm: 1550,
    txPowerWatts: 2.5,
    apertureDiameterMm: 100, // 10 cm telescope
    dataRateGbps: 2.5,
    rmsPointingJitterUrad: 1.2,
    detectorSensitivityPhotonsPerBit: 45,
    description: "Interoperable inter-satellite laser terminal routing multi-gigabit mesh traffic across LEO constellation planes.",
  },
  geo_to_leo_feeder: {
    name: "GEO-to-LEO High-Rate Data Feeder",
    classType: "Inter-Orbital Optical Trunk",
    linkDistanceKm: 42000,
    wavelengthNm: 1550,
    txPowerWatts: 5.0,
    apertureDiameterMm: 150,
    dataRateGbps: 10.0,
    rmsPointingJitterUrad: 0.6,
    detectorSensitivityPhotonsPerBit: 60,
    description: "Long-range optical relay linking low Earth observation satellites to geostationary telecommunication trunk satellites.",
  },
  deep_space_dsoc: {
    name: "Deep Space Optical Terminal (DSOC Analogue)",
    classType: "Planetary Optical Downlink",
    linkDistanceKm: 300000, // Lunar / Cislunar distance
    wavelengthNm: 1550,
    txPowerWatts: 20.0,
    apertureDiameterMm: 220,
    dataRateGbps: 0.1, // 100 Mbps deep space
    rmsPointingJitterUrad: 0.35,
    detectorSensitivityPhotonsPerBit: 25,
    description: "High-power narrow-divergence lasercom downlink equipped with high-order active fast steering mirrors (FSM).",
  },
}

export default function LasercomPage() {
  const [selectedKey, setSelectedKey] = useState<string>("sda_tranche_crosslink")
  const [linkDistanceKm, setLinkDistanceKm] = useState<number>(2500)
  const [txPowerW, setTxPowerW] = useState<number>(2.5)
  const [apertureDiameterMm, setApertureDiameterMm] = useState<number>(100)
  const [dataRateGbps, setDataRateGbps] = useState<number>(2.5)
  const [pointingJitterUrad, setPointingJitterUrad] = useState<number>(1.2)

  const activePreset = LASERCOM_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = LASERCOM_PRESETS[key]
    setSelectedKey(key)
    setLinkDistanceKm(p.linkDistanceKm)
    setTxPowerW(p.txPowerWatts)
    setApertureDiameterMm(p.apertureDiameterMm)
    setDataRateGbps(p.dataRateGbps)
    setPointingJitterUrad(p.rmsPointingJitterUrad)
  }

  // Optical Space Link Budget Calculations (CCSDS 141.0-B-1)
  const metrics = useMemo(() => {
    const lambdaM = 1550e-9 // 1550 nm C-Band standard
    const distanceM = linkDistanceKm * 1000
    const apertureM = apertureDiameterMm / 1000
    const h = 6.62607015e-34 // Planck constant
    const c = 299792458
    const photonEnergyJ = (h * c) / lambdaM

    // 1. Airy Disk Diffraction Beam Divergence (Full Width Half Maximum in microradians)
    const divergenceUrad = Math.round((1.03 * (lambdaM / apertureM) * 1e6) * 10) / 10

    // 2. Transmit & Receive Optical Antenna Gains (dBi)
    // G = (pi * D / lambda)^2
    const opticalGainDbi = Math.round((20 * Math.log10((Math.PI * apertureM) / lambdaM)) * 10) / 10

    // 3. Free-Space Path Loss (dB)
    const fsplDb = Math.round((20 * Math.log10((4 * Math.PI * distanceM) / lambdaM)) * 10) / 10

    // 4. Pointing Error Loss (Jitter Penalty in dB)
    // L_point ~ -4.343 * (jitter / (divergence / 2))^2
    const pointingLossDb = Math.round(
      (4.343 * Math.pow(pointingJitterUrad / Math.max(0.1, divergenceUrad / 2), 2)) * 10
    ) / 10

    // 5. Optical Power Received (dBm and nW)
    const txPowerDbm = 10 * Math.log10(txPowerW * 1000)
    const opticsEfficiencyLossDb = 4.5 // Internal lenses, mirrors, fiber coupling
    const rxPowerDbm = txPowerDbm + opticalGainDbi + opticalGainDbi - fsplDb - pointingLossDb - opticsEfficiencyLossDb
    const rxPowerWatts = Math.pow(10, (rxPowerDbm - 30) / 10)
    const rxPowerNanoWatts = Math.round(rxPowerWatts * 1e9 * 100) / 100

    // 6. Required Optical Power for Target Bitrate (dBm)
    // P_req = Photons_per_bit * E_photon * Bitrate
    const bitRateBps = dataRateGbps * 1e9
    const reqPowerWatts = activePreset.detectorSensitivityPhotonsPerBit * photonEnergyJ * bitRateBps
    const reqPowerDbm = Math.round((10 * Math.log10(reqPowerWatts * 1000)) * 10) / 10

    // 7. Net Optical Link Margin (dB)
    const opticalMarginDb = Math.round((rxPowerDbm - reqPowerDbm) * 10) / 10
    const linkPassed = opticalMarginDb >= 3.0 // Standard 3 dB optical mission margin

    return {
      divergenceUrad,
      opticalGainDbi,
      fsplDb,
      pointingLossDb,
      rxPowerDbm: rxPowerDbm.toFixed(1),
      rxPowerNanoWatts,
      reqPowerDbm,
      opticalMarginDb,
      linkPassed,
    }
  }, [linkDistanceKm, txPowerW, apertureDiameterMm, dataRateGbps, pointingJitterUrad, activePreset])

  const exportLasercomCSV = () => {
    const csv = `SPACECRAFT OPTICAL INTERSATELLITE LINK (OISL) SPEC
Link Profile,${activePreset.name}
Class,${activePreset.classType}
Intersatellite Distance,${linkDistanceKm} km
Optical Laser Wavelength,1550 nm (C-Band DWDM)
Transmitter Laser Power,${txPowerW} Watts (${(10 * Math.log10(txPowerW * 1000)).toFixed(1)} dBm)
Telescope Aperture Diameter,${apertureDiameterMm} mm
Beam Divergence (FWHM),${metrics.divergenceUrad} urad
Optical Telescope Gain,${metrics.opticalGainDbi} dBi
Geometric Path Loss,${metrics.fsplDb} dB
RMS Pointing Jitter,${pointingJitterUrad} urad (Pointing Penalty: -${metrics.pointingLossDb} dB)
Received Optical Power,${metrics.rxPowerDbm} dBm (${metrics.rxPowerNanoWatts} nW)
Target Downlink Bitrate,${dataRateGbps} Gbps
Required Receiver Sensitivity,${metrics.reqPowerDbm} dBm (${activePreset.detectorSensitivityPhotonsPerBit} photons/bit)
Net Optical Link Margin,${metrics.opticalMarginDb} dB (Required: >= 3.0 dB)
PAT Link Availability Verdict,${metrics.linkPassed ? "PASS (HIGH-CONFIDENCE OPTICAL TRACKING)" : "FAIL (OPTICAL LINK DISRUPTION HAZARD)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-lasercom-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Zap className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              CCSDS 141.0-B-1 Free-Space Optical Communications &amp; PAT Sizing Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              OPTICAL INTERSATELLITE LINKS (OISL)
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model microradian Gaussian laser divergence, Free-Space Path Loss (L_geo), pointing-acquisition-and-tracking (PAT) jitter losses, and multi-gigabit receiver photon sensitivities.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportLasercomCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT LASERCOM SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(LASERCOM_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap text-left ${
                selectedKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="font-bold">{v.name}</div>
              <div className="text-[10px] text-slate-500">{v.linkDistanceKm} km · {v.dataRateGbps} Gbps</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> OPTICAL LINK MARGIN
            </div>
            <div className={`text-3xl font-black ${metrics.linkPassed ? "text-emerald-400" : "text-red-400"}`}>
              +{metrics.opticalMarginDb} dB
            </div>
            <div className="text-[10px] text-slate-400">Req: &ge; 3.0 dB Margin</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-purple-400" /> BEAM DIVERGENCE
            </div>
            <div className="text-3xl font-black text-purple-400">{metrics.divergenceUrad} µrad</div>
            <div className="text-[10px] text-slate-400">Gain: +{metrics.opticalGainDbi} dBi</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-400" /> POINTING PENALTY
            </div>
            <div className="text-3xl font-black text-amber-400">-{metrics.pointingLossDb} dB</div>
            <div className="text-[10px] text-slate-400">From {pointingJitterUrad} µrad RMS Jitter</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> RECEIVED POWER
            </div>
            <div className="text-3xl font-black text-white">{metrics.rxPowerNanoWatts} nW</div>
            <div className="text-[10px] text-slate-400">{metrics.rxPowerDbm} dBm (Req: {metrics.reqPowerDbm} dBm)</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Terminal &amp; Channel Sizing
            </div>

            {/* Distance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">CROSSLINK DISTANCE</label>
                <span className="text-cyan-400 font-bold">{linkDistanceKm} KM</span>
              </div>
              <input
                type="range"
                min={500}
                max={45000}
                step={500}
                value={linkDistanceKm}
                onChange={(e) => setLinkDistanceKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1000 km (Adjacent)</span>
                <span>5000 km (Cross-Plane)</span>
                <span>45000 km (GEO)</span>
              </div>
            </div>

            {/* Transmit Power & Aperture */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">LASER POWER (W)</label>
                <input
                  type="number"
                  step={0.5}
                  value={txPowerW}
                  onChange={(e) => setTxPowerW(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">APERTURE (mm)</label>
                <input
                  type="number"
                  step={5}
                  value={apertureDiameterMm}
                  onChange={(e) => setApertureDiameterMm(Math.max(30, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Bitrate Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">DATA RATE</label>
                <span className="text-emerald-400 font-bold">{dataRateGbps} GBPS</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={20.0}
                step={0.5}
                value={dataRateGbps}
                onChange={(e) => setDataRateGbps(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Digital coherent or direct APD optical receiver</span>
            </div>

            {/* Pointing Jitter */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">RMS POINTING JITTER</label>
                <span className="text-purple-400 font-bold">{pointingJitterUrad} µRAD</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={4.0}
                step={0.1}
                value={pointingJitterUrad}
                onChange={(e) => setPointingJitterUrad(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Correlated with RWA micro-vibration from /jitter</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">OPTICAL COUPLING:</strong>
              Because optical divergence is narrow ({metrics.divergenceUrad} µrad), slight spacecraft micro-vibrations cause severe pointing penalties (-{metrics.pointingLossDb} dB).
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Lasercom Link Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  Optical Intersatellite Channel &amp; Energy Budget
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.linkPassed
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.linkPassed ? "OPTICAL LINK MARGIN VERIFIED" : "LINK BUDGET CLOSURE DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  Transmitting <strong className="text-white">{dataRateGbps} Gbps</strong> across a <strong className="text-white">{linkDistanceKm} km</strong> optical crosslink requires delivering at least <strong className="text-white">{metrics.reqPowerDbm} dBm</strong> to satisfy the {activePreset.detectorSensitivityPhotonsPerBit} photons/bit quantum sensitivity limit.
                </p>
                <p>
                  A {apertureDiameterMm}mm aperture collimates the 1550 nm laser into a <strong className="text-cyan-400">{metrics.divergenceUrad} µrad beam</strong> (+{metrics.opticalGainDbi} dBi gain). 
                  Free-space loss of <strong className="text-white">{metrics.fsplDb} dB</strong> combined with -{metrics.pointingLossDb} dB of pointing jitter loss results in <strong className="text-emerald-400">{metrics.rxPowerNanoWatts} nW ({metrics.rxPowerDbm} dBm)</strong> at the detector, maintaining a <strong className={metrics.linkPassed ? "text-emerald-400" : "text-red-400"}>+{metrics.opticalMarginDb} dB link margin</strong>.
                  {!metrics.linkPassed && (
                    <span className="text-red-400 block mt-1 font-bold">
                      Link budget deficit: Net margin is below the 3.0 dB flight threshold. Increase transmitter power, enlarge telescope aperture, or integrate active Fast Steering Mirrors (FSM) to suppress pointing jitter.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Geometric Free-Space Path Loss (L_geo)</span>
                  <span className="text-white font-bold">-{metrics.fsplDb} dB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Transmitter Telescope Gain (G_tx)</span>
                  <span className="text-cyan-400 font-bold">+{metrics.opticalGainDbi} dBi</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">PAT Jitter Insertion Loss</span>
                  <span className="text-amber-400 font-bold">-{metrics.pointingLossDb} dB (at {pointingJitterUrad} µrad RMS)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Optical Communications Verification</span>
                  <span className={`font-bold ${metrics.linkPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.linkPassed ? "PASS (CLEARED FOR HIGH-RATE CROSSHAUL)" : "FAIL (REVISE POWER / JITTER)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Correlated Engines */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                CORRELATED ENGINES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/jitter" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/jitter (RWA)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/link" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/link (RF Comms)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/two-phase" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/two-phase (Heat)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
