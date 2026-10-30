"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Rocket, 
  Fuel, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  TrendingDown,
  Activity,
  Flame
} from "lucide-react"

interface ManeuverItem {
  name: string
  deltaVMs: number
  category: "Insertion" | "Station-Keeping" | "Safety" | "Disposal"
}

interface DeltaVPreset {
  name: string
  classType: string
  missionYears: number
  dryMassKg: number
  propulsionType: "Monopropellant Hydrazine" | "Bipropellant (MMH/NTO)" | "Electric Propulsion (Hall / Ion)" | "Cold Gas Thruster"
  ispSec: number
  maneuvers: ManeuverItem[]
  description: string
}

const DELTAV_PRESETS: Record<string, DeltaVPreset> = {
  leo_broadband_electric: {
    name: "Proliferated LEO Mesh (Hall Thruster)",
    classType: "Electric SmallSat (550 km)",
    missionYears: 5,
    dryMassKg: 750,
    propulsionType: "Electric Propulsion (Hall / Ion)",
    ispSec: 1650,
    maneuvers: [
      { name: "Orbit Raising (350 km to 550 km)", deltaVMs: 110, category: "Insertion" },
      { name: "Drag Make-Up (5 Years @ 12 m/s/yr)", deltaVMs: 60, category: "Station-Keeping" },
      { name: "Collision Avoidance (CAM Burns)", deltaVMs: 15, category: "Safety" },
      { name: "Attitude Momentum Wheel Desat", deltaVMs: 8, category: "Station-Keeping" },
      { name: "Active Targeted De-orbit Burn", deltaVMs: 145, category: "Disposal" },
    ],
    description: "High-Isp Hall-effect krypton/xenon electric propulsion architecture with minimal propellant fraction.",
  },
  geo_biprop_flagship: {
    name: "GEO 15-Year Direct Injection (Biprop)",
    classType: "Heavy Commercial Telecom",
    missionYears: 15,
    dryMassKg: 2400,
    propulsionType: "Bipropellant (MMH/NTO)",
    ispSec: 318,
    maneuvers: [
      { name: "Apogee Engine Insertion (GTO to GEO)", deltaVMs: 1480, category: "Insertion" },
      { name: "North-South Station-Keeping (15 Yrs @ 48 m/s)", deltaVMs: 720, category: "Station-Keeping" },
      { name: "East-West Longitudinal Drift Correction", deltaVMs: 45, category: "Station-Keeping" },
      { name: "Relocation & Slot Maneuvers", deltaVMs: 30, category: "Station-Keeping" },
      { name: "Super-Sync Graveyard Orbit Raise (+300 km)", deltaVMs: 11, category: "Disposal" },
    ],
    description: "Classical high-thrust chemical bipropellant platform with massive apogee kick velocity requirement.",
  },
  cubesat_coldgas: {
    name: "CubeSat RPO Inspection (Cold Gas)",
    classType: "12U Responsive SmallSat",
    missionYears: 1.5,
    dryMassKg: 14,
    propulsionType: "Cold Gas Thruster",
    ispSec: 68,
    maneuvers: [
      { name: "Launcher Dispersion Clean-up", deltaVMs: 6, category: "Insertion" },
      { name: "Rendezvous Proximity Operations (RPO)", deltaVMs: 25, category: "Safety" },
      { name: "Fly-Around Inspection Burns", deltaVMs: 18, category: "Station-Keeping" },
      { name: "De-orbit Perigee Lowering", deltaVMs: 22, category: "Disposal" },
    ],
    description: "Non-toxic pressurized gas propulsion for rideshare safety and proximity inspection agility.",
  },
}

