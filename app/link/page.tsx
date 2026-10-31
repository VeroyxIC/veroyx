"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import { 
  Radio, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Sliders, 
  Activity, 
  Signal, 
  Globe 
} from "lucide-react"

export default function LinkBudgetPage() {
  const { mission } = useMission()

  // RF Link Input Parameters
  const [carrierGhz, setCarrierGhz] = useState<number>(8.45) // X-Band
  const [txPowerW, setTxPowerW] = useState<number>(10.0)
  const [txAntennaDiaM, setTxAntennaDiaM] = useState<number>(0.35) // 35 cm dish/patch array
  const [rxAntennaDiaM, setRxAntennaDiaM] = useState<number>(11.3) // 11m KSAT/DSN dish
  const [bitrateMbps, setBitrateMbps] = useState<number>(350.0)
  const [minElevationDeg, setMinElevationDeg] = useState<number>(5.0)

  // Calculations
  const calc = useMemo(() => {
    const fHz = carrierGhz * 1e9
    const c = 299792458
    const lambda = c / fHz
    const rEarthKm = 6378.137
    const elRad = (minElevationDeg * Math.PI) / 180

    // Maximum slant range at mask elevation
    const slantRangeKm = rEarthKm * (Math.sqrt(Math.pow((mission.altitudeKm + rEarthKm) / rEarthKm, 2) - Math.pow(Math.cos(elRad), 2)) - Math.sin(elRad))
    const slantRangeM = slantRangeKm * 1000

    // FSPL (dB)
    const fsplDb = 20 * Math.log10((4 * Math.PI * slantRangeM) / lambda)

    // Antenna Gains (assuming 55% aperture efficiency)
    const txGainDbi = 10 * Math.log10(0.55 * Math.pow((Math.PI * txAntennaDiaM) / lambda, 2))
    const rxGainDbi = 10 * Math.log10(0.55 * Math.pow((Math.PI * rxAntennaDiaM) / lambda, 2))

    // EIRP
    const txPowerDbw = 10 * Math.log10(txPowerW)
    const eirpDbw = txPowerDbw + txGainDbi

    // Thermal noise (135 K cooled LNA)
    const kDbw = -228.6
    const tSysK = 135
    const tSysDbk = 10 * Math.log10(tSysK)

    // Losses & Bitrate
    const bitRateDbHz = 10 * Math.log10(bitrateMbps * 1e6)
    const atmosphericLossDb = 0.8
    const pointingLossDb = 0.6

    // Received Eb/N0
    const prDbw = eirpDbw - fsplDb - atmosphericLossDb - pointingLossDb + rxGainDbi
    const ebN0ReceivedDb = prDbw - kDbw - tSysDbk - bitRateDbHz
    const ebN0RequiredDb = 10.5 // QPSK rate 3/4 with flight margin
    const linkMarginDb = Math.round((ebN0ReceivedDb - ebN0RequiredDb) * 10) / 10

    return {
      slantRangeKm: Math.round(slantRangeKm),
      fsplDb: Math.round(fsplDb * 10) / 10,
      txGainDbi: Math.round(txGainDbi * 10) / 10,
      rxGainDbi: Math.round(rxGainDbi * 10) / 10,
      eirpDbw: Math.round(eirpDbw * 10) / 10,
      ebN0ReceivedDb: Math.round(ebN0ReceivedDb * 10) / 10,
      linkMarginDb,
      isClosed: linkMarginDb >= 3.0
    }
  }, [carrierGhz, txPowerW, txAntennaDiaM, rxAntennaDiaM, bitrateMbps, minElevationDeg, mission])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              CCSDS 401.0-B RF Downlink &amp; Telecommunications Closure
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              RF LINK BUDGET
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Calculate free-space path loss, atmospheric attenuation, ground terminal G/T, and received $E_b/N_0$ carrier margin across X-band, S-band, and Ka-band downlinks.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={`px-3.5 py-2 rounded-lg font-bold border ${
              calc.isClosed 
                ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
                : "bg-red-950 border-red-500/50 text-red-300"
            }`}>
              {calc.isClosed ? `LINK CLOSED (+${calc.linkMarginDb} dB)` : `MARGIN DEFICIT (${calc.linkMarginDb} dB)`}
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">LINK MARGIN</div>
            <div className={`text-3xl font-black ${calc.isClosed ? "text-emerald-400" : "text-red-400"}`}>
              +{calc.linkMarginDb} dB
            </div>
            <div className="text-[10px] text-slate-400">Flight Req: &ge; +3.0 dB</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">MAX SLANT RANGE</div>
            <div className="text-3xl font-black text-white">{calc.slantRangeKm} km</div>
            <div className="text-[10px] text-slate-400">{minElevationDeg}&deg; Elevation Mask ({mission.altitudeKm} km Alt)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">PATH LOSS (FSPL)</div>
            <div className="text-3xl font-black text-amber-400">{calc.fsplDb} dB</div>
            <div className="text-[10px] text-slate-400">Free-Space Attenuation</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">RECEIVED Eb/N0</div>
            <div className="text-3xl font-black text-purple-400">{calc.ebN0ReceivedDb} dB</div>
            <div className="text-[10px] text-slate-400">Req: 10.5 dB (QPSK Rate 3/4)</div>
          </div>
        </div>

        {/* Slider Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3 font-bold text-white uppercase flex items-center gap-2">
              <Signal className="w-4 h-4 text-cyan-400" /> Carrier &amp; Power
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">FREQUENCY</span>
                <span className="text-cyan-400 font-bold">{carrierGhz} GHz</span>
              </div>
              <input
                type="range"
                min={2.2}
                max={30.0}
                step={0.05}
                value={carrierGhz}
                onChange={e => setCarrierGhz(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>2.2 GHz (S-Band)</span>
                <span>8.45 GHz (X-Band)</span>
                <span>26 GHz (Ka)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">TRANSMITTER RF POWER</span>
                <span className="text-cyan-400 font-bold">{txPowerW} W</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={txPowerW}
                onChange={e => setTxPowerW(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3 font-bold text-white uppercase flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" /> Antenna Sizing
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">SPACECRAFT ANTENNA DIA</span>
                <span className="text-purple-400 font-bold">{(txAntennaDiaM * 100).toFixed(0)} cm ({calc.txGainDbi} dBi)</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.5}
                step={0.05}
                value={txAntennaDiaM}
                onChange={e => setTxAntennaDiaM(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">GROUND DISH DIA</span>
                <span className="text-purple-400 font-bold">{rxAntennaDiaM} m ({calc.rxGainDbi} dBi)</span>
              </div>
              <input
                type="range"
                min={3.0}
                max={34.0}
                step={0.5}
                value={rxAntennaDiaM}
                onChange={e => setRxAntennaDiaM(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>7.3m KSAT</span>
                <span>11.3m Standard</span>
                <span>34m DSN</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3 font-bold text-white uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> Throughput Demand
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">PAYLOAD DOWNLINK RATE</span>
                <span className="text-amber-400 font-bold">{bitrateMbps} Mbps</span>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={bitrateMbps}
                onChange={e => setBitrateMbps(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-sans text-slate-400 space-y-1">
              <strong className="text-cyan-400 font-mono block">EIRP RADIATED:</strong>
              The onboard RF front-end radiates <strong className="text-white">{calc.eirpDbw} dBW</strong> EIRP. At a minimum elevation of {minElevationDeg}&deg;, link closure is <strong className={calc.isClosed ? "text-emerald-400" : "text-red-400"}>{calc.isClosed ? "VERIFIED" : "DEGRADED"}</strong>.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
