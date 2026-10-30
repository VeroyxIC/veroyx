"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Sparkles, 
  Layers, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  Eye,
  ThermometerSnowflake,
  Activity,
  Layers2,
  Minimize2
} from "lucide-react"

interface OutgassingPreset {
  name: string
  classType: string
  materialType: "RTV Silicone Adhesive (Standard)" | "Cyanate Ester Low-VOC Epoxy" | "Polyurethane Conformal Coating" | "Pre-Baked Flight-Grade Epoxy"
  sourceMassKg: number
  astmTmlPct: number
  astmCvcmPct: number
  viewFactorPct: number
  opticTempK: number
  missionDurationYears: number
  bakeoutHours: number
  description: string
}

const OUTGASSING_PRESETS: Record<string, OutgassingPreset> = {
  cryogenic_ir_telescope: {
    name: "Sub-Kelvin IR Telescope Primary Mirror",
    classType: "Cryogenic Optical Observatory",
    materialType: "RTV Silicone Adhesive (Standard)",
    sourceMassKg: 8.5,
    astmTmlPct: 1.25, // Fails standard ASTM without pre-bake
    astmCvcmPct: 0.18,
    viewFactorPct: 4.5,
    opticTempK: 65,
    missionDurationYears: 5,
    bakeoutHours: 48,
    description: "Cold primary mirror acting as an efficient cold trap for condensable silicone outgassing volatiles.",
  },
  low_voc_composite_bus: {
    name: "Ultra-Clean Cyanate Ester Optical Bench",
    classType: "Earth Observation Recon",
    materialType: "Cyanate Ester Low-VOC Epoxy",
    sourceMassKg: 14.0,
    astmTmlPct: 0.35,
    astmCvcmPct: 0.02,
    viewFactorPct: 2.0,
    opticTempK: 260,
    missionDurationYears: 7,
    bakeoutHours: 96,
    description: "Low-outgassing structural composite bench pre-baked in thermal vacuum chamber prior to flight assembly.",
  },
  commercial_smallsat_cots: {
    name: "Commercial Smallsat Payload Bay",
    classType: "Commercial Smallsat",
    materialType: "Polyurethane Conformal Coating",
    sourceMassKg: 4.2,
    astmTmlPct: 0.95,
    astmCvcmPct: 0.09,
    viewFactorPct: 8.0,
    opticTempK: 240,
    missionDurationYears: 3,
    bakeoutHours: 0,
    description: "Unbaked commercial conformal coating outgassing directly inside compact optical camera enclosure.",
  },
}

