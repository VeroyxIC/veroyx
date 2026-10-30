import Link from "next/link"
import { notFound } from "next/navigation"
import SupplyChainGraph from "@/components/SupplyChainGraph"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, ExternalLink, DollarSign, MapPin, Building, Shield, Cpu, Calendar } from "lucide-react"
import ExportButton from "@/components/ExportButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { slug } = await params

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!company) {
    notFound()
  }

  // Cross-reference related hardware and awards
  const [{ data: technologies }, { data: grants }] = await Promise.all([
    supabase.from("technologies").select("*").eq("company_id", company.id),
    supabase.from("grants").select("*").eq("company_id", company.id),
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            RETURN TO DIRECTORY
          </Link>
          <ExportButton data={[company]} filename={`veroyx-${company.slug}-dossier`} />
        </div>

        {/* Header Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            {company.sector || "Commercial Prime"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
            {company.name}
          </h1>
          <p className="text-slate-300 text-base max-w-3xl leading-relaxed">
            {company.description}
          </p>
        </div>

        {/* Telemetry Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Capital Raised
            </div>
            <div className="text-xl font-bold text-white">
              {company.funding_total || "Classified / Undisclosed"}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Operational HQ
            </div>
            <div className="text-xl font-bold text-white">
              {company.hq_location || "United States"}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Founded
            </div>
            <div className="text-xl font-bold text-white">
              {company.founded_year || "Verified Commercial"}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Building className="w-3.5 h-3.5 text-purple-400" />
              Stage
            </div>
            <div className="text-xl font-bold text-white">
              {company.stage || "Growth / Scale"}
            </div>
          </div>
        </div>

        {/* Relational Intelligence Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          
          {/* Hardware & Systems */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h2 className="text-lg font-bold font-mono text-white tracking-wide">
                SYSTEMS & HARDWARE ({technologies?.length || 0})
              </h2>
            </div>
            {technologies && technologies.length > 0 ? (
              <div className="space-y-3">
                {technologies.map((t: any) => (
                  <Link
                    key={t.slug}
                    href={`/technologies/${t.slug}`}
                    className="block p-4 rounded-lg bg-slate-900/30 border border-slate-800 hover:border-cyan-500/40 transition-all"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono font-bold text-white text-sm">{t.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                        TRL {t.trl || 7}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-600 p-4 border border-dashed border-slate-800 rounded-lg">
                No proprietary hardware lines unclassified under public records.
              </p>
            )}
          </div>

          {/* Federal Awards & Contracts */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-bold font-mono text-white tracking-wide">
                DEFENSE & NASA CONTRACTS ({grants?.length || 0})
              </h2>
            </div>
            {grants && grants.length > 0 ? (
              <div className="space-y-3">
                {grants.map((g: any) => (
                  <Link
                    key={g.slug}
                    href={`/grants/${g.slug}`}
                    className="block p-4 rounded-lg bg-slate-900/30 border border-slate-800 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono font-bold text-white text-sm">{g.name}</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {g.amount ? `$${(g.amount / 1000000).toFixed(1)}M` : "Classified"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{g.description}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-600 p-4 border border-dashed border-slate-800 rounded-lg">
                No active public grant or SBIR obligations recorded.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
