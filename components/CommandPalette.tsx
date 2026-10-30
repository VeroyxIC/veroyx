"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Search, Building, Cpu, Shield, Rocket, ArrowRight, X } from "lucide-react"

interface SearchResult {
  type: "company" | "technology" | "grant" | "launch"
  title: string
  subtitle: string
  href: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setResults([])
    }
  }, [open])

  // Search execution
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const q = query.toLowerCase()

      const [
        { data: constellations },
        { data: companies },
        { data: technologies },
        { data: grants },
        { data: launches }
      ] = await Promise.all([
        supabase.from("constellations").select("name, slug, operator, orbit_regime").ilike("name", `%${q}%`).limit(3),
        supabase.from("companies").select("name, slug, sector").ilike("name", `%${q}%`).limit(3),
        supabase.from("technologies").select("name, slug, sector, trl").ilike("name", `%${q}%`).limit(3),
        supabase.from("grants").select("name, slug, awarding_agency, amount").ilike("name", `%${q}%`).limit(3),
        supabase.from("launches").select("mission_name, slug, vehicle, target_orbit").ilike("mission_name", `%${q}%`).limit(3)
      ])

      const list: SearchResult[] = []
      ;(constellations || []).forEach((c) => {
        list.push({
          type: "technology",
          title: c.name,
          subtitle: `${c.operator} • ${c.orbit_regime} Shell`,
          href: `/constellations`
        })
      })


      ;(companies || []).forEach((c) => {
        list.push({
          type: "company",
          title: c.name,
          subtitle: c.sector || "Commercial Prime",
          href: `/companies/${c.slug}`
        })
      })

      ;(technologies || []).forEach((t) => {
        list.push({
          type: "technology",
          title: t.name,
          subtitle: `TRL ${t.trl || 7} • ${t.sector || "Orbital System"}`,
          href: `/technologies/${t.slug}`
        })
      })

      ;(grants || []).forEach((g) => {
        list.push({
          type: "grant",
          title: g.name,
          subtitle: `${g.awarding_agency || "NASA"} • $${g.amount ? (Number(g.amount) / 1000000).toFixed(1) + "M" : "Confidential"}`,
          href: `/grants/${g.slug}`
        })
      })

      ;(launches || []).forEach((l) => {
        list.push({
          type: "launch",
          title: l.mission_name,
          subtitle: `${l.vehicle} • ${l.target_orbit}`,
          href: `/launches`
        })
      })

      setResults(list)
      setSelectedIndex(0)
      setLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  // Keyboard navigation inside list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      router.push(results[selectedIndex].href)
      setOpen(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center pt-24 px-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden font-mono">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search primes, systems, awards, manifests... (ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] text-slate-500 border border-slate-800 rounded px-1.5 py-0.5 shrink-0">
            ESC
          </span>
        </div>

        {/* Results Stream */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">
              SCANNING AEROSPACE TELEMETRY ARRAYS...
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const active = idx === selectedIndex
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      router.push(item.href)
                      setOpen(false)
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${
                      active ? "bg-cyan-950/80 border border-cyan-500/30 text-white" : "text-slate-400 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.type === "company" && <Building className="w-4 h-4 text-cyan-400 shrink-0" />}
                      {item.type === "technology" && <Cpu className="w-4 h-4 text-purple-400 shrink-0" />}
                      {item.type === "grant" && <Shield className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {item.type === "launch" && <Rocket className="w-4 h-4 text-blue-400 shrink-0" />}
                      <div>
                        <div className="text-xs font-bold text-white tracking-wide truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-400">{item.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${active ? "text-cyan-400 translate-x-0.5" : "text-slate-600"}`} />
                  </button>
                )
              })}
            </div>
          ) : query.trim() ? (
            <div className="p-6 text-center text-xs text-slate-500">
              NO TELEMETRY MATCHES FOUND FOR &quot;{query}&quot;
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              TYPE TO SEARCH ENTITIES, HARDWARE PLATFORMS, OR MISSION FLIGHTS
            </div>
          )}
        </div>

        {/* HUD Footer */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span><kbd className="text-slate-400">↑↓</kbd> to navigate</span>
            <span><kbd className="text-slate-400">ENTER</kbd> to select</span>
          </div>
          <span className="text-cyan-500 font-bold">VEROYX HUD v1.0</span>
        </div>

      </div>
    </div>
  )
}
