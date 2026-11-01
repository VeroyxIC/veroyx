"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Activity, Zap, Thermometer, Radio, Gauge, AlertCircle, 
  CheckCircle2, Terminal, RefreshCw, Filter, Layers, Download
} from "lucide-react"

interface TelemetryPoint {
  time: string
  soc: number
  busVolt: number
  arrayCurr: number
  chassisTemp: number
  payloadTemp: number
  rwRpm: number
  tankPress: number
  snr: number
}

export default function TelemetryAnalyticsPage() {
  const [dataStream, setDataStream] = useState<TelemetryPoint[]>([])
  const [activeChannel, setActiveChannel] = useState<"ALL" | "EPS" | "TCS" | "ADCS" | "PROP" | "RF">("ALL")
  const [packetCount, setPacketCount] = useState(148290)
  const [frameLocked, setFrameLocked] = useState(true)
  const [bitrateKbps, setBitrateKbps] = useState(128.0)

  // Live Telemetry Generator (10 Hz stream downsampled for UI buffers)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const timeStr = now.toISOString().substring(14, 21)
      const t = Date.now() / 1000

      const newPoint: TelemetryPoint = {
        time: timeStr,
        soc: 88.4 + Math.sin(t * 0.2) * 4.2,
        busVolt: 28.1 + Math.sin(t * 0.5) * 0.4,
        arrayCurr: 14.2 + Math.cos(t * 0.3) * 1.8,
        chassisTemp: 21.4 + Math.sin(t * 0.1) * 3.8,
        payloadTemp: 18.2 + Math.sin(t * 0.15) * 2.1,
        rwRpm: 3420 + Math.floor(Math.sin(t * 0.8) * 420),
        tankPress: 18.4 - ((Date.now() % 100000) / 100000) * 0.2,
        snr: 16.8 + Math.sin(t * 0.4) * 1.5
      }

      setDataStream(prev => {
        const next = [...prev, newPoint]
        if (next.length > 32) next.shift()
        return next
      })

      setPacketCount(c => c + 1)
      setBitrateKbps(128.0 + (Math.random() * 0.8 - 0.4))
    }, 250)

    return () => clearInterval(interval)
  }, [])

  const current = dataStream[dataStream.length - 1] || {
    time: "--:--:--",
    soc: 88.0,
    busVolt: 28.0,
    arrayCurr: 14.0,
    chassisTemp: 21.0,
    payloadTemp: 18.0,
    rwRpm: 3400,
    tankPress: 18.2,
    snr: 16.5
  }

  // Pure SVG Sparkline Generator
  const renderSparkline = (
    values: number[], 
    color: string, 
    minVal: number, 
    maxVal: number, 
    height = 42
  ) => {
    if (values.length < 2) return null
    const width = 220
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width
      const normalized = (v - minVal) / (maxVal - minVal || 1)
      const clamped = Math.max(0, Math.min(1, normalized))
      const y = height - clamped * (height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(" ")

    return (
      <svg className="w-full h-11 overflow-visible">
        <polyline 
          fill="none" 
          stroke={color} 
          strokeWidth="1.8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          points={points} 
        />
      </svg>
    )
  }

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex flex-col bg-[#020617] font-sans text-slate-100 overflow-y-auto">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" /> Live Telemetry &amp; Diagnostics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-mono text-[10px] font-bold tracking-widest animate-pulse">
              10 HZ STREAM ACTIVE
            </span>
          </div>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-wider mt-1">
            CCSDS Space Packet Protocol Ingestion Engine
          </p>
        </div>

        {/* Telemetry Bus Link Status */}
        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <CheckCircle2 className={`w-3.5 h-3.5 ${frameLocked ? "text-emerald-400" : "text-rose-400"}`} />
            <span className="text-slate-400">FRAME SYNC:</span>
            <span className="text-white font-bold">{frameLocked ? "LOCKED (ASM 0x1ACFFC1D)" : "UNLOCKED"}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">FRAMES: </span>
            <span className="text-cyan-400 font-bold">{packetCount.toLocaleString()}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">THROUGHPUT: </span>
            <span className="text-emerald-400 font-bold">{bitrateKbps.toFixed(1)} kbps</span>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex items-center gap-2 mb-6 font-mono text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        {(["ALL", "EPS", "TCS", "ADCS", "PROP", "RF"] as const).map(ch => (
          <button
            key={ch}
            onClick={() => setActiveChannel(ch)}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              activeChannel === ch 
                ? "bg-cyan-950/80 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* TELEMETRY GAUGES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* EPS Channel */}
        {(activeChannel === "ALL" || activeChannel === "EPS") && (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400 font-mono text-xs">
              <span className="flex items-center gap-2 font-bold text-white"><Zap className="w-4 h-4 text-amber-400" /> BATT SOC</span>
              <span className="text-emerald-400 font-bold">NOMINAL</span>
            </div>
            <div className="text-3xl font-black text-white font-mono mb-2">{current.soc.toFixed(1)} <span className="text-sm font-normal text-slate-400">%</span></div>
            {renderSparkline(dataStream.map(d => d.soc), "#f59e0b", 70, 100)}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-800 pt-2">
              <span>BUS: {current.busVolt.toFixed(1)} V</span>
              <span>SOLAR: {current.arrayCurr.toFixed(1)} A</span>
            </div>
          </div>
        )}

        {/* TCS Channel */}
        {(activeChannel === "ALL" || activeChannel === "TCS") && (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400 font-mono text-xs">
              <span className="flex items-center gap-2 font-bold text-white"><Thermometer className="w-4 h-4 text-cyan-400" /> CHASSIS TEMP</span>
              <span className="text-emerald-400 font-bold">NOMINAL</span>
            </div>
            <div className="text-3xl font-black text-white font-mono mb-2">+{current.chassisTemp.toFixed(1)} <span className="text-sm font-normal text-slate-400">°C</span></div>
            {renderSparkline(dataStream.map(d => d.chassisTemp), "#38bdf8", 10, 35)}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-800 pt-2">
              <span>PAYLOAD: +{current.payloadTemp.toFixed(1)} °C</span>
              <span>HEATER: STANDBY</span>
            </div>
          </div>
        )}

        {/* ADCS Channel */}
        {(activeChannel === "ALL" || activeChannel === "ADCS") && (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400 font-mono text-xs">
              <span className="flex items-center gap-2 font-bold text-white"><Gauge className="w-4 h-4 text-fuchsia-400" /> RW-1 SPEED</span>
              <span className="text-emerald-400 font-bold">LOCKED</span>
            </div>
            <div className="text-3xl font-black text-white font-mono mb-2">{current.rwRpm} <span className="text-sm font-normal text-slate-400">RPM</span></div>
            {renderSparkline(dataStream.map(d => d.rwRpm), "#d946ef", 2500, 4500)}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-800 pt-2">
              <span>POINT ERR: 0.04°</span>
              <span>MOMENTUM: 42%</span>
            </div>
          </div>
        )}

        {/* RF Link Channel */}
        {(activeChannel === "ALL" || activeChannel === "RF") && (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400 font-mono text-xs">
              <span className="flex items-center gap-2 font-bold text-white"><Radio className="w-4 h-4 text-emerald-400" /> DOWNLINK SNR</span>
              <span className="text-emerald-400 font-bold">AOS</span>
            </div>
            <div className="text-3xl font-black text-white font-mono mb-2">{current.snr.toFixed(1)} <span className="text-sm font-normal text-slate-400">dB</span></div>
            {renderSparkline(dataStream.map(d => d.snr), "#10b981", 10, 22)}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-800 pt-2">
              <span>FREQ: 8.2 GHz</span>
              <span>BER: &lt; 1.0e-9</span>
            </div>
          </div>
        )}
      </div>

      {/* LIVE FRAME HEX STREAM LOG */}
      <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-2xl p-6 font-mono text-xs flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>REAL-TIME TELEMETRY FRAME STREAM (DECODED APID 0x0104)</span>
          </div>
          <button 
            onClick={() => {
              const blob = new Blob([JSON.stringify(dataStream, null, 2)], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `vx_telemetry_dump_${Date.now()}.json`
              a.click()
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-[11px] transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Telemetry Log
          </button>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800/80 text-[10px]">
                <th className="pb-2">UTC TIMESTAMP</th>
                <th className="pb-2">APID</th>
                <th className="pb-2">BATT SOC</th>
                <th className="pb-2">BUS VOLTAGE</th>
                <th className="pb-2">CHASSIS TEMP</th>
                <th className="pb-2">RW1 RPM</th>
                <th className="pb-2">SNR</th>
                <th className="pb-2">CRC STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-[11px]">
              {dataStream.slice(-8).reverse().map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-900/30">
                  <td className="py-2 text-slate-400">{p.time}</td>
                  <td className="py-2 text-cyan-400 font-bold">0x0104</td>
                  <td className="py-2 text-white">{p.soc.toFixed(1)}%</td>
                  <td className="py-2 text-slate-300">{p.busVolt.toFixed(2)} V</td>
                  <td className="py-2 text-slate-300">+{p.chassisTemp.toFixed(1)}°C</td>
                  <td className="py-2 text-fuchsia-400">{p.rwRpm}</td>
                  <td className="py-2 text-emerald-400">{p.snr.toFixed(1)} dB</td>
                  <td className="py-2 text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> PASS (0x00)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
