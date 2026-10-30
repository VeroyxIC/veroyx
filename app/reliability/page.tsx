"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  Layers, 
  Gauge, 
  Download, 
  ArrowRight, 
  Cpu, 
  Clock, 
  CheckCircle2,
  TrendingDown
} from "lucide-react"

interface ReliabilityPreset {
  name: string
  classType: string
  targetMissionYears: number
  redundancyScheme: "Single-String (COTS Smallsat)" | "Dual-Redundant (Active Parallel)" | "Cold-Standby Spares" | "Triple-Modular Redundancy (TMR)"
  avionicsFit: number
  powerFit: number
  adcsFit: number
  payloadFit: number
  thermalFit: number
  description: string
}

const RELIABILITY_PRESETS: Record<string, ReliabilityPreset> = {
  cubesat_cots: {
    name: "Commercial CubeSat (Single-String)",
    classType: "Low-Cost Smallsat",
    targetMissionYears: 3,
    redundancyScheme: "Single-String (COTS Smallsat)",
    avionicsFit: 450,
    powerFit: 600,
    adcsFit: 750,
    payloadFit: 500,
    thermalFit: 150,
    description: "Zero-redundancy architecture relying on commercial components. High risk, fast production.",
  },
  flagship_geo: {
    name: "Class-A Defense Relay / Flagship GEO",
    classType: "15-Year High Reliability",
    targetMissionYears: 15,
    redundancyScheme: "Dual-Redundant (Active Parallel)",
    avionicsFit: 85,
    powerFit: 110,
    adcsFit: 140,
    payloadFit: 120,
    thermalFit: 40,
    description: "MIL-HDBK-217F Class-S components with fully cross-strapped redundant subsystems.",
  },
  autonomous_lander: {
    name: "Critical Flight Avionics (TMR)",
    classType: "Human-Rated / Lunar Lander",
    targetMissionYears: 5,
    redundancyScheme: "Triple-Modular Redundancy (TMR)",
    avionicsFit: 40,
    powerFit: 65,
    adcsFit: 80,
    payloadFit: 90,
    thermalFit: 25,
    description: "Triple-modular voting flight computer with fail-operational / fail-safe redundancy.",
  },
}

