"use client"

import { motion, type Variants } from "framer-motion"
import type { CompanyWithRelations } from "@/types/database"
import Link from "next/link"

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
}

export function CompanyDetailView({ company }: { company: CompanyWithRelations }) {
  return (
    <div className="relative min-h-screen bg-[#05070a] text-neutral-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambient Video Layer */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-35">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover filter brightness-[0.4] contrast-125"
          src="/space-bg.mp4"
        />
        {/* Deep space radial glow + vignette overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,24,39,0.3)_0%,rgba(5,7,10,0.95)_75%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05070a]/60 to-[#05070a]" />
      </div>

      {/* Main Content Viewport */}
      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-5xl px-6 py-20"
      >
        {/* Navigation Breadcrumb & System Telemetry */}
        <motion.div variants={item} className="mb-8 flex items-center justify-between border-b border-neutral-800/80 pb-4">
          <Link
            href="/companies"
            className="group flex items-center gap-2 font-mono text-xs tracking-wider text-neutral-400 transition-colors hover:text-white"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span> DIRECTORY INDEX
          </Link>
          <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-400/80">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            VEROYX TELEMETRY LIVE
          </div>
        </motion.div>

        {/* Hero Header */}
        <motion.header variants={item} className="mb-14">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 backdrop-blur-md">
            <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">AEROSPACE PRIME</span>
            <span className="h-1 w-1 rounded-full bg-neutral-600" />
            <span className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase">{company.funding_stage ?? "VENTURE"}</span>
          </div>

          <h1 className="text-5xl font-light tracking-tight text-white md:text-6xl">
            {company.name}
          </h1>

          {company.description && (
            <p className="mt-5 max-w-3xl text-lg font-light leading-relaxed text-neutral-300">
              {company.description}
            </p>
          )}

          {/* Quick Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3.5 backdrop-blur-md">
              <span className="block font-mono text-[11px] text-neutral-500">HEADQUARTERS</span>
              <span className="mt-1 block font-mono text-sm text-neutral-200">{company.headquarters ?? "—"}</span>
            </div>
            <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3.5 backdrop-blur-md">
              <span className="block font-mono text-[11px] text-neutral-500">FOUNDED</span>
              <span className="mt-1 block font-mono text-sm text-neutral-200">{company.founded_year ?? "—"}</span>
            </div>
            <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3.5 backdrop-blur-md">
              <span className="block font-mono text-[11px] text-neutral-500">CREW SIZE</span>
              <span className="mt-1 block font-mono text-sm text-neutral-200">{company.employee_count ? company.employee_count.toLocaleString() : "—"}</span>
            </div>
            <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3.5 backdrop-blur-md">
              <span className="block font-mono text-[11px] text-neutral-500">EXTERNAL LINK</span>
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate font-mono text-sm text-cyan-400 hover:underline"
                >
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className="mt-1 block font-mono text-sm text-neutral-500">—</span>
              )}
            </div>
          </div>
        </motion.header>

        {/* Technologies Grid */}
        {company.technologies.length > 0 && (
          <motion.section variants={item} className="mb-14">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-2">
              <h2 className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
                Active Architecture & Hardware
              </h2>
              <span className="font-mono text-xs text-neutral-600">{company.technologies.length} REGISTERED</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {company.technologies.map(({ technology, relationship_type }) => (
                <motion.div
                  key={technology.id}
                  variants={item}
                  className="group relative rounded-xl border border-neutral-800/90 bg-neutral-950/60 p-6 backdrop-blur-md transition-all hover:border-neutral-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-medium text-white">{technology.name}</h3>
                    <span className="rounded border border-neutral-800 bg-neutral-900/80 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                      {technology.sector}
                    </span>
                  </div>
                  {relationship_type && (
                    <p className="mt-1.5 font-mono text-xs text-neutral-500">{relationship_type}</p>
                  )}
                  {technology.description && (
                    <p className="mt-3.5 text-sm font-light leading-relaxed text-neutral-400">
                      {technology.description}
                    </p>
                  )}
                  {technology.trl && (
                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${(technology.trl / 9) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-medium text-cyan-400">TRL {technology.trl} / 9</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Federal Grants & Capital */}
        {company.grants.length > 0 && (
          <motion.section variants={item}>
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-2">
              <h2 className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
                Awards & Public Capital Allocations
              </h2>
              <span className="font-mono text-xs text-neutral-600">{company.grants.length} AWARDS</span>
            </div>
            <div className="space-y-3">
              {company.grants.map(({ grant, role }) => (
                <motion.div
                  key={grant.id}
                  variants={item}
                  className="rounded-xl border border-neutral-800/90 bg-neutral-950/60 p-6 backdrop-blur-md transition-all hover:border-neutral-700"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">{grant.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-neutral-400">
                        {grant.awarding_agency && <span className="text-neutral-300">{grant.awarding_agency}</span>}
                        {grant.status && <span>STATUS: {grant.status}</span>}
                        {role && <span>ROLE: {role}</span>}
                        {grant.award_date && <span>DATE: {grant.award_date}</span>}
                      </div>
                    </div>
                    {grant.amount && (
                      <span className="font-mono text-base font-medium text-emerald-400 sm:text-right">
                        {grant.currency ?? "USD"} {grant.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {grant.description && (
                    <p className="mt-3.5 text-sm font-light leading-relaxed text-neutral-400">
                      {grant.description}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </motion.main>
    </div>
  )
}
