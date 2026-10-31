"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ShieldCheck, 
  Activity, 
  Layers, 
  Download, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Cpu, 
  RotateCw, 
  Radio, 
  BatteryCharging, 
  Clock, 
  CheckCircle2, 
  Sliders 
} from "lucide-react"

interface ReliabilityPreset {
  name: string
  missionClass: "NASA Class A (Flagship)" | "NASA Class B (High Priority)" | "NASA Class C (Cost-Capped)" | "NASA Class D / Smallsat"
  targetLifetimeYears: number
  wheelRedundancy: "3 of 4 Pyramid (1 Cold Spare)" | "3 of 3 Minimal (No Redundancy)" | "4 of 4 Skewed Active"
  obcRedundancy: "Dual Cold Standby (Cross-Strapped)" | "Single String (No Spare)" | "Triple Modular Redundancy (TMR)"
  transponderRedundancy: "Dual Hot Redundant" | "Single String"
  partQualityGrade: "Class S / QML-V (Hermetic Ceramic)" | "Automotive / AEC-Q100 (Up-screened)" | "Commercial COTS Plastic"
  description: string
}

const RELIABILITY_PRESETS: Record<string, ReliabilityPreset> = {
  class_a_flagship: {
    name: "NASA Class A Deep Space Flagship",
    missionClass: "NASA Class A (Flagship)",
    targetLifetimeYears: 12,
    wheelRedundancy: "3 of 4 Pyramid (1 Cold Spare)",
    obcRedundancy: "Dual Cold Standby (Cross-Strapped)",
    transponderRedundancy: "Dual Hot Redundant",
    partQualityGrade: "Class S / QML-V (Hermetic Ceramic)",
    description: "Maximum reliability architecture with fully cross-strapped redundant subsystems engineered for multi-year deep space voyages.",
  },
  class_b_leo_constellation: {
    name: "Class B Commercial LEO Constellation Node",
    missionClass: "NASA Class B (High Priority)",
    targetLifetimeYears: 5,
    wheelRedundancy: "3 of 4 Pyramid (1 Cold Spare)",
    obcRedundancy: "Dual Cold Standby (Cross-Strapped)",
    transponderRedundancy: "Single String",
    partQualityGrade: "Automotive / AEC-Q100 (Up-screened)",
    description: "Balanced cost-to-reliability trade utilizing automotive AEC-Q100 parts with 3-of-4 reaction wheel pyramid fault tolerance.",
  },
  class_d_cubesat: {
    name: "Class D Agile Tech Demonstration",
    missionClass: "NASA Class D / Smallsat",
    targetLifetimeYears: 2,
    wheelRedundancy: "3 of 3 Minimal (No Redundancy)",
    obcRedundancy: "Single String (No Spare)",
    transponderRedundancy: "Single String",
    partQualityGrade: "Commercial COTS Plastic",
    description: "Lean single-string avionics bus utilizing industrial COTS silicon targeted for short-duration technology validation.",
  },
}

