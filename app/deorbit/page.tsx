"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Orbit, 
  Flame, 
  ShieldCheck, 
  AlertTriangle, 
  Gauge, 
  Download, 
  Layers, 
  Clock, 
  ArrowRight,
  Wind,
  Compass
} from "lucide-react"

interface DeorbitPreset {
  name: string
  operator: string
  altitudeKm: number
  spacecraftMassKg: number
  dragAreaM2: number
  dragCoeffCd: number
  solarActivity: "Solar Maximum (High Drag)" | "Solar Moderate" | "Solar Minimum (Low Drag)"
  hasDragSail: boolean
  sailAreaM2: number
  description: string
}

const DEORBIT_PRESETS: Record<string, DeorbitPreset> = {
  vleo_smallsat: {
    name: "Very Low Earth Orbit (VLEO) Bus",
    operator: "Commercial Earth Observation",
    altitudeKm: 350,
    spacecraftMassKg: 120,
    dragAreaM2: 0.8,
    dragCoeffCd: 2.2,
    solarActivity: "Solar Moderate",
    hasDragSail: false,
    sailAreaM2: 0,
    description: "Rapid natural decay driven by high neutral thermospheric density.",
  },
  fcc_standard_leo: {
    name: "Standard 550 km LEO Constellation (FCC Rule)",
    operator: "Commercial Broadband Mega-Constellation",
    altitudeKm: 550,
    spacecraftMassKg: 850,
    dragAreaM2: 5.5,
    dragCoeffCd: 2.2,
    solarActivity: "Solar Moderate",
    hasDragSail: false,
    sailAreaM2: 0,
    description: "Evaluates compliance against the FCC mandatory 5-year post-mission disposal rule.",
  },
  high_leo_dragsail: {
    name: "750 km High-LEO CubeSat with Deployable Drag Sail",
    operator: "Research / Scientific CubeSat",
    altitudeKm: 750,
    spacecraftMassKg: 16,
    dragAreaM2: 0.04,
    dragCoeffCd: 2.2,
    solarActivity: "Solar Moderate",
    hasDragSail: true,
    sailAreaM2: 4.0,
    description: "Uses a mechanical 4m² deployable aluminized Mylar sail to beat the 25-year natural decay trap.",
  },
  heavy_recon_sat: {
    name: "Heavy Polar Reconnaissance Satellite",
    operator: "Sovereign Defense ISR",
    altitudeKm: 650,
    spacecraftMassKg: 2800,
    dragAreaM2: 12.0,
    dragCoeffCd: 2.3,
    solarActivity: "Solar Minimum (Low Drag)",
    hasDragSail: false,
    sailAreaM2: 0,
    description: "High ballistic coefficient requiring active chemical propulsion burn for targeted Point Nemo de-orbit.",
  },
}

