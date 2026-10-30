"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  RotateCw, 
  Wind, 
  Sun, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Globe,
  Compass
} from "lucide-react"

interface DisturbancePreset {
  name: string
  classType: string
  orbitType: "LEO Aerodynamic (350 km)" | "LEO Sun-Synchronous (650 km)" | "GEO High-Altitude (35,786 km)"
  altitudeKm: number
  massKg: number
  inertiaDiffIzzMinusIxxKgM2: number
  surfaceAreaM2: number
  cpCgOffsetM: number
  wheelStorageCapacityNms: number
  description: string
}

const DISTURBANCE_PRESETS: Record<string, DisturbancePreset> = {
  vleo_recon_cubesat: {
    name: "VLEO High-Drag Recon (350 km)",
    classType: "Aerodynamic-Dominant SmallSat",
    orbitType: "LEO Aerodynamic (350 km)",
    altitudeKm: 350,
    massKg: 180,
    inertiaDiffIzzMinusIxxKgM2: 15.0,
    surfaceAreaM2: 1.8,
    cpCgOffsetM: 0.12,
    wheelStorageCapacityNms: 0.5,
    description: "Operates in dense thermosphere where aerodynamic drag lever arms dominate attitude disturbance.",
  },
  sso_optical_bus: {
    name: "Sun-Synchronous Polar Platform (650 km)",
    classType: "Balanced Gravity-Gradient & SRP",
    orbitType: "LEO Sun-Synchronous (650 km)",
    altitudeKm: 650,
    massKg: 650,
    inertiaDiffIzzMinusIxxKgM2: 120.0,
    surfaceAreaM2: 5.2,
    cpCgOffsetM: 0.08,
    wheelStorageCapacityNms: 4.0,
    description: "Mid-LEO regime where gravity-gradient cyclic torques and SRP secular drift compete equally.",
  },
  geo_telecom_flagship: {
    name: "GEO High-Power Communications (35,786 km)",
    classType: "SRP-Dominant High-Altitude Bus",
    orbitType: "GEO High-Altitude (35,786 km)",
    altitudeKm: 35786,
    massKg: 3500,
    inertiaDiffIzzMinusIxxKgM2: 1800.0,
    surfaceAreaM2: 45.0,
    cpCgOffsetM: 0.25,
    wheelStorageCapacityNms: 40.0,
    description: "Deep space regime where aerodynamic and gravity-gradient torques vanish, leaving SRP as the sole secular force.",
  },
}

export default function EnvironmentalDisturbancesPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("sso_optical_bus")
  const [altitudeKm, setAltitudeKm] = useState<number>(650)
  const [inertiaDiffKgM2, setInertiaDiffKgM2] = useState<number>(120.0)
  const [surfaceAreaM2, setSurfaceAreaM2] = useState<number>(5.2)
  const [cpCgOffsetM, setCpCgOffsetM] = useState<number>(0.08)
  const [wheelCapacityNms, setWheelCapacityNms] = useState<number>(4.0)

  const preset = DISTURBANCE_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = DISTURBANCE_PRESETS[key]
    setSelectedPresetKey(key)
    setAltitudeKm(p.altitudeKm)
    setInertiaDiffKgM2(p.inertiaDiffIzzMinusIxxKgM2)
    setSurfaceAreaM2(p.surfaceAreaM2)
    setCpCgOffsetM(p.cpCgOffsetM)
    setWheelCapacityNms(p.wheelStorageCapacityNms)
  }

  // NASA SP-8024 Spacecraft Disturbance Torque Calculations
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const rOrbKm = rEarthKm + altitudeKm
    const rOrbM = rOrbKm * 1000
    const mu = 3.986004418e14 // m3/s2

    // Orbital period (s) and orbital speed (m/s)
    const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbM, 3) / mu)
    const vOrbMS = Math.sqrt(mu / rOrbM)

    // 1. Gravity Gradient Torque Peak (N*m)
    // T_gg = (3 * mu / (2 * r^3)) * |I_zz - I_xx| * sin(2*theta), assume 10 deg pitch error
    const pitchOffsetRad = (10 * Math.PI) / 180
    const tGgNm = ((3 * mu) / (2 * Math.pow(rOrbM, 3))) * inertiaDiffKgM2 * Math.sin(2 * pitchOffsetRad)
    const tGgMicroNm = Math.round(tGgNm * 1e6 * 10) / 10

    // 2. Aerodynamic Drag Torque Peak (N*m)
    // Scale atmospheric density with altitude
    let rhoKgM3 = 0.0
    if (altitudeKm < 1000) {
      // US Standard Atmosphere approximate fit
      rhoKgM3 = 6.0e-10 * Math.exp(-(altitudeKm - 300) / 58.0)
    }
    const cd = 2.2
    const fAeroN = 0.5 * rhoKgM3 * Math.pow(vOrbMS, 2) * cd * surfaceAreaM2
    const tAeroNm = fAeroN * cpCgOffsetM
    const tAeroMicroNm = Math.round(tAeroNm * 1e6 * 10) / 10

    // 3. Solar Radiation Pressure (SRP) Torque Peak (N*m)
    // P_solar ~ 4.56e-6 N/m2 (1 AU solar constant / c)
    const pSolarNm2 = 4.56e-6
    const reflectivityQ = 0.6 // 60% reflectivity
    const fSrpN = pSolarNm2 * surfaceAreaM2 * (1 + reflectivityQ)
    const tSrpNm = fSrpN * cpCgOffsetM
    const tSrpMicroNm = Math.round(tSrpNm * 1e6 * 10) / 10

    // 4. Combined Root-Sum-Square Peak Disturbance Torque (uN*m)
    const tTotalRssNm = Math.sqrt(Math.pow(tGgNm, 2) + Math.pow(tAeroNm, 2) + Math.pow(tSrpNm, 2))
    const tTotalRssMicroNm = Math.round(tTotalRssNm * 1e6 * 10) / 10

    // 5. Angular Momentum Accumulation per Orbit (N*m*s)
    // Gravity gradient is mostly cyclic (nets ~25% secular drift), Aero and SRP are secular
    const secularTorqueNm = tAeroNm + tSrpNm + tGgNm * 0.25
    const momentumPerOrbitNms = Math.round((secularTorqueNm * orbitPeriodSec) * 1000) / 1000

    // 6. Reaction Wheel Saturation Time (Orbits & Hours)
    const orbitsToSaturation = Math.round((wheelCapacityNms / Math.max(0.0001, momentumPerOrbitNms)) * 10) / 10
    const hoursToSaturation = Math.round(((orbitsToSaturation * orbitPeriodSec) / 3600) * 10) / 10

    // Sizing status: if wheels saturate in < 4 orbits, ADCS requires larger momentum wheels or frequent desaturation
    const adcsSufficient = orbitsToSaturation >= 4.0

    return {
      orbitPeriodMin: Math.round((orbitPeriodSec / 60) * 10) / 10,
      tGgMicroNm,
      tAeroMicroNm,
      tSrpMicroNm,
      tTotalRssMicroNm,
      momentumPerOrbitNms,
      orbitsToSaturation,
      hoursToSaturation,
      adcsSufficient,
    }
  }, [altitudeKm, inertiaDiffKgM2, surfaceAreaM2, cpCgOffsetM, wheelCapacityNms])

  const exportDisturbanceCSV = () => {
    const csv = `SPACECRAFT ENVIRONMENTAL DISTURBANCE TORQUES SPEC
Preset Architecture,${preset.name}
Class,${preset.classType}
Orbital Regime,${preset.orbitType}
Altitude,${altitudeKm} km (Orbit Period: ${metrics.orbitPeriodMin} min)
Inertia Asymmetry (Izz - Ixx),${inertiaDiffKgM2} kg*m2
Ram Cross-Section Area,${surfaceAreaM2} m2
Center-of-Pressure CP-CG Offset,${cpCgOffsetM} meters
Gravity Gradient Peak Torque,${metrics.tGgMicroNm} uN*m
Aerodynamic Drag Peak Torque,${metrics.tAeroMicroNm} uN*m
Solar Radiation Pressure Peak Torque,${metrics.tSrpMicroNm} uN*m
Combined RSS Disturbance Torque,${metrics.tTotalRssMicroNm} uN*m
Secular Momentum Accumulation,${metrics.momentumPerOrbitNms} N*m*s / orbit
Reaction Wheel Storage Capacity,${wheelCapacityNms} N*m*s
Wheel Saturation Runway,${metrics.orbitsToSaturation} orbits (${metrics.hoursToSaturation} hours)
ADCS Desaturation Margin Verdict,${metrics.adcsSufficient ? "ADEQUATE STORAGE RUNWAY" : "EXCESSIVE DESATURATION FREQUENCY"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-disturbance-torques-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <RotateCw className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA SP-8024 Gravity Gradient, Aerodynamic &amp; SRP Disturbance Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ENVIRONMENTAL DISTURBANCE TORQUES
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model orbital gravity gradient tension, upper atmospheric aerodynamic lever arm torques, solar radiation pressure (SRP), and reaction wheel momentum saturation runways.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportDisturbanceCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT TORQUE SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(DISTURBANCE_PRESETS).map(([k, v]) => (
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
              Spacecraft Mass &amp; Geometry
            </div>

            {/* Orbit Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">ORBIT ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={200}
                max={36000}
                step={50}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>350 km (Aero)</span>
                <span>800 km (Equilibrium)</span>
                <span>36,000 km (GEO)</span>
              </div>
            </div>

            {/* Inertia Asymmetry */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">INERTIA DIFFERENCE |I_zz - I_xx|</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={inertiaDiffKgM2}
                  onChange={(e) => setInertiaDiffKgM2(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg&middot;m²</span>
              </div>
            </div>

            {/* Area & Offset */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SURFACE AREA</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={surfaceAreaM2}
                    onChange={(e) => setSurfaceAreaM2(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m²</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">CP-CG OFFSET</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.01}
                    value={cpCgOffsetM}
                    onChange={(e) => setCpCgOffsetM(Math.max(0.001, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m</span>
                </div>
              </div>
            </div>

            {/* Reaction Wheel Capacity */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">WHEEL STORAGE CAPACITY</label>
                <span className="text-purple-400 font-bold">{wheelCapacityNms} N&middot;m&middot;s</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={50.0}
                step={0.5}
                value={wheelCapacityNms}
                onChange={(e) => setWheelCapacityNms(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Total angular momentum per wheel axis</span>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">REGIME DOMAIN:</div>
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
                  <Activity className="w-3 h-3 text-cyan-400" /> TOTAL RSS TORQUE
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.tTotalRssMicroNm} µN&middot;m</div>
                <div className="text-[10px] text-slate-500">Root-Sum-Square Combined</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-purple-400" /> MOMENTUM / ORBIT
                </div>
                <div className="text-3xl font-black text-white">{metrics.momentumPerOrbitNms}</div>
                <div className="text-[10px] text-purple-400">N&middot;m&middot;s accumulated per {metrics.orbitPeriodMin}m orbit</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.adcsSufficient ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  WHEEL RUNWAY
                </div>
                <div className={`text-3xl font-black ${metrics.adcsSufficient ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.orbitsToSaturation} orb
                </div>
                <div className="text-[10px] text-slate-500">~{metrics.hoursToSaturation} hrs until saturation</div>
              </div>
            </div>

            {/* Disturbance Components Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Environmental Force Decomposition &amp; ADCS Sizing Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.adcsSufficient
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.adcsSufficient ? "MOMENTUM STORAGE CLEARED" : "FREQUENT DESATURATION REQUIRED"}
                </span>
              </div>

              {/* Three Force Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                    <Globe className="w-3 h-3 text-cyan-400" /> GRAVITY GRADIENT
                  </div>
                  <div className="text-xl font-bold text-white">{metrics.tGgMicroNm} µN&middot;m</div>
                  <div className="text-[10px] text-slate-400">Tends toward local nadir</div>
                </div>

                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                    <Wind className="w-3 h-3 text-purple-400" /> AERODYNAMIC DRAG
                  </div>
                  <div className="text-xl font-bold text-white">{metrics.tAeroMicroNm} µN&middot;m</div>
                  <div className="text-[10px] text-slate-400">Velocity vector lever arm</div>
                </div>

                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" /> SOLAR RADIATION
                  </div>
                  <div className="text-xl font-bold text-white">{metrics.tSrpMicroNm} µN&middot;m</div>
                  <div className="text-[10px] text-slate-400">Sun-vector photon pressure</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">MOMENTUM ABSORPTION PROFILE</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  At {altitudeKm} km, the vehicle experiences <strong className="text-cyan-400">{metrics.tTotalRssMicroNm} µN&middot;m</strong> of combined environmental disturbance torque. 
                  Across each {metrics.orbitPeriodMin}-minute orbit, secular integration deposits <strong className="text-purple-400">{metrics.momentumPerOrbitNms} N&middot;m&middot;s</strong> into the reaction wheels, consuming storage headroom over <strong className="text-white">{metrics.orbitsToSaturation} orbits ({metrics.hoursToSaturation} hours)</strong>.
                  {!metrics.adcsSufficient && (
                    <span className="text-red-400 block mt-1">
                      ADCS capacity warning: Wheel saturation occurs in under 4 orbits. Increase reaction wheel capacity or schedule continuous magnetorquer desaturation during high-field geomagnetic passes to avoid attitude loss.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Dominant Disturbance Regime</span>
                  <span className="text-white font-bold">
                    {metrics.tAeroMicroNm > metrics.tGgMicroNm && metrics.tAeroMicroNm > metrics.tSrpMicroNm
                      ? "Aerodynamic Drag Dominant"
                      : metrics.tGgMicroNm > metrics.tSrpMicroNm
                      ? "Gravity Gradient Dominant"
                      : "Solar Radiation Pressure Dominant"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Secular Momentum Dump Interval</span>
                  <span className="text-cyan-400 font-bold">Every {metrics.hoursToSaturation} hours</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Reaction Wheel Storage Headroom</span>
                  <span className={`font-bold ${metrics.adcsSufficient ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.orbitsToSaturation} Orbits (Recommended: &ge; 4 Orbits)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">ADCS Environmental Sizing Verdict</span>
                  <span className={`font-bold ${metrics.adcsSufficient ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.adcsSufficient ? "PASS (ADEQUATE MOMENTUM MARGIN)" : "FAIL (INCREASE WHEEL SIZE / DESAT FREQUENCY)"}
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
