import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { 
  Rocket, Cpu, ShieldCheck, Activity, Scale, 
  ArrowRight, DollarSign, Database, CheckCircle2 
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let companyCount = 12
  let techCount = 8
  let contractCount = 9
  let highTrlTech: any[] = []

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const [cRes, tRes, gRes, trlRes] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('technologies').select('id', { count: 'exact', head: true }),
      supabase.from('grants').select('id', { count: 'exact', head: true }),
      supabase.from('technologies').select('name, slug, sector, trl, target_domain').gte('trl', 7).limit(3)
    ])

    if (cRes.count) companyCount = cRes.count
    if (tRes.count) techCount = tRes.count
    if (gRes.count) contractCount = gRes.count
    if (trlRes.data) highTrlTech = trlRes.data
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* Real-Time Telemetry Ticker Bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 px-6 py-2.5 font-mono text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              ORBITAL INDEX ACTIVE
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">
              INDEXED PRIMES: <strong className="text-white">{companyCount}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">
              HARDWARE SPECS: <strong className="text-white">{techCount}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">
              FEDERAL CONTRACTS: <strong className="text-white">{contractCount}</strong>
            </span>
          </div>
          <div className="text-slate-500">
            SYSTEM CADENCE: <span className="text-emerald-400 font-semibold">T-0 NOMINAL</span>
          </div>
        </div>
      </div>

      {/* Hero Terminal View */}
      <section className="relative py-20 px-6 sm:px-12 border-b border-slate-800/80 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Commercial Space Intelligence & Trade Studies</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white leading-tight">
            INSTITUTIONAL DATA ON THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
              ORBITAL ECONOMY
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Programmatic intelligence platform tracking venture-backed aerospace primes, propulsion testbenches, non-dilutive defense awards, and live flight countdowns.
          </p>

          {/* Core Action Navigation */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/launches"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Rocket className="w-4 h-4" />
              LAUNCH MANIFEST (T-MINUS)
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-white font-mono text-xs transition-all"
            >
              <Scale className="w-4 h-4 text-cyan-400" />
              RUN TRADE STUDY MATRIX
            </Link>
          </div>
        </div>
      </section>

      {/* Grid of Dedicated Intelligence Modules */}
      <section className="py-16 px-6 sm:px-12 max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Link
            href="/companies"
            className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition-all group flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                COMMERCIAL PRIMES
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Headcounts, venture capital capitalization, verified primary headquarters, and operational classifications.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-cyan-400">
              <span>EXPLORE DIRECTORY</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/technologies"
            className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition-all group flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                PROPULSION & HARDWARE
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                NASA/DoD TRL maturity stages (1–9), target operational orbital domains, and propellant chemistry profiles.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-cyan-400">
              <span>VIEW SPECIFICATIONS</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/grants"
            className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition-all group flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white group-hover:text-emerald-300 transition-colors">
                FEDERAL PRIME AWARDS
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Space Force TacRS orders, NASA CLPS task directives, and defense SBIR non-dilutive funding pipelines.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-emerald-400">
              <span>SEARCH CONTRACTS</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>

        {/* High-TRL Space Flight Hardware Spotlight */}
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5" />
                FLIGHT DEMONSTRATED BENCH
              </div>
              <h2 className="text-xl font-bold font-mono text-white mt-1">
                HIGH READINESS HARDWARE (TRL 7–9)
              </h2>
            </div>
            <Link
              href="/technologies"
              className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              VIEW ALL HARDWARE <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {highTrlTech.map((tech) => (
              <Link
                key={tech.slug}
                href={`/technologies/${tech.slug}`}
                className="p-5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all group space-y-3"
              >
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-cyan-400 font-bold">TRL {tech.trl}</span>
                  <span className="text-slate-500 truncate max-w-[120px]">{tech.sector}</span>
                </div>
                <div className="text-sm font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                  {tech.name}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Target: {tech.target_domain || 'Low-Earth Orbit'}
                </div>
              </Link>
            ))}
          </div>
        </div>

      </section>

    </div>
  )
}
