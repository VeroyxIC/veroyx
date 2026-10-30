"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Activity, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Zap,
  Volume2,
  Waves,
  Rocket
} from "lucide-react"

interface LauncherVibePreset {
  name: string
  vehicle: string
  staticAxialG: number
  staticLateralG: number
  minAxialFreqHz: number
  minLateralFreqHz: number
  oasplDb: number
  psdPeakG2Hz: number
  peakShockG: number
  description: string
}

const VIBE_PRESETS: Record<string, LauncherVibePreset> = {
  falcon9_standard: {
    name: "SpaceX Falcon 9 (Standard 5.2m Fairing)",
    vehicle: "Falcon 9 / Falcon Heavy",
    staticAxialG: 6.5,
    staticLateralG: 2.0,
    minAxialFreqHz: 25.0,
    minLateralFreqHz: 10.0,
    oasplDb: 139.5,
    psdPeakG2Hz: 0.08,
    peakShockG: 2500,
    description: "Standard commercial rideshare and dedicated qualification profile per SpaceX Payload User's Guide.",
  },
  vulcan_heavy: {
    name: "ULA Vulcan Centaur (5.4m Heavy Fairing)",
    vehicle: "Vulcan Centaur",
    staticAxialG: 5.5,
    staticLateralG: 2.2,
    minAxialFreqHz: 28.0,
    minLateralFreqHz: 12.0,
    oasplDb: 141.2,
    psdPeakG2Hz: 0.12,
    peakShockG: 3200,
    description: "US Space Force National Security Space Launch (NSSL) Category 3 dynamic load environment.",
  },
  electron_dedicated: {
    name: "Rocket Lab Electron (Dedicated Smallsat)",
    vehicle: "Electron",
    staticAxialG: 8.5,
    staticLateralG: 3.0,
    minAxialFreqHz: 35.0,
    minLateralFreqHz: 15.0,
    oasplDb: 136.0,
    psdPeakG2Hz: 0.05,
    peakShockG: 1800,
    description: "Responsive dedicated small launcher with higher axial accelerations during second stage burnout.",
  },
}

