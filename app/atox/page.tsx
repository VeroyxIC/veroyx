"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Wind, 
  Flame, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Layers2,
  Cpu
} from "lucide-react"

interface AtoxPreset {
  name: string
  classType: string
  altitudeKm: number
  solarPhase: "Solar Maximum (High Density)" | "Solar Moderate" | "Solar Minimum (Low Density)"
  ramAreaM2: number
  spacecraftMassKg: number
  missionDurationYears: number
  outerMaterial: "Kapton Polyimide (Standard MLI)" | "Carbon Fiber Reinforced Polymer (CFRP)" | "Mylar Film" | "SiO2 / Al2O3 Coated (Passivated)"
  description: string
}

const ATOX_PRESETS: Record<string, AtoxPreset> = {
  vleo_recon_airbreathing: {
    name: "VLEO High-Resolution Recon (250 km)",
    classType: "Ultra-Low LEO Platform",
    altitudeKm: 250,
    solarPhase: "Solar Moderate",
    ramAreaM2: 1.2,
    spacecraftMassKg: 350,
    missionDurationYears: 3,
    outerMaterial: "SiO2 / Al2O3 Coated (Passivated)",
    description: "Operates in dense thermospheric ram flow requiring continuous electric thrust compensation and protective passivation.",
  },
  iss_external_payload: {
    name: "LEO Standard Orbit (400 km)",
    classType: "Space Station / Smallsat LEO",
    altitudeKm: 400,
    solarPhase: "Solar Maximum (High Density)",
    ramAreaM2: 2.5,
    spacecraftMassKg: 850,
    missionDurationYears: 5,
    outerMaterial: "Kapton Polyimide (Standard MLI)",
    description: "Classic LEO altitude exposed to significant atomic oxygen erosion across multi-year missions.",
  },
  sso_polar_observatory: {
    name: "Sun-Synchronous Earth Monitor (650 km)",
    classType: "Polar Flagship Bus",
    altitudeKm: 650,
    solarPhase: "Solar Moderate",
    ramAreaM2: 4.8,
    spacecraftMassKg: 1800,
    missionDurationYears: 10,
    outerMaterial: "Carbon Fiber Reinforced Polymer (CFRP)",
    description: "Ten-year high-altitude mission where atomic oxygen flux is attenuated but cumulative fluence degrades unshielded composites.",
  },
}

