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
  DollarSign,
  Play,
  RotateCw,
  Flame,
  CheckCircle2
} from "lucide-react"

interface LaunchVehicle {
  name: string
  provider: string
  reusability: "Reusable (ASDS/RTLS)" | "Expendable" | "Dedicated SmallSat"
  fairingDiameterM: number
  fairingHeightM: number
  leoCapacityKg: number
  gtoCapacityKg: number
  tliCapacityKg: number
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
    fairingDiameterM: 4.6,
    fairingHeightM: 11.4,
    leoCapacityKg: 17400,
    gtoCapacityKg: 5500,
    tliCapacityKg: 3800,
    adapterType: "ESPA Grande / 1194VS Clampband",
    maxSepShockG: 1800,
    dedicatedCostM: 69.75,
    description: "Workhorse launch vehicle with flight-proven autonomous drone ship recovery and standard 5.2m composite fairing.",
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
    description: "Carbon composite small satellite launcher equipped with Curie kick-stage for precision orbital injection.",
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
    description: "Heavy European launcher featuring four solid strap-on boosters and restartable Vinci upper stage.",
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
    description: "National security launch vehicle powered by dual BE-4 methane engines and Centaur V cryogenic upper stage.",
  },
}

export default function LaunchVehiclePage() {
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string>("falcon_9_reusable")
  const [spacecraftWetMassKg, setSpacecraftWetMassKg] = useState<number>(450)
  const [spacecraftWidthM, setSpacecraftWidthM] = useState<number>(1.8)
  const [spacecraftHeightM, setSpacecraftHeightM] = useState<number>(2.4)
  const [targetOrbit, setTargetOrbit] = useState<"LEO / SSO (500 km)" | "GTO (Geostationary Transfer)" | "TLI (Trans-Lunar Injection)">("LEO / SSO (500 km)")
  const [isRideshare, setIsRideshare] = useState<boolean>(true)

  // Staging Visualizer State
  const [activeStageStep, setActiveStageStep] = useState<number>(1) // 1: Pad, 2: Max-Q, 3: MECO, 4: Fairing Sep, 5: Payload Deploy

  const lv = LAUNCH_VEHICLES[selectedVehicleKey]

  const metrics = useMemo(() => {
    let orbitCapacityKg = lv.leoCapacityKg
    if (targetOrbit.includes("GTO")) orbitCapacityKg = lv.gtoCapacityKg
    else if (targetOrbit.includes("TLI")) orbitCapacityKg = lv.tliCapacityKg

    const effectiveLimitKg = isRideshare ? 450 : orbitCapacityKg
    const massMarginKg = effectiveLimitKg - spacecraftWetMassKg
    const massMarginPct = Math.round((massMarginKg / effectiveLimitKg) * 100)
    const massCleared = massMarginKg >= 0

    const radialClearanceM = Math.round(((lv.fairingDiameterM - spacecraftWidthM) / 2) * 100) / 100
    const axialClearanceM = Math.round((lv.fairingHeightM - spacecraftHeightM) * 100) / 100
    const fairingVolumeCleared = radialClearanceM >= 0.10 && axialClearanceM >= 0.25

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
      estimatedLaunchCostM,
      overallFit,
    }
  }, [spacecraftWetMassKg, spacecraftWidthM, spacecraftHeightM, targetOrbit, isRideshare, lv])

  const exportLaunchCSV = () => {
    const csv = `SPACECRAFT LAUNCH VEHICLE PERFORMANCE & FAIRING FITMENT SPEC
Launch Vehicle,${lv.name}
Launch Provider,${lv.provider}
Launcher Class,${lv.reusability}
Booking Mode,${isRideshare ? "Commercial Rideshare (ESPA Slot)" : "Dedicated Launch"}
Target Orbit,${targetOrbit}
Vehicle Capacity,${metrics.orbitCapacityKg} kg
Spacecraft Mass,${spacecraftWetMassKg} kg (Margin: +${metrics.massMarginKg} kg / ${metrics.massMarginPct}%)
Fairing Dynamic Diameter,${lv.fairingDiameterM} m (Spacecraft Width: ${spacecraftWidthM} m)
Radial Clearance,${metrics.radialClearanceM} m (Req: >= 0.10 m)
Fairing Height,${lv.fairingHeightM} m (Spacecraft Height: ${spacecraftHeightM} m)
Axial Clearance,${metrics.axialClearanceM} m (Req: >= 0.25 m)
Separation Adapter,${lv.adapterType}
Max Peak Separation Shock,${lv.maxSepShockG} g SRS
Estimated Launch Cost Allocation,$${metrics.estimatedLaunchCostM} Million USD
Launch Fitment Verdict,${metrics.overallFit ? "CLEARED FOR LAUNCH" : "INTEGRATION DEFICIT"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-launch-${selectedVehicleKey}.csv`
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
              Launch Vehicle Ascent Staging &amp; Fairing Envelope Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              LAUNCH VEHICLE SELECTION &amp; ASCENT
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Verify booster payload lift curves, dynamic payload fairing stay-out clearances, separation shock levels, and stage separation event profiles.
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

        {/* Interactive Staging Profile Visualizer Card */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> LIVE ASCENT &amp; STAGING PROFILE
              </div>
              <div className="text-white font-bold text-sm mt-0.5">{lv.name} Flight Profile</div>
            </div>

            {/* Stage Selector Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { step: 1, label: "T+0: LIFTOFF" },
                { step: 2, label: "T+1:12: MAX-Q" },
                { step: 3, label: "T+2:30: MECO" },
                { step: 4, label: "T+3:15: FAIRING SEP" },
                { step: 5, label: "T+8:45: DEPLOY" }
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setActiveStageStep(s.step)}
                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${
                    activeStageStep === s.step
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/40"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Staging Diagram Canvas */}
          <div className="relative h-64 w-full bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-center overflow-hidden">
            {/* Background Altitude Horizon Line */}
            <div className="absolute inset-x-0 bottom-12 border-b border-dashed border-slate-800" />
            <span className="absolute bottom-14 left-4 text-[9px] text-slate-600">100 km Karman Line</span>

            {/* Step 1: Liftoff */}
            {activeStageStep === 1 && (
              <div className="text-center space-y-3 animate-fade-in">
                <div className="inline-block p-4 rounded-full bg-orange-950/40 border border-orange-500/40 animate-pulse">
                  <Rocket className="w-12 h-12 text-orange-400 -rotate-45" />
                </div>
                <div className="text-sm font-bold text-white">IGNITION &amp; LIFTOFF FROM PAD</div>
                <p className="text-slate-400 max-w-md text-[11px] font-sans">
                  Main booster engines at full thrust (1.7M+ lbf). Vehicle clearing launch tower and commencing roll program to azimuth.
                </p>
              </div>
            )}

            {/* Step 2: Max-Q */}
            {activeStageStep === 2 && (
              <div className="text-center space-y-3 animate-fade-in">
                <div className="inline-block p-4 rounded-full bg-amber-950/40 border border-amber-500/40">
                  <Flame className="w-12 h-12 text-amber-400" />
                </div>
                <div className="text-sm font-bold text-white">MAXIMUM AERODYNAMIC PRESSURE (MAX-Q)</div>
                <p className="text-slate-400 max-w-md text-[11px] font-sans">
                  Altitude: ~12 km, Mach 1.5. Peak dynamic air loads acting on payload fairing composite structure. Engines throttled to manage g-loads.
                </p>
              </div>
            )}

            {/* Step 3: MECO */}
            {activeStageStep === 3 && (
              <div className="text-center space-y-3 animate-fade-in">
                <div className="inline-block p-4 rounded-full bg-purple-950/40 border border-purple-500/40">
                  <Activity className="w-12 h-12 text-purple-400" />
                </div>
                <div className="text-sm font-bold text-white">MAIN ENGINE CUTOFF (MECO) &amp; STAGE 1/2 SEPARATION</div>
                <p className="text-slate-400 max-w-md text-[11px] font-sans">
                  Altitude: ~70 km. Pneumatic pushers separate Stage 1 booster. Stage 2 vacuum engine ignites; booster initiates boostback burn.
                </p>
              </div>
            )}

            {/* Step 4: Fairing Jettison */}
            {activeStageStep === 4 && (
              <div className="text-center space-y-3 animate-fade-in">
                <div className="inline-block p-4 rounded-full bg-cyan-950/40 border border-cyan-500/40">
                  <Maximize2 className="w-12 h-12 text-cyan-400" />
                </div>
                <div className="text-sm font-bold text-cyan-300">PAYLOAD FAIRING JETTISON (AERODYNAMIC EXPOSURE)</div>
                <p className="text-slate-400 max-w-md text-[11px] font-sans">
                  Altitude: ~115 km (Space vacuum). Fairing halves split pneumatically. Spacecraft ({spacecraftWetMassKg} kg) exposed to space for the first time.
                </p>
              </div>
            )}

            {/* Step 5: Payload Deployment */}
            {activeStageStep === 5 && (
              <div className="text-center space-y-3 animate-fade-in">
                <div className="inline-block p-4 rounded-full bg-emerald-950/40 border border-emerald-500/40">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="text-sm font-bold text-emerald-300">SEPARATION IMPULSE &amp; SPACECRAFT DEPLOYMENT</div>
                <p className="text-slate-400 max-w-md text-[11px] font-sans">
                  Target orbit achieved ({targetOrbit}). {lv.adapterType} fires clampband release. Satellite deployed at ~0.8 m/s relative separation rate.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Launcher Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {Object.entries(LAUNCH_VEHICLES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setSelectedVehicleKey(k)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
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
              <Rocket className="w-3 h-3 text-cyan-400" /> LIFT CAPACITY MARGIN
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

        {/* Configuration Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" /> Spacecraft Envelope &amp; Mission
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300 font-bold uppercase text-[11px]">BOOKING MODE</span>
              <button
                type="button"
                onClick={() => setIsRideshare(!isRideshare)}
                className={`px-3 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  isRideshare
                    ? "bg-cyan-950 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {isRideshare ? "COMMERCIAL RIDESHARE" : "DEDICATED LAUNCHER"}
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">TARGET INJECTION ORBIT</label>
              <select
                value={targetOrbit}
                onChange={e => setTargetOrbit(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="LEO / SSO (500 km)">LEO / SSO (500 km Sun-Synchronous)</option>
                <option value="GTO (Geostationary Transfer)">GTO (Geostationary Transfer Orbit)</option>
                <option value="TLI (Trans-Lunar Injection)">TLI (Trans-Lunar Injection)</option>
              </select>
            </div>

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
                onChange={e => setSpacecraftWetMassKg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">WIDTH (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={spacecraftWidthM}
                  onChange={e => setSpacecraftWidthM(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">HEIGHT (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={spacecraftHeightM}
                  onChange={e => setSpacecraftHeightM(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* Dossier Card */}
          <div className="lg:col-span-2 space-y-6">
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
                  {metrics.overallFit ? "FITMENT CERTIFIED" : "LAUNCH DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  Deploying <strong className="text-white">{spacecraftWetMassKg} kg</strong> into <strong className="text-cyan-400">{targetOrbit}</strong> via <strong className="text-white">{lv.name}</strong>. 
                  The booster yields <strong className="text-white">{metrics.orbitCapacityKg} kg</strong> gross performance, securing a <strong className={metrics.massCleared ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>+{metrics.massMarginKg} kg ({metrics.massMarginPct}%)</strong> mass growth reserve.
                </p>
                <p>
                  Stowed dimensions of <strong className="text-white">{spacecraftWidthM}m &times; {spacecraftHeightM}m</strong> inside the {lv.fairingDiameterM}m &times; {lv.fairingHeightM}m fairing maintain <strong className="text-purple-400">{metrics.radialClearanceM} m</strong> radial buffer and <strong className="text-purple-400">{metrics.axialClearanceM} m</strong> axial buffer.
                </p>
              </div>

              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Separation Mechanism Interface</span>
                  <span className="text-white font-bold">{lv.adapterType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Peak Mechanical Separation Shock</span>
                  <span className="text-amber-400 font-bold">{lv.maxSepShockG} g SRS</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Flight Integration Clearance</span>
                  <span className={`font-bold ${metrics.overallFit ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.overallFit ? "PASS (CLEARED FOR LAUNCH VEHICLE USER GUIDE)" : "FAIL (INSUFFICIENT CLEARANCE)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">CORRELATED MODULES:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/visualizer" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/visualizer (3D)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/vibe" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/vibe (Loads)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mass-budget" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mass-budget</span>
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
