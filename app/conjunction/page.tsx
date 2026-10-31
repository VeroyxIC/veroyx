"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ShieldAlert, 
  Orbit, 
  Activity, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Sliders, 
  Crosshair, 
  Zap, 
  Flame, 
  Radio 
} from "lucide-react"

interface ConjunctionPreset {
  name: string
  debrisType: string
  relativeVelocityKmS: number
  missDistanceM: number
  primaryHbrM: number
  secondaryHbrM: number
  sigmaRadialM: number
  sigmaInTrackM: number
  sigmaCrossTrackM: number
  orbitsBeforeTca: number
  description: string
}

const CONJUNCTION_PRESETS: Record<string, ConjunctionPreset> = {
  high_risk_slingshot: {
    name: "Cosmos 1408 Defunct Debris Fragment",
    debrisType: "Lethal Non-Trackable / Fragment Shrapnel",
    relativeVelocityKmS: 14.2,
    missDistanceM: 85,
    primaryHbrM: 2.2,
    secondaryHbrM: 0.8,
    sigmaRadialM: 18.0,
    sigmaInTrackM: 120.0,
    sigmaCrossTrackM: 45.0,
    orbitsBeforeTca: 1.5,
    description: "High-inclination near-head-on encounter crossing through orbital plane with low miss distance.",
  },
  fengyun_polar_crossing: {
    name: "Fengyun-1C Anti-Satellite Cloud Fragment",
    debrisType: "Hypersonic Orbital Debris",
    relativeVelocityKmS: 12.8,
    missDistanceM: 240,
    primaryHbrM: 2.5,
    secondaryHbrM: 1.2,
    sigmaRadialM: 35.0,
    sigmaInTrackM: 280.0,
    sigmaCrossTrackM: 70.0,
    orbitsBeforeTca: 2.0,
    description: "Polar orbit intersection with moderate miss distance but wide along-track covariance uncertainty.",
  },
  spent_rocket_body_close: {
    name: "SL-16 Spent Upper Stage Rocket Body",
    debrisType: "Intact Massive Derelict Rocket Body",
    relativeVelocityKmS: 9.8,
    missDistanceM: 520,
    primaryHbrM: 3.0,
    secondaryHbrM: 8.5, // 17m length rocket stage
    sigmaRadialM: 45.0,
    sigmaInTrackM: 450.0,
    sigmaCrossTrackM: 110.0,
    orbitsBeforeTca: 3.0,
    description: "Massive intact rocket body encounter with high radar cross-section and large combined hard-body radius.",
  },
}

