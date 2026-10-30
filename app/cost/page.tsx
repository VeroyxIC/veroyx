"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  DollarSign, 
  Layers, 
  Gauge, 
  Download, 
  ShieldCheck, 
  PieChart, 
  TrendingUp, 
  ArrowRight,
  Cpu,
  Rocket,
  Wrench,
  Boxes
} from "lucide-react"

interface CostPreset {
  name: string
  classType: string
  dryMassKg: number
  unitsToProduce: number
  trlAverage: number
  payloadType: "Optical" | "SAR" | "Comm Relay" | "Science"
  payloadMassKg: number
  propulsionMassKg: number
  powerMassKg: number
  adcsMassKg: number
  avionicsMassKg: number
  structureMassKg: number
  thermalMassKg: number
  launchVehicleCostM: number
  description: string
}

const COST_PRESETS: Record<string, CostPreset> = {
  smallsat_constellation: {
    name: "Commercial LEO Smallsat Bus",
    classType: "Smallsat (150 kg Class)",
    dryMassKg: 150,
    unitsToProduce: 24,
    trlAverage: 8,
    payloadType: "Optical",
    payloadMassKg: 45,
    propulsionMassKg: 15,
    powerMassKg: 28,
    adcsMassKg: 14,
    avionicsMassKg: 12,
    structureMassKg: 28,
    thermalMassKg: 8,
    launchVehicleCostM: 6.5,
    description: "Standardized proliferated LEO bus optimized for batch manufacturing and rideshare launches.",
  },
  geo_commsat: {
    name: "Heavy High-Power GEO Commsat",
    classType: "Flagship GEO (4,500 kg Class)",
    dryMassKg: 2800,
    unitsToProduce: 1,
    trlAverage: 9,
    payloadType: "Comm Relay",
    payloadMassKg: 950,
    propulsionMassKg: 320,
    powerMassKg: 520,
    adcsMassKg: 180,
    avionicsMassKg: 210,
    structureMassKg: 500,
    thermalMassKg: 120,
    launchVehicleCostM: 95.0,
    description: "High-reliability commercial communications satellite designed for 15+ years in geostationary orbit.",
  },
  defense_recon_sar: {
    name: "Sovereign SAR Reconnaissance Bus",
    classType: "Dedicated Defense ISR (1,200 kg Class)",
    dryMassKg: 1200,
    unitsToProduce: 4,
    trlAverage: 7,
    payloadType: "SAR",
    payloadMassKg: 480,
    propulsionMassKg: 110,
    powerMassKg: 240,
    adcsMassKg: 95,
    avionicsMassKg: 115,
    structureMassKg: 120,
    thermalMassKg: 40,
    launchVehicleCostM: 52.0,
    description: "Classified synthetic aperture radar payload with high-assurance radiation-hardened avionics.",
  },
}

