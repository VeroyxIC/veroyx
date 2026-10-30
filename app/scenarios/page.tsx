"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Compass, 
  Rocket, 
  Sun, 
  Radio, 
  Thermometer, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Layers, 
  Gauge, 
  ArrowRight,
  FileText,
  Activity
} from "lucide-react"

interface MissionArchetype {
  name: string
  client: string
  regime: "LEO" | "SSO" | "GEO"
  altitudeKm: number
  inclinationDeg: number
  vehicle: "falcon9" | "vulcan" | "electron" | "starship"
  busMassKg: number
  solarAreaM2: number
  rfBand: "Ka-Band" | "X-Band" | "S-Band"
  dataRateMbps: number
  internalHeatW: number
  description: string
}

const PRESET_SCENARIOS: Record<string, MissionArchetype> = {
  smallsat_recon: {
    name: "Tactical ISR Rapid-Revisit Constellation",
    client: "Defense Intelligence Agency (DIA)",
    regime: "SSO",
    altitudeKm: 500,
    inclinationDeg: 97.4,
    vehicle: "falcon9",
    busMassKg: 420,
    solarAreaM2: 3.5,
    rfBand: "X-Band",
    dataRateMbps: 300,
    internalHeatW: 320,
    description: "Rapid optical and SAR Earth observation constellation in Sun-Synchronous Orbit.",
  },
  broadband_mega: {
    name: "High-Throughput Global Broadband Shell",
    client: "Commercial Mega-Constellation",
    regime: "LEO",
    altitudeKm: 550,
    inclinationDeg: 53.0,
    vehicle: "falcon9",
    busMassKg: 1250,
    solarAreaM2: 18.0,
    rfBand: "Ka-Band",
    dataRateMbps: 1200,
    internalHeatW: 1800,
    description: "Next-gen direct-to-cell phased array comms satellite in mid-inclination low Earth orbit.",
  },
  geo_defense_relay: {
    name: "Strategic Nuclear Protected SATCOM Relay",
    client: "US Space Force (USSF)",
    regime: "GEO",
    altitudeKm: 35786,
    inclinationDeg: 0.0,
    vehicle: "vulcan",
    busMassKg: 4800,
    solarAreaM2: 42.0,
    rfBand: "Ka-Band",
    dataRateMbps: 450,
    internalHeatW: 6500,
    description: "Radiation-hardened geostationary sovereign relay bus with crosslinks and anti-jam antennas.",
  },
  dedicated_smallsat_iot: {
    name: "Dedicated IoT / AIS Low-Cost Mesh",
    client: "Maritime Domain Awareness",
    regime: "LEO",
    altitudeKm: 450,
    inclinationDeg: 45.0,
    vehicle: "electron",
    busMassKg: 65,
    solarAreaM2: 0.8,
    rfBand: "S-Band",
    dataRateMbps: 10,
    internalHeatW: 55,
    description: "Responsive smallsat mesh launched to precise orbital inclination on dedicated booster.",
  },
}

