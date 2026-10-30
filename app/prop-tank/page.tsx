"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Fuel, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Flame,
  Zap,
  Maximize2
} from "lucide-react"

interface TankPreset {
  name: string
  classType: string
  propellant: "Hydrazine (N2H4)" | "Green Monoprop (AF-M315E / ASCENT)" | "Xenon Gas (EP Supercritical)" | "High-Pressure Helium Pressurant (COPV)"
  tankVolumeLiters: number
  meopBar: number
  tankGeometry: "Spherical (Ti-6Al-4V)" | "Cylindrical COPV (Carbon Overwrap)" | "Diaphragm Tank (Piston/Elastomer)"
  linerThicknessMm: number
  overwrapThicknessMm: number
  initialUllagePct: number
  blowdownMode: "Blowdown (Regulated to Ullage Decay)" | "Constant Pressure Regulated"
  description: string
}

const TANK_PRESETS: Record<string, TankPreset> = {
  copv_xenon_electric: {
    name: "Supercritical Xenon Electric COPV (150 Bar)",
    classType: "Electric Propulsion Fuel System",
    propellant: "Xenon Gas (EP Supercritical)",
    tankVolumeLiters: 65,
    meopBar: 150,
    tankGeometry: "Cylindrical COPV (Carbon Overwrap)",
    linerThicknessMm: 1.2,
    overwrapThicknessMm: 6.5,
    initialUllagePct: 15,
    blowdownMode: "Constant Pressure Regulated",
    description: "High-pressure carbon fiber overwrapped pressure vessel feeding Hall-effect electric thrusters via two-stage regulators.",
  },
  hydrazine_blowdown_diaphragm: {
    name: "Classic Monoprop Hydrazine Diaphragm Tank",
    classType: "Chemical Monopropellant",
    propellant: "Hydrazine (N2H4)",
    tankVolumeLiters: 80,
    meopBar: 24,
    tankGeometry: "Diaphragm Tank (Piston/Elastomer)",
    linerThicknessMm: 2.2,
    overwrapThicknessMm: 0.0,
    initialUllagePct: 25,
    blowdownMode: "Blowdown (Regulated to Ullage Decay)",
    description: "Standard elastomeric diaphragm tank separating helium pressurant from liquid hydrazine in a 4:1 blowdown ratio.",
  },
  helium_pressurant_bottle: {
    name: "310-Bar High-Pressure Helium Pressurant Bottle",
    classType: "Main Engine Pressurant Feed",
    propellant: "High-Pressure Helium Pressurant (COPV)",
    tankVolumeLiters: 35,
    meopBar: 310,
    tankGeometry: "Spherical (Ti-6Al-4V)",
    linerThicknessMm: 4.8,
    overwrapThicknessMm: 0.0,
    initialUllagePct: 5,
    blowdownMode: "Blowdown (Regulated to Ullage Decay)",
    description: "Titanium alloy forged spherical bottle supplying high-pressure gas to bipropellant propellant tanks.",
  },
}

