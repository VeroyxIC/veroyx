"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  HardDrive, 
  Radio, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Database,
  Activity,
  Share2
} from "lucide-react"

interface DataPreset {
  name: string
  classType: string
  payloadRawRateMbps: number
  collectionDutyPct: number
  compressionRatio: number
  ssrCapacityGb: number
  downlinkRateMbps: number
  passDurationMin: number
  passesPerDay: number
  description: string
}

const DATA_PRESETS: Record<string, DataPreset> = {
  high_res_optical: {
    name: "Sub-30cm Commercial Optical Recon",
    classType: "Flagship High-Data Smallsat",
    payloadRawRateMbps: 3200, // 3.2 Gbps pushbroom
    collectionDutyPct: 12, // 12% daylight imaging duty
    compressionRatio: 2.8, // CCSDS 122.0 compression
    ssrCapacityGb: 2048, // 2 Terabits (256 GB)
    downlinkRateMbps: 1200, // Ka-band downlink
    passDurationMin: 9.5,
    passesPerDay: 10, // Multi-polar stations (SvalSat + TrollSat)
    description: "High-rate optical pushbroom requiring polar multi-station contact passes to prevent buffer overflow.",
  },
  synthetic_aperture_radar: {
    name: "Tactical X-Band SAR Reconnaissance",
    classType: "Dedicated Defense Radar",
    payloadRawRateMbps: 1800,
    collectionDutyPct: 15,
    compressionRatio: 1.8,
    ssrCapacityGb: 1024,
    downlinkRateMbps: 600, // X-band downlink
    passDurationMin: 8.0,
    passesPerDay: 8,
    description: "All-weather SAR instrument generating continuous phase history data dumped over high-latitude ground networks.",
  },
  iot_mesh_lowrate: {
    name: "IoT / AIS Maritime Domain Smallsat",
    classType: "Constellation Node",
    payloadRawRateMbps: 12,
    collectionDutyPct: 90, // Near continuous listening
    compressionRatio: 1.2,
    ssrCapacityGb: 64,
    downlinkRateMbps: 25,
    passDurationMin: 7.0,
    passesPerDay: 4,
    description: "Low-throughput store-and-forward architecture with small solid-state flash memory footprint.",
  },
}