export default function VibrationDynamicsPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("falcon9_standard")
  const [spacecraftMassKg, setSpacecraftMassKg] = useState<number>(350)
  const [actualAxialFreqHz, setActualAxialFreqHz] = useState<number>(38.0)
  const [actualLateralFreqHz, setActualLateralFreqHz] = useState<number>(18.0)
  const [safetyFactor, setSafetyFactor] = useState<number>(1.25) // NASA standard protoflight factor

  const preset = VIBE_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = VIBE_PRESETS[key]
    setSelectedPresetKey(key)
  }

  // Dynamic Launch Vibration & Acoustic Calculations
  const metrics = useMemo(() => {
    // 1. Equivalent Combined Quasi-Static G Load
    // Combined G = sqrt(G_axial^2 + G_lateral^2) * SafetyFactor
    const designAxialG = preset.staticAxialG * safetyFactor
    const designLateralG = preset.staticLateralG * safetyFactor
    const combinedG = Math.round(Math.sqrt(Math.pow(designAxialG, 2) + Math.pow(designLateralG, 2)) * 10) / 10

    // Peak limit shear and axial structural loads at launcher interface ring (in kN)
    // F = m * a
    const g0 = 9.80665
    const interfaceAxialForceKn = Math.round(((spacecraftMassKg * designAxialG * g0) / 1000) * 10) / 10
    const interfaceLateralShearKn = Math.round(((spacecraftMassKg * designLateralG * g0) / 1000) * 10) / 10

    // 2. Frequency Stiffness Compliance
    const axialFreqMarginPct = Math.round(((actualAxialFreqHz - preset.minAxialFreqHz) / preset.minAxialFreqHz) * 100)
    const lateralFreqMarginPct = Math.round(((actualLateralFreqHz - preset.minLateralFreqHz) / preset.minLateralFreqHz) * 100)
    const axialFreqPassed = actualAxialFreqHz >= preset.minAxialFreqHz
    const lateralFreqPassed = actualLateralFreqHz >= preset.minLateralFreqHz
    const stiffnessPassed = axialFreqPassed && lateralFreqPassed

    // 3. Random Vibration GRMS Integration
    // Approximate integration of trapezoidal profile between 20 Hz and 2000 Hz
    // Grms ~ sqrt(Area under PSD)
    const bandwidthHz = 2000 - 20
    const grmsValue = Math.round(Math.sqrt(preset.psdPeakG2Hz * (bandwidthHz * 0.45)) * 10) / 10

    // 4. Acoustic Cavity Sound Pressure Level (Pascal)
    // SPL (dB) = 20 * log10(P / P0), P0 = 20 uPa
    const p0 = 2e-5
    const acousticPressurePa = Math.round(p0 * Math.pow(10, preset.oasplDb / 20))

    return {
      combinedG,
      interfaceAxialForceKn,
      interfaceLateralShearKn,
      axialFreqMarginPct,
      lateralFreqMarginPct,
      axialFreqPassed,
      lateralFreqPassed,
      stiffnessPassed,
      grmsValue,
      acousticPressurePa,
    }
  }, [preset, spacecraftMassKg, actualAxialFreqHz, actualLateralFreqHz, safetyFactor])

  const exportVibeCSV = () => {
    const csv = `SPACECRAFT LAUNCH VIBRATION & DYNAMIC LOADS DOSSIER
Launcher Vehicle Profile,${preset.name}
Spacecraft Mass,${spacecraftMassKg} kg
Qualification Safety Factor,${safetyFactor}x (NASA Protoflight)
Max Quasi-Static Axial Load,${preset.staticAxialG} g (Design: ${(preset.staticAxialG * safetyFactor).toFixed(1)} g)
Max Quasi-Static Lateral Load,${preset.staticLateralG} g (Design: ${(preset.staticLateralG * safetyFactor).toFixed(1)} g)
Combined Peak Vector Load,${metrics.combinedG} g
Interface Ring Axial Force,${metrics.interfaceAxialForceKn} kN
Interface Ring Shear Load,${metrics.interfaceLateralShearKn} kN
Launcher Min Axial Frequency,${preset.minAxialFreqHz} Hz (Actual: ${actualAxialFreqHz} Hz, ${metrics.axialFreqMarginPct}% Margin)
Launcher Min Lateral Frequency,${preset.minLateralFreqHz} Hz (Actual: ${actualLateralFreqHz} Hz, ${metrics.lateralFreqMarginPct}% Margin)
Stiffness Compliance Verdict,${metrics.stiffnessPassed ? "APPROVED (NO RESONANCE RISK)" : "COUPLED LOADS VIOLATION"}
Overall Sound Pressure Level (OASPL),${preset.oasplDb} dB (${metrics.acousticPressurePa} Pa RMS)
Random Vibration Composite Energy,${metrics.grmsValue} Grms
Peak Fairing Separation Shock,${preset.peakShockG} g at 1-10 kHz`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-vibe-dynamics-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Waves className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA-STD-7001B Launch Dynamic Environment &amp; Acoustic Shock Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              LAUNCH VIBRATION &amp; ACOUSTIC LOADS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model launcher quasi-static design limit loads (DLL), minimum resonant frequency stiffness constraints, random vibration PSD integration (Grms), and pyrotechnic fairing shock response spectrums.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportVibeCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT DYNAMICS SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(VIBE_PRESETS).map(([k, v]) => (
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
              Spacecraft Structural Parameters
            </div>

            {/* Spacecraft Mass */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SPACECRAFT WET MASS</label>
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

            {/* Safety Factor */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">QUALIFICATION FACTOR OF SAFETY</label>
              <select
                value={safetyFactor}
                onChange={(e) => setSafetyFactor(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value={1.0}>1.0x (Design Limit Load - Flight Acceptance)</option>
                <option value={1.25}>1.25x (NASA Standard Protoflight Qualification)</option>
                <option value={1.4}>1.4x (Full Qualification Unit Standard)</option>
              </select>
            </div>

            {/* Fundamental Natural Frequencies */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Spacecraft Fundamental Frequencies (Hz)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase">AXIAL 1ST MODE</span>
                    <span className="text-cyan-400 font-bold">{actualAxialFreqHz} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={75}
                    value={actualAxialFreqHz}
                    onChange={(e) => setActualAxialFreqHz(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-[9px] text-slate-500 block">Min Req: {preset.minAxialFreqHz} Hz</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase">LATERAL 1ST MODE</span>
                    <span className="text-purple-400 font-bold">{actualLateralFreqHz} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={35}
                    value={actualLateralFreqHz}
                    onChange={(e) => setActualLateralFreqHz(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                  <span className="text-[9px] text-slate-500 block">Min Req: {preset.minLateralFreqHz} Hz</span>
                </div>
              </div>
            </div>

            {/* Launcher Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">LAUNCH VEHICLE PROFILE:</div>
              <p className="text-slate-300 font-bold font-mono">{preset.vehicle}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Rocket className="w-3 h-3 text-cyan-400" /> COMBINED DESIGN LOAD
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.combinedG} g</div>
                <div className="text-[10px] text-slate-500">Includes {safetyFactor}x Safety Factor</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Waves className="w-3 h-3 text-purple-400" /> RANDOM VIBRATION
                </div>
                <div className="text-3xl font-black text-white">{metrics.grmsValue} Grms</div>
                <div className="text-[10px] text-purple-400">20 - 2,000 Hz PSD Composite</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.stiffnessPassed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  STIFFNESS VERDICT
                </div>
                <div className={`text-3xl font-black ${metrics.stiffnessPassed ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.stiffnessPassed ? "COMPLIANT" : "RESONANCE"}
                </div>
                <div className="text-[10px] text-slate-500">Launcher Dynamic Envelope</div>
              </div>
            </div>

            {/* Structural Loads & Dynamic Environment Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Launch Coupled Loads &amp; Interface Stress Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.stiffnessPassed
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.stiffnessPassed ? "COUPLED LOADS CLEARED" : "COUPLED LOADS RISK"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">INTERFACE RING FORCES AT MECO / MAX-Q</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  During peak acceleration and transonic atmospheric buffeting, a spacecraft wet mass of <strong className="text-white">{spacecraftMassKg} kg</strong> transfers a quasi-static axial compressive thrust of <strong className="text-cyan-400">{metrics.interfaceAxialForceKn} kN</strong> and a peak lateral shear load of <strong className="text-purple-400">{metrics.interfaceLateralShearKn} kN</strong> across the payload adapter ring.
                  {!metrics.stiffnessPassed && (
                    <span className="text-red-400 block mt-1">
                      Structural stiffness failure: Spacecraft fundamental frequency falls below launcher minimum guidelines. This risks severe pogo resonance and dynamic amplification during engine burn.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Axial 1st Resonant Mode Margin</span>
                  <span className={`font-bold ${metrics.axialFreqPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {actualAxialFreqHz} Hz (Launcher Req: &ge; {preset.minAxialFreqHz} Hz, +{metrics.axialFreqMarginPct}%)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Lateral 1st Resonant Mode Margin</span>
                  <span className={`font-bold ${metrics.lateralFreqPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {actualLateralFreqHz} Hz (Launcher Req: &ge; {preset.minLateralFreqHz} Hz, +{metrics.lateralFreqMarginPct}%)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Acoustic Fairing Cavity Sound Pressure</span>
                  <span className="text-white font-bold">{preset.oasplDb} dB OASPL ({metrics.acousticPressurePa} Pa RMS)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Fairing / Clamp-Band Pyrotechnic Shock</span>
                  <span className="text-purple-400 font-bold">{preset.peakShockG.toLocaleString()} g SRS (1 - 10 kHz)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Launch Environmental Qualification</span>
                  <span className={`font-bold ${metrics.stiffnessPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.stiffnessPassed ? "APPROVED FOR LAUNCH INTEGRATION" : "STRUCTURAL STIFFENING REQUIRED"}
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