export default function ConjunctionAssessmentPage() {
  const [selectedKey, setSelectedKey] = useState<string>("high_risk_slingshot")
  const [missDistanceM, setMissDistanceM] = useState<number>(85)
  const [primaryHbrM, setPrimaryHbrM] = useState<number>(2.2)
  const [secondaryHbrM, setSecondaryHbrM] = useState<number>(0.8)
  const [sigmaRadialM, setSigmaRadialM] = useState<number>(18.0)
  const [sigmaInTrackM, setSigmaInTrackM] = useState<number>(120.0)
  const [orbitsBeforeTca, setOrbitsBeforeTca] = useState<number>(1.5)
  const [targetClearanceKm, setTargetClearanceKm] = useState<number>(1.5)

  const activePreset = CONJUNCTION_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = CONJUNCTION_PRESETS[key]
    setSelectedKey(key)
    setMissDistanceM(p.missDistanceM)
    setPrimaryHbrM(p.primaryHbrM)
    setSecondaryHbrM(p.secondaryHbrM)
    setSigmaRadialM(p.sigmaRadialM)
    setSigmaInTrackM(p.sigmaInTrackM)
    setOrbitsBeforeTca(p.orbitsBeforeTca)
  }

  // NASA CARA / ESA Collision Probability & CAM Optimization
  const metrics = useMemo(() => {
    // 1. Combined Hard-Body Radius (HBR)
    const combinedHbrM = Math.round((primaryHbrM + secondaryHbrM) * 10) / 10

    // 2. 2D B-Plane Encounter Foster Collision Probability (Pc)
    // Sized by combined 2D standard deviation: sigma_B = sqrt(sigma_radial^2 + sigma_intrack^2)
    const sigmaBM = Math.sqrt(Math.pow(sigmaRadialM, 2) + Math.pow(sigmaInTrackM, 2))
    const u = missDistanceM / Math.max(1, sigmaBM)
    const hbrRatio = combinedHbrM / Math.max(1, sigmaBM)

    // Foster integral approximation for small HBR / sigma ratio:
    // Pc approx (HBR^2 / (2 * sigma_radial * sigma_intrack)) * exp(-0.5 * (d_miss / sigma)^2)
    const pcRaw = (Math.pow(combinedHbrM, 2) / (2 * sigmaRadialM * sigmaInTrackM)) * Math.exp(-0.5 * Math.pow(u, 2))
    const collisionProbability = Math.min(0.999, Math.max(1e-9, pcRaw))

    // Actionable Threshold Check: NASA CARA standard threshold = 1.0e-4 (1 in 10,000)
    const actionableThreshold = 1.0e-4
    const isManeuverRequired = collisionProbability >= actionableThreshold

    // 3. Collision Avoidance Maneuver (CAM) Delta-V Optimization
    // In-track tangential burn Delta-V: Delta_s = 3 * pi * Delta_a * N_orbits
    // Delta_a = 2 * (v_orb / mu) * Delta_V_tangential * a^2 => Delta_V ~ (Delta_clearance) / (6 * pi * N_orbits)
    // In LEO: ~0.1 m/s tangential burn yields ~2.5 km of along-track separation per orbit
    const separationNeededKm = Math.max(0.2, targetClearanceKm - (missDistanceM / 1000))
    const deltaVRequiredMs = Math.round(((separationNeededKm / (2.8 * Math.max(0.5, orbitsBeforeTca))) * 100)) / 100

    // Propellant mass penalty for 450 kg spacecraft bus (Isp ~ 220s)
    const ispSec = 220
    const g0 = 9.80665
    const busMassKg = 450
    const propellantMassKg = Math.round((busMassKg * (1 - Math.exp(-deltaVRequiredMs / (ispSec * g0)))) * 1000) / 1000

    // Post-maneuver residual collision probability
    const postCamMissDistanceM = targetClearanceKm * 1000
    const postCamU = postCamMissDistanceM / Math.max(1, sigmaBM)
    const postCamPc = (Math.pow(combinedHbrM, 2) / (2 * sigmaRadialM * sigmaInTrackM)) * Math.exp(-0.5 * Math.pow(postCamU, 2))

    return {
      combinedHbrM,
      collisionProbability,
      pcScientific: collisionProbability.toExponential(2),
      isManeuverRequired,
      deltaVRequiredMs,
      propellantMassKg,
      postCamPcScientific: Math.max(1e-12, postCamPc).toExponential(2),
    }
  }, [missDistanceM, primaryHbrM, secondaryHbrM, sigmaRadialM, sigmaInTrackM, orbitsBeforeTca, targetClearanceKm])

  const exportConjunctionCSV = () => {
    const csv = `SPACECRAFT CONJUNCTION ASSESSMENT & CAM SIZING DOSSIER
Conjunction Profile,${activePreset.name}
Secondary Object Classification,${activePreset.debrisType}
Relative Encounter Velocity,${activePreset.relativeVelocityKmS} km/s
Nominal Miss Distance at TCA,${missDistanceM} meters
Primary Spacecraft HBR,${primaryHbrM} meters
Secondary Debris HBR,${secondaryHbrM} meters
Combined Hard-Body Radius (HBR),${metrics.combinedHbrM} meters
1-Sigma Radial Position Covariance,${sigmaRadialM} meters
1-Sigma In-Track Position Covariance,${sigmaInTrackM} meters
Estimated Collision Probability (Pc),${metrics.pcScientific}
Actionable Maneuver Threshold,1.00e-4 (NASA CARA Standard)
Actionable Status Verdict,${metrics.isManeuverRequired ? "ACTIONABLE RISK (MANDATORY CAM REQUIRED)" : "MONITOR ONLY (BELOW THRESHOLD)"}
Target Clearance Post-CAM,${targetClearanceKm} km
Maneuver Execution Lead Time,${orbitsBeforeTca} orbits before TCA
Optimized In-Track CAM Delta-V,${metrics.deltaVRequiredMs} m/s
Estimated CAM Propellant Consumption,${metrics.propellantMassKg} kg (Isp = 220s)
Post-Maneuver Residual Collision Probability,${metrics.postCamPcScientific}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-conjunction-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              NASA CARA &amp; 18th SDS Conjunction Assessment &amp; CAM Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              CONJUNCTION &amp; COLLISION AVOIDANCE
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model 2D B-plane covariance ellipsoids, Foster collision probabilities ($P_c$), hard-body screening spheres, and optimized collision avoidance maneuver (CAM) $\Delta V$ burns.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportConjunctionCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT CDM SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(CONJUNCTION_PRESETS).map(([k, v]) => (
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
              <div className="text-[10px] text-slate-500">{v.missDistanceM}m Miss · {v.relativeVelocityKmS} km/s Rel</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              {metrics.isManeuverRequired ? (
                <ShieldAlert className="w-3 h-3 text-rose-400" />
              ) : (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              )}
              COLLISION PROBABILITY (PC)
            </div>
            <div className={`text-3xl font-black ${metrics.isManeuverRequired ? "text-rose-400" : "text-emerald-400"}`}>
              {metrics.pcScientific}
            </div>
            <div className="text-[10px] text-slate-400">CARA Threshold: 1.00e-4 (1:10,000)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-amber-400" /> MISS DISTANCE
            </div>
            <div className="text-3xl font-black text-amber-400">{missDistanceM} m</div>
            <div className="text-[10px] text-slate-400">Combined HBR: {metrics.combinedHbrM} m</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Flame className="w-3 h-3 text-cyan-400" /> OPTIMIZED CAM DELTA-V
            </div>
            <div className="text-3xl font-black text-cyan-400">{metrics.deltaVRequiredMs} m/s</div>
            <div className="text-[10px] text-slate-400">{metrics.propellantMassKg} kg propellant burn</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> RESIDUAL POST-CAM PC
            </div>
            <div className="text-3xl font-black text-emerald-400">{metrics.postCamPcScientific}</div>
            <div className="text-[10px] text-slate-400">Clearance: {targetClearanceKm} km</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              CDM Close Approach Geometry
            </div>

            {/* Miss Distance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">NOMINAL MISS DISTANCE</label>
                <span className="text-amber-400 font-bold">{missDistanceM} METERS</span>
              </div>
              <input
                type="range"
                min={15}
                max={1500}
                step={15}
                value={missDistanceM}
                onChange={(e) => setMissDistanceM(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>15 m (Collision)</span>
                <span>250 m</span>
                <span>1500 m</span>
              </div>
            </div>

            {/* HBR Dimensions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">PRIMARY HBR (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={primaryHbrM}
                  onChange={(e) => setPrimaryHbrM(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DEBRIS HBR (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={secondaryHbrM}
                  onChange={(e) => setSecondaryHbrM(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Covariance Sigmas */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SIGMA RADIAL (m)</label>
                <input
                  type="number"
                  step={5}
                  value={sigmaRadialM}
                  onChange={(e) => setSigmaRadialM(Math.max(2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SIGMA IN-TRACK (m)</label>
                <input
                  type="number"
                  step={20}
                  value={sigmaInTrackM}
                  onChange={(e) => setSigmaInTrackM(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Maneuver Sizing Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">BURN LEAD TIME</label>
                <span className="text-cyan-400 font-bold">{orbitsBeforeTca} ORBITS</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.5}
                value={orbitsBeforeTca}
                onChange={(e) => setOrbitsBeforeTca(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Earlier burns leverage orbital phasing to reduce Delta-V</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">TARGET SEPARATION POST-CAM</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={0.25}
                  value={targetClearanceKm}
                  onChange={(e) => setTargetClearanceKm(Math.max(0.5, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">km</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">B-PLANE DYNAMICS:</strong>
              Collision probability integrates relative positional error covariance across the combined hard-body radius ($R_1 + R_2$). In-track burns maximize clearance with minimal thrust.
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Actionable Risk Assessment Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Conjunction Data Message (CDM) Risk Verdict
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.isManeuverRequired
                    ? "bg-rose-950 border-rose-500/40 text-rose-300"
                    : "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                }`}>
                  {metrics.isManeuverRequired ? "ACTIONABLE RISK: MANDATORY CAM" : "BELOW ACTION THRESHOLD (MONITOR)"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  Encounter geometry predicts a closest approach miss distance of <strong className="text-white">{missDistanceM} meters</strong> at a relative velocity of <strong className="text-white">{activePreset.relativeVelocityKmS} km/s</strong>.
                  With a combined hard-body radius of <strong className="text-white">{metrics.combinedHbrM} meters</strong>, the 2D B-plane Foster collision probability evaluates to <strong className={metrics.isManeuverRequired ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{metrics.pcScientific}</strong>.
                </p>
                <p>
                  Executing an in-track CAM <strong className="text-white">{orbitsBeforeTca} orbits prior to TCA</strong> requires a retrograde/posigrade impulse of <strong className="text-cyan-400">{metrics.deltaVRequiredMs} m/s</strong>, burning <strong className="text-white">{metrics.propellantMassKg} kg</strong> of propellant.
                  This maneuver establishes <strong className="text-white">{targetClearanceKm} km</strong> of along-track orbital separation, driving residual post-CAM collision risk down to <strong className="text-emerald-400 font-bold">{metrics.postCamPcScientific}</strong>.
                  {metrics.isManeuverRequired ? (
                    <span className="text-rose-400 block mt-1 font-bold">
                      Mandatory action warning: Collision probability exceeds the 1.00e-4 threshold. Authorize thruster firing command sequence to execute CAM.
                    </span>
                  ) : (
                    <span className="text-emerald-400 block mt-1">
                      Conjunction monitored: Risk is below the actionable threshold. No avoidance maneuver required at current tracking cycle.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Relative Collision Velocity at TCA</span>
                  <span className="text-white font-bold">{activePreset.relativeVelocityKmS} km/s (Hypervelocity)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">18th SDS CDM Screening Threshold</span>
                  <span className="text-white font-bold">1.00e-4 (Actionable Limit)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Optimized CAM Thrust Orientation</span>
                  <span className="text-cyan-400 font-bold">&plusmn;Tangential In-Track Impulse</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Flight Safety Clearance Status</span>
                  <span className={`font-bold ${metrics.isManeuverRequired ? "text-rose-400" : "text-emerald-400"}`}>
                    {metrics.isManeuverRequired ? "CAM SCHEDULED (FLIGHT COLLISION PREVENTED)" : "SAFE FLY-BY (PASSIVE TRACKING)"}
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
                <Link href="/prop-tank" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/prop-tank</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mmod" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mmod (Debris)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/visualizer" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/visualizer (3D)</span>
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
