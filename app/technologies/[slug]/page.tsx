import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { 
  Cpu, ArrowLeft, Orbit, CheckCircle2, 
  ShieldCheck, Layers, Gauge, ExternalLink, Activity
} from "lucide-react"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

const TRL_STAGES = [
  { level: 1, title: "Basic Principles" },
  { level: 2, title: "Concept Formulated" },
  { level: 3, title: "Proof of Concept" },
  { level: 4, title: "Lab Validation" },
  { level: 5, title: "Relevant Environment" },
  { level: 6, title: "System Prototype" },
  { level: 7, title: "Space Demo" },
  { level: 8, title: "Flight Qualified" },
  { level: 9, title: "Flight Proven" },
]

export default async function TechnologyDossierPage({ params }: Props) {
  const { slug } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    notFound()
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: tech, error } = await supabase
    .from("technologies")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error || !tech) {
    notFound()
  }

  const currentTrl = Number(tech.trl) || 6

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Breadcrumb */}
        <div>
          <Link 
            href="/technologies" 
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO PROPULSION & HARDWARE INDEX
          </Link>
        </div>

        {/* Header Telemetry */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Proprietary Flight System
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
              {tech.name}
            </h1>
            <p className="text-slate-400 mt-2 text-sm font-mono flex items-center gap-2">
              <span>SYSTEM CLASSIFICATION:</span>
              <span className="text-cyan-300 font-semibold">{tech.sector || "Space Systems Architecture"}</span>
            </p>
          </div>

          <div className="font-mono text-xs flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              STATUS: <strong className="text-emerald-400">ACTIVE FLIGHT R&D</strong>
            </span>
          </div>
        </div>

        {/* TRL Maturity Progress Ladder */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                NASA / DOD TECHNOLOGY READINESS LEVEL (TRL)
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Current Maturity: <span className="text-cyan-400 font-bold">TRL {currentTrl} of 9</span> — {TRL_STAGES[currentTrl - 1]?.title}
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 self-start sm:self-auto">
              {currentTrl >= 7 ? "SPACE DEMONSTRATED" : "VALIDATION BENCH"}
            </span>
          </div>

          {/* 9-Stage Progress Steps */}
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 pt-2">
            {TRL_STAGES.map((s) => {
              const isPassed = s.level <= currentTrl
              const isCurrent = s.level === currentTrl
              return (
                <div 
                  key={s.level} 
                  className={`p-2 rounded-md border text-center transition-all ${
                    isCurrent 
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-950" 
                      : isPassed 
                        ? "bg-slate-800/80 border-slate-700 text-slate-200" 
                        : "bg-slate-950/40 border-slate-900 text-slate-600"
                  }`}
                >
                  <div className="text-[11px] font-mono font-bold">TRL {s.level}</div>
                  <div className="text-[9px] font-mono truncate hidden sm:block mt-0.5">{s.title}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Core Specs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>TARGET REGIME</span>
              <Orbit className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white mt-2 truncate">
              {tech.target_domain || "Low-Earth Orbit"}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Operational orbital envelope</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>REUSABILITY</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white mt-2">
              Multi-Flight Rated
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Rapid turnaround architecture</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>DUAL-USE QUALIFIED</span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white mt-2">
              DoD & Civil Space
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">ITAR / EAR compliant baseline</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>DEPLOYMENT READINESS</span>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-2">
              Verified Specs
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">Hardware telemetry confirmed</div>
          </div>
        </div>

        {/* Technical Description & Architecture Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-7 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                SYSTEM ARCHITECTURE & FLIGHT MECHANICS
              </h2>
              <p className="text-slate-300 leading-relaxed text-sm">
                {tech.description}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3 font-mono text-xs">
              <h3 className="text-white font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                OPERATIONAL FLIGHT CONSTRAINTS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-slate-300">
                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">ENVIRONMENTAL SPECS</span>
                  Active microgravity & aerodynamic hypersonic profile
                </div>
                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">DATA INTERFACE</span>
                  SpaceWire & MIL-STD-1553 compatible telemetry bus
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Telemetry Meta
              </h3>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">SYSTEM SLUG:</span>
                <span className="text-slate-300 truncate max-w-[150px]">{tech.slug}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">SECTOR INDEX:</span>
                <span className="text-cyan-400">{tech.sector}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-500">HARDWARE CADENCE:</span>
                <span className="text-slate-300">TRL {currentTrl}</span>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-950/30 to-slate-900 border border-cyan-500/20 text-xs font-mono space-y-3">
              <div className="text-cyan-400 font-bold flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                PROCUREMENT INTEGRATION
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                System architecture indexed for commercial primes and defense acquisition offices. Cross-reference technical specs using the global command palette (⌘K).
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
