"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Rocket, 
  Orbit, 
  Sun, 
  BatteryCharging, 
  Thermometer, 
  Fuel, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  ArrowRight, 
  Zap, 
  Activity, 
  Sliders, 
  RefreshCw,
  Cpu,
  Radio,
  Globe
} from "lucide-react"

interface MissionArchetype {
  name: string
  tagline: string
  orbitAltitudeKm: number
  inclinationDeg: number
  dryMassKg: number
  payloadRfPowerW: number
  busBasePowerW: number
  payloadDutyCyclePct: number
  specificImpulseIspSec: number
  shieldingMm: number
  dragAreaM2: number
  description: string
}

const ARCHETYPES: Record<string, MissionArchetype> = {
  sso_radar_imaging: {
    name: "Dawn-Dusk Sun-Sync SAR Radar Bus",
    tagline: "High-power X-Band phased array SAR imaging platform",
    orbitAltitudeKm: 550,
    inclinationDeg: 97.6,
    dryMassKg: 420,
    payloadRfPowerW: 650,
    busBasePowerW: 180,
    payloadDutyCyclePct: 20,
    specificImpulseIspSec: 220, // Hydrazine monoprop
    shieldingMm: 3.5,
    dragAreaM2: 3.2,
    description: "Operates in a 550 km Sun-Synchronous Orbit with high peak power demands during radar illumination passes.",
  },
  commercial_iot_constellation: {
    name: "LEO Mega-Constellation Broadband Node",
    tagline: "High-throughput Ka-Band communication node",
    orbitAltitudeKm: 620,
    inclinationDeg: 53.0,
    dryMassKg: 210,
    payloadRfPowerW: 320,
    busBasePowerW: 120,
    payloadDutyCyclePct: 55,
    specificImpulseIspSec: 1650, // Krypton/Xenon Hall thruster
    shieldingMm: 2.5,
    dragAreaM2: 1.6,
    description: "Mid-inclination commercial constellation utilizing high-Isp electric propulsion for orbit maintenance and de-orbit.",
  },
  deep_space_lunar_relay: {
    name: "Cislunar Polar Communications Relay",
    tagline: "Autonomous Gateway telecom and tracking station",
    orbitAltitudeKm: 1800, // High-altitude radiation traversal
    inclinationDeg: 90.0,
    dryMassKg: 680,
    payloadRfPowerW: 240,
    busBasePowerW: 220,
    payloadDutyCyclePct: 90,
    specificImpulseIspSec: 310, // Bi-propellant MMH/NTO
    shieldingMm: 6.0,
    dragAreaM2: 5.0,
    description: "Extended mission life requiring thick radiation shielding and robust autonomous chemical propulsion reserves.",
  },
}

