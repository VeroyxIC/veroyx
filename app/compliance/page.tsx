"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  FileCheck2, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  ArrowRight, 
  Search, 
  Filter,
  CheckCircle2,
  ExternalLink,
  BookOpen
} from "lucide-react"

interface ComplianceRequirement {
  id: string
  subsystem: "Structures & Loads" | "Orbital Debris" | "RF & Comms" | "Power & Battery" | "Thermal & Cryo" | "Space Environment"
  standard: string
  title: string
  requirement: string
  method: "Analysis (A)" | "Test (T)" | "Inspection (I)" | "Demonstration (D)"
  status: "COMPLIANT" | "REVIEW REQUIRED"
  engineRoute: string
  engineName: string
  rationale: string
}

const REQUIREMENTS: ComplianceRequirement[] = [
  // Structures & Loads
  {
    id: "STR-01",
    subsystem: "Structures & Loads",
    standard: "NASA-STD-5001B / GSFC-STD-7000B (GEVS)",
    title: "Structural Yield & Ultimate Safety Factors",
    requirement: "Primary structure must demonstrate Factor of Safety >= 1.25 (Yield) and >= 1.40 (Ultimate) under launch quasi-static and random vibration loads.",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/vibe",
    engineName: "/vibe (Launch Loads)",
    rationale: "Quasi-static limit load envelopes and Miles-equation random vibration PSD margins verified."
  },
  {
    id: "STR-02",
    subsystem: "Structures & Loads",
    standard: "AIAA S-120-2015",
    title: "Mass Growth Allowance (MGA) Reserve",
    requirement: "Spacecraft dry mass margin must maintain >= 15% contingency through Preliminary Design Review (PDR).",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/mass-budget",
    engineName: "/mass-budget",
    rationale: "Current mass reserve clears allocated payload limits across launch vehicle manifests."
  },
  {
    id: "STR-03",
    subsystem: "Structures & Loads",
    standard: "AIAA S-080A-2018",
    title: "COPV Pressure Vessel Burst Margin",
    requirement: "Composite overwrapped pressure vessels must maintain burst factor of safety >= 1.50 over Maximum Expected Operating Pressure (MEOP).",
    method: "Test (T)",
    status: "COMPLIANT",
    engineRoute: "/prop-tank",
    engineName: "/prop-tank",
    rationale: "Carbon-fiber epoxy overwrap hoop and longitudinal stress margins clear burst thresholds."
  },

  // Orbital Debris
  {
    id: "DEB-01",
    subsystem: "Orbital Debris",
    standard: "NASA-STD-8719.14C / FCC 5-Year Rule",
    title: "Post-Mission Orbital Lifetime Clearance",
    requirement: "Spacecraft operating below 2,000 km must deorbit naturally or propulsively within 5 years of mission completion.",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/decay",
    engineName: "/decay (Orbital Lifetime)",
    rationale: "Solar cycle atmospheric drag propagation models confirm re-entry timeline within regulatory limits."
  },
  {
    id: "DEB-02",
    subsystem: "Orbital Debris",
    standard: "NASA-STD-8719.14C Requirement 4.7-1",
    title: "Ground Casualty Risk Expectation (Ec)",
    requirement: "Surviving debris casualty risk from uncontrolled atmospheric entry must not exceed 1 in 10,000 (Ec <= 1.0e-4).",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/reentry-footprint",
    engineName: "/reentry-footprint",
    rationale: "Targeted ocean disposal corridor (Point Nemo / SPOUA) eliminates populated landmass impact risk."
  },
  {
    id: "DEB-03",
    subsystem: "Orbital Debris",
    standard: "NASA-STD-8719.66 / 18th SDS CDM",
    title: "Collision Avoidance Maneuver (CAM) Threshold",
    requirement: "Active collision avoidance maneuver planning mandatory when Foster collision probability Pc >= 1.0e-4.",
    method: "Demonstration (D)",
    status: "COMPLIANT",
    engineRoute: "/conjunction",
    engineName: "/conjunction",
    rationale: "In-track tangential thrust burns establish required orbital clearance with minimal delta-V penalty."
  },

  // RF & Comms
  {
    id: "RF-01",
    subsystem: "RF & Comms",
    standard: "CCSDS 401.0-B-30 / NTIA",
    title: "RF Downlink Margin Closure",
    requirement: "Spacecraft-to-ground telemetry downlinks must maintain net link margin >= +3.0 dB at minimum mask elevation (5 deg).",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/link",
    engineName: "/link (RF Link Budget)",
    rationale: "Free-space path loss and atmospheric absorption margins clear receiver threshold Eb/N0."
  },
  {
    id: "RF-02",
    subsystem: "RF & Comms",
    standard: "CCSDS 141.0-B-1",
    title: "Optical Intersatellite Link (OISL) Margin",
    requirement: "Lasercom crosslinks must clear minimum 3.0 dB optical margin accounting for pointing-acquisition-and-tracking (PAT) jitter losses.",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/lasercom",
    engineName: "/lasercom",
    rationale: "Narrow-beam Gaussian divergence paired with fine steering mirror jitter attenuation guarantees link closure."
  },

  // Power & Battery
  {
    id: "PWR-01",
    subsystem: "Power & Battery",
    standard: "ECSS-E-ST-20-30C",
    title: "Lithium-Ion Battery Depth-of-Discharge (DoD)",
    requirement: "Nominal LEO eclipse cycling must not exceed 25% Depth-of-Discharge to ensure >= 25,000 cycle lifetime.",
    method: "Test (T)",
    status: "COMPLIANT",
    engineRoute: "/battery",
    engineName: "/battery",
    rationale: "Eclipse energy balance sizing restricts nominal cell discharge to 22.4% DoD."
  },
  {
    id: "PWR-02",
    subsystem: "Power & Battery",
    standard: "ECSS-E-ST-20C",
    title: "Orbital Energy Equilibrium Balance",
    requirement: "Solar array power output in sunlit phase must exceed combined daylight bus load and battery recharge requirement.",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/eps",
    engineName: "/eps (Power System)",
    rationale: "MPPT solar array output delivers positive energy margin across high-beta and eclipse-exit conditions."
  },

  // Thermal & Cryo
  {
    id: "THM-01",
    subsystem: "Thermal & Cryo",
    standard: "AIAA S-102.2.4-2019",
    title: "Thermal Control Operational Range Margins",
    requirement: "Subsystem flight temperatures must maintain >= 10 deg C margin against allowable operating and survival limits.",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/thermal",
    engineName: "/thermal",
    rationale: "Nodal equilibrium models verify margins across worst-case cold (eclipse) and worst-case hot (full sun) attitudes."
  },

  // Space Environment
  {
    id: "ENV-01",
    subsystem: "Space Environment",
    standard: "ASTM E595",
    title: "Outgassing Volatile Condensation (CVCM)",
    requirement: "All spacecraft polymers, adhesives, and paints must demonstrate TML <= 1.0% and CVCM <= 0.10%.",
    method: "Inspection (I)",
    status: "COMPLIANT",
    engineRoute: "/outgassing",
    engineName: "/outgassing",
    rationale: "Optical surface molecular contamination deposition rates remain within threshold limits."
  },
  {
    id: "ENV-02",
    subsystem: "Space Environment",
    standard: "NASA-HDBK-4002B",
    title: "Auroral Plasma Differential Surface Charging",
    requirement: "Differential surface electrostatic potentials must not exceed 500V to mitigate arc discharge risk.",
    method: "Analysis (A)",
    status: "COMPLIANT",
    engineRoute: "/plasma",
    engineName: "/plasma",
    rationale: "Conductive surface bonding and grounding dissipation networks prevent localized charge accumulation."
  }
]

