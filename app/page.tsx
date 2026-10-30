"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { 
  Rocket, 
  Shield, 
  Cpu, 
  Building2, 
  ArrowRight, 
  Radio, 
  Orbit,
  MapPin,
  Compass,
  Layers,
  Gauge
} from "lucide-react"

export default function HomePage() {
  const [stats, setStats] = useState({
    primeCount: 0,
    techCount: 0,
    grantCount: 0,
    launchCount: 0,
    totalFunding: 0,
    constellationCount: 0,
    totalSatellites: 0,
    spaceportCount: 0,
    activePads: 0,
  })
  const [nextLaunch, setNextLaunch] = useState<any>(null)
  const [recentGrants, setRecentGrants] = useState<any[]>([])
  const [topConstellations, setTopConstellations] = useState<any[]>([])
  const [topSpaceports, setTopSpaceports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTelemetry() {
      const [
        { data: companies },
        { data: tech },
        { data: grants },
        { data: launches },
        { data: constellations },
        { data: spaceports }
      ] = await Promise.all([
        supabase.from("companies").select("id, funding_total"),
        supabase.from("technologies").select("id"),
        supabase.from("grants").select("*").order("amount", { ascending: false }).limit(3),
        supabase.from("launches").select("*").order("scheduled_at", { ascending: true }).limit(1),
        supabase.from("constellations").select("*").order("deployed_count", { ascending: false }).limit(3),
        supabase.from("spaceports").select("*").order("active_pads", { ascending: false }).limit(3)
      ])

      const totalVal = (grants || []).reduce((acc, g) => acc + (Number(g.amount) || 0), 0)
      const totalSats = (constellations || []).reduce((acc, c) => acc + (c.deployed_count || 0), 0)
      const totalPads = (spaceports || []).reduce((acc, s) => acc + (s.active_pads || 0), 0)

      setStats({
        primeCount: companies?.length || 0,
        techCount: tech?.length || 0,
        grantCount: grants?.length || 0,
        launchCount: launches?.length || 0,
        totalFunding: totalVal,
        constellationCount: constellations?.length || 0,
        totalSatellites: totalSats,
        spaceportCount: spaceports?.length || 0,
        activePads: totalPads,
      })

      if (launches && launches.length > 0) setNextLaunch(launches[0])
      if (grants) setRecentGrants(grants)
      if (constellations) setTopConstellations(constellations)
      if (spaceports) setTopSpaceports(spaceports)

      setLoading(false)
    }

    loadTelemetry()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative pt-32 pb-24 px-6 sm:px-12 max-w-7xl mx-auto space-y-16">

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

          <div className="flex flex-wrap items-center gap-3 pt-4 font-mono text-xs">
            <Link
              href="/compare"
              className="px-6 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all"
            >
              COMPARATIVE MATRIX
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/launches"
              className="px-5 py-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 text-white font-bold tracking-wider transition-all"
            >
              ORBITAL RADAR
            </Link>

            <Link
              href="/constellations"
              className="px-5 py-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 text-cyan-300 font-bold tracking-wider transition-all"
            >
              CONSTELLATIONS
            </Link>

            <Link
              href="/trajectory"
              className="px-5 py-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 text-purple-300 font-bold tracking-wider transition-all"
            >
              TRAJECTORY SIMULATOR
            </Link>
          </div>
        </div>

        {/* COMPREHENSIVE MACRO KPI RIBBON */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Building2 className="w-3 h-3 text-cyan-400" /> Primes
            </div>
            <div className="text-2xl font-black text-white">{stats.primeCount}</div>
            <div className="text-[9px] text-slate-500">Tier-0 Integrators</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Cpu className="w-3 h-3 text-purple-400" /> Systems
            </div>
            <div className="text-2xl font-black text-purple-400">{stats.techCount}</div>
            <div className="text-[9px] text-slate-500">TRL 1-9 Hardware</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Shield className="w-3 h-3 text-emerald-400" /> Awards
            </div>
            <div className="text-2xl font-black text-emerald-400">${(stats.totalFunding / 1000000).toFixed(1)}M</div>
            <div className="text-[9px] text-slate-500">DoD / NASA Contracts</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Rocket className="w-3 h-3 text-blue-400" /> Flights
            </div>
            <div className="text-2xl font-black text-blue-400">{stats.launchCount}</div>
            <div className="text-[9px] text-slate-500">On Radar Manifest</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase">
              <Orbit className="w-3 h-3 text-cyan-400" /> In-Orbit Sats
            </div>
            <div className="text-2xl font-black text-cyan-400">{stats.totalSatellites.toLocaleString()}</div>
            <div className="text-[9px] text-slate-500">LEO/MEO Deployed</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase">
              <MapPin className="w-3 h-3 text-emerald-400" /> Active Pads
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats.activePads}</div>
            <div className="text-[9px] text-slate-500">Global Spaceports</div>
          </div>
        </div>

        {/* OPERATIONS DESK ROW 1: IMMINENT LAUNCH & DEFENSE CONTRACTS */}
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

                <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-2">
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

        {/* OPERATIONS DESK ROW 2: CONSTELLATIONS & SPACEPORT READINESS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Active Mega-Constellations Widget */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 sm:p-8 space-y-6 backdrop-blur-md font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Orbit className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  Active Constellation Deployments
                </span>
              </div>
              <Link href="/constellations" className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
                ALL SHELLS <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-4">
              {topConstellations.map((c) => {
                const pct = Math.min(100, Math.round(((c.deployed_count || 0) / (c.authorized_count || 1)) * 100))
                return (
                  <div key={c.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{c.name}</span>
                        <span className="text-[10px] text-cyan-400 ml-2">({c.operator})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{c.orbit_regime} • {c.altitude_km} KM</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>ORBITAL POPULATION</span>
                        <span className="text-white font-bold">{c.deployed_count.toLocaleString()} / {c.authorized_count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Global Spaceport Infrastructure Widget */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 sm:p-8 space-y-6 backdrop-blur-md font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  Sovereign Launch Complexes &amp; Readiness
                </span>
              </div>
              <Link href="/spaceports" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1">
                REGISTRY <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {topSpaceports.map((port) => (
                <div key={port.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">{port.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {port.state_or_region}, {port.country} • {port.operator}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-bold block">
                      {port.active_pads} ACTIVE {port.active_pads === 1 ? "PAD" : "PADS"}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1 block">{port.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* OPERATIONS DESK ROW 3: TRAJECTORY & DELTA-V SIMULATOR BANNER */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-purple-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-mono backdrop-blur-md">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4 animate-spin" />
              Orbital Mechanics Computer Active
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Launch Trajectory &amp; Earth Rotational Assist Engine
            </h3>
            <p className="text-xs text-slate-400 max-w-xl font-sans leading-relaxed">
              Model launch site latitude kinetic velocity boosts (up to +408 m/s), plane change delta-v penalties, and delivered payload mass directly before flight execution.
            </p>
          </div>

          <Link
            href="/trajectory"
            className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all shrink-0"
          >
            LAUNCH TRAJECTORY SIMULATOR <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}