export default function OutgassingSimulatorPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("cryogenic_ir_telescope")
  const [sourceMassKg, setSourceMassKg] = useState<number>(8.5)
  const [astmTmlPct, setAstmTmlPct] = useState<number>(1.25)
  const [astmCvcmPct, setAstmCvcmPct] = useState<number>(0.18)
  const [viewFactorPct, setViewFactorPct] = useState<number>(4.5)
  const [opticTempK, setOpticTempK] = useState<number>(65)
  const [missionYears, setMissionYears] = useState<number>(5)
  const [bakeoutHours, setBakeoutHours] = useState<number>(48)

  const preset = OUTGASSING_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = OUTGASSING_PRESETS[key]
    setSelectedPresetKey(key)
    setSourceMassKg(p.sourceMassKg)
    setAstmTmlPct(p.astmTmlPct)
    setAstmCvcmPct(p.astmCvcmPct)
    setViewFactorPct(p.viewFactorPct)
    setOpticTempK(p.opticTempK)
    setMissionYears(p.missionDurationYears)
    setBakeoutHours(p.bakeoutHours)
  }

  // ASTM E595 & Molecular Deposition Calculations
  const metrics = useMemo(() => {
    // 1. ASTM E595 Compliance Check
    const tmlPassed = astmTmlPct <= 1.00
    const cvcmPassed = astmCvcmPct <= 0.10
    const astmCompliant = tmlPassed && cvcmPassed

    // 2. Pre-Flight Vacuum Thermal Bakeout Depletion Factor
    // Outgassing decay tau ~ 24 hours at 100-120C
    const bakeoutReduction = Math.exp(-bakeoutHours / 28)
    const effectiveCvcmPct = astmCvcmPct * bakeoutReduction

    // 3. Sticking Coefficient Sc(T) on Target Optic
    // Cold surfaces freeze out volatiles; warm surfaces re-evaporate
    let stickingCoefficient = 0.05
    if (opticTempK < 100) stickingCoefficient = 0.95 // Cryogenic cold trap
    else if (opticTempK < 200) stickingCoefficient = 0.45
    else if (opticTempK < 270) stickingCoefficient = 0.12

    // 4. Total Volatile Mass Condensing onto Optic (Grams)
    // Total condensable mass emitted = SourceMass * Effective_CVCM
    const totalCondensableEmittedG = sourceMassKg * 1000 * (effectiveCvcmPct / 100)
    // Mass hitting optic = Emitted * ViewFactor * Sticking
    const massDepositedOpticG = totalCondensableEmittedG * (viewFactorPct / 100) * stickingCoefficient

    // 5. Film Thickness (Nanometers / Angstroms)
    // Assume deposited film density ~ 1.1 g/cm3, mirror area ~ 0.25 m2 (2500 cm2)
    const mirrorAreaCm2 = 2500
    const filmVolumeCm3 = massDepositedOpticG / 1.1
    const filmThicknessCm = filmVolumeCm3 / mirrorAreaCm2
    const filmThicknessNm = Math.round(filmThicknessCm * 1e7 * 10) / 10
    const filmThicknessAngstrom = Math.round(filmThicknessNm * 10)

    // 6. Optical Transmittance Degradation (UV/Visible % Loss)
    // Beer-Lambert absorption: Delta_T = 1 - exp(-alpha * t)
    // Absorption coefficient alpha ~ 0.0035 per nm in UV/visible
    const transmittanceLossPct = Math.min(
      95.0,
      Math.round((1 - Math.exp(-0.0035 * filmThicknessNm)) * 1000) / 10
    )

    // Threshold Check: High-precision optics require film < 10 nm (100 A) and loss < 3.0%
    const contaminationClean = filmThicknessNm <= 10.0 && astmCompliant

    return {
      tmlPassed,
      cvcmPassed,
      astmCompliant,
      bakeoutReductionPct: Math.round((1 - bakeoutReduction) * 100),
      stickingCoefficient,
      massDepositedOpticMg: Math.round(massDepositedOpticG * 1000 * 10) / 10,
      filmThicknessNm,
      filmThicknessAngstrom,
      transmittanceLossPct,
      contaminationClean,
    }
  }, [sourceMassKg, astmTmlPct, astmCvcmPct, viewFactorPct, opticTempK, bakeoutHours])

  const exportOutgassingCSV = () => {
    const csv = `SPACECRAFT OUTGASSING & OPTICAL CONTAMINATION DOSSIER
Preset Application,${preset.name}
Class,${preset.classType}
Outgassing Material Type,${preset.materialType}
Total Unbaked Material Mass,${sourceMassKg} kg
ASTM E595 Total Mass Loss (TML),${astmTmlPct}% (Limit: <= 1.00%)
ASTM E595 Condensable Material (CVCM),${astmCvcmPct}% (Limit: <= 0.10%)
Thermal Bakeout Duration,${bakeoutHours} hours (${metrics.bakeoutReductionPct}% Volatile Depletion)
Optical View Factor,${viewFactorPct}%
Target Surface Temperature,${opticTempK} K
Sticking Coefficient,${metrics.stickingCoefficient}
Total Condensed Mass on Optic,${metrics.massDepositedOpticMg} mg
Deposited Contaminant Film Thickness,${metrics.filmThicknessNm} nm (${metrics.filmThicknessAngstrom} Angstroms)
Optical Throughput Transmission Loss,${metrics.transmittanceLossPct}%
Contamination Screening Status,${metrics.contaminationClean ? "CLEARED (OPTICALLY CLEAN)" : "CONTAMINATION DEFICIT RISK"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-outgassing-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              ASTM E595 / NASA-STD-6016 Vacuum Outgassing &amp; Contamination Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              OUTGASSING &amp; OPTICAL DEPOSITION
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model ASTM E595 TML/CVCM volatile outgassing, view factor molecular deposition, cryogenic surface sticking coefficients, and nanometer film optical transmittance losses.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportOutgassingCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT CONTAMINATION SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(OUTGASSING_PRESETS).map(([k, v]) => (
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
              Material Properties &amp; Geometry
            </div>

            {/* Total Non-Metallic Material Mass */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">OUTGASSING SOURCE MASS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={0.5}
                  value={sourceMassKg}
                  onChange={(e) => setSourceMassKg(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* ASTM E595 Values */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 uppercase">TML (%)</span>
                  <span className={`font-bold ${metrics.tmlPassed ? "text-cyan-400" : "text-red-400"}`}>
                    {astmTmlPct}%
                  </span>
                </div>
                <input
                  type="number"
                  step={0.05}
                  value={astmTmlPct}
                  onChange={(e) => setAstmTmlPct(Math.max(0.01, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">ASTM Limit: &le; 1.00%</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 uppercase">CVCM (%)</span>
                  <span className={`font-bold ${metrics.cvcmPassed ? "text-purple-400" : "text-red-400"}`}>
                    {astmCvcmPct}%
                  </span>
                </div>
                <input
                  type="number"
                  step={0.01}
                  value={astmCvcmPct}
                  onChange={(e) => setAstmCvcmPct(Math.max(0.001, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">ASTM Limit: &le; 0.10%</span>
              </div>
            </div>

            {/* Vacuum Thermal Bakeout Duration */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">THERMAL VACUUM BAKEOUT</label>
                <span className="text-emerald-400 font-bold">{bakeoutHours} HOURS</span>
              </div>
              <input
                type="range"
                min={0}
                max={168}
                step={12}
                value={bakeoutHours}
                onChange={(e) => setBakeoutHours(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 hrs (No Bake)</span>
                <span>48 hrs (Standard)</span>
                <span>168 hrs (7 Days)</span>
              </div>
            </div>

            {/* View Factor & Optic Temp */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">VIEW FACTOR (%)</label>
                <input
                  type="number"
                  step={0.5}
                  value={viewFactorPct}
                  onChange={(e) => setViewFactorPct(Math.max(0.1, Math.min(100, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">Line-of-sight to optic</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">OPTIC TEMP (K)</label>
                <input
                  type="number"
                  value={opticTempK}
                  onChange={(e) => setOpticTempK(Math.max(20, Math.min(350, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">&lt; 100K = Cold Trap</span>
              </div>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">CONTAMINATION DOMAIN:</div>
              <p className="text-slate-300 font-mono text-[10px]">{preset.classType}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.contaminationClean ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  FILM THICKNESS
                </div>
                <div className={`text-3xl font-black ${metrics.contaminationClean ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.filmThicknessNm} nm
                </div>
                <div className="text-[10px] text-slate-500">
                  {metrics.filmThicknessAngstrom} &Aring; (Budget: &le; 10 nm)
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Eye className="w-3 h-3 text-purple-400" /> TRANSMISSION LOSS
                </div>
                <div className={`text-3xl font-black ${metrics.transmittanceLossPct > 5 ? "text-amber-400" : "text-white"}`}>
                  -{metrics.transmittanceLossPct}%
                </div>
                <div className="text-[10px] text-purple-400">UV/Visible Optical Degradation</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <ThermometerSnowflake className="w-3 h-3 text-cyan-400" /> CONDENSED MASS
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.massDepositedOpticMg} mg</div>
                <div className="text-[10px] text-slate-500">Sticking Coeff: {metrics.stickingCoefficient}</div>
              </div>
            </div>

            {/* Contamination Transport & ASTM Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers2 className="w-4 h-4 text-cyan-400" />
                  Molecular Transport &amp; Surface Deposition Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.contaminationClean
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.contaminationClean ? "NASA-STD-6016 COMPLIANT" : "CONTAMINATION VULNERABILITY"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">MOLECULAR ADSORPTION SUMMARY</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  The payload compartment contains <strong className="text-white">{sourceMassKg} kg</strong> of {preset.materialType}. With a {bakeoutHours}-hour thermal vacuum bakeout, condensable volatile emissions are reduced by <strong className="text-emerald-400">{metrics.bakeoutReductionPct}%</strong>.
                  With a direct line-of-sight view factor of <strong className="text-white">{viewFactorPct}%</strong> to the {opticTempK} K optical surface, <strong className="text-cyan-400">{metrics.massDepositedOpticMg} mg</strong> of condensable mass adheres (sticking coefficient {metrics.stickingCoefficient}), growing a <strong className={metrics.contaminationClean ? "text-emerald-400" : "text-red-400"}>{metrics.filmThicknessNm} nm film</strong> and causing a <strong className="text-purple-400">-{metrics.transmittanceLossPct}% transmission loss</strong>.
                  {!metrics.contaminationClean && (
                    <span className="text-red-400 block mt-1">
                      Contamination deficit: Film thickness exceeds the 10 nm optical cleanliness threshold or raw material violates ASTM E595 standards (TML &le; 1.00%, CVCM &le; 0.10%). Extend ground thermal bakeout or incorporate an active optical window heater (&gt; 280 K) to re-evaporate volatile organic condensates.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">ASTM E595 Total Mass Loss (TML)</span>
                  <span className={`font-bold ${metrics.tmlPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {astmTmlPct}% (Standard: &le; 1.00%)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">ASTM E595 Condensable Material (CVCM)</span>
                  <span className={`font-bold ${metrics.cvcmPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {astmCvcmPct}% (Standard: &le; 0.10%)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Bakeout Volatile Reservoir Depletion</span>
                  <span className="text-cyan-400 font-bold">-{metrics.bakeoutReductionPct}% reduction in {bakeoutHours} hrs</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Optical Transmittance Loss (UV/Vis)</span>
                  <span className="text-purple-400 font-bold">-{metrics.transmittanceLossPct}% throughput loss</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Flight Contamination Verification</span>
                  <span className={`font-bold ${metrics.contaminationClean ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.contaminationClean ? "PASS (CLEARED FOR OPTICAL FLIGHT INTEGRATION)" : "FAIL (BAKEOUT / HEATER REMEDIATION REQUIRED)"}
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
