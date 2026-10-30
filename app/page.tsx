"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { 
  Rocket, 
  Shield, 
  Cpu, 
  Building2, 
  TrendingUp, 
  ArrowRight, 
  Terminal, 
  Radio, 
  Database, 
  Clock,
  Layers,
  Sparkles
} from "lucide-react"

export default function HomePage() {
  const [stats, setStats] = useState({
    primeCount: 0,
    techCount: 0,
    grantCount: 0,
    launchCount: 0,
    totalFunding: 0,
  })
  const [nextLaunch, setNextLaunch] = useState<any>(null)
  const [recentGrants, setRecentGrants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTelemetry() {
      const [
        { data: companies },
        { data: tech },
        { data: grants },
        { data: launches }
      ] = await Promise.all([
        supabase.from("companies").select("id, funding_total"),
        supabase.from("technologies").select("id"),
        supabase.from("grants").select("*").order("amount", { ascending: false }).limit(4),
        supabase.from("launches").select("*").order("scheduled_at", { ascending: true }).limit(1)
      ])

      const totalVal = (grants || []).reduce((acc, g) => acc + (Number(g.amount) || 0), 0)

      setStats({
        primeCount: companies?.length || 0,
        techCount: tech?.length || 0,
        grantCount: grants?.length || 0,
        launchCount: launches?.length || 0,
        totalFunding: totalVal,
      })

      if (launches && launches.length > 0) {
        setNextLaunch(launches[0])
      }
      if (grants) {
        setRecentGrants(grants)
      }
      setLoading(false)
    }

    loadTelemetry()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative pt-32 pb-24 px-6 sm:px-12 max-w-7xl mx-auto space-y-20">

        {/* HERO HEADER */}
        <div className="space-y-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            Institutional Aerospace & Defense Telemetry Hub
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black font-mono tracking-tight text-white leading-tight">
            COMMERCIAL SPACE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
              INTELLIGENCE TERMINAL
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl font-sans leading-relaxed">
            Programmatic directory, hardware readiness verification, and procurement analytics indexing sovereign launch systems, defense contractors, and orbital payloads.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4 font-mono text-xs">
            <Link
              href="/compare"
              className="px-6 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all"
            >
              LAUNCH COMPARATIVE MATRIX
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/launches"
              className="px-6 py-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 text-white font-bold tracking-wider transition-all"
            >
              ORBITAL RADAR
            </Link>

            <Link
              href="/developers"
              className="px-6 py-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 text-purple-300 font-bold tracking-wider transition-all"
            >
              API DEVELOPER SUITE
            </Link>
          </div>
        </div>

        {/* MACRO TELEMETRY STATS RIBBON */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Tracked Primes
            </div>
            <div className="text-3xl font-black text-white">{stats.primeCount}</div>
            <div className="text-[10px] text-slate-500">Commercial & Defense</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Flight Systems
            </div>
            <div className="text-3xl font-black text-purple-400">{stats.techCount}</div>
            <div className="text-[10px] text-slate-500">Active TRL Pipeline</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> Defense Awards
            </div>
            <div className="text-3xl font-black text-emerald-400">${(stats.totalFunding / 1000000).toFixed(1)}M</div>
            <div className="text-[10px] text-slate-500">NASA & USSF Obligations</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Rocket className="w-3.5 h-3.5 text-blue-400" /> Active Flights
            </div>
            <div className="text-3xl font-black text-blue-400">{stats.launchCount}</div>
            <div className="text-[10px] text-slate-500">On Orbital Radar</div>
          </div>
        </div>

        {/* OPERATIONS DESK SPLIT: IMMINENT LAUNCH & RECENT CONTRACTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Next Imminent Orbital Launch Card */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 sm:p-8 space-y-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 font-mono">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Next Imminent Orbital Window
                </span>
              </div>
              <Link href="/launches" className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
                RADAR <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {nextLaunch ? (
              <div className="space-y-4 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-bold">
                    {nextLaunch.status}
                  </span>
                  <span className="text-xs text-slate-400">{nextLaunch.vehicle}</span>
                </div>

                <div className="text-2xl font-bold text-white tracking-tight">
                  {nextLaunch.mission_name}
                </div>

                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {nextLaunch.details}
                </p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase text-slate-500">Target Trajectory</div>
                    <div className="text-xs font-bold text-slate-200">{nextLaunch.target_orbit}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-500">T-Minus Target</div>
                    <div className="text-xs font-bold text-cyan-400">
                      {new Date(nextLaunch.scheduled_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-slate-500">
                AWAITING NEXT SCHEDULED FLIGHT MANIFEST...
              </div>
            )}
          </div>

          {/* Defense Procurement Feed Card */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 sm:p-8 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Top Tracked Defense Awards
                </span>
              </div>
              <Link href="/grants" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1">
                CONTRACTS <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {recentGrants.map((grant) => (
                <Link
                  key={grant.id}
                  href={`/grants/${grant.slug}`}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 flex items-center justify-between transition-all group"
                >
                  <div className="space-y-0.5 max-w-[70%]">
                    <div className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {grant.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {grant.awarding_agency || "Defense Dept"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-emerald-400">
                      ${grant.amount ? (Number(grant.amount) / 1000000).toFixed(1) + "M" : "Classified"}
                    </div>
                    <div className="text-[9px] uppercase text-slate-500">{grant.status || "Awarded"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
