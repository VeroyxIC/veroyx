import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { ExternalLink } from "lucide-react"
import ExportButton from "@/components/ExportButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function TechnologiesPage() {
  const { data: technologies } = await supabase
    .from("technologies")
    .select("*")
    .order("name", { ascending: true })

  const list = technologies || []

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Hardware & Systems ({list.length} Indexed)
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white font-mono">
              AEROSPACE HARDWARE & TECH
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Proprietary orbital vehicles, aerospike engines, reentry capsules, and lunar landers indexed by NASA/DoD TRL readiness.
            </p>
          </div>
          <ExportButton data={list} filename="veroyx-hardware-systems" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((t: any) => (
            <Link
              key={t.slug}
              href={`/technologies/${t.slug}`}
              className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/70 transition-all group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    TRL {t.trl || 7} • {t.sector || "Hardware"}
                  </span>
                  <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h2 className="text-xl font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                  {t.name}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {t.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-slate-500">TARGET ENVELOPE:</span>
                <span className="text-cyan-400 truncate font-semibold">{t.target_domain || "LEO / Suborbital"}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
