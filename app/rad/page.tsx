"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ShieldAlert, 
  Cpu, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Zap,
  Radio,
  Sliders
} from "lucide-react"

interface RadPreset {
  name: string
  orbitClass: "Low Earth Orbit (LEO - 500 km)" | "Sun-Synchronous Polar (SSO - 700 km)" | "MEO Navigation Belt (GPS - 20,200 km)" | "Geostationary (GEO - 35,786 km)" | "Cislunar / Lunar Gateway"
  altitudeKm: number
  shieldingThicknessMm: number
  missionDurationYears: number
  componentClass: "Commercial Off-The-Shelf (COTS)" | "Rad-Tolerant (Automotive/AEC-Q100)" | "Rad-Hard Class V / QML-V"
  deviceLetThreshold: number // MeV*cm2/mg
  deviceTidRatingKrad: number // krad(Si)
  solarActivity: "Solar Maximum (Suppressed GCR)" | "Solar Minimum (Peak GCR)" | "SPE Solar Proton Event"
  description: string
}

const RAD_PRESETS: Record<string, RadPreset> = {
  meo_nav_belt: {
    name: "MEO Severe Radiation Belt (GPS/Galileo)",
    orbitClass: "MEO Navigation Belt (GPS - 20,200 km)",
    altitudeKm: 20200,
    shieldingThicknessMm: 4.5,
    missionDurationYears: 12,
    componentClass: "Rad-Hard Class V / QML-V",
    deviceLetThreshold: 75,
    deviceTidRatingKrad: 100,
    solarActivity: "Solar Minimum (Peak GCR)",
    description: "Heart of the outer Van Allen relativistic electron belt producing intense annual dose and heavy GCR fluxes.",
  },
  sso_polar_cubesat: {
    name: "Polar LEO Smallsat COTS Architecture",
    orbitClass: "Sun-Synchronous Polar (SSO - 700 km)",
    altitudeKm: 700,
    shieldingThicknessMm: 2.0,
    missionDurationYears: 3,
    componentClass: "Commercial Off-The-Shelf (COTS)",
    deviceLetThreshold: 15,
    deviceTidRatingKrad: 15,
    solarActivity: "Solar Minimum (Peak GCR)",
    description: "Traverses the South Atlantic Anomaly (SAA) and polar horn cutoffs with lightweight unshielded COTS silicon.",
  },
  geo_telecom_flagship: {
    name: "GEO 15-Year Commercial Communications",
    orbitClass: "Geostationary (GEO - 35,786 km)",
    altitudeKm: 35786,
    shieldingThicknessMm: 3.5,
    missionDurationYears: 15,
    componentClass: "Rad-Tolerant (Automotive/AEC-Q100)",
    deviceLetThreshold: 45,
    deviceTidRatingKrad: 50,
    solarActivity: "SPE Solar Proton Event",
    description: "15-year geostationary orbit exposed to solar particle event proton flares and trapped magnetospheric electrons.",
  },
}

