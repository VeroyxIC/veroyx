"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Snowflake, 
  Flame, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Fuel,
  Zap,
  ThermometerSnowflake
} from "lucide-react"

interface CryoPreset {
  name: string
  classType: string
  cryogen: "Liquid Hydrogen (LH2)" | "Liquid Methane (LCH4)" | "Liquid Oxygen (LOX)" | "Liquid Helium (LHe)"
  tankVolumeM3: number
  tankDiameterM: number
  fluidTempK: number
  latentHeatKjKg: number
  densityKgM3: number
  mliLayers: number
  outerSkinTempK: number
  activeZboCooler: boolean
  coolerCarnotEfficiency: number
  description: string
}

const CRYO_PRESETS: Record<string, CryoPreset> = {
  orbital_lh2_depot: {
    name: "Cislunar LH2 Propellant Depot",
    classType: "Long-Duration Cryo Storage Depot",
    cryogen: "Liquid Hydrogen (LH2)",
    tankVolumeM3: 45.0,
    tankDiameterM: 3.5,
    fluidTempK: 20.3,
    latentHeatKjKg: 446.0,
    densityKgM3: 70.85,
    mliLayers: 60,
    outerSkinTempK: 260.0,
    activeZboCooler: true,
    coolerCarnotEfficiency: 0.18,
    description: "Deep space liquid hydrogen tank operating at 20 K requiring active 20K cryocoolers for zero-loss storage.",
  },
  mars_transfer_methalox: {
    name: "Mars Transfer Stage (LOX/LCH4)",
    classType: "Interplanetary Propulsion Stage",
    cryogen: "Liquid Methane (LCH4)",
    tankVolumeM3: 28.0,
    tankDiameterM: 3.0,
    fluidTempK: 111.7,
    latentHeatKjKg: 510.0,
    densityKgM3: 422.6,
    mliLayers: 40,
    outerSkinTempK: 240.0,
    activeZboCooler: false,
    coolerCarnotEfficiency: 0.25,
    description: "Deep-space transit methane tank utilizing passive 40-layer MLI blanket insulation over 9-month cruise.",
  },
  ir_telescope_helium: {
    name: "Sub-Kelvin Infrared Space Observatory",
    classType: "Astrophysics Cryogenic Instrument",
    cryogen: "Liquid Helium (LHe)",
    tankVolumeM3: 2.2,
    tankDiameterM: 1.4,
    fluidTempK: 4.2,
    latentHeatKjKg: 20.9,
    densityKgM3: 125.0,
    mliLayers: 80,
    outerSkinTempK: 120.0,
    activeZboCooler: true,
    coolerCarnotEfficiency: 0.12,
    description: "Supercritical liquid helium dewar cooling focal plane bolometers with multi-stage Stirling cryocoolers.",
  },
}

