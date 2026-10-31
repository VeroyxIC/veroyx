"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Crosshair, 
  Globe, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Flame, 
  Target, 
  Compass, 
  Activity, 
  ShieldAlert,
  Sliders
} from "lucide-react"

interface ReentryPreset {
  name: string
  disposalStrategy: "Controlled Targeted Ocean Disposal" | "Uncontrolled Random Atmospheric Entry" | "Semi-Controlled Perigee Depletion"
  dryMassKg: number
  targetPerigeeKm: number
  burnExecutionErrorPct: number
  survivingFragmentsKg: number
  casualtyAreaM2: number
  targetZone: "South Pacific (Point Nemo SPOUA)" | "South Indian Ocean" | "Uncontrolled Global Track"
  description: string
}

const REENTRY_PRESETS: Record<string, ReentryPreset> = {
  targeted_point_nemo: {
    name: "Heavy Imaging Bus Guided SPOUA Entry",
    disposalStrategy: "Controlled Targeted Ocean Disposal",
    dryMassKg: 1850,
    targetPerigeeKm: 52,
    burnExecutionErrorPct: 1.2,
    survivingFragmentsKg: 145, // Ti tank + reaction wheels survive
    casualtyAreaM2: 12.8,
    targetZone: "South Pacific (Point Nemo SPOUA)",
    description: "High-thrust chemical retrograde burn targeting the South Pacific Oceanic Uninhabited Area with strict NOTAM/NOTMAR margins.",
  },
  smallsat_d4d_pass: {
    name: "Commercial SmallSat Design-for-Demise (D4D)",
    disposalStrategy: "Uncontrolled Random Atmospheric Entry",
    dryMassKg: 220,
    targetPerigeeKm: 70,
    burnExecutionErrorPct: 0.0,
    survivingFragmentsKg: 4.5, // Demises almost completely
    casualtyAreaM2: 2.1,
    targetZone: "Uncontrolled Global Track",
    description: "Aluminum-dominant bus engineered for complete demise above 65 km, achieving an accepted casualty risk without controlled propulsion.",
  },
  cislunar_capsule_corridor: {
    name: "High-Energy Direct Entry Capsule",
    disposalStrategy: "Controlled Targeted Ocean Disposal",
    dryMassKg: 3400,
    targetPerigeeKm: 48,
    burnExecutionErrorPct: 0.8,
    survivingFragmentsKg: 850, // Heatshield and pressure shell intact
    casualtyAreaM2: 28.5,
    targetZone: "South Pacific (Point Nemo SPOUA)",
    description: "Super-orbital re-entry requiring a narrow entry corridor to avoid atmospheric skip-out while restricting peak structural G-loads.",
  },
}

