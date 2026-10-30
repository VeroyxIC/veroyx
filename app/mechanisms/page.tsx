"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Sliders, 
  RotateCw, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Maximize2,
  Lock,
  Zap
} from "lucide-react"

interface MechanismPreset {
  name: string
  classType: string
  mechanismType: "Deployable Rigid Solar Wing" | "Roll-Out Solar Array (ROSA)" | "High-Gain Parabolic Reflector" | "Deployable Magnetometer Mast"
  wingLengthM: number
  totalWingMassKg: number
  hingeDriveTorqueNm: number
  harnessResistanceTorqueNm: number
  frictionTorqueNm: number
  latchSpringResistanceNm: number
  thermalState: "Cold Soak (-120C)" | "Nominal (20C)" | "Hot Soak (+80C)"
  description: string
}

const MECHANISM_PRESETS: Record<string, MechanismPreset> = {
  leo_rigid_solar_wing: {
    name: "LEO Smallsat Multi-Panel Rigid Wing",
    classType: "Rigid Panel Solar Wing",
    mechanismType: "Deployable Rigid Solar Wing",
    wingLengthM: 2.8,
    totalWingMassKg: 14.5,
    hingeDriveTorqueNm: 4.8,
    harnessResistanceTorqueNm: 0.9,
    frictionTorqueNm: 0.35,
    latchSpringResistanceNm: 0.45,
    thermalState: "Cold Soak (-120C)",
    description: "3-panel accordion fold wing driven by root and inter-panel torsion springs with latching pins.",
  },
  rosa_flexible_blanket: {
    name: "Roll-Out Solar Array (ROSA Boom)",
    classType: "Stored-Strain Carbon Composite",
    mechanismType: "Roll-Out Solar Array (ROSA)",
    wingLengthM: 6.0,
    totalWingMassKg: 22.0,
    hingeDriveTorqueNm: 8.5,
    harnessResistanceTorqueNm: 1.2,
    frictionTorqueNm: 0.6,
    latchSpringResistanceNm: 0.2,
    thermalState: "Nominal (20C)",
    description: "Elastic composite tubular booms unrolling flexible photovoltaic blanket without mechanical hinges.",
  },
  flagship_reflector_boom: {
    name: "GEO Steerable 2.5m Parabolic Reflector",
    classType: "Deployable Antenna Mast",
    mechanismType: "High-Gain Parabolic Reflector",
    wingLengthM: 3.5,
    totalWingMassKg: 32.0,
    hingeDriveTorqueNm: 18.0,
    harnessResistanceTorqueNm: 3.8,
    frictionTorqueNm: 1.6,
    latchSpringResistanceNm: 1.2,
    thermalState: "Cold Soak (-120C)",
    description: "High-stiffness tubular deployment arm routing cryogenic coax cables with heavy spring actuators.",
  },
}

