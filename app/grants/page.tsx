import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { ShieldCheck, DollarSign, Calendar, ChevronRight } from "lucide-react"
import DataExportMenu from "@/components/DataExportMenu"

export const dynamic = "force-dynamic"

export default async function GrantsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let grants: any[] = []

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase.from("grants").select("*").order("amount", { ascending: false })
    if (data) grants = data
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Procurement & Non-Dilutive Capital
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white font-mono">
              FEDERAL PRIME CONTRACTS & SBIR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Non-dilutive awards, Space Force mission orders, and NASA CLPS contracts awarded to commercial space operators.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DataExportMenu filename="veroyx-grants" data={grants} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grants.map((g) => (
            <Link
              key={g.slug}
              href={`/grants/${g.slug}`}
              className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 truncate max-w-[200px]">
                    {g.awarding_agency || "Federal Agency"}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    ${Number(g.amount).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-mono text-white group-hover:text-emerald-300 transition-colors">
                  {g.name}
                </h2>
                <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                  {g.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{g.award_date ? new Date(g.award_date).getFullYear() : "Active"}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0 ml-2" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
