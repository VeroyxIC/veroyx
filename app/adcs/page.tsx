"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  RotateCw, 
  Compass, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Activity, 
  ArrowRight,
  Crosshair,
  Sliders
} from "lucide-react"

interface AdcsPreset {
  name: string
  operator: string
  classType: string
  ixx: number
  iyy: number
  izz: number
  targetSlewDeg: number
  maxSlewTimeSec: number
  wheelMaxTorqueNm: number
  wheelMaxMomentumNms: number
  pointingAccuracyArcsec: number
  description: string
}

const ADCS_PRESETS: Record<string, AdcsPreset> = {
  high_agility_eo: {
    name: "Agile Earth Observation Retasker",
    operator: "Defense ISR / Commercial Optical",
    classType: "500 kg Class Smallsat",
    ixx: 45,
    iyy: 48,
    izz: 35,
    targetSlewDeg: 30,
    maxSlewTimeSec: 15,
    wheelMaxTorqueNm: 0.15,
    wheelMaxMomentumNms: 2.0,
    pointingAccuracyArcsec: 1.5,
    description: "High-torque Control Moment Gyros (CMGs) / reaction wheels for fast off-nadir tactical sensor retasking.",
  },
  space_telescope: {
    name: "Sub-Arcsecond Deep Space Telescope",
    operator: "Astrophysics Observatory",
    classType: "2,000 kg Flagship Bus",
    ixx: 850,
    iyy: 920,
    izz: 780,
    targetSlewDeg: 45,
    maxSlewTimeSec: 120,
    wheelMaxTorqueNm: 0.25,
    wheelMaxMomentumNms: 18.0,
    pointingAccuracyArcsec: 0.05,
    description: "Ultra-quiet isolated reaction wheels optimized for micro-vibration suppression and star-tracker co-alignment.",
  },
  cubesat_3u: {
    name: "3U / 6U CubeSat Precision Bus",
    operator: "Standard SmallSat",
    classType: "12 kg Smallsat",
    ixx: 0.08,
    iyy: 0.12,
    izz: 0.10,
    targetSlewDeg: 90,
    maxSlewTimeSec: 45,
    wheelMaxTorqueNm: 0.005,
    wheelMaxMomentumNms: 0.03,
    pointingAccuracyArcsec: 35.0,
    description: "Miniature reaction wheels paired with 3-axis magnetorquer rods for low-power B-dot detumbling and pointing.",
  },
  geo_commsat: {
    name: "Heavy GEO Communications Bus",
    operator: "Commercial Telecom",
    classType: "4,500 kg Flagship",
    ixx: 3800,
    iyy: 4200,
    izz: 2900,
    targetSlewDeg: 15,
    maxSlewTimeSec: 180,
    wheelMaxTorqueNm: 0.35,
    wheelMaxMomentumNms: 50.0,
    pointingAccuracyArcsec: 12.0,
    description: "Large momentum bias wheels for long-term orbital stiffness and station-keeping against solar radiation torques.",
  },
}

