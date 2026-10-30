"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Thermometer, 
  Sun, 
  Flame, 
  Snowflake, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  Layers,
  Cpu,
  Zap
} from "lucide-react"

interface ThermalPreset {
  name: string
  operator: string
  propellant: "Liquid Hydrogen (LH2)" | "Liquid Methane (LCH4)" | "Liquid Oxygen (LOX)" | "Room Temp Bus"
  tankVolumeM3: number
  mliLayers: number
  internalDissipationW: number
  absorptivityAlpha: number
  emissivityEpsilon: number
  description: string
}

const THERMAL_PRESETS: Record<string, ThermalPreset> = {
  starship_depot: {
    name: "Orbital Propellant Depot (Starship)",
    operator: "SpaceX",
    propellant: "Liquid Methane (LCH4)",
    tankVolumeM3: 600,
    mliLayers: 40,
    internalDissipationW: 2500,
    absorptivityAlpha: 0.12,
    emissivityEpsilon: 0.85,
    description: "Long-duration orbital cryogenic storage for lunar and Mars architecture refilling.",
  },
  centaur_v: {
    name: "Centaur V Cryogenic Upper Stage",
    operator: "United Launch Alliance",
    propellant: "Liquid Hydrogen (LH2)",
    tankVolumeM3: 75,
    mliLayers: 25,
    internalDissipationW: 400,
    absorptivityAlpha: 0.14,
    emissivityEpsilon: 0.80,
    description: "High-energy upper stage requiring vacuum insulation to prevent rapid LH2 flash boil-off.",
  },
  geo_commsat: {
    name: "GEO High-Power Telecom Bus",
    operator: "Boeing / Maxar",
    propellant: "Room Temp Bus",
    tankVolumeM3: 20,
    mliLayers: 15,
    internalDissipationW: 8000,
    absorptivityAlpha: 0.08, // Silvered Teflon
    emissivityEpsilon: 0.82,
    description: "High thermal dissipation payload radiators shedding kW-scale heat directly to deep space.",
  },
  smallsat_optical: {
    name: "LEO Recon Optical Payload Radiator",
    operator: "Defense ISR SmallSat",
    propellant: "Room Temp Bus",
    tankVolumeM3: 2,
    mliLayers: 10,
    internalDissipationW: 350,
    absorptivityAlpha: 0.20,
    emissivityEpsilon: 0.88,
    description: "Precision temperature stabilization for optical mirrors and focal plane detector cooling.",
  },
}

