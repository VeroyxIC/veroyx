import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Building2, DollarSign, MapPin, ExternalLink, ShieldCheck } from "lucide-react"
import ExportButton from "@/components/ExportButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CompaniesPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let companies: any[] = []

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase.from("companies").select("*").order("name")
    if (data) companies = data
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Institutional Directory
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white font-mono">
              COMMERCIAL OPERATORS & PRIMES
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Comprehensive telemetry directory indexing venture-backed aerospace primes, propulsion labs, and orbital manufacturers.
            </p>
          </div>
          <ExportButton data={companies} filename="veroyx-commercial-primes" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((c) => (
            <Link
              key={c.slug}
              href={`/companies/${c.slug}`}
              className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/70 transition-all group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    {c.sector || "Commercial Prime"}
                  </span>
                  <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h2 className="text-xl font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                  {c.name}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{c.funding_total || "Confidential"}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate justify-end">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{c.hq_location || "United States"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
