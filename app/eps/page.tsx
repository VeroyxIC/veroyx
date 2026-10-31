"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Zap, 
  BatteryCharging, 
  Sun, 
  Activity, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Sliders, 
  Layers, 
  TrendingUp, 
  Cpu 
} from "lucide-react"

interface EpsPreset {
  name: string
  busType: "Regulated 28V (MPPT Converter)" | "Unregulated DET (Battery-Tied 22-34V)" | "High-Voltage Regulated 100V (High Power)"
  orbitPeriodMin: number
  eclipseDurationMin: number
  sunlightDurationMin: number
  nominalBusVoltageV: number
  avgSunlightLoadW: number
  avgEclipseLoadW: number
  peakPulseLoadW: number
  arrayTempC: number
  stringCount: number
  cellsPerString: number
  description: string
}

const EPS_PRESETS: Record<string, EpsPreset> = {
  regulated_28v_cubesat: {
    name: "Regulated 28V MPPT Earth Observer",
    busType: "Regulated 28V (MPPT Converter)",
    orbitPeriodMin: 95.5,
    eclipseDurationMin: 35.5,
    sunlightDurationMin: 60.0,
    nominalBusVoltageV: 28.0,
    avgSunlightLoadW: 140,
    avgEclipseLoadW: 110,
    peakPulseLoadW: 320,
    arrayTempC: 65,
    stringCount: 8,
    cellsPerString: 18,
    description: "Peak-power tracking 28V architecture isolating imaging payloads from battery terminal discharge curves.",
  },
  unregulated_det_comm: {
    name: "Direct Energy Transfer (DET) SmallSat Bus",
    busType: "Unregulated DET (Battery-Tied 22-34V)",
    orbitPeriodMin: 97.0,
    eclipseDurationMin: 36.0,
    sunlightDurationMin: 61.0,
    nominalBusVoltageV: 28.0,
    avgSunlightLoadW: 240,
    avgEclipseLoadW: 190,
    peakPulseLoadW: 450,
    arrayTempC: 75,
    stringCount: 14,
    cellsPerString: 16,
    description: "High-efficiency unregulated bus clamping directly across battery cells to eliminate converter mass.",
  },
  high_power_100v_radar: {
    name: "High-Voltage 100V Phased Array Radar",
    busType: "High-Voltage Regulated 100V (High Power)",
    orbitPeriodMin: 96.0,
    eclipseDurationMin: 35.0,
    sunlightDurationMin: 61.0,
    nominalBusVoltageV: 100.0,
    avgSunlightLoadW: 1850,
    avgEclipseLoadW: 650,
    peakPulseLoadW: 3800,
    arrayTempC: 60,
    stringCount: 32,
    cellsPerString: 64,
    description: "100V high-voltage bus minimizing harness I2R ohmic losses during high-current radar pulses.",
  },
}