export default function DeltaVBudgetPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("leo_broadband_electric")
  const [dryMassKg, setDryMassKg] = useState<number>(750)
  const [ispSec, setIspSec] = useState<number>(1650)
  const [marginPct, setMarginPct] = useState<number>(10) // AIAA 10% reserve margin
  const [residualsPct, setResidualsPct] = useState<number>(2.5) // Unusable propellant trapped in lines/tanks
  const [maneuvers, setManeuvers] = useState<ManeuverItem[]>(DELTAV_PRESETS.leo_broadband_electric.maneuvers)

  const preset = DELTAV_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = DELTAV_PRESETS[key]
    setSelectedPresetKey(key)
    setDryMassKg(p.dryMassKg)
    setIspSec(p.ispSec)
    setManeuvers(p.maneuvers)
  }

  // Tsiolkovsky Rocket Sizing & Propellant Ledger Calculations
  const metrics = useMemo(() => {
    const g0 = 9.80665

    // 1. Total Nominal Delta-V
    const nominalDeltaVMs = maneuvers.reduce((acc, m) => acc + m.deltaVMs, 0)

    // 2. Factored Delta-V (with Programmatic Contingency Margin)
    const factoredDeltaVMs = Math.round(nominalDeltaVMs * (1 + marginPct / 100))

    // 3. Tsiolkovsky Inversion:
    // DeltaV = Isp * g0 * ln(m_initial / m_final)
    // m_initial = m_final * exp(DeltaV / (Isp * g0))
    const massRatio = Math.exp(factoredDeltaVMs / (ispSec * g0))
    const usablePropellantKg = Math.round((dryMassKg * (massRatio - 1)) * 10) / 10

    // 4. Tank Residuals & Trapped Propellant
    const residualPropellantKg = Math.round((usablePropellantKg * (residualsPct / 100)) * 10) / 10
    const totalPropellantLoadKg = Math.round((usablePropellantKg + residualPropellantKg) * 10) / 10

    // 5. Total Spacecraft Wet Launch Mass
    const totalWetMassKg = Math.round((dryMassKg + totalPropellantLoadKg) * 10) / 10
    const propellantMassFractionPct = Math.round((totalPropellantLoadKg / totalWetMassKg) * 1000) / 10

    // 6. Category Sub-totals for Analysis
    const insertionDeltaVMs = maneuvers.filter(m => m.category === "Insertion").reduce((a, b) => a + b.deltaVMs, 0)
    const skDeltaVMs = maneuvers.filter(m => m.category === "Station-Keeping").reduce((a, b) => a + b.deltaVMs, 0)
    const safetyDeltaVMs = maneuvers.filter(m => m.category === "Safety").reduce((a, b) => a + b.deltaVMs, 0)
    const disposalDeltaVMs = maneuvers.filter(m => m.category === "Disposal").reduce((a, b) => a + b.deltaVMs, 0)

    return {
      nominalDeltaVMs,
      factoredDeltaVMs,
      massRatio: massRatio.toFixed(3),
      usablePropellantKg,
      residualPropellantKg,
      totalPropellantLoadKg,
      totalWetMassKg,
      propellantMassFractionPct,
      insertionDeltaVMs,
      skDeltaVMs,
      safetyDeltaVMs,
      disposalDeltaVMs,
    }
  }, [maneuvers, dryMassKg, ispSec, marginPct, residualsPct])

  const updateManeuverDeltaV = (index: number, newDeltaV: number) => {
    setManeuvers((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], deltaVMs: newDeltaV }
      return updated
    })
  }

  const exportDeltaVCSV = () => {
    const csv = `SPACECRAFT DELTA-V BUDGET & PROPULSION SIZING DOSSIER
Preset Architecture,${preset.name}
Class,${preset.classType}
Propulsion Technology,${preset.propulsionType}
Specific Impulse (Isp),${ispSec} seconds
Dry Mass,${dryMassKg} kg
Contingency Margin,${marginPct}%
Propellant Residuals Allowance,${residualsPct}%
Nominal Delta-V Requirement,${metrics.nominalDeltaVMs} m/s
Factored Design Delta-V,${metrics.factoredDeltaVMs} m/s
Tsiolkovsky Mass Ratio,${metrics.massRatio}
Usable Propellant,${metrics.usablePropellantKg} kg
Trapped Residuals,${metrics.residualPropellantKg} kg
Total Loaded Propellant,${metrics.totalPropellantLoadKg} kg
Total Spacecraft Wet Mass,${metrics.totalWetMassKg} kg
Propellant Mass Fraction,${metrics.propellantMassFractionPct}%`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-deltav-budget-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Rocket className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Tsiolkovsky Rocket Sizing &amp; Mission Delta-V Ledger Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              PROPULSION DELTA-V BUDGET
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model mission-lifecycle velocity increments, orbit raising, station-keeping drift compensation, collision avoidance reserves, and propellant load sizing via the ideal rocket equation.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportDeltaVCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT DELTA-V SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(DELTAV_PRESETS).map(([k, v]) => (
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
              Propulsion Parameters
            </div>

            {/* Dry Mass */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SPACECRAFT DRY MASS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dryMassKg}
                  onChange={(e) => setDryMassKg(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Specific Impulse */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">SPECIFIC IMPULSE (I_sp)</label>
                <span className="text-cyan-400 font-bold">{ispSec} SEC</span>
              </div>
              <input
                type="range"
                min={50}
                max={3000}
                step={25}
                value={ispSec}
                onChange={(e) => setIspSec(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>70s (Cold Gas)</span>
                <span>320s (Biprop)</span>
                <span>2000s (Electric)</span>
              </div>
            </div>

            {/* Margins & Reserves */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">MARGIN RESERVE</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">RESIDUALS TRAPPED</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={residualsPct}
                    onChange={(e) => setResidualsPct(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* Itemized Maneuver Ledger */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Mission Velocity Increments (m/s)
              </span>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {maneuvers.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-[11px] truncate">{m.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                        {m.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={m.deltaVMs}
                        onChange={(e) => updateManeuverDeltaV(idx, Math.max(0, Number(e.target.value)))}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-500">m/s</span>
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
                  <Activity className="w-3 h-3 text-cyan-400" /> TOTAL FACTORED DELTA-V
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.factoredDeltaVMs} m/s</div>
                <div className="text-[10px] text-slate-500">Nominal: {metrics.nominalDeltaVMs} m/s (+{marginPct}%)</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-purple-400" /> TOTAL PROPELLANT LOAD
                </div>
                <div className="text-3xl font-black text-white">{metrics.totalPropellantLoadKg} kg</div>
                <div className="text-[10px] text-purple-400">{metrics.propellantMassFractionPct}% Mass Fraction</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-emerald-400" /> TOTAL WET LAUNCH MASS
                </div>
                <div className="text-3xl font-black text-emerald-400">{metrics.totalWetMassKg} kg</div>
                <div className="text-[10px] text-slate-500">Mass Ratio: {metrics.massRatio}x</div>
              </div>
            </div>

            {/* Delta-V Allocation & Tsiolkovsky Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Mission Lifecycle Velocity Allocation
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-950 text-cyan-300 uppercase">
                  TSIOLKOVSKY ROCKET EQUATION
                </span>
              </div>

              {/* Maneuver Category Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">INSERTION &amp; APOGEE</span>
                  <span className="text-sm font-black text-white">{metrics.insertionDeltaVMs} m/s</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">STATION-KEEPING</span>
                  <span className="text-sm font-black text-cyan-400">{metrics.skDeltaVMs} m/s</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">SAFETY &amp; CAM BURNS</span>
                  <span className="text-sm font-black text-purple-400">{metrics.safetyDeltaVMs} m/s</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">DISPOSAL &amp; DE-ORBIT</span>
                  <span className="text-sm font-black text-emerald-400">{metrics.disposalDeltaVMs} m/s</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">PROPULSION SYSTEM EFFICIENCY NOTE</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  With a thruster specific impulse of <strong className="text-white">{ispSec} seconds</strong>, producing {metrics.factoredDeltaVMs} m/s of total velocity change requires a wet-to-dry mass ratio of <strong className="text-cyan-400">{metrics.massRatio}</strong>. This sizes the usable propellant tank to <strong className="text-white">{metrics.usablePropellantKg} kg</strong> plus <strong className="text-purple-400">{metrics.residualPropellantKg} kg</strong> of unexpendable propellant trapped in lines and tank sumps.
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Nominal Mission Delta-V</span>
                  <span className="text-white font-bold">{metrics.nominalDeltaVMs} m/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Design Margin Reserve (+{marginPct}%)</span>
                  <span className="text-cyan-400 font-bold">+{metrics.factoredDeltaVMs - metrics.nominalDeltaVMs} m/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Usable Propellant Sizing</span>
                  <span className="text-purple-400 font-bold">{metrics.usablePropellantKg} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Trapped Residuals (+{residualsPct}%)</span>
                  <span className="text-slate-300 font-bold">{metrics.residualPropellantKg} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Loaded Wet Mass</span>
                  <span className="text-emerald-400 font-bold">{metrics.totalWetMassKg} kg</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
