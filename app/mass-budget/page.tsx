"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Scale, 
  Layers, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  Sliders,
  Move3d,
  Compass
} from "lucide-react"

interface SubsystemItem {
  name: string
  basicMassKg: number
  maturityStage: "Concept (30% MGA)" | "Preliminary (15% MGA)" | "Critical Design (10% MGA)" | "Flight Heritage (5% MGA)"
  xOffsetM: number
  yOffsetM: number
  zOffsetM: number // Longitudinal launcher axis
}

interface MassPreset {
  name: string
  classType: string
  launchLimitKg: number
  maxAllowableCgZM: number
  propellantLoadKg: number
  propellantTankZM: number
  subsystems: SubsystemItem[]
  description: string
}

const MASS_PRESETS: Record<string, MassPreset> = {
  smallsat_bus: {
    name: "Tactical LEO Smallsat Bus",
    classType: "500 kg ESPA-Class",
    launchLimitKg: 520,
    maxAllowableCgZM: 0.95,
    propellantLoadKg: 85,
    propellantTankZM: 0.55,
    subsystems: [
      { name: "Primary Structure & Panels", basicMassKg: 75, maturityStage: "Critical Design (10% MGA)", xOffsetM: 0.0, yOffsetM: 0.0, zOffsetM: 0.45 },
      { name: "Optical Telescope Payload", basicMassKg: 110, maturityStage: "Preliminary (15% MGA)", xOffsetM: 0.05, yOffsetM: 0.0, zOffsetM: 1.15 },
      { name: "EPS Batteries & Solar Arrays", basicMassKg: 55, maturityStage: "Flight Heritage (5% MGA)", xOffsetM: -0.05, yOffsetM: 0.12, zOffsetM: 0.60 },
      { name: "ADCS Wheels & Torquers", basicMassKg: 28, maturityStage: "Flight Heritage (5% MGA)", xOffsetM: 0.0, yOffsetM: -0.08, zOffsetM: 0.40 },
      { name: "Avionics & TT&C Transponders", basicMassKg: 22, maturityStage: "Critical Design (10% MGA)", xOffsetM: 0.02, yOffsetM: 0.04, zOffsetM: 0.50 },
      { name: "Thermal Insulation & MLI", basicMassKg: 14, maturityStage: "Preliminary (15% MGA)", xOffsetM: 0.0, yOffsetM: 0.0, zOffsetM: 0.70 },
      { name: "Propulsion Dry Hardware", basicMassKg: 24, maturityStage: "Critical Design (10% MGA)", xOffsetM: 0.0, yOffsetM: 0.0, zOffsetM: 0.25 },
    ],
    description: "ESPA-class multi-payload configuration verified against rideshare static envelope constraints.",
  },
  geo_telecom: {
    name: "GEO High-Power Communications Bus",
    classType: "4,500 kg Flagship Bus",
    launchLimitKg: 4600,
    maxAllowableCgZM: 2.40,
    propellantLoadKg: 2100,
    propellantTankZM: 1.45,
    subsystems: [
      { name: "Primary Central Cylinder & Thrust Cone", basicMassKg: 340, maturityStage: "Flight Heritage (5% MGA)", xOffsetM: 0.0, yOffsetM: 0.0, zOffsetM: 1.20 },
      { name: "Payload Repeater & Antennas", basicMassKg: 850, maturityStage: "Critical Design (10% MGA)", xOffsetM: 0.04, yOffsetM: 0.0, zOffsetM: 2.60 },
      { name: "Solar Wings & Drive Mechanism", basicMassKg: 280, maturityStage: "Flight Heritage (5% MGA)", xOffsetM: 0.0, yOffsetM: 0.15, zOffsetM: 1.80 },
      { name: "Power Electronics & Li-Ion Batteries", basicMassKg: 210, maturityStage: "Flight Heritage (5% MGA)", xOffsetM: -0.04, yOffsetM: -0.10, zOffsetM: 1.10 },
      { name: "ADCS & Sensors", basicMassKg: 95, maturityStage: "Flight Heritage (5% MGA)", xOffsetM: 0.0, yOffsetM: 0.05, zOffsetM: 1.30 },
      { name: "Liquid Apogee Engine & Dry Feed", basicMassKg: 85, maturityStage: "Flight Heritage (5% MGA)", xOffsetM: 0.0, yOffsetM: 0.0, zOffsetM: 0.35 },
      { name: "Thermal Radiators & Heat Pipes", basicMassKg: 130, maturityStage: "Preliminary (15% MGA)", xOffsetM: 0.08, yOffsetM: 0.0, zOffsetM: 1.75 },
    ],
    description: "High bipropellant mass fraction telecommunications platform with extensive apogee burn CG travel.",
  },
}

