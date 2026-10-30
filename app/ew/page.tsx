"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Radio, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Gauge, 
  Download, 
  Layers, 
  Zap, 
  ArrowRight,
  Crosshair,
  Lock
} from "lucide-react"

interface EwPreset {
  name: string
  operator: string
  regime: "Downlink Denial" | "Uplink SATCOM Jamming" | "Crosslink Intercept"
  carrierFreqGhz: number
  legitimatePowerW: number
  legitDistanceKm: number
  jammerPowerW: number
  jammerDistanceKm: number
  spreadSpectrumChipRateMcps: number
  dataRateKbps: number
  description: string
}

const EW_PRESETS: Record<string, EwPreset> = {
  gps_l1_denial: {
    name: "GPS L1 Tactical C/A Jamming",
    operator: "Contested Theater / Adversary EW",
    regime: "Downlink Denial",
    carrierFreqGhz: 1.575,
    legitimatePowerW: 50,
    legitDistanceKm: 20200, // MEO GPS distance
    jammerPowerW: 20, // Ground jammer
    jammerDistanceKm: 45, // Tactical standoff
    spreadSpectrumChipRateMcps: 1.023,
    dataRateKbps: 0.05, // 50 bps legacy nav
    description: "High-power terrestrial jammer targeting weak GNSS signal arrivals at user ground terminals.",
  },
  aehf_protected: {
    name: "Strategic Protected SATCOM (AEHF / EHF)",
    operator: "US Space Force (USSF)",
    regime: "Uplink SATCOM Jamming",
    carrierFreqGhz: 44.0, // EHF Uplink
    legitimatePowerW: 1000,
    legitDistanceKm: 35786,
    jammerPowerW: 5000,
    jammerDistanceKm: 36000,
    spreadSpectrumChipRateMcps: 50.0,
    dataRateKbps: 19.2,
    description: "Extremely high frequency anti-jam frequency hopping with spatial nulling antennas.",
  },
  commercial_ku_uplink: {
    name: "Commercial Ku-Band Uplink Barrage",
    operator: "Commercial Broadcast / VSAT",
    regime: "Uplink SATCOM Jamming",
    carrierFreqGhz: 14.0,
    legitimatePowerW: 250,
    legitDistanceKm: 35786,
    jammerPowerW: 1500,
    jammerDistanceKm: 35786,
    spreadSpectrumChipRateMcps: 0, // No DSSS
    dataRateKbps: 10000, // 10 Mbps
    description: "Direct carrier saturation against transponder input amplifier on unhardened commercial bus.",
  },
}