export default function DeorbitSimulatorPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("fcc_standard_leo")
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [spacecraftMassKg, setSpacecraftMassKg] = useState<number>(850)
  const [dragAreaM2, setDragAreaM2] = useState<number>(5.5)
  const [hasDragSail, setHasDragSail] = useState<boolean>(false)
  const [sailAreaM2, setSailAreaM2] = useState<number>(4.0)
  const [solarActivity, setSolarActivity] = useState<string>("Solar Moderate")

  const preset = DEORBIT_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = DEORBIT_PRESETS[key]
    setSelectedPresetKey(key)
    setAltitudeKm(p.altitudeKm)
    setSpacecraftMassKg(p.spacecraftMassKg)
    setDragAreaM2(p.dragAreaM2)
    setHasDragSail(p.hasDragSail)
    setSailAreaM2(p.sailAreaM2)
    setSolarActivity(p.solarActivity)
  }

  // De-Orbit Physics & Thermospheric Atmospheric Drag Calculations
  const metrics = useMemo(() => {
    const cd = 2.2
    const totalAreaM2 = dragAreaM2 + (hasDragSail ? sailAreaM2 : 0)

    // Ballistic Coefficient B = m / (Cd * A) (kg/m^2)
    const ballisticCoeff = spacecraftMassKg / (cd * Math.max(0.01, totalAreaM2))

    // Thermospheric Density Model (US Standard Atmosphere approximation)
    // Scale height H ~ 60km in upper thermosphere
    const h0 = 400
    const rho0 = 2.8e-12 // kg/m^3 at 400 km
    const scaleHeightKm = 58.0
    let solarMultiplier = 1.0
    if (solarActivity.includes("Maximum")) solarMultiplier = 2.4
    else if (solarActivity.includes("Minimum")) solarMultiplier = 0.45

    const localDensityKgM3 = rho0 * Math.exp(-(altitudeKm - h0) / scaleHeightKm) * solarMultiplier

    // Orbital decay lifetime empirical King-Hele model:
    // Lifetime t_decay ~ (H * B) / (2 * pi * sqrt(mu * a) * rho * r)
    // Approximate curve fit across LEO altitudes:
    let naturalDecayYears = 0.1
    if (altitudeKm <= 350) {
      naturalDecayYears = 0.25 * (ballisticCoeff / 100)
    } else if (altitudeKm <= 500) {
      naturalDecayYears = (2.2 * Math.pow((altitudeKm - 350) / 150, 2) + 0.5) * (ballisticCoeff / 80) / solarMultiplier
    } else if (altitudeKm <= 600) {
      naturalDecayYears = (5.5 + 14 * ((altitudeKm - 500) / 100)) * (ballisticCoeff / 90) / solarMultiplier
    } else if (altitudeKm <= 800) {
      naturalDecayYears = (25 + 120 * ((altitudeKm - 600) / 200)) * (ballisticCoeff / 100) / solarMultiplier
    } else {
      naturalDecayYears = (150 + 600 * ((altitudeKm - 800) / 200)) * (ballisticCoeff / 100) / solarMultiplier
    }

    const decayYearsFormatted = naturalDecayYears > 100 ? "> 100 Years" : `${Math.round(naturalDecayYears * 10) / 10} Years`

    // Compliance against FCC 5-year post-mission disposal rule
    const passesFcc5Year = naturalDecayYears <= 5.0
    const passesEsa25Year = naturalDecayYears <= 25.0

    // Targeted Controlled De-Orbit Delta-V (Targeting perigee = 50 km for prompt atmospheric destruction)
    const mu = 398600.4418
    const rCirc = 6378.1 + altitudeKm
    const rEntry = 6378.1 + 50.0 // 50 km reentry interface
    const vCirc = Math.sqrt(mu / rCirc) * 1000 // m/s
    const aTransfer = (rCirc + rEntry) / 2
    const vTransferApogee = Math.sqrt(mu * (2 / rCirc - 1 / aTransfer)) * 1000 // m/s
    const deltaVControlledDeorbitMs = Math.round(Math.abs(vCirc - vTransferApogee))

    // Hydrazine propellant required for controlled deorbit (Isp ~ 220s)
    const ispSec = 220
    const g0 = 9.80665
    const propMassKg = Math.round((spacecraftMassKg * (1 - Math.exp(-deltaVControlledDeorbitMs / (ispSec * g0)))) * 10) / 10

    return {
      totalAreaM2: totalAreaM2.toFixed(2),
      ballisticCoeff: ballisticCoeff.toFixed(1),
      naturalDecayYears,
      decayYearsFormatted,
      passesFcc5Year,
      passesEsa25Year,
      deltaVControlledDeorbitMs,
      propMassKg,
      localDensityKgM3: localDensityKgM3.toExponential(2),
    }
  }, [altitudeKm, spacecraftMassKg, dragAreaM2, hasDragSail, sailAreaM2, solarActivity])

  const exportDeorbitCSV = () => {
    const csv = `SPACECRAFT DE-ORBIT & ISO 24113 POST-MISSION DISPOSAL SPEC
Preset Architecture,${preset.name}
Operator,${preset.operator}
Orbital Altitude,${altitudeKm} km
Spacecraft Wet Mass,${spacecraftMassKg} kg
Cross-Sectional Drag Area,${metrics.totalAreaM2} m2 (Deployable Sail: ${hasDragSail})
Ballistic Coefficient (B),${metrics.ballisticCoeff} kg/m2
Thermospheric Density,${metrics.localDensityKgM3} kg/m3
Solar Activity Regime,${solarActivity}
Natural Orbital Decay Lifetime,${metrics.decayYearsFormatted}
FCC 5-Year Disposal Rule,${metrics.passesFcc5Year ? "COMPLIANT (PASS)" : "VIOLATION (>5 Years)"}
ESA/ISO 25-Year Disposal Guideline,${metrics.passesEsa25Year ? "COMPLIANT (PASS)" : "VIOLATION"}
Controlled De-Orbit Delta-V,${metrics.deltaVControlledDeorbitMs} m/s
Propellant Required for Targeted Re-entry,${metrics.propMassKg} kg (Hydrazine Isp 220s)`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-deorbit-compliance-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Flame className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              ISO 24113 / FCC 5-Year Space Debris Mitigation &amp; Decay Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              DE-ORBIT &amp; DISPOSAL COMPLIANCE
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model passive orbital lifetime decay, ballistic coefficients, solar-cycle thermospheric drag, deployable drag sails, and controlled de-orbit delta-V to Point Nemo.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportDeorbitCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT DISPOSAL DOSSIER
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(DEORBIT_PRESETS).map(([k, v]) => (
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
              Orbital Drag Parameters
            </div>

            {/* Orbit Altitude Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">INITIAL ORBIT ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={250}
                max={900}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 km (VLEO)</span>
                <span>550 km (FCC Threshold)</span>
                <span>900 km (High LEO)</span>
              </div>
            </div>

            {/* Spacecraft Mass */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SPACECRAFT DRY/WET MASS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={spacecraftMassKg}
                  onChange={(e) => setSpacecraftMassKg(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Primary Cross-Sectional Area */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">RAM CROSS-SECTION AREA</label>
                <span className="text-purple-400 font-bold">{dragAreaM2} m²</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={25.0}
                step={0.1}
                value={dragAreaM2}
                onChange={(e) => setDragAreaM2(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Deployable Drag Sail Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" /> DEPLOYABLE DRAG SAIL
                </span>
                <button
                  onClick={() => setHasDragSail(!hasDragSail)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                    hasDragSail
                      ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {hasDragSail ? "DEPLOYED" : "STOWED"}
                </button>
              </div>

              {hasDragSail && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">SAIL APERTURE AREA</span>
                    <span className="text-cyan-400 font-bold">{sailAreaM2} m²</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={0.5}
                    value={sailAreaM2}
                    onChange={(e) => setSailAreaM2(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Solar Activity Cycle */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">11-YEAR SOLAR CYCLE PHASE</label>
              <select
                value={solarActivity}
                onChange={(e) => setSolarActivity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Solar Maximum (High Drag)">Solar Maximum (High Drag / Expanded Exosphere)</option>
                <option value="Solar Moderate">Solar Moderate (Baseline F10.7 ~ 130)</option>
                <option value="Solar Minimum (Low Drag)">Solar Minimum (Low Density / Suppressed Drag)</option>
              </select>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> NATURAL ORBIT LIFETIME
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.decayYearsFormatted}</div>
                <div className="text-[10px] text-slate-500">Uncontrolled Atmospheric Decay</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.passesFcc5Year ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  FCC 5-YEAR DISPOSAL RULE
                </div>
                <div className={`text-3xl font-black ${metrics.passesFcc5Year ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.passesFcc5Year ? "COMPLIANT" : "VIOLATION"}
                </div>
                <div className="text-[10px] text-slate-500">Mandatory US License Criterion</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" /> TARGETED POINT NEMO ΔV
                </div>
                <div className="text-3xl font-black text-white">{metrics.deltaVControlledDeorbitMs} m/s</div>
                <div className="text-[10px] text-rose-400">Req. {metrics.propMassKg} kg Propellant</div>
              </div>
            </div>

            {/* Regulatory Compliance & Physics Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  ISO 24113 &amp; Global Space Debris Regulatory Review
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.passesFcc5Year
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.passesFcc5Year ? "FLIGHT DISPOSAL LICENSED" : "DISPOSAL PLAN DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">BALLISTIC COEFFICIENT &amp; DENSITY REGIME</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  With an effective cross-sectional drag area of <strong className="text-white">{metrics.totalAreaM2} m²</strong> and mass of <strong className="text-white">{spacecraftMassKg} kg</strong>, the satellite has a ballistic coefficient of <strong className="text-cyan-400">{metrics.ballisticCoeff} kg/m²</strong>. At {altitudeKm} km, atmospheric density is <strong className="text-white">{metrics.localDensityKgM3} kg/m³</strong>.
                  {!metrics.passesFcc5Year && (
                    <span className="text-amber-400 block mt-1">
                      Natural passive decay takes {metrics.decayYearsFormatted}, exceeding the FCC 5-year limit. To achieve license authorization, the operator must either integrate a deployable drag sail or reserve {metrics.propMassKg} kg of onboard propellant for an active retrograde burn of {metrics.deltaVControlledDeorbitMs} m/s into the South Pacific Uninhabited Area.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">ESA Zero Debris 2030 (ISO 24113 Standard)</span>
                  <span className={`font-bold ${metrics.passesEsa25Year ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.passesEsa25Year ? "COMPLIANT (< 25 Years)" : "NON-COMPLIANT"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Effective Drag Area</span>
                  <span className="text-white font-bold">{metrics.totalAreaM2} m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Controlled Targeted De-orbit Burn</span>
                  <span className="text-purple-400 font-bold">{metrics.deltaVControlledDeorbitMs} m/s retrograde</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Hydrazine Propellant Dedicated to Disposal</span>
                  <span className="text-rose-400 font-bold">{metrics.propMassKg} kg</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