export default function MassBudgetPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("smallsat_bus")
  const [launchLimitKg, setLaunchLimitKg] = useState<number>(520)
  const [propellantLoadKg, setPropellantLoadKg] = useState<number>(85)
  const [subsystems, setSubsystems] = useState<SubsystemItem[]>(MASS_PRESETS.smallsat_bus.subsystems)

  const preset = MASS_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = MASS_PRESETS[key]
    setSelectedPresetKey(key)
    setLaunchLimitKg(p.launchLimitKg)
    setPropellantLoadKg(p.propellantLoadKg)
    setSubsystems(p.subsystems)
  }

  // AIAA S-120-2015 Mass Properties & CG Calculations
  const metrics = useMemo(() => {
    let totalBasicDryKg = 0
    let totalPredictedDryKg = 0
    let dryWeightedXM = 0
    let dryWeightedYM = 0
    let dryWeightedZM = 0

    const mgaFactors: Record<string, number> = {
      "Concept (30% MGA)": 0.30,
      "Preliminary (15% MGA)": 0.15,
      "Critical Design (10% MGA)": 0.10,
      "Flight Heritage (5% MGA)": 0.05,
    }

    subsystems.forEach((sub) => {
      const contingency = mgaFactors[sub.maturityStage] || 0.10
      const predictedMass = sub.basicMassKg * (1 + contingency)
      totalBasicDryKg += sub.basicMassKg
      totalPredictedDryKg += predictedMass

      dryWeightedXM += predictedMass * sub.xOffsetM
      dryWeightedYM += predictedMass * sub.yOffsetM
      dryWeightedZM += predictedMass * sub.zOffsetM
    })

    const dryCgXM = dryWeightedXM / Math.max(1, totalPredictedDryKg)
    const dryCgYM = dryWeightedYM / Math.max(1, totalPredictedDryKg)
    const dryCgZM = dryWeightedZM / Math.max(1, totalPredictedDryKg)

    // Wet Mass (Launch State)
    const wetLaunchMassKg = totalPredictedDryKg + propellantLoadKg
    const wetWeightedZM = dryWeightedZM + propellantLoadKg * preset.propellantTankZM
    const wetCgZM = wetWeightedZM / Math.max(1, wetLaunchMassKg)

    // Center of Gravity Travel (Wet Launch to Dry Burnout)
    const cgTravelZM = Math.abs(wetCgZM - dryCgZM)

    // Launch Mass Margin
    const massMarginKg = launchLimitKg - wetLaunchMassKg
    const massMarginPct = Math.round((massMarginKg / launchLimitKg) * 100)
    const launchLimitPassed = massMarginKg >= 0

    // CG Limits Check
    const cgWithinEnvelope = wetCgZM <= preset.maxAllowableCgZM

    // Approximate Mass Moments of Inertia around CG (kg*m2)
    // Steiner theorem on cylinder baseline
    const rEquivM = 0.65
    const hEquivM = wetCgZM * 1.8
    const ixxDry = (1 / 12) * totalPredictedDryKg * (3 * Math.pow(rEquivM, 2) + Math.pow(hEquivM, 2))
    const izzDry = 0.5 * totalPredictedDryKg * Math.pow(rEquivM, 2)

    return {
      totalBasicDryKg: Math.round(totalBasicDryKg * 10) / 10,
      totalPredictedDryKg: Math.round(totalPredictedDryKg * 10) / 10,
      mgaGrowthKg: Math.round((totalPredictedDryKg - totalBasicDryKg) * 10) / 10,
      wetLaunchMassKg: Math.round(wetLaunchMassKg * 10) / 10,
      massMarginKg: Math.round(massMarginKg * 10) / 10,
      massMarginPct,
      launchLimitPassed,
      dryCgXM: dryCgXM.toFixed(3),
      dryCgYM: dryCgYM.toFixed(3),
      dryCgZM: dryCgZM.toFixed(3),
      wetCgZM: wetCgZM.toFixed(3),
      cgTravelZM: (cgTravelZM * 100).toFixed(1), // cm
      cgWithinEnvelope,
      ixxDry: Math.round(ixxDry * 10) / 10,
      izzDry: Math.round(izzDry * 10) / 10,
    }
  }, [subsystems, propellantLoadKg, launchLimitKg, preset])

  const updateSubsystemMass = (index: number, newMass: number) => {
    setSubsystems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], basicMassKg: newMass }
      return updated
    })
  }

  const exportMassCSV = () => {
    const csv = `AIAA S-120-2015 SPACECRAFT MASS PROPERTIES & CG DOSSIER
Preset Architecture,${preset.name}
Class,${preset.classType}
Launch Vehicle Limit,${launchLimitKg} kg
Basic Dry Mass,${metrics.totalBasicDryKg} kg
Mass Growth Allowance (MGA),${metrics.mgaGrowthKg} kg
Predicted Dry Mass (with MGA),${metrics.totalPredictedDryKg} kg
Propellant Loaded,${propellantLoadKg} kg
Total Wet Launch Mass,${metrics.wetLaunchMassKg} kg
Mass Margin to Vehicle Limit,${metrics.massMarginKg} kg (${metrics.massMarginPct}%)
Launch Mass Status,${metrics.launchLimitPassed ? "APPROVED (WITHIN LIMIT)" : "OVERWEIGHT EXCEEDED"}
Dry Center of Gravity (X, Y, Z),${metrics.dryCgXM}, ${metrics.dryCgYM}, ${metrics.dryCgZM} m
Wet Launch Center of Gravity (Z),${metrics.wetCgZM} m (Max Allowable: ${preset.maxAllowableCgZM} m)
CG Travel During Depletion,${metrics.cgTravelZM} cm
Envelope Clearance,${metrics.cgWithinEnvelope ? "COMPLIANT" : "CG EXCEEDED"}
Principal Moments of Inertia (Ixx, Izz),${metrics.ixxDry}, ${metrics.izzDry} kg*m2`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-mass-properties-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Scale className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              ANSI/AIAA S-120-2015 Mass Properties &amp; Center of Gravity (CG) Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              MASS PROPERTIES &amp; CG TRAVEL
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model subsystem mass growth allowances (MGA), center of gravity travel across propellant depletion, mass moments of inertia (I_xx, I_zz), and launcher fairing interface limits.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportMassCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT MASS SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(MASS_PRESETS).map(([k, v]) => (
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

          {/* Subsystem WBS Itemized Inputs */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              Subsystem Mass Breakdown (WBS)
            </div>

            {/* Launch Vehicle Payload Limit */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">LAUNCH VEHICLE CAP (NTE LIMIT)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={launchLimitKg}
                  onChange={(e) => setLaunchLimitKg(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Loaded Propellant */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">LOADED USABLE PROPELLANT</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={propellantLoadKg}
                  onChange={(e) => setPropellantLoadKg(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Subsystem Itemized Editor */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Subsystem Basic Masses (kg)
              </span>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {subsystems.map((sub, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-[11px] truncate">{sub.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        {sub.maturityStage.split(" ")[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={sub.basicMassKg}
                        onChange={(e) => updateSubsystemMass(idx, Math.max(0, Number(e.target.value)))}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-500">
                        Z-Offset: {sub.zOffsetM}m
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Scale className="w-3 h-3 text-cyan-400" /> WET LAUNCH MASS
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.wetLaunchMassKg} kg</div>
                <div className="text-[10px] text-slate-500">Dry: {metrics.totalPredictedDryKg} kg + Prop: {propellantLoadKg} kg</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.launchLimitPassed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  LAUNCH VEHICLE MARGIN
                </div>
                <div className={`text-3xl font-black ${metrics.launchLimitPassed ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.massMarginKg >= 0 ? `+${metrics.massMarginKg}` : metrics.massMarginKg} kg
                </div>
                <div className="text-[10px] text-slate-500">{metrics.massMarginPct}% Headroom to Limit</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Move3d className="w-3 h-3 text-purple-400" /> CG TRAVEL (DEPLETION)
                </div>
                <div className="text-3xl font-black text-white">{metrics.cgTravelZM} cm</div>
                <div className="text-[10px] text-purple-400">Longitudinal Shift (Z)</div>
              </div>
            </div>

            {/* Mass Growth Allowance (MGA) & CG Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Center of Gravity Envelope &amp; Inertia Tensor
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.cgWithinEnvelope && metrics.launchLimitPassed
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.cgWithinEnvelope && metrics.launchLimitPassed
                    ? "LAUNCHER CLEARANCE APPROVED"
                    : "INTERFACE LIMIT EXCEEDED"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">AIAA S-120-2015 CONTINGENCY GROWTH FACTOR</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Basic hardware dry mass of <strong className="text-white">{metrics.totalBasicDryKg} kg</strong> incorporates <strong className="text-cyan-400">+{metrics.mgaGrowthKg} kg</strong> of standard mass growth allowance based on subsystem maturity levels, producing a predicted dry mass of <strong className="text-white">{metrics.totalPredictedDryKg} kg</strong>.
                  Center of gravity shifts from <strong className="text-purple-400">Z = {metrics.wetCgZM} m</strong> at lift-off to <strong className="text-cyan-400">Z = {metrics.dryCgZM} m</strong> after mission depletion.
                </p>
              </div>

              {/* Mass & CG Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Dry Center of Gravity (X, Y, Z)</span>
                  <span className="text-white font-bold">({metrics.dryCgXM}, {metrics.dryCgYM}, {metrics.dryCgZM}) meters</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Wet Center of Gravity (Longitudinal Z)</span>
                  <span className="text-cyan-400 font-bold">{metrics.wetCgZM} m (Max Allowable: {preset.maxAllowableCgZM} m)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Transverse Moment of Inertia (I_xx)</span>
                  <span className="text-purple-400 font-bold">{metrics.ixxDry} kg·m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Spin-Axis Moment of Inertia (I_zz)</span>
                  <span className="text-purple-400 font-bold">{metrics.izzDry} kg·m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Launch Limit Status</span>
                  <span className={`font-bold ${metrics.launchLimitPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.launchLimitPassed ? "PASS (WITHIN NOT-TO-EXCEED LIMIT)" : "OVERWEIGHT EXCEEDED"}
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
