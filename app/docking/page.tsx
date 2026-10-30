"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Anchor, 
  Layers, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  Activity,
  Fuel,
  Maximize2,
  Minimize2
} from "lucide-react"

interface DockingPreset {
  name: string
  classType: string
  servicerMassKg: number
  clientMassKg: number
  dockingType: "NASA IDSS (Androgynous Low Impact)" | "Probe-and-Cone (Russian/Legacy)" | "Magnetic / Robotic Grapple Fixture" | "Berthing Arm Capture (CBM)"
  contactVelocityMs: number
  lateralOffsetCm: number
  angularMisalignmentDeg: number
  damperMaxEnergyJ: number
  fluidTransferKg: number
  description: string
}

const DOCKING_PRESETS: Record<string, DockingPreset> = {
  commercial_life_extension: {
    name: "GEO Commercial Mission Extension Vehicle (MEV)",
    classType: "Sovereign / Commercial Life Extension",
    servicerMassKg: 2200,
    clientMassKg: 4500,
    dockingType: "Probe-and-Cone (Russian/Legacy)",
    contactVelocityMs: 0.05,
    lateralOffsetCm: 3.5,
    angularMisalignmentDeg: 1.2,
    damperMaxEnergyJ: 120,
    fluidTransferKg: 0, // Dock & push (propulsion assist)
    description: "Inserts a mechanical probe into the client liquid apogee engine nozzle to clamp and provide attitude control.",
  },
  orbital_depot_refueling: {
    name: "LEO Mega-Constellation In-Orbit Refueler",
    classType: "Fluid Transfer Depot",
    servicerMassKg: 1800,
    clientMassKg: 850,
    dockingType: "NASA IDSS (Androgynous Low Impact)",
    contactVelocityMs: 0.08,
    lateralOffsetCm: 4.0,
    angularMisalignmentDeg: 1.8,
    damperMaxEnergyJ: 85,
    fluidTransferKg: 180, // Hydrazine transfer
    description: "Low-impact androgynous soft capture ring engaging fluid quick-disconnect couplers for automated propellant resupply.",
  },
  active_debris_grapple: {
    name: "Active Debris Removal (ADR) Magnetic Tug",
    classType: "Non-Cooperative Capture",
    servicerMassKg: 650,
    clientMassKg: 1200,
    dockingType: "Magnetic / Robotic Grapple Fixture",
    contactVelocityMs: 0.03,
    lateralOffsetCm: 6.5,
    angularMisalignmentDeg: 2.5,
    damperMaxEnergyJ: 45,
    fluidTransferKg: 0,
    description: "Magnetic capture of uncooperative tumbling debris target equipped with steel launch interface ring.",
  },
}

