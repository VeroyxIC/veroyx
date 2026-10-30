"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Compass, 
  RotateCw, 
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

interface MagneticsPreset {
  name: string
  classType: string
  altitudeKm: number
  inclinationDeg: number
  chassisResidualDipoleAm2: number
  mtqMaxDipoleAm2: number
  boomLengthM: number
  reactionWheelMomentumNms: number
  targetDumpingTimeHours: number
  description: string
}

const MAGNETICS_PRESETS: Record<string, MagneticsPreset> = {
  leo_smallsat_cubesat: {
    name: "3U/6U CubeSat B-Dot Control",
    classType: "Educational / Commercial Smallsat",
    altitudeKm: 500,
    inclinationDeg: 45,
    chassisResidualDipoleAm2: 0.15,
    mtqMaxDipoleAm2: 0.25,
    boomLengthM: 0.4,
    reactionWheelMomentumNms: 0.05,
    targetDumpingTimeHours: 1.5,
    description: "Compact chassis with magnetic torque rods sized for initial detumbling and reaction wheel desaturation.",
  },
  flagship_science_observatory: {
    name: "Magnetically Clean Polar Explorer",
    classType: "NASA / ESA Science Flagship",
    altitudeKm: 750,
    inclinationDeg: 98.5,
    chassisResidualDipoleAm2: 0.02, // Stringently degaussed
    mtqMaxDipoleAm2: 30.0,
    boomLengthM: 3.5, // Long deployable boom
    reactionWheelMomentumNms: 12.0,
    targetDumpingTimeHours: 4.0,
    description: "Rigorous magnetic cleanliness program with permalloy shielding and fluxgate magnetometer on a 3.5m boom.",
  },
  high_power_telecom_bus: {
    name: "GEO High-Power Telecom Bus (GTO Phase)",
    classType: "Commercial 5kW+ Bus",
    altitudeKm: 600, // Perigee pass environment
    inclinationDeg: 28.5,
    chassisResidualDipoleAm2: 2.5, // High DC bus currents
    mtqMaxDipoleAm2: 120.0,
    boomLengthM: 1.2,
    reactionWheelMomentumNms: 50.0,
    targetDumpingTimeHours: 6.0,
    description: "Large solar array harness current loops generating substantial residual dipole during low-altitude passes.",
  },
}

