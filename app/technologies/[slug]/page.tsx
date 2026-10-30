import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Cpu, Gauge, Orbit, ShieldCheck } from "lucide-react"
import ExportButton from "@/components/ExportButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TechnologyDetailPage({ params }: Props) {
  const { slug } = await params

  const { data: tech } = await supabase
    .from("technologies")
    .select("*, companies(*)")
    .eq("slug", slug)
    .single()

  if (!tech) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link
            href="/technologies"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            RETURN TO HARDWARE INDEX
          </Link>
          <ExportButton data={[tech]} filename={`veroyx-${tech.slug}-spec`} />
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            TRL {tech.trl || 7} • {tech.sector || "Space Hardware"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
            {tech.name}
          </h1>
          <p className="text-slate-300 text-base max-w-3xl leading-relaxed">
            {tech.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Orbit className="w-3.5 h-3.5 text-cyan-400" />
              Target Operational Envelope
            </div>
            <div className="text-lg font-bold text-white">
              {tech.target_domain || "LEO / Suborbital"}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              NASA/DoD Readiness Level
            </div>
            <div className="text-lg font-bold text-white">
              Level {tech.trl || 7} of 9
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Developer Entity
            </div>
            <div className="text-lg font-bold text-white truncate">
              {tech.companies?.name || "Proprietary Prime"}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