export default function DockingSimulatorPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("commercial_life_extension")
  const [servicerMassKg, setServicerMassKg] = useState<number>(2200)
  const [clientMassKg, setClientMassKg] = useState<number>(4500)
  const [contactVelocityMs, setContactVelocityMs] = useState<number>(0.05)
  const [lateralOffsetCm, setLateralOffsetCm] = useState<number>(3.5)
  const [angularMisalignmentDeg, setAngularMisalignmentDeg] = useState<number>(1.2)
  const [propellantTransferKg, setPropellantTransferKg] = useState<number>(180)

  const preset = DOCKING_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = DOCKING_PRESETS[key]
    setSelectedPresetKey(key)
    setServicerMassKg(p.servicerMassKg)
    setClientMassKg(p.clientMassKg)
    setContactVelocityMs(p.contactVelocityMs)
    setLateralOffsetCm(p.lateralOffsetCm)
    setAngularMisalignmentDeg(p.angularMisalignmentDeg)
    setPropellantTransferKg(p.fluidTransferKg)
  }

  // IDSS / ISO 24330 Contact Mechanics & Kinematics Calculations
  const metrics = useMemo(() => {
    // 1. Reduced Effective Mass of the Two-Body System (kg)
    // m_eff = (m1 * m2) / (m1 + m2)
    const effectiveMassKg = Math.round(((servicerMassKg * clientMassKg) / (servicerMassKg + clientMassKg)) * 10) / 10

    // 2. Linear Contact Kinetic Energy at Initial Touchdown (Joules)
    // E_k = 0.5 * m_eff * v_contact^2
    const contactKineticEnergyJ = Math.round((0.5 * effectiveMassKg * Math.pow(contactVelocityMs, 2)) * 10) / 10

    // Energy dissipation margin against damper rating
    const damperCapacityJ = preset.damperMaxEnergyJ
    const damperMarginPct = Math.round(((damperCapacityJ - contactKineticEnergyJ) / damperCapacityJ) * 100)
    const energyWithinLimits = contactKineticEnergyJ <= damperCapacityJ

    // 3. IDSS Capture Envelope Tolerances:
    // Max allowable lateral offset ~ 10.0 cm, Max allowable angular misalignment ~ 3.5 deg
    const maxAllowableLateralCm = 8.0
    const maxAllowableAngularDeg = 3.0
    const lateralPassed = lateralOffsetCm <= maxAllowableLateralCm
    const angularPassed = angularMisalignmentDeg <= maxAllowableAngularDeg
    const velocityPassed = contactVelocityMs <= 0.12 // 0.12 m/s IDSS maximum contact rate
    const captureEnvelopeCleared = energyWithinLimits && lateralPassed && angularPassed && velocityPassed

    // 4. Hard Capture Preload Clamp Force (kN)
    // High-pressure interface seal compression requirement (typically 20 - 45 kN)
    const sealDiameterM = 0.8 // 800 mm IDSS ring
    const sealCircumferenceM = Math.PI * sealDiameterM
    const sealCompressionForcePerMeterKn = 12 // 12 kN/m of silicone seal
    const reqPreloadClampKn = Math.round(sealCircumferenceM * sealCompressionForcePerMeterKn)

    // 5. Propellant Transfer Duration (Minutes)
    // Flow rate ~ 0.25 kg/s under 3-bar delta-P
    const flowRateKgSec = 0.25
    const transferDurationMin = propellantTransferKg > 0
      ? Math.round((propellantTransferKg / flowRateKgSec / 60) * 10) / 10
      : 0

    return {
      effectiveMassKg,
      contactKineticEnergyJ,
      damperCapacityJ,
      damperMarginPct,
      energyWithinLimits,
      lateralPassed,
      angularPassed,
      velocityPassed,
      captureEnvelopeCleared,
      reqPreloadClampKn,
      transferDurationMin,
    }
  }, [servicerMassKg, clientMassKg, contactVelocityMs, lateralOffsetCm, angularMisalignmentDeg, propellantTransferKg, preset])

  const exportDockingCSV = () => {
    const csv = `SPACECRAFT DOCKING MECHANICS & CONTACT DYNAMICS SPEC
Preset Architecture,${preset.name}
Class,${preset.classType}
Docking System Standard,${preset.dockingType}
Servicer Vehicle Mass,${servicerMassKg} kg
Client Target Mass,${clientMassKg} kg
Two-Body Reduced Effective Mass,${metrics.effectiveMassKg} kg
Axial Contact Closure Velocity,${contactVelocityMs} m/s
Lateral Contact Misalignment Offset,${lateralOffsetCm} cm
Angular Alignment Error,${angularMisalignmentDeg} deg
Touchdown Kinetic Energy,${metrics.contactKineticEnergyJ} Joules
Soft Capture Damper Energy Rating,${metrics.damperCapacityJ} Joules (${metrics.damperMarginPct}% Margin)
Alignment Envelope Verdict,${metrics.captureEnvelopeCleared ? "SOFT CAPTURE CLEARED (NOMINAL)" : "KINETIC BOUNDARY VIOLATION"}
Required Hard Capture Clamp Preload,${metrics.reqPreloadClampKn} kN
Planned Propellant Resupply Load,${propellantTransferKg} kg
Fluid Transfer Operation Duration,${metrics.transferDurationMin} minutes`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-docking-dynamics-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Anchor className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA IDSS / ISO 24330 In-Orbit Docking &amp; Contact Mechanics Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              DOCKING &amp; CONTACT DYNAMICS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model two-body impact kinetic energy dissipation, soft capture attenuation envelopes, hard latch preload clamping forces, and in-orbit propellant transfer rates.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportDockingCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT DOCKING SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(DOCKING_PRESETS).map(([k, v]) => (
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
              Capture Kinematic Parameters
            </div>

            {/* Vehicle Masses */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SERVICER MASS</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={servicerMassKg}
                    onChange={(e) => setServicerMassKg(Math.max(10, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">kg</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">CLIENT MASS</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={clientMassKg}
                    onChange={(e) => setClientMassKg(Math.max(10, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">kg</span>
                </div>
              </div>
            </div>

            {/* Closure Velocity */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400">AXIAL CLOSURE VELOCITY</label>
                <span className="text-cyan-400 font-bold">{contactVelocityMs} M/S</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.20}
                step={0.01}
                value={contactVelocityMs}
                onChange={(e) => setContactVelocityMs(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.01 m/s (Crawl)</span>
                <span>0.05 m/s (Standard IDSS)</span>
                <span>0.20 m/s (Critical)</span>
              </div>
            </div>

            {/* Misalignment Errors */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 uppercase">LATERAL OFFSET</span>
                  <span className="text-purple-400 font-bold">{lateralOffsetCm} cm</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={12.0}
                  step={0.5}
                  value={lateralOffsetCm}
                  onChange={(e) => setLateralOffsetCm(Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
                <span className="text-[9px] text-slate-500 block">Max Limit: 8.0 cm</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 uppercase">ANGULAR ERROR</span>
                  <span className="text-purple-400 font-bold">{angularMisalignmentDeg}&deg;</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={5.0}
                  step={0.1}
                  value={angularMisalignmentDeg}
                  onChange={(e) => setAngularMisalignmentDeg(Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
                <span className="text-[9px] text-slate-500 block">Max Limit: 3.0&deg;</span>
              </div>
            </div>

            {/* Propellant Transfer Sizing */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">PROPELLANT TRANSFER VOLUME</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={propellantTransferKg}
                  onChange={(e) => setPropellantTransferKg(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Mechanism Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">MECHANISM TYPE:</div>
              <p className="text-slate-300 font-bold font-mono">{preset.dockingType}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> CONTACT KINETIC ENERGY
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.contactKineticEnergyJ} J</div>
                <div className="text-[10px] text-slate-500">Damper Rating: {metrics.damperCapacityJ} J</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Anchor className="w-3 h-3 text-purple-400" /> HARD PRELOAD CLAMP
                </div>
                <div className="text-3xl font-black text-white">{metrics.reqPreloadClampKn} kN</div>
                <div className="text-[10px] text-purple-400">Vacuum Seal Preload</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.captureEnvelopeCleared ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  SOFT CAPTURE STATUS
                </div>
                <div className={`text-3xl font-black ${metrics.captureEnvelopeCleared ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.captureEnvelopeCleared ? "CLEARED" : "OUT OF LIMITS"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {metrics.energyWithinLimits ? `${metrics.damperMarginPct}% Damper Margin` : "Damper Bottom-Out Risk"}
                </div>
              </div>
            </div>

            {/* Docking & Contact Kinematics Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  IDSS Capture Corridor &amp; Preload Envelope
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.captureEnvelopeCleared
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.captureEnvelopeCleared ? "MECHANICAL CAPTURE APPROVED" : "KINETIC BOUNDARY EXCEEDED"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">CONTACT MOMENTUM ANALYSIS</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  The two-body system has a reduced effective mass of <strong className="text-white">{metrics.effectiveMassKg} kg</strong>. At a closure rate of <strong className="text-white">{contactVelocityMs} m/s</strong>, contact imparts <strong className="text-cyan-400">{metrics.contactKineticEnergyJ} Joules</strong> of kinetic energy into the soft-capture attenuation ring.
                  {propellantTransferKg > 0 && (
                    <span> Following structural hard latching, transfer of {propellantTransferKg} kg of propellant completes in <strong className="text-purple-400">{metrics.transferDurationMin} minutes</strong> at nominal ullage pressure.</span>
                  )}
                  {!metrics.captureEnvelopeCleared && (
                    <span className="text-red-400 block mt-1">
                      Capture limit violation: Approach vector exceeds permissible lateral/angular tolerances or damper energy dissipation limits. Risk of rebound or mechanism latch shearing.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Reduced Dynamic Mass (m_eff)</span>
                  <span className="text-white font-bold">{metrics.effectiveMassKg} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Axial Closure Velocity Clearance</span>
                  <span className={`font-bold ${metrics.velocityPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {contactVelocityMs} m/s (Limit: &le; 0.12 m/s)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Lateral Contact Misalignment Offset</span>
                  <span className={`font-bold ${metrics.lateralPassed ? "text-cyan-400" : "text-red-400"}`}>
                    {lateralOffsetCm} cm (Limit: &le; 8.0 cm)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Damper Kinetic Energy Absorption Headroom</span>
                  <span className={`font-bold ${metrics.energyWithinLimits ? "text-purple-400" : "text-red-400"}`}>
                    {metrics.damperMarginPct}% Margin ({metrics.contactKineticEnergyJ} J of {metrics.damperCapacityJ} J rating)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Fluid Resupply Transfer Duration</span>
                  <span className="text-slate-200 font-bold">{metrics.transferDurationMin} minutes ({propellantTransferKg} kg)</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
