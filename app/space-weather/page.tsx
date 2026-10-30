"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Sun, 
  Compass, 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  ArrowRight, 
  Gauge, 
  Wind, 
  Zap, 
  Radio, 
  Globe 
} from "lucide-react"

interface SpaceWeatherPreset {
  name: string
  solarCyclePhase: string
  f107Sfu: number
  kpIndex: number
  apIndex: number
  protonFluxPfU: number // >10 MeV protons / (cm2*s*sr)
  xrayFlareClass: "Quiet (< C1)" | "Moderate (C1 - M1)" | "Severe (M5 - X1)" | "Extreme (> X10)"
  description: string
}

const WEATHER_PRESETS: Record<string, SpaceWeatherPreset> = {
  solar_maximum_storm: {
    name: "Solar Maximum Geomagnetic Storm (G3 / S2)",
    solarCyclePhase: "Solar Maximum Peak",
    f107Sfu: 220,
    kpIndex: 7.0,
    apIndex: 110,
    protonFluxPfU: 450,
    xrayFlareClass: "Severe (M5 - X1)",
    description: "Intense coronal mass ejection impact producing high thermospheric drag expansion and energetic proton SEU risk.",
  },
  solar_minimum_quiet: {
    name: "Solar Minimum Baseline (Quiet Sun)",
    solarCyclePhase: "Solar Minimum Baseline",
    f107Sfu: 72,
    kpIndex: 1.5,
    apIndex: 5,
    protonFluxPfU: 0.8,
    xrayFlareClass: "Quiet (< C1)",
    description: "Contracted upper atmosphere with minimum aerodynamic drag, but peak galactic cosmic ray (GCR) background flux.",
  },
  halloween_carrington_extreme: {
    name: "Extreme Solar Superstorm (G5 / S4 Carrington Analogue)",
    solarCyclePhase: "Extreme Super-Flare Event",
    f107Sfu: 310,
    kpIndex: 9.0,
    apIndex: 380,
    protonFluxPfU: 12500,
    xrayFlareClass: "Extreme (> X10)",
    description: "Historical benchmark event causing severe dielectric charging, global RF blackouts, and emergency safe-mode triggers.",
  },
}

