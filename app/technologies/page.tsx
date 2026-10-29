import { createClient } from "@supabase/supabase-js"
import type { Technology } from "@/types/database"
import type { Metadata } from "next"
import Link from "next/link"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const metadata: Metadata = {
  title: "Technologies · Active Hardware Architectures | Veroyx",
  description: "Verified orbital infrastructure, propulsion systems, and commercial habitation modules.",
  alternates: { canonical: "https://veroyx.com/technologies" },
}

export default async function TechnologiesPage() {
  const { data } = await supabase
    .from("technologies")
    .select(`
      *,
      company_technologies(
        company:companies(name, slug)
      )
    `)
    .order("trl", { ascending: false })

  const techs = data ?? []

  return (
    <div className="relative min-h-screen bg-[#05070a] text-neutral-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <header className="mb-12 border-b border-neutral-800 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 font-mono text-[11px] text-cyan-400 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            HARDWARE ARCHITECTURES
          </div>
          <h1 className="text-4xl font-light tracking-tight text-white md:text-5xl">
            Space Technology Index
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-400 font-light">
            Catalog of tracked commercial flight hardware, expandable habitats, spaceplanes, and orbital propulsion organized by Technology Readiness Level (TRL).
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {techs.map((tech: any) => (
            <div
              key={tech.id}
              className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-6 backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-4">
                <Link href={`/technologies/${tech.slug}`} className="text-lg font-medium text-white hover:text-cyan-400 transition-colors">{tech.name}</Link>
                <span className="shrink-0 rounded border border-neutral-800 bg-neutral-900/80 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                  {tech.sector}
                </span>
              </div>

              {tech.company_technologies?.[0]?.company && (
                <div className="mt-2 font-mono text-xs text-neutral-500">
                  DEVELOPER:{" "}
                  <Link
                    href={`/companies/${tech.company_technologies[0].company.slug}`}
                    className="text-cyan-400 hover:underline"
                  >
                    {tech.company_technologies[0].company.name}
                  </Link>
                </div>
              )}

              {tech.description && (
                <p className="mt-3.5 text-sm font-light leading-relaxed text-neutral-400">
                  {tech.description}
                </p>
              )}

              {tech.trl && (
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500"
                      style={{ width: `${(tech.trl / 9) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-medium text-cyan-400">TRL {tech.trl} / 9</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
