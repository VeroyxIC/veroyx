"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Rocket, 
  Layers, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  Maximize2, 
  Zap, 
  Globe, 
  Sliders,
  DollarSign
} from "lucide-react"

interface LaunchVehicle {
  name: string
  provider: string
  reusability: "Reusable (ASDS/RTLS)" | "Expendable" | "Dedicated SmallSat"
  fairingDiameterM: number
  fairingHeightM: number
  leoCapacityKg: number // 500 km LEO / SSO
  gtoCapacityKg: number
  tliCapacityKg: number // Trans-Lunar Injection
  adapterType: string
  maxSepShockG: number
  dedicatedCostM: number
  description: string
}

const LAUNCH_VEHICLES: Record<string, LaunchVehicle> = {
  falcon_9_reusable: {
    name: "Falcon 9 (Reusable Booster)",
    provider: "SpaceX",
    reusability: "Reusable (ASDS/RTLS)",
    fairingDiameterM: 4.6, // Usable dynamic envelope
    fairingHeightM: 11.4,
    leoCapacityKg: 17400,
    gtoCapacityKg: 5500,
    tliCapacityKg: 3800,
    adapterType: "ESPA Grande / 1194VS Clampband",
    maxSepShockG: 1800,
    dedicatedCostM: 69.75,
    description: "Industry-standard workhorse with flight-proven ASDS drone ship recovery and large 5.2m outer fairing.",
  },
  electron_dedicated: {
    name: "Electron SmallSat Dedicated",
    provider: "Rocket Lab",
    reusability: "Dedicated SmallSat",
    fairingDiameterM: 1.07,
    fairingHeightM: 2.2,
    leoCapacityKg: 300,
    gtoCapacityKg: 0,
    tliCapacityKg: 0,
    adapterType: "Motorized Lightband (MLB 15-inch)",
    maxSepShockG: 950,
    dedicatedCostM: 7.5,
    description: "High-cadence dedicated launch vehicle providing custom inclinations and precise orbital injection for CubeSats and SmallSats.",
  },
  ariane_64: {
    name: "Ariane 6 (A64 Configuration)",
    provider: "Arianespace / ESA",
    reusability: "Expendable",
    fairingDiameterM: 4.5,
    fairingHeightM: 14.0,
    leoCapacityKg: 21650,
    gtoCapacityKg: 11500,
    tliCapacityKg: 8500,
    adapterType: "RUAG 1666M / Dual Launch SYLDA",
    maxSepShockG: 2200,
    dedicatedCostM: 115.0,
    description: "Heavy European launcher featuring four solid boosters and restartable Vinci upper stage for complex multi-orbit releases.",
  },
  vulcan_centaur: {
    name: "Vulcan Centaur (VC4S)",
    provider: "United Launch Alliance (ULA)",
    reusability: "Expendable",
    fairingDiameterM: 4.6,
    fairingHeightM: 12.5,
    leoCapacityKg: 20000,
    gtoCapacityKg: 9200,
    tliCapacityKg: 7200,
    adapterType: "C-Adapter / 1194VS Clampband",
    maxSepShockG: 2000,
    dedicatedCostM: 110.0,
    description: "National security launch vehicle powered by dual BE-4 methane engines and high-energy Centaur V cryogenic upper stage.",
  },
}

