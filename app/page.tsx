import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


export default async function HomePage() {
  const [
    { count: companyCount },
    { count: techCount },
    { count: grantCount },
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("technologies").select("*", { count: "exact", head: true }),
    supabase.from("grants").select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#05070a] text-white">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,165,233,0.18)_0%,rgba(5,7,10,0.95)_70%)]" />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 font-mono text-[11px] text-cyan-400 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          COMMERCIAL SPACE PLATFORM
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-light tracking-tight sm:text-6xl md:text-7xl">
          The intelligence layer for the <span className="text-cyan-400">space economy</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl font-light text-neutral-400 leading-relaxed text-base sm:text-lg">
          Veroyx indexes commercial space primes, orbital infrastructure, verified hardware architectures, and public capital allocations shaping LEO industrialization.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/companies"
            className="rounded-lg border border-cyan-500/80 bg-cyan-950/40 px-6 py-3 font-mono text-xs tracking-wider text-cyan-300 transition-all hover:bg-cyan-900/50"
          >
            EXPLORE DIRECTORY →
          </Link>
          <Link
            href="/companies/axiom-space"
            className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-6 py-3 font-mono text-xs tracking-wider text-neutral-300 transition-all hover:border-neutral-700 hover:text-white"
          >
            VIEW PRIME TELEMETRY
          </Link>
        </div>

        {/* Live Counters */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-4 border-t border-neutral-800/80 pt-10 text-left">
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-5 backdrop-blur-md">
            <span className="block font-mono text-[11px] text-neutral-500 uppercase">Registered Primes</span>
            <span className="mt-2 block font-mono text-3xl font-light text-white">{companyCount ?? 0}</span>
          </div>
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-5 backdrop-blur-md">
            <span className="block font-mono text-[11px] text-neutral-500 uppercase">Hardware Tech</span>
            <span className="mt-2 block font-mono text-3xl font-light text-cyan-400">{techCount ?? 0}</span>
          </div>
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-5 backdrop-blur-md">
            <span className="block font-mono text-[11px] text-neutral-500 uppercase">Tracked Awards</span>
            <span className="mt-2 block font-mono text-3xl font-light text-emerald-400">{grantCount ?? 0}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
