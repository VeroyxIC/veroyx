import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Building2, MapPin, DollarSign, Users, ChevronRight } from "lucide-react"
import DataExportMenu from "@/components/DataExportMenu"

export const dynamic = "force-dynamic"

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
          <div className="flex items-center gap-3">
            <DataExportMenu filename="veroyx-companies" data={companies} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((c) => (
            <Link
              key={c.slug}
              href={`/companies/${c.slug}`}
              className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">{c.sector || "Space Tech"}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h2 className="text-xl font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                  {c.name}
                </h2>
                <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">{c.funding_total || "Private"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{c.employee_count ? `${c.employee_count}+` : "Confidential"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