export default function ADCSPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("high_agility_eo")
  const [ixx, setIxx] = useState<number>(45)
  const [iyy, setIyy] = useState<number>(48)
  const [izz, setIzz] = useState<number>(35)
  const [slewDeg, setSlewDeg] = useState<number>(30)
  const [slewTimeSec, setSlewTimeSec] = useState<number>(15)
  const [wheelTorqueNm, setWheelTorqueNm] = useState<number>(0.15)
  const [wheelMomentumNms, setWheelMomentumNms] = useState<number>(2.0)

  const preset = ADCS_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = ADCS_PRESETS[key]
    setSelectedPresetKey(key)
    setIxx(p.ixx)
    setIyy(p.iyy)
    setIzz(p.izz)
    setSlewDeg(p.targetSlewDeg)
    setSlewTimeSec(p.maxSlewTimeSec)
    setWheelTorqueNm(p.wheelMaxTorqueNm)
    setWheelMomentumNms(p.wheelMaxMomentumNms)
  }

  // ADCS Dynamics & Disturbance Calculations
  const metrics = useMemo(() => {
    // Principal dominant inertia for the slew axis (worst-case max between Ixx, Iyy, Izz)
    const maxInertia = Math.max(ixx, iyy, izz)
    const slewRad = (slewDeg * Math.PI) / 180

    // 1. Bang-Bang Acceleration Profile:
    // theta = 2 * (1/2 * alpha * (t/2)^2) = 1/4 * alpha * t^2 => alpha = 4 * theta / t^2
    const reqAngularAccelRadS2 = (4 * slewRad) / Math.pow(Math.max(1, slewTimeSec), 2)
    const reqPeakTorqueNm = maxInertia * reqAngularAccelRadS2

    // 2. Angular Velocity Peak: omega_max = alpha * (t/2)
    const peakAngularRateDegS = ((reqAngularAccelRadS2 * (slewTimeSec / 2)) * 180) / Math.PI

    // 3. Peak Angular Momentum Exchanged: H = I * omega_max
    const reqMomentumNms = maxInertia * (reqAngularAccelRadS2 * (slewTimeSec / 2))

    // 4. Actuator Feasibility Checks
    const torqueMarginPct = Math.round(((wheelTorqueNm - reqPeakTorqueNm) / wheelTorqueNm) * 100)
    const momentumMarginPct = Math.round(((wheelMomentumNms - reqMomentumNms) / wheelMomentumNms) * 100)
    const torquePassed = reqPeakTorqueNm <= wheelTorqueNm
    const momentumPassed = reqMomentumNms <= wheelMomentumNms
    const adcsFeasible = torquePassed && momentumPassed

    // 5. Environmental Disturbance Torque Modeling (Nominal LEO 500 km)
    const mu = 398600.4418 * 1e9 // m3/s2
    const rOrbitM = (6378.1 + 500) * 1000
    // Gravity gradient worst case: 3 * mu / (2 * R^3) * |Izz - Ixx|
    const tGravityGradientNm = ((3 * mu) / (2 * Math.pow(rOrbitM, 3))) * Math.abs(izz - ixx)

    // Aerodynamic disturbance (approx 1e-5 to 1e-4 Nm in LEO)
    const tAeroNm = maxInertia > 500 ? 8.5e-5 : maxInertia > 10 ? 2.5e-5 : 1.2e-6

    // Solar radiation pressure disturbance (approx 1e-6 to 5e-5 Nm)
    const tSrpNm = maxInertia > 500 ? 4.2e-5 : 5.8e-6

    // Total daily secular momentum buildup from disturbances
    const totalDisturbanceTorqueNm = tGravityGradientNm + tAeroNm + tSrpNm
    const dailyAccumulatedMomentumNms = totalDisturbanceTorqueNm * 86400

    // Magnetorquer Desaturation Sizing
    // Dipole M = Tau / B, Earth B-field in LEO ~ 3.5e-5 Tesla
    const bEarthTesla = 3.5e-5
    const reqMagnetorquerDipoleAm2 = Math.round((totalDisturbanceTorqueNm * 4 / bEarthTesla) * 10) / 10

    return {
      reqPeakTorqueNm: reqPeakTorqueNm.toFixed(4),
      reqMomentumNms: reqMomentumNms.toFixed(3),
      peakAngularRateDegS: peakAngularRateDegS.toFixed(2),
      torqueMarginPct,
      momentumMarginPct,
      torquePassed,
      momentumPassed,
      adcsFeasible,
      totalDisturbanceTorqueNm: totalDisturbanceTorqueNm.toExponential(2),
      dailyAccumulatedMomentumNms: dailyAccumulatedMomentumNms.toFixed(2),
      reqMagnetorquerDipoleAm2,
    }
  }, [ixx, iyy, izz, slewDeg, slewTimeSec, wheelTorqueNm, wheelMomentumNms])

  const exportAdcsCSV = () => {
    const csv = `SPACECRAFT ADCS & SLEW ACTUATOR TRADE REPORT
Preset Architecture,${preset.name}
Operator,${preset.operator}
Principal Inertias (Ixx, Iyy, Izz),${ixx}, ${iyy}, ${izz} kg*m2
Target Slew Angle,${slewDeg} deg
Allocated Slew Duration,${slewTimeSec} s
Peak Angular Velocity,${metrics.peakAngularRateDegS} deg/s
Required Peak Torque,${metrics.reqPeakTorqueNm} Nm
Available Wheel Torque,${wheelTorqueNm} Nm (${metrics.torqueMarginPct}% margin)
Required Angular Momentum,${metrics.reqMomentumNms} Nms
Available Wheel Momentum,${wheelMomentumNms} Nms (${metrics.momentumMarginPct}% margin)
Environmental Disturbance Torque,${metrics.totalDisturbanceTorqueNm} Nm
Daily Momentum Buildup,${metrics.dailyAccumulatedMomentumNms} Nms/day
Required Magnetorquer Rod Sizing,${metrics.reqMagnetorquerDipoleAm2} A*m2
Feasibility Verdict,${metrics.adcsFeasible ? "ACTUATORS SIZED NOMINAL" : "WHEEL SATURATION DETECTED"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-adcs-slew-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              Rigid-Body Euler Dynamics &amp; Reaction Wheel Sizing Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ADCS &amp; SLEW RATE SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model rigid-body inertia tensors, tactical rapid retasking slew profiles, reaction wheel torque-momentum saturation envelopes, and magnetorquer desaturation rods.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportAdcsCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT ADCS SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(ADCS_PRESETS).map(([k, v]) => (
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
              Inertia &amp; Maneuver Constraints
            </div>

            {/* Principal Moments of Inertia */}
            <div className="space-y-2">
              <label className="text-slate-400 block uppercase font-bold">
                MOMENTS OF INERTIA (kg·m²)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">I_xx (Roll)</span>
                  <input
                    type="number"
                    value={ixx}
                    onChange={(e) => setIxx(Math.max(0.01, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">I_yy (Pitch)</span>
                  <input
                    type="number"
                    value={iyy}
                    onChange={(e) => setIyy(Math.max(0.01, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">I_zz (Yaw)</span>
                  <input
                    type="number"
                    value={izz}
                    onChange={(e) => setIzz(Math.max(0.01, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Target Slew Angle Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">TARGET RETASKING SLEW</label>
                <span className="text-cyan-400 font-bold">{slewDeg}&deg; ANGLE</span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                value={slewDeg}
                onChange={(e) => setSlewDeg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>15&deg; (Nadir Offset)</span>
                <span>45&deg; (Sensor Retask)</span>
                <span>180&deg; (Inversion)</span>
              </div>
            </div>

            {/* Allocated Maneuver Time */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ALLOCATED SLEW DURATION</label>
                <span className="text-purple-400 font-bold">{slewTimeSec} SECONDS</span>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                value={slewTimeSec}
                onChange={(e) => setSlewTimeSec(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>10s (Tactical)</span>
                <span>60s</span>
                <span>300s (Relaxed)</span>
              </div>
            </div>

            {/* Actuator Limits */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Reaction Wheel Limits (Per Axis)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block uppercase font-bold">PEAK TORQUE (Nm)</label>
                  <input
                    type="number"
                    step={0.005}
                    value={wheelTorqueNm}
                    onChange={(e) => setWheelTorqueNm(Math.max(0.001, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block uppercase font-bold">MOMENTUM CAP (N·m·s)</label>
                  <input
                    type="number"
                    step={0.05}
                    value={wheelMomentumNms}
                    onChange={(e) => setWheelMomentumNms(Math.max(0.001, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Heritage Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">POINTING STABILITY:</div>
              <p className="text-slate-300 font-bold font-mono">{preset.pointingAccuracyArcsec} arcsec 3-sigma</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> PEAK TORQUE DEMAND
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.reqPeakTorqueNm} Nm</div>
                <div className="text-[10px] text-slate-500">Available: {wheelTorqueNm} Nm</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Compass className="w-3 h-3 text-purple-400" /> PEAK SLEW RATE
                </div>
                <div className="text-3xl font-black text-white">{metrics.peakAngularRateDegS}&deg;/s</div>
                <div className="text-[10px] text-purple-400">Angular Velocity Peak</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.adcsFeasible ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  ACTUATOR MARGIN
                </div>
                <div className={`text-3xl font-black ${metrics.adcsFeasible ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.torqueMarginPct}%
                </div>
                <div className="text-[10px] text-slate-500">Torque Headroom</div>
              </div>
            </div>

            {/* Actuator Trade & Desaturation Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  Reaction Wheel Saturation &amp; Desaturation Sizing
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.adcsFeasible
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.adcsFeasible ? "MANEUVER ENVELOPE CLEARED" : "WHEEL SATURATION VIOLATION"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">MAGNETORQUER MOMENTUM DUMPING SPEC</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Orbital gravity gradient and aerodynamic drag exert a continuous secular disturbance torque of <strong className="text-white">{metrics.totalDisturbanceTorqueNm} Nm</strong> on the bus. This accumulates <strong className="text-cyan-400">{metrics.dailyAccumulatedMomentumNms} N·m·s</strong> of parasitic momentum every 24 hours. A 3-axis magnetic torquer rod array sized to at least <strong className="text-emerald-400">{metrics.reqMagnetorquerDipoleAm2} A·m²</strong> magnetic dipole is required to dump momentum against Earth&apos;s magnetic field without consuming RCS chemical propellant.
                </p>
              </div>

              {/* Dynamics Specs Table */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Angular Momentum Exchanged per Slew</span>
                  <span className="text-white font-bold">{metrics.reqMomentumNms} N·m·s ({metrics.momentumMarginPct}% margin)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Peak Acceleration Torque Demand</span>
                  <span className={`font-bold ${metrics.torquePassed ? "text-cyan-400" : "text-red-400"}`}>
                    {metrics.reqPeakTorqueNm} Nm (Wheel Limit: {wheelTorqueNm} Nm)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Environmental Secular Disturbance Torque</span>
                  <span className="text-slate-200 font-bold">{metrics.totalDisturbanceTorqueNm} Nm</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Daily Momentum Buildup (24h)</span>
                  <span className="text-purple-400 font-bold">+{metrics.dailyAccumulatedMomentumNms} N·m·s / day</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Required Magnetic Torquer Dipole</span>
                  <span className="text-emerald-400 font-bold">{metrics.reqMagnetorquerDipoleAm2} A·m² minimum</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
