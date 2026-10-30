import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { ExternalLink } from "lucide-react"
import ExportButton from "@/components/ExportButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function GrantsPage() {
  const { data: grants } = await supabase
    .from("grants")
    .select("*")
    .order("name", { ascending: true })

  const list = grants || []

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Procurement & Non-Dilutive Capital ({list.length} Indexed)
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white font-mono">
              FEDERAL PRIME CONTRACTS & SBIR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Non-dilutive awards, Space Force mission orders, and NASA CLPS contracts awarded to commercial space operators.
            </p>
          </div>
          <ExportButton data={list} filename="veroyx-defense-contracts" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((g: any) => (
            <Link
              key={g.slug}
              href={`/grants/${g.slug}`}
              className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/70 transition-all group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                    {g.status || "ACTIVE CONTRACT"}
                  </span>
                  <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </div>
                <h2 className="text-xl font-bold font-mono text-white group-hover:text-emerald-300 transition-colors">
                  {g.name}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {g.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">{g.awarding_agency || "Federal Obligation"}</span>
                <span className="text-emerald-400 font-bold">
                  {g.amount ? `$${(g.amount / 1000000).toFixed(1)}M` : "Classified"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
