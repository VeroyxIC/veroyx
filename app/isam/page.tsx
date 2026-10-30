"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Crosshair, 
  Orbit, 
  ShieldCheck, 
  AlertTriangle, 
  Gauge, 
  Download, 
  ArrowRight, 
  Zap, 
  Layers, 
  Compass, 
  Wrench,
  Radio
} from "lucide-react"

interface IsamPreset {
  name: string
  operator: string
  regime: "LEO" | "GEO"
  targetType: string
  mechanism: string
  targetAltitudeKm: number
  chaserMassKg: number
  description: string
}

const ISAM_PRESETS: Record<string, IsamPreset> = {
  mev_geo: {
    name: "Mission Extension Vehicle (MEV)",
    operator: "Northrop Grumman / SpaceLogistics",
    regime: "GEO",
    targetType: "Commercial CommSat (Intelsat Class)",
    mechanism: "Liquid Apogee Engine (LAE) Nozzle Probe Clamp",
    targetAltitudeKm: 35786,
    chaserMassKg: 2300,
    description: "Attaches directly to client satellite liquid apogee motor nozzle to provide station-keeping for 5+ years.",
  },
  adras_j: {
    name: "ADRAS-J Orbital Inspector",
    operator: "Astroscale / JAXA",
    regime: "LEO",
    targetType: "Spent Rocket Upper Stage (H-IIA R/B)",
    mechanism: "Autonomous Relative Navigation (Visual/LIDAR)",
    targetAltitudeKm: 600,
    chaserMassKg: 150,
    description: "Proximity operations and 360-degree flyaround inspection of non-cooperative orbital rocket debris.",
  },
  clearspace1: {
    name: "ClearSpace-1 Active Debris Removal",
    operator: "ClearSpace / ESA",
    regime: "LEO",
    targetType: "VESPA Upper Stage Adapter Debris",
    mechanism: "Quad-Robotic Capture Tentacle Arms",
    targetAltitudeKm: 500,
    chaserMassKg: 400,
    description: "Robotic four-arm capture mechanism designed to grapple uncooperative tumbling space debris for controlled de-orbit.",
  },
  osam1: {
    name: "On-Orbit Servicing & Refueling (OSAM-1)",
    operator: "NASA Goddard",
    regime: "LEO",
    targetType: "Landsat-7 Legacy Observation Satellite",
    mechanism: "Robotic Arm + Hydrazine Transfer Quick-Disconnect",
    targetAltitudeKm: 705,
    chaserMassKg: 2100,
    description: "Autonomous cutting of thermal blankets, wire snipping, and pressurized monopropellant transfer.",
  },
}

