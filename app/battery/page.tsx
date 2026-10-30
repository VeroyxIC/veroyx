"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  BatteryCharging, 
  Sun, 
  Moon, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Zap,
  Activity,
  Battery
} from "lucide-react"

interface BatteryPreset {
  name: string
  classType: string
  orbitType: "LEO (500 km)" | "SSO Sun-Sync (600 km)" | "GEO (35,786 km)" | "Lunar Gateway / NRHO"
  altitudeKm: number
  eclipseMinutes: number
  sunlightMinutes: number
  totalMissionYears: number
  eclipseDrawW: number
  busVoltageV: number
  batteryTech: "Space-Grade NMC (Li-Ion)" | "LiFePO4 (Ultra-High Cycle)" | "Solid-State Li-Metal"
  nameplateCapacityAh: number
  parallelStrings: number
  seriesCells: number
  description: string
}

const BATTERY_PRESETS: Record<string, BatteryPreset> = {
  leo_smallsat_nmc: {
    name: "LEO Optical SmallSat (500 km)",
    classType: "Tactical Smallsat Bus",
    orbitType: "LEO (500 km)",
    altitudeKm: 500,
    eclipseMinutes: 35.8,
    sunlightMinutes: 58.7,
    totalMissionYears: 5,
    eclipseDrawW: 140,
    busVoltageV: 28,
    batteryTech: "Space-Grade NMC (Li-Ion)",
    nameplateCapacityAh: 25,
    parallelStrings: 2,
    seriesCells: 8,
    description: "High-cycle LEO regime enduring over 27,000 thermal-eclipse transitions over a 5-year mission.",
  },
  geo_commsat_high_dod: {
    name: "GEO High-Power Telecom Bus",
    classType: "Flagship 15-Year Bus",
    orbitType: "GEO (35,786 km)",
    altitudeKm: 35786,
    eclipseMinutes: 72.0,
    sunlightMinutes: 1368.0,
    totalMissionYears: 15,
    eclipseDrawW: 4200,
    busVoltageV: 100,
    batteryTech: "Space-Grade NMC (Li-Ion)",
    nameplateCapacityAh: 120,
    parallelStrings: 2,
    seriesCells: 28,
    description: "Deep eclipse equinox seasons (45 days semi-annually) allowing higher allowable Depth-of-Discharge.",
  },
  lunar_gateway_lifepo4: {
    name: "Cislunar Deep-Space Outpost",
    classType: "Exploration Habitat Bus",
    orbitType: "Lunar Gateway / NRHO",
    altitudeKm: 70000,
    eclipseMinutes: 90.0,
    sunlightMinutes: 9180.0,
    totalMissionYears: 10,
    eclipseDrawW: 2800,
    busVoltageV: 120,
    batteryTech: "LiFePO4 (Ultra-High Cycle)",
    nameplateCapacityAh: 90,
    parallelStrings: 3,
    seriesCells: 36,
    description: "Ultra-safe phosphate chemistry designed for extreme thermal cold soaks and human-rated safety.",
  },
}