export default function EpsSimulatorPage() {
  const [selectedKey, setSelectedKey] = useState<string>("regulated_28v_cubesat")
  const [busVoltageV, setBusVoltageV] = useState<number>(28.0)
  const [sunlightLoadW, setSunlightLoadW] = useState<number>(140)
  const [eclipseLoadW, setEclipseLoadW] = useState<number>(110)
  const [arrayTempC, setArrayTempC] = useState<number>(65)
  const [stringCount, setStringCount] = useState<number>(8)
  const [cellsPerString, setCellsPerString] = useState<number>(18)

  const activePreset = EPS_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = EPS_PRESETS[key]
    setSelectedKey(key)
    setBusVoltageV(p.nominalBusVoltageV)
    setSunlightLoadW(p.avgSunlightLoadW)
    setEclipseLoadW(p.avgEclipseLoadW)
    setArrayTempC(p.arrayTempC)
    setStringCount(p.stringCount)
    setCellsPerString(p.cellsPerString)
  }

  // ECSS-E-ST-20C Electrical Power Subsystem & Solar Array Physics
  const metrics = useMemo(() => {
    // 1. Triple-Junction Solar Cell Characteristics (ZTJ / 3G30A class)
    // Nominal STC at 25C: Voc = 2.70V, Vmp = 2.41V, Isc = 0.52A, Imp = 0.49A
    // Temperature coefficients: dVoc/dT = -6.2 mV/C, dIsc/dT = +0.32 mA/C
    const tempDelta = arrayTempC - 25
    const cellVmp = Math.max(1.8, 2.41 - (0.0062 * tempDelta))
    const cellImp = Math.max(0.3, 0.49 + (0.00032 * tempDelta))

    // Total Solar Array MPP Power
    const arrayVmpV = Math.round((cellVmp * cellsPerString) * 10) / 10
    const arrayImpA = Math.round((cellImp * stringCount) * 10) / 10
    const totalArrayPowerW = Math.round(arrayVmpV * arrayImpA)

    // 2. Battery Energy Consumption in Eclipse
    const eclipseEnergyWh = Math.round((eclipseLoadW * (activePreset.eclipseDurationMin / 60)) * 10) / 10

    // 3. Battery Recharge Power Requirement in Sunlight
    // Charge efficiency eta_charge ~ 92%, converter efficiency eta_conv ~ 95%
    const etaCharge = 0.92
    const etaConv = activePreset.busType.includes("MPPT") ? 0.95 : 0.98
    const requiredRechargePowerW = Math.round(((eclipseEnergyWh / (activePreset.sunlightDurationMin / 60)) / etaCharge) * 10) / 10

    // Total Power Required during Sunlight (Daytime Loads + Battery Charging)
    const totalSunlightDemandW = Math.round(sunlightLoadW + requiredRechargePowerW)

    // Power Margin (Available Array Power vs Required Demand)
    const powerMarginW = Math.round(totalArrayPowerW * etaConv - totalSunlightDemandW)
    const powerMarginPct = Math.round((powerMarginW / Math.max(1, totalSunlightDemandW)) * 100)
    const powerPositive = powerMarginW >= 0

    // 4. Battery C-Rate Charge Speed
    // Sized for 25% DoD: Battery capacity = eclipseEnergyWh / 0.25
    const batteryCapacityWh = Math.round(eclipseEnergyWh / 0.25)
    const batteryCapacityAh = Math.round((batteryCapacityWh / busVoltageV) * 10) / 10
    const chargeCurrentA = Math.round((requiredRechargePowerW / busVoltageV) * 10) / 10
    const cRate = Math.round((chargeCurrentA / Math.max(0.5, batteryCapacityAh)) * 100) / 100
    const cRateSafe = cRate <= 0.50 // Max C/2 charge rate for long LEO cycle life

    // 5. Bus Current at Nominal Voltage
    const busCurrentSunlightA = Math.round((sunlightLoadW / busVoltageV) * 10) / 10
    const busCurrentEclipseA = Math.round((eclipseLoadW / busVoltageV) * 10) / 10

    return {
      cellVmp: cellVmp.toFixed(2),
      arrayVmpV,
      arrayImpA,
      totalArrayPowerW,
      eclipseEnergyWh,
      requiredRechargePowerW,
      totalSunlightDemandW,
      powerMarginW,
      powerMarginPct,
      powerPositive,
      batteryCapacityWh,
      batteryCapacityAh,
      chargeCurrentA,
      cRate,
      cRateSafe,
      busCurrentSunlightA,
      busCurrentEclipseA,
    }
  }, [busVoltageV, sunlightLoadW, eclipseLoadW, arrayTempC, stringCount, cellsPerString, activePreset])

  const exportEpsCSV = () => {
    const csv = `SPACECRAFT ELECTRICAL POWER SYSTEM (EPS) SIZING DOSSIER
System Preset,${activePreset.name}
EPS Architecture,${activePreset.busType}
Nominal Bus Voltage,${busVoltageV} V
Orbit Parameters,${activePreset.orbitPeriodMin} min period (${activePreset.sunlightDurationMin}m sun / ${activePreset.eclipseDurationMin}m eclipse)
Solar Array Temperature,${arrayTempC} deg C
Solar Array Topology,${stringCount} strings x ${cellsPerString} series cells (${stringCount * cellsPerString} total cells)
Solar Array MPP Output,${metrics.totalArrayPowerW} W (${metrics.arrayVmpV} V @ ${metrics.arrayImpA} A)
Average Sunlight Bus Load,${sunlightLoadW} W (${metrics.busCurrentSunlightA} A)
Average Eclipse Bus Load,${eclipseLoadW} W (${metrics.busCurrentEclipseA} A)
Eclipse Energy Consumption,${metrics.eclipseEnergyWh} Wh
Battery Recharging Power Demand,${metrics.requiredRechargePowerW} W
Total Sunlight Power Requirement,${metrics.totalSunlightDemandW} W
Net Sunlight Power Balance,${metrics.powerMarginW > 0 ? "+" : ""}${metrics.powerMarginW} W (${metrics.powerMarginPct}% margin)
Battery Sizing (25% DoD Limit),${metrics.batteryCapacityWh} Wh (${metrics.batteryCapacityAh} Ah @ ${busVoltageV}V)
Battery Charge Current,${metrics.chargeCurrentA} A (C-rate: ${metrics.cRate}C)
EPS Power Balance Clearance,${metrics.powerPositive && metrics.cRateSafe ? "CLEARED (POSITIVE ENERGY BALANCE)" : "POWER DEFICIT RISK"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-eps-sizing-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Zap className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              ECSS-E-ST-20C Bus Regulation, MPPT &amp; Energy Balance Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ELECTRICAL POWER SYSTEM (EPS)
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model solar array I-V maximum power points, bus regulation topologies (28V/100V MPPT vs. DET), battery eclipse energy balances, and sunlight recharge C-rate constraints.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportEpsCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT EPS SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(EPS_PRESETS).map(([k, v]) => (
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
              <div className="text-[10px] text-slate-500">{v.nominalBusVoltageV}V · {v.busType}</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" /> ARRAY MPP OUTPUT
            </div>
            <div className="text-3xl font-black text-amber-400">{metrics.totalArrayPowerW} W</div>
            <div className="text-[10px] text-slate-400">{metrics.arrayVmpV} V @ {metrics.arrayImpA} A (@ {arrayTempC}&deg;C)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              {metrics.powerPositive ? (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              )}
              ENERGY BALANCE
            </div>
            <div className={`text-3xl font-black ${metrics.powerPositive ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.powerMarginW > 0 ? "+" : ""}{metrics.powerMarginW} W
            </div>
            <div className="text-[10px] text-slate-400">{metrics.powerMarginPct}% Sunlight Margin</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <BatteryCharging className="w-3 h-3 text-cyan-400" /> BATTERY STORAGE
            </div>
            <div className="text-3xl font-black text-cyan-400">{metrics.batteryCapacityWh} Wh</div>
            <div className="text-[10px] text-slate-400">{metrics.batteryCapacityAh} Ah (25% DoD Limit)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-400" /> RECHARGE RATE
            </div>
            <div className={`text-3xl font-black ${metrics.cRateSafe ? "text-white" : "text-amber-400"}`}>
              {metrics.cRate}C
            </div>
            <div className="text-[10px] text-slate-400">{metrics.chargeCurrentA} A in {activePreset.sunlightDurationMin}m sun</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Bus Architecture &amp; Solar Array
            </div>

            {/* Bus Voltage */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">NOMINAL BUS VOLTAGE</label>
                <span className="text-cyan-400 font-bold">{busVoltageV} V</span>
              </div>
              <input
                type="range"
                min={20}
                max={120}
                step={4}
                value={busVoltageV}
                onChange={(e) => setBusVoltageV(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>28V (Standard)</span>
                <span>50V (Mid-Power)</span>
                <span>100V (High-Power)</span>
              </div>
            </div>

            {/* Loads */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SUN LOAD (W)</label>
                <input
                  type="number"
                  step={10}
                  value={sunlightLoadW}
                  onChange={(e) => setSunlightLoadW(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">ECLIPSE LOAD (W)</label>
                <input
                  type="number"
                  step={10}
                  value={eclipseLoadW}
                  onChange={(e) => setEclipseLoadW(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Array Temperature */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">ARRAY TEMPERATURE</label>
                <span className="text-amber-400 font-bold">{arrayTempC}&deg;C</span>
              </div>
              <input
                type="range"
                min={-60}
                max={110}
                step={5}
                value={arrayTempC}
                onChange={(e) => setArrayTempC(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Cell Vmp: {metrics.cellVmp} V per cell</span>
            </div>

            {/* Strings and Cells */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">STRINGS</label>
                <input
                  type="number"
                  step={1}
                  value={stringCount}
                  onChange={(e) => setStringCount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">CELLS / STRING</label>
                <input
                  type="number"
                  step={2}
                  value={cellsPerString}
                  onChange={(e) => setCellsPerString(Math.max(4, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">ENERGY EQUILIBRIUM:</strong>
              Solar array output must supply the vehicle bus in sunlight while generating sufficient surplus power to fully restore battery state-of-charge before the next eclipse ingress.
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Power Balance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Orbital Energy Balance &amp; Power Budget
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.powerPositive && metrics.cRateSafe
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.powerPositive && metrics.cRateSafe ? "ENERGY BALANCE CLEARED" : "POWER DEFICIT RISK"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  Across the {activePreset.orbitPeriodMin}-minute orbit ({activePreset.sunlightDurationMin}m sun / {activePreset.eclipseDurationMin}m shadow), the payload consumes <strong className="text-white">{metrics.eclipseEnergyWh} Wh</strong> in eclipse. 
                  Replenishing this storage during sunlight requires allocating <strong className="text-amber-400">{metrics.requiredRechargePowerW} W ({metrics.chargeCurrentA} A @ {busVoltageV}V)</strong> at a safe charge rate of <strong className="text-white">{metrics.cRate}C</strong>.
                </p>
                <p>
                  Summed with daytime bus operations ({sunlightLoadW} W), total sunlight demand reaches <strong className="text-white">{metrics.totalSunlightDemandW} W</strong> against an available solar array output of <strong className="text-emerald-400">{metrics.totalArrayPowerW} W</strong>.
                  This secures a net power reserve of <strong className={metrics.powerPositive ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{metrics.powerMarginW > 0 ? "+" : ""}{metrics.powerMarginW} W ({metrics.powerMarginPct}%)</strong>.
                  {!metrics.powerPositive && (
                    <span className="text-red-400 block mt-1 font-bold">
                      Energy deficit hazard: Solar array is undersized to support daylight operations and recharge the battery simultaneously. Add solar strings or decrease non-critical payload duty cycle.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Solar Array Operating Voltage (V_mp)</span>
                  <span className="text-white font-bold">{metrics.arrayVmpV} V ({cellsPerString} cells in series)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Solar Array Operating Current (I_mp)</span>
                  <span className="text-amber-400 font-bold">{metrics.arrayImpA} A ({stringCount} parallel strings)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Battery Storage Sized (25% DoD)</span>
                  <span className="text-cyan-400 font-bold">{metrics.batteryCapacityWh} Wh ({metrics.batteryCapacityAh} Ah)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">EPS Power Subsystem Flight Clearance</span>
                  <span className={`font-bold ${metrics.powerPositive && metrics.cRateSafe ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.powerPositive && metrics.cRateSafe ? "PASS (POWER POSITIVE ACROSS ALL ORBITS)" : "FAIL (ARRAY OR CHARGE DEFICIT)"}
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
                <Link href="/power" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/power (Cells)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/battery" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/battery (DoD)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/thermal" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/thermal (Heat)</span>
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
