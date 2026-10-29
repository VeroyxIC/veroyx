"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import type { Company } from "@/types/database"

interface DirectoryProps {
  initialCompanies: Company[]
}

export function DirectoryView({ initialCompanies }: DirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStage, setSelectedStage] = useState<string>("ALL")

  const stages = useMemo(() => {
    const set = new Set<string>()
    initialCompanies.forEach((c) => {
      if (c.funding_stage) set.add(c.funding_stage)
    })
    return ["ALL", ...Array.from(set)]
  }, [initialCompanies])

  const filteredCompanies = useMemo(() => {
    return initialCompanies.filter((company) => {
      const matchesSearch =
        searchQuery === "" ||
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (company.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (company.headquarters?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      const matchesStage =
        selectedStage === "ALL" || company.funding_stage === selectedStage

      return matchesSearch && matchesStage
    })
  }, [initialCompanies, searchQuery, selectedStage])

  return (
    <div className="relative min-h-screen bg-[#05070a] text-neutral-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.15)_0%,rgba(5,7,10,0.95)_75%)]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        {/* Header Section */}
        <header className="mb-12 border-b border-neutral-800 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 font-mono text-[11px] text-cyan-400 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            GLOBAL SPACE REPOSITORY
          </div>
          <h1 className="text-4xl font-light tracking-tight text-white md:text-5xl">
            Space Infrastructure Directory
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-400 font-light">
            Verified database of prime contractors, launch providers, orbital platforms, and sub-tier hardware developers shaping the low-Earth orbit economy.
          </p>

          {/* Search Bar & Stage Filter */}
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by company, tech, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950/80 px-4 py-2.5 font-mono text-xs text-white placeholder-neutral-500 focus:border-cyan-500/80 focus:outline-none backdrop-blur-md"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {stages.map((stage) => (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`rounded border px-3 py-1 font-mono text-[10px] tracking-wider transition-all ${
                    selectedStage === stage
                      ? "border-cyan-500/80 bg-cyan-950/40 text-cyan-300"
                      : "border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Results Counter */}
        <div className="mb-6 flex items-center justify-between font-mono text-xs text-neutral-500">
          <span>ENTITIES INDEXED</span>
          <span>{filteredCompanies.length} RESULTS</span>
        </div>

        {/* Directory Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredCompanies.map((company) => (
              <motion.div
                key={company.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href={`/companies/${company.slug}`}
                  className="group block h-full rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-5 backdrop-blur-md transition-all hover:border-neutral-600 hover:bg-neutral-900/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-normal text-white group-hover:text-cyan-300 transition-colors">
                      {company.name}
                    </h2>
                    {company.funding_stage && (
                      <span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 font-mono text-[9px] text-cyan-400">
                        {company.funding_stage}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-3 text-xs font-light text-neutral-400 leading-relaxed">
                    {company.description ?? "Active operational entity registered in the space infrastructure economy."}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-neutral-800/60 pt-3 font-mono text-[11px] text-neutral-500">
                    <span>{company.headquarters ?? "Global"}</span>
                    <span>{company.founded_year ? `Est. ${company.founded_year}` : ""}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredCompanies.length === 0 && (
          <div className="py-20 text-center font-mono text-sm text-neutral-500">
            No matching entities found. Try adjusting your query or filter parameters.
          </div>
        )}
      </main>
    </div>
  )
}