export default function RadiationTidSeePage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("sso_polar_cubesat")
  const [shieldingMm, setShieldingMm] = useState<number>(2.0)
  const [missionYears, setMissionYears] = useState<number>(3)
  const [componentClass, setComponentClass] = useState<string>("Commercial Off-The-Shelf (COTS)")
  const [deviceLetThreshold, setDeviceLetThreshold] = useState<number>(15)
  const [deviceTidRatingKrad, setDeviceTidRatingKrad] = useState<number>(15)
  const [solarActivity, setSolarActivity] = useState<string>("Solar Minimum (Peak GCR)")

  const preset = RAD_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = RAD_PRESETS[key]
    setSelectedPresetKey(key)
    setShieldingMm(p.shieldingThicknessMm)
    setMissionYears(p.missionDurationYears)
    setComponentClass(p.componentClass)
    setDeviceLetThreshold(p.deviceLetThreshold)
    setDeviceTidRatingKrad(p.deviceTidRatingKrad)
    setSolarActivity(p.solarActivity)
  }

  // NASA-HDBK-4002 & SHIELDOSE-2 Radiation Calculations
  const metrics = useMemo(() => {
    // 1. Unshielded Annual Orbit Base Dose Rate (krad/yr)
    let baseAnnualDoseKrad = 5.0
    if (preset.orbitClass.includes("MEO")) baseAnnualDoseKrad = 42.0 // Peak trapped electron belt
    else if (preset.orbitClass.includes("GEO")) baseAnnualDoseKrad = 12.0
    else if (preset.orbitClass.includes("Polar")) baseAnnualDoseKrad = 4.2 // SAA + polar horns
    else baseAnnualDoseKrad = 1.8 // Standard low LEO

    if (solarActivity.includes("SPE")) baseAnnualDoseKrad *= 2.4

    // 2. Shielding Attenuation Factor (Aluminium Slab Model)
    // Dose(x) = Dose0 * exp(-x / lambda), attenuation length lambda ~ 2.4 mm in Al
    const attenuationFactor = Math.exp(-shieldingMm / 2.6)
    const annualShieldedDoseKrad = baseAnnualDoseKrad * attenuationFactor

    // Total Lifetime Accumulated TID (krad(Si))
    const totalLifetimeTidKrad = Math.round(annualShieldedDoseKrad * missionYears * 10) / 10

    // Radiation Design Margin (RDM): Device TID Rating / Total Lifetime TID
    // NASA/DoD standard mandates RDM >= 2.0x
    const rdmRatio = Math.round((deviceTidRatingKrad / Math.max(0.1, totalLifetimeTidKrad)) * 10) / 10
    const tidPassed = rdmRatio >= 2.0

    // 3. Single Event Latchup (SEL) Immunity Threshold
    // Devices with LET_th > 75 MeV*cm2/mg are considered latchup immune per ECSS/NASA
    const selImmune = deviceLetThreshold >= 75
    const selHighRisk = deviceLetThreshold < 35

    // 4. Single Event Upset (SEU) Rate (Events / Device / Day)
    // Weibull curve approximation for soft error rates
    let gcrMultiplier = 1.0
    if (solarActivity.includes("Peak GCR")) gcrMultiplier = 1.8
    else if (solarActivity.includes("SPE")) gcrMultiplier = 4.5

    const baseSeuRate = (3.5 / Math.pow(Math.max(1, deviceLetThreshold), 1.3)) * gcrMultiplier
    const dailySeuRate = Math.round(baseSeuRate * 1000) / 1000
    // Mean Time Between Single Event Upsets (MTBF in Days)
    const mtbfDays = dailySeuRate > 0 ? Math.round(1 / dailySeuRate) : 9999

    return {
      annualShieldedDoseKrad: Math.round(annualShieldedDoseKrad * 10) / 10,
      totalLifetimeTidKrad,
      rdmRatio,
      tidPassed,
      selImmune,
      selHighRisk,
      dailySeuRate,
      mtbfDays,
    }
  }, [shieldingMm, missionYears, deviceLetThreshold, deviceTidRatingKrad, solarActivity, preset])

  const exportRadCSV = () => {
    const csv = `SPACECRAFT TOTAL IONIZING DOSE & SEE RADIATION DOSSIER
Preset Scenario,${preset.name}
Orbit Regime,${preset.orbitClass}
Altitude,${preset.altitudeKm} km
Mission Duration,${missionYears} years
Aluminium Shielding Thickness,${shieldingMm} mm
Component Qualification Class,${componentClass}
Device Rated TID Tolerance,${deviceTidRatingKrad} krad(Si)
Heavy-Ion LET Threshold (LET_th),${deviceLetThreshold} MeV*cm2/mg
Solar Environment State,${solarActivity}
Annual Shielded Dose Rate,${metrics.annualShieldedDoseKrad} krad/yr
Total Mission Accumulated TID,${metrics.totalLifetimeTidKrad} krad(Si)
Radiation Design Margin (RDM),${metrics.rdmRatio}x (Req: >= 2.0x)
TID Survivability Verdict,${metrics.tidPassed ? "QUALIFIED (RDM >= 2.0x)" : "TID DEGRADATION RISK"}
Single Event Latchup (SEL) Status,${metrics.selImmune ? "IMMUNE (> 75 MeV)" : metrics.selHighRisk ? "CRITICAL LATCHUP RISK" : "MITIGATION REQUIRED"}
Single Event Upset (SEU) Rate,${metrics.dailySeuRate} upsets/device/day
Soft Error MTBF,${metrics.mtbfDays} days between bit-flips`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-radiation-tid-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Cpu className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA-HDBK-4002 Total Ionizing Dose (TID) &amp; Single Event Effects (SEE) Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              RADIATION HARDENING &amp; SEU/TID
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model orbital proton/electron trapped belt dose curves, aluminium shielding attenuation, Radiation Design Margins (RDM), heavy-ion latchup immunity, and soft error rates.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportRadCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT RADIATION DOSSIER
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(RAD_PRESETS).map(([k, v]) => (
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
              Shielding &amp; Component Tolerances
            </div>

            {/* Aluminium Shielding Thickness */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ALUMINIUM SHIELDING THICKNESS</label>
                <span className="text-cyan-400 font-bold">{shieldingMm} MM</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={12.0}
                step={0.5}
                value={shieldingMm}
                onChange={(e) => setShieldingMm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1.0 mm (Thin Chassis)</span>
                <span>4.5 mm (Standard)</span>
                <span>12.0 mm (Vault)</span>
              </div>
            </div>

            {/* Component Class */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">COMPONENT QUALIFICATION CLASS</label>
              <select
                value={componentClass}
                onChange={(e) => setComponentClass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Commercial Off-The-Shelf (COTS)">Commercial Off-The-Shelf (COTS Silicon)</option>
                <option value="Rad-Tolerant (Automotive/AEC-Q100)">Rad-Tolerant (Automotive AEC-Q100 Screened)</option>
                <option value="Rad-Hard Class V / QML-V">Rad-Hard Class V / QML-V (Hermetic Ceramic)</option>
              </select>
            </div>

            {/* Component Ratings */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">TID RATING</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={deviceTidRatingKrad}
                    onChange={(e) => setDeviceTidRatingKrad(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">krad</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">LET THRESHOLD</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={deviceLetThreshold}
                    onChange={(e) => setDeviceLetThreshold(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">LET</span>
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

            {/* Solar Environment Activity */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">SOLAR / GCR ENVIRONMENT</label>
              <select
                value={solarActivity}
                onChange={(e) => setSolarActivity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Solar Minimum (Peak GCR)">Solar Minimum (Peak Galactic Cosmic Rays)</option>
                <option value="Solar Maximum (Suppressed GCR)">Solar Maximum (Suppressed GCR / Higher Trapped Flux)</option>
                <option value="SPE Solar Proton Event">SPE Solar Proton Event (October 1989 Flare Scenario)</option>
              </select>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> TOTAL LIFETIME TID
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.totalLifetimeTidKrad} krad</div>
                <div className="text-[10px] text-slate-500">Annual Rate: {metrics.annualShieldedDoseKrad} krad/yr</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.tidPassed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  RADIATION MARGIN (RDM)
                </div>
                <div className={`text-3xl font-black ${metrics.tidPassed ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.rdmRatio}x
                </div>
                <div className="text-[10px] text-slate-500">NASA/DoD Standard: &ge; 2.0x</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" /> SOFT ERROR MTBF
                </div>
                <div className="text-3xl font-black text-white">{metrics.mtbfDays} days</div>
                <div className="text-[10px] text-purple-400">{metrics.dailySeuRate} upsets / device / day</div>
              </div>
            </div>

            {/* Radiation Assurance & Latchup Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  Radiation Tolerance &amp; Single Event Latchup (SEL) Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.tidPassed && !metrics.selHighRisk
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.tidPassed && !metrics.selHighRisk
                    ? "AVIONICS RADIATION ASSURANCE VERIFIED"
                    : "RADIATION VULNERABILITY DETECTED"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">RADIATION PHYSICS ASSESSMENT</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Operating in the {preset.orbitClass} under {shieldingMm} mm of aluminium shielding attenuates the ambient flux to an annual absorbed dose of <strong className="text-white">{metrics.annualShieldedDoseKrad} krad(Si)/year</strong>, accumulating <strong className="text-cyan-400">{metrics.totalLifetimeTidKrad} krad</strong> over {missionYears} years. 
                  Comparing this against the component rating of {deviceTidRatingKrad} krad yields a Radiation Design Margin (RDM) of <strong className={metrics.tidPassed ? "text-emerald-400" : "text-red-400"}>{metrics.rdmRatio}x</strong>.
                  {metrics.selImmune ? (
                    <span className="text-emerald-400 block mt-1">
                      SEL Immunity verified: Linear Energy Transfer threshold (LET_th = {deviceLetThreshold} MeV&middot;cm²/mg) exceeds the 75 MeV&middot;cm²/mg benchmark, guaranteeing complete immunity against destructive parasitic thyristor latchup.
                    </span>
                  ) : metrics.selHighRisk ? (
                    <span className="text-red-400 block mt-1">
                      High latchup risk: LET threshold ({deviceLetThreshold} MeV&middot;cm²/mg) is below 35 MeV&middot;cm²/mg. Heavy-ion GCR strikes can trigger destructive p-n-p-n short circuits. Fast-trip overcurrent protection switches (&lt; 50 µs) and cold-redundant spares are required.
                    </span>
                  ) : (
                    <span className="text-amber-400 block mt-1">
                      Moderate SEE risk: Implement autonomous watchdog timers, Triple-Modular Redundancy (TMR), and periodic EDAC memory scrubbing to recover from bit-flips every ~{metrics.mtbfDays} days.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Lifetime Accumulated TID</span>
                  <span className="text-white font-bold">{metrics.totalLifetimeTidKrad} krad(Si)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Radiation Design Margin (RDM)</span>
                  <span className={`font-bold ${metrics.tidPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.rdmRatio}x (Threshold: &ge; 2.0x)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Single Event Latchup (SEL) Immunity</span>
                  <span className={`font-bold ${metrics.selImmune ? "text-emerald-400" : metrics.selHighRisk ? "text-red-400" : "text-amber-400"}`}>
                    {metrics.selImmune ? "IMMUNE (> 75 MeV)" : metrics.selHighRisk ? "HIGH LATCHUP HAZARD" : "REQUIRES OVERCURRENT PROTECTION"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Mean Time Between Bit-Flips (SEU)</span>
                  <span className="text-purple-400 font-bold">~{metrics.mtbfDays} Days ({metrics.dailySeuRate} upsets/day)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Radiation Hardening Compliance</span>
                  <span className={`font-bold ${metrics.tidPassed && !metrics.selHighRisk ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.tidPassed && !metrics.selHighRisk ? "PASS (CLEARED FOR FLIGHT ASSURANCE)" : "FAIL (INSUFFICIENT RDM OR LATCHUP RISK)"}
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
