import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { 
  Building2, MapPin, DollarSign, Users, Globe, 
  ArrowLeft, Cpu, ShieldCheck, ChevronRight, Activity 
} from "lucide-react"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CompanyDossierPage({ params }: Props) {
  const { slug } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    notFound()
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error || !company) {
    notFound()
  }

  const { data: relatedGrants } = await supabase
    .from("grants")
    .select("*")
    .ilike("name", `%${company.name}%`)
    .limit(3)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <Link 
            href="/companies" 
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO COMMERCIAL DIRECTORY
          </Link>
        </div>

        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Verified Commercial Prime
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
              {company.name}
            </h1>
            <p className="text-slate-400 mt-2 text-sm font-mono flex items-center gap-2">
              <span>SECTOR INDEX:</span>
              <span className="text-cyan-300 font-semibold">{company.sector || "Commercial Aerospace"}</span>
            </p>
          </div>

          {company.website && (
            <div>
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-white text-xs font-mono transition-all"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>OFFICIAL PORTAL</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>TOTAL CAPITAL</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">
              {company.funding_total || "Confidential"}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Disclosed private/public</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>HEADCOUNT</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">
              {company.employee_count ? `${company.employee_count}+` : "Scale-up"}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Full-time engineering</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>PRIMARY HQ</span>
              <MapPin className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold font-mono text-white mt-3 line-clamp-1">
              {company.hq_location || "United States"}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Operations base</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>OPERATIONAL STATUS</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ACTIVE PRIME
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Tier-1 Qualified</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-7 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                EXECUTIVE INTELLIGENCE PROFILE
              </h2>
              <p className="text-slate-300 leading-relaxed text-sm">
                {company.description}
              </p>
            </div>

            <div className="p-7 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ASSOCIATED FEDERAL CONTRACTS & SBIR/STTR AWARDS
              </h2>
              {relatedGrants && relatedGrants.length > 0 ? (
                <div className="space-y-3">
                  {relatedGrants.map((grant) => (
                    <div key={grant.slug} className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center text-xs font-mono">
                      <div>
                        <div className="text-slate-200 font-semibold">{grant.name}</div>
                        <div className="text-slate-500 mt-0.5">{grant.awarding_agency || "Federal Agency"}</div>
                      </div>
                      <div className="text-emerald-400 font-bold">
                        ${Number(grant.amount).toLocaleString()} USD
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-500 italic">
                  No public direct prime contract filings attached to this operational entity.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Dossier Specifications
              </h3>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">DATABASE ID:</span>
                <span className="text-slate-300">{company.slug}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">INDEX SECURITY:</span>
                <span className="text-cyan-400">UNCLASSIFIED</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">VERIFIED CADENCE:</span>
                <span className="text-slate-300">DAILY</span>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-950/30 to-slate-900 border border-cyan-500/20 text-xs font-mono space-y-3">
              <div className="text-cyan-400 font-bold flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                DATA ACCESS NOTE
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Programmatic telemetry ingested via Supabase PostgREST edge API. To request full hardware schematic dossiers, query through the terminal command palette.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
