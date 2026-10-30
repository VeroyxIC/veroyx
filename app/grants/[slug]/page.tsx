import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Shield, DollarSign, Calendar, Building } from "lucide-react"
import ExportButton from "@/components/ExportButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Props {
  params: Promise<{ slug: string }>
}

export default async function GrantDetailPage({ params }: Props) {
  const { slug } = await params

  const { data: grant } = await supabase
    .from("grants")
    .select("*, companies(*)")
    .eq("slug", slug)
    .single()

  if (!grant) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link
            href="/grants"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            RETURN TO PROCUREMENT INDEX
          </Link>
          <ExportButton data={[grant]} filename={`veroyx-${grant.slug}-award`} />
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {grant.status || "ACTIVE CONTRACT"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
            {grant.name}
          </h1>
          <p className="text-slate-300 text-base max-w-3xl leading-relaxed">
            {grant.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Award Obligation Value
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {grant.amount ? `$${(grant.amount / 1000000).toFixed(1)}M` : "Classified"}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Awarding Agency
            </div>
            <div className="text-lg font-bold text-white">
              {grant.awarding_agency || "Federal Obligation"}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              Prime Contractor
            </div>
            <div className="text-lg font-bold text-white truncate">
              {grant.companies?.name || "Prime Contractor"}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