export default function SpaceWeatherPage() {
  const [selectedKey, setSelectedKey] = useState<string>("solar_maximum_storm")
  const [f107Sfu, setF107Sfu] = useState<number>(220)
  const [kpIndex, setKpIndex] = useState<number>(7.0)
  const [protonFluxPfU, setProtonFluxPfU] = useState<number>(450)
  const [targetAltitudeKm, setTargetAltitudeKm] = useState<number>(500)

  const activePreset = WEATHER_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = WEATHER_PRESETS[key]
    setSelectedKey(key)
    setF107Sfu(p.f107Sfu)
    setKpIndex(p.kpIndex)
    setProtonFluxPfU(p.protonFluxPfU)
  }

  // Atmospheric Density & Space Weather Operational Impact Models
  const metrics = useMemo(() => {
    // 1. Thermospheric Expansion Ratio based on F10.7
    // Baseline F10.7 = 70 sfu
    const dragMultiplier = Math.round(Math.pow(f107Sfu / 70, 1.45) * 10) / 10

    // 2. Local Atmospheric Density at Altitude (kg/m3)
    // Scale height expands with high F10.7
    const baseDensity = 6.0e-12 * Math.exp(-(targetAltitudeKm - 400) / 55.0)
    const effectiveDensity = baseDensity * dragMultiplier

    // 3. NOAA Space Weather Scale Categorization
    // Geomagnetic Storm (G-Scale based on Kp)
    let gScale = "G0 (Quiet)"
    if (kpIndex >= 9) gScale = "G5 (Extreme Storm)"
    else if (kpIndex >= 8) gScale = "G4 (Severe Storm)"
    else if (kpIndex >= 7) gScale = "G3 (Strong Storm)"
    else if (kpIndex >= 6) gScale = "G2 (Moderate Storm)"
    else if (kpIndex >= 5) gScale = "G1 (Minor Storm)"

    // Solar Radiation Storm (S-Scale based on >10 MeV Proton Flux)
    let sScale = "S0 (Quiet)"
    if (protonFluxPfU >= 100000) sScale = "S5 (Extreme)"
    else if (protonFluxPfU >= 10000) sScale = "S4 (Severe)"
    else if (protonFluxPfU >= 1000) sScale = "S3 (Strong)"
    else if (protonFluxPfU >= 100) sScale = "S2 (Moderate)"
    else if (protonFluxPfU >= 10) sScale = "S1 (Minor)"

    // 4. Mission Operational Hazard Assessment
    const highDragAlert = dragMultiplier >= 2.5
    const seuRiskElevated = protonFluxPfU >= 100
    const chargingHazard = kpIndex >= 6.0

    return {
      dragMultiplier,
      effectiveDensity: effectiveDensity.toExponential(2),
      gScale,
      sScale,
      highDragAlert,
      seuRiskElevated,
      chargingHazard,
    }
  }, [f107Sfu, kpIndex, protonFluxPfU, targetAltitudeKm])

  const exportWeatherCSV = () => {
    const csv = `SPACECRAFT SPACE WEATHER & HELIOSPHERIC TELEMETRY
Scenario Profile,${activePreset.name}
Solar Cycle Regime,${activePreset.solarCyclePhase}
Solar 10.7cm Radio Flux (F10.7),${f107Sfu} sfu
Planetary Kp Index,${kpIndex}
NOAA Geomagnetic Storm Level,${metrics.gScale}
Solar Proton Flux (>10 MeV),${protonFluxPfU} pfu
NOAA Radiation Storm Level,${metrics.sScale}
Monitored Orbit Altitude,${targetAltitudeKm} km
Thermospheric Drag Expansion Factor,${metrics.dragMultiplier}x normal baseline
Effective Atmospheric Density,${metrics.effectiveDensity} kg/m3
Avionics SEU Bit-Flip Risk,${metrics.seuRiskElevated ? "ELEVATED (AUTONOMOUS SCRUB REQUIRED)" : "NORMAL BASELINE"}
Spacecraft Charging Alert,${metrics.chargingHazard ? "CRITICAL ESD DISCHARGE HAZARD" : "NOMINAL"}
Aerodynamic Altitude Drop Warning,${metrics.highDragAlert ? "ACCELERATED ORBIT DECAY" : "STANDARD TRACK"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-space-weather-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Sun className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              NOAA Space Weather Scales &amp; Dynamic Atmospheric Density Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SPACE WEATHER &amp; OPERATIONS
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model real-time solar radio flux ($F_{10.7}$), geomagnetic storm indices ($Kp$), energetic proton flux ($pfu$), and thermospheric drag expansions across operational satellite orbits.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportWeatherCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT WEATHER SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(WEATHER_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" /> SOLAR FLUX (F10.7)
            </div>
            <div className="text-3xl font-black text-amber-400">{f107Sfu} sfu</div>
            <div className="text-[10px] text-slate-400">{metrics.dragMultiplier}x Thermospheric Expansion</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" /> GEOMAGNETIC INDEX
            </div>
            <div className="text-3xl font-black text-cyan-400">Kp {kpIndex}</div>
            <div className="text-[10px] text-slate-400">{metrics.gScale}</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-purple-400" /> PROTON FLUX (&gt;10 MeV)
            </div>
            <div className="text-3xl font-black text-purple-400">{protonFluxPfU} pfu</div>
            <div className="text-[10px] text-slate-400">{metrics.sScale}</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Wind className="w-3 h-3 text-rose-400" /> AIR DENSITY @ {targetAltitudeKm}KM
            </div>
            <div className="text-3xl font-black text-white">{metrics.effectiveDensity}</div>
            <div className="text-[10px] text-slate-400">kg / m³ in upper thermosphere</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Heliospheric Conditions
            </div>

            {/* F10.7 Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">SOLAR RADIO FLUX (F10.7)</label>
                <span className="text-amber-400 font-bold">{f107Sfu} SFU</span>
              </div>
              <input
                type="range"
                min={65}
                max={350}
                step={5}
                value={f107Sfu}
                onChange={(e) => setF107Sfu(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>70 (Min)</span>
                <span>150 (Nominal)</span>
                <span>350 (Extreme)</span>
              </div>
            </div>

            {/* Kp Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">GEOMAGNETIC KP INDEX</label>
                <span className="text-cyan-400 font-bold">Kp {kpIndex}</span>
              </div>
              <input
                type="range"
                min={0}
                max={9}
                step={0.5}
                value={kpIndex}
                onChange={(e) => setKpIndex(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 (Quiet)</span>
                <span>5 (Storm Minor)</span>
                <span>9 (Extreme)</span>
              </div>
            </div>

            {/* Proton Flux Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">SOLAR PROTON FLUX</label>
                <span className="text-purple-400 font-bold">{protonFluxPfU} PFU</span>
              </div>
              <input
                type="range"
                min={1}
                max={20000}
                step={50}
                value={protonFluxPfU}
                onChange={(e) => setProtonFluxPfU(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">&gt;10 MeV energetic protons / (cm²&middot;s&middot;sr)</span>
            </div>

            {/* Monitored Altitude */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">MONITORED ORBIT ALTITUDE</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={25}
                  value={targetAltitudeKm}
                  onChange={(e) => setTargetAltitudeKm(Math.max(200, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">km</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">OPERATIONAL TELEMETRY:</strong>
              Dynamic solar flux actively feeds into aerodynamic drag decay, ATOX surface erosion, and spacecraft electrostatic charging risk.
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hazard Assessment Panel */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  Flight Hazard &amp; Subsystem Vulnerability Audit
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  !metrics.chargingHazard && !metrics.highDragAlert
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {!metrics.chargingHazard && !metrics.highDragAlert ? "NOMINAL SPACE WEATHER" : "ACTIVE SPACE WEATHER ALERT"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-4 rounded-xl border space-y-1 ${
                  metrics.highDragAlert ? "bg-amber-950/30 border-amber-500/40" : "bg-slate-950/70 border-slate-800"
                }`}>
                  <div className="text-[10px] text-slate-400 uppercase">ORBITAL DRAG DECAY</div>
                  <div className={`text-base font-bold ${metrics.highDragAlert ? "text-amber-400" : "text-emerald-400"}`}>
                    {metrics.highDragAlert ? "EXPANDED DRAG (HIGH)" : "BASELINE DRAG"}
                  </div>
                  <div className="text-[10px] text-slate-400">{metrics.dragMultiplier}x density multiplier</div>
                </div>

                <div className={`p-4 rounded-xl border space-y-1 ${
                  metrics.seuRiskElevated ? "bg-purple-950/30 border-purple-500/40" : "bg-slate-950/70 border-slate-800"
                }`}>
                  <div className="text-[10px] text-slate-400 uppercase">AVIONICS SEU RISK</div>
                  <div className={`text-base font-bold ${metrics.seuRiskElevated ? "text-purple-400" : "text-emerald-400"}`}>
                    {metrics.seuRiskElevated ? "ELEVATED FLUX" : "QUIET BACKGROUND"}
                  </div>
                  <div className="text-[10px] text-slate-400">Proton storm {metrics.sScale}</div>
                </div>

                <div className={`p-4 rounded-xl border space-y-1 ${
                  metrics.chargingHazard ? "bg-rose-950/30 border-rose-500/40" : "bg-slate-950/70 border-slate-800"
                }`}>
                  <div className="text-[10px] text-slate-400 uppercase">DIELECTRIC CHARGING</div>
                  <div className={`text-base font-bold ${metrics.chargingHazard ? "text-rose-400" : "text-emerald-400"}`}>
                    {metrics.chargingHazard ? "ESD DISCHARGE RISK" : "NOMINAL POTENTIAL"}
                  </div>
                  <div className="text-[10px] text-slate-400">Storm level {metrics.gScale}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  At <strong className="text-white">{targetAltitudeKm} km</strong>, solar radio flux of <strong className="text-amber-400">{f107Sfu} sfu</strong> heats and inflates the upper thermosphere, yielding an atmospheric density of <strong className="text-white">{metrics.effectiveDensity} kg/m³</strong> (<strong className="text-amber-400">{metrics.dragMultiplier}x normal quiet-sun levels</strong>). 
                  Stations operating in this regime will experience rapid orbital decay, requiring compensatory propulsive stationkeeping burns.
                </p>
                {metrics.chargingHazard && (
                  <p className="text-rose-300">
                    Geomagnetic storm state (<strong className="text-rose-400">{metrics.gScale}</strong>) accelerates auroral electrons into magnetospheric field lines. Ground operations should monitor spacecraft chassis differential charging and suspend critical firmware uplinks.
                  </p>
                )}
              </div>
            </div>

            {/* Direct Links to Impacted Engines */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                IMPACTED SIMULATION KERNELS:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/decay" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/decay (Orbit)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/atox" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/atox (Erosion)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/plasma" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/plasma (Charging)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/rad" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/rad (TID / SEU)</span>
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