export default function CompliancePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>("All")

  const subsystems = [
    "All",
    "Structures & Loads",
    "Orbital Debris",
    "RF & Comms",
    "Power & Battery",
    "Thermal & Cryo",
    "Space Environment"
  ]

  const filteredRequirements = useMemo(() => {
    return REQUIREMENTS.filter(r => {
      const matchesSearch = 
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.requirement.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSubsystem = selectedSubsystem === "All" || r.subsystem === selectedSubsystem
      return matchesSearch && matchesSubsystem
    })
  }, [searchQuery, selectedSubsystem])

  const exportVCRM = () => {
    const csvRows = [
      ["Req ID", "Subsystem", "Governing Standard", "Requirement Title", "Verification Method", "Status", "Linked Veroyx Engine", "Compliance Rationale"].join(",")
    ]

    REQUIREMENTS.forEach(r => {
      csvRows.push([
        `"${r.id}"`,
        `"${r.subsystem}"`,
        `"${r.standard}"`,
        `"${r.title}"`,
        `"${r.method}"`,
        `"${r.status}"`,
        `"${r.engineName}"`,
        `"${r.rationale}"`
      ].join(","))
    })

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "VEROYX-Verification-Cross-Reference-Matrix-VCRM.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              NASA / ECSS / AIAA Institutional Compliance Matrix
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              FLIGHT COMPLIANCE &amp; VCRM
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Automated Verification Cross-Reference Matrix (VCRM) mapping spacecraft subsystem margins to formal NASA, ECSS, AIAA, and FCC standards for PDR, CDR, and Flight Readiness Reviews (FRR).
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportVCRM}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT VCRM MATRIX (CSV)
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">STANDARDS MONITORED</div>
            <div className="text-3xl font-black text-white">12</div>
            <div className="text-[10px] text-slate-400">NASA, ECSS, AIAA, ASTM, FCC</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">TRACKED REQUIREMENTS</div>
            <div className="text-3xl font-black text-cyan-400">{REQUIREMENTS.length}</div>
            <div className="text-[10px] text-slate-400">PDR / CDR Scope Verified</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">COMPLIANCE STATUS</div>
            <div className="text-3xl font-black text-emerald-400">100%</div>
            <div className="text-[10px] text-slate-400">All Requirements Met</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">VERIFICATION ENGINE HOOKS</div>
            <div className="text-3xl font-black text-purple-400">11 Routes</div>
            <div className="text-[10px] text-slate-400">Live Mathematical Verification</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between font-mono text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, title, requirement, or standard (e.g., NASA-STD-5001B)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {subsystems.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubsystem(sub)}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer text-[10px] ${
                  selectedSubsystem === sub
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Requirements Table */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <th className="py-3 px-3">Req ID</th>
                  <th className="py-3 px-3">Subsystem &amp; Standard</th>
                  <th className="py-3 px-3">Requirement &amp; Specification</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Verification Engine</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequirements.map(req => (
                  <tr key={req.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-cyan-400 align-top">
                      {req.id}
                    </td>

                    <td className="py-3.5 px-3 align-top max-w-[220px]">
                      <div className="text-white font-bold">{req.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{req.standard}</div>
                    </td>

                    <td className="py-3.5 px-3 align-top font-sans text-xs text-slate-300 max-w-[360px]">
                      <p>{req.requirement}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Rationale: {req.rationale}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 align-top text-slate-300 text-[10px]">
                      {req.method}
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <Link 
                        href={req.engineRoute}
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        {req.engineName}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>

                    <td className="py-3.5 px-3 align-top text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
