import Link from "next/link"
import { notFound } from "next/navigation"
import { AEROSPACE_TECHNOLOGIES } from "@/lib/techData"
import { 
  Cpu, 
  ArrowLeft, 
  CheckCircle2, 
  Layers,
  Settings
} from "lucide-react"

export function generateStaticParams() {
  return Object.keys(AEROSPACE_TECHNOLOGIES).map((slug) => ({
    slug,
  }))
}

export default async function TechnologyDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params
  const tech = AEROSPACE_TECHNOLOGIES[slug]

  if (!tech) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Back Link */}
        <div>
          <Link
            href="/technologies"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK TO DIRECTORY
          </Link>
        </div>

        {/* Header Block */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              {tech.domain} &middot; TRL {tech.trl}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-mono">
              {tech.name}
            </h1>
            <div className="text-xs text-slate-400 font-mono">
              GOVERNING STANDARD: <span className="text-cyan-300 font-bold">{tech.governingStandard}</span>
            </div>
          </div>

          <Link
            href={tech.veroyxEnginePath}
            className="px-4 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 text-xs font-mono shrink-0"
          >
            <Layers className="w-4 h-4" />
            SIMULATE IN ENGINE
          </Link>
        </div>

        {/* Description */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-sm text-slate-300 leading-relaxed font-sans">
          {tech.summary}
        </div>

        {/* Specifications Matrix */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              Physical &amp; Operational Performance Specifications
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">FLIGHT QUALIFIED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(tech.specifications).map(([key, val], idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">{key}</span>
                <strong className="text-white text-xs">{val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Flight Heritage */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Demonstrated Flight Heritage Missions
          </span>

          <div className="flex flex-wrap gap-2 pt-1">
            {tech.heritageMissions.map((m, idx) => (
              <span key={idx} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-bold text-xs">
                {m}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