export default function SpaceEWPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("gps_l1_denial")
  const [regime, setRegime] = useState<string>("Downlink Denial")
  const [carrierFreqGhz, setCarrierFreqGhz] = useState<number>(1.575)
  const [legitPowerW, setLegitPowerW] = useState<number>(50)
  const [legitDistKm, setLegitDistKm] = useState<number>(20200)
  const [jammerPowerW, setJammerPowerW] = useState<number>(20)
  const [jammerDistKm, setJammerDistKm] = useState<number>(45)
  const [chipRateMcps, setChipRateMcps] = useState<number>(1.023)
  const [dataRateKbps, setDataRateKbps] = useState<number>(0.05)

  const preset = EW_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = EW_PRESETS[key]
    setSelectedPresetKey(key)
    setRegime(p.regime)
    setCarrierFreqGhz(p.carrierFreqGhz)
    setLegitPowerW(p.legitimatePowerW)
    setLegitDistKm(p.legitDistanceKm)
    setJammerPowerW(p.jammerPowerW)
    setJammerDistKm(p.jammerDistanceKm)
    setChipRateMcps(p.spreadSpectrumChipRateMcps)
    setDataRateKbps(p.dataRateKbps)
  }

  // Space EW & Jamming Physics Calculations
  const metrics = useMemo(() => {
    // Free space path loss: FSPL = 20*log10(d) + 20*log10(f) + 92.45
    const fsplLegit = 20 * Math.log10(legitDistKm) + 20 * Math.log10(carrierFreqGhz) + 92.45
    const fsplJammer = 20 * Math.log10(jammerDistKm) + 20 * Math.log10(carrierFreqGhz) + 92.45

    // Received powers (dBW)
    const legitPowerDbw = 10 * Math.log10(legitPowerW)
    const jammerPowerDbw = 10 * Math.log10(jammerPowerW)

    const rxLegitDbw = legitPowerDbw - fsplLegit
    const rxJammerDbw = jammerPowerDbw - fsplJammer

    // Raw Jammer-to-Signal Ratio (J/S in dB)
    const rawJsDb = Math.round((rxJammerDbw - rxLegitDbw) * 10) / 10

    // Anti-Jam Processing Gain (DSSS / FHSS)
    // Gp = 10 * log10(ChipRate / DataRate)
    let processingGainDb = 0
    if (chipRateMcps > 0 && dataRateKbps > 0) {
      const chipRateHz = chipRateMcps * 1e6
      const dataRateHz = dataRateKbps * 1e3
      if (chipRateHz > dataRateHz) {
        processingGainDb = Math.round((10 * Math.log10(chipRateHz / dataRateHz)) * 10) / 10
      }
    }

    // Effective J/S after Anti-Jam processing
    const effectiveJsDb = Math.round((rawJsDb - processingGainDb) * 10) / 10

    // Link Survival Threshold: Standard communications drop when J/S > 0 dB post-processing
    const linkDenied = effectiveJsDb > 0
    const antiJamMarginDb = Math.round((-effectiveJsDb) * 10) / 10

    // Burn-through Range: Range at which legitimate transmitter equals jammer power
    // R_bt = R_j * sqrt((P_s * G_t) / (P_j * G_jt))
    const burnThroughKm = Math.round(jammerDistKm * Math.sqrt(legitPowerW / Math.max(1, jammerPowerW)))

    return {
      fsplLegit: fsplLegit.toFixed(1),
      fsplJammer: fsplJammer.toFixed(1),
      rawJsDb,
      processingGainDb,
      effectiveJsDb,
      linkDenied,
      antiJamMarginDb,
      burnThroughKm,
    }
  }, [carrierFreqGhz, legitPowerW, legitDistKm, jammerPowerW, jammerDistKm, chipRateMcps, dataRateKbps])

  const exportEwCSV = () => {
    const csv = `SPACE ELECTRONIC WARFARE & SPECTRUM JAMMING SPEC
Preset Scenario,${preset.name}
Operator / Threat,${preset.operator}
Jamming Target Regime,${regime}
Carrier Center Frequency,${carrierFreqGhz} GHz
Legitimate Transmitter Power,${legitPowerW} W (${legitDistKm} km)
Hostile Jammer Power,${jammerPowerW} W (${jammerDistKm} km)
Spread Spectrum Chip Rate,${chipRateMcps} Mcps
Payload Data Rate,${dataRateKbps} kbps
Anti-Jam Processing Gain,${metrics.processingGainDb} dB
Raw Jammer-to-Signal Ratio (J/S),${metrics.rawJsDb} dB
Effective J/S After Anti-Jam,${metrics.effectiveJsDb} dB
Anti-Jam Link Margin,${metrics.antiJamMarginDb} dB
Link Status,${metrics.linkDenied ? "ELECTRONIC DENIAL / JAMMED" : "PROTECTED LINK OPERATIONAL"}
Calculated Burn-Through Standoff,${metrics.burnThroughKm} km`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-ew-jamming-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse text-red-400" />
              Counter-Space Electronic Warfare (EW) &amp; J/S Ratio Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SPACE ELECTRONIC WARFARE (EW) SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model RF jamming-to-signal ($J/S$) ratios, spread-spectrum anti-jam processing gain (DSSS/FHSS), GNSS tactical denial, and uplink/downlink burn-through ranges.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportEwCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT EW DOSSIER
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(EW_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedPresetKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              EW Engagement Geometry
            </div>

            {/* Carrier Frequency */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">CARRIER FREQUENCY (GHz)</label>
              <input
                type="number"
                step={0.1}
                value={carrierFreqGhz}
                onChange={(e) => setCarrierFreqGhz(Math.max(0.1, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>

            {/* Legitimate Signal Source */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-cyan-400 font-bold uppercase block text-[11px]">
                Legitimate Transmitter Link
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">TRANSMIT POWER (W)</span>
                  <input
                    type="number"
                    value={legitPowerW}
                    onChange={(e) => setLegitPowerW(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">LINK DISTANCE (km)</span>
                  <input
                    type="number"
                    value={legitDistKm}
                    onChange={(e) => setLegitDistKm(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Hostile Jammer Specs */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-red-400 font-bold uppercase block text-[11px]">
                Adversary Jamming Source
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">JAMMER POWER (W)</span>
                  <input
                    type="number"
                    value={jammerPowerW}
                    onChange={(e) => setJammerPowerW(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">JAMMER DISTANCE (km)</span>
                  <input
                    type="number"
                    value={jammerDistKm}
                    onChange={(e) => setJammerDistKm(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Anti-Jam ECCM Configuration */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-purple-400 font-bold uppercase block text-[11px] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Anti-Jam Spread Spectrum (ECCM)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">DSSS CHIP RATE (Mcps)</span>
                  <input
                    type="number"
                    step={0.1}
                    value={chipRateMcps}
                    onChange={(e) => setChipRateMcps(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">DATA RATE (kbps)</span>
                  <input
                    type="number"
                    step={0.1}
                    value={dataRateKbps}
                    onChange={(e) => setDataRateKbps(Math.max(0.01, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-red-400" /> RAW J/S RATIO
                </div>
                <div className="text-3xl font-black text-white">+{metrics.rawJsDb} dB</div>
                <div className="text-[10px] text-slate-500">Unfiltered At Antenna</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3 text-purple-400" /> DSSS PROCESSING GAIN
                </div>
                <div className="text-3xl font-black text-purple-400">+{metrics.processingGainDb} dB</div>
                <div className="text-[10px] text-slate-500">Anti-Jam Nulling Depth</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.linkDenied ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  )}
                  NET ANTI-JAM MARGIN
                </div>
                <div className={`text-3xl font-black ${metrics.linkDenied ? "text-red-400" : "text-emerald-400"}`}>
                  {metrics.antiJamMarginDb >= 0 ? `+${metrics.antiJamMarginDb}` : metrics.antiJamMarginDb} dB
                </div>
                <div className="text-[10px] text-slate-500">Threshold: &gt; 0 dB Margin</div>
              </div>
            </div>

            {/* Threat & Link Denial Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  Electronic Warfare Tactical Assessment
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.linkDenied
                    ? "bg-red-950 border-red-500/40 text-red-300"
                    : "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                }`}>
                  {metrics.linkDenied ? "COMMUNICATIONS DENIED (JAMMED)" : "LINK PROTECTED & OPERATIONAL"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">SPECTRUM POWER DENSITY ANALYSIS</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  The hostile jammer at {jammerDistKm} km standoff delivers a raw power advantage of <strong className="text-red-400">+{metrics.rawJsDb} dB</strong> over the legitimate signal at the receiver aperture.
                  {metrics.processingGainDb > 0 && (
                    <span> Spread-spectrum modulation injects <strong className="text-purple-400">+{metrics.processingGainDb} dB</strong> of processing gain.</span>
                  )}
                  {metrics.linkDenied ? (
                    <span className="text-red-400 block mt-1">
                      Jammer power overrides the receiver discriminator by {metrics.effectiveJsDb} dB. The link experiences carrier lock loss and continuous packet drops.
                    </span>
                  ) : (
                    <span className="text-emerald-400 block mt-1">
                      Anti-jam processing gain successfully suppresses the jammer below the demodulator thermal noise floor with +{metrics.antiJamMarginDb} dB headroom.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Legitimate Signal Free Space Loss</span>
                  <span className="text-white font-bold">{metrics.fsplLegit} dB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Hostile Jammer Free Space Loss</span>
                  <span className="text-white font-bold">{metrics.fsplJammer} dB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Calculated Burn-Through Standoff</span>
                  <span className="text-cyan-400 font-bold">{metrics.burnThroughKm.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Electronic Warfare Status</span>
                  <span className={`font-bold ${metrics.linkDenied ? "text-red-400" : "text-emerald-400"}`}>
                    {metrics.linkDenied ? "JAMMING SUCCESSFUL" : "ANTI-JAM COUNTERMEASURE CLOSED"}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
