"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Thermometer, 
  Flame, 
  Snowflake, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Layers2,
  Cpu,
  Wind
} from "lucide-react"

interface TwoPhasePreset {
  name: string
  classType: string
  workingFluid: "Anhydrous Ammonia (NH3)" | "Propylene (Low-Temp LEO)" | "Distilled Water (High-Flux Processors)" | "Ethane (Cryogenic 180K)"
  pipeType: "Axially Grooved Aluminium CCHP" | "Sintered Powder Copper-Water" | "Loop Heat Pipe (LHP) with Evaporator"
  heatLoadW: number
  pipeLengthM: number
  evaporatorLengthMm: number
  outerDiameterMm: number
  sinkTempK: number
  condenserTempK: number
  description: string
}

const TWO_PHASE_PRESETS: Record<string, TwoPhasePreset> = {
  active_phased_array: {
    name: "SAR Radar Transmit/Receive GaN Tiles",
    classType: "High-Heat-Flux Payload",
    workingFluid: "Anhydrous Ammonia (NH3)",
    pipeType: "Axially Grooved Aluminium CCHP",
    heatLoadW: 450,
    pipeLengthM: 1.8,
    evaporatorLengthMm: 180,
    outerDiameterMm: 12.7, // 0.5 inch OD
    sinkTempK: 180, // LEO average sink
    condenserTempK: 315, // 42°C radiator
    description: "Axially grooved ammonia CCHPs embedded into honeycomb panels routing phased array waste heat to edge radiators.",
  },
  deep_space_lhp: {
    name: "Loop Heat Pipe Deployable Cryo Radiator",
    classType: "Deployable Thermal Loop",
    workingFluid: "Propylene (Low-Temp LEO)",
    pipeType: "Loop Heat Pipe (LHP) with Evaporator",
    heatLoadW: 180,
    pipeLengthM: 3.2,
    evaporatorLengthMm: 120,
    outerDiameterMm: 9.5,
    sinkTempK: 120, // Deep shadow sink
    condenserTempK: 255, // -18°C cold loop
    description: "Flexible smooth transport lines routing heat across deployment hinges to a sun-shielded deployable radiator panel.",
  },
  optical_bench_isothermal: {
    name: "Laser Transceiver Isothermal Heat Spreader",
    classType: "Precision Optical Payload",
    workingFluid: "Distilled Water (High-Flux Processors)",
    pipeType: "Sintered Powder Copper-Water",
    heatLoadW: 120,
    pipeLengthM: 0.6,
    evaporatorLengthMm: 80,
    outerDiameterMm: 8.0,
    sinkTempK: 230,
    condenserTempK: 325, // 52°C warm avionics deck
    description: "High-capillary sintered copper wicks providing sub-0.5°C thermal gradient spreading across laser diode benches.",
  },
}

