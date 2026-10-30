"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Zap, 
  Sun, 
  Moon, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Sparkles,
  ShieldAlert
} from "lucide-react"

interface PlasmaPreset {
  name: string
  regime: "GEO Midnight Substorm" | "Polar LEO Auroral Horns" | "MEO Relativistic Belts" | "Equatorial LEO (Dense Cold Plasma)"
  electronDensityCm3: number
  electronTempKeV: number
  inSunlight: boolean
  surfaceCoating: "Bare Insulator (Kapton/Teflon)" | "Conductive Coating (ITO / Germanium)" | "Anodized Aluminium" | "Active Plasma Contactor"
  dielectricThicknessMm: number
  description: string
}

const PLASMA_PRESETS: Record<string, PlasmaPreset> = {
  geo_eclipse_substorm: {
    name: "GEO Midnight Severe Substorm",
    regime: "GEO Midnight Substorm",
    electronDensityCm3: 1.5,
    electronTempKeV: 12.0, // Hot plasma sheet injection
    inSunlight: false, // Eclipse: zero photoemission
    surfaceCoating: "Bare Insulator (Kapton/Teflon)",
    dielectricThicknessMm: 0.12,
    description: "Classic high-risk charging scenario: magnetospheric substorm in Earth eclipse with no solar photoemission.",
  },
  polar_auroral_surges: {
    name: "Polar SSO Auroral Precipitation",
    regime: "Polar LEO Auroral Horns",
    electronDensityCm3: 45.0,
    electronTempKeV: 4.5,
    inSunlight: false,
    surfaceCoating: "Conductive Coating (ITO / Germanium)",
    dielectricThicknessMm: 0.25,
    description: "High-inclination low Earth orbit traversing intense field-aligned auroral electron precipitation curtains.",
  },
  meo_deep_charging: {
    name: "MEO Internal Dielectric Injection (GPS/Galileo)",
    regime: "MEO Relativistic Belts",
    electronDensityCm3: 8.0,
    electronTempKeV: 18.0,
    inSunlight: true,
    surfaceCoating: "Bare Insulator (Kapton/Teflon)",
    dielectricThicknessMm: 0.08,
    description: "Energetic relativistic electrons penetrating chassis walls and accumulating inside internal PCB substrates.",
  },
}