export default function ReliabilityPage() {
  const [selectedKey, setSelectedKey] = useState<string>("class_b_leo_constellation")
  const [targetYears, setTargetYears] = useState<number>(5)
  const [partGrade, setPartGrade] = useState<string>("Automotive / AEC-Q100 (Up-screened)")
  const [wheelConfig, setWheelConfig] = useState<string>("3 of 4 Pyramid (1 Cold Spare)")
  const [obcConfig, setObcConfig] = useState<string>("Dual Cold Standby (Cross-Strapped)")
  const [transponderConfig, setTransponderConfig] = useState<string>("Dual Hot Redundant")

  const activePreset = RELIABILITY_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = RELIABILITY_PRESETS[key]
    setSelectedKey(key)
    setTargetYears(p.targetLifetimeYears)
    setPartGrade(p.partQualityGrade)
    setWheelConfig(p.wheelRedundancy)
    setObcConfig(p.obcRedundancy)
    setTransponderConfig(p.transponderRedundancy)
  }

  // MIL-HDBK-217F & Markov Reliability Sizing Calculations
  const metrics = useMemo(() => {
    const hours = targetYears * 8760

    // 1. Part Quality Failure Rate Multiplier (Pi_Q)
    let piQ = 1.0
    if (partGrade.includes("Class S")) piQ = 0.35 // Space-qualified hermetic
    else if (partGrade.includes("COTS")) piQ = 3.2 // High FIT rate COTS plastic

    // Base sub-assembly FIT rates (Failures in 10^9 operating hours)
    const fitObcBase = 1200 * piQ
    const fitWheelBase = 2400 * piQ // Bearings & motor electronics
    const fitTransponderBase = 1800 * piQ
    const fitEpsPduBase = 950 * piQ

    // 2. Subsystem Single-String Reliabilities: R_sub = exp(-lambda * t)
    const rObcSingle = Math.exp(-(fitObcBase * 1e-9) * hours)
    const rWheelSingle = Math.exp(-(fitWheelBase * 1e-9) * hours)
    const rTransponderSingle = Math.exp(-(fitTransponderBase * 1e-9) * hours)
    const rEps = Math.exp(-(fitEpsPduBase * 1e-9) * hours)

    // 3. Redundancy Calculations
    // Reaction Wheels: 3-of-4 pyramid vs 3-of-3
    let rWheels = rWheelSingle * rWheelSingle * rWheelSingle
    if (wheelConfig.includes("3 of 4")) {
      // R_3/4 = R^4 + 4*R^3*(1-R)
      rWheels = Math.pow(rWheelSingle, 4) + 4 * Math.pow(rWheelSingle, 3) * (1 - rWheelSingle)
    }

    // On-Board Computer: Single vs Dual Cold Standby vs TMR
    let rObc = rObcSingle
    if (obcConfig.includes("Dual Cold")) {
      // R_standby = R * (1 + lambda * t)
      const lambdaT = (fitObcBase * 1e-9) * hours
      rObc = rObcSingle * (1 + lambdaT)
    } else if (obcConfig.includes("TMR")) {
      rObc = 3 * Math.pow(rObcSingle, 2) - 2 * Math.pow(rObcSingle, 3)
    }

    // Transponder: Single vs Dual Hot Redundant
    let rTransponder = rTransponderSingle
    if (transponderConfig.includes("Dual Hot")) {
      rTransponder = 1 - Math.pow(1 - rTransponderSingle, 2)
    }

    // 4. Total Spacecraft Bus Reliability: R_bus = R_obc * R_wheels * R_tx * R_eps
    const rTotalBus = Math.round(rObc * rWheels * rTransponder * rEps * 1000) / 1000
    const probabilityOfSuccessPct = Math.round(rTotalBus * 1000) / 10

    // System MTBF in Hours and Years
    const equivalentSystemFit = (fitObcBase + fitWheelBase + fitTransponderBase + fitEpsPduBase)
    const mtbfHours = Math.round(1e9 / equivalentSystemFit)
    const mtbfYears = Math.round((mtbfHours / 8760) * 10) / 10

    // Target Compliance Check based on NASA Class
    let targetProbabilityPct = 85.0
    if (activePreset.missionClass.includes("Class A")) targetProbabilityPct = 92.0
    else if (activePreset.missionClass.includes("Class D")) targetProbabilityPct = 70.0

    const reliabilityCompliant = probabilityOfSuccessPct >= targetProbabilityPct

    return {
      rObc: Math.round(rObc * 1000) / 1000,
      rWheels: Math.round(rWheels * 1000) / 1000,
      rTransponder: Math.round(rTransponder * 1000) / 1000,
      rEps: Math.round(rEps * 1000) / 1000,
      probabilityOfSuccessPct,
      targetProbabilityPct,
      mtbfHours,
      mtbfYears,
      reliabilityCompliant,
    }
  }, [targetYears, partGrade, wheelConfig, obcConfig, transponderConfig, activePreset])

  const exportReliabilityCSV = () => {
    const csv = `SPACECRAFT SYSTEM RELIABILITY & REDUNDANCY SPEC
Mission Program,${activePreset.name}
Risk Classification,${activePreset.missionClass}
Target Mission Duration,${targetYears} Years
Part Quality Grade,${partGrade}
Reaction Wheel Configuration,${wheelConfig} (Subsystem Reliability: ${metrics.rWheels})
On-Board Computer Architecture,${obcConfig} (Subsystem Reliability: ${metrics.rObc})
RF Transponder Sizing,${transponderConfig} (Subsystem Reliability: ${metrics.rTransponder})
Power PDU Subsystem Reliability,${metrics.rEps}
System Cumulative MTBF,${metrics.mtbfHours} operating hours (${metrics.mtbfYears} years)
End-of-Mission Success Probability,${metrics.probabilityOfSuccessPct}% (Target: >= ${metrics.targetProbabilityPct}%)
Mission Assurance Clearance Verdict,${metrics.reliabilityCompliant ? "PASS (RELIABILITY THRESHOLD CERTIFIED)" : "FAIL (INSUFFICIENT REDUNDANCY MARGIN)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-reliability-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              MIL-HDBK-217F &amp; NASA-STD-8729.1A System Reliability Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SYSTEM RELIABILITY &amp; REDUNDANCY
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model parts-count failure rates (FIT), k-out-of-n active/standby redundant architectures, Markov state-space transitions, and end-of-mission success probabilities (P_success).
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
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap text-left ${
                selectedKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="font-bold">{v.name}</div>
              <div className="text-[10px] text-slate-500">{v.missionClass} · {v.targetLifetimeYears}yr Target</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" /> SUCCESS PROBABILITY
            </div>
            <div className={`text-3xl font-black ${metrics.reliabilityCompliant ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.probabilityOfSuccessPct}%
            </div>
            <div className="text-[10px] text-slate-400">At {targetYears} Years (Req: &ge; {metrics.targetProbabilityPct}%)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" /> BUS MTBF
            </div>
            <div className="text-3xl font-black text-purple-400">{metrics.mtbfYears} yrs</div>
            <div className="text-[10px] text-slate-400">{metrics.mtbfHours.toLocaleString()} Operating Hours</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-amber-400" /> WHEELS RELIABILITY
            </div>
            <div className="text-3xl font-black text-amber-400">{metrics.rWheels}</div>
            <div className="text-[10px] text-slate-400">{wheelConfig}</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Cpu className="w-3 h-3 text-emerald-400" /> OBC RELIABILITY
            </div>
            <div className="text-3xl font-black text-white">{metrics.rObc}</div>
            <div className="text-[10px] text-slate-400">{obcConfig}</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Redundancy Architecture
            </div>

            {/* Mission Duration */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">MISSION LIFETIME</label>
                <span className="text-cyan-400 font-bold">{targetYears} YEARS</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={targetYears}
                onChange={(e) => setTargetYears(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 yr (Demo)</span>
                <span>5 yrs (LEO Standard)</span>
                <span>15 yrs (GEO)</span>
              </div>
            </div>

            {/* Part Grade */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">COMPONENT QUALITY SCREENING</label>
              <select
                value={partGrade}
                onChange={(e) => setPartGrade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Class S / QML-V (Hermetic Ceramic)">Class S / QML-V (Hermetic Ceramic Space Grade)</option>
                <option value="Automotive / AEC-Q100 (Up-screened)">Automotive AEC-Q100 (Up-Screened COTS)</option>
                <option value="Commercial COTS Plastic">Industrial COTS (Commercial Plastic Package)</option>
              </select>
            </div>

            {/* Reaction Wheel Redundancy */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">REACTION WHEEL ARRAY</label>
              <select
                value={wheelConfig}
                onChange={(e) => setWheelConfig(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="3 of 4 Pyramid (1 Cold Spare)">3 of 4 Pyramid (1 Cold Spare - Standard)</option>
                <option value="3 of 3 Minimal (No Redundancy)">3 of 3 Minimal (Single String - No Fault Tolerance)</option>
              </select>
            </div>

            {/* OBC Redundancy */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">ON-BOARD COMPUTER (OBC)</label>
              <select
                value={obcConfig}
                onChange={(e) => setObcConfig(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Dual Cold Standby (Cross-Strapped)">Dual Cold Standby (Cross-Strapped PDU)</option>
                <option value="Triple Modular Redundancy (TMR)">Triple Modular Redundancy (TMR 2-of-3 Voting)</option>
                <option value="Single String (No Spare)">Single String (No Redundant Computer)</option>
              </select>
            </div>

            {/* Transponder Redundancy */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">RF TRANSPONDER</label>
              <select
                value={transponderConfig}
                onChange={(e) => setTransponderConfig(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Dual Hot Redundant">Dual Hot Redundant (A/B Transponder Cross-Strap)</option>
                <option value="Single String">Single String (Single Transceiver)</option>
              </select>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Reliability Assessment Panel */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Mission Survivability &amp; Risk Envelope Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.reliabilityCompliant
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.reliabilityCompliant ? "MISSION RELIABILITY VERIFIED" : "FAILURE PROBABILITY DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  For a <strong className="text-white">{targetYears}-year mission</strong> under <strong className="text-cyan-400">{activePreset.missionClass}</strong> guidelines, the system achieves an overall probability of success of <strong className={metrics.reliabilityCompliant ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{metrics.probabilityOfSuccessPct}%</strong> (target requirement: &ge; {metrics.targetProbabilityPct}%).
                </p>
                <p>
                  Incorporating {wheelConfig} elevates attitude control reliability to <strong className="text-white">{metrics.rWheels}</strong>, while {obcConfig} provides computer reliability of <strong className="text-white">{metrics.rObc}</strong>. 
                  Overall spacecraft mean time between failures (MTBF) converges at <strong className="text-purple-400">{metrics.mtbfHours.toLocaleString()} hours ({metrics.mtbfYears} years)</strong>.
                  {!metrics.reliabilityCompliant && (
                    <span className="text-red-400 block mt-1 font-bold">
                      Reliability deficit: Mission success probability falls below institutional classification standards. Eliminate single-point failures by switching to dual cross-strapped computers or upgrading part screening to hermetic Class S components.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">On-Board Computer Subsystem Reliability (R_obc)</span>
                  <span className="text-white font-bold">{metrics.rObc}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Reaction Wheel Array Reliability (R_wheels)</span>
                  <span className="text-white font-bold">{metrics.rWheels}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">RF Transponder Subsystem Reliability (R_rf)</span>
                  <span className="text-white font-bold">{metrics.rTransponder}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Flight Mission Assurance Verdict</span>
                  <span className={`font-bold ${metrics.reliabilityCompliant ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.reliabilityCompliant ? "PASS (CERTIFIED FOR MISSION LIFE)" : "FAIL (UPGRADE REDUNDANCY)"}
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
                <Link href="/compliance" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/compliance</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/rad" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/rad (TID/SEE)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/battery" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/battery (Fade)</span>
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