export default function TwoPhaseThermalPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("active_phased_array")
  const [heatLoadW, setHeatLoadW] = useState<number>(450)
  const [pipeLengthM, setPipeLengthM] = useState<number>(1.8)
  const [outerDiameterMm, setOuterDiameterMm] = useState<number>(12.7)
  const [sinkTempK, setSinkTempK] = useState<number>(180)
  const [condenserTempK, setCondenserTempK] = useState<number>(315)
  const [evaporatorMm, setEvaporatorMm] = useState<number>(180)

  const preset = TWO_PHASE_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = TWO_PHASE_PRESETS[key]
    setSelectedPresetKey(key)
    setHeatLoadW(p.heatLoadW)
    setPipeLengthM(p.pipeLengthM)
    setOuterDiameterMm(p.outerDiameterMm)
    setSinkTempK(p.sinkTempK)
    setCondenserTempK(p.condenserTempK)
    setEvaporatorMm(p.evaporatorLengthMm)
  }

  // NASA-STD-5001 & AIAA Two-Phase Capillary Heat Pipe Physics
  const metrics = useMemo(() => {
    // 1. Fluid Merit Number (Figure of Merit M in W/m2)
    // M = (rho_l * sigma * h_fg) / mu_l
    let fluidMeritMWCm2 = 42000 // Ammonia at 20°C
    let latHeatKjKg = 1200
    if (preset.workingFluid.includes("Propylene")) {
      fluidMeritMWCm2 = 18500
      latHeatKjKg = 360
    } else if (preset.workingFluid.includes("Water")) {
      fluidMeritMWCm2 = 68000
      latHeatKjKg = 2400
    } else if (preset.workingFluid.includes("Ethane")) {
      fluidMeritMWCm2 = 9200
      latHeatKjKg = 480
    }

    // 2. Maximum Capillary Pumping Heat Transport Limit (Q_max in Watts)
    // Q_max * L_eff = (2 * sigma / r_pore) * (K * A_w * h_fg / (nu_l))
    // Approximate empirically:
    const leffM = pipeLengthM - 0.5 * (evaporatorMm / 1000)
    const baseQLimitWattM = (fluidMeritMWCm2 / 100) * Math.pow(outerDiameterMm / 12.7, 1.8)
    const capillaryLimitW = Math.round(baseQLimitWattM / Math.max(0.2, leffM))

    // Capillary Margin Ratio = Q_max / Q_actual
    const capillaryRatio = Math.round((capillaryLimitW / Math.max(1, heatLoadW)) * 100) / 100
    const capillarySafe = capillaryRatio >= 1.5 // Standard 1.5x flight margin against dryout

    // 3. Boiling Limit at Evaporator (Watts)
    // Nucleate boiling bubble formation in wick
    const evaporatorAreaCm2 = Math.PI * (outerDiameterMm / 10) * (evaporatorMm / 10)
    const maxHeatFluxWCm2 = Math.round((heatLoadW / Math.max(1, evaporatorAreaCm2)) * 10) / 10
    const criticalBoilingFluxWCm2 = preset.workingFluid.includes("Water") ? 25.0 : 12.0
    const boilingSafe = maxHeatFluxWCm2 <= criticalBoilingFluxWCm2

    // 4. Effective Thermal Conductance & End-to-End Temperature Drop (Delta T)
    // Two-phase effective thermal conductivity k_eff ~ 15,000 to 45,000 W/m*K
    const deltaTThermalK = Math.round(((heatLoadW * leffM) / (32000 * (Math.PI * Math.pow(outerDiameterMm / 2000, 2)))) * 10) / 10
    const evaporatorTempK = condenserTempK + deltaTThermalK

    // 5. Radiator Rejection Area Sizing (m2)
    // Q_rad = eps * sigma * eta_fin * A_rad * (T_cond^4 - T_sink^4)
    const sigma = 5.67e-8
    const epsRad = 0.88 // White paint / optical solar reflector (OSR)
    const etaFin = 0.88 // Heat pipe embedded fin effectiveness
    const denom = epsRad * sigma * etaFin * (Math.pow(condenserTempK, 4) - Math.pow(sinkTempK, 4))
    const requiredRadiatorAreaM2 = Math.round((heatLoadW / Math.max(1, denom)) * 100) / 100

    return {
      leffM: leffM.toFixed(2),
      capillaryLimitW,
      capillaryRatio,
      capillarySafe,
      maxHeatFluxWCm2,
      criticalBoilingFluxWCm2,
      boilingSafe,
      deltaTThermalK,
      evaporatorTempK,
      requiredRadiatorAreaM2,
    }
  }, [heatLoadW, pipeLengthM, outerDiameterMm, sinkTempK, condenserTempK, evaporatorMm, preset])

  const exportTwoPhaseCSV = () => {
    const csv = `SPACECRAFT TWO-PHASE HEAT TRANSPORT & RADIATOR SIZING SPEC
Preset Application,${preset.name}
Class,${preset.classType}
Working Two-Phase Fluid,${preset.workingFluid}
Heat Pipe Architecture,${preset.pipeType}
Thermal Heat Load,${heatLoadW} Watts
Total Heat Transport Length,${pipeLengthM} meters (Effective Leff: ${metrics.leffM} m)
Heat Pipe Outer Diameter,${outerDiameterMm} mm
Evaporator Length,${evaporatorMm} mm
Evaporator Heat Flux,${metrics.maxHeatFluxWCm2} W/cm2 (Boiling Limit: ${metrics.criticalBoilingFluxWCm2} W/cm2)
Capillary Transport Limit (Q_max),${metrics.capillaryLimitW} Watts
Capillary Safety Ratio,${metrics.capillaryRatio}x (Req: >= 1.50x)
Capillary Dryout Status,${metrics.capillarySafe ? "CLEARED (NO DRYOUT)" : "CAPILLARY WICK DRYOUT RISK"}
End-to-End Thermal Drop (Delta-T),${metrics.deltaTThermalK} K (Evaporator: ${metrics.evaporatorTempK} K)
Space Radiative Sink Temp,${sinkTempK} K
Radiator Condenser Temp,${condenserTempK} K
Required Radiator Rejection Area,${metrics.requiredRadiatorAreaM2} m2`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-two-phase-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Thermometer className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA-STD-5001 Heat Pipe Capillary Pumping &amp; Radiator Sizing Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              TWO-PHASE HEAT PIPES &amp; RADIATORS
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model axially grooved capillary pumping transport limits, nucleate boiling dryout thresholds, end-to-end isothermal $\Delta T$ drops, and space radiator rejection areas.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportTwoPhaseCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT THERMAL SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(TWO_PHASE_PRESETS).map(([k, v]) => (
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
              Thermal Load &amp; Pipe Geometry
            </div>

            {/* Heat Load */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">PAYLOAD HEAT DISSIPATION</label>
                <span className="text-cyan-400 font-bold">{heatLoadW} WATTS</span>
              </div>
              <input
                type="range"
                min={25}
                max={1200}
                step={25}
                value={heatLoadW}
                onChange={(e) => setHeatLoadW(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50 W (Avionics)</span>
                <span>450 W (Radar)</span>
                <span>1200 W (High-Power)</span>
              </div>
            </div>

            {/* Pipe Length & Diameter */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">PIPE LENGTH</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={pipeLengthM}
                    onChange={(e) => setPipeLengthM(Math.max(0.3, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">m</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">OUTER DIAMETER</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={outerDiameterMm}
                    onChange={(e) => setOuterDiameterMm(Math.max(4, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>
            </div>

            {/* Evaporator Length */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">EVAPORATOR SADDLE LENGTH</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={evaporatorMm}
                  onChange={(e) => setEvaporatorMm(Math.max(20, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">mm</span>
              </div>
              <span className="text-[10px] text-slate-500">Heat flux: {metrics.maxHeatFluxWCm2} W/cm²</span>
            </div>

            {/* Temperatures */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">CONDENSER (K)</label>
                <input
                  type="number"
                  value={condenserTempK}
                  onChange={(e) => setCondenserTempK(Math.max(150, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">{(condenserTempK - 273.15).toFixed(0)}&deg;C Radiator</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">SPACE SINK (K)</label>
                <input
                  type="number"
                  value={sinkTempK}
                  onChange={(e) => setSinkTempK(Math.max(4, Math.min(condenserTempK - 10, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">Deep space ~ 4-200K</span>
              </div>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">WORKING FLUID:</div>
              <p className="text-slate-300 font-mono text-[10px]">{preset.workingFluid}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.capillarySafe ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  CAPILLARY HEADROOM
                </div>
                <div className={`text-3xl font-black ${metrics.capillarySafe ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.capillaryRatio}x
                </div>
                <div className="text-[10px] text-slate-500">Limit: {metrics.capillaryLimitW}W (Req: &ge; 1.5x)</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Layers2 className="w-3 h-3 text-cyan-400" /> RADIATOR AREA REQ.
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.requiredRadiatorAreaM2} m²</div>
                <div className="text-[10px] text-slate-500">Rejects {heatLoadW}W @ {condenserTempK}K</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-purple-400" /> END-TO-END DELTA-T
                </div>
                <div className="text-3xl font-black text-white">{metrics.deltaTThermalK}&deg;C</div>
                <div className="text-[10px] text-purple-400">Evap: {metrics.evaporatorTempK} K ({(metrics.evaporatorTempK - 273.15).toFixed(1)}&deg;C)</div>
              </div>
            </div>

            {/* Two-Phase Transport Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  Capillary Wicking &amp; Radiator Sizing Assessment
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.capillarySafe && metrics.boilingSafe
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.capillarySafe && metrics.boilingSafe ? "THERMAL TRANSPORT CLEARED" : "CAPILLARY DRYOUT VIOLATION"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">HYDRODYNAMIC CAPILLARY BALANCE</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Transporting <strong className="text-white">{heatLoadW} Watts</strong> across an effective length of <strong className="text-white">{metrics.leffM} meters</strong> requires capillary pumping of liquid against vapor pressure drops.
                  The {preset.workingFluid} loop provides a maximum capillary capacity of <strong className="text-cyan-400">{metrics.capillaryLimitW} W</strong>, achieving a <strong className={metrics.capillarySafe ? "text-emerald-400" : "text-red-400"}>{metrics.capillaryRatio}x transport margin</strong>.
                  Radiative equilibrium at {condenserTempK} K to a {sinkTempK} K sink requires dedicating <strong className="text-white">{metrics.requiredRadiatorAreaM2} m²</strong> of external optical solar reflector (OSR) panels.
                  {!metrics.capillarySafe && (
                    <span className="text-red-400 block mt-1">
                      Wick dryout danger: Heat load exceeds or borders the capillary limit (&lt; 1.5x margin). Vapor pressure drop will stall liquid return, drying out the evaporator and causing rapid thermal runaway. Increase pipe outer diameter or add redundant parallel heat pipes.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Evaporator Radial Heat Flux</span>
                  <span className={`font-bold ${metrics.boilingSafe ? "text-white" : "text-red-400"}`}>
                    {metrics.maxHeatFluxWCm2} W/cm² (Boiling Limit: {metrics.criticalBoilingFluxWCm2} W/cm²)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Capillary Wicking Capacity Limit (Q_max)</span>
                  <span className="text-cyan-400 font-bold">{metrics.capillaryLimitW} Watts</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">End-to-End Isothermal Temperature Drop</span>
                  <span className="text-purple-400 font-bold">{metrics.deltaTThermalK} K (High Thermal Conductance)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Required Space Radiator Surface Area</span>
                  <span className="text-emerald-400 font-bold">{metrics.requiredRadiatorAreaM2} m² (eta_fin=0.88, eps=0.88)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Thermal Flight Qualification Status</span>
                  <span className={`font-bold ${metrics.capillarySafe && metrics.boilingSafe ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.capillarySafe && metrics.boilingSafe ? "PASS (CLEARED FOR HIGH-FLUX REJECTION)" : "FAIL (REVISE DIAMETER / PARALLEL PIPES)"}
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
