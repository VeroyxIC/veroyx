"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  FileCheck2, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Layers, 
  ArrowRight, 
  Activity, 
  Printer, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Gauge, 
  Rocket, 
  Radio, 
  Cpu, 
  BatteryCharging, 
  Thermometer, 
  Globe 
} from "lucide-react"

interface ComplianceCheck {
  id: string
  subsystem: string
  standard: string
  parameter: string
  targetRequirement: string
  actualValue: string
  status: "PASS" | "MARGINAL" | "FAIL"
  notes: string
}

export default function ComplianceReviewPage() {
  const [missionName, setMissionName] = useState<string>("Project Astraea LEO Recon")
  const [dryMassMarginPct, setDryMassMarginPct] = useState<number>(18.5)
  const [structuralYieldMargin, setStructuralYieldMargin] = useState<number>(0.28)
  const [batteryDodPct, setBatteryDodPct] = useState<number>(24.0)
  const [heatPipeCapillaryRatio, setHeatPipeCapillaryRatio] = useState<number>(1.85)
  const [radiationRdmRatio, setRadiationRdmRatio] = useState<number>(2.4)
  const [pressureBurstMargin, setPressureBurstMargin] = useState<number>(1.58)
  const [postMissionDecayYears, setPostMissionDecayYears] = useState<number>(4.2)
  const [casualtyRiskPpm, setCasualtyRiskPpm] = useState<number>(65) // 65 in 1,000,000 (well below 1:10,000)

  // Formal Standards Audit Matrix Calculation
  const audit = useMemo(() => {
    const checks: ComplianceCheck[] = [
      {
        id: "MASS-01",
        subsystem: "Mass & Structures",
        standard: "AIAA S-120-2015",
        parameter: "Dry Mass Growth Allowance (MGA)",
        targetRequirement: "≥ 15.0% at PDR",
        actualValue: `+${dryMassMarginPct}%`,
        status: dryMassMarginPct >= 15.0 ? "PASS" : dryMassMarginPct >= 10.0 ? "MARGINAL" : "FAIL",
        notes: "Sufficient mass reserve allocated for subsystem integration delta.",
      },
      {
        id: "STR-02",
        subsystem: "Structural Dynamics",
        standard: "NASA-STD-5001B / GEVS",
        parameter: "Yield Margin of Safety (MS_yield)",
        targetRequirement: "MS ≥ 0.00 (1.25x limit)",
        actualValue: `+${structuralYieldMargin}`,
        status: structuralYieldMargin >= 0.15 ? "PASS" : structuralYieldMargin >= 0.00 ? "MARGINAL" : "FAIL",
        notes: "Primary load-bearing structure cleared against quasi-static launch g-loads.",
      },
      {
        id: "EPS-03",
        subsystem: "Power & Electrical",
        standard: "ECSS-E-ST-20-30C",
        parameter: "Eclipse Depth-of-Discharge (DoD)",
        targetRequirement: "≤ 25.0% for 50k cycles",
        actualValue: `${batteryDodPct}%`,
        status: batteryDodPct <= 25.0 ? "PASS" : batteryDodPct <= 30.0 ? "MARGINAL" : "FAIL",
        notes: "Preserves lithium-ion cell degradation envelope over 5-year mission.",
      },
      {
        id: "THM-04",
        subsystem: "Thermal Control",
        standard: "AIAA S-102.2.4-2019",
        parameter: "Two-Phase Capillary Pumping Ratio",
        targetRequirement: "Q_max / Q_actual ≥ 1.50x",
        actualValue: `${heatPipeCapillaryRatio}x`,
        status: heatPipeCapillaryRatio >= 1.50 ? "PASS" : heatPipeCapillaryRatio >= 1.20 ? "MARGINAL" : "FAIL",
        notes: "Axially grooved CCHP wick structure cleared against dryout runaway.",
      },
      {
        id: "RAD-05",
        subsystem: "Avionics & Hardening",
        standard: "NASA-HDBK-4002",
        parameter: "Radiation Design Margin (RDM)",
        targetRequirement: "RDM ≥ 2.0x (TID)",
        actualValue: `${radiationRdmRatio}x`,
        status: radiationRdmRatio >= 2.0 ? "PASS" : radiationRdmRatio >= 1.5 ? "MARGINAL" : "FAIL",
        notes: "Shielded total ionizing dose meets flight mission assurance envelope.",
      },
      {
        id: "PRS-06",
        subsystem: "Propulsion Storage",
        standard: "NASA-STD-5019A",
        parameter: "Propellant Tank Burst Margin",
        targetRequirement: "P_burst / MEOP ≥ 1.50x",
        actualValue: `${pressureBurstMargin}x`,
        status: pressureBurstMargin >= 1.50 ? "PASS" : "FAIL",
        notes: "Meets launch range safety requirements for pressurized flight hardware.",
      },
      {
        id: "DEB-07",
        subsystem: "Debris Mitigation",
        standard: "FCC 5-Year Rule / ISO 24113",
        parameter: "Post-Mission Atmospheric Decay",
        targetRequirement: "≤ 5.0 Years",
        actualValue: `${postMissionDecayYears} Years`,
        status: postMissionDecayYears <= 5.0 ? "PASS" : "FAIL",
        notes: "Compliant with mandatory 5-year space debris orbital disposal requirements.",
      },
      {
        id: "CAS-08",
        subsystem: "Range Safety",
        standard: "NASA-STD-8719.14C",
        parameter: "Ground Casualty Expectation (E_c)",
        targetRequirement: "≤ 100 ppm (1:10,000)",
        actualValue: `${casualtyRiskPpm} ppm`,
        status: casualtyRiskPpm <= 100 ? "PASS" : "FAIL",
        notes: "Design-for-Demise (D4D) confirms surviving debris falls within casualty envelope.",
      },
    ]

    const passCount = checks.filter(c => c.status === "PASS").length
    const marginalCount = checks.filter(c => c.status === "MARGINAL").length
    const failCount = checks.filter(c => c.status === "FAIL").length
    const overallScore = Math.round((passCount / checks.length) * 100)
    const flightCleared = failCount === 0

    return { checks, passCount, marginalCount, failCount, overallScore, flightCleared }
  }, [dryMassMarginPct, structuralYieldMargin, batteryDodPct, heatPipeCapillaryRatio, radiationRdmRatio, pressureBurstMargin, postMissionDecayYears, casualtyRiskPpm])

  const exportFormalDossier = () => {
    const csv = `VEROYX FORMAL PRELIMINARY DESIGN REVIEW (PDR) COMPLIANCE DOSSIER
Mission Program,${missionName}
Review Type,Phase B / Preliminary Design Review (PDR) Verification Matrix
Overall Readiness Score,${audit.overallScore}% (${audit.passCount} PASS / ${audit.marginalCount} MARGINAL / ${audit.failCount} FAIL)
Flight Certification Verdict,${audit.flightCleared ? "CERTIFIED FOR FLIGHT HARDWARE BUILD" : "NON-COMPLIANT (CORRECTIVE ACTION MANDATORY)"}

ID,Subsystem,Governing Standard,Verification Parameter,Target Requirement,Actual Value,Status,Audit Notes
${audit.checks.map(c => `${c.id},"${c.subsystem}","${c.standard}","${c.parameter}","${c.targetRequirement}","${c.actualValue}",${c.status},"${c.notes}"`).join("\n")}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-pdr-compliance-${missionName.toLowerCase().replace(/\s+/g, "-")}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <FileCheck2 className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Aerospace Standards Verification &amp; Flight Readiness Matrix
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              PDR / FRR COMPLIANCE AUDIT
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Automated institutional verification engine cross-auditing system calculations against AIAA, NASA, ECSS, ISO, and FCC standards to generate certified Flight Readiness Review deliverables.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              PRINT DOSSIER
            </button>
            <button
              onClick={exportFormalDossier}
              className="px-4 py-2.5 rounded-lg bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT AUDIT SPEC
            </button>
          </div>
        </div>

        {/* Mission Banner & Readiness Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold">ACTIVE FLIGHT PROGRAM</span>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-400 block font-sans">
              Preliminary Design Review (PDR) / System Requirements Verification Matrix
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" /> READINESS SCORE
            </div>
            <div className="text-3xl font-black text-cyan-400">{audit.overallScore}%</div>
            <div className="text-[10px] text-slate-400">
              {audit.passCount} Pass · {audit.marginalCount} Marginal · {audit.failCount} Fail
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              {audit.flightCleared ? (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              )}
              FLIGHT CLEARANCE
            </div>
            <div className={`text-2xl font-black ${audit.flightCleared ? "text-emerald-400" : "text-red-400"}`}>
              {audit.flightCleared ? "CERTIFIED" : "AUDIT DEFICIT"}
            </div>
            <div className="text-[10px] text-slate-400">
              {audit.flightCleared ? "Zero Fatal Flaws Detected" : "Corrective Action Required"}
            </div>
          </div>
        </div>

        {/* Verification Matrix Table */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono text-sm">
              <FileText className="w-4 h-4 text-cyan-400" />
              System Requirements Verification Matrix (SRVM)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              NASA-STD-8719 / ECSS-E-ST / AIAA S-120
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Req ID</th>
                  <th className="py-2.5 px-3">Subsystem</th>
                  <th className="py-2.5 px-3">Governing Standard</th>
                  <th className="py-2.5 px-3">Verification Parameter</th>
                  <th className="py-2.5 px-3">Target Limit</th>
                  <th className="py-2.5 px-3">Actual Value</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {audit.checks.map((chk) => (
                  <tr key={chk.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-cyan-400">{chk.id}</td>
                    <td className="py-3 px-3 text-slate-300 font-sans">{chk.subsystem}</td>
                    <td className="py-3 px-3 text-slate-400">{chk.standard}</td>
                    <td className="py-3 px-3 text-white font-sans">{chk.parameter}</td>
                    <td className="py-3 px-3 text-slate-400">{chk.targetRequirement}</td>
                    <td className="py-3 px-3 font-bold text-white">{chk.actualValue}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        chk.status === "PASS"
                          ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                          : chk.status === "MARGINAL"
                          ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                          : "bg-red-950/80 border-red-500/40 text-red-300"
                      }`}>
                        {chk.status === "PASS" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {chk.status === "MARGINAL" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        {chk.status === "FAIL" && <XCircle className="w-3 h-3 text-red-400" />}
                        {chk.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Parameter Tuning Console */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-sm">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Live Parameter Tuning &amp; Compliance Stress-Test
            </span>
            <span className="text-[10px] text-slate-400">Drag to observe real-time audit status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">DRY MASS MGA (%)</span>
                <span className="text-cyan-400 font-bold">{dryMassMarginPct}%</span>
              </div>
              <input
                type="range"
                min={5.0}
                max={30.0}
                step={0.5}
                value={dryMassMarginPct}
                onChange={(e) => setDryMassMarginPct(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[9px] text-slate-500 block">Req: &ge; 15% (AIAA S-120)</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">BATTERY DOD (%)</span>
                <span className="text-emerald-400 font-bold">{batteryDodPct}%</span>
              </div>
              <input
                type="range"
                min={15.0}
                max={45.0}
                step={1.0}
                value={batteryDodPct}
                onChange={(e) => setBatteryDodPct(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <span className="text-[9px] text-slate-500 block">Req: &le; 25% (ECSS-E-20-30C)</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">RADIATION RDM</span>
                <span className="text-purple-400 font-bold">{radiationRdmRatio}x</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={4.0}
                step={0.1}
                value={radiationRdmRatio}
                onChange={(e) => setRadiationRdmRatio(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[9px] text-slate-500 block">Req: &ge; 2.0x (NASA-HDBK)</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">DECAY TIME (YRS)</span>
                <span className="text-amber-400 font-bold">{postMissionDecayYears} yrs</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={15.0}
                step={0.5}
                value={postMissionDecayYears}
                onChange={(e) => setPostMissionDecayYears(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[9px] text-slate-500 block">Req: &le; 5.0 yrs (FCC Rule)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