export default function MagneticsPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("flagship_science_observatory")
  const [altitudeKm, setAltitudeKm] = useState<number>(750)
  const [inclinationDeg, setInclinationDeg] = useState<number>(98.5)
  const [chassisDipoleAm2, setChassisDipoleAm2] = useState<number>(0.02)
  const [mtqDipoleAm2, setMtqDipoleAm2] = useState<number>(30.0)
  const [boomLengthM, setBoomLengthM] = useState<number>(3.5)
  const [wheelMomentumNms, setWheelMomentumNms] = useState<number>(12.0)

  const preset = MAGNETICS_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = MAGNETICS_PRESETS[key]
    setSelectedPresetKey(key)
    setAltitudeKm(p.altitudeKm)
    setInclinationDeg(p.inclinationDeg)
    setChassisDipoleAm2(p.chassisResidualDipoleAm2)
    setMtqDipoleAm2(p.mtqMaxDipoleAm2)
    setBoomLengthM(p.boomLengthM)
    setWheelMomentumNms(p.reactionWheelMomentumNms)
  }

  // NASA SP-8018 Geomagnetic Field & Torquer Calculations
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const rOrbKm = rEarthKm + altitudeKm

    // 1. Geomagnetic Field Strength at Altitude (B_geo in Tesla and nanoTesla)
    // Dipole model: B0 ~ 3.12e-5 T at Earth equatorial surface
    const b0 = 3.12e-5
    const latRad = (inclinationDeg * Math.PI) / 180
    const bMagnitudeTesla = (b0 * Math.pow(rEarthKm / rOrbKm, 3)) * Math.sqrt(1 + 3 * Math.pow(Math.sin(latRad), 2))
    const bNanoTesla = Math.round(bMagnitudeTesla * 1e9)

    // 2. Maximum Parasitic Residual Magnetic Disturbance Torque (Newton-meters & microNm)
    // T_dist = m_res * B
    const maxDisturbanceTorqueNm = chassisDipoleAm2 * bMagnitudeTesla
    const disturbanceTorqueMicroNm = Math.round(maxDisturbanceTorqueNm * 1e6 * 10) / 10

    // 3. Control Torque from Magnetic Torquers (MTQ)
    // T_ctrl = m_mtq * B
    const maxControlTorqueNm = mtqDipoleAm2 * bMagnitudeTesla
    const controlTorqueMilliNm = Math.round(maxControlTorqueNm * 1e3 * 10) / 10

    // Control Authority Ratio (Control Torque / Disturbance Torque)
    const controlAuthorityRatio = Math.round((maxControlTorqueNm / Math.max(1e-12, maxDisturbanceTorqueNm)) * 10) / 10

    // 4. Reaction Wheel Momentum Dumping Time (Hours)
    // Delta_t = H_wheel / T_ctrl (assuming average 50% geometric alignment efficiency)
    const avgTorqueNm = maxControlTorqueNm * 0.5
    const dumpingTimeSec = wheelMomentumNms / Math.max(1e-8, avgTorqueNm)
    const dumpingTimeHours = Math.round((dumpingTimeSec / 3600) * 10) / 10

    // 5. Magnetic Cleanliness at Sensor Boom Tip (nanoTesla)
    // Field falls off with inverse cube of distance: B_boom = (mu0 / 4pi) * (m_res / r^3)
    // (mu0 / 4pi) = 1e-7 T*m/A
    const boomFieldTesla = 1e-7 * (chassisDipoleAm2 / Math.pow(Math.max(0.1, boomLengthM), 3))
    const boomFieldNanoTesla = Math.round(boomFieldTesla * 1e9 * 100) / 100

    // Cleanliness Threshold: Science missions require residual field at sensor < 5 nT (and < 1 nT for planetary)
    const cleanlinessPassed = boomFieldNanoTesla <= 5.0

    return {
      bNanoTesla: bNanoTesla.toLocaleString(),
      disturbanceTorqueMicroNm,
      controlTorqueMilliNm,
      controlAuthorityRatio,
      dumpingTimeHours,
      boomFieldNanoTesla,
      cleanlinessPassed,
    }
  }, [altitudeKm, inclinationDeg, chassisDipoleAm2, mtqDipoleAm2, boomLengthM, wheelMomentumNms])

  const exportMagneticsCSV = () => {
    const csv = `SPACECRAFT MAGNETIC CLEANLINESS & TORQUER ATTITUDE SPEC
Preset Architecture,${preset.name}
Class,${preset.classType}
Orbital Altitude,${altitudeKm} km
Orbital Inclination,${inclinationDeg} deg
Local Geomagnetic Field (B_geo),${metrics.bNanoTesla} nT
Spacecraft Residual Dipole Moment,${chassisDipoleAm2} A*m2
Peak Residual Disturbance Torque,${metrics.disturbanceTorqueMicroNm} uN*m
Magnetic Torquer Rod Capacity,${mtqDipoleAm2} A*m2
Peak Actuation Control Torque,${metrics.controlTorqueMilliNm} mN*m
Control Authority Headroom,${metrics.controlAuthorityRatio}x
Reaction Wheel Stored Momentum,${wheelMomentumNms} N*m*s
Momentum Wheel Desaturation Time,${metrics.dumpingTimeHours} hours
Magnetometer Boom Length,${boomLengthM} meters
Residual Field at Boom Tip,${metrics.boomFieldNanoTesla} nT (Threshold: <= 5.0 nT)
Magnetic Cleanliness Status,${metrics.cleanlinessPassed ? "CLEARED (SCIENCE QUALITY)" : "MAGNETIC CONTAMINATION RISK"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-magnetic-torquers-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Compass className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA SP-8018 Geomagnetic Dipole &amp; Magnetic Torquer Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              MAGNETIC TORQUERS &amp; CLEANLINESS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model geomagnetic field vector intensities, parasitic residual magnetic disturbance torques, magnetic torquer momentum desaturation rates, and boom-tip cleanliness field decay.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportMagneticsCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT MAGNETICS SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(MAGNETICS_PRESETS).map(([k, v]) => (
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
              Dipole &amp; Orbit Parameters
            </div>

            {/* Orbit Altitude & Inclination */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">ALTITUDE</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={altitudeKm}
                    onChange={(e) => setAltitudeKm(Math.max(200, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">km</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">INCLINATION</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={inclinationDeg}
                    onChange={(e) => setInclinationDeg(Math.max(0, Math.min(180, Number(e.target.value))))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">&deg;</span>
                </div>
              </div>
            </div>

            {/* Chassis Residual Dipole */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">CHASSIS RESIDUAL DIPOLE</label>
                <span className="text-cyan-400 font-bold">{chassisDipoleAm2} A&middot;m²</span>
              </div>
              <input
                type="number"
                step={0.01}
                value={chassisDipoleAm2}
                onChange={(e) => setChassisDipoleAm2(Math.max(0.001, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
              <span className="text-[10px] text-slate-500 block">Internal unshielded electronics / harness loops</span>
            </div>

            {/* MTQ Rod Actuation Capacity */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">MTQ TORQUER ROD STRENGTH</label>
                <span className="text-purple-400 font-bold">{mtqDipoleAm2} A&middot;m²</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={150.0}
                step={0.5}
                value={mtqDipoleAm2}
                onChange={(e) => setMtqDipoleAm2(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.2 A&middot;m² (CubeSat)</span>
                <span>30 A&middot;m² (Smallsat)</span>
                <span>150 A&middot;m² (Flagship)</span>
              </div>
            </div>

            {/* Reaction Wheel Momentum & Boom Length */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">WHEEL MOMENTUM</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={wheelMomentumNms}
                    onChange={(e) => setWheelMomentumNms(Math.max(0.01, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">Nms</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">BOOM LENGTH</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={boomLengthM}
                    onChange={(e) => setBoomLengthM(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m</span>
                </div>
              </div>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">MISSION CLASS:</div>
              <p className="text-slate-300 font-mono text-[10px]">{preset.classType}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Compass className="w-3 h-3 text-cyan-400" /> GEOMAGNETIC FIELD (B)
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.bNanoTesla} nT</div>
                <div className="text-[10px] text-slate-500">Altitude: {altitudeKm} km, {inclinationDeg}&deg; Inc</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-purple-400" /> WHEEL DUMP TIME
                </div>
                <div className="text-3xl font-black text-white">{metrics.dumpingTimeHours} hrs</div>
                <div className="text-[10px] text-purple-400">Desaturates {wheelMomentumNms} N&middot;m&middot;s</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.cleanlinessPassed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  BOOM CLEANLINESS
                </div>
                <div className={`text-3xl font-black ${metrics.cleanlinessPassed ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.boomFieldNanoTesla} nT
                </div>
                <div className="text-[10px] text-slate-500">Threshold: &le; 5.0 nT at {boomLengthM}m</div>
              </div>
            </div>

            {/* Magnetics Dynamics & Cleanliness Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Torque Authority &amp; Magnetic Interference Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.cleanlinessPassed && metrics.controlAuthorityRatio >= 10
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-amber-950 border-amber-500/40 text-amber-300"
                }`}>
                  {metrics.cleanlinessPassed && metrics.controlAuthorityRatio >= 10
                    ? "MAGNETIC ARCHITECTURE CLEARED"
                    : "TORQUE AUTHORITY / CLEANLINESS DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">ATTITUDE DISTURBANCE &amp; WHEEL UNLOADING</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Immersed in a geomagnetic induction of <strong className="text-white">{metrics.bNanoTesla} nT</strong>, the bus residual dipole of <strong className="text-cyan-400">{chassisDipoleAm2} A&middot;m²</strong> generates a peak parasitic disturbance torque of <strong className="text-white">{metrics.disturbanceTorqueMicroNm} µN&middot;m</strong>.
                  The magnetic torquers provide <strong className="text-purple-400">{metrics.controlTorqueMilliNm} mN&middot;m</strong> of maximum control torque, delivering <strong className="text-emerald-400">{metrics.controlAuthorityRatio}x control authority</strong> over ambient disturbances and dumping the stored wheel momentum in <strong className="text-white">{metrics.dumpingTimeHours} hours</strong>.
                  {!metrics.cleanlinessPassed && (
                    <span className="text-red-400 block mt-1">
                      Magnetic cleanliness deficit: Residual chassis field at the magnetometer boom tip ({metrics.boomFieldNanoTesla} nT) exceeds the 5.0 nT scientific threshold. Extend boom length or apply mumetal magnetic shielding around high-current power electronics.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Peak Parasitic Disturbance Torque</span>
                  <span className="text-white font-bold">{metrics.disturbanceTorqueMicroNm} µN&middot;m</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Maximum MTQ Actuation Control Torque</span>
                  <span className="text-purple-400 font-bold">{metrics.controlTorqueMilliNm} mN&middot;m</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Momentum Dumping Duration</span>
                  <span className="text-cyan-400 font-bold">{metrics.dumpingTimeHours} hours (50% geometric coupling)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Residual Stray Field at Boom Tip</span>
                  <span className={`font-bold ${metrics.cleanlinessPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.boomFieldNanoTesla} nT at {boomLengthM}m (Limit: &le; 5.0 nT)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Magnetic Architecture Compliance</span>
                  <span className={`font-bold ${metrics.cleanlinessPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.cleanlinessPassed ? "PASS (NASA SP-8018 COMPLIANT)" : "FAIL (EXTEND BOOM / SHIELD HARNESS)"}
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