export default function DeployableMechanismsPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("leo_rigid_solar_wing")
  const [wingLengthM, setWingLengthM] = useState<number>(2.8)
  const [wingMassKg, setWingMassKg] = useState<number>(14.5)
  const [driveTorqueNm, setDriveTorqueNm] = useState<number>(4.8)
  const [harnessTorqueNm, setHarnessTorqueNm] = useState<number>(0.9)
  const [frictionTorqueNm, setFrictionTorqueNm] = useState<number>(0.35)
  const [latchTorqueNm, setLatchTorqueNm] = useState<number>(0.45)
  const [thermalState, setThermalState] = useState<string>("Cold Soak (-120C)")

  const preset = MECHANISM_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = MECHANISM_PRESETS[key]
    setSelectedPresetKey(key)
    setWingLengthM(p.wingLengthM)
    setWingMassKg(p.totalWingMassKg)
    setDriveTorqueNm(p.hingeDriveTorqueNm)
    setHarnessTorqueNm(p.harnessResistanceTorqueNm)
    setFrictionTorqueNm(p.frictionTorqueNm)
    setLatchTorqueNm(p.latchSpringResistanceNm)
    setThermalState(p.thermalState)
  }

  // NASA-STD-5017A & ECSS-E-ST-33-01C Mechanism Torque Margin Calculations
  const metrics = useMemo(() => {
    // Thermal Harness Resistance Factor: Cold-soak stiffness stiffens wiring insulation by 2.2x
    let tempMultiplier = 1.0
    if (thermalState.includes("-120C")) tempMultiplier = 2.2
    else if (thermalState.includes("+80C")) tempMultiplier = 0.85

    const effectiveHarnessTorqueNm = harnessTorqueNm * tempMultiplier

    // 1. Total Resistive Torque (T_resistive)
    const totalResistiveTorqueNm = Math.round((frictionTorqueNm + effectiveHarnessTorqueNm + latchTorqueNm) * 100) / 100

    // 2. Torque Margin per ECSS:
    // Torque Ratio = T_drive / T_resistive
    // Margin = (T_drive / T_resistive) - 1.0
    const torqueRatio = Math.round((driveTorqueNm / Math.max(0.01, totalResistiveTorqueNm)) * 100) / 100
    const torqueMargin = Math.round((torqueRatio - 1.0) * 100) / 100

    // ECSS Standard Requirement: Ratio >= 2.0x (Margin >= 1.0) for standard, or >= 3.0x for harness-dominated
    const minRequiredRatio = 2.0
    const marginCompliant = torqueRatio >= minRequiredRatio

    // 3. Deployment Kinetic Energy & Latch Impact Lock Velocity
    // Array moment of inertia around root hinge: I = (1/3) * m * L^2
    const inertiaAroundHingeKgM2 = (1 / 3) * wingMassKg * Math.pow(wingLengthM, 2)

    // Net accelerating torque average ~ 0.5 * (T_drive - T_resistive)
    const netTorqueNm = Math.max(0, driveTorqueNm - totalResistiveTorqueNm)
    // Work done over 90 degree deployment (pi/2 radians): W = T_net * theta
    const deployAngleRad = Math.PI / 2
    const workDoneJ = netTorqueNm * deployAngleRad

    // Lock-up angular velocity: omega = sqrt(2 * W / I)
    const lockupVelocityRadS = Math.sqrt((2 * Math.max(0, workDoneJ)) / Math.max(0.01, inertiaAroundHingeKgM2))
    const lockupVelocityDegS = Math.round((lockupVelocityRadS * 180 / Math.PI) * 10) / 10

    // End-of-travel latch impact kinetic energy (Joules)
    const latchImpactEnergyJ = Math.round((0.5 * inertiaAroundHingeKgM2 * Math.pow(lockupVelocityRadS, 2)) * 100) / 100

    // 4. Deployed Cantilever First Natural Frequency (Hz)
    // f1 ~ (3.52 / 2pi) * sqrt(EI / (mu * L^4))
    // Model CFRP spar stiffness: EI ~ 18,000 N*m2 per panel spar
    const linearMassDensityMu = wingMassKg / Math.max(0.5, wingLengthM)
    const eiSpar = 16500
    const firstNaturalFreqHz = Math.round(
      ((3.52 / (2 * Math.PI)) * Math.sqrt(eiSpar / (linearMassDensityMu * Math.pow(wingLengthM, 4)))) * 100
    ) / 100

    // ADCS Interaction Constraint: f1 must be > 0.25 Hz to prevent attitude control resonance
    const frequencyCompliant = firstNaturalFreqHz >= 0.25

    return {
      effectiveHarnessTorqueNm: effectiveHarnessTorqueNm.toFixed(2),
      totalResistiveTorqueNm,
      torqueRatio,
      torqueMargin,
      marginCompliant,
      inertiaAroundHingeKgM2: inertiaAroundHingeKgM2.toFixed(2),
      lockupVelocityDegS,
      latchImpactEnergyJ,
      firstNaturalFreqHz,
      frequencyCompliant,
    }
  }, [wingLengthM, wingMassKg, driveTorqueNm, harnessTorqueNm, frictionTorqueNm, latchTorqueNm, thermalState])

  const exportMechanismCSV = () => {
    const csv = `SPACECRAFT DEPLOYABLE MECHANISMS & TORQUE MARGIN SPEC
Preset System,${preset.name}
Mechanism Architecture,${preset.mechanismType}
Deployed Wing Length,${wingLengthM} meters
Total Wing / Array Mass,${wingMassKg} kg
Thermal Environment,${thermalState}
Hinge Spring Drive Torque,${driveTorqueNm} N*m
Bearing / Pin Friction Torque,${frictionTorqueNm} N*m
Harness Flexing Torque (Factored),${metrics.effectiveHarnessTorqueNm} N*m
Locking Latch Spring Resistance,${latchTorqueNm} N*m
Total Resistive Torque,${metrics.totalResistiveTorqueNm} N*m
ECSS Torque Ratio (T_drive / T_resistive),${metrics.torqueRatio}x (Req: >= 2.0x)
Net Torque Margin,${metrics.torqueMargin}
Torque Margin Verdict,${metrics.marginCompliant ? "ECSS COMPLIANT (CLEARED)" : "TORQUE DEFICIT RISK"}
Root Hinge Mass Moment of Inertia,${metrics.inertiaAroundHingeKgM2} kg*m2
Lock-Up Terminal Angular Velocity,${metrics.lockupVelocityDegS} deg/s
Latch Impact Kinetic Energy,${metrics.latchImpactEnergyJ} Joules
Deployed Cantilever 1st Natural Frequency,${metrics.firstNaturalFreqHz} Hz (Limit: >= 0.25 Hz)
ADCS Dynamic Interaction Verdict,${metrics.frequencyCompliant ? "STRUCTURALLY STIFF (NO ADCS OSCILLATION)" : "FLEXIBLE COUPLING HAZARD"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-mechanisms-torque-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Sliders className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              ECSS-E-ST-33-01C Mechanisms &amp; Solar Array Deployment Dynamics
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              DEPLOYMENT MECHANICS &amp; TORQUE MARGINS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model hinge spring actuation torque margins, cryogenic wire harness stiffness resistance, latch-up impact kinetic energy, and deployed cantilever modal frequencies ($f_1$).
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportMechanismCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT MECHANISMS SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(MECHANISM_PRESETS).map(([k, v]) => (
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
              Mechanism Actuation Sizing
            </div>

            {/* Geometry Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">WING LENGTH</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={wingLengthM}
                    onChange={(e) => setWingLengthM(Math.max(0.5, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">TOTAL WING MASS</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={wingMassKg}
                    onChange={(e) => setWingMassKg(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">kg</span>
                </div>
              </div>
            </div>

            {/* Drive Torque */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">HINGE DRIVE TORQUE (T_drive)</label>
                <span className="text-cyan-400 font-bold">{driveTorqueNm} N&middot;m</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={30.0}
                step={0.5}
                value={driveTorqueNm}
                onChange={(e) => setDriveTorqueNm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1.0 N&middot;m (Light)</span>
                <span>10.0 N&middot;m</span>
                <span>30.0 N&middot;m (Heavy)</span>
              </div>
            </div>

            {/* Resistive Torques */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Resistive Disturbance Torques (N&middot;m)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">HARNESS</span>
                  <input
                    type="number"
                    step={0.1}
                    value={harnessTorqueNm}
                    onChange={(e) => setHarnessTorqueNm(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">FRICTION</span>
                  <input
                    type="number"
                    step={0.05}
                    value={frictionTorqueNm}
                    onChange={(e) => setFrictionTorqueNm(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">LATCH</span>
                  <input
                    type="number"
                    step={0.05}
                    value={latchTorqueNm}
                    onChange={(e) => setLatchTorqueNm(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Thermal Environment */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">DEPLOYMENT THERMAL ENVIRONMENT</label>
              <select
                value={thermalState}
                onChange={(e) => setThermalState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Cold Soak (-120C)">Cold Soak (-120&deg;C - Stiff Harness x2.2)</option>
                <option value="Nominal (20C)">Nominal (20&deg;C Ambient)</option>
                <option value="Hot Soak (+80C)">Hot Soak (+80&deg;C - Compliant Harness)</option>
              </select>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">MECHANISM CLASS:</div>
              <p className="text-slate-300 font-mono text-[10px]">{preset.mechanismType}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.marginCompliant ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  TORQUE RATIO
                </div>
                <div className={`text-3xl font-black ${metrics.marginCompliant ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.torqueRatio}x
                </div>
                <div className="text-[10px] text-slate-500">ECSS Req: &ge; 2.0x (Margin: +{metrics.torqueMargin})</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3 text-purple-400" /> LATCH IMPACT ENERGY
                </div>
                <div className="text-3xl font-black text-white">{metrics.latchImpactEnergyJ} J</div>
                <div className="text-[10px] text-purple-400">Lockup Rate: {metrics.lockupVelocityDegS}&deg;/s</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> DEPLOYED 1ST FREQUENCY
                </div>
                <div className={`text-3xl font-black ${metrics.frequencyCompliant ? "text-cyan-400" : "text-amber-400"}`}>
                  {metrics.firstNaturalFreqHz} Hz
                </div>
                <div className="text-[10px] text-slate-500">ADCS Stiffness Limit: &ge; 0.25 Hz</div>
              </div>
            </div>

            {/* Mechanisms Margins & Deployment Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-cyan-400" />
                  ECSS-E-ST-33-01C Reliability &amp; Kinematics Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.marginCompliant && metrics.frequencyCompliant
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.marginCompliant && metrics.frequencyCompliant
                    ? "DEPLOYMENT RELIABILITY VERIFIED"
                    : "MECHANISM ANOMALY RISK"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">DEPLOYMENT MOMENTUM &amp; LATCH-UP SHOCK</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Under {thermalState} conditions, total resistance from bearing friction, cable harness flexing ({metrics.effectiveHarnessTorqueNm} N&middot;m), and latch springs reaches <strong className="text-white">{metrics.totalResistiveTorqueNm} N&middot;m</strong>.
                  The drive spring delivers <strong className="text-cyan-400">{driveTorqueNm} N&middot;m</strong>, securing an actuation torque ratio of <strong className={metrics.marginCompliant ? "text-emerald-400" : "text-red-400"}>{metrics.torqueRatio}x</strong>.
                  At full 90&deg; extension, the {wingMassKg} kg wing engages locking pins at <strong className="text-purple-400">{metrics.lockupVelocityDegS}&deg;/s</strong>, dissipating <strong className="text-white">{metrics.latchImpactEnergyJ} Joules</strong> of latch shock energy.
                  {!metrics.marginCompliant && (
                    <span className="text-red-400 block mt-1">
                      Torque margin deficit: Ratio falls below the mandatory 2.0x flight threshold. Wire harness stiffness at cold soak risks hung deployment or incomplete pin locking. Increase spring preload or install positive-drive motor actuation.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Resistive Friction &amp; Harness Torque</span>
                  <span className="text-white font-bold">{metrics.totalResistiveTorqueNm} N&middot;m</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">ECSS Torque Margin (T_drive / T_resistive - 1)</span>
                  <span className={`font-bold ${metrics.marginCompliant ? "text-emerald-400" : "text-red-400"}`}>
                    +{metrics.torqueMargin} (Ratio: {metrics.torqueRatio}x, Req: &ge; 2.0x)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Deployed Cantilever 1st Bending Mode</span>
                  <span className={`font-bold ${metrics.frequencyCompliant ? "text-cyan-400" : "text-amber-400"}`}>
                    {metrics.firstNaturalFreqHz} Hz (Threshold: &ge; 0.25 Hz)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Locking Latch Impact Energy</span>
                  <span className="text-purple-400 font-bold">{metrics.latchImpactEnergyJ} Joules</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Mechanism Qualification Clearance</span>
                  <span className={`font-bold ${metrics.marginCompliant ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.marginCompliant ? "PASS (CLEARED FOR FLIGHT DEPLOYMENT)" : "FAIL (INSUFFICIENT DRIVE MARGIN)"}
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
