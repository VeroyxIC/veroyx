import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { data } = await supabase.from("grants").select("slug")
  return (data ?? []).map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data: grant } = await supabase.from("grants").select("name, awarding_agency, amount, currency").eq("slug", slug).single()
  if (!grant) return { title: "Grant Not Found | Veroyx" }

  return {
    title: `${grant.name} · Space Capital Allocation | Veroyx`,
    description: `Public capital award tracked by Veroyx: ${grant.awarding_agency} contract valued at ${grant.currency ?? "USD"} ${grant.amount?.toLocaleString() ?? "N/A"}.`,
    alternates: { canonical: `https://veroyx.com/grants/${slug}` },
  }
}

export default async function GrantDetailPage({ params }: PageProps) {
  const { slug } = await params
  const { data: grant } = await supabase
    .from("grants")
    .select(`
      *,
      company_grants(
        role,
        company:companies(name, slug, headquarters, funding_stage)
      )
    `)
    .eq("slug", slug)
    .single()

  if (!grant) notFound()

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#05070a] text-neutral-100">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-6">
          <Link
            href="/grants"
            className="font-mono text-xs text-neutral-400 transition-colors hover:text-cyan-400"
          >
            ← BACK TO GRANTS
          </Link>
        </div>

        <header className="border-b border-neutral-800 pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 font-mono text-xs text-emerald-400">
              {grant.awarding_agency ?? "FEDERAL"}
            </span>
            {grant.status && (
              <span className="rounded border border-neutral-800 bg-neutral-900/60 px-2.5 py-1 font-mono text-xs text-neutral-300">
                STATUS: {grant.status.toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-light tracking-tight text-white sm:text-4xl">
            {grant.name}
          </h1>

          <div className="mt-6 flex flex-wrap items-baseline gap-4 font-mono">
            {grant.amount && (
              <span className="text-3xl font-light text-emerald-400">
                {grant.currency ?? "USD"} {grant.amount.toLocaleString()}
              </span>
            )}
            {grant.award_date && (
              <span className="text-xs text-neutral-400">
                AWARD DATE: {grant.award_date}
              </span>
            )}
          </div>

          {grant.description && (
            <p className="mt-6 text-base font-light leading-relaxed text-neutral-300">
              {grant.description}
            </p>
          )}
        </header>

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            Award Recipients & Partners
          </h2>
          <div className="mt-4 grid gap-4">
            {grant.company_grants?.map((cg: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-5"
              >
                <div>
                  <Link
                    href={`/companies/${cg.company.slug}`}
                    className="text-lg font-medium text-white hover:text-cyan-400 transition-colors"
                  >
                    {cg.company.name}
                  </Link>
                  <div className="mt-1 font-mono text-xs text-neutral-500">
                    ROLE: <span className="text-neutral-300">{cg.role ?? "Prime Contractor"}</span>
                    {cg.company.headquarters && ` · ${cg.company.headquarters}`}
                  </div>
                </div>
                <Link
                  href={`/companies/${cg.company.slug}`}
                  className="rounded border border-neutral-700 bg-neutral-900/60 px-3 py-1 font-mono text-xs text-cyan-300 transition-all hover:border-cyan-500"
                >
                  View Profile →
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
