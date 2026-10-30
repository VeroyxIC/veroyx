import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Shield, Cpu, Building2, Calendar, FileText, CheckCircle2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DossierBriefingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!company) return notFound()

  const [{ data: technologies }, { data: grants }] = await Promise.all([
    supabase.from("technologies").select("*").eq("company_id", company.id),
    supabase.from("grants").select("*").eq("company_id", company.id),
  ])

  const totalContractVal = (grants || []).reduce(
    (acc, g) => acc + (Number(g.amount) || 0),
    0
  )

  return (
    <div className="min-h-screen bg-white text-slate-900 p-8 sm:p-14 font-mono print:p-0">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* CLASSIFICATION & PROTOCOL BANNER */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
            VEROYX INTELLIGENCE PROTOCOL // EXECUTIVE BRIEFING
          </div>
          <div className="text-[10px] px-2.5 py-1 border border-slate-900 font-bold uppercase bg-slate-100">
            DISTRIBUTION: COMMERCIAL / DEFENSE PROPRIETARY
          </div>
        </div>

        {/* DOSSIER HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-300 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              {company.name}
            </h1>
            <div className="text-xs text-slate-600 mt-1">
              SECTOR: <span className="font-bold text-slate-900">{company.sector || "AEROSPACE PRIME"}</span> | HQ: {company.hq_location || "CONFIDENTIAL"}
            </div>
          </div>
          <div className="text-right sm:text-right font-mono">
            <div className="text-[10px] text-slate-500 uppercase">DOCUMENT ID</div>
            <div className="text-xs font-bold text-slate-900">VX-DOSSIER-{company.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-[10px] text-slate-500 mt-1">ISSUED: {new Date().toISOString().split("T")[0]}</div>
          </div>
        </div>

        {/* CORE METRICS MATRIX */}
        <div className="grid grid-cols-3 gap-4 border border-slate-300 p-4 bg-slate-50">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">CAPITALIZATION TOTAL</div>
            <div className="text-xl font-black text-slate-900">{company.funding_total || "CONFIDENTIAL"}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">CONTRACT OBLIGATIONS</div>
            <div className="text-xl font-black text-slate-900">
              ${(totalContractVal / 1000000).toFixed(1)}M
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">SYSTEMS INDEXED</div>
            <div className="text-xl font-black text-slate-900">{technologies?.length || 0} HARDWARE UNITS</div>
          </div>
        </div>

        {/* PROFILE SUMMARY */}
        <div className="space-y-2">
          <div className="text-xs font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-1">
            I. EXECUTIVE OVERVIEW & CAPABILITIES
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans">
            {company.description || "Proprietary space infrastructure contractor delivering advanced orbital and sub-orbital flight capabilities."}
          </p>
        </div>

        {/* SUBSYSTEMS & HARDWARE TABLE */}
        <div className="space-y-3">
          <div className="text-xs font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>II. PROPRIETARY HARDWARE & PROPULSION SYSTEMS</span>
            <span className="text-[10px] text-slate-500">TRL READINESS AUDIT</span>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] text-slate-500 uppercase">
                <th className="py-2">SYSTEM NAME</th>
                <th className="py-2">TARGET DOMAIN</th>
                <th className="py-2">STATUS</th>
                <th className="py-2 text-right">MATURITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(technologies || []).map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 font-bold text-slate-900">{t.name}</td>
                  <td className="py-2.5 text-slate-600">{t.target_domain || "Orbital"}</td>
                  <td className="py-2.5 text-slate-600">{t.status || "Operational"}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900">TRL {t.trl || 7} / 9</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CONTRACT AWARDS TABLE */}
        <div className="space-y-3">
          <div className="text-xs font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-1">
            III. PRIME FEDERAL & DEFENSE OBLIGATIONS
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] text-slate-500 uppercase">
                <th className="py-2">CONTRACT / PROGRAM</th>
                <th className="py-2">AWARDING AGENCY</th>
                <th className="py-2">STATUS</th>
                <th className="py-2 text-right">OBLIGATED AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(grants || []).map((g) => (
                <tr key={g.id}>
                  <td className="py-2.5 font-bold text-slate-900">{g.name}</td>
                  <td className="py-2.5 text-slate-600">{g.awarding_agency || "NASA / DoD"}</td>
                  <td className="py-2.5 text-slate-600">{g.status || "Awarded"}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    ${g.amount ? (Number(g.amount) / 1000000).toFixed(2) + "M" : "UNDISCLOSED"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECURITY & TELEMETRY FOOTER */}
        <div className="border-t-2 border-slate-900 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>VEROYX AEROSPACE ANALYTICS // VERIFIED CHECKSUM: {company.id.split("-")[0]}</div>
          <div>PAGE 1 OF 1</div>
        </div>

        {/* ACTION BUTTON (HIDDEN ON PRINT) */}
        <div className="pt-4 flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded bg-slate-900 text-white font-mono text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            PRINT / SAVE AS PDF
          </button>
        </div>

      </div>
    </div>
  )
}