export default function AtoxSimulatorPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("iss_external_payload")
  const [altitudeKm, setAltitudeKm] = useState<number>(400)
  const [solarPhase, setSolarPhase] = useState<string>("Solar Maximum (High Density)")
  const [ramAreaM2, setRamAreaM2] = useState<number>(2.5)
  const [spacecraftMassKg, setSpacecraftMassKg] = useState<number>(850)
  const [missionYears, setMissionYears] = useState<number>(5)
  const [material, setMaterial] = useState<string>("Kapton Polyimide (Standard MLI)")

  const preset = ATOX_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = ATOX_PRESETS[key]
    setSelectedPresetKey(key)
    setAltitudeKm(p.altitudeKm)
    setSolarPhase(p.solarPhase)
    setRamAreaM2(p.ramAreaM2)
    setSpacecraftMassKg(p.spacecraftMassKg)
    setMissionYears(p.missionDurationYears)
    setMaterial(p.outerMaterial)
  }

  // NRLMSISE-00 Neutral Atmosphere & ATOX Physics Calculations
  const metrics = useMemo(() => {
    const cd = 2.2
    const rEarthKm = 6378.1
    const rOrbKm = rEarthKm + altitudeKm
    const mu = 398600.4418 // km3/s2

    // Orbital speed in km/s and m/s
    const vOrbKmS = Math.sqrt(mu / rOrbKm)
    const vOrbMS = vOrbKmS * 1000

    // Solar cycle activity density multiplier
    let solarMult = 1.0
    if (solarPhase.includes("Maximum")) solarMult = 2.8
    else if (solarPhase.includes("Minimum")) solarMult = 0.4

    // Thermospheric Density (kg/m3) and Neutral Atomic Oxygen Number Density (atoms/cm3)
    // Scale height H ~ 55 km
    const h0 = 400
    const rho0 = 2.8e-12 * solarMult // baseline at 400 km
    const densityKgM3 = rho0 * Math.exp(-(altitudeKm - h0) / 55.0)

    // Atomic oxygen number density (atoms/cm3)
    // In lower thermosphere, atomic oxygen represents ~80% of neutral composition
    const baseAoDensityAtomsCm3 = 2.5e8 * solarMult
    const aoNumberDensityAtomsCm3 = baseAoDensityAtomsCm3 * Math.exp(-(altitudeKm - h0) / 58.0)

    // Ram Atomic Oxygen Flux (atoms / (cm2 * s))
    // Flux = n_AO * v_rel (v in cm/s = v_ms * 100)
    const vRelCmS = vOrbMS * 100
    const aoFluxAtomsCm2S = aoNumberDensityAtomsCm3 * vRelCmS

    // Total Mission Cumulative Fluence (atoms / cm2)
    const missionSec = missionYears * 365.25 * 86400
    const totalFluenceAtomsCm2 = aoFluxAtomsCm2S * missionSec

    // Material-specific erosion yield (cm3 / atom)
    let erosionYieldCm3Atom = 3.0e-24 // Kapton
    if (material.includes("Carbon Fiber")) erosionYieldCm3Atom = 2.1e-24
    else if (material.includes("Mylar")) erosionYieldCm3Atom = 3.4e-24
    else if (material.includes("Coated")) erosionYieldCm3Atom = 1.0e-26 // Passivated

    // Total Surface Recession Thickness (micrometers / microns)
    // Delta x (cm) = Ey * Fluence -> microns = cm * 10,000
    const recessionThicknessCm = erosionYieldCm3Atom * totalFluenceAtomsCm2
    const recessionMicrons = Math.round(recessionThicknessCm * 10000 * 10) / 10

    // Continuous Aerodynamic Drag Force (Newtons & milliNewtons)
    // F_drag = 0.5 * rho * v^2 * Cd * A
    const dragForceN = 0.5 * densityKgM3 * Math.pow(vOrbMS, 2) * cd * ramAreaM2
    const dragForceMN = Math.round(dragForceN * 1000 * 10) / 10

    // Annual Orbit Deceleration (km of altitude loss per year without drag make-up)
    const orbitDecelerationMsYear = (dragForceN / spacecraftMassKg) * (365.25 * 86400)
    const annualAltitudeDropKm = Math.min(
      altitudeKm,
      Math.round(((orbitDecelerationMsYear * 2 * altitudeKm) / vOrbMS) * 10) / 10
    )

    // Threshold check: MLI thermal blanket failure occurs when recession > 25 microns (1 mil of Kapton)
    const mliFailureRisk = recessionMicrons > 25.0

    return {
      densityKgM3: densityKgM3.toExponential(2),
      aoFluxAtomsCm2S: aoFluxAtomsCm2S.toExponential(2),
      totalFluenceAtomsCm2: totalFluenceAtomsCm2.toExponential(2),
      recessionMicrons,
      dragForceMN,
      annualAltitudeDropKm,
      mliFailureRisk,
    }
  }, [altitudeKm, solarPhase, ramAreaM2, spacecraftMassKg, missionYears, material])

  const exportAtoxCSV = () => {
    const csv = `SPACECRAFT ATOMIC OXYGEN & THERMOSPHERIC DRAG DOSSIER
Preset Architecture,${preset.name}
Class,${preset.classType}
Orbital Altitude,${altitudeKm} km
11-Year Solar Phase,${solarPhase}
Spacecraft Ram Surface Area,${ramAreaM2} m2
Spacecraft Mass,${spacecraftMassKg} kg
Mission Duration,${missionYears} years
Exposed Surface Material,${material}
Thermospheric Gas Density,${metrics.densityKgM3} kg/m3
Instantaneous Ram ATOX Flux,${metrics.aoFluxAtomsCm2S} atoms/cm2/s
Total Cumulative Mission Fluence,${metrics.totalFluenceAtomsCm2} atoms/cm2
Surface Recession Depth,${metrics.recessionMicrons} microns (Threshold: 25.0 microns)
Thermal Blanket Integrity,${metrics.mliFailureRisk ? "COMPROMISED (PERFORATION RISK)" : "MAINTAINED (PASS)"}
Continuous Aerodynamic Drag Force,${metrics.dragForceMN} mN
Uncompensated Annual Altitude Loss,${metrics.annualAltitudeDropKm} km/year`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-atox-drag-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Wind className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA SP-8072 Atomic Oxygen (ATOX) Erosion &amp; Thermospheric Drag Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ATOMIC OXYGEN &amp; DRAG MAKE-UP
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model neutral atomic oxygen (AO) hyperthermal ram flux, multi-year Kapton/CFRP surface recession depths, aerodynamic drag forces, and continuous thrust requirements.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportAtoxCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT ATOX SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(ATOX_PRESETS).map(([k, v]) => (
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
              Thermospheric Drag Parameters
            </div>

            {/* Orbit Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ORBITAL ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={200}
                max={750}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>200 km (VLEO)</span>
                <span>400 km (LEO Standard)</span>
                <span>750 km (Upper LEO)</span>
              </div>
            </div>

            {/* Solar Activity Cycle */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">11-YEAR SOLAR CYCLE REGIME</label>
              <select
                value={solarPhase}
                onChange={(e) => setSolarPhase(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Solar Maximum (High Density)">Solar Maximum (High Neutral Density / Expanded Exosphere)</option>
                <option value="Solar Moderate">Solar Moderate (Baseline F10.7 ~ 130)</option>
                <option value="Solar Minimum (Low Density)">Solar Minimum (Low Density / Suppressed Drag)</option>
              </select>
            </div>

            {/* Surface Material Selection */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">EXPOSED RAM SURFACE MATERIAL</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Kapton Polyimide (Standard MLI)">Kapton Polyimide (Standard MLI Blanket - Ey: 3.0e-24)</option>
                <option value="Carbon Fiber Reinforced Polymer (CFRP)">Carbon Fiber CFRP Structure (Ey: 2.1e-24)</option>
                <option value="Mylar Film">Mylar Film (Ey: 3.4e-24)</option>
                <option value="SiO2 / Al2O3 Coated (Passivated)">SiO2 / Al2O3 Coated (Passivated Shield - Ey: 1.0e-26)</option>
              </select>
            </div>

            {/* Spacecraft Geometry */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">RAM CROSS SECTION</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={ramAreaM2}
                    onChange={(e) => setRamAreaM2(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m²</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SPACECRAFT MASS</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={spacecraftMassKg}
                    onChange={(e) => setSpacecraftMassKg(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">kg</span>
                </div>
              </div>
            </div>

            {/* Mission Duration */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400">MISSION LIFETIME</label>
                <span className="text-purple-400 font-bold">{missionYears} YEARS</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={missionYears}
                onChange={(e) => setMissionYears(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.mliFailureRisk ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  )}
                  SURFACE RECESSION
                </div>
                <div className={`text-3xl font-black ${metrics.mliFailureRisk ? "text-red-400" : "text-cyan-400"}`}>
                  {metrics.recessionMicrons} µm
                </div>
                <div className="text-[10px] text-slate-500">Material Erosion Depth</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Wind className="w-3 h-3 text-purple-400" /> CONTINUOUS DRAG
                </div>
                <div className="text-3xl font-black text-white">{metrics.dragForceMN} mN</div>
                <div className="text-[10px] text-purple-400">Req. Thruster Make-Up Force</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-emerald-400" /> NATURAL ALTITUDE LOSS
                </div>
                <div className="text-3xl font-black text-emerald-400">-{metrics.annualAltitudeDropKm} km/yr</div>
                <div className="text-[10px] text-slate-500">Decay Without Propulsion</div>
              </div>
            </div>

            {/* Material Degradation & Flight Clearance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers2 className="w-4 h-4 text-cyan-400" />
                  Atomic Oxygen Degradation &amp; Aerodynamic Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.mliFailureRisk
                    ? "bg-red-950 border-red-500/40 text-red-300"
                    : "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                }`}>
                  {metrics.mliFailureRisk ? "EROSION PERFORATION DEFICIT" : "MATERIAL INTEGRITY CLEARED"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">AERODYNAMIC DECELERATION PROFILE</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  At {altitudeKm} km altitude, the spacecraft encounters an atomic oxygen flux of <strong className="text-white">{metrics.aoFluxAtomsCm2S} atoms/cm²/s</strong>, accumulating a cumulative mission fluence of <strong className="text-cyan-400">{metrics.totalFluenceAtomsCm2} atoms/cm²</strong> over {missionYears} years. 
                  Continuous atmospheric drag exerts <strong className="text-purple-400">{metrics.dragForceMN} mN</strong> of retarding force.
                  {metrics.mliFailureRisk ? (
                    <span className="text-red-400 block mt-1">
                      Material warning: Cumulative erosion depth ({metrics.recessionMicrons} µm) exceeds the standard 25 µm (1-mil) thickness of typical Kapton MLI thermal blankets, risking unshielded structural exposure. Apply a thin passivating layer of SiO2 or anodized aluminium.
                    </span>
                  ) : (
                    <span className="text-emerald-400 block mt-1">
                      Material erosion is within acceptable limits. Integrated thermal blankets and structural composites will survive nominal mission life without burn-through.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Thermospheric Atmospheric Density (rho)</span>
                  <span className="text-white font-bold">{metrics.densityKgM3} kg/m³</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Instantaneous Ram ATOX Flux</span>
                  <span className="text-cyan-400 font-bold">{metrics.aoFluxAtomsCm2S} atoms/cm²/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Cumulative Mission Fluence</span>
                  <span className="text-purple-400 font-bold">{metrics.totalFluenceAtomsCm2} atoms/cm²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Material Recession Depth</span>
                  <span className={`font-bold ${metrics.mliFailureRisk ? "text-red-400" : "text-emerald-400"}`}>
                    {metrics.recessionMicrons} µm (Limit: 25.0 µm)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Drag Make-Up Thrust Required</span>
                  <span className="text-slate-200 font-bold">&ge; {metrics.dragForceMN} mN continuous</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