export default function BatteryCyclingPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("leo_smallsat_nmc")
  const [eclipseMinutes, setEclipseMinutes] = useState<number>(35.8)
  const [sunlightMinutes, setSunlightMinutes] = useState<number>(58.7)
  const [eclipseDrawW, setEclipseDrawW] = useState<number>(140)
  const [busVoltageV, setBusVoltageV] = useState<number>(28)
  const [nameplateAh, setNameplateAh] = useState<number>(25)
  const [parallelStrings, setParallelStrings] = useState<number>(2)
  const [missionYears, setMissionYears] = useState<number>(5)

  const preset = BATTERY_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = BATTERY_PRESETS[key]
    setSelectedPresetKey(key)
    setEclipseMinutes(p.eclipseMinutes)
    setSunlightMinutes(p.sunlightMinutes)
    setEclipseDrawW(p.eclipseDrawW)
    setBusVoltageV(p.busVoltageV)
    setNameplateAh(p.nameplateCapacityAh)
    setParallelStrings(p.parallelStrings)
    setMissionYears(p.totalMissionYears)
  }

  // ECSS-E-ST-20-30C Battery Sizing & Cycling Physics
  const metrics = useMemo(() => {
    // 1. Total Battery Energy Capacity (Watt-hours)
    const totalCapacityAh = nameplateAh * parallelStrings
    const nameplateEnergyWh = totalCapacityAh * busVoltageV

    // 2. Eclipse Energy Consumption
    const eclipseHours = eclipseMinutes / 60
    const energyRequiredPerEclipseWh = eclipseDrawW * eclipseHours

    // 3. Operational Depth of Discharge (DoD)
    const dischargeEfficiency = 0.95
    const actualDodPct = Math.round(((energyRequiredPerEclipseWh / (nameplateEnergyWh * dischargeEfficiency)) * 100) * 10) / 10

    // 4. Orbit Cycles Over Lifetime
    const orbitPeriodMin = eclipseMinutes + sunlightMinutes
    const orbitsPerDay = 1440 / Math.max(1, orbitPeriodMin)
    const isGeo = preset.orbitType.includes("GEO")
    // GEO experiences ~90 eclipses per year (spring and autumn equinoxes)
    const totalLifetimeCycles = Math.round(isGeo ? missionYears * 90 : orbitsPerDay * 365.25 * missionYears)

    // 5. Maximum Recommended DoD Threshold based on Cycle Count
    // Rule of Thumb: >20,000 cycles (LEO) -> Max 25-30% DoD; <2,000 cycles (GEO) -> Max 75-80% DoD
    let maxRecommendedDodPct = 25
    if (isGeo) maxRecommendedDodPct = 75
    else if (totalLifetimeCycles < 10000) maxRecommendedDodPct = 40

    const dodPassed = actualDodPct <= maxRecommendedDodPct

    // 6. End-of-Life (EOL) Capacity Fade
    // Capacity Fade ~ a * sqrt(cycles) * (DoD / 30)
    const cycleFactor = Math.sqrt(totalLifetimeCycles) * 0.08
    const dodStressFactor = actualDodPct / 30
    const capacityFadePct = Math.min(35, Math.round(cycleFactor * dodStressFactor * 10) / 10)
    const eolCapacityWh = Math.round(nameplateEnergyWh * (1 - capacityFadePct / 100))

    // 7. Required Sunlight Recharging Power (W)
    // Sunlight recharge must deliver: E_eclipse / (t_sunlight * charge_efficiency)
    const chargeEfficiency = 0.90
    const sunlightHours = sunlightMinutes / 60
    const minRechargePowerW = Math.round((energyRequiredPerEclipseWh / (sunlightHours * chargeEfficiency)) * 10) / 10

    return {
      nameplateEnergyWh,
      energyRequiredPerEclipseWh: Math.round(energyRequiredPerEclipseWh * 10) / 10,
      actualDodPct,
      maxRecommendedDodPct,
      dodPassed,
      totalLifetimeCycles: totalLifetimeCycles.toLocaleString(),
      capacityFadePct,
      eolCapacityWh,
      minRechargePowerW,
    }
  }, [nameplateAh, parallelStrings, busVoltageV, eclipseMinutes, sunlightMinutes, eclipseDrawW, missionYears, preset])

  const exportBatteryCSV = () => {
    const csv = `SPACECRAFT EPS BATTERY SIZING & CYCLING SPEC
Preset Architecture,${preset.name}
Class,${preset.classType}
Orbit Regime,${preset.orbitType}
Battery Cell Chemistry,${preset.batteryTech}
Bus Voltage,${busVoltageV} V
Total Battery Energy (BOL),${metrics.nameplateEnergyWh} Wh (${nameplateAh * parallelStrings} Ah)
Eclipse Power Draw,${eclipseDrawW} W
Eclipse Duration,${eclipseMinutes} min (Sunlight: ${sunlightMinutes} min)
Energy Discharged per Eclipse,${metrics.energyRequiredPerEclipseWh} Wh
Calculated Depth-of-Discharge (DoD),${metrics.actualDodPct}%
Recommended DoD Threshold,${metrics.maxRecommendedDodPct}% (${metrics.dodPassed ? "APPROVED" : "EXCESSIVE DOD RISK"})
Total Mission Lifetime Cycles,${metrics.totalLifetimeCycles} cycles
EOL Capacity Degradation Fade,${metrics.capacityFadePct}%
EOL Residual Energy Capacity,${metrics.eolCapacityWh} Wh
Minimum Solar Array Recharge Power,${metrics.minRechargePowerW} W`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-battery-cycling-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <BatteryCharging className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              ECSS-E-ST-20-30C Spacecraft Battery Depth-of-Discharge (DoD) &amp; Cycling Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              BATTERY SIZING &amp; ECLIPSE CYCLING
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model orbital eclipse duration, cyclic Depth-of-Discharge (DoD) fatigue, SEI layer capacity fade over 28,000+ orbits, and minimum solar array recharge power requirements.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportBatteryCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT BATTERY SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(BATTERY_PRESETS).map(([k, v]) => (
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
              Battery &amp; Eclipse Parameters
            </div>

            {/* Bus Voltage */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">REGULATED BUS VOLTAGE</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={busVoltageV}
                  onChange={(e) => setBusVoltageV(Math.max(12, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">Volts</span>
              </div>
            </div>

            {/* Battery Cell String Sizing */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">STRING CAPACITY</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={nameplateAh}
                    onChange={(e) => setNameplateAh(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">Ah</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">PARALLEL STRINGS</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={parallelStrings}
                    onChange={(e) => setParallelStrings(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">P</span>
                </div>
              </div>
            </div>

            {/* Eclipse Power Draw */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">ECLIPSE CONTINUOUS POWER DRAW</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={eclipseDrawW}
                  onChange={(e) => setEclipseDrawW(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">Watts</span>
              </div>
            </div>

            {/* Eclipse & Sunlight Durations */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Orbit Time In Shadow vs Sunlight (Minutes)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase">ECLIPSE</span>
                    <span className="text-cyan-400 font-bold">{eclipseMinutes}m</span>
                  </div>
                  <input
                    type="number"
                    step={0.5}
                    value={eclipseMinutes}
                    onChange={(e) => setEclipseMinutes(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase">SUNLIGHT</span>
                    <span className="text-purple-400 font-bold">{sunlightMinutes}m</span>
                  </div>
                  <input
                    type="number"
                    step={1}
                    value={sunlightMinutes}
                    onChange={(e) => setSunlightMinutes(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Mission Life */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400">MISSION LIFETIME</label>
                <span className="text-emerald-400 font-bold">{missionYears} YEARS</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={missionYears}
                onChange={(e) => setMissionYears(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.dodPassed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  DEPTH-OF-DISCHARGE (DOD)
                </div>
                <div className={`text-3xl font-black ${metrics.dodPassed ? "text-cyan-400" : "text-red-400"}`}>
                  {metrics.actualDodPct}%
                </div>
                <div className="text-[10px] text-slate-500">Max Limit: {metrics.maxRecommendedDodPct}% DoD</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-purple-400" /> TOTAL LIFETIME CYCLES
                </div>
                <div className="text-3xl font-black text-white">{metrics.totalLifetimeCycles}</div>
                <div className="text-[10px] text-purple-400">Over {missionYears} Years</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" /> EOL BATTERY CAPACITY
                </div>
                <div className="text-3xl font-black text-emerald-400">{metrics.eolCapacityWh} Wh</div>
                <div className="text-[10px] text-slate-500">Fade: -{metrics.capacityFadePct}% (BOL: {metrics.nameplateEnergyWh} Wh)</div>
              </div>
            </div>

            {/* Battery Cycling & Recharging Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Battery className="w-4 h-4 text-cyan-400" />
                  Electrochemical Degradation &amp; Solar Array Balance
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.dodPassed
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.dodPassed ? "CYCLIC FATIGUE CLEARED" : "DOD STRESS VIOLATION"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">SOLAR RECHARGE RATIO REQUIREMENT</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  During the {eclipseMinutes}-minute eclipse shadow, the bus consumes <strong className="text-white">{metrics.energyRequiredPerEclipseWh} Wh</strong> of stored energy. To fully replenish the battery before the next eclipse passage, the solar array must continuously dedicate at least <strong className="text-cyan-400">{metrics.minRechargePowerW} W</strong> of power solely to battery charging during the {sunlightMinutes}-minute illuminated window (assuming 90% charge acceptance efficiency).
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Beginning-of-Life Nameplate Energy</span>
                  <span className="text-white font-bold">{metrics.nameplateEnergyWh} Wh ({nameplateAh * parallelStrings} Ah @ {busVoltageV} V)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Operational Eclipse Energy Draw</span>
                  <span className="text-cyan-400 font-bold">{metrics.energyRequiredPerEclipseWh} Wh / eclipse</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Minimum Array Battery Recharge Power</span>
                  <span className="text-purple-400 font-bold">{metrics.minRechargePowerW} Watts</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Orbit Eclipse Cycles</span>
                  <span className="text-slate-300 font-bold">{metrics.totalLifetimeCycles} transitions</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Electrochemical DoD Margin Status</span>
                  <span className={`font-bold ${metrics.dodPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.dodPassed ? "PASS (WITHIN RELIABILITY THRESHOLD)" : "FAIL (BATTERY ACCELERATED FADE RISK)"}
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
