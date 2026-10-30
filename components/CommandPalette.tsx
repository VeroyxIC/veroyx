"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Building2, 
  Cpu, 
  Rocket, 
  Radio, 
  FileText, 
  ShieldCheck, 
  Orbit, 
  ArrowRight,
  Compass,
  X
} from "lucide-react"

interface SearchItem {
  id: string
  category: "TOOL" | "COMPANY" | "CONTRACT" | "TECH" | "STATION" | "LAUNCH"
  title: string
  subtitle: string
  badge?: string
  href: string
}

const STATIC_PLATFORM_TOOLS: SearchItem[] = [
  { id: "tool-scenarios", category: "TOOL", title: "Mission Architecture Scenario Builder", subtitle: "Unified Launch, Power, RF & Thermal Synthesizer", href: "/scenarios", badge: "ENGINE" },
  { id: "tool-contracts", category: "TOOL", title: "Defense Contracts & Flow-Down Radar", subtitle: "DoD Prime Awards & Subcontractor Distributions", href: "/contracts", badge: "DEFENSE" },
  { id: "tool-ground", category: "TOOL", title: "Ground Station Topology & Contact Scheduler", subtitle: "Global Earth Stations, Bands & Contact Passes", href: "/ground-stations", badge: "NETWORK" },
  { id: "tool-thermal", category: "TOOL", title: "Thermal Management & Cryo Boil-Off", subtitle: "Stefan-Boltzmann Radiation & MLI Insulation", href: "/thermal", badge: "PHYSICS" },
  { id: "tool-isam", category: "TOOL", title: "ISAM & Rendezvous (RPO) Simulator", subtitle: "Clohessy-Wiltshire Dynamics & V-bar/R-bar Gates", href: "/isam", badge: "PHYSICS" },
  { id: "tool-payload", category: "TOOL", title: "Fairing & Payload Trade Engine", subtitle: "Usable Envelope Clearance & Mass-to-Orbit Margins", href: "/payload", badge: "ENGINE" },
  { id: "tool-sar", category: "TOOL", title: "Synthetic Aperture Radar (SAR) Simulator", subtitle: "All-Weather Ground Resolution & Chirp Bandwidth", href: "/sar", badge: "SENSOR" },
  { id: "tool-optical", category: "TOOL", title: "Optical Sensor & GSD Simulator", subtitle: "Ground Sample Distance, Diffraction Limit & NIIRS", href: "/optical", badge: "SENSOR" },
  { id: "tool-rf", category: "TOOL", title: "RF Downlink Budget Calculator", subtitle: "Friis Path Loss, Dish Gain & Eb/N0 Margin", href: "/rf", badge: "TELEMETRY" },
  { id: "tool-power", category: "TOOL", title: "Spacecraft Power & Radiation Simulator", subtitle: "Solar Cell Degradation & Battery Sizing", href: "/power", badge: "PHYSICS" },
  { id: "tool-propulsion", category: "TOOL", title: "Propulsion Specific Impulse Matrix", subtitle: "Chamber Pressure, Isp & Thermodynamics", href: "/propulsion", badge: "PROPULSION" },
  { id: "tool-ssa", category: "TOOL", title: "Space Situational Awareness (3D Radar)", subtitle: "Orbital Debris Shells & Close Conjunctions", href: "/ssa", badge: "RADAR" },
  { id: "tool-passes", category: "TOOL", title: "Satellite Pass Predictor", subtitle: "Keplerian Ground-Track & Overflight Windows", href: "/passes", badge: "FLIGHT" },
  { id: "tool-trajectory", category: "TOOL", title: "Orbital Trajectory & Delta-V Simulator", subtitle: "Hohmann Transfers & Orbital Mechanics", href: "/trajectory", badge: "PHYSICS" },
  { id: "tool-launches", category: "TOOL", title: "Live Launch Manifest Radar", subtitle: "Real-Time Manifests & Countdown Tracking", href: "/launches", badge: "OPERATIONS" },
  { id: "tool-analytics", category: "TOOL", title: "Macro Spending & Capital Trends", subtitle: "Global Aerospace Procurement Insights", href: "/analytics", badge: "MACRO" },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Live Multi-Domain Search Query
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    const trimmed = query.trim().toLowerCase()

    if (!trimmed) {
      setResults(STATIC_PLATFORM_TOOLS.slice(0, 8))
      setSelectedIndex(0)
      return
    }

    // First match static platform tools
    const matchedTools = STATIC_PLATFORM_TOOLS.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmed) ||
        t.subtitle.toLowerCase().includes(trimmed) ||
        t.badge?.toLowerCase().includes(trimmed)
    )

    if (trimmed.length < 2) {
      setResults(matchedTools)
      setSelectedIndex(0)
      return
    }

    setLoading(true)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        const data = await res.json()

        const dynamicItems: SearchItem[] = []

        // Companies
        data.companies?.forEach((c: any) => {
          dynamicItems.push({
            id: `comp-${c.id}`,
            category: "COMPANY",
            title: c.name,
            subtitle: `${c.sector || "Aerospace"} • ${c.country || "Global"}`,
            badge: c.tier || "ENTERPRISE",
            href: `/companies/${c.slug}`,
          })
        })

        // Defense Contracts
        data.contracts?.forEach((ct: any) => {
          dynamicItems.push({
            id: `contract-${ct.id}`,
            category: "CONTRACT",
            title: ct.program_name,
            subtitle: `Prime: ${ct.prime_contractor} • ${ct.command_agency}`,
            badge: `$${Number(ct.obligation_value_m).toLocaleString()}M`,
            href: "/contracts",
          })
        })

        // Ground Stations
        data.groundStations?.forEach((gs: any) => {
          dynamicItems.push({
            id: `gs-${gs.id}`,
            category: "STATION",
            title: `${gs.name} (${gs.code})`,
            subtitle: `Operator: ${gs.operator} • ${gs.country}`,
            badge: gs.supported_bands?.[0] || "GATEWAY",
            href: "/ground-stations",
          })
        })

        // Technologies
        data.technologies?.forEach((t: any) => {
          dynamicItems.push({
            id: `tech-${t.id}`,
            category: "TECH",
            title: t.name,
            subtitle: t.category,
            badge: `TRL ${t.trl || "9"}`,
            href: `/technologies/${t.slug}`,
          })
        })

        // Launches
        data.launches?.forEach((l: any) => {
          dynamicItems.push({
            id: `launch-${l.id}`,
            category: "LAUNCH",
            title: l.mission_name,
            subtitle: `${l.vehicle} • ${l.operator} (${l.orbit})`,
            badge: l.status,
            href: "/launches",
          })
        })

        setResults([...matchedTools, ...dynamicItems])
        setSelectedIndex(0)
      } catch (err) {
        setResults(matchedTools)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [query])

  const navigateTo = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  // Keyboard navigation inside modal
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      navigateTo(results[selectedIndex].href)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 sm:px-6">
      <div 
        className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[75vh]"
        onKeyDown={handleKeyNavigation}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/40">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search programs, contracts, ground stations, companies, or physics engines..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-slate-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {loading && (
            <div className="py-2 px-4 text-slate-500 text-[11px] animate-pulse">
              QUERYING SUPABASE RELATIONAL CORES...
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-500 text-xs">
              NO AEROSPACE RECORDS IDENTIFIED FOR &quot;{query}&quot;
            </div>
          )}

          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex

            return (
              <div
                key={item.id}
                onClick={() => navigateTo(item.href)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-cyan-950/40 border border-cyan-500/30 text-white"
                    : "hover:bg-slate-900/60 text-slate-300 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                    {item.category === "TOOL" && <Compass className="w-3.5 h-3.5 text-cyan-400" />}
                    {item.category === "COMPANY" && <Building2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {item.category === "CONTRACT" && <FileText className="w-3.5 h-3.5 text-purple-400" />}
                    {item.category === "STATION" && <Radio className="w-3.5 h-3.5 text-amber-400" />}
                    {item.category === "TECH" && <Cpu className="w-3.5 h-3.5 text-cyan-400" />}
                    {item.category === "LAUNCH" && <Rocket className="w-3.5 h-3.5 text-rose-400" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs truncate font-sans">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-sans">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 text-slate-500">
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {item.category}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-transparent"}`} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>CROSS-DOMAIN INTELLIGENCE HUD</span>
        </div>
      </div>
    </div>
  )
}
