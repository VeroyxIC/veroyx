"use client"

import { use } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { AEROSPACE_COMPANIES } from "@/lib/companyData"
import { useMission } from "@/lib/missionStore"
import { 
  Building2, 
  Rocket, 
  Award, 
  DollarSign, 
  ExternalLink, 
  ArrowLeft, 
  Play, 
  ShieldCheck, 
  Layers,
  ChevronRight
} from "lucide-react"

export default function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const company = AEROSPACE_COMPANIES[resolvedParams.slug]
  const { updateMission } = useMission()
  const router = useRouter()

  if (!company) {
    notFound()
  }

  // Inject company spacecraft baseline into Mission Builder
  const loadPreset = () => {
    updateMission(company.veroyxSimulationPreset)
    router.push("/mission-builder")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Back Link */}
        <div>
          <Link
            href="/companies"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK TO REGISTRY
          </Link>
        </div>

        {/* Master Profile Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              {company.tier}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              {company.name}
            </h1>
            <div className="text-xs text-slate-400 font-mono flex flex-wrap gap-3">
              <span>HQ: {company.hq}</span>
              <span>&middot;</span>
              <span>Founded: {company.founded}</span>
              {company.ticker && (
                <>
                  <span>&middot;</span>
                  <span className="text-cyan-400 font-bold">{company.ticker}</span>
                </>
              )}
              <span>&middot;</span>
              <span>Market Cap / Valuation: {company.valuationOrCap}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={loadPreset}
              className="px-4 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              SIMULATE {company.veroyxSimulationPreset.missionName}
            </button>
          </div>
        </div>

        {/* Overview Box */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 font-sans text-sm text-slate-300 leading-relaxed">
          {company.summary}
        </div>

        {/* Flight Platforms Dossier */}
        <div className="space-y-4 font-mono text-xs">
          <div className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <Rocket className="w-4 h-4 text-cyan-400" /> Primary Flight Vehicles &amp; Spacecraft Lines
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {company.primaryPlatforms.map((p, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-slate-900/30 border border-slate-800 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{p.name}</h3>
                    <div className="text-[10px] text-cyan-400 mt-0.5">{p.type}</div>
                  </div>
                  {p.heritageFlights && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                      {p.heritageFlights} FLIGHTS
                    </span>
                  )}
                </div>

                <p className="text-xs font-sans text-slate-400 leading-relaxed">
                  {p.description}
                </p>

                <div className="pt-2 border-t border-slate-800/60 flex gap-4 text-[10px] text-slate-400">
                  {p.payloadToLeoKg && <div>LEO PAYLOAD: <strong className="text-white">{p.payloadToLeoKg.toLocaleString()} kg</strong></div>}
                  {p.dryMassKg && <div>DRY MASS: <strong className="text-white">{p.dryMassKg} kg</strong></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Defense & Institutional Programs */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Active Government &amp; Defense Contract Manifest
            </span>
            <span className="text-[10px] text-slate-500">PRIME &amp; SUBCONTRACT AWARDS</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Procuring Agency</th>
                  <th className="py-2.5 px-3">Program / Mission Scope</th>
                  <th className="py-2.5 px-3">Award Total</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {company.defenseContracts.map((cnt, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-cyan-400">
                      {cnt.agency}
                    </td>
                    <td className="py-3 px-3 text-white">
                      {cnt.program}
                    </td>
                    <td className="py-3 px-3 text-amber-300 font-bold">
                      {cnt.awardValue}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300 uppercase">
                        {cnt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Direct Simulation CTA */}
        <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-1">
            <div className="text-white font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Simulate {company.name} Flight Baselines
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Inject the {company.veroyxSimulationPreset.missionName} ({company.veroyxSimulationPreset.altitudeKm}km / {company.veroyxSimulationPreset.dryMassKg}kg) profile directly into the concurrent mission state bus.
            </p>
          </div>

          <button
            onClick={loadPreset}
            className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>LOAD PRESET INTO MISSION BUILDER</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
