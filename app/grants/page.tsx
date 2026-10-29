import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import Link from "next/link"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const metadata: Metadata = {
  title: "Grants & Public Capital · Federal Space Allocations | Veroyx",
  description: "Tracked NASA, Space Force, and institutional capital allocations driving the low-Earth orbit economy.",
  alternates: { canonical: "https://veroyx.com/grants" },
}

export default async function GrantsPage() {
  const { data } = await supabase
    .from("grants")
    .select(`
      *,
      company_grants(
        role,
        company:companies(name, slug)
      )
    `)
    .order("amount", { ascending: false })

  const grants = data ?? []

  return (
    <div className="relative min-h-screen bg-[#05070a] text-neutral-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <header className="mb-12 border-b border-neutral-800 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 font-mono text-[11px] text-emerald-400 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            FEDERAL AWARDS & CONTRACTS
          </div>
          <h1 className="text-4xl font-light tracking-tight text-white md:text-5xl">
            Space Capital Tracker
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-400 font-light">
            Public capital awards, NASA Commercial LEO Destinations (CLD), and commercial resupply allocations fueling commercial primes.
          </p>
        </header>

        <div className="space-y-4">
          {grants.map((grant: any) => (
            <div
              key={grant.id}
              className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-6 backdrop-blur-md"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link href={`/grants/${grant.slug}`} className="text-lg font-medium text-white hover:text-cyan-400 transition-colors">{grant.name}</Link>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-neutral-400">
                    {grant.awarding_agency && <span className="text-neutral-300">AGENCY: {grant.awarding_agency}</span>}
                    {grant.status && <span>STATUS: {grant.status}</span>}
                    {grant.award_date && <span>DATE: {grant.award_date}</span>}
                  </div>
                </div>
                {grant.amount && (
                  <span className="font-mono text-lg font-medium text-emerald-400 sm:text-right">
                    {grant.currency ?? "USD"} {grant.amount.toLocaleString()}
                  </span>
                )}
              </div>

              {grant.company_grants?.[0]?.company && (
                <div className="mt-3 font-mono text-xs text-neutral-400">
                  RECIPIENT ({grant.company_grants[0].role ?? "Prime"}):{" "}
                  <Link
                    href={`/companies/${grant.company_grants[0].company.slug}`}
                    className="text-cyan-400 hover:underline"
                  >
                    {grant.company_grants[0].company.name}
                  </Link>
                </div>
              )}

              {grant.description && (
                <p className="mt-3.5 text-sm font-light leading-relaxed text-neutral-400">
                  {grant.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