export default function CryoBoilOffPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("orbital_lh2_depot")
  const [tankVolumeM3, setTankVolumeM3] = useState<number>(45.0)
  const [tankDiameterM, setTankDiameterM] = useState<number>(3.5)
  const [mliLayers, setMliLayers] = useState<number>(60)
  const [outerSkinTempK, setOuterSkinTempK] = useState<number>(260.0)
  const [activeZbo, setActiveZbo] = useState<boolean>(true)
  const [carnotEff, setCarnotEff] = useState<number>(0.18)

  const preset = CRYO_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = CRYO_PRESETS[key]
    setSelectedPresetKey(key)
    setTankVolumeM3(p.tankVolumeM3)
    setTankDiameterM(p.tankDiameterM)
    setMliLayers(p.mliLayers)
    setOuterSkinTempK(p.outerSkinTempK)
    setActiveZbo(p.activeZboCooler)
    setCarnotEff(p.coolerCarnotEfficiency)
  }

  // Cryogenic Thermodynamics & Heat Ingress Calculations
  const metrics = useMemo(() => {
    const sigma = 5.67e-8
    const tCold = preset.fluidTempK
    const tHot = outerSkinTempK

    // Tank Surface Area (cylindrical tank with hemispherical domes)
    const radiusM = tankDiameterM / 2
    const domeVolumeM3 = (4 / 3) * Math.PI * Math.pow(radiusM, 3)
    const cylinderVolumeM3 = Math.max(0, tankVolumeM3 - domeVolumeM3)
    const cylinderLengthM = cylinderVolumeM3 / (Math.PI * Math.pow(radiusM, 2))
    const tankAreaM2 = Math.round((2 * Math.PI * radiusM * cylinderLengthM + 4 * Math.PI * Math.pow(radiusM, 2)) * 10) / 10

    // Total Propellant Mass Loaded (kg)
    const totalMassLoadedKg = Math.round(tankVolumeM3 * preset.densityKgM3)

    // 1. Radiation Heat Ingress Across MLI
    const epsEff = 0.035 / Math.max(1, mliLayers)
    const qRadHeatFluxWM2 = epsEff * sigma * (Math.pow(tHot, 4) - Math.pow(tCold, 4))
    const qRadTotalW = qRadHeatFluxWM2 * tankAreaM2

    // 2. Conductive Parasitic Heat Ingress (Struts, Feedlines, Wiring)
    const qCondTotalW = qRadTotalW * 0.22

    // Net Heat Ingress into Fluid (Watts)
    const qTotalHeatLoadW = Math.round((qRadTotalW + qCondTotalW) * 100) / 100

    // 3. Passive Boil-Off Rate without Active Cooling
    const latentHeatJPerKg = preset.latentHeatKjKg * 1000
    const boilOffRateKgSec = qTotalHeatLoadW / latentHeatJPerKg
    const boilOffKgDay = Math.round(boilOffRateKgSec * 86400 * 100) / 100
    const boilOffPercentPerMonth = Math.round(((boilOffKgDay * 30.5) / Math.max(1, totalMassLoadedKg)) * 1000) / 10

    // 4. Active Zero-Boil-Off (ZBO) Lift Power
    const carnotCop = tCold / Math.max(1, tHot - tCold)
    const actualCop = carnotCop * carnotEff
    const zboElectricalPowerW = Math.round(qTotalHeatLoadW / Math.max(0.0001, actualCop))

    // ZBO Status
    const netBoilOffKgDay = activeZbo ? 0.0 : boilOffKgDay
    const netBoilOffPctMonth = activeZbo ? 0.0 : boilOffPercentPerMonth

    return {
      tankAreaM2,
      totalMassLoadedKg: totalMassLoadedKg.toLocaleString(),
      qTotalHeatLoadW,
      qRadTotalW: qRadTotalW.toFixed(2),
      qCondTotalW: qCondTotalW.toFixed(2),
      boilOffKgDay,
      boilOffPercentPerMonth,
      netBoilOffKgDay,
      netBoilOffPctMonth,
      zboElectricalPowerW,
      actualCop: (actualCop * 100).toFixed(2),
    }
  }, [tankVolumeM3, tankDiameterM, mliLayers, outerSkinTempK, activeZbo, carnotEff, preset])

  const exportCryoCSV = () => {
    const csv = `SPACECRAFT CRYOGENIC BOIL-OFF & THERMAL ZBO SPEC
Preset Architecture,${preset.name}
Class,${preset.classType}
Stored Cryogen,${preset.cryogen}
Storage Boiling Temperature,${preset.fluidTempK} K
Outer Spacecraft Skin Temperature,${outerSkinTempK} K
Tank Enclosed Volume,${tankVolumeM3} m3 (Diameter: ${tankDiameterM} m)
Total Cryogen Mass Loaded,${metrics.totalMassLoadedKg} kg
MLI Blanket Insulation,${mliLayers} reflective layers
Net Radiation Heat Ingress,${metrics.qRadTotalW} Watts
Parasitic Strut Conduction,${metrics.qCondTotalW} Watts
Total Heat Ingress into Fluid,${metrics.qTotalHeatLoadW} Watts
Passive Boil-Off Loss Rate,${metrics.boilOffKgDay} kg/day (${metrics.boilOffPercentPerMonth}% per month)
Active ZBO Cryocooler State,${activeZbo ? "ENGAGED (ZERO-BOIL-OFF)" : "PASSIVE VENTING"}
Required ZBO Input Power,${metrics.zboElectricalPowerW} W Electrical (COP: ${metrics.actualCop}%)
Net Mission Boil-Off Rate,${metrics.netBoilOffKgDay} kg/day`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-cryo-storage-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ThermometerSnowflake className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA SP-8038 Cryogenic Insulation &amp; Zero-Boil-Off (ZBO) Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              CRYOGENIC STORAGE &amp; BOIL-OFF
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model multi-layer insulation (MLI) radiation ingress, strut parasitic conduction, passive venting boil-off rates, and active cryocooler Zero-Boil-Off (ZBO) electrical power sizing.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportCryoCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT CRYO SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(CRYO_PRESETS).map(([k, v]) => (
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
              Dewar &amp; Insulation Parameters
            </div>

            {/* Tank Geometry */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">TANK VOLUME</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={tankVolumeM3}
                    onChange={(e) => setTankVolumeM3(Math.max(0.5, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m³</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DIAMETER</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={tankDiameterM}
                    onChange={(e) => setTankDiameterM(Math.max(0.5, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m</span>
                </div>
              </div>
            </div>

            {/* MLI Layers */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400">MLI BLANKET LAYERS</label>
                <span className="text-cyan-400 font-bold">{mliLayers} LAYERS</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={mliLayers}
                onChange={(e) => setMliLayers(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>20 Layers (Basic)</span>
                <span>60 Layers (Standard Depot)</span>
                <span>100 Layers (Deep Space)</span>
              </div>
            </div>

            {/* Outer Skin Temperature */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400">OUTER SKIN BOUNDARY TEMP</label>
                <span className="text-amber-400 font-bold">{outerSkinTempK} K</span>
              </div>
              <input
                type="range"
                min={80}
                max={350}
                step={5}
                value={outerSkinTempK}
                onChange={(e) => setOuterSkinTempK(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>100 K (Deep Shadow)</span>
                <span>250 K (LEO Ambient)</span>
                <span>350 K (Sunlit Skin)</span>
              </div>
            </div>

            {/* Active Zero-Boil-Off Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-400" /> ACTIVE ZBO CRYOCOOLER
                </span>
                <button
                  type="button"
                  onClick={() => setActiveZbo(!activeZbo)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                    activeZbo
                      ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {activeZbo ? "ENGAGED" : "PASSIVE"}
                </button>
              </div>

              {activeZbo && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">CARNOT RECOVERY EFFICIENCY</span>
                    <span className="text-cyan-400 font-bold">{(carnotEff * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.08}
                    max={0.35}
                    step={0.01}
                    value={carnotEff}
                    onChange={(e) => setCarnotEff(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-[9px] text-slate-500 block">Stirling / Reverse-Brayton cryocooler efficiency</span>
                </div>
              )}
            </div>

            {/* Fluid Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">CRYOGEN: {preset.cryogen}</div>
              <p className="text-slate-300 font-mono text-[10px]">Boiling Point: {preset.fluidTempK} K | Latent Heat: {preset.latentHeatKjKg} kJ/kg</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> TOTAL HEAT INGRESS
                </div>
                <div className="text-3xl font-black text-amber-400">{metrics.qTotalHeatLoadW} W</div>
                <div className="text-[10px] text-slate-500">Rad: {metrics.qRadTotalW}W + Cond: {metrics.qCondTotalW}W</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-cyan-400" /> NET BOIL-OFF LOSS
                </div>
                <div className={`text-3xl font-black ${metrics.netBoilOffKgDay === 0 ? "text-emerald-400" : "text-white"}`}>
                  {metrics.netBoilOffKgDay} kg/d
                </div>
                <div className="text-[10px] text-slate-500">
                  {activeZbo ? "Zero-Boil-Off Maintained" : `${metrics.netBoilOffPctMonth}% Loss / Month`}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" /> ZBO CRYOCOOLER POWER
                </div>
                <div className="text-3xl font-black text-purple-400">{metrics.zboElectricalPowerW} W</div>
                <div className="text-[10px] text-purple-400">Electrical Demand to Null Boil-Off</div>
              </div>
            </div>

            {/* Thermal Ingress & Cryo Preservation Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-cyan-400" />
                  Cryogenic Thermodynamics &amp; Storage Efficiency
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  activeZbo
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : metrics.boilOffPercentPerMonth < 5
                    ? "bg-cyan-950 border-cyan-500/40 text-cyan-300"
                    : "bg-amber-950 border-amber-500/40 text-amber-300"
                }`}>
                  {activeZbo ? "ZERO BOIL-OFF ACTIVE" : "PASSIVE VENTING REGIME"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">THERMAL BALANCE ANALYSIS</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Holding <strong className="text-white">{metrics.totalMassLoadedKg} kg</strong> of {preset.cryogen} at <strong className="text-cyan-400">{preset.fluidTempK} K</strong> inside an insulated surface area of <strong className="text-white">{metrics.tankAreaM2} m²</strong> experiences <strong className="text-amber-400">{metrics.qTotalHeatLoadW} Watts</strong> of parasitic heat ingress.
                  {activeZbo ? (
                    <span className="text-emerald-400 block mt-1">
                      Active Zero-Boil-Off mode engaged: A multi-stage cryocooler drawing {metrics.zboElectricalPowerW} W of bus electrical power continuously intercepts incoming heat, completely eliminating boil-off venting mass loss over the multi-year mission.
                    </span>
                  ) : (
                    <span className="text-slate-300 block mt-1">
                      Passive storage mode: Without active refrigeration, latent heat vaporization results in an unrecoverable propellant venting loss of <strong className="text-cyan-400">{metrics.boilOffKgDay} kg/day</strong> ({metrics.boilOffPercentPerMonth}% of tank volume per month).
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Tank Exterior Surface Area</span>
                  <span className="text-white font-bold">{metrics.tankAreaM2} m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Radiation Ingress Across {mliLayers}-Layer MLI</span>
                  <span className="text-cyan-400 font-bold">{metrics.qRadTotalW} Watts</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Parasitic Structural Strut Conduction</span>
                  <span className="text-slate-300 font-bold">{metrics.qCondTotalW} Watts</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Cryocooler Coefficient of Performance (COP)</span>
                  <span className="text-purple-400 font-bold">{metrics.actualCop}% of theoretical Carnot</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Thermal Cryo Preservation Status</span>
                  <span className={`font-bold ${activeZbo ? "text-emerald-400" : "text-amber-400"}`}>
                    {activeZbo ? "ZERO BOIL-OFF (100% PROPELLANT RETENTION)" : `PASSIVE VENTING (${metrics.boilOffKgDay} kg/day)`}
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
