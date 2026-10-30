"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Radio, 
  Wifi, 
  Gauge, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Satellite, 
  Download 
} from "lucide-react"

interface FrequencyPreset {
  name: string
  freqGhz: number
  description: string
  rainFadeTypicalDb: number
}

const FREQUENCY_BANDS: Record<string, FrequencyPreset> = {
  s_band: { name: "S-Band (2.2 GHz)", freqGhz: 2.2, description: "TT&C, Space Operations", rainFadeTypicalDb: 0.3 },
  x_band: { name: "X-Band (8.4 GHz)", freqGhz: 8.4, description: "Deep Space & SAR Payload Downlink", rainFadeTypicalDb: 1.2 },
  ku_band: { name: "Ku-Band (12.0 GHz)", freqGhz: 12.0, description: "Direct Broadcast & Enterprise VSAT", rainFadeTypicalDb: 2.5 },
  ka_band: { name: "Ka-Band (28.0 GHz)", freqGhz: 28.0, description: "High-Throughput Mega-Constellations", rainFadeTypicalDb: 5.8 },
}

export default function RFLinkBudgetPage() {
  const [bandKey, setBandKey] = useState<string>("ka_band")
  const [txPowerW, setTxPowerW] = useState<number>(25)
  const [txAntennaGainDb, setTxAntennaGainDb] = useState<number>(32)
  const [dataRateMbps, setDataRateMbps] = useState<number>(150)
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [elevationDeg, setElevationDeg] = useState<number>(25)
  const [rxDishDiameterM, setRxDishDiameterM] = useState<number>(2.4)

  const band = FREQUENCY_BANDS[bandKey]

  const metrics = useMemo(() => {
    const c = 299792458
    const earthRadiusKm = 6378.1
    const kDbw = -228.6

    const elRad = (elevationDeg * Math.PI) / 180
    const re = earthRadiusKm
    const rOrbit = re + altitudeKm
    const slantRangeKm = Math.round(
      re * (Math.sqrt(Math.pow((rOrbit / re), 2) - Math.pow(Math.cos(elRad), 2)) - Math.sin(elRad))
    )

    const fsplDb = 20 * Math.log10(slantRangeKm) + 20 * Math.log10(band.freqGhz) + 92.45
    const txPowerDbw = 10 * Math.log10(Math.max(0.1, txPowerW))
    const eirpDbw = txPowerDbw + txAntennaGainDb - 1.0

    const wavelengthM = c / (band.freqGhz * 1e9)
    const rxGainDb = 10 * Math.log10(0.60 * Math.pow((Math.PI * rxDishDiameterM) / wavelengthM, 2))

    const totalLossDb = fsplDb + band.rainFadeTypicalDb + 0.8
    const systemNoiseTempK = 180
    const gOverTDb = rxGainDb - 10 * Math.log10(systemNoiseTempK)

    const receivedPowerDbw = eirpDbw - totalLossDb + rxGainDb
    const cOverN0DbHz = eirpDbw - totalLossDb + gOverTDb - kDbw

    const dataRateDbHz = 10 * Math.log10(dataRateMbps * 1e6)
    const ebOverN0Db = cOverN0DbHz - dataRateDbHz

    const requiredEbN0Db = 6.5
    const linkMarginDb = ebOverN0Db - requiredEbN0Db

    return {
      slantRangeKm,
      fsplDb: fsplDb.toFixed(2),
      eirpDbw: eirpDbw.toFixed(1),
      rxGainDb: rxGainDb.toFixed(1),
      gOverTDb: gOverTDb.toFixed(1),
      receivedPowerDbw: receivedPowerDbw.toFixed(1),
      cOverN0DbHz: cOverN0DbHz.toFixed(1),
      ebOverN0Db: ebOverN0Db.toFixed(1),
      linkMarginDb: linkMarginDb.toFixed(1),
      isClosed: linkMarginDb > 0,
      isRobust: linkMarginDb >= 3.0,
      txPowerDbwStr: txPowerDbw.toFixed(1),
      rainLossStr: (band.rainFadeTypicalDb + 0.8).toFixed(1),
    }
  }, [band, txPowerW, txAntennaGainDb, dataRateMbps, altitudeKm, elevationDeg, rxDishDiameterM])

  const exportBudgetCSV = () => {
    const csv = `Parameter,Value,Unit
Frequency Band,${band.name},GHz
Orbital Altitude,${altitudeKm},km
Elevation Angle,${elevationDeg},deg
Slant Range,${metrics.slantRangeKm},km
Transmitter RF Power,${txPowerW},W
Transmitter EIRP,${metrics.eirpDbw},dBW
Free Space Path Loss,${metrics.fsplDb},dB
Rain Fade,${band.rainFadeTypicalDb},dB
Ground Dish Diameter,${rxDishDiameterM},m
Ground Dish Gain,${metrics.rxGainDb},dBi
Figure of Merit (G/T),${metrics.gOverTDb},dB/K
Data Rate,${dataRateMbps},Mbps
C/N0,${metrics.cOverN0DbHz},dB-Hz
Eb/N0,${metrics.ebOverN0Db},dB
Link Margin,${metrics.linkMarginDb},dB
Status,${metrics.isRobust ? "ROBUST (+3dB)" : metrics.isClosed ? "CLOSED (MARGINAL)" : "LINK FAILED"},`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-rf-link-budget.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Friis Transmission & Telemetry Link Budget Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              RF DOWNLINK BUDGET CALCULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Calculate free-space path loss, atmospheric attenuation, parabolic antenna gain, carrier-to-noise density (C/N0), and link closure margins across orbital frequency bands.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportBudgetCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT LINK SPEC
            </button>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Inputs */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              RF Transmission Parameters
            </div>

            {/* Spectrum Band */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">OPERATING FREQUENCY BAND</label>
              <select
                value={bandKey}
                onChange={(e) => setBandKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                {Object.entries(FREQUENCY_BANDS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-slate-500">{band.description}</div>
            </div>

            {/* Transmitter Power Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">SATELLITE RF POWER</label>
                <span className="text-cyan-400 font-bold">{txPowerW} WATTS</span>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                value={txPowerW}
                onChange={(e) => setTxPowerW(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>5W (CubeSat)</span>
                <span>50W</span>
                <span>200W (High-Power Geo)</span>
              </div>
            </div>

            {/* Spacecraft Antenna Gain */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SPACECRAFT TX ANTENNA GAIN</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={txAntennaGainDb}
                  onChange={(e) => setTxAntennaGainDb(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">dBi</span>
              </div>
            </div>

            {/* Desired Throughput */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">TARGET DOWNLINK DATA RATE</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dataRateMbps}
                  onChange={(e) => setDataRateMbps(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">Mbps</span>
              </div>
            </div>

            {/* Ground Dish Aperture */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">GROUND STATION DISH DIAMETER</label>
                <span className="text-purple-400 font-bold">{rxDishDiameterM} METERS</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={12}
                step={0.1}
                value={rxDishDiameterM}
                onChange={(e) => setRxDishDiameterM(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5m (User Terminal)</span>
                <span>2.4m (Standard GS)</span>
                <span>12m (Gateway Hub)</span>
              </div>
            </div>

            {/* Elevation Angle */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">GROUND STATION ELEVATION</label>
                <span className="text-emerald-400 font-bold">{elevationDeg}&deg;</span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                value={elevationDeg}
                onChange={(e) => setElevationDeg(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>5&deg; (Horizon Limit)</span>
                <span>45&deg;</span>
                <span>90&deg; (Zenith Peak)</span>
              </div>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Big KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> SLANT RANGE
                </div>
                <div className="text-2xl font-black text-cyan-400">{metrics.slantRangeKm.toLocaleString()} km</div>
                <div className="text-[10px] text-slate-500">Altitude: {altitudeKm} km</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-purple-400" /> PATH LOSS (FSPL)
                </div>
                <div className="text-2xl font-black text-white">{metrics.fsplDb} dB</div>
                <div className="text-[10px] text-slate-500">+{band.rainFadeTypicalDb} dB Rain Fade</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.isClosed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  LINK CLOSURE MARGIN
                </div>
                <div className={`text-2xl font-black ${metrics.isRobust ? "text-emerald-400" : metrics.isClosed ? "text-amber-400" : "text-red-400"}`}>
                  {metrics.linkMarginDb} dB
                </div>
                <div className="text-[10px] text-slate-500">Required: +6.5 dB Eb/N0</div>
              </div>
            </div>

            {/* Link Budget Breakdown Table */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  Detailed Telemetry Link Budget Breakdown
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  metrics.isRobust
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : metrics.isClosed
                    ? "bg-amber-950 border-amber-500/40 text-amber-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.isRobust ? "ROBUST (+3 dB MARGIN)" : metrics.isClosed ? "CLOSED (MARGINAL)" : "LINK FAILED"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Transmitter Output Power (P_tx)</span>
                  <span className="text-white font-bold">{txPowerW} W ({metrics.txPowerDbwStr} dBW)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Equivalent Isotropically Radiated Power (EIRP)</span>
                  <span className="text-cyan-400 font-bold">{metrics.eirpDbw} dBW</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Free Space Path Loss (FSPL)</span>
                  <span className="text-red-400 font-bold">-{metrics.fsplDb} dB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Atmospheric &amp; Rain Attenuation</span>
                  <span className="text-red-400 font-bold">-{metrics.rainLossStr} dB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Ground Terminal Antenna Gain (G_rx)</span>
                  <span className="text-purple-400 font-bold">+{metrics.rxGainDb} dBi</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Receiver Figure of Merit (G/T)</span>
                  <span className="text-purple-400 font-bold">{metrics.gOverTDb} dB/K</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Received Power (P_rx)</span>
                  <span className="text-slate-200 font-bold">{metrics.receivedPowerDbw} dBW</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Carrier-to-Noise Density (C/N0)</span>
                  <span className="text-emerald-400 font-bold">{metrics.cOverN0DbHz} dB-Hz</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Energy per Bit to Noise Density (Eb/N0)</span>
                  <span className="text-white font-bold">{metrics.ebOverN0Db} dB</span>
                </div>
                <div className="flex justify-between py-2 bg-slate-950/80 px-3 rounded-lg border border-slate-800 font-bold">
                  <span className="text-white">NET LINK MARGIN</span>
                  <span className={metrics.isClosed ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>
                    {metrics.linkMarginDb} dB
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
