"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Award, 
  Search, 
  ShieldCheck, 
  ExternalLink, 
  DollarSign, 
  Calendar, 
  Building2, 
  Rocket, 
  Orbit, 
  Layers,
  ArrowRight
} from "lucide-react"

interface DefenseContract {
  id: string
  title: string
  agency: "USSF / SSC" | "SDA" | "NASA" | "NRO" | "DARPA"
  primeVendor: string
  vehicle: string
  awardValue: string
  fiscalYear: string
  targetOrbit: string
  description: string
  veroyxEngineLink: {
    title: string
    href: string
  }
}

const CONTRACTS: DefenseContract[] = [
  {
    id: "NSSL-PHASE-3-LANE-1",
    title: "National Security Space Launch (NSSL) Phase 3 Lane 1",
    agency: "USSF / SSC",
    primeVendor: "SpaceX / Rocket Lab / Blue Origin",
    vehicle: "IDIQ Multi-Award ($5.6B Ceiling)",
    awardValue: "$5.6 Billion",
    fiscalYear: "FY2025 - FY2029",
    targetOrbit: "LEO, Polar & Responsive Tactical Injections",
    description: "Multi-vendor commercial launch service framework designed for risk-tolerant national security payloads, tactically responsive space, and proliferated LEO constellations.",
    veroyxEngineLink: {
      title: "Launch Ascent Staging",
      href: "/launch-vehicle"
    }
  },
  {
    id: "SDA-TRANCHE-2-TRACKING",
    title: "SDA Proliferated Warfighter Space Architecture: T2 Tracking Layer",
    agency: "SDA",
    primeVendor: "L3Harris / Lockheed Martin / Sierra Space",
    vehicle: "Other Transaction Authority (OTA)",
    awardValue: "$1.33 Billion (54 Satellites)",
    fiscalYear: "FY2025 - FY2028",
    targetOrbit: "Low Earth Orbit (980 km, 81° Inc)",
    description: "Wide-field-of-view (WFOV) infrared sensor payloads dedicated to missile warning, tracking, and hypersonic glide vehicle target discrimination.",
    veroyxEngineLink: {
      title: "Coverage & Swath Analysis",
      href: "/swath"
    }
  },
  {
    id: "SDA-TRANCHE-2-TRANSPORT",
    title: "PWSA Tranche 2 Transport Layer (Beta / Alpha Mesh)",
    agency: "SDA",
    primeVendor: "Rocket Lab / Northrop Grumman / York Space Systems",
    vehicle: "Fixed-Price Prototype Agreement",
    awardValue: "$515 Million (18 Satellites)",
    fiscalYear: "FY2024 - FY2027",
    targetOrbit: "Low Earth Orbit (1,000 km)",
    description: "Resilient optical inter-satellite link (OISL) data relay backbone providing low-latency tactical Link 16 downlinks directly to warfighters in contested environments.",
    veroyxEngineLink: {
      title: "1550nm Lasercom Engine",
      href: "/lasercom"
    }
  },
  {
    id: "NASA-CLPS-PRIME-1",
    title: "Commercial Lunar Payload Services (CLPS) Task Order CP-12",
    agency: "NASA",
    primeVendor: "Intuitive Machines / Firefly Aerospace",
    vehicle: "Firm-Fixed-Price Task Order",
    awardValue: "$112.5 Million",
    fiscalYear: "FY2024 - FY2026",
    targetOrbit: "Trans-Lunar Injection (TLI) to Lunar South Pole",
    description: "Delivery of VIPER-class polar mobility instruments and ice-drill mass spectrometers to Shackleton Crater in support of Artemis human surface missions.",
    veroyxEngineLink: {
      title: "Interplanetary Trajectory",
      href: "/trajectory"
    }
  },
  {
    id: "USSF-VICTUS-HAZE",
    title: "Tactically Responsive Space (TacRS) High-Cadence Rendezvous",
    agency: "USSF / SSC",
    primeVendor: "Rocket Lab & True Anomaly",
    vehicle: "Direct Other Transaction (OTA)",
    awardValue: "$62 Million Combined",
    fiscalYear: "FY2025 - FY2026",
    targetOrbit: "Sun-Synchronous LEO (550 km)",
    description: "Dynamic on-orbit threat response exercise demonstrating 24-hour rapid launch and autonomous non-cooperative rendezvous, proximity operations, and space domain awareness (SDA).",
    veroyxEngineLink: {
      title: "Rendezvous & Docking (C-W)",
      href: "/docking"
    }
  },
  {
    id: "NRO-EOCL-EXPANSION",
    title: "Electro-Optical Commercial Layer (EOCL) Follow-On",
    agency: "NRO",
    primeVendor: "Planet Labs / Maxar / BlackSky",
    vehicle: "Commercial Subscription Agreement",
    awardValue: "$1.02 Billion (10-Year Ceiling)",
    fiscalYear: "FY2023 - FY2032",
    targetOrbit: "Dawn-Dusk Sun-Synchronous LEO (500 km)",
    description: "Commercial sub-meter high-revisit optical imaging pipeline providing near-real-time tactical battlefield damage assessment (BDA) to INDOPACOM and EUCOM.",
    veroyxEngineLink: {
      title: "Optical Payload Sizing & GSD",
      href: "/optical-payload"
    }
  }
]

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAgency, setSelectedAgency] = useState<string>("All")

  const agencies = ["All", "USSF / SSC", "SDA", "NASA", "NRO"]

  const filteredContracts = useMemo(() => {
    return CONTRACTS.filter(c => {
      const matchSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.primeVendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchAgency = selectedAgency === "All" || c.agency === selectedAgency
      return matchSearch && matchAgency
    })
  }, [searchQuery, selectedAgency])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              Defense &amp; Federal Space Acquisition Ledger
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              GOVERNMENT CONTRACTS
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Institutional intelligence covering active U.S. Space Force, Space Development Agency (SDA), NASA, and NRO space program procurements. Cross-reference contract operational parameters directly into Veroyx simulation engines.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 font-bold">
              $8.6B+ ACTIVE VEHICLES
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between font-mono text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contracts by program title, prime contractor, or IDIQ ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px]">
            {agencies.map(a => (
              <button
                key={a}
                onClick={() => setSelectedAgency(a)}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  selectedAgency === a
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Contract Ledger Grid */}
        <div className="space-y-4 font-mono text-xs">
          {filteredContracts.map(c => (
            <div
              key={c.id}
              className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                      {c.agency}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      DOC ID: {c.id} &middot; {c.fiscalYear}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {c.title}
                  </h2>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-amber-400">{c.awardValue}</div>
                  <div className="text-[10px] text-slate-500">{c.vehicle}</div>
                </div>
              </div>

              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                {c.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">PRIME VENDOR</span>
                  <strong className="text-white">{c.primeVendor}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">FLIGHT REGIME</span>
                  <strong className="text-cyan-300">{c.targetOrbit}</strong>
                </div>
                <div className="flex sm:justify-end items-center">
                  <Link
                    href={c.veroyxEngineLink.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-cyan-400 font-bold transition-all group"
                  >
                    <span>Simulate in {c.veroyxEngineLink.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