export default function PropellantTankPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("copv_xenon_electric")
  const [tankVolumeLiters, setTankVolumeLiters] = useState<number>(65)
  const [meopBar, setMeopBar] = useState<number>(150)
  const [linerThicknessMm, setLinerThicknessMm] = useState<number>(1.2)
  const [overwrapThicknessMm, setOverwrapThicknessMm] = useState<number>(6.5)
  const [initialUllagePct, setInitialUllagePct] = useState<number>(15)
  const [propellantExpendedPct, setPropellantExpendedPct] = useState<number>(65)

  const preset = TANK_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = TANK_PRESETS[key]
    setSelectedPresetKey(key)
    setTankVolumeLiters(p.tankVolumeLiters)
    setMeopBar(p.meopBar)
    setLinerThicknessMm(p.linerThicknessMm)
    setOverwrapThicknessMm(p.overwrapThicknessMm)
    setInitialUllagePct(p.initialUllagePct)
  }

  // NASA-STD-5019A Pressure Vessel & Blowdown Mechanics Calculations
  const metrics = useMemo(() => {
    // 1. Safety Factor Multipliers per Range Safety
    const proofFactor = 1.25 // Proof pressure = 1.25x MEOP
    const burstFactor = 1.50 // Minimum burst safety factor = 1.50x MEOP (2.0x for unshielded COPVs)

    const proofPressureBar = Math.round(meopBar * proofFactor * 10) / 10
    const reqBurstPressureBar = Math.round(meopBar * burstFactor * 10) / 10

    // 2. Tank Geometry & Equivalent Sphere Radius
    // Volume = (4/3) * pi * R^3 => R in meters
    const volumeM3 = tankVolumeLiters / 1000
    const radiusM = Math.pow((3 * volumeM3) / (4 * Math.PI), 1 / 3)
    const radiusMm = radiusM * 1000

    // 3. Hoop Stress at MEOP (MPa)
    // P in MPa = bar / 10
    const pMpa = meopBar / 10
    const totalWallThicknessMm = linerThicknessMm + overwrapThicknessMm

    // Spherical membrane hoop stress: sigma = (P * r) / (2 * t)
    const hoopStressMpa = Math.round(((pMpa * radiusMm) / (2 * Math.max(0.5, totalWallThicknessMm))) * 10) / 10

    // Material Allowable Yield Strength:
    // Ti-6Al-4V titanium ~ 880 MPa, T1000 Carbon Composite overwrap ~ 1800 MPa
    let yieldStrengthMpa = 880
    if (preset.tankGeometry.includes("Carbon")) yieldStrengthMpa = 1650

    // Structural Margin of Safety: MS = (Yield / (HoopStress * 1.25)) - 1
    const marginOfSafety = Math.round(((yieldStrengthMpa / (hoopStressMpa * 1.25)) - 1.0) * 100) / 100
    const pressureStructureSafe = marginOfSafety >= 0.0

    // 4. Ullage Blowdown Pressure Decay
    // Polytropic expansion with gamma ~ 1.25 for helium/nitrogen gas
    // Initial ullage volume V_u0 = V_tank * (ullage% / 100)
    // Propellant volume initially = V_tank * (1 - ullage%/100)
    // At expended%, new ullage volume = V_u0 + Propellant_expended
    const initialUllageVolLiters = tankVolumeLiters * (initialUllagePct / 100)
    const initialPropellantVolLiters = tankVolumeLiters - initialUllageVolLiters
    const currentExpendedVolLiters = initialPropellantVolLiters * (propellantExpendedPct / 100)
    const finalUllageVolLiters = initialUllageVolLiters + currentExpendedVolLiters

    const gamma = 1.25
    let currentPressureBar = meopBar
    if (preset.blowdownMode.includes("Blowdown")) {
      currentPressureBar = Math.round(
        (meopBar * Math.pow(initialUllageVolLiters / finalUllageVolLiters, gamma)) * 10
      ) / 10
    }

    const blowdownRatio = Math.round((meopBar / Math.max(1, currentPressureBar)) * 10) / 10

    return {
      proofPressureBar,
      reqBurstPressureBar,
      radiusMm: Math.round(radiusMm),
      hoopStressMpa,
      yieldStrengthMpa,
      marginOfSafety,
      pressureStructureSafe,
      currentPressureBar,
      blowdownRatio,
    }
  }, [meopBar, tankVolumeLiters, linerThicknessMm, overwrapThicknessMm, initialUllagePct, propellantExpendedPct, preset])

  const exportTankCSV = () => {
    const csv = `SPACECRAFT PROPELLANT TANK & PRESSURE SAFETY DOSSIER
Preset Tank Architecture,${preset.name}
Class,${preset.classType}
Stored Propellant/Gas,${preset.propellant}
Tank Architecture,${preset.tankGeometry}
Enclosed Volume,${tankVolumeLiters} Liters (Radius: ${metrics.radiusMm} mm)
Maximum Expected Operating Pressure (MEOP),${meopBar} Bar
Proof Test Pressure (1.25x),${metrics.proofPressureBar} Bar
Design Minimum Burst Pressure (1.50x),${metrics.reqBurstPressureBar} Bar
Metallic Liner Thickness,${linerThicknessMm} mm
Composite Overwrap Thickness,${overwrapThicknessMm} mm
Peak Membrane Hoop Stress,${metrics.hoopStressMpa} MPa
Material Yield Allowable,${metrics.yieldStrengthMpa} MPa
Structural Margin of Safety,${metrics.marginOfSafety} (Verdict: ${metrics.pressureStructureSafe ? "PRESSURE COMPLIANT" : "BURST MARGIN DEFICIT"})
Pressurization Control Mode,${preset.blowdownMode}
Initial Gas Ullage Fraction,${initialUllagePct}%
Propellant Consumption Depletion,${propellantExpendedPct}%
Current End-of-Life Ullage Pressure,${metrics.currentPressureBar} Bar
Lifecycle Blowdown Ratio,${metrics.blowdownRatio}:1`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-prop-tank-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Fuel className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA-STD-5019A Propulsion Tank Pressure Safety &amp; Blowdown Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              PROPELLANT TANK &amp; BLOWDOWN SAFETY
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model MEOP design burst margins, thin-walled COPV membrane hoop stresses, polytropic gas ullage blowdown curves, and range safety proof qualification standards.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportTankCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT TANK SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(TANK_PRESETS).map(([k, v]) => (
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
              Pressure Vessel &amp; Ullage Sizing
            </div>

            {/* Operating Pressure MEOP */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">OPERATING PRESSURE (MEOP)</label>
                <span className="text-cyan-400 font-bold">{meopBar} BAR</span>
              </div>
              <input
                type="range"
                min={15}
                max={350}
                step={5}
                value={meopBar}
                onChange={(e) => setMeopBar(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>24 Bar (Monoprop)</span>
                <span>150 Bar (Xenon)</span>
                <span>350 Bar (He Bottle)</span>
              </div>
            </div>

            {/* Tank Volume */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">ENCLOSED TANK VOLUME</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tankVolumeLiters}
                  onChange={(e) => setTankVolumeLiters(Math.max(5, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">Liters</span>
              </div>
            </div>

            {/* Wall Thicknesses */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">LINER (mm)</label>
                <input
                  type="number"
                  step={0.1}
                  value={linerThicknessMm}
                  onChange={(e) => setLinerThicknessMm(Math.max(0.5, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">OVERWRAP (mm)</label>
                <input
                  type="number"
                  step={0.5}
                  value={overwrapThicknessMm}
                  onChange={(e) => setOverwrapThicknessMm(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Initial Ullage & Mission Depletion */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Ullage Blowdown Dynamics (%)
              </span>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase">INITIAL GAS ULLAGE</span>
                    <span className="text-purple-400 font-bold">{initialUllagePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={40}
                    step={1}
                    value={initialUllagePct}
                    onChange={(e) => setInitialUllagePct(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase">PROPELLANT EXPENDED</span>
                    <span className="text-cyan-400 font-bold">{propellantExpendedPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={propellantExpendedPct}
                    onChange={(e) => setPropellantExpendedPct(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">VESSEL CLASS:</div>
              <p className="text-slate-300 font-mono text-[10px]">{preset.tankGeometry} | {preset.propellant}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> PEAK HOOP STRESS
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.hoopStressMpa} MPa</div>
                <div className="text-[10px] text-slate-500">Allowable: {metrics.yieldStrengthMpa} MPa</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.pressureStructureSafe ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  SAFETY MARGIN (MS)
                </div>
                <div className={`text-3xl font-black ${metrics.pressureStructureSafe ? "text-emerald-400" : "text-red-400"}`}>
                  +{metrics.marginOfSafety}
                </div>
                <div className="text-[10px] text-slate-500">Req: Proof 1.25x / Burst 1.5x</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-purple-400" /> CURRENT PRESSURE
                </div>
                <div className="text-3xl font-black text-white">{metrics.currentPressureBar} Bar</div>
                <div className="text-[10px] text-purple-400">{metrics.blowdownRatio}:1 Blowdown Decay</div>
              </div>
            </div>

            {/* Pressure Safety & Blowdown Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Range Safety Pressure Proof &amp; Burst Envelope Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.pressureStructureSafe
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.pressureStructureSafe ? "RANGE SAFETY CLEARED" : "PRESSURE STRUCTURAL HAZARD"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">PRESSURE CYCLE &amp; BLOWDOWN SUMMARY</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Holding <strong className="text-white">{meopBar} Bar MEOP</strong> inside a {tankVolumeLiters}L vessel generates a peak membrane hoop stress of <strong className="text-cyan-400">{metrics.hoopStressMpa} MPa</strong> against a material yield limit of <strong className="text-white">{metrics.yieldStrengthMpa} MPa</strong>, securing a positive structural margin of <strong className={metrics.pressureStructureSafe ? "text-emerald-400" : "text-red-400"}>+{metrics.marginOfSafety}</strong>.
                  As propellant is expended ({propellantExpendedPct}% consumed), gas ullage expansion decays tank supply pressure from {meopBar} Bar down to <strong className="text-purple-400">{metrics.currentPressureBar} Bar</strong> ({metrics.blowdownRatio}:1 blowdown ratio).
                  {!metrics.pressureStructureSafe && (
                    <span className="text-red-400 block mt-1">
                      Burst safety violation: Margin of safety is negative. Wall thickness is inadequate for MEOP plus required 1.5x burst factor. Increase carbon fiber overwrap thickness or thicken the metallic liner.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Proof Qualification Pressure (1.25x MEOP)</span>
                  <span className="text-white font-bold">{metrics.proofPressureBar} Bar</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Mandatory Minimum Burst Pressure (1.50x MEOP)</span>
                  <span className="text-cyan-400 font-bold">{metrics.reqBurstPressureBar} Bar</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Tank Mean Internal Radius</span>
                  <span className="text-white font-bold">{metrics.radiusMm} mm</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Structural Wall Thickness</span>
                  <span className="text-purple-400 font-bold">{(linerThicknessMm + overwrapThicknessMm).toFixed(1)} mm ({linerThicknessMm}mm liner + {overwrapThicknessMm}mm overwrap)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Range Safety Qualification Status</span>
                  <span className={`font-bold ${metrics.pressureStructureSafe ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.pressureStructureSafe ? "PASS (CLEARED FOR LAUNCH INTEGRATION)" : "FAIL (WALL REINFORCEMENT REQUIRED)"}
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