export default function MissionScenariosPage() {
  const [selectedKey, setSelectedKey] = useState<string>("smallsat_recon")
  const [regime, setRegime] = useState<"LEO" | "SSO" | "GEO">("SSO")
  const [altitudeKm, setAltitudeKm] = useState<number>(500)
  const [vehicle, setVehicle] = useState<string>("falcon9")
  const [busMassKg, setBusMassKg] = useState<number>(420)
  const [solarAreaM2, setSolarAreaM2] = useState<number>(3.5)
  const [rfBand, setRfBand] = useState<string>("X-Band")
  const [dataRateMbps, setDataRateMbps] = useState<number>(300)
  const [internalHeatW, setInternalHeatW] = useState<number>(320)

  const activePreset = PRESET_SCENARIOS[selectedKey]

  const applyPreset = (key: string) => {
    const s = PRESET_SCENARIOS[key]
    setSelectedKey(key)
    setRegime(s.regime)
    setAltitudeKm(s.altitudeKm)
    setVehicle(s.vehicle)
    setBusMassKg(s.busMassKg)
    setSolarAreaM2(s.solarAreaM2)
    setRfBand(s.rfBand)
    setDataRateMbps(s.dataRateMbps)
    setInternalHeatW(s.internalHeatW)
  }

  // Unified Multi-Discipline Physics Engine
  const synthesis = useMemo(() => {
    // 1. Launch Vehicle Mass Capacity Check
    const vehicleCapacities: Record<string, { LEO: number; SSO: number; GEO: number; fairingDiaM: number }> = {
      falcon9: { LEO: 17500, SSO: 13500, GEO: 5500, fairingDiaM: 4.6 },
      vulcan: { LEO: 27200, SSO: 20000, GEO: 14500, fairingDiaM: 4.8 },
      electron: { LEO: 300, SSO: 200, GEO: 0, fairingDiaM: 1.08 },
      starship: { LEO: 150000, SSO: 120000, GEO: 40000, fairingDiaM: 8.0 },
    }
    const currentCap = vehicleCapacities[vehicle]?.[regime] || 0
    const launchMarginKg = currentCap - busMassKg
    const launchPassed = launchMarginKg >= 0 && currentCap > 0

    // 2. Power Balance (BOL vs EOL 5-year degradation)
    const solarConstant = 1361 // W/m2
    const cellEfficiency = 0.30 // GaAs Triple-Junction
    const bolPowerW = Math.round(solarAreaM2 * solarConstant * 0.88 * cellEfficiency)
    const eolPowerW = Math.round(bolPowerW * Math.pow(1 - 0.02, 5)) // ~90.4% after 5 yrs
    const powerSurplusW = eolPowerW - internalHeatW
    const powerPassed = powerSurplusW >= 0

    // 3. RF Link Budget Feasibility
    const freqGhz = rfBand === "Ka-Band" ? 28.0 : rfBand === "X-Band" ? 8.4 : 2.2
    const slantRangeKm = Math.round(altitudeKm * 1.35)
    const fsplDb = 20 * Math.log10(slantRangeKm) + 20 * Math.log10(freqGhz) + 92.45
    const linkMarginDb = Math.round((35 + 42 - fsplDb + 228.6 - (10 * Math.log10(dataRateMbps * 1e6)) - 100) * 10) / 10
    const rfPassed = linkMarginDb >= 3.0 // 3dB standard link closure margin

    // 4. Thermal Equilibrium Cycle
    const sigma = 5.670374e-8
    const surfaceAreaM2 = Math.max(2, Math.round(Math.pow(busMassKg / 150, 2 / 3) * 6))
    const tHotC = Math.round(Math.pow((0.15 * 1361 * surfaceAreaM2 * 0.25 + internalHeatW) / (0.85 * sigma * surfaceAreaM2), 0.25) - 273)
    const tColdC = Math.round(Math.pow(Math.max(10, internalHeatW) / (0.85 * sigma * surfaceAreaM2), 0.25) - 273)
    const thermalPassed = tHotC <= 70 && tColdC >= -40

    // All Pass Flag
    const overallFeasible = launchPassed && powerPassed && rfPassed && thermalPassed

    return {
      launchCapacityKg: currentCap,
      launchMarginKg,
      launchPassed,
      bolPowerW,
      eolPowerW,
      powerSurplusW,
      powerPassed,
      linkMarginDb,
      rfPassed,
      surfaceAreaM2,
      tHotC,
      tColdC,
      thermalPassed,
      overallFeasible,
    }
  }, [regime, altitudeKm, vehicle, busMassKg, solarAreaM2, rfBand, dataRateMbps, internalHeatW])

  const exportMissionDossier = () => {
    const csv = `MISSION ARCHITECTURE READINESS DOSSIER (MRD)
Scenario,${activePreset.name}
Client/Sponsor,${activePreset.client}
Target Regime,${regime} (${altitudeKm} km)
Launch Vehicle,${vehicle.toUpperCase()}
Spacecraft Mass,${busMassKg} kg
Launch Margin,${synthesis.launchMarginKg} kg (${synthesis.launchPassed ? "APPROVED" : "FAILED"})
Solar Array Area,${solarAreaM2} m2
BOL Generation,${synthesis.bolPowerW} W
EOL (5-Yr) Generation,${synthesis.eolPowerW} W
Power Margin,${synthesis.powerSurplusW} W (${synthesis.powerPassed ? "APPROVED" : "DEFICIT"})
Downlink Band,${rfBand} (${dataRateMbps} Mbps)
RF Link Margin,${synthesis.linkMarginDb} dB (${synthesis.rfPassed ? "CLOSED" : "LINK FAILED"})
Equilibrium Thermal Range,${synthesis.tColdC}C to ${synthesis.tHotC}C (${synthesis.thermalPassed ? "NOMINAL" : "LIMIT EXCEEDED"})
Overall Mission Status,${synthesis.overallFeasible ? "GO FOR FLIGHT" : "TRADE ITERATION REQUIRED"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-mission-dossier-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Compass className="w-3.5 h-3.5 animate-spin" />
              Integrated Cross-Discipline Spacecraft Feasibility Synthesizer
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              MISSION ARCHITECTURE SCENARIO BUILDER
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Synthesize multi-discipline space mission trades. Tie launch mass-to-orbit, solar power degradation, RF downlink link closure, and thermal equilibrium into a single verified flight readiness report.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href={`/scenarios/${selectedKey}/briefing`}
              className="px-4 py-2.5 rounded-lg bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              EXECUTIVE BRIEFING (PDF)
            </Link>
            <button
              onClick={exportMissionDossier}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV SPEC
            </button>
          </div>
        </div>

        {/* Preset Archetypes */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(PRESET_SCENARIOS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        {/* Scenario Architecture Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Integrated Configurator Desk */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Mission Architecture Inputs
            </div>

            {/* Target Regime & Altitude */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">ORBITAL REGIME &amp; ALTITUDE</label>
              <div className="grid grid-cols-3 gap-2">
                {(["LEO", "SSO", "GEO"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRegime(r)
                      if (r === "GEO") setAltitudeKm(35786)
                      else if (r === "SSO") setAltitudeKm(500)
                      else setAltitudeKm(550)
                    }}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      regime === r
                        ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 pt-1">Altitude: {altitudeKm} km</div>
            </div>

            {/* Launch Vehicle Selection */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">LAUNCH VEHICLE</label>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="falcon9">SpaceX Falcon 9 (5.2m Fairing)</option>
                <option value="vulcan">ULA Vulcan Centaur (5.4m Fairing)</option>
                <option value="electron">Rocket Lab Electron (Dedicated Smallsat)</option>
                <option value="starship">SpaceX Starship (Cargo Bay)</option>
              </select>
            </div>

            {/* Spacecraft Mass */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SPACECRAFT WET MASS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={busMassKg}
                  onChange={(e) => setBusMassKg(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Solar Array Area */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">SOLAR ARRAY AREA</label>
                <span className="text-cyan-400 font-bold">{solarAreaM2} m²</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={50}
                step={0.5}
                value={solarAreaM2}
                onChange={(e) => setSolarAreaM2(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* RF Downlink Band & Throughput */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">DOWNLINK SPECTRUM BAND</label>
              <div className="grid grid-cols-3 gap-2">
                {["Ka-Band", "X-Band", "S-Band"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setRfBand(b)}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      rfBand === b
                        ? "bg-purple-950 border-purple-500/50 text-purple-300 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Payload Power Consumption */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">INTERNAL AVIONICS/RF POWER DRAW</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={internalHeatW}
                  onChange={(e) => setInternalHeatW(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">WATTS</span>
              </div>
            </div>
          </div>

          {/* Synthesis Feasibility Dossier */}
          <div className="lg:col-span-2 space-y-6">

            {/* Overall Flight Feasibility Master Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              synthesis.overallFeasible
                ? "bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                : "bg-red-950/20 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                    synthesis.overallFeasible
                      ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                      : "bg-red-950 border-red-500/40 text-red-300"
                  }`}>
                    {synthesis.overallFeasible ? "GO FOR FLIGHT INTEGRATION" : "ENGINEERING DEFICIT IDENTIFIED"}
                  </span>
                  <h3 className="text-xl font-black text-white pt-1">{activePreset.name}</h3>
                  <p className="text-slate-400 text-xs font-sans">
                    Sponsor: <strong className="text-slate-200">{activePreset.client}</strong> • Regime: <strong className="text-cyan-400">{regime} ({altitudeKm} km)</strong>
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
                  <div className="text-[10px] text-slate-500 uppercase">SYSTEM TRADES</div>
                  <div className="text-2xl font-black text-white">4/4 DISCIPLINED</div>
                  <div className="text-[10px] text-slate-400">Launch • Power • RF • Thermal</div>
                </div>
              </div>
            </div>

            {/* 4 Multi-Discipline Subsystem Trade Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* 1. Launch Capacity */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-white uppercase flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-cyan-400" /> 1. Launch Lift Margin
                  </span>
                  <span className={`text-[10px] font-bold ${synthesis.launchPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {synthesis.launchPassed ? "PASS" : "OVERWEIGHT"}
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  {synthesis.launchMarginKg >= 0 ? `+${synthesis.launchMarginKg.toLocaleString()} kg` : `${synthesis.launchMarginKg.toLocaleString()} kg`}
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Vehicle lift capacity: {synthesis.launchCapacityKg.toLocaleString()} kg to {regime}. Bus mass: {busMassKg.toLocaleString()} kg.
                </div>
                <Link href="/payload" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold">
                  Open Fairing Simulator <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 2. Power Balance */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-white uppercase flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> 2. 5-Yr EOL Power Margin
                  </span>
                  <span className={`text-[10px] font-bold ${synthesis.powerPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {synthesis.powerPassed ? "PASS" : "DEFICIT"}
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  {synthesis.powerSurplusW >= 0 ? `+${synthesis.powerSurplusW} W` : `${synthesis.powerSurplusW} W`}
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  BOL: {synthesis.bolPowerW} W $\rightarrow$ EOL: {synthesis.eolPowerW} W. Required continuous draw: {internalHeatW} W.
                </div>
                <Link href="/power" className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold">
                  Open Power Simulator <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 3. RF Downlink */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-white uppercase flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-purple-400" /> 3. Downlink Margin
                  </span>
                  <span className={`text-[10px] font-bold ${synthesis.rfPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {synthesis.rfPassed ? "CLOSED (+3dB)" : "MARGIN DEFICIT"}
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  {synthesis.linkMarginDb} dB
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Band: {rfBand} at {dataRateMbps} Mbps. Slant range: {Math.round(altitudeKm * 1.35)} km.
                </div>
                <Link href="/rf" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold">
                  Open RF Link Calculator <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 4. Thermal Equilibrium */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-white uppercase flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-red-400" /> 4. Thermal Equilibrium
                  </span>
                  <span className={`text-[10px] font-bold ${synthesis.thermalPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {synthesis.thermalPassed ? "NOMINAL" : "LIMIT EXCEEDED"}
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  {synthesis.tColdC}&deg;C to +{synthesis.tHotC}&deg;C
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Deep eclipse shadow to peak illuminated solar equilibrium with {internalHeatW} W dissipation.
                </div>
                <Link href="/thermal" className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold">
                  Open Thermal Simulator <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