export default function DataBudgetPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("high_res_optical")
  const [rawRateMbps, setRawRateMbps] = useState<number>(3200)
  const [dutyCyclePct, setDutyCyclePct] = useState<number>(12)
  const [compressionRatio, setCompressionRatio] = useState<number>(2.8)
  const [ssrCapacityGb, setSsrCapacityGb] = useState<number>(2048)
  const [downlinkRateMbps, setDownlinkRateMbps] = useState<number>(1200)
  const [passDurationMin, setPassDurationMin] = useState<number>(9.5)
  const [passesPerDay, setPassesPerDay] = useState<number>(10)

  const preset = DATA_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = DATA_PRESETS[key]
    setSelectedPresetKey(key)
    setRawRateMbps(p.payloadRawRateMbps)
    setDutyCyclePct(p.collectionDutyPct)
    setCompressionRatio(p.compressionRatio)
    setSsrCapacityGb(p.ssrCapacityGb)
    setDownlinkRateMbps(p.downlinkRateMbps)
    setPassDurationMin(p.passDurationMin)
    setPassesPerDay(p.passesPerDay)
  }

  // CCSDS Data Ingestion & Storage Sizing Calculations
  const metrics = useMemo(() => {
    // 1. Effective compressed data generation rate (Mbps)
    const compressedRateMbps = rawRateMbps / Math.max(1, compressionRatio)

    // Average continuous daily production rate (Mbps across 24h)
    const avgContinuousGenRateMbps = compressedRateMbps * (dutyCyclePct / 100)

    // Total daily volume generated (Gigabits & Gigabytes)
    // Bits = rate * 86400 seconds
    const dailyVolumeGeneratedGb = Math.round((avgContinuousGenRateMbps * 86400) * 10) / 10
    const dailyVolumeGeneratedGByte = Math.round((dailyVolumeGeneratedGb / 8) * 10) / 10

    // 2. Downlink Dump Capacity per Pass (Gigabits)
    const passDurationSec = passDurationMin * 60
    // Net transmission efficiency after packet framing & CCSDS headers ~ 92%
    const linkEfficiency = 0.92
    const dumpPerPassGb = Math.round((downlinkRateMbps * passDurationSec * linkEfficiency) * 10) / 10

    // Total daily downlink capacity (Gigabits)
    const dailyDownlinkCapacityGb = Math.round((dumpPerPassGb * passesPerDay) * 10) / 10
    const dailyDownlinkCapacityGByte = Math.round((dailyDownlinkCapacityGb / 8) * 10) / 10

    // 3. Storage Buffer Delta (Net Daily Balance)
    const netDailyBalanceGb = Math.round((dailyVolumeGeneratedGb - dailyDownlinkCapacityGb) * 10) / 10
    const bufferSustainable = netDailyBalanceGb <= 0

    // 4. Peak Storage High-Water Mark (Orbit Peak before dump)
    // Assume worst case: 2 full orbits without contact (~200 minutes)
    const worstCaseGapMinutes = (24 * 60) / Math.max(1, passesPerDay) * 1.5
    const worstCaseAccumulatedGb = Math.round((avgContinuousGenRateMbps * (worstCaseGapMinutes * 60)) * 10) / 10
    const ssrMarginPct = Math.round(((ssrCapacityGb - worstCaseAccumulatedGb) / ssrCapacityGb) * 100)
    const ssrCapacitySufficient = worstCaseAccumulatedGb <= ssrCapacityGb

    return {
      compressedRateMbps: Math.round(compressedRateMbps),
      dailyVolumeGeneratedGb,
      dailyVolumeGeneratedGByte,
      dumpPerPassGb,
      dailyDownlinkCapacityGb,
      dailyDownlinkCapacityGByte,
      netDailyBalanceGb,
      bufferSustainable,
      worstCaseGapMinutes: Math.round(worstCaseGapMinutes),
      worstCaseAccumulatedGb,
      ssrMarginPct,
      ssrCapacitySufficient,
    }
  }, [rawRateMbps, dutyCyclePct, compressionRatio, ssrCapacityGb, downlinkRateMbps, passDurationMin, passesPerDay])

  const exportDataCSV = () => {
    const csv = `SPACECRAFT DATA ARCHITECTURE & SSR DOWNLINK DUMP SPEC
Preset Architecture,${preset.name}
Class,${preset.classType}
Raw Payload Instrument Throughput,${rawRateMbps} Mbps
Collection Duty Cycle,${dutyCyclePct}%
Onboard Compression Ratio,${compressionRatio}:1 (Compressed: ${metrics.compressedRateMbps} Mbps)
Total Daily Data Generated,${metrics.dailyVolumeGeneratedGb} Gb (${metrics.dailyVolumeGeneratedGByte} GB/day)
Downlink RF Throughput,${downlinkRateMbps} Mbps
Ground Pass Duration,${passDurationMin} min (${passesPerDay} passes/day)
Data Volume Dumped Per Pass,${metrics.dumpPerPassGb} Gb / pass
Total Daily Downlink Capacity,${metrics.dailyDownlinkCapacityGb} Gb (${metrics.dailyDownlinkCapacityGByte} GB/day)
Net Daily Storage Balance,${metrics.netDailyBalanceGb} Gb/day (${metrics.bufferSustainable ? "DRAINED / SUSTAINABLE" : "BUFFER ACCUMULATION"})
Solid-State Recorder (SSR) Size,${ssrCapacityGb} Gb (${ssrCapacityGb / 8} GB)
Worst-Case Orbit Contact Gap,${metrics.worstCaseGapMinutes} min
Peak Buffer High-Water Mark,${metrics.worstCaseAccumulatedGb} Gb (${metrics.ssrMarginPct}% Margin)
Buffer Sizing Status,${metrics.ssrCapacitySufficient ? "CLEARED (NO OVERFLOW)" : "BUFFER OVERFLOW RISK"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-data-budget-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <HardDrive className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              CCSDS Solid-State Recorder (SSR) Storage &amp; Downlink Dump Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ON-BOARD DATA &amp; SSR BUDGET
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model instrument payload data generation rates, on-board lossless compression ratios, solid-state recorder (SSR) high-water storage marks, and ground pass downlink dumping capacity.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportDataCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT DATA SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(DATA_PRESETS).map(([k, v]) => (
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
              Payload &amp; Storage Parameters
            </div>

            {/* Raw Instrument Rate */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">RAW SENSOR INGESTION RATE</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={rawRateMbps}
                  onChange={(e) => setRawRateMbps(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">Mbps</span>
              </div>
            </div>

            {/* Collection Duty Cycle & Compression */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DUTY CYCLE</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={dutyCyclePct}
                    onChange={(e) => setDutyCyclePct(Math.max(1, Math.min(100, Number(e.target.value))))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">COMPRESSION</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={compressionRatio}
                    onChange={(e) => setCompressionRatio(Math.max(1.0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">:1</span>
                </div>
              </div>
            </div>

            {/* Solid State Recorder Capacity */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">SSR STORAGE BUFFER CAPACITY</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={ssrCapacityGb}
                  onChange={(e) => setSsrCapacityGb(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">Gb</span>
              </div>
              <span className="text-[10px] text-slate-500">Equates to {(ssrCapacityGb / 8).toFixed(0)} Gigabytes (GB)</span>
            </div>

            {/* Downlink Parameters */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Ground Downlink Contact Geometry
              </span>

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">RF DOWNLINK SPEED (Mbps)</span>
                  <input
                    type="number"
                    value={downlinkRateMbps}
                    onChange={(e) => setDownlinkRateMbps(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">PASS TIME (MIN)</span>
                    <input
                      type="number"
                      step={0.5}
                      value={passDurationMin}
                      onChange={(e) => setPassDurationMin(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">PASSES / DAY</span>
                    <input
                      type="number"
                      value={passesPerDay}
                      onChange={(e) => setPassesPerDay(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
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
                  <Database className="w-3 h-3 text-cyan-400" /> DAILY DATA GENERATED
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.dailyVolumeGeneratedGByte} GB</div>
                <div className="text-[10px] text-slate-500">{metrics.dailyVolumeGeneratedGb} Gigabits / day</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Radio className="w-3 h-3 text-purple-400" /> DAILY DOWNLINK CAPACITY
                </div>
                <div className="text-3xl font-black text-white">{metrics.dailyDownlinkCapacityGByte} GB</div>
                <div className="text-[10px] text-purple-400">{metrics.dumpPerPassGb} Gb dumped per pass</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.bufferSustainable ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  NET STORAGE BALANCE
                </div>
                <div className={`text-3xl font-black ${metrics.bufferSustainable ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.bufferSustainable ? "DRAINED" : "OVERFLOW"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {metrics.netDailyBalanceGb <= 0 ? "Throughput Surplus" : `+${metrics.netDailyBalanceGb} Gb/day accumulation`}
                </div>
              </div>
            </div>

            {/* Data Architecture & Buffer Margins Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  SSR Buffer Sizing &amp; High-Water Mark Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.ssrCapacitySufficient && metrics.bufferSustainable
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.ssrCapacitySufficient && metrics.bufferSustainable
                    ? "DATA ARCHITECTURE VERIFIED"
                    : "DATA BOTTLENECK RISK"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">GROUND STATION CONTACT MARGIN</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  During a worst-case orbital gap of <strong className="text-white">{metrics.worstCaseGapMinutes} minutes</strong> between ground contacts, the payload fills the solid-state recorder to a peak high-water mark of <strong className="text-cyan-400">{metrics.worstCaseAccumulatedGb} Gb</strong>, preserving a <strong className="text-emerald-400">{metrics.ssrMarginPct}% headroom margin</strong> on the {ssrCapacityGb} Gb recorder.
                  {!metrics.bufferSustainable && (
                    <span className="text-red-400 block mt-1">
                      Downlink deficit: Daily generation exceeds ground contact capacity by {metrics.netDailyBalanceGb} Gb/day. Either contract additional ground station passes (e.g., KSAT / AWS Ground Station) or increase downlink throughput.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Compressed Stream Rate into Recorder</span>
                  <span className="text-white font-bold">{metrics.compressedRateMbps} Mbps (after {compressionRatio}:1 compression)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Dump Volume per Individual Ground Pass</span>
                  <span className="text-cyan-400 font-bold">{metrics.dumpPerPassGb} Gb ({(metrics.dumpPerPassGb / 8).toFixed(1)} GB) in {passDurationMin} min</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Worst-Case Inter-Contact Gap Accumulation</span>
                  <span className="text-purple-400 font-bold">{metrics.worstCaseAccumulatedGb} Gb ({metrics.ssrMarginPct}% buffer margin)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Solid-State Storage (SSR) Size</span>
                  <span className="text-slate-300 font-bold">{ssrCapacityGb} Gb ({(ssrCapacityGb / 8).toFixed(0)} Gigabytes)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Data Architecture Flow-Balance Verdict</span>
                  <span className={`font-bold ${metrics.bufferSustainable ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.bufferSustainable ? "PASS (DAILY BUFFER EMPTIED)" : "FAIL (DATA RETENTION DEFICIT)"}
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