export default function LaunchVehiclePage() {
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string>("falcon_9_reusable")
  const [spacecraftWetMassKg, setSpacecraftWetMassKg] = useState<number>(450)
  const [spacecraftWidthM, setSpacecraftWidthM] = useState<number>(1.8)
  const [spacecraftHeightM, setSpacecraftHeightM] = useState<number>(2.4)
  const [targetOrbit, setTargetOrbit] = useState<"LEO / SSO (500 km)" | "GTO (Geostationary Transfer)" | "TLI (Trans-Lunar Injection)">("LEO / SSO (500 km)")
  const [isRideshare, setIsRideshare] = useState<boolean>(true)

  const lv = LAUNCH_VEHICLES[selectedVehicleKey]

  // Flight Performance & Fairing Clearance Calculations
  const metrics = useMemo(() => {
    // 1. Lift Capacity into Target Orbit
    let orbitCapacityKg = lv.leoCapacityKg
    if (targetOrbit.includes("GTO")) orbitCapacityKg = lv.gtoCapacityKg
    else if (targetOrbit.includes("TLI")) orbitCapacityKg = lv.tliCapacityKg

    // Rideshare ESPA limit cap (standard ESPA: 450 kg, ESPA Grande: 900 kg)
    const effectiveLimitKg = isRideshare ? 450 : orbitCapacityKg

    // Mass Margin: (Limit - WetMass) / Limit * 100
    const massMarginKg = effectiveLimitKg - spacecraftWetMassKg
    const massMarginPct = Math.round((massMarginKg / effectiveLimitKg) * 100)
    const massCleared = massMarginKg >= 0

    // 2. Fairing Dynamic Stay-out Clearance (Radial & Axial)
    const radialClearanceM = Math.round(((lv.fairingDiameterM - spacecraftWidthM) / 2) * 100) / 100
    const axialClearanceM = Math.round((lv.fairingHeightM - spacecraftHeightM) * 100) / 100
    const fairingVolumeCleared = radialClearanceM >= 0.10 && axialClearanceM >= 0.25 // >= 10cm radial margin

    // 3. Dispersion Cleanup Delta-V Budget
    // Standard insertion dispersion requires ~15-25 m/s orbital cleanup
    const insertionCleanupDeltaVMs = isRideshare ? 28 : 14

    // 4. Financial Cost Allocation
    // Rideshare pricing standard: ~$5,500/kg (SpaceX Transporter)
    const estimatedLaunchCostM = isRideshare
      ? Math.round((spacecraftWetMassKg * 0.0055) * 100) / 100
      : lv.dedicatedCostM

    const overallFit = massCleared && fairingVolumeCleared

    return {
      orbitCapacityKg,
      effectiveLimitKg,
      massMarginKg,
      massMarginPct,
      massCleared,
      radialClearanceM,
      axialClearanceM,
      fairingVolumeCleared,
      insertionCleanupDeltaVMs,
      estimatedLaunchCostM,
      overallFit,
    }
  }, [spacecraftWetMassKg, spacecraftWidthM, spacecraftHeightM, targetOrbit, isRideshare, lv])

  const exportLaunchCSV = () => {
    const csv = `SPACECRAFT LAUNCH VEHICLE PERFORMANCE & FAIRING FITMENT SPEC
Launch Vehicle,${lv.name}
Launch Provider,${lv.provider}
Launcher Class,${lv.reusability}
Launch Booking Mode,${isRideshare ? "Commercial Rideshare (ESPA Slot)" : "Dedicated Launch"}
Target Injection Orbit,${targetOrbit}
Launcher Orbit Max Lift Capacity,${metrics.orbitCapacityKg} kg
Spacecraft Allocation Limit,${metrics.effectiveLimitKg} kg
Spacecraft Wet Mass,${spacecraftWetMassKg} kg (Margin: +${metrics.massMarginKg} kg / ${metrics.massMarginPct}%)
Launch Mass Clearance,${metrics.massCleared ? "PASS (WITHIN LIFT CAPACITY)" : "FAIL (OVERWEIGHT)"}
Fairing Usable Dynamic Diameter,${lv.fairingDiameterM} m (Spacecraft Width: ${spacecraftWidthM} m)
Radial Clearance Margin,${metrics.radialClearanceM} meters (Min Req: 0.10 m)
Fairing Usable Height,${lv.fairingHeightM} m (Spacecraft Height: ${spacecraftHeightM} m)
Axial Clearance Margin,${metrics.axialClearanceM} meters (Min Req: 0.25 m)
Payload Envelope Verdict,${metrics.fairingVolumeCleared ? "CLEARED (FITMENT VERIFIED)" : "FAIRING STAY-OUT VIOLATION"}
Mechanical Separation Adapter,${lv.adapterType}
Max Peak Separation Shock,${lv.maxSepShockG} g SRS
Estimated Launch Cost Allocation,$${metrics.estimatedLaunchCostM} Million USD
Orbit Injection Dispersion Cleanup Delta-V,${metrics.insertionCleanupDeltaVMs} m/s`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-launch-vehicle-${selectedVehicleKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Rocket className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Launch Vehicle Performance, Fairing Clearance &amp; Adapter Fitment
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              LAUNCH VEHICLE SELECTION
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Verify booster payload lift curves, payload fairing stay-out volume clearances, standard ESPA/clampband mechanical interfaces, separation shock levels, and rideshare pricing budgets.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportLaunchCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT LAUNCH SPEC
            </button>
          </div>
        </div>

        {/* Launcher Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {Object.entries(LAUNCH_VEHICLES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setSelectedVehicleKey(k)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedVehicleKey === k
                  ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-300 font-bold shadow-lg shadow-cyan-950/30"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase">{v.provider}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">{v.reusability}</span>
              </div>
              <div className="text-white font-bold text-sm mt-1">{v.name}</div>
              <div className="text-[10px] text-slate-400 font-normal mt-1">LEO: {v.leoCapacityKg} kg | Fairing: {v.fairingDiameterM}m</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Rocket className="w-3 h-3 text-cyan-400" /> MASS CAPACITY MARGIN
            </div>
            <div className={`text-3xl font-black ${metrics.massCleared ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.massMarginPct}%
            </div>
            <div className="text-[10px] text-slate-400">
              {metrics.massCleared ? `+${metrics.massMarginKg} kg reserve` : `${metrics.massMarginKg} kg overweight`}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-purple-400" /> RADIAL FAIRING GAP
            </div>
            <div className={`text-3xl font-black ${metrics.radialClearanceM >= 0.1 ? "text-purple-400" : "text-red-400"}`}>
              {metrics.radialClearanceM} m
            </div>
            <div className="text-[10px] text-slate-400">Min Req: 0.10 m (Axial: {metrics.axialClearanceM} m)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> SEPARATION SHOCK
            </div>
            <div className="text-3xl font-black text-amber-400">{lv.maxSepShockG} g</div>
            <div className="text-[10px] text-slate-400">{lv.adapterType}</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> ESTIMATED COST
            </div>
            <div className="text-3xl font-black text-emerald-400">${metrics.estimatedLaunchCostM}M</div>
            <div className="text-[10px] text-slate-400">{isRideshare ? "Rideshare ESPA Rate" : "Dedicated Launch"}</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Spacecraft Envelope &amp; Mission
            </div>

            {/* Rideshare Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300 font-bold uppercase text-[11px]">BOOKING MODE</span>
              <button
                type="button"
                onClick={() => setIsRideshare(!isRideshare)}
                className={`px-3 py-1 rounded text-[10px] font-bold border transition-all ${
                  isRideshare
                    ? "bg-cyan-950 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {isRideshare ? "COMMERCIAL RIDESHARE" : "DEDICATED LAUNCHER"}
              </button>
            </div>

            {/* Target Orbit Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">TARGET INJECTION ORBIT</label>
              <select
                value={targetOrbit}
                onChange={(e) => setTargetOrbit(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="LEO / SSO (500 km)">LEO / SSO (500 km Sun-Synchronous)</option>
                <option value="GTO (Geostationary Transfer)">GTO (Geostationary Transfer Orbit)</option>
                <option value="TLI (Trans-Lunar Injection)">TLI (Trans-Lunar Injection)</option>
              </select>
            </div>

            {/* Spacecraft Wet Mass */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">SPACECRAFT WET MASS</label>
                <span className="text-cyan-400 font-bold">{spacecraftWetMassKg} KG</span>
              </div>
              <input
                type="range"
                min={20}
                max={1200}
                step={10}
                value={spacecraftWetMassKg}
                onChange={(e) => setSpacecraftWetMassKg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>100 kg (SmallSat)</span>
                <span>450 kg (ESPA Slot)</span>
                <span>1200 kg</span>
              </div>
            </div>

            {/* Spacecraft Stowed Dimensions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">WIDTH (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={spacecraftWidthM}
                  onChange={(e) => setSpacecraftWidthM(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">HEIGHT (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={spacecraftHeightM}
                  onChange={(e) => setSpacecraftHeightM(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">DYNAMIC CLEARANCE:</strong>
              Maintains minimum 100 mm acoustic and vibrational breathing clearance between spacecraft solar panel tips and booster payload fairing acoustic blankets.
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Launch Envelope Fitment Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  Booster Lift &amp; Fairing Envelope Assessment
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.overallFit
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.overallFit ? "FITMENT CERTIFIED" : "LAUNCH INTEGRATION DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  Deploying <strong className="text-white">{spacecraftWetMassKg} kg</strong> into <strong className="text-cyan-400">{targetOrbit}</strong> via <strong className="text-white">{lv.name}</strong> ({isRideshare ? "Commercial Rideshare" : "Dedicated Manifest"}). 
                  The booster provides <strong className="text-white">{metrics.orbitCapacityKg} kg</strong> of gross vehicle performance, leaving a <strong className={metrics.massCleared ? "text-emerald-400" : "text-red-400"}>+{metrics.massMarginKg} kg ({metrics.massMarginPct}%)</strong> mass growth reserve against the allocated {metrics.effectiveLimitKg} kg limit.
                </p>
                <p>
                  Stowed dimensions of <strong className="text-white">{spacecraftWidthM}m &times; {spacecraftHeightM}m</strong> inside the {lv.fairingDiameterM}m &times; {lv.fairingHeightM}m usable fairing maintain <strong className="text-purple-400">{metrics.radialClearanceM} m</strong> of radial buffer and <strong className="text-purple-400">{metrics.axialClearanceM} m</strong> of axial clearance.
                  Separation via the {lv.adapterType} introduces a design peak shock of <strong className="text-amber-400">{lv.maxSepShockG} g SRS</strong>, with <strong className="text-cyan-400">{metrics.insertionCleanupDeltaVMs} m/s</strong> of orbital dispersion correction required post-separation.
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Launch Vehicle Separation Interface</span>
                  <span className="text-white font-bold">{lv.adapterType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Peak Mechanical Separation Shock</span>
                  <span className="text-amber-400 font-bold">{lv.maxSepShockG} g SRS at separation plane</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Orbit Insertion Dispersion Correction</span>
                  <span className="text-cyan-400 font-bold">{metrics.insertionCleanupDeltaVMs} m/s Delta-V allocated</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Launch Fitment Clearance</span>
                  <span className={`font-bold ${metrics.overallFit ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.overallFit ? "PASS (CLEARED FOR LAUNCH USER GUIDE INTEGRATION)" : "FAIL (MASS OR FAIRING DEFICIT)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Links to Related Engines */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                CORRELATED ENGINES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/vibe" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/vibe (Loads)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mass-budget" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mass-budget</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/compliance" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/compliance</span>
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
