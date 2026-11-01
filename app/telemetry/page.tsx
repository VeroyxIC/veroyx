"use client"

import { useState, useEffect } from "react"
import { useMission } from "@/lib/missionStore"
import { 
  Activity, 
  Battery, 
  Thermometer, 
  Compass, 
  Flame, 
  Zap,
  Gauge,
  Target,
  BarChart2,
  Clock,
  Download
} from "lucide-react"

// Utility to generate random walk data for the sparklines
const generateSparkline = (start: number, variance: number, length: number = 40) => {
  let current = start
  return Array.from({ length }).map(() => {
    current += (Math.random() - 0.5) * variance
    return current
  })
}

export default function TelemetryPage() {
  const { mission, simTimeSec, isPlaying } = useMission()

  // Simulated Time-Series Data Buffers
  const [epsData, setEpsData] = useState(() => generateSparkline(98, 1)) // Battery SoC %
  const [thermalData, setThermalData] = useState(() => generateSparkline(22, 0.5)) // Bus Temp C
  const [adcsData, setAdcsData] = useState(() => generateSparkline(0.05, 0.02)) // Pointing Error Deg
  const [propData, setPropData] = useState(() => generateSparkline(340, 0.1)) // Tank Pressure psia

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setEpsData(prev => [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.5) * 0.5])
      setThermalData(prev => [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.5) * 0.3])
      setAdcsData(prev => [...prev.slice(1), Math.max(0, prev[prev.length - 1] + (Math.random() - 0.5) * 0.05)])
      setPropData(prev => [...prev.slice(1), Math.max(0, prev[prev.length - 1] - Math.random() * 0.05)]) // Pressure only drops
    }, 1000) // 1Hz update rate for the dashboard
    return () => clearInterval(interval)
  }, [isPlaying])

  const renderSparkline = (data: number[], colorClass: string, min: number, max: number) => {
    return (
      <div className="h-16 w-full flex items-end px-0.5 gap-px">
        {data.map((val, idx) => {
          const hPercent = Math.max(5, Math.min(100, ((val - min) / (max - min)) * 100))
          return (
            <div 
              key={idx} 
              className={`flex-1 rounded-t-sm opacity-80 ${colorClass}`} 
              style={{ height: `${hPercent}%` }} 
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 overflow-y-auto bg-slate-950 font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <BarChart2 className="w-6 h-6 text-cyan-400" />
            {mission.name} | Live Telemetry
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-2 uppercase tracking-wider flex items-center gap-4">
            <span>NORAD ID: 60124</span>
            <span>REGIME: {mission.targetOrbit}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> MET: {simTimeSec}s</span>
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:border-cyan-500 text-cyan-400 font-mono text-xs font-bold transition-all flex items-center gap-2">
          <Download className="w-4 h-4" />
          EXPORT CSV
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EPS Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
              <Zap className="w-4 h-4" /> Electrical Power System (EPS)
            </h2>
            <span className="text-xs font-mono bg-amber-950/50 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">NOMINAL</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">BATTERY SoC</span>
              <span className="text-white font-bold">{epsData[epsData.length - 1].toFixed(2)}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">BUS LOAD</span>
              <span className="text-white font-bold">{mission.busPowerW} W</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">PAYLOAD LOAD</span>
              <span className="text-white font-bold">{mission.payloadPowerW} W</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">TOTAL DRAW</span>
              <span className="text-rose-400 font-bold">-{mission.busPowerW + mission.payloadPowerW} W</span>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono mb-1">BATTERY SoC (ROLLING 40s)</div>
          <div className="bg-slate-950 border border-slate-800 rounded pt-2 px-1">
            {renderSparkline(epsData, "bg-amber-500", 90, 100)}
          </div>
        </div>

        {/* TCS Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2 uppercase tracking-wider">
              <Thermometer className="w-4 h-4" /> Thermal Control (TCS)
            </h2>
            <span className="text-xs font-mono bg-emerald-950/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">NOMINAL</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">BUS TEMP (AVERAGE)</span>
              <span className="text-white font-bold">{thermalData[thermalData.length - 1].toFixed(1)} &deg;C</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">ARRAY TEMP</span>
              <span className="text-white font-bold">{(thermalData[thermalData.length - 1] - 4.5).toFixed(1)} &deg;C</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">INTERNAL HEAT DISSIPATION</span>
              <span className="text-rose-400 font-bold">150 W</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">RADIATOR REJECTION</span>
              <span className="text-sky-400 font-bold">-162 W</span>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono mb-1">BUS TEMPERATURE (ROLLING 40s)</div>
          <div className="bg-slate-950 border border-slate-800 rounded pt-2 px-1">
            {renderSparkline(thermalData, "bg-rose-500", 10, 40)}
          </div>
        </div>

        {/* ADCS Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-purple-400 flex items-center gap-2 uppercase tracking-wider">
              <Compass className="w-4 h-4" /> Attitude Control (ADCS)
            </h2>
            <span className="text-xs font-mono bg-emerald-950/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">TRACKING</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">POINTING ERROR</span>
              <span className="text-white font-bold">{adcsData[adcsData.length - 1].toFixed(3)}&deg;</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">SLEW RATE</span>
              <span className="text-white font-bold">0.01 &deg;/s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">RWA SPEED (AVG)</span>
              <span className="text-cyan-400 font-bold">3,540 RPM</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">MODE</span>
              <span className="text-white font-bold">NADIR POINTING</span>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono mb-1">POINTING ERROR &deg; (ROLLING 40s)</div>
          <div className="bg-slate-950 border border-slate-800 rounded pt-2 px-1">
            {renderSparkline(adcsData, "bg-purple-500", 0, 0.2)}
          </div>
        </div>

        {/* Propulsion Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-orange-400 flex items-center gap-2 uppercase tracking-wider">
              <Flame className="w-4 h-4" /> Propulsion & Kinetics
            </h2>
            <span className="text-xs font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700">IDLE</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">TANK PRESSURE</span>
              <span className="text-white font-bold">{propData[propData.length - 1].toFixed(2)} psia</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">PROPELLANT MASS</span>
              <span className="text-white font-bold">{mission.propellantMassKg.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">SYSTEM TYPE</span>
              <span className="text-white font-bold">{mission.propulsionType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">DRY MASS</span>
              <span className="text-white font-bold">{mission.dryMassKg.toFixed(1)} kg</span>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono mb-1">TANK PRESSURE (ROLLING 40s)</div>
          <div className="bg-slate-950 border border-slate-800 rounded pt-2 px-1">
            {renderSparkline(propData, "bg-orange-500", 335, 350)}
          </div>
        </div>

      </div>
    </div>
  )
}