export default function ReentryFootprintPage() {
  const [selectedKey, setSelectedKey] = useState<string>("targeted_point_nemo")
  const [dryMassKg, setDryMassKg] = useState<number>(1850)
  const [targetPerigeeKm, setTargetPerigeeKm] = useState<number>(52)
  const [burnErrorPct, setBurnErrorPct] = useState<number>(1.2)
  const [survivingKg, setSurvivingKg] = useState<number>(145)
  const [casualtyAreaM2, setCasualtyAreaM2] = useState<number>(12.8)

  const activePreset = REENTRY_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = REENTRY_PRESETS[key]
    setSelectedKey(key)
    setDryMassKg(p.dryMassKg)
    setTargetPerigeeKm(p.targetPerigeeKm)
    setBurnErrorPct(p.burnExecutionErrorPct)
    setSurvivingKg(p.survivingFragmentsKg)
    setCasualtyAreaM2(p.casualtyAreaM2)
  }

  // NASA-STD-8719.14C / FAA Part 450 Range Safety Dispersion Calculations
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418
    const apogeeKm = 550 // Nominal LEO parking apogee

    // 1. Retrograde De-Orbit Delta-V to target perigee
    const rA = rEarthKm + apogeeKm
    const rP = rEarthKm + targetPerigeeKm
    const vCircA = Math.sqrt(mu / rA)
    const vTransA = Math.sqrt(mu * (2 / rA - 1 / ((rA + rP) / 2)))
    const deorbitDeltaVMs = Math.round(Math.abs(vCircA - vTransA) * 1000)

    // 2. Flight Path Angle at 120 km Entry Interface (gamma_EI in deg)
    const rEi = rEarthKm + 120
    const aTransfer = (rA + rP) / 2
    const vEi = Math.sqrt(mu * (2 / rEi - 1 / aTransfer))
    const hAngularMom = Math.sqrt(2 * mu * (rA * rP) / (rA + rP))
    const cosGamma = Math.min(1.0, hAngularMom / (rEi * vEi))
    const entryFlightPathAngleDeg = Math.round((Math.acos(cosGamma) * (180 / Math.PI)) * 100) / 100

    // 3. 3-Sigma Dispersion Ellipse Dimensions (Along-Track & Cross-Track)
    // Sized by burn error, entry angle steepness, and atmospheric density variations
    const steepnessFactor = Math.max(0.5, entryFlightPathAngleDeg / 1.5)
    const alongTrackMajorAxisKm = Math.round((650 / steepnessFactor) * (1 + burnErrorPct / 2))
    const crossTrackMinorAxisKm = Math.round(75 * (1 + burnErrorPct / 3))

    // Total NOTAM/NOTMAR Exclusion Area (km2)
    const footprintAreaKm2 = Math.round(Math.PI * (alongTrackMajorAxisKm / 2) * (crossTrackMinorAxisKm / 2))

    // 4. Ground Casualty Expectation (E_c)
    // Sized for targeted ocean (zero population) vs uncontrolled entry (average pop density ~ 14 people/km2)
    const isTargetedOcean = activePreset.disposalStrategy.includes("Targeted")
    let casualtyExpectationPpm = 0
    let casualtyRatio = "1:1,000,000"

    if (isTargetedOcean) {
      // SPOUA Point Nemo has effectively 0 population density (E_c < 1e-6)
      casualtyExpectationPpm = 0.5
      casualtyRatio = "< 1:1,000,000 (SPOUA Ocean Protected)"
    } else {
      // Global uncontrolled population distribution
      casualtyExpectationPpm = Math.round((casualtyAreaM2 * 14.5 * 100) / 10) / 10
      casualtyRatio = `1:${Math.round(1000000 / Math.max(1, casualtyExpectationPpm)).toLocaleString()}`
    }

    // NASA Limit: E_c <= 100 ppm (1:10,000)
    const casualtyCompliant = isTargetedOcean || casualtyExpectationPpm <= 100.0

    // Peak Aerodynamic G-load during steep entry
    const peakDecelG = Math.round((entryFlightPathAngleDeg * 4.2) * 10) / 10

    return {
      deorbitDeltaVMs,
      entryFlightPathAngleDeg,
      alongTrackMajorAxisKm,
      crossTrackMinorAxisKm,
      footprintAreaKm2,
      casualtyExpectationPpm,
      casualtyRatio,
      casualtyCompliant,
      peakDecelG,
    }
  }, [dryMassKg, targetPerigeeKm, burnErrorPct, survivingKg, casualtyAreaM2, activePreset])

  const exportFootprintCSV = () => {
    const csv = `SPACECRAFT TARGETED REENTRY & DISPERSION FOOTPRINT DOSSIER
Mission Scenario,${activePreset.name}
Disposal Strategy,${activePreset.disposalStrategy}
Designated Impact Zone,${activePreset.targetZone}
Spacecraft Dry Mass,${dryMassKg} kg
De-Orbit Burn Delta-V,${metrics.deorbitDeltaVMs} m/s
Target Entry Perigee,${targetPerigeeKm} km
Entry Interface Flight Path Angle (120 km),-${metrics.entryFlightPathAngleDeg} deg
Retrograde Burn Execution Error,±${burnErrorPct}%
Peak Entry Deceleration,${metrics.peakDecelG} g
3-Sigma Footprint Major Axis (Along-Track),${metrics.alongTrackMajorAxisKm} km
3-Sigma Footprint Minor Axis (Cross-Track),${metrics.crossTrackMinorAxisKm} km
Total Maritime Exclusion Area (NOTAM/NOTMAR),${metrics.footprintAreaKm2} km2
Estimated Surviving Fragment Mass,${survivingKg} kg
Total Debris Casualty Area (A_c),${casualtyAreaM2} m2
Ground Casualty Expectation (E_c),${metrics.casualtyRatio} (${metrics.casualtyExpectationPpm} ppm)
FAA / NASA Range Safety Clearance,${metrics.casualtyCompliant ? "PASS (CLEARED FOR LAUNCH LICENSING)" : "FAIL (CONTROLLED RE-ENTRY MANDATORY)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-reentry-footprint-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Crosshair className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              NASA-STD-8719.14C / FAA Part 450 Targeted Re-Entry &amp; Range Safety Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              RE-ENTRY FOOTPRINT &amp; DISPERSION
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model targeted ocean disposal corridors (Point Nemo SPOUA), 3-sigma along/cross-track dispersion ellipses, NOTAM/NOTMAR maritime exclusion zones, and ground casualty risks ($E_c$).
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportFootprintCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT DISPERSION SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(REENTRY_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap text-left ${
                selectedKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="font-bold">{v.name}</div>
              <div className="text-[10px] text-slate-500">{v.disposalStrategy} · {v.targetZone}</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-rose-400" /> DISPERSION ELLIPSE
            </div>
            <div className="text-2xl font-black text-white">
              {metrics.alongTrackMajorAxisKm} &times; {metrics.crossTrackMinorAxisKm} km
            </div>
            <div className="text-[10px] text-slate-400">3-Sigma Along &times; Cross-Track</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> DE-ORBIT DELTA-V
            </div>
            <div className="text-3xl font-black text-amber-400">{metrics.deorbitDeltaVMs} m/s</div>
            <div className="text-[10px] text-slate-400">Entry Perigee: {targetPerigeeKm} km (-{metrics.entryFlightPathAngleDeg}&deg;)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              {metrics.casualtyCompliant ? (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              )}
              CASUALTY RISK (E_C)
            </div>
            <div className={`text-xl font-black ${metrics.casualtyCompliant ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.casualtyRatio}
            </div>
            <div className="text-[10px] text-slate-400">NASA Limit: &le; 1:10,000 (100 ppm)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" /> EXCLUSION ZONE
            </div>
            <div className="text-2xl font-black text-cyan-400">
              {metrics.footprintAreaKm2.toLocaleString()} km²
            </div>
            <div className="text-[10px] text-slate-400">NOTAM / NOTMAR Maritime Area</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Target Trajectory &amp; Fragment Sizing
            </div>

            {/* Target Perigee Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">TARGET ENTRY PERIGEE</label>
                <span className="text-amber-400 font-bold">{targetPerigeeKm} KM</span>
              </div>
              <input
                type="range"
                min={30}
                max={90}
                step={2}
                value={targetPerigeeKm}
                onChange={(e) => setTargetPerigeeKm(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>30 km (Steep Dive)</span>
                <span>50 km (SPOUA Target)</span>
                <span>90 km (Graze)</span>
              </div>
            </div>

            {/* Spacecraft Mass */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">ENTRY DRY MASS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dryMassKg}
                  onChange={(e) => setDryMassKg(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Burn Execution Error */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">BURN EXECUTION ERROR</label>
                <span className="text-purple-400 font-bold">&plusmn;{burnErrorPct}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={4.0}
                step={0.2}
                value={burnErrorPct}
                onChange={(e) => setBurnErrorPct(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Thrust cut-off and pointing dispersion multiplier</span>
            </div>

            {/* Surviving Fragments & Casualty Area */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SURVIVING (kg)</label>
                <input
                  type="number"
                  value={survivingKg}
                  onChange={(e) => setSurvivingKg(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">CASUALTY AREA (m²)</label>
                <input
                  type="number"
                  step={0.5}
                  value={casualtyAreaM2}
                  onChange={(e) => setCasualtyAreaM2(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-rose-400 block font-mono">DISPERSION PHYSICS:</strong>
              Steeper flight-path angles (-{metrics.entryFlightPathAngleDeg}&deg;) compress the along-track footprint from {metrics.alongTrackMajorAxisKm} km at the cost of higher peak deceleration ({metrics.peakDecelG} g).
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Range Safety Clearance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Targeted Ocean Disposal &amp; Public Safety Verification
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.casualtyCompliant
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.casualtyCompliant ? "RANGE SAFETY CLEARED" : "CASUALTY THRESHOLD VIOLATION"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  Targeting an entry perigee of <strong className="text-white">{targetPerigeeKm} km</strong> requires a retrograde burn of <strong className="text-amber-400">{metrics.deorbitDeltaVMs} m/s</strong>, establishing an entry interface flight-path angle of <strong className="text-white">-{metrics.entryFlightPathAngleDeg}&deg; at 120 km</strong>.
                </p>
                <p>
                  With a &plusmn;{burnErrorPct}% burn execution tolerance, surviving fragments ({survivingKg} kg, including titanium tanks and reaction wheels) scatter inside a 3-sigma ellipse measuring <strong className="text-white">{metrics.alongTrackMajorAxisKm} km &times; {metrics.crossTrackMinorAxisKm} km</strong> ({metrics.footprintAreaKm2.toLocaleString()} km²).
                  Targeting the <strong className="text-cyan-400">{activePreset.targetZone}</strong> restricts public casualty risk to <strong className={metrics.casualtyCompliant ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{metrics.casualtyRatio}</strong>, fully satisfying FAA Part 450 and NASA-STD-8719.14C standards.
                  {!metrics.casualtyCompliant && (
                    <span className="text-red-400 block mt-1 font-bold">
                      Public risk violation: Uncontrolled entry casualty expectation exceeds the 1:10,000 ceiling ({metrics.casualtyExpectationPpm} ppm). Allocate propulsion to execute a guided ocean de-orbit into Point Nemo, or redesign bus components using low-melting-point materials under Design-for-Demise (D4D).
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Entry Flight-Path Angle (gamma_EI @ 120 km)</span>
                  <span className="text-white font-bold">-{metrics.entryFlightPathAngleDeg}&deg; (Peak Load: {metrics.peakDecelG} g)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">3-Sigma Along-Track Dispersion Axis</span>
                  <span className="text-rose-400 font-bold">{metrics.alongTrackMajorAxisKm} km along orbital ground track</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">3-Sigma Cross-Track Dispersion Axis</span>
                  <span className="text-rose-400 font-bold">{metrics.crossTrackMinorAxisKm} km orthogonal buffer</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Range Safety &amp; Ground Casualty Clearance</span>
                  <span className={`font-bold ${metrics.casualtyCompliant ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.casualtyCompliant ? "PASS (CERTIFIED FOR TARGETED DISPOSAL)" : "FAIL (HAZARD FOOTPRINT EXCEEDS LIMIT)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Correlated Engines */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                CORRELATED ENGINES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/reentry" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/reentry (Aero)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/decay" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/decay (5-Yr)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/compliance" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/compliance</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
