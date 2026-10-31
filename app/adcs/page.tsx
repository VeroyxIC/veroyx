"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import { 
  Compass, 
  RotateCw, 
  Target, 
  Layers, 
  Activity, 
  Sliders, 
  ShieldCheck, 
  Download, 
  ArrowRight,
  Gauge,
  Cpu
} from "lucide-react"

export default function AdcsPage() {
  const { mission, totalWetMassKg } = useMission()
  
  // Pointing Architecture Inputs
  const [starTrackerAccuracyArcsec, setStarTrackerAccuracyArcsec] = useState<number>(3.0)
  const [thermoElasticBendArcsec, setThermoElasticBendArcsec] = useState<number>(8.5)
  const [gyroDriftDegHr, setGyroDriftDegHr] = useState<number>(0.02)
  const [reactionWheelJitterUrad, setReactionWheelJitterUrad] = useState<number>(1.8)
  const [targetSlewAngleDeg, setTargetSlewAngleDeg] = useState<number>(90)
  const [wheelTorqueNm, setWheelTorqueNm] = useState<number>(0.05) // 50 mN-m
  const [wheelMomentumNms, setWheelMomentumNms] = useState<number>(0.4) // 0.4 N-m-s

  // Mathematical PEB Analysis
  const peb = useMemo(() => {
    // 1. Absolute Pointing Error (APE) - 3-sigma RSS of bias terms
    const starTrackerDeg = (starTrackerAccuracyArcsec / 3600)
    const thermoBendDeg = (thermoElasticBendArcsec / 3600)
    const apeDeg = Math.sqrt(Math.pow(starTrackerDeg, 2) + Math.pow(thermoBendDeg, 2))
    const apeArcsec = Math.round(apeDeg * 3600 * 10) / 10

    // 2. Pointing Drift Error (PDE) over a 60-second observation dwell
    const pdeDeg = (gyroDriftDegHr / 3600) * 60
    const pdeArcsec = Math.round(pdeDeg * 3600 * 100) / 100

    // 3. Relative Pointing Error (RPE) / Line of Sight Jitter
    const rpeArcsec = Math.round((reactionWheelJitterUrad * 0.206265) * 100) / 100

    // Total RSS Pointing Accuracy
    const totalPebArcsec = Math.round(Math.sqrt(Math.pow(apeArcsec, 2) + Math.pow(pdeArcsec, 2) + Math.pow(rpeArcsec, 2)) * 10) / 10

    // 4. Spacecraft Inertia Approximation (Cuboid: I = 1/12 * M * (w^2 + h^2))
    const scWidth = 1.2
    const scHeight = 1.5
    const inertiaKgm2 = Math.round(((1 / 12) * totalWetMassKg * (Math.pow(scWidth, 2) + Math.pow(scHeight, 2))) * 10) / 10

    // 5. Bang-Bang Slew Dynamics: theta = 0.5 * alpha * (t/2)^2 * 2 => t = 2 * sqrt(theta / alpha)
    const alphaRadS2 = wheelTorqueNm / inertiaKgm2
    const thetaRad = (targetSlewAngleDeg * Math.PI) / 180
    const slewTimeSec = Math.round(2 * Math.sqrt(thetaRad / alphaRadS2) * 10) / 10
    const peakRateDegS = Math.round((alphaRadS2 * (slewTimeSec / 2) * (180 / Math.PI)) * 100) / 100

    // 6. Momentum Saturation & Desaturation (Gravity gradient torque ~ 1.5e-5 N-m)
    const secularTorqueNm = 1.8e-5
    const saturationHours = Math.round((wheelMomentumNms / secularTorqueNm) / 3600 * 10) / 10

    return {
      apeArcsec,
      pdeArcsec,
      rpeArcsec,
      totalPebArcsec,
      inertiaKgm2,
      slewTimeSec,
      peakRateDegS,
      saturationHours,
      payloadCompatible: totalPebArcsec <= 15.0
    }
  }, [starTrackerAccuracyArcsec, thermoElasticBendArcsec, gyroDriftDegHr, reactionWheelJitterUrad, targetSlewAngleDeg, wheelTorqueNm, wheelMomentumNms, totalWetMassKg])

  const exportPebCSV = () => {
    const csv = `POINTING ERROR BUDGET (PEB) & GNC SPECIFICATION
Standard Reference,NASA SP-8000 / ECSS-E-ST-60-10C
Spacecraft Wet Mass,${totalWetMassKg} kg
Calculated Spacecraft Inertia,${peb.inertiaKgm2} kg*m^2
Star Tracker Noise Bias,${starTrackerAccuracyArcsec} arcsec
Thermo-Elastic Structural Distortion,${thermoElasticBendArcsec} arcsec
Absolute Pointing Error (APE),${peb.apeArcsec} arcsec (3-sigma)
Pointing Drift Error (PDE - 60s dwell),${peb.pdeArcsec} arcsec
Relative Pointing Error (RPE / Jitter),${peb.rpeArcsec} arcsec
Total Pointing Budget Error (RSS),${peb.totalPebArcsec} arcsec
Target Slew Angle,${targetSlewAngleDeg} deg
Allocated Reaction Wheel Torque,${wheelTorqueNm} N-m
Calculated Slew Duration,${peb.slewTimeSec} seconds (Peak Rate: ${peb.peakRateDegS} deg/s)
Reaction Wheel Momentum Envelope,${wheelMomentumNms} N-m-s
Momentum Saturation Time,${peb.saturationHours} hours (Magnetorquer Dump Threshold)
Optical Sensor Compatibility,${peb.payloadCompatible ? "PASS (LOS Jitter Controlled)" : "FAIL (LOS Smear Exceeds 15 arcsec)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-adcs-peb-spec.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              GNC Pointing Error Budget (PEB) &amp; Momentum Slew Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              ATTITUDE CONTROL &amp; POINTING
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Synthesize Absolute Pointing Error (APE), low-frequency gyro drift (PDE), and reaction wheel micro-vibration jitter (RPE) to verify payload line-of-sight pointing closure and slew maneuvers.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportPebCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT PEB SPEC
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Target className="w-3 h-3 text-cyan-400" /> TOTAL POINTING (RSS)
            </div>
            <div className={`text-3xl font-black ${peb.payloadCompatible ? "text-emerald-400" : "text-amber-400"}`}>
              {peb.totalPebArcsec}&Prime;
            </div>
            <div className="text-[10px] text-slate-400">Req: &le; 15.0&Prime; (Optical Line of Sight)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-purple-400" /> {targetSlewAngleDeg}&deg; SLEW TIME
            </div>
            <div className="text-3xl font-black text-purple-400">{peb.slewTimeSec}s</div>
            <div className="text-[10px] text-slate-400">Peak Rate: {peb.peakRateDegS}&deg;/s ({peb.inertiaKgm2} kg&middot;m&sup2;)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-400" /> JITTER NOISE (RPE)
            </div>
            <div className="text-3xl font-black text-amber-400">{peb.rpeArcsec}&Prime;</div>
            <div className="text-[10px] text-slate-400">Wheel Harmonic Unbalance</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-400" /> MOMENTUM DUMP
            </div>
            <div className="text-3xl font-black text-emerald-400">{peb.saturationHours}h</div>
            <div className="text-[10px] text-slate-400">MTQ Desaturation Interval</div>
          </div>
        </div>

        {/* Configuration Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">
          
          {/* Column 1: Sensor & Structural Distortion */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" /> Sensor &amp; Structure Noise
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">STAR TRACKER NOISE</label>
                <span className="text-cyan-400 font-bold">{starTrackerAccuracyArcsec}&Prime;</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={15}
                step={0.5}
                value={starTrackerAccuracyArcsec}
                onChange={e => setStarTrackerAccuracyArcsec(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Autonomous star identification focal plane bias</span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">THERMO-ELASTIC BEND</label>
                <span className="text-cyan-400 font-bold">{thermoElasticBendArcsec}&Prime;</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={0.5}
                value={thermoElasticBendArcsec}
                onChange={e => setThermoElasticBendArcsec(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Day/night thermal optical bench alignment warpage</span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">GYRO DRIFT RATE</label>
                <span className="text-amber-400 font-bold">{gyroDriftDegHr}&deg;/hr</span>
              </div>
              <input
                type="range"
                min={0.005}
                max={0.2}
                step={0.005}
                value={gyroDriftDegHr}
                onChange={e => setGyroDriftDegHr(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Fiber-optic / MEMS IMU random walk rate</span>
            </div>
          </div>

          {/* Column 2: Actuator & Slew Dynamics */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-purple-400" /> Reaction Wheels &amp; Slew
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">TARGET SLEW ANGLE</label>
                <span className="text-purple-400 font-bold">{targetSlewAngleDeg}&deg;</span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={targetSlewAngleDeg}
                onChange={e => setTargetSlewAngleDeg(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">WHEEL TORQUE</label>
                <span className="text-purple-400 font-bold">{wheelTorqueNm * 1000} mN&middot;m</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.25}
                step={0.01}
                value={wheelTorqueNm}
                onChange={e => setWheelTorqueNm(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">MOMENTUM STORAGE</label>
                <span className="text-purple-400 font-bold">{wheelMomentumNms} N&middot;m&middot;s</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={2.0}
                step={0.05}
                value={wheelMomentumNms}
                onChange={e => setWheelMomentumNms(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Column 3: Pointing Error Roll-up Card */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-white uppercase text-xs">Pointing Budget Breakdown</span>
              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                peb.payloadCompatible ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "bg-red-950 text-red-300 border border-red-500/40"
              }`}>
                {peb.payloadCompatible ? "MARGIN COMPLIANT" : "JITTER DEFICIT"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Absolute Pointing (APE 3&sigma;)</span>
                <strong className="text-white">{peb.apeArcsec}&Prime;</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Pointing Drift (PDE 60s)</span>
                <strong className="text-white">{peb.pdeArcsec}&Prime;</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Relative Pointing / Jitter (RPE)</span>
                <strong className="text-amber-400">{peb.rpeArcsec}&Prime;</strong>
              </div>
              <div className="flex justify-between py-1.5 border-t border-slate-800 text-sm">
                <span className="text-cyan-400 font-bold">Total Root-Sum-Square</span>
                <strong className="text-cyan-300">{peb.totalPebArcsec}&Prime;</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-sans text-slate-400 space-y-1.5 mt-2">
              <strong className="text-cyan-400 font-mono block">PAYLOAD COUPLING:</strong>
              With a total pointing accuracy of <strong className="text-white">{peb.totalPebArcsec}&Prime;</strong>, the optical payload lines of sight remain stable within sub-pixel smear bounds for resolutions down to 0.7m GSD.
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
