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
  const { data } = await supabase.from("technologies").select("slug")
  return (data ?? []).map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data: tech } = await supabase.from("technologies").select("name, description").eq("slug", slug).single()
  if (!tech) return { title: "Technology Not Found | Veroyx" }

  return {
    title: `${tech.name} · Space Hardware Architecture | Veroyx`,
    description: tech.description ?? "Technical architecture and TRL rating tracked on Veroyx.",
    alternates: { canonical: `https://veroyx.com/technologies/${slug}` },
  }
}

export default async function TechnologyDetailPage({ params }: PageProps) {
  const { slug } = await params
  const { data: tech } = await supabase
    .from("technologies")
    .select(`
      *,
      company_technologies(
        relationship_type,
        company:companies(name, slug, headquarters, funding_stage)
      )
    `)
    .eq("slug", slug)
    .single()

  if (!tech) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tech.name,
    category: tech.sector,
    description: tech.description,
    url: `https://veroyx.com/technologies/${tech.slug}`,
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#05070a] text-neutral-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-6">
          <Link
            href="/technologies"
            className="font-mono text-xs text-neutral-400 transition-colors hover:text-cyan-400"
          >
            ← BACK TO TECHNOLOGIES
          </Link>
        </div>

        <header className="border-b border-neutral-800 pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 font-mono text-xs text-cyan-300">
              {tech.sector}
            </span>
            {tech.trl && (
              <span className="rounded border border-cyan-800/60 bg-cyan-950/40 px-2.5 py-1 font-mono text-xs text-cyan-400">
                TRL {tech.trl} / 9
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-light tracking-tight text-white sm:text-4xl">
            {tech.name}
          </h1>
          {tech.description && (
            <p className="mt-4 text-base font-light leading-relaxed text-neutral-300">
              {tech.description}
            </p>
          )}
        </header>

        {tech.trl && (
          <section className="mt-10 rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-6">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>TRL READINESS SCALE</span>
              <span className="text-cyan-400">{Math.round((tech.trl / 9) * 100)}% MATURITY</span>
            </div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500"
                style={{ width: `${(tech.trl / 9) * 100}%` }}
              />
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            Associated Commercial Primes
          </h2>
          <div className="mt-4 grid gap-4">
            {tech.company_technologies?.map((ct: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-5"
              >
                <div>
                  <Link
                    href={`/companies/${ct.company.slug}`}
                    className="text-lg font-medium text-white hover:text-cyan-400 transition-colors"
                  >
                    {ct.company.name}
                  </Link>
                  <div className="mt-1 font-mono text-xs text-neutral-500">
                    RELATIONSHIP: <span className="text-neutral-300">{ct.relationship_type ?? "Prime"}</span>
                    {ct.company.headquarters && ` · ${ct.company.headquarters}`}
                  </div>
                </div>
                <Link
                  href={`/companies/${ct.company.slug}`}
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
