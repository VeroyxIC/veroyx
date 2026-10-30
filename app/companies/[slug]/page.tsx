import { notFound } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import SupplyChainGraph from "@/components/SupplyChainGraph"
import ExportButton from "@/components/ExportButton"
import WatchlistButton from "@/components/WatchlistButton"
import { ArrowLeft, ExternalLink, DollarSign, MapPin, Building, Shield, Cpu, Calendar, FileText } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CompanyDetailPage({
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-sm font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO DIRECTORY
        </Link>

        {/* Header Block */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-mono text-xs uppercase tracking-wider">
                {company.sector || "Commercial Prime"}
              </span>
              {company.hq_location && (
                <span className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.hq_location}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              {company.name}
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              {company.description || "Active aerospace contractor and orbital system manufacturer."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/companies/${company.slug}/briefing`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-mono text-xs font-bold flex items-center gap-2 transition-all shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              DEFENSE BRIEFING (PDF)
            </a>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-mono text-xs flex items-center gap-2 transition-all"
              >
                VISIT PRIME <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <WatchlistButton entityType="company" entityId={company.id} entityName={company.name} entitySlug={company.slug} />
            <ExportButton
              data={[{ ...company, technologies, grants }]}
              filename={`${company.slug}-dossier`}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              TOTAL CAPITAL RAISED
            </div>
            <div className="text-2xl font-bold text-white">
              {company.funding_total || "Confidential"}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-purple-400" />
              PROPRIETARY HARDWARE
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {technologies?.length || 0} SYSTEMS
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-cyan-400" />
              DEFENSE & PUBLIC AWARDS
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {grants?.length || 0} ACTIVE
            </div>
          </div>
        </div>

        {/* Interactive Supply Chain & Subsystem Topology */}
        <SupplyChainGraph
          companyName={company.name}
          technologies={technologies || []}
          grants={grants || []}
        />

        {/* Relational Columns: Hardware Systems & Defense Grants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subsystems */}
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-purple-400" /> Hardware Platforms
              </h3>
              <span className="text-xs text-slate-500">{technologies?.length || 0} INDEXED</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {(technologies || []).map((t) => (
                <Link
                  key={t.id}
                  href={`/technologies/${t.slug}`}
                  className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 hover:border-purple-500/40 block transition-all group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
                      {t.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-300">
                      TRL {t.trl || 7}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">{t.description || "Subsystem telemetry active."}</div>
                </Link>
              ))}
              {(!technologies || technologies.length === 0) && (
                <div className="p-6 rounded-xl border border-slate-800/60 text-center text-slate-500 text-xs">
                  No proprietary flight hardware indexed yet.
                </div>
              )}
            </div>
          </div>

          {/* Federal Awards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-cyan-400" /> Procurement Contracts
              </h3>
              <span className="text-xs text-slate-500">{grants?.length || 0} OBLIGATED</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {(grants || []).map((g) => (
                <Link
                  key={g.id}
                  href={`/grants/${g.slug}`}
                  className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 hover:border-cyan-500/40 block transition-all group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {g.name}
                    </span>
                    <span className="font-bold text-emerald-400">
                      ${g.amount ? (Number(g.amount) / 1000000).toFixed(1) + "M" : "Confidential"}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">
                    {g.awarding_agency || "NASA / Space Force"} • {g.status || "Awarded"}
                  </div>
                </Link>
              ))}
              {(!grants || grants.length === 0) && (
                <div className="p-6 rounded-xl border border-slate-800/60 text-center text-slate-500 text-xs">
                  No federal grant obligations tracked yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