export default function SpacecraftCostModelPage() {
  const [selectedKey, setSelectedKey] = useState<string>("smallsat_constellation")
  const [units, setUnits] = useState<number>(24)
  const [trl, setTrl] = useState<number>(8)
  const [structureMass, setStructureMass] = useState<number>(28)
  const [thermalMass, setThermalMass] = useState<number>(8)
  const [powerMass, setPowerMass] = useState<number>(28)
  const [adcsMass, setAdcsMass] = useState<number>(14)
  const [avionicsMass, setAvionicsMass] = useState<number>(12)
  const [propulsionMass, setPropulsionMass] = useState<number>(15)
  const [payloadMass, setPayloadMass] = useState<number>(45)
  const [launchCostM, setLaunchCostM] = useState<number>(6.5)

  const preset = COST_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = COST_PRESETS[key]
    setSelectedKey(key)
    setUnits(p.unitsToProduce)
    setTrl(p.trlAverage)
    setStructureMass(p.structureMassKg)
    setThermalMass(p.thermalMassKg)
    setPowerMass(p.powerMassKg)
    setAdcsMass(p.adcsMassKg)
    setAvionicsMass(p.avionicsMassKg)
    setPropulsionMass(p.propulsionMassKg)
    setPayloadMass(p.payloadMassKg)
    setLaunchCostM(p.launchVehicleCostM)
  }

  // Aerospace Cost Estimating Relationships (CERs) - USCM10 Model
  const breakdown = useMemo(() => {
    // TRL Risk multiplier: TRL 9 = 1.0, TRL 6 = 1.35, TRL 4 = 1.8
    const trlRiskFactor = Math.max(1.0, 1.0 + (9 - trl) * 0.12)

    // Subsystem Recurring Flight Hardware Cost (in $K)
    // Structure: 180 * M^0.65
    const cStructureRecK = 180 * Math.pow(Math.max(1, structureMass), 0.65)
    // Thermal: 220 * M^0.70
    const cThermalRecK = 220 * Math.pow(Math.max(1, thermalMass), 0.70)
    // EPS / Power: 340 * M^0.75
    const cPowerRecK = 340 * Math.pow(Math.max(1, powerMass), 0.75)
    // ADCS: 480 * M^0.60
    const cAdcsRecK = 480 * Math.pow(Math.max(1, adcsMass), 0.60)
    // Avionics / TT&C: 620 * M^0.55
    const cAvionicsRecK = 620 * Math.pow(Math.max(1, avionicsMass), 0.55)
    // Propulsion: 280 * M^0.72
    const cPropulsionRecK = 280 * Math.pow(Math.max(1, propulsionMass), 0.72)
    // Payload (Sensor / Comms): 980 * M^0.80
    const cPayloadRecK = 980 * Math.pow(Math.max(1, payloadMass), 0.80)

    const totalSubsystemsRecK =
      cStructureRecK +
      cThermalRecK +
      cPowerRecK +
      cAdcsRecK +
      cAvionicsRecK +
      cPropulsionRecK +
      cPayloadRecK

    // Non-Recurring Engineering (NRE) multiplier (~2.8x recurring baseline scaled by TRL)
    const nreBaseK = totalSubsystemsRecK * 2.8 * trlRiskFactor

    // Learning curve for multi-unit batch production (85% Crawford curve)
    // L = units^log2(0.85) = units^-0.234
    const learningCurveFactor = Math.pow(Math.max(1, units), -0.234)
    const totalRecurringAllUnitsK = totalSubsystemsRecK * units * learningCurveFactor

    // Assembly, Integration & Testing (AI&T) ~ 20%
    const aitK = (nreBaseK + totalRecurringAllUnitsK) * 0.18

    // Program Management, Systems Engineering & Mission Assurance (SE&I) ~ 18%
    const seiK = (nreBaseK + totalRecurringAllUnitsK) * 0.16

    // Spacecraft Segment Total ($M)
    const spacecraftTotalM = (nreBaseK + totalRecurringAllUnitsK + aitK + seiK) / 1000

    // Unit Recurring Flyaway Cost ($M per satellite)
    const unitFlyawayM = ((totalRecurringAllUnitsK / units) + ((aitK + seiK) / units * 0.4)) / 1000

    // Launch Segment Total
    const launchTotalM = launchCostM * Math.ceil(units / (units > 12 ? 12 : 1))

    // Total Program Lifecycle Cost ($M)
    const totalProgramM = spacecraftTotalM + launchTotalM

    const totalDryMassKg =
      structureMass +
      thermalMass +
      powerMass +
      adcsMass +
      avionicsMass +
      propulsionMass +
      payloadMass

    return {
      totalDryMassKg,
      nreBaseM: (nreBaseK / 1000).toFixed(2),
      recurringUnitsM: (totalRecurringAllUnitsK / 1000).toFixed(2),
      aitM: (aitK / 1000).toFixed(2),
      seiM: (seiK / 1000).toFixed(2),
      spacecraftTotalM: spacecraftTotalM.toFixed(2),
      unitFlyawayM: unitFlyawayM.toFixed(2),
      launchTotalM: launchTotalM.toFixed(2),
      totalProgramM: totalProgramM.toFixed(2),
      trlRiskFactor: trlRiskFactor.toFixed(2),
    }
  }, [
    trl,
    units,
    structureMass,
    thermalMass,
    powerMass,
    adcsMass,
    avionicsMass,
    propulsionMass,
    payloadMass,
    launchCostM,
  ])

  const exportCostCSV = () => {
    const csv = `SPACECRAFT WORK BREAKDOWN STRUCTURE (WBS) COST MODEL
Archetype,${preset.name}
Class,${preset.classType}
Units in Production,${units}
Average Subsystem TRL,${trl} (Risk Factor: ${breakdown.trlRiskFactor}x)
Total Spacecraft Dry Mass,${breakdown.totalDryMassKg} kg
Non-Recurring Engineering (NRE),$${breakdown.nreBaseM}M
Recurring Hardware Production (All Units),$${breakdown.recurringUnitsM}M
Assembly Integration & Testing (AI&T),$${breakdown.aitM}M
Systems Engineering & Assurance (SE&I),$${breakdown.seiM}M
Total Spacecraft Segment,$${breakdown.spacecraftTotalM}M
Unit Flyaway Cost,$${breakdown.unitFlyawayM}M / unit
Launch Services Segment,$${breakdown.launchTotalM}M
TOTAL PROGRAM LIFECYCLE COST,$${breakdown.totalProgramM}M`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-spacecraft-cost-wbs.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <DollarSign className="w-3.5 h-3.5 animate-pulse" />
              USCM10 Aerospace Cost Estimating Relationships (CER) &amp; WBS Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SPACECRAFT COST &amp; BOM ESTIMATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model non-recurring engineering (NRE), Crawford 85% learning-curve multi-unit production, subsystem mass CERs, AI&amp;T, and full mission program lifecycle budgets.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportCostCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT WBS MATRIX
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(COST_PRESETS).map(([k, v]) => (
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

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Subsystem Mass & Production Inputs */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Boxes className="w-4 h-4 text-cyan-400" />
              Subsystem Mass &amp; Program Scope
            </div>

            {/* Production Units */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">FLIGHT UNITS IN BATCH</label>
                <span className="text-cyan-400 font-bold">{units} SPACECRAFT</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 (Prototype)</span>
                <span>24 (Constellation Shell)</span>
                <span>100 (Mega)</span>
              </div>
            </div>

            {/* Technology Readiness Level */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">AVERAGE SUBSYSTEM TRL</label>
                <span className="text-purple-400 font-bold">TRL {trl} ({breakdown.trlRiskFactor}x NRE)</span>
              </div>
              <input
                type="range"
                min={4}
                max={9}
                value={trl}
                onChange={(e) => setTrl(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>TRL 4 (Lab Demo)</span>
                <span>TRL 7 (Space Tested)</span>
                <span>TRL 9 (Flight Heritage)</span>
              </div>
            </div>

            {/* Mass Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Subsystem Dry Masses (kg)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">PAYLOAD SENSOR</label>
                  <input
                    type="number"
                    value={payloadMass}
                    onChange={(e) => setPayloadMass(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">AVIONICS / TT&amp;C</label>
                  <input
                    type="number"
                    value={avionicsMass}
                    onChange={(e) => setAvionicsMass(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">POWER (EPS / ARRAYS)</label>
                  <input
                    type="number"
                    value={powerMass}
                    onChange={(e) => setPowerMass(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">ADCS / GUIDANCE</label>
                  <input
                    type="number"
                    value={adcsMass}
                    onChange={(e) => setAdcsMass(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">PROPULSION HARDWARE</label>
                  <input
                    type="number"
                    value={propulsionMass}
                    onChange={(e) => setPropulsionMass(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">PRIMARY STRUCTURE</label>
                  <input
                    type="number"
                    value={structureMass}
                    onChange={(e) => setStructureMass(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Launch Dedicated / Rideshare Cost */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">LAUNCH VEHICLE COST / FLIGHT</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={launchCostM}
                  onChange={(e) => setLaunchCostM(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">$M</span>
              </div>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Master Budget Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-cyan-400" /> TOTAL PROGRAM LIFECYCLE
                </div>
                <div className="text-3xl font-black text-cyan-400">${breakdown.totalProgramM}M</div>
                <div className="text-[10px] text-slate-500">{units} Spacecraft + Launch</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-purple-400" /> UNIT FLYAWAY COST
                </div>
                <div className="text-3xl font-black text-white">${breakdown.unitFlyawayM}M</div>
                <div className="text-[10px] text-purple-400">Recurring Hardware + AI&amp;T</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-emerald-400" /> TOTAL DRY MASS
                </div>
                <div className="text-3xl font-black text-emerald-400">{breakdown.totalDryMassKg} kg</div>
                <div className="text-[10px] text-slate-500">Bus + Payload Combined</div>
              </div>
            </div>

            {/* WBS Cost Breakdown Table */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  Spacecraft Work Breakdown Structure (WBS)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  USCM10 EMPIRICAL CER
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Non-Recurring Engineering (NRE &amp; Design)</span>
                  <span className="text-white font-bold">${breakdown.nreBaseM}M</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Recurring Flight Hardware (Crawford 85% Curve)</span>
                  <span className="text-cyan-400 font-bold">${breakdown.recurringUnitsM}M</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Assembly, Integration &amp; Testing (AI&amp;T - 18%)</span>
                  <span className="text-slate-200 font-bold">${breakdown.aitM}M</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Systems Engineering &amp; Mission Assurance (SE&amp;I - 16%)</span>
                  <span className="text-slate-200 font-bold">${breakdown.seiM}M</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Launch Services Segment</span>
                  <span className="text-purple-400 font-bold">${breakdown.launchTotalM}M</span>
                </div>
                <div className="flex justify-between py-2 bg-slate-950/80 px-3 rounded-lg border border-slate-800 font-bold">
                  <span className="text-white">NET ESTIMATED PROGRAM OBLIGATION</span>
                  <span className="text-cyan-400 text-sm">${breakdown.totalProgramM}M</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