export default function MissionBuilderPage() {
  const [selectedKey, setSelectedKey] = useState<string>("sso_radar_imaging")
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(97.6)
  const [dryMassKg, setDryMassKg] = useState<number>(420)
  const [payloadRfPowerW, setPayloadRfPowerW] = useState<number>(650)
  const [busBasePowerW, setBusBasePowerW] = useState<number>(180)
  const [dutyCyclePct, setDutyCyclePct] = useState<number>(20)
  const [ispSec, setIspSec] = useState<number>(220)
  const [shieldingMm, setShieldingMm] = useState<number>(3.5)
  const [dragAreaM2, setDragAreaM2] = useState<number>(3.2)

  const activeArchetype = ARCHETYPES[selectedKey]

  const applyArchetype = (key: string) => {
    const a = ARCHETYPES[key]
    setSelectedKey(key)
    setAltitudeKm(a.orbitAltitudeKm)
    setInclinationDeg(a.inclinationDeg)
    setDryMassKg(a.dryMassKg)
    setPayloadRfPowerW(a.payloadRfPowerW)
    setBusBasePowerW(a.busBasePowerW)
    setDutyCyclePct(a.payloadDutyCyclePct)
    setIspSec(a.specificImpulseIspSec)
    setShieldingMm(a.shieldingMm)
    setDragAreaM2(a.dragAreaM2)
  }

  // Cross-Disciplinary Integrated Concurrent Engineering Model
  const mission = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418 // km3/s2
    const g0 = 9.80665 // m/s2

    // 1. Orbital Kinematics
    const rOrbKm = rEarthKm + altitudeKm
    const rOrbM = rOrbKm * 1000
    const vOrbMS = Math.sqrt((mu * 1e9) / rOrbM)
    const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbM, 3) / (mu * 1e9))
    const orbitPeriodMin = Math.round((orbitPeriodSec / 60) * 10) / 10

    // Maximum Eclipse Duration (spherical geometry)
    const angularRadiusEarth = Math.asin(rEarthKm / rOrbKm)
    const fractionInEclipse = angularRadiusEarth / Math.PI
    const maxEclipseDurationMin = Math.round((fractionInEclipse * orbitPeriodMin) * 10) / 10
    const sunlitDurationMin = Math.max(1, Math.round((orbitPeriodMin - maxEclipseDurationMin) * 10) / 10)

    // 2. Power & Electrical Energy Balance
    // Transmitter efficiency ~ 45% DC-to-RF
    const payloadDcPowerW = payloadRfPowerW / 0.45
    const avgPayloadPowerW = payloadDcPowerW * (dutyCyclePct / 100)
    const totalAvgPowerDemandW = Math.round(busBasePowerW + avgPayloadPowerW)

    // Battery Capacity Sizing:
    // Energy in eclipse = TotalPower * (EclipseHours)
    // Sized for max 25% Depth-of-Discharge (DoD) to ensure 50,000+ LEO cycles
    const eclipseEnergyWh = totalAvgPowerDemandW * (maxEclipseDurationMin / 60)
    const targetDod = 0.25
    const batteryCapacityWh = Math.round(eclipseEnergyWh / targetDod)
    const batteryMassKg = Math.round((batteryCapacityWh / 160) * 10) / 10 // 160 Wh/kg space Li-ion

    // Solar Array Sizing:
    // P_array must power the spacecraft in sunlight AND recharge the battery
    const rechargePowerW = (eclipseEnergyWh / (sunlitDurationMin / 60)) * 1.15 // 15% charge inefficiency
    const totalSolarPowerRequiredW = Math.round(totalAvgPowerDemandW + rechargePowerW)
    // Triple-junction GaAs cell efficiency ~ 30%, 1361 W/m2 solar constant, packing 80%
    const solarArrayAreaM2 = Math.round((totalSolarPowerRequiredW / (1361 * 0.30 * 0.80)) * 100) / 100

    // 3. Thermal Waste Heat & Two-Phase Radiator Rejection
    // Waste heat = Total power not radiated out as RF
    const thermalWasteHeatW = Math.round(totalAvgPowerDemandW - payloadRfPowerW * (dutyCyclePct / 100))
    // Radiator area at 310 K emitting to 180 K sink (eps = 0.88, eta_fin = 0.90)
    const sigma = 5.67e-8
    const radDenom = 0.88 * 0.90 * sigma * (Math.pow(310, 4) - Math.pow(180, 4))
    const requiredRadiatorAreaM2 = Math.round((thermalWasteHeatW / radDenom) * 100) / 100

    // 4. Mission Delta-V Budget & Propellant Sizing
    // Orbit maintenance (~20 m/s/yr for 5 yrs) + Attitude dumping (15 m/s) + De-orbit burn
    const maintenanceDeltaV = Math.min(250, Math.round(15 + 20 * Math.max(1, 5 - altitudeKm / 200)))
    // Controlled De-orbit burn to 50 km perigee
    const rPerigeeKm = rEarthKm + 50
    const vCircKmS = vOrbMS / 1000
    const vTransApogeeKmS = Math.sqrt(mu * (2 / rOrbKm - 1 / ((rOrbKm + rPerigeeKm) / 2)))
    const deorbitDeltaVMs = Math.round(Math.abs(vCircKmS - vTransApogeeKmS) * 1000)

    const totalMissionDeltaVMs = maintenanceDeltaV + deorbitDeltaVMs

    // Tsiolkovsky Propellant Mass Sizing:
    // m_prop = m_dry * (exp(Delta_V / (Isp * g0)) - 1)
    const massRatio = Math.exp(totalMissionDeltaVMs / (ispSec * g0))
    const propellantMassKg = Math.round((dryMassKg * (massRatio - 1)) * 10) / 10
    const wetMassKg = Math.round((dryMassKg + propellantMassKg) * 10) / 10

    // 5. Environmental Radiation & Orbit Disposal
    // Trapped radiation dose through Al shielding
    const annualDoseKrad = Math.round((4.5 * Math.exp(-shieldingMm / 2.6)) * 10) / 10
    const fiveYearTidKrad = Math.round(annualDoseKrad * 5 * 10) / 10

    // Ballistic Coefficient & Passive Decay
    const cd = 2.2
    const ballisticCoeff = Math.round((wetMassKg / (cd * Math.max(0.1, dragAreaM2))) * 10) / 10
    const passiveDecayYears = Math.min(
      350,
      Math.round(Math.pow(altitudeKm / 400, 4.8) * (ballisticCoeff / 60) * 1.8 * 10) / 10
    )
    const fcc5YearPassed = passiveDecayYears <= 5.0

    // Launch Mass Margin check against standard ESPA ring 450 kg slot
    const launchLimitKg = 450
    const launchMassMarginPct = Math.round(((launchLimitKg - wetMassKg) / launchLimitKg) * 100)

    return {
      orbitPeriodMin,
      maxEclipseDurationMin,
      sunlitDurationMin,
      totalAvgPowerDemandW,
      batteryCapacityWh,
      batteryMassKg,
      totalSolarPowerRequiredW,
      solarArrayAreaM2,
      thermalWasteHeatW,
      requiredRadiatorAreaM2,
      deorbitDeltaVMs,
      totalMissionDeltaVMs,
      propellantMassKg,
      wetMassKg,
      fiveYearTidKrad,
      ballisticCoeff,
      passiveDecayYears,
      fcc5YearPassed,
      launchMassMarginPct,
    }
  }, [altitudeKm, dryMassKg, payloadRfPowerW, busBasePowerW, dutyCyclePct, ispSec, shieldingMm, dragAreaM2])

  const exportMissionArchitecture = () => {
    const csv = `VEROYX CONCURRENT ENGINEERING MISSION ARCHITECTURE
Platform Architecture,${activeArchetype.name}
Mission Profile,${activeArchetype.tagline}
Target Orbit Altitude,${altitudeKm} km (Inclination: ${inclinationDeg} deg)
Orbital Period,${mission.orbitPeriodMin} minutes (Max Eclipse: ${mission.maxEclipseDurationMin} min)
Spacecraft Dry Mass,${dryMassKg} kg
Propellant Sizing (Isp = ${ispSec} s),${mission.propellantMassKg} kg
Total Spacecraft Launch Wet Mass,${mission.wetMassKg} kg (ESPA Margin: ${mission.launchMassMarginPct}%)
Total Average Electrical Power Demand,${mission.totalAvgPowerDemandW} Watts
Battery Energy Storage (25% DoD Limit),${mission.batteryCapacityWh} Wh (${mission.batteryMassKg} kg battery pack)
Solar Array Power Generation Required,${mission.totalSolarPowerRequiredW} Watts (${mission.solarArrayAreaM2} m2 Triple-Junction)
Thermal Waste Heat Rejection,${mission.thermalWasteHeatW} Watts
Radiator Area Required (Two-Phase CCHP),${mission.requiredRadiatorAreaM2} m2
Total Mission Delta-V Sizing,${mission.totalMissionDeltaVMs} m/s (Stationkeeping + ${mission.deorbitDeltaVMs} m/s De-Orbit)
Cumulative 5-Year Radiation Dose,${mission.fiveYearTidKrad} krad(Si) through ${shieldingMm} mm Al
Passive Atmospheric Decay Lifetime,${mission.passiveDecayYears} years
FCC 5-Year Disposal Rule Compliance,${mission.fcc5YearPassed ? "COMPLIANT (PASSIVE DRAG)" : "CONTROLLED PROPULSION DISPOSAL REQUIRED"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-mission-architecture-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Rocket className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Veroyx Master Concurrent Engineering Mission Architecture
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              UNIFIED MISSION ARCHITECTURE
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Integrated cross-disciplinary mission model coupling orbital mechanics, RF power, solar array sizing, battery DoD, two-phase thermal rejection, Tsiolkovsky propellant mass, and 5-year FCC disposal compliance.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportMissionArchitecture}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT MISSION DOSSIER
            </button>
          </div>
        </div>

        {/* Mission Archetype Switcher */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(ARCHETYPES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyArchetype(k)}
              className={`px-4 py-2.5 rounded-xl border transition-all text-left ${
                selectedKey === k
                  ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-300 font-bold shadow-lg shadow-cyan-950/30"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="text-white font-bold">{v.name}</div>
              <div className="text-[10px] text-slate-400 font-normal">{v.tagline}</div>
            </button>
          ))}
        </div>

        {/* Global Key Parameter KPI Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Rocket className="w-3 h-3 text-cyan-400" /> WET MASS
            </div>
            <div className="text-2xl font-black text-white">{mission.wetMassKg} kg</div>
            <div className="text-[10px] text-slate-400">+{mission.propellantMassKg} kg Propellant</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> POWER DEMAND
            </div>
            <div className="text-2xl font-black text-amber-400">{mission.totalAvgPowerDemandW} W</div>
            <div className="text-[10px] text-slate-400">Avg Orbit Consumption</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <BatteryCharging className="w-3 h-3 text-emerald-400" /> BATTERY PACK
            </div>
            <div className="text-2xl font-black text-emerald-400">{mission.batteryCapacityWh} Wh</div>
            <div className="text-[10px] text-slate-400">25% DoD in {mission.maxEclipseDurationMin}m Eclipse</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Sun className="w-3 h-3 text-purple-400" /> SOLAR ARRAY
            </div>
            <div className="text-2xl font-black text-purple-400">{mission.solarArrayAreaM2} m²</div>
            <div className="text-[10px] text-slate-400">{mission.totalSolarPowerRequiredW} W Peak Output</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-rose-400" /> RADIATOR AREA
            </div>
            <div className="text-2xl font-black text-rose-400">{mission.requiredRadiatorAreaM2} m²</div>
            <div className="text-[10px] text-slate-400">{mission.thermalWasteHeatW} W Waste Heat</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Fuel className="w-3 h-3 text-blue-400" /> DELTA-V BUDGET
            </div>
            <div className="text-2xl font-black text-blue-400">{mission.totalMissionDeltaVMs} m/s</div>
            <div className="text-[10px] text-slate-400">Inc. {mission.deorbitDeltaVMs} m/s De-Orbit</div>
          </div>
        </div>

        {/* Master Two-Column Interactive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Left Column: Mission Control & Subsystem Sizing Sliders */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              System Constraint Controls
            </div>

            {/* Orbit Altitude Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">ORBIT ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={300}
                max={1200}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 km (VLEO)</span>
                <span>Period: {mission.orbitPeriodMin}m</span>
                <span>1200 km</span>
              </div>
            </div>

            {/* Dry Mass */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">SPACECRAFT DRY MASS</label>
                <span className="text-white font-bold">{dryMassKg} KG</span>
              </div>
              <input
                type="range"
                min={50}
                max={1500}
                step={25}
                value={dryMassKg}
                onChange={(e) => setDryMassKg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* RF Transmitter Power & Duty Cycle */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">PAYLOAD RF (W)</label>
                <input
                  type="number"
                  step={25}
                  value={payloadRfPowerW}
                  onChange={(e) => setPayloadRfPowerW(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DUTY CYCLE (%)</label>
                <input
                  type="number"
                  step={5}
                  value={dutyCyclePct}
                  onChange={(e) => setDutyCyclePct(Math.max(5, Math.min(100, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Propulsion Specific Impulse (Isp) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">PROPULSION ISP</label>
                <span className="text-blue-400 font-bold">{ispSec} SEC</span>
              </div>
              <input
                type="range"
                min={180}
                max={2200}
                step={20}
                value={ispSec}
                onChange={(e) => setIspSec(Number(e.target.value))}
                className="w-full accent-blue-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>220s (Hydrazine)</span>
                <span>310s (Biprop)</span>
                <span>1650s (EP)</span>
              </div>
            </div>

            {/* Shielding & Drag Area */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SHIELDING (mm Al)</label>
                <input
                  type="number"
                  step={0.5}
                  value={shieldingMm}
                  onChange={(e) => setShieldingMm(Math.max(0.5, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DRAG AREA (m²)</label>
                <input
                  type="number"
                  step={0.1}
                  value={dragAreaM2}
                  onChange={(e) => setDragAreaM2(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">CONCURRENT COUPLING:</strong>
              Modifying payload RF power or duty cycle dynamically recalculates solar array area, battery Wh, radiator square meters, and wet mass simultaneously.
            </div>
          </div>

          {/* Right Column: Subsystem Deep Integration Cards */}
          <div className="lg:col-span-2 space-y-6">

            {/* Launch Envelope & Mass Compliance */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  Launch Mass Budget &amp; Adapter Fitment
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  mission.launchMassMarginPct >= 0
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {mission.launchMassMarginPct >= 0 ? "ESPA 450 KG COMPLIANT" : "OVERWEIGHT / DUAL SLOT REQUIRED"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">DRY STRUCTURE</div>
                  <div className="text-lg font-bold text-white">{dryMassKg} kg</div>
                  <div className="text-[10px] text-slate-400">Payload + Avionics + Bus</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">PROPELLANT LOAD</div>
                  <div className="text-lg font-bold text-blue-400">{mission.propellantMassKg} kg</div>
                  <div className="text-[10px] text-slate-400">Isp {ispSec}s / Delta-V {mission.totalMissionDeltaVMs} m/s</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">LAUNCH MARGIN</div>
                  <div className={`text-lg font-bold ${mission.launchMassMarginPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {mission.launchMassMarginPct}%
                  </div>
                  <div className="text-[10px] text-slate-400">Against 450 kg ESPA Slot</div>
                </div>
              </div>
            </div>

            {/* Power, Battery & Thermal Coupling */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Coupled Power-Thermal Architecture
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 uppercase">
                  ECSS-E-ST-20-30C &amp; ECSS-E-ST-31C
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  At <strong className="text-white">{altitudeKm} km</strong>, each orbit lasts <strong className="text-white">{mission.orbitPeriodMin} minutes</strong> with up to <strong className="text-amber-400">{mission.maxEclipseDurationMin} minutes of shadow</strong>. 
                  Continuous operation requires a <strong className="text-emerald-400">{mission.batteryCapacityWh} Wh ({mission.batteryMassKg} kg)</strong> battery pack to preserve long-term battery cell health within the 25% DoD threshold.
                </p>
                <p>
                  During sunlight, the <strong className="text-purple-400">{mission.solarArrayAreaM2} m²</strong> solar array produces <strong className="text-white">{mission.totalSolarPowerRequiredW} W</strong> to power operations and replenish the battery. 
                  Dissipating <strong className="text-rose-400">{mission.thermalWasteHeatW} W</strong> of waste heat requires <strong className="text-cyan-400">{mission.requiredRadiatorAreaM2} m²</strong> of external two-phase radiator area.
                </p>
              </div>
            </div>

            {/* Mission Assurance & Regulatory Compliance */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Regulatory &amp; Mission Assurance Clearance
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  mission.fcc5YearPassed
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-cyan-950 border-cyan-500/40 text-cyan-300"
                }`}>
                  {mission.fcc5YearPassed ? "PASSIVE FCC 5-YR PASS" : "CONTROLLED DE-ORBIT REQUIRED"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Passive Atmospheric Orbit Decay</span>
                  <span className={`font-bold ${mission.fcc5YearPassed ? "text-emerald-400" : "text-amber-400"}`}>
                    {mission.passiveDecayYears} Years ({mission.fcc5YearPassed ? "Under 5-Year Rule" : "Exceeds 5-Year Threshold"})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Dedicated EOL De-Orbit Delta-V</span>
                  <span className="text-white font-bold">{mission.deorbitDeltaVMs} m/s (Targets 50 km Perigee Entry)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">5-Year Radiation Total Ionizing Dose (TID)</span>
                  <span className="text-cyan-400 font-bold">{mission.fiveYearTidKrad} krad(Si) through {shieldingMm}mm Al</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Integrated Spacecraft Sizing Clearance</span>
                  <span className="text-emerald-400 font-bold">ALL SUBSYSTEM COUPLINGS CONVERGED</span>
                </div>
              </div>

              {/* Direct Jump Links to Deep Simulators */}
              <div className="pt-2 flex flex-wrap gap-2 text-[10px]">
                <Link href="/two-phase" className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center gap-1">
                  Tune Radiator (/two-phase) <ArrowRight className="w-2.5 h-2.5" />
                </Link>
                <Link href="/battery" className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center gap-1">
                  Refine Battery (/battery) <ArrowRight className="w-2.5 h-2.5" />
                </Link>
                <Link href="/decay" className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center gap-1">
                  Inspect EOL Decay (/decay) <ArrowRight className="w-2.5 h-2.5" />
                </Link>
                <Link href="/prop-tank" className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center gap-1">
                  Size Prop Tank (/prop-tank) <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
