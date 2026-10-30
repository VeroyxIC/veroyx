import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { 
  FileText, ArrowLeft, DollarSign, Building2, 
  Calendar, ShieldCheck, CheckCircle2, Award, ExternalLink
} from "lucide-react"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function GrantDossierPage({ params }: Props) {
  const { slug } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) notFound()

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: grant, error } = await supabase
    .from("grants")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error || !grant) notFound()

  const formattedAmount = grant.amount 
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: grant.currency || "USD", maximumFractionDigits: 0 }).format(Number(grant.amount))
    : "Classified / Disclosed in Filing"

  const awardDateStr = grant.award_date 
    ? new Date(grant.award_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Fiscal Cycle Active"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <Link href="/grants" className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO FEDERAL AWARDS REPOSITORY
          </Link>
        </div>

        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Federal Prime Obligation
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
              {grant.name}
            </h1>
            <p className="text-slate-400 mt-2 text-sm font-mono flex items-center gap-2">
              <span>AWARDING AUTHORITY:</span>
              <span className="text-cyan-300 font-semibold">{grant.awarding_agency || "Federal Agency"}</span>
            </p>
          </div>

          <div className="font-mono text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              STATUS: <strong className="text-emerald-400">{grant.status || "ACTIVE"}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>TOTAL OBLIGATION</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2 truncate">
              {formattedAmount}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Non-dilutive appropriation</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>AWARD DATE</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm font-bold font-mono text-white mt-3 truncate">
              {awardDateStr}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Execution milestone</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>INSTRUMENT</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold font-mono text-white mt-3">
              Firm-Fixed-Price
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Commercial item FAR</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>VERIFICATION</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              FPDS AUDITED
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Federal registry</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-7 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                PROGRAMMATIC SCOPE OF WORK
              </h2>
              <p className="text-slate-300 leading-relaxed text-sm">
                {grant.description || "Federal contract obligation for commercial space prime deliverables."}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3 font-mono text-xs">
              <h3 className="text-white font-bold uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                COMPLIANCE & CLEARANCE FRAMEWORK
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-slate-300">
                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">EXPORT CONTROL</span>
                  ITAR / EAR Dual-Use Restricted
                </div>
                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">TECHNICAL DATA RIGHTS</span>
                  FAR Commercial Customary Rights
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Registry Metadata
              </h3>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">CONTRACT SLUG:</span>
                <span className="text-slate-300 truncate max-w-[140px]">{grant.slug}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">CURRENCY:</span>
                <span className="text-cyan-400">{grant.currency || "USD"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">COMMAND BAR:</span>
                <span className="text-slate-300">⌘K READY</span>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-950/30 to-slate-900 border border-cyan-500/20 text-xs font-mono space-y-3">
              <div className="text-cyan-400 font-bold flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                DATA ORIGIN NOTE
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Procurement indexed directly from Federal Awards streams. All records reflect public non-dilutive capital distributions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
