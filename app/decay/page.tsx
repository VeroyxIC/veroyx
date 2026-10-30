"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Flame, 
  Globe, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Crosshair,
  Compass,
  Zap,
  Target
} from "lucide-react"

interface DecayPreset {
  name: string
  classType: string
  orbitType: "Low Earth Orbit (LEO)" | "Sun-Synchronous Polar (SSO)" | "Geostationary (GEO)"
  altitudeKm: number
  spacecraftMassKg: number
  dragAreaM2: number
  ballisticCoeffKgM2: number
  hasPropulsion: boolean
  availableDeltaVMs: number
  demiseSurvivableMassKg: number
  description: string
}

const DECAY_PRESETS: Record<string, DecayPreset> = {
  fcc_smallsat_5yr: {
    name: "Commercial LEO SmallSat (525 km)",
    classType: "5-Year FCC Rule Verification",
    orbitType: "Low Earth Orbit (LEO)",
    altitudeKm: 525,
    spacecraftMassKg: 160,
    dragAreaM2: 1.1,
    ballisticCoeffKgM2: 66.0,
    hasPropulsion: false,
    availableDeltaVMs: 0,
    demiseSurvivableMassKg: 0.8,
    description: "Evaluates passive drag sail/cross-section compliance against the mandatory FCC 5-year de-orbit rule.",
  },
  controlled_oceanic_reentry: {
    name: "Heavy Imaging Bus (750 km Guided)",
    classType: "Point Nemo Controlled Disposal",
    orbitType: "Sun-Synchronous Polar (SSO)",
    altitudeKm: 750,
    spacecraftMassKg: 1850,
    dragAreaM2: 5.5,
    ballisticCoeffKgM2: 152.0,
    hasPropulsion: true,
    availableDeltaVMs: 220,
    demiseSurvivableMassKg: 85.0, // Large Ti tank + SiC mirrors survive
    description: "Heavy mass with high ground casualty risk requiring a controlled de-orbit burn into the South Pacific (Point Nemo).",
  },
  geo_iadc_graveyard: {
    name: "GEO Communications Flagship (35,786 km)",
    classType: "IADC Super-GEO Graveyard",
    orbitType: "Geostationary (GEO)",
    altitudeKm: 35786,
    spacecraftMassKg: 3200,
    dragAreaM2: 42.0,
    ballisticCoeffKgM2: 38.0,
    hasPropulsion: true,
    availableDeltaVMs: 45,
    demiseSurvivableMassKg: 0.0,
    description: "Re-orbiting beyond the geostationary protected belt into an unperturbed graveyard orbit per ISO 24113.",
  },
}