export default function SpacecraftThermalPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("starship_depot")
  const [mliLayers, setMliLayers] = useState<number>(40)
  const [tankVolumeM3, setTankVolumeM3] = useState<number>(600)
  const [alpha, setAlpha] = useState<number>(0.12)
  const [epsilon, setEpsilon] = useState<number>(0.85)
  const [internalHeatW, setInternalHeatW] = useState<number>(2500)
  const [propellantType, setPropellantType] = useState<string>("Liquid Methane (LCH4)")

  const preset = THERMAL_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = THERMAL_PRESETS[key]
    setSelectedPresetKey(key)
    setMliLayers(p.mliLayers)
    setTankVolumeM3(p.tankVolumeM3)
    setAlpha(p.absorptivityAlpha)
    setEpsilon(p.emissivityEpsilon)
    setInternalHeatW(p.internalDissipationW)
    setPropellantType(p.propellant)
  }

  // Thermal & Cryo Physics Calculation
  const metrics = useMemo(() => {
    const sigma = 5.670374e-8 // Stefan-Boltzmann W/m^2 K^4
    const solarFlux = 1361 // W/m^2
    const earthAlbedoFlux = 408 // ~30%
    const deepSpaceTempK = 3 // 3K cosmic microwave background

    // Surface Area approximated as cylinder/sphere from volume
    const radiusM = Math.pow((3 * tankVolumeM3) / (4 * Math.PI), 1 / 3)
    const surfaceAreaM2 = Math.round(4 * Math.PI * Math.pow(radiusM, 2))

    // 1. Hot Case (Sunlit + Earth Albedo + Internal Dissipation)
    const qAbsorbedSun = alpha * solarFlux * (surfaceAreaM2 * 0.25)
    const qAbsorbedAlbedo = alpha * earthAlbedoFlux * (surfaceAreaM2 * 0.15)
    const qHotTotalW = qAbsorbedSun + qAbsorbedAlbedo + internalHeatW

    // T_hot = (Q / (epsilon * sigma * Area))^0.25
    const tHotK = Math.round(Math.pow(qHotTotalW / (epsilon * sigma * surfaceAreaM2), 0.25))
    const tHotC = tHotK - 273

    // 2. Cold Case (Deep Shadow Eclipse, only internal dissipation)
    const qColdTotalW = Math.max(10, internalHeatW)
    const tColdK = Math.round(Math.pow(qColdTotalW / (epsilon * sigma * surfaceAreaM2), 0.25))
    const tColdC = tColdK - 273

    // 3. Cryogenic Heat Leak across MLI
    // Latent Heat of Vaporization: LH2 = 446 kJ/kg, LCH4 = 510 kJ/kg, LOX = 213 kJ/kg
    let hfgKjKg = 510
    let boilingPointK = 111
    let fluidDensityKgM3 = 422
    if (propellantType.includes("Hydrogen")) {
      hfgKjKg = 446
      boilingPointK = 20
      fluidDensityKgM3 = 71
    } else if (propellantType.includes("Oxygen")) {
      hfgKjKg = 213
      boilingPointK = 90
      fluidDensityKgM3 = 1141
    }

    const totalPropellantMassKg = Math.round(tankVolumeM3 * fluidDensityKgM3)

    // Effective emissivity of MLI blanket
    const epsStar = Math.max(0.005, 0.05 / Math.sqrt(mliLayers))
    const heatLeakW = Math.round(
      surfaceAreaM2 * sigma * epsStar * (Math.pow(tHotK, 4) - Math.pow(boilingPointK, 4))
    )

    // Boil-off mass per day (24 hours = 86400 seconds)
    const boilOffRateKgPerSec = (heatLeakW / 1000) / hfgKjKg
    const boilOffKgDay = Math.round(boilOffRateKgPerSec * 86400 * 10) / 10
    const boilOffPctPerDay = totalPropellantMassKg > 0
      ? (boilOffKgDay / totalPropellantMassKg) * 100
      : 0

    // Active Cryocooler Power for Zero Boil-Off (ZBO)
    // Real cryocoolers achieve ~15-20% of Carnot efficiency
    const carnotCop = boilingPointK / (tHotK - boilingPointK)
    const realCop = carnotCop * 0.18
    const cryocoolerPowerRequiredW = Math.round(heatLeakW / Math.max(0.01, realCop))

    return {
      surfaceAreaM2,
      tHotK,
      tHotC,
      tColdK,
      tColdC,
      heatLeakW,
      totalPropellantMassKg,
      boilOffKgDay,
      boilOffPctPerDay: boilOffPctPerDay.toFixed(3),
      cryocoolerPowerRequiredW,
      alphaOverEpsilon: (alpha / epsilon).toFixed(2),
      isCryo: propellantType !== "Room Temp Bus",
    }
  }, [tankVolumeM3, mliLayers, alpha, epsilon, internalHeatW, propellantType])

  const exportThermalCSV = () => {
    const csv = `Parameter,Value,Unit
Architecture,${preset.name},
Propellant Fluid,${propellantType},
Tank Volume,${tankVolumeM3},m3
Total Surface Area,${metrics.surfaceAreaM2},m2
MLI Blanket Layers,${mliLayers},
Absorptivity (Alpha),${alpha},
Emissivity (Epsilon),${epsilon},
Alpha / Epsilon Ratio,${metrics.alphaOverEpsilon},
Max Sunlit Temp,${metrics.tHotC},deg C
Deep Shadow Temp,${metrics.tColdC},deg C
Cryogenic Heat Leak,${metrics.heatLeakW},W
Daily Boil-Off Mass,${metrics.boilOffKgDay},kg/day
Daily Boil-Off Rate,${metrics.boilOffPctPerDay},%/day
Zero Boil-Off Cryocooler Power,${metrics.cryocoolerPowerRequiredW},W,`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-thermal-cryo-analysis.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Thermometer className="w-3.5 h-3.5 animate-pulse" />
              Stefan-Boltzmann Radiation &amp; Cryogenic Boil-Off Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              THERMAL MANAGEMENT &amp; CRYO BOIL-OFF
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model orbital equilibrium temperatures (+120°C sunlit to -150°C eclipse), MLI blanket thermal conductivity, cryogenic boil-off rates, and Zero Boil-Off (ZBO) cryocooler lift power.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportThermalCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT THERMAL SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(THERMAL_PRESETS).map(([k, v]) => (
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

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Controls Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Thermal Control Parameters
            </div>

            {/* Propellant Architecture */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">STORED FLUID / ARCHITECTURE</label>
              <select
                value={propellantType}
                onChange={(e) => setPropellantType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Liquid Methane (LCH4)">Liquid Methane (LCH4 - 111 K)</option>
                <option value="Liquid Hydrogen (LH2)">Liquid Hydrogen (LH2 - 20 K)</option>
                <option value="Liquid Oxygen (LOX)">Liquid Oxygen (LOX - 90 K)</option>
                <option value="Room Temp Bus">Standard Payload Bus (Room Temp)</option>
              </select>
            </div>

            {/* Tank Volume Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">TANK / BUS VOLUME</label>
                <span className="text-cyan-400 font-bold">{tankVolumeM3} m³</span>
              </div>
              <input
                type="range"
                min={1}
                max={800}
                value={tankVolumeM3}
                onChange={(e) => setTankVolumeM3(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 m³ (CubeSat)</span>
                <span>75 m³ (Centaur)</span>
                <span>800 m³ (Depot)</span>
              </div>
            </div>

            {/* MLI Layers Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">MLI INSULATION LAYERS</label>
                <span className="text-purple-400 font-bold">{mliLayers} LAYERS</span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                value={mliLayers}
                onChange={(e) => setMliLayers(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>5 Layers (Basic)</span>
                <span>30 Layers</span>
                <span>60 Layers (Cryo High-Perf)</span>
              </div>
            </div>

            {/* Optical Coating Properties */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-400 block uppercase font-bold">SOLAR ABSORPTIVITY (α)</label>
                <input
                  type="number"
                  step={0.01}
                  value={alpha}
                  onChange={(e) => setAlpha(Math.max(0.01, Math.min(1.0, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block uppercase font-bold">IR EMISSIVITY (ε)</label>
                <input
                  type="number"
                  step={0.01}
                  value={epsilon}
                  onChange={(e) => setEpsilon(Math.max(0.01, Math.min(1.0, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            </div>

            {/* Internal Heat Dissipation */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">INTERNAL AVIONICS DISSIPATION</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={internalHeatW}
                  onChange={(e) => setInternalHeatW(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">WATTS</span>
              </div>
            </div>

            {/* Heritage Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">COATING PERFORMANCE:</div>
              <p className="text-slate-300 font-bold font-mono">α/ε Ratio: {metrics.alphaOverEpsilon}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary Temperature Range Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-400" /> SUNLIT PEAK EQUILIBRIUM
                </div>
                <div className="text-3xl font-black text-red-400">+{metrics.tHotC}&deg;C</div>
                <div className="text-[10px] text-slate-500">{metrics.tHotK} K Absolute</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Snowflake className="w-3 h-3 text-cyan-400" /> DEEP SHADOW ECLIPSE
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.tColdC}&deg;C</div>
                <div className="text-[10px] text-slate-500">{metrics.tColdK} K Absolute</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" /> ZBO CRYOCOOLER POWER
                </div>
                <div className="text-3xl font-black text-emerald-400">
                  {metrics.isCryo ? `${metrics.cryocoolerPowerRequiredW.toLocaleString()} W` : "PASSIVE"}
                </div>
                <div className="text-[10px] text-slate-500">Zero Boil-Off Target</div>
              </div>
            </div>

            {/* Cryogenic Boil-Off Analysis Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  Cryogenic Heat Leak &amp; Boil-Off Rate Matrix
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  metrics.isCryo
                    ? "bg-amber-950 border-amber-500/40 text-amber-300"
                    : "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                }`}>
                  {metrics.isCryo ? "CRYOGENIC DECONTAMINATION REQUIRED" : "STANDARD ROOM TEMP BUS"}
                </span>
              </div>

              {metrics.isCryo ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">NET HEAT INLEAK</span>
                      <span className="text-base font-bold text-red-400">{metrics.heatLeakW} W</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">DAILY FLUID MASS LOSS</span>
                      <span className="text-base font-bold text-white">{metrics.boilOffKgDay} kg/day</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">BOIL-OFF PERCENTAGE</span>
                      <span className="text-base font-bold text-amber-400">{metrics.boilOffPctPerDay}% / day</span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs font-sans leading-relaxed">
                    Without active refrigeration, heat transfer through the {mliLayers}-layer MLI blanket will boil off {metrics.boilOffKgDay} kg of {propellantType} every 24 hours. A continuous cryocooler electrical input of {metrics.cryocoolerPowerRequiredW.toLocaleString()} W is required to re-liquefy vapors and achieve Zero Boil-Off (ZBO).
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-400 text-xs font-sans">
                  Spacecraft operates in a non-cryogenic state. Radiative panels are sized to reject {internalHeatW} W of avionics payload heat into deep space during both illuminated and eclipsed orbital passes.
                </div>
              )}

              {/* Thermal Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Radiating Surface Area</span>
                  <span className="text-white font-bold">{metrics.surfaceAreaM2} m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Optical Coating Alpha / Epsilon</span>
                  <span className="text-cyan-400 font-bold">{alpha} / {epsilon} ({metrics.alphaOverEpsilon})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Liquid Propellant Loaded</span>
                  <span className="text-purple-400 font-bold">{metrics.totalPropellantMassKg.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Thermal Cycling Delta (ΔT)</span>
                  <span className="text-slate-200 font-bold">{metrics.tHotC - metrics.tColdC}&deg;C per orbit</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