export default function ISAMSimulatorPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("mev_geo")
  const [approachVector, setApproachVector] = useState<"V-BAR" | "R-BAR">("V-BAR")
  const [standoffDistanceM, setStandoffDistanceM] = useState<number>(100)
  const [chaserMassKg, setChaserMassKg] = useState<number>(2300)
  const [targetTumbleRateDps, setTargetTumbleRateDps] = useState<number>(1.5)
  const [inspectionOrbits, setInspectionOrbits] = useState<number>(3)

  const preset = ISAM_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = ISAM_PRESETS[key]
    setSelectedPresetKey(key)
    setChaserMassKg(p.chaserMassKg)
  }

  // Hill's / Clohessy-Wiltshire Dynamics & Delta-V Computation
  const metrics = useMemo(() => {
    const mu = 398600.4418
    const rOrbit = 6378.1 + preset.targetAltitudeKm
    const meanMotion = Math.sqrt(mu / Math.pow(rOrbit, 3)) // rad/s
    const periodSec = (2 * Math.PI) / meanMotion
    const periodMin = Math.round(periodSec / 60)

    // Delta-V components
    // 1. Phasing & Co-elliptic drift to Hold Point 1 (1000m)
    const deltaVPhasing = preset.regime === "GEO" ? 18.0 : 35.0

    // 2. Proximity approach to current standoff distance
    const approachDist = Math.max(10, standoffDistanceM)
    const deltaVApproach = (approachDist / 1000) * (approachVector === "R-BAR" ? 12.5 : 8.0)

    // 3. Inspection fly-around (Circumnavigation along CW ellipse)
    // Relative velocity in CW ellipse is proportional to standoff * mean motion
    const relVelocityKms = (standoffDistanceM / 1000) * meanMotion
    const deltaVInspection = Math.round(inspectionOrbits * (relVelocityKms * 1000 * 4) * 10) / 10

    // 4. Mating & Tumble Synchronization Delta-V
    // Overcoming client tumble angular rate
    const deltaVSync = Math.round(targetTumbleRateDps * 3.2 * 10) / 10

    // Total Mission Proximity Delta-V
    const totalDeltaVMs = Math.round((deltaVPhasing + deltaVApproach + deltaVInspection + deltaVSync) * 10) / 10

    // Propellant mass required (assuming bipropellant 310s Isp)
    const ispSec = 310
    const g0 = 9.80665
    const massRatio = Math.exp(totalDeltaVMs / (ispSec * g0))
    const propellantReqKg = Math.round((chaserMassKg * (massRatio - 1)) * 10) / 10

    // Gate Status
    let gatePhase = "FAR-RANGE DRIFT (BEYOND 1000M)"
    if (standoffDistanceM <= 10) {
      gatePhase = "TERMINAL MATING GATE (<10M)"
    } else if (standoffDistanceM <= 100) {
      gatePhase = "HOLD POINT 2 (FINAL INSPECTION)"
    } else if (standoffDistanceM <= 1000) {
      gatePhase = "HOLD POINT 1 (PASSIVE SAFETY CORRIDOR)"
    }

    return {
      periodMin,
      totalDeltaVMs,
      deltaVPhasing,
      deltaVApproach: deltaVApproach.toFixed(1),
      deltaVInspection,
      deltaVSync,
      propellantReqKg,
      gatePhase,
      isTumbleCritical: targetTumbleRateDps > 3.0,
    }
  }, [preset, approachVector, standoffDistanceM, chaserMassKg, targetTumbleRateDps, inspectionOrbits])

  const exportIsamCSV = () => {
    const csv = `Parameter,Value,Unit
Architecture,${preset.name},
Operator,${preset.operator},
Orbital Regime,${preset.regime},
Target Altitude,${preset.targetAltitudeKm},km
Approach Vector,${approachVector},
Current Standoff Distance,${standoffDistanceM},m
Current Gate,${metrics.gatePhase},
Target Tumble Rate,${targetTumbleRateDps},deg/s
Chaser Mass,${chaserMassKg},kg
Total Proximity Delta-V,${metrics.totalDeltaVMs},m/s
Phasing Delta-V,${metrics.deltaVPhasing},m/s
Inspection Delta-V,${metrics.deltaVInspection},m/s
Synchronization Delta-V,${metrics.deltaVSync},m/s
Required Propellant Mass,${metrics.propellantReqKg},kg,`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-isam-rpo-trade.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Crosshair className="w-3.5 h-3.5 animate-pulse" />
              Clohessy-Wiltshire Dynamics &amp; Proximity Operations
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ISAM &amp; RENDEZVOUS (RPO) SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model in-orbit servicing, rendezvous and proximity operations (RPO), V-bar vs. R-bar approach trajectories, hold gates, and multi-burn delta-V budgets.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportIsamCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT RPO PROFILE
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(ISAM_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedPresetKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {v.name} ({v.regime})
            </button>
          ))}
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Controls Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Approach &amp; Target Parameters
            </div>

            {/* Approach Vector Selection */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">APPROACH CORRIDOR VECTOR</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setApproachVector("V-BAR")}
                  className={`py-2 rounded-lg border text-center transition-all ${
                    approachVector === "V-BAR"
                      ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  +V-BAR (Along Velocity)
                </button>
                <button
                  onClick={() => setApproachVector("R-BAR")}
                  className={`py-2 rounded-lg border text-center transition-all ${
                    approachVector === "R-BAR"
                      ? "bg-purple-950 border-purple-500/50 text-purple-300 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  -R-BAR (Radial Earth-Facing)
                </button>
              </div>
            </div>

            {/* Standoff Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">STANDOFF RANGE</label>
                <span className="text-cyan-400 font-bold">{standoffDistanceM} METERS</span>
              </div>
              <input
                type="range"
                min={2}
                max={1500}
                step={2}
                value={standoffDistanceM}
                onChange={(e) => setStandoffDistanceM(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>10m (Mating)</span>
                <span>100m (Hold 2)</span>
                <span>1000m (Hold 1)</span>
              </div>
            </div>

            {/* Target Tumble Rate Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">TARGET TUMBLE ANGULAR RATE</label>
                <span className="text-amber-400 font-bold">{targetTumbleRateDps}&deg;/s</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={0.1}
                value={targetTumbleRateDps}
                onChange={(e) => setTargetTumbleRateDps(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0&deg;/s (3-Axis Stabilized)</span>
                <span>3&deg;/s</span>
                <span>6&deg;/s (Violent Tumble)</span>
              </div>
            </div>

            {/* Inspection Circumnavigations */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">INSPECTION FLYAROUND ORBITS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={inspectionOrbits}
                  onChange={(e) => setInspectionOrbits(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">REVOLUTIONS</span>
              </div>
            </div>

            {/* Mechanism & Heritage Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">MATING MECHANISM:</div>
              <p className="text-slate-300 font-bold font-mono">{preset.mechanism}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" /> TOTAL RPO DELTA-V
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.totalDeltaVMs} m/s</div>
                <div className="text-[10px] text-slate-500">Full Approach &amp; Inspection</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-purple-400" /> PROPELLANT DEMAND
                </div>
                <div className="text-3xl font-black text-white">{metrics.propellantReqKg} kg</div>
                <div className="text-[10px] text-purple-400">Bipropellant (Isp 310s)</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Orbit className="w-3 h-3 text-emerald-400" /> ORBITAL PERIOD
                </div>
                <div className="text-3xl font-black text-emerald-400">{metrics.periodMin} min</div>
                <div className="text-[10px] text-slate-500">Altitude: {preset.targetAltitudeKm.toLocaleString()} km</div>
              </div>
            </div>

            {/* Hold Gate & Safety Corridor Status */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  Rendezvous Safety Hold Gate Status
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  {approachVector} PASSIVE SAFETY CORRIDOR
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">ACTIVE OPERATION CORRIDOR</div>
                <div className="text-base font-bold text-white">{metrics.gatePhase}</div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Target client is at {standoffDistanceM}m standoff. If thruster telemetry drops or control authority degrades, the chaser naturally drifts onto a safe, non-intersecting CW relative ellipse without risk of hull impact.
                </div>
              </div>

              {/* Delta-V Budget Breakdown Table */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Phasing &amp; Co-Elliptic Drift</span>
                  <span className="text-white font-bold">{metrics.deltaVPhasing} m/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Proximity Vector Closure ({approachVector})</span>
                  <span className="text-cyan-400 font-bold">{metrics.deltaVApproach} m/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Circumnavigation Inspection ({inspectionOrbits} Orbits)</span>
                  <span className="text-purple-400 font-bold">{metrics.deltaVInspection} m/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Tumble Rate Match &amp; Mating Sync</span>
                  <span className={`font-bold ${metrics.isTumbleCritical ? "text-amber-400" : "text-emerald-400"}`}>
                    {metrics.deltaVSync} m/s {metrics.isTumbleCritical && "(ELEVATED)"}
                  </span>
                </div>
                <div className="flex justify-between py-2 bg-slate-950/80 px-3 rounded-lg border border-slate-800 font-bold">
                  <span className="text-white">NET PROXIMITY DELTA-V BUDGET</span>
                  <span className="text-cyan-400 text-sm">{metrics.totalDeltaVMs} m/s</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