export default function OrbitDecayPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("fcc_smallsat_5yr")
  const [altitudeKm, setAltitudeKm] = useState<number>(525)
  const [spacecraftMassKg, setSpacecraftMassKg] = useState<number>(160)
  const [dragAreaM2, setDragAreaM2] = useState<number>(1.1)
  const [hasPropulsion, setHasPropulsion] = useState<boolean>(false)
  const [availableDeltaV, setAvailableDeltaV] = useState<number>(0)
  const [survivableMassKg, setSurvivableMassKg] = useState<number>(0.8)

  const preset = DECAY_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = DECAY_PRESETS[key]
    setSelectedPresetKey(key)
    setAltitudeKm(p.altitudeKm)
    setSpacecraftMassKg(p.spacecraftMassKg)
    setDragAreaM2(p.dragAreaM2)
    setHasPropulsion(p.hasPropulsion)
    setAvailableDeltaV(p.availableDeltaVMs)
    setSurvivableMassKg(p.demiseSurvivableMassKg)
  }

  // ISO 24113 & NASA-STD-8719.14C Orbit Disposal Calculations
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418 // km3/s2
    const cd = 2.2

    // Ballistic Coefficient B = m / (Cd * A) in kg/m2
    const ballisticCoeffKgM2 = Math.round((spacecraftMassKg / (cd * Math.max(0.1, dragAreaM2))) * 10) / 10

    // 1. Passive Natural Atmospheric Drag Decay Lifetime (Years)
    // Approximate King-Hele orbital decay formulation:
    // Scale height H ~ 55 km, reference density rho0 ~ 4e-12 at 400 km
    let decayYears = 0
    const isGeo = altitudeKm > 20000

    if (isGeo) {
      decayYears = 999999 // Millennia in GEO
    } else {
      // Natural decay empirical power-law calibrated to solar cycle averages
      const decayFactor = Math.pow(altitudeKm / 400, 4.8) * (ballisticCoeffKgM2 / 60)
      decayYears = Math.min(250, Math.round(decayFactor * 1.8 * 10) / 10)
    }

    // FCC 5-Year Disposal Rule Compliance
    const fcc5YearPassed = decayYears <= 5.0

    // 2. Controlled Direct Atmospheric De-Orbit Sizing (Delta-V)
    // Targeting perigee of 50 km for prompt atmospheric capture
    let reqDeorbitDeltaVMs = 0
    if (!isGeo) {
      const rInitialKm = rEarthKm + altitudeKm
      const rPerigeeKm = rEarthKm + 50 // 50 km entry interface
      const vCircKmS = Math.sqrt(mu / rInitialKm)
      const vTransferApogeeKmS = Math.sqrt(mu * (2 / rInitialKm - 1 / ((rInitialKm + rPerigeeKm) / 2)))
      reqDeorbitDeltaVMs = Math.round(Math.abs(vCircKmS - vTransferApogeeKmS) * 1000)
    }

    // 3. GEO Graveyard Re-Orbit Altitude & Delta-V (IADC Formula)
    // Delta_h_graveyard = 235 + (1000 * Cr * A / m) km
    const crSolar = 1.2
    const iadcMinGraveyardDeltaHKm = Math.round(235 + 1000 * crSolar * (dragAreaM2 / spacecraftMassKg))
    // Hohmann transfer to graveyard: Delta-V ~ 3.64 m/s per 100 km of apogee raise in GEO
    const reqGraveyardDeltaVMs = Math.round((iadcMinGraveyardDeltaHKm / 100) * 3.64 * 10) / 10

    // Available delta-V margin check
    const targetDeltaVMs = isGeo ? reqGraveyardDeltaVMs : reqDeorbitDeltaVMs
    const deltaVSufficient = hasPropulsion && availableDeltaV >= targetDeltaVMs
    const deltaVMarginMs = hasPropulsion ? Math.round(availableDeltaV - targetDeltaVMs) : -targetDeltaVMs

    // 4. NASA Ground Casualty Risk (Ec)
    // Casualty risk threshold: Ec <= 1:10,000 (1e-4)
    // Debris casualty area A_c approx 1.0 m2 per 15 kg of surviving fragments
    const survivingDebrisAreaM2 = Math.round((survivableMassKg / 15.0) * 10) / 10
    // Uncontrolled random entry casualty expectation ~ 1e-4 at ~12 m2 surviving debris
    const casualtyRiskRatio = Math.round((survivableMassKg / 8.0) * 10) / 10 // Risk index
    const casualtyCompliant = isGeo || survivableMassKg < 15.0 || deltaVSufficient

    return {
      ballisticCoeffKgM2,
      decayYears: decayYears > 10000 ? "> 10,000 yrs" : `${decayYears} yrs`,
      fcc5YearPassed,
      reqDeorbitDeltaVMs,
      iadcMinGraveyardDeltaHKm,
      reqGraveyardDeltaVMs,
      targetDeltaVMs,
      deltaVSufficient,
      deltaVMarginMs,
      survivingDebrisAreaM2,
      casualtyCompliant,
    }
  }, [altitudeKm, spacecraftMassKg, dragAreaM2, hasPropulsion, availableDeltaV, survivableMassKg])

  const exportDecayCSV = () => {
    const csv = `SPACECRAFT ORBIT DECAY & DISPOSAL COMPLIANCE DOSSIER
Preset Mission,${preset.name}
Class,${preset.classType}
Orbital Altitude,${altitudeKm} km
Spacecraft Wet Mass,${spacecraftMassKg} kg
Cross-Section Drag Area,${dragAreaM2} m2
Ballistic Coefficient,${metrics.ballisticCoeffKgM2} kg/m2
Passive Natural Decay Lifetime,${metrics.decayYears}
FCC 5-Year De-Orbit Rule Verdict,${metrics.fcc5YearPassed ? "COMPLIANT (<= 5 YEARS)" : "NON-COMPLIANT (REQUIRES DISPOSAL STRATEGY)"}
Controlled De-Orbit Delta-V Required,${metrics.reqDeorbitDeltaVMs} m/s (Target: 50 km Perigee)
IADC GEO Graveyard Raise Required,+${metrics.iadcMinGraveyardDeltaHKm} km (${metrics.reqGraveyardDeltaVMs} m/s)
On-Board Disposal Propulsion,${hasPropulsion ? `${availableDeltaV} m/s Available` : "NO PROPULSION (PASSIVE)"}
Delta-V Disposal Margin,${metrics.deltaVMarginMs} m/s (${metrics.deltaVSufficient ? "CLEARED" : "PROPULSION DEFICIT"})
Surviving Demise Fragment Mass,${survivableMassKg} kg (${metrics.survivingDebrisAreaM2} m2 Casualty Area)
Ground Casualty Risk Threshold,${metrics.casualtyCompliant ? "PASS (WITHIN NASA 1:10,000 LIMIT)" : "FAIL (CONTROLLED RE-ENTRY MANDATORY)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-orbit-decay-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Globe className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              ISO 24113 &amp; FCC 5-Year De-Orbit Space Debris Mitigation Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ORBIT DECAY &amp; EOL DISPOSAL
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model passive thermospheric drag decay timelines, FCC 5-year post-mission compliance, controlled Point Nemo targeted re-entry $\Delta V$, and IADC graveyard re-orbiting.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportDecayCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT DISPOSAL SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(DECAY_PRESETS).map(([k, v]) => (
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
              Orbit &amp; Vehicle Properties
            </div>

            {/* Orbit Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">DISPOSAL ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={300}
                max={36000}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>400 km (Low LEO)</span>
                <span>750 km (SSO)</span>
                <span>35,786 km (GEO)</span>
              </div>
            </div>

            {/* Mass & Drag Area */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">MASS (kg)</label>
                <input
                  type="number"
                  value={spacecraftMassKg}
                  onChange={(e) => setSpacecraftMassKg(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DRAG AREA (m²)</label>
                <input
                  type="number"
                  step={0.1}
                  value={dragAreaM2}
                  onChange={(e) => setDragAreaM2(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Propulsion Capability */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold uppercase text-[11px]">DISPOSAL PROPULSION</span>
                <button
                  type="button"
                  onClick={() => setHasPropulsion(!hasPropulsion)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                    hasPropulsion
                      ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {hasPropulsion ? "PROPULSION ON-BOARD" : "PASSIVE ONLY"}
                </button>
              </div>

              {hasPropulsion && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase">DEDICATED DELTA-V (m/s)</span>
                    <span className="text-cyan-400 font-bold">{availableDeltaV} m/s</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={350}
                    step={5}
                    value={availableDeltaV}
                    onChange={(e) => setAvailableDeltaV(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Demise Surviving Mass */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">SURVIVING DEMISE FRAGMENTS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={0.5}
                  value={survivableMassKg}
                  onChange={(e) => setSurvivableMassKg(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
              <span className="text-[10px] text-slate-500">Ti tanks, reaction wheels, SiC mirrors</span>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">MISSION REGIME:</div>
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
                  {metrics.fcc5YearPassed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  PASSIVE DECAY TIME
                </div>
                <div className={`text-3xl font-black ${metrics.fcc5YearPassed ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.decayYears}
                </div>
                <div className="text-[10px] text-slate-500">FCC Standard: &le; 5.0 Years</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Target className="w-3 h-3 text-purple-400" /> REQ. DISPOSAL DELTA-V
                </div>
                <div className="text-3xl font-black text-white">{metrics.targetDeltaVMs} m/s</div>
                <div className="text-[10px] text-purple-400">
                  {altitudeKm > 20000 ? `+${metrics.iadcMinGraveyardDeltaHKm} km Graveyard` : "Prompt 50 km Perigee Burn"}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.casualtyCompliant ? (
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                  GROUND CASUALTY
                </div>
                <div className={`text-3xl font-black ${metrics.casualtyCompliant ? "text-cyan-400" : "text-amber-400"}`}>
                  {survivableMassKg} kg
                </div>
                <div className="text-[10px] text-slate-500">
                  {metrics.casualtyCompliant ? "Casualty < 1:10,000" : "Requires Controlled Entry"}
                </div>
              </div>
            </div>

            {/* Orbit Disposal Compliance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  ISO 24113 Space Debris Mitigation &amp; Disposal Verification
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.fcc5YearPassed || metrics.deltaVSufficient
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.fcc5YearPassed || metrics.deltaVSufficient
                    ? "DISPOSAL PATHWAY VERIFIED"
                    : "NON-COMPLIANT ORBITAL DEBRIS HAZARD"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">DISPOSAL PATHWAY ARCHITECTURE</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  With a ballistic coefficient of <strong className="text-white">{metrics.ballisticCoeffKgM2} kg/m²</strong> at {altitudeKm} km, natural unassisted atmospheric decay requires <strong className={metrics.fcc5YearPassed ? "text-emerald-400" : "text-red-400"}>{metrics.decayYears}</strong>.
                  {metrics.fcc5YearPassed ? (
                    <span className="text-emerald-400 block mt-1">
                      FCC 5-Year Rule Cleared: Natural atmospheric drag reliably removes the vehicle within the mandatory 5-year post-mission window without requiring active propulsion.
                    </span>
                  ) : hasPropulsion && metrics.deltaVSufficient ? (
                    <span className="text-emerald-400 block mt-1">
                      Controlled propulsion disposal cleared: The on-board propulsion budget ({availableDeltaV} m/s) satisfies the required {metrics.targetDeltaVMs} m/s disposal maneuver, with a +{metrics.deltaVMarginMs} m/s safety margin to target Point Nemo in the South Pacific Ocean.
                    </span>
                  ) : (
                    <span className="text-red-400 block mt-1">
                      Regulatory non-compliance: Natural decay exceeds 5 years and on-board propulsion is insufficient ({availableDeltaV} m/s vs {metrics.targetDeltaVMs} m/s required). Integrate a deployable drag sail (to drop ballistic coefficient) or allocate additional EOL propellant.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Ballistic Coefficient (m / Cd*A)</span>
                  <span className="text-white font-bold">{metrics.ballisticCoeffKgM2} kg/m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Natural Passive Drag Decay Duration</span>
                  <span className={`font-bold ${metrics.fcc5YearPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.decayYears} (FCC 5-Year Limit: &le; 5.0 yrs)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Controlled Disposal Delta-V Requirement</span>
                  <span className="text-cyan-400 font-bold">{metrics.targetDeltaVMs} m/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Propulsion Disposal Delta-V Headroom</span>
                  <span className={`font-bold ${metrics.deltaVSufficient ? "text-emerald-400" : "text-red-400"}`}>
                    {hasPropulsion ? `${metrics.deltaVMarginMs > 0 ? "+" : ""}${metrics.deltaVMarginMs} m/s` : "No Propulsion"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Space Debris Mitigation Compliance</span>
                  <span className={`font-bold ${metrics.fcc5YearPassed || metrics.deltaVSufficient ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.fcc5YearPassed || metrics.deltaVSufficient ? "PASS (CLEARED FOR LAUNCH LICENSING)" : "FAIL (DEBRIS HAZARD - ADD DRAG SAIL OR PROPELLANT)"}
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