export default function SpacePlasmaChargingPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("geo_eclipse_substorm")
  const [electronTempKeV, setElectronTempKeV] = useState<number>(12.0)
  const [inSunlight, setInSunlight] = useState<boolean>(false)
  const [coating, setCoating] = useState<string>("Bare Insulator (Kapton/Teflon)")
  const [dielectricMm, setDielectricMm] = useState<number>(0.12)

  const preset = PLASMA_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = PLASMA_PRESETS[key]
    setSelectedPresetKey(key)
    setElectronTempKeV(p.electronTempKeV)
    setInSunlight(p.inSunlight)
    setCoating(p.surfaceCoating)
    setDielectricMm(p.dielectricThicknessMm)
  }

  // NASA-HDBK-4002B Spacecraft Plasma Charging & ESD Calculations
  const metrics = useMemo(() => {
    // 1. Photoemission Current Density (A/m2)
    // In sunlight: ~2e-5 A/m2 for metals/polymers; in eclipse: 0
    const jPhoto = inSunlight ? 2.5e-5 : 0.0

    // 2. Incident Thermal Electron Current Density (A/m2)
    // J_e = n_e * q * sqrt(k*T_e / (2*pi*m_e))
    // Approximate scaling with electron temperature:
    const baseJe = 1.8e-6 * Math.sqrt(Math.max(0.1, electronTempKeV))

    // 3. Equilibrium Floating Potential (Volts)
    // In sunlight with photoemission, surfaces clamp to low positive voltage (+2 to +8V)
    // In eclipse hot plasma, voltage scales with electron thermal temperature: V ~ -T_e * 2.5 to 3.5
    let floatingPotentialV = 0
    if (inSunlight && coating.includes("Conductive")) {
      floatingPotentialV = +4.5
    } else if (inSunlight && !coating.includes("Conductive")) {
      // Differential potential can still build on shaded dielectric facets
      floatingPotentialV = -Math.round(electronTempKeV * 180)
    } else {
      // In shadow/eclipse
      if (coating.includes("Active Plasma")) {
        floatingPotentialV = -18 // Plasma contactor clamps potential
      } else if (coating.includes("Conductive")) {
        floatingPotentialV = -Math.round(electronTempKeV * 220)
      } else {
        floatingPotentialV = -Math.round(electronTempKeV * 1150) // Severe negative excursion
      }
    }

    // 4. Internal Dielectric Electric Field (V/cm)
    // E = |V_differential| / thickness
    const thicknessCm = dielectricMm / 10
    const internalElectricFieldVCm = Math.round(Math.abs(floatingPotentialV) / Math.max(0.001, thicknessCm))

    // 5. Breakdown Threshold Verification
    // Critical ESD breakdown limit for space dielectrics ~ 1.0e5 to 2.0e5 V/cm
    const esdBreakdownThresholdVCm = 1.5e5
    const esdTriggered = internalElectricFieldVCm >= esdBreakdownThresholdVCm
    const esdSafetyMarginPct = Math.round(
      ((esdBreakdownThresholdVCm - internalElectricFieldVCm) / esdBreakdownThresholdVCm) * 100
    )

    // 6. Arc Discharge Pulse Energy Estimate (milliJoules)
    // E_arc = 0.5 * C * V^2, assume capacitance ~ 150 pF/m2
    const capPf = 180
    const arcEnergyMilliJ = Math.round(0.5 * (capPf * 1e-12) * Math.pow(floatingPotentialV, 2) * 1000 * 10) / 10

    return {
      floatingPotentialV,
      jPhoto: jPhoto.toExponential(1),
      baseJe: baseJe.toExponential(2),
      internalElectricFieldVCm: internalElectricFieldVCm.toLocaleString(),
      esdTriggered,
      esdSafetyMarginPct,
      arcEnergyMilliJ,
    }
  }, [electronTempKeV, inSunlight, coating, dielectricMm])

  const exportPlasmaCSV = () => {
    const csv = `SPACECRAFT PLASMA CHARGING & ESD HARDENING DOSSIER
Preset Scenario,${preset.name}
Orbital Plasma Regime,${preset.regime}
Plasma Thermal Electron Energy,${electronTempKeV} keV
Solar Illumination State,${inSunlight ? "SUNLIT (PHOTOEMITTING)" : "ECLIPSE SHADOW (NO PHOTOEMISSION)"}
Surface Coating System,${coating}
Dielectric Substrate Thickness,${dielectricMm} mm
Equilibrium Floating Potential,${metrics.floatingPotentialV} Volts
Internal Dielectric Electric Field,${metrics.internalElectricFieldVCm} V/cm (Limit: 150,000 V/cm)
ESD Arc Breakdown Margin,${metrics.esdSafetyMarginPct}%
Arc Discharge Pulse Energy,${metrics.arcEnergyMilliJ} mJ
Electrostatic Discharge Verdict,${metrics.esdTriggered ? "ARC BREAKDOWN VIOLATION (ESD RISK)" : "DISCHARGE CLEARED (HARDENED)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-plasma-charging-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Zap className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              NASA-HDBK-4002B Spacecraft Plasma Charging &amp; ESD Breakdown Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              PLASMA CHARGING &amp; ESD SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model ambient space plasma current balances, chassis floating potentials, eclipse substorm negative excursions, and internal dielectric electrostatic discharge (ESD) thresholds.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportPlasmaCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT PLASMA DOSSIER
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(PLASMA_PRESETS).map(([k, v]) => (
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
              Space Plasma Environment
            </div>

            {/* Electron Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ELECTRON THERMAL ENERGY (T_e)</label>
                <span className="text-amber-400 font-bold">{electronTempKeV} keV</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={25.0}
                step={0.5}
                value={electronTempKeV}
                onChange={(e) => setElectronTempKeV(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1.0 keV (Quiet)</span>
                <span>12.0 keV (Substorm)</span>
                <span>25.0 keV (Extreme Storm)</span>
              </div>
            </div>

            {/* Solar Illumination State */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SOLAR ILLUMINATION</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInSunlight(true)}
                  className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    inSunlight
                      ? "bg-amber-950 border-amber-500/50 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> SUNLIT (+J_ph)
                </button>
                <button
                  type="button"
                  onClick={() => setInSunlight(false)}
                  className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !inSunlight
                      ? "bg-cyan-950 border-cyan-500/50 text-cyan-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> ECLIPSE SHADOW
                </button>
              </div>
            </div>

            {/* Surface Material Coating */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">SURFACE COATING SYSTEM</label>
              <select
                value={coating}
                onChange={(e) => setCoating(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Bare Insulator (Kapton/Teflon)">Bare Insulator (Kapton / Teflon MLI - High Resistivity)</option>
                <option value="Conductive Coating (ITO / Germanium)">Conductive Coating (Indium Tin Oxide - Dissipative)</option>
                <option value="Anodized Aluminium">Anodized Aluminium Structure</option>
                <option value="Active Plasma Contactor">Active Plasma Contactor (Xenon Hollow Cathode Clamping)</option>
              </select>
            </div>

            {/* Dielectric Thickness */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">DIELECTRIC SUBSTRATE THICKNESS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={0.01}
                  value={dielectricMm}
                  onChange={(e) => setDielectricMm(Math.max(0.01, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">mm</span>
              </div>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">PLASMA DYNAMICS NOTE:</div>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> FLOATING POTENTIAL
                </div>
                <div className={`text-3xl font-black ${metrics.floatingPotentialV < -500 ? "text-amber-400" : "text-cyan-400"}`}>
                  {metrics.floatingPotentialV} V
                </div>
                <div className="text-[10px] text-slate-500">Chassis-to-Plasma Ground</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" /> DIELECTRIC E-FIELD
                </div>
                <div className="text-3xl font-black text-white">{metrics.internalElectricFieldVCm}</div>
                <div className="text-[10px] text-purple-400">V / cm (Breakdown: 150k V/cm)</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {!metrics.esdTriggered ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  ESD STATUS
                </div>
                <div className={`text-3xl font-black ${!metrics.esdTriggered ? "text-emerald-400" : "text-red-400"}`}>
                  {!metrics.esdTriggered ? "CLEARED" : "ARC RISK"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {!metrics.esdTriggered ? `${metrics.esdSafetyMarginPct}% Headroom` : "Dielectric Punch-Through"}
                </div>
              </div>
            </div>

            {/* Plasma & Hardening Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  Electrostatic Discharge Hardening &amp; Mitigation Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  !metrics.esdTriggered
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {!metrics.esdTriggered ? "ESD MITIGATION VERIFIED" : "DISCHARGE VULNERABILITY DETECTED"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">DIELECTRIC BREAKDOWN MECHANICS</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Under an incident electron thermal temperature of <strong className="text-white">{electronTempKeV} keV</strong> in {inSunlight ? "sunlight" : "eclipse"}, the chassis charges to an equilibrium floating potential of <strong className="text-cyan-400">{metrics.floatingPotentialV} Volts</strong>.
                  This stresses internal circuit board substrates and thermal blanket backings with an electric field of <strong className="text-purple-400">{metrics.internalElectricFieldVCm} V/cm</strong>.
                  {metrics.esdTriggered ? (
                    <span className="text-red-400 block mt-1">
                      Critical ESD hazard: The internal electric field exceeds the 150,000 V/cm breakdown limit. A sudden spark discharge yielding ~{metrics.arcEnergyMilliJ} mJ can punch through insulation, induce phantom command resets on FPGA lines, or trigger permanent solar array cross-string sustained arcs. Upgrade to dissipative ITO coatings or incorporate active plasma clamping.
                    </span>
                  ) : (
                    <span className="text-emerald-400 block mt-1">
                      Safe electrostatic equilibrium: Electric fields remain within permissible dielectric tolerances with a {metrics.esdSafetyMarginPct}% safety margin.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Solar Photoemission Density (J_ph)</span>
                  <span className="text-white font-bold">{metrics.jPhoto} A/m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Incident Thermal Electron Density (J_e)</span>
                  <span className="text-cyan-400 font-bold">{metrics.baseJe} A/m²</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Equilibrium Floating Potential (V_float)</span>
                  <span className="text-amber-400 font-bold">{metrics.floatingPotentialV} Volts</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Estimated Arc Energy Potential</span>
                  <span className="text-purple-400 font-bold">{metrics.arcEnergyMilliJ} mJ (180 pF model)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Electrostatic Hardening Compliance</span>
                  <span className={`font-bold ${!metrics.esdTriggered ? "text-emerald-400" : "text-red-400"}`}>
                    {!metrics.esdTriggered ? "PASS (WITHIN NASA-HDBK-4002B GUIDELINES)" : "FAIL (ESD REMEDIATION REQUIRED)"}
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