export default function SpacecraftReliabilityPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("flagship_geo")
  const [missionYears, setMissionYears] = useState<number>(15)
  const [redundancy, setRedundancy] = useState<string>("Dual-Redundant (Active Parallel)")
  const [avionicsFit, setAvionicsFit] = useState<number>(85)
  const [powerFit, setPowerFit] = useState<number>(110)
  const [adcsFit, setAdcsFit] = useState<number>(140)
  const [payloadFit, setPayloadFit] = useState<number>(120)

  const preset = RELIABILITY_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = RELIABILITY_PRESETS[key]
    setSelectedPresetKey(key)
    setMissionYears(p.targetMissionYears)
    setRedundancy(p.redundancyScheme)
    setAvionicsFit(p.avionicsFit)
    setPowerFit(p.powerFit)
    setAdcsFit(p.adcsFit)
    setPayloadFit(p.payloadFit)
  }

  // MIL-HDBK-217F Reliability Calculations
  const metrics = useMemo(() => {
    // Total FIT (Failures In Time per 10^9 hours)
    const baseFit = avionicsFit + powerFit + adcsFit + payloadFit + 50 // +50 for cabling/mechanisms
    const lambdaPerHour = baseFit * 1e-9
    const missionHours = missionYears * 365.25 * 24

    // Single-String base reliability
    const rBase = Math.exp(-lambdaPerHour * missionHours)

    // Redundancy factor adjustment
    let rEffective = rBase
    if (redundancy === "Dual-Redundant (Active Parallel)") {
      // R = 1 - (1 - R_sub)^2
      rEffective = 1 - Math.pow(1 - rBase, 2)
    } else if (redundancy === "Cold-Standby Spares") {
      // R = R_base * (1 + lambda * t * switch_reliability)
      const switchRel = 0.98
      rEffective = Math.min(0.999, rBase * (1 + lambdaPerHour * missionHours * switchRel))
    } else if (redundancy === "Triple-Modular Redundancy (TMR)") {
      // 2-out-of-3 majority voting: R = 3*R^2 - 2*R^3
      rEffective = 3 * Math.pow(rBase, 2) - 2 * Math.pow(rBase, 3)
    }

    const probSuccessPct = Math.round(rEffective * 1000) / 10
    const mtbfHours = Math.round(1 / lambdaPerHour)
    const mtbfYears = Math.round((mtbfHours / (365.25 * 24)) * 10) / 10

    // Insurance Risk Scoring (1 to 10 scale)
    let insuranceRiskScore = "AAA (Prime Insurable)"
    let riskColor = "text-emerald-400"
    if (probSuccessPct < 70) {
      insuranceRiskScore = "CCC (High Underwriting Premium / Sub-Standard)"
      riskColor = "text-red-400"
    } else if (probSuccessPct < 85) {
      insuranceRiskScore = "BBB (Commercial Standard)"
      riskColor = "text-amber-400"
    }

    return {
      totalFit: baseFit,
      mtbfHours: mtbfHours.toLocaleString(),
      mtbfYears,
      probSuccessPct,
      insuranceRiskScore,
      riskColor,
      r3Yr: (Math.exp(-lambdaPerHour * (3 * 365.25 * 24)) * 100).toFixed(1),
      r5Yr: (Math.exp(-lambdaPerHour * (5 * 365.25 * 24)) * 100).toFixed(1),
      r10Yr: (Math.exp(-lambdaPerHour * (10 * 365.25 * 24)) * 100).toFixed(1),
      r15Yr: (Math.exp(-lambdaPerHour * (15 * 365.25 * 24)) * 100).toFixed(1),
    }
  }, [avionicsFit, powerFit, adcsFit, payloadFit, missionYears, redundancy])

  const exportReliabilityCSV = () => {
    const csv = `SPACECRAFT RELIABILITY & MTBF ANALYSIS (MIL-HDBK-217F)
Profile Architecture,${preset.name}
Class,${preset.classType}
Mission Duration,${missionYears} years
Redundancy Architecture,${redundancy}
Subsystem Failure Rate (Avionics),${avionicsFit} FIT
Subsystem Failure Rate (EPS Power),${powerFit} FIT
Subsystem Failure Rate (ADCS),${adcsFit} FIT
Subsystem Failure Rate (Payload),${payloadFit} FIT
Net Spacecraft Failure Rate,${metrics.totalFit} FIT
Mean Time Between Failures (MTBF),${metrics.mtbfYears} years (${metrics.mtbfHours} operating hours)
Probability of Mission Success (Ps),${metrics.probSuccessPct}%
Insurance Underwriting Category,${metrics.insuranceRiskScore}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-spacecraft-reliability-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              MIL-HDBK-217F Reliability &amp; Spacecraft MTBF Assessment
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SPACECRAFT RELIABILITY &amp; MTBF MODEL
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model parts-count failure rates (FIT), exponential reliability decay, active and standby redundancy schemes, and space insurance underwriting risk scoring.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportReliabilityCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT RELIABILITY SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(RELIABILITY_PRESETS).map(([k, v]) => (
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
              Reliability Parameters
            </div>

            {/* Mission Lifetime */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">DESIGN LIFE REQUIREMENT</label>
                <span className="text-cyan-400 font-bold">{missionYears} YEARS</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={missionYears}
                onChange={(e) => setMissionYears(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 Year (Demo)</span>
                <span>5 Years (LEO)</span>
                <span>15 Years (GEO)</span>
              </div>
            </div>

            {/* Redundancy Scheme */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">REDUNDANCY SCHEME</label>
              <select
                value={redundancy}
                onChange={(e) => setRedundancy(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Single-String (COTS Smallsat)">Single-String (No Redundancy)</option>
                <option value="Dual-Redundant (Active Parallel)">Dual-Redundant (Active Parallel)</option>
                <option value="Cold-Standby Spares">Cold-Standby Spares (Cross-Strapped)</option>
                <option value="Triple-Modular Redundancy (TMR)">Triple-Modular Redundancy (TMR Majority Voting)</option>
              </select>
            </div>

            {/* Subsystem FIT Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-bold uppercase block text-[11px]">
                Subsystem Failure Rates (FIT - Failures / 10⁹ Hours)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">AVIONICS CDH</span>
                  <input
                    type="number"
                    value={avionicsFit}
                    onChange={(e) => setAvionicsFit(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">EPS POWER BUS</span>
                  <input
                    type="number"
                    value={powerFit}
                    onChange={(e) => setPowerFit(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ADCS ACTUATORS</span>
                  <input
                    type="number"
                    value={adcsFit}
                    onChange={(e) => setAdcsFit(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">MISSION PAYLOAD</span>
                  <input
                    type="number"
                    value={payloadFit}
                    onChange={(e) => setPayloadFit(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">HERITAGE CLASS:</div>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> MISSION SUCCESS (Ps)
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.probSuccessPct}%</div>
                <div className="text-[10px] text-slate-500">Over {missionYears}-Year Design Life</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" /> SYSTEM MTBF
                </div>
                <div className="text-3xl font-black text-white">{metrics.mtbfYears} YRS</div>
                <div className="text-[10px] text-slate-500">{metrics.mtbfHours} Hours</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-emerald-400" /> NET FAILURE RATE
                </div>
                <div className="text-3xl font-black text-emerald-400">{metrics.totalFit} FIT</div>
                <div className="text-[10px] text-slate-500">Total System Aggregate</div>
              </div>
            </div>

            {/* Reliability & Insurance Underwriting Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Spacecraft Insurance Risk &amp; Reliability Profile
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.probSuccessPct >= 85
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-amber-950 border-amber-500/40 text-amber-300"
                }`}>
                  {metrics.insuranceRiskScore}
                </span>
              </div>

              {/* Multi-Year Survival Decay Curves */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">3-YEAR SURVIVAL</span>
                  <span className="text-sm font-black text-white">{metrics.r3Yr}%</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">5-YEAR SURVIVAL</span>
                  <span className="text-sm font-black text-cyan-400">{metrics.r5Yr}%</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">10-YEAR SURVIVAL</span>
                  <span className="text-sm font-black text-purple-400">{metrics.r10Yr}%</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">15-YEAR SURVIVAL</span>
                  <span className="text-sm font-black text-emerald-400">{metrics.r15Yr}%</span>
                </div>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Selected Fault-Tolerant Redundancy</span>
                  <span className="text-white font-bold">{redundancy}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Avionics &amp; Flight Computer FIT</span>
                  <span className="text-cyan-400 font-bold">{avionicsFit} FIT</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Power Conditioning &amp; Battery FIT</span>
                  <span className="text-slate-200 font-bold">{powerFit} FIT</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Insurance Underwriting Verdict</span>
                  <span className={`font-bold ${metrics.riskColor}`}>{metrics.insuranceRiskScore}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
