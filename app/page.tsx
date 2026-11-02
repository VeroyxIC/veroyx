"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import * as THREE from "three"
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react"
import { 
  ShieldCheck, ShieldAlert, Globe, Orbit, Radar, Radio, 
  Zap, Compass, Terminal, Search, Lock, ExternalLink, 
  Layers, Activity, Cpu, Rocket, ChevronRight, Eye, Server, 
  Crosshair, Key, AlertTriangle, FileText, CheckCircle2 
} from "lucide-react"

interface RouteDeck {
  name: string
  href: string
  category: "SDA & DEFENSE" | "ORBITAL & FLIGHT" | "PAYLOAD & COMMS" | "PHYSICS & ENV" | "SUBSYSTEMS" | "INFRASTRUCTURE" | "MARKET & INTEL" | "DEVELOPER API"
  description: string
  badge: string
  badgeColor: string
}

const ALL_DECKS: RouteDeck[] = [
  // 1. SDA & Contested Defense
  { name: "Conjunction Assessment", href: "/conjunction", category: "SDA & DEFENSE", description: "Foster/Akella 2D B-plane collision probability (Pc) & COLA burn sizing", badge: "CORE SDA", badgeColor: "border-rose-500/60 text-rose-400" },
  { name: "Electronic Warfare (EW)", href: "/ew", category: "SDA & DEFENSE", description: "Contested space RF jamming, CRPA adaptive null steering & J/S link analysis", badge: "TACTICAL", badgeColor: "border-rose-500/60 text-rose-400" },
  { name: "Space Domain Awareness", href: "/ssa", category: "SDA & DEFENSE", description: "High-accuracy orbital surveillance, catalog screening & sensor tasking", badge: "SDA", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "MMOD Hypervelocity Shielding", href: "/mmod", category: "SDA & DEFENSE", description: "Christiansen BLE ballistic limits, Whipple bumper & fragment cloud dispersion", badge: "DEFENSE", badgeColor: "border-amber-500/60 text-amber-400" },
  { name: "Threat Scenarios", href: "/scenarios", category: "SDA & DEFENSE", description: "ASAT interception, co-orbital proximity drift & kinetic strike briefings", badge: "INTEL", badgeColor: "border-rose-500/60 text-rose-400" },
  { name: "Asset Watchlist", href: "/watchlist", category: "SDA & DEFENSE", description: "Priority object ephemeris monitor & autonomous telemetry anomaly dispatch", badge: "MONITOR", badgeColor: "border-cyan-500/60 text-cyan-400" },

  // 2. Orbital Mechanics & Flight
  { name: "Constellation Architect", href: "/constellations", category: "ORBITAL & FLIGHT", description: "Walker Delta/Star constellation synthesis with 3D multi-plane crosslinks", badge: "ARCHITECTURE", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "Autonomous Docking (RPO)", href: "/docking", category: "ORBITAL & FLIGHT", description: "Hill-Clohessy-Wiltshire (CW) glideslope approach & LiDAR terminal capture", badge: "AUTONOMOUS", badgeColor: "border-emerald-500/60 text-emerald-400" },
  { name: "ADCS & Reaction Wheels", href: "/adcs", category: "ORBITAL & FLIGHT", description: "Tetrahedral 4-reaction wheel momentum management & star tracker EKF", badge: "GNC", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "2D Ground Track", href: "/ground-track", category: "ORBITAL & FLIGHT", description: "Mercator sub-track projection, J2 nodal regression & station visibility footprints", badge: "KINEMATICS", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "Ascent & Trajectory", href: "/trajectory", category: "ORBITAL & FLIGHT", description: "Multi-stage gravity turn, Max-Q dynamic pressure & orbital injection profiling", badge: "FLIGHT", badgeColor: "border-amber-500/60 text-amber-400" },
  { name: "Delta-V Budget", href: "/delta-v", category: "ORBITAL & FLIGHT", description: "Hohmann transfers, plane change penalties & orbital maintenance margins", badge: "PROPULSION", badgeColor: "border-slate-500/60 text-slate-400" },
  { name: "Orbital Decay", href: "/decay", category: "ORBITAL & FLIGHT", description: "NRLMSISE-00 atmospheric drag & ballistic coefficient lifetime prediction", badge: "DYNAMICS", badgeColor: "border-slate-500/60 text-slate-400" },
  { name: "Deorbit & Reentry", href: "/reentry-footprint", category: "ORBITAL & FLIGHT", description: "Controlled deorbit targeting & casualty risk ellipse footprint mapping", badge: "SAFETY", badgeColor: "border-rose-500/60 text-rose-400" },

  // 3. Payload & Communications
  { name: "Synthetic Aperture Radar", href: "/sar", category: "PAYLOAD & COMMS", description: "All-weather AESA microwave reconnaissance, PRF ambiguity & sub-meter GSD", badge: "RECON", badgeColor: "border-emerald-500/60 text-emerald-400" },
  { name: "Optical Lasercom (OISL)", href: "/lasercom", category: "PAYLOAD & COMMS", description: "1550nm inter-satellite crosslinks, piezo FSM closed-loop & photon counting", badge: "OPTICAL", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "RF Link Budget", href: "/link", category: "PAYLOAD & COMMS", description: "Friis path loss, ITU-R P.838 rain fade & DVB-S2X ACM modulation margin", badge: "TELECOM", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "Sensor Swath & GSD", href: "/swath", category: "PAYLOAD & COMMS", description: "Focal length raycasting, off-nadir pixel elongation & NIIRS image intelligence", badge: "OPTICAL", badgeColor: "border-emerald-500/60 text-emerald-400" },
  { name: "Mesh Interconnect", href: "/mesh", category: "PAYLOAD & COMMS", description: "Low-latency packet routing across multi-layered proliferated LEO topologies", badge: "NETWORKING", badgeColor: "border-slate-500/60 text-slate-400" },

  // 4. Physics & Space Environment
  { name: "Power Systems (EPS)", href: "/eps", category: "PHYSICS & ENV", description: "Solar array generation, beta angle shadow modeling & battery DoD balance", badge: "ENERGY", badgeColor: "border-amber-500/60 text-amber-400" },
  { name: "Thermal Balance (TCS)", href: "/thermal", category: "PHYSICS & ENV", description: "Stefan-Boltzmann nodal radiation, optical coatings & survival heater sizing", badge: "THERMAL", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "Space Weather & Radiation", href: "/space-weather", category: "PHYSICS & ENV", description: "Van Allen trapped proton fluxes, AP8/AE8 dosimetry & SEU/TID risk modeling", badge: "ENVIRONMENT", badgeColor: "border-amber-500/60 text-amber-400" },
  { name: "Atomic Oxygen (ATOX)", href: "/atox", category: "PHYSICS & ENV", description: "VLEO material erosion, Kapton degradation & protective thin-film sizing", badge: "VLEO", badgeColor: "border-slate-500/60 text-slate-400" },
  { name: "Spacecraft Plasma Charging", href: "/plasma", category: "PHYSICS & ENV", description: "GEO auroral differential charging & electrostatic discharge (ESD) mitigation", badge: "PLASMA", badgeColor: "border-slate-500/60 text-slate-400" },

  // 5. Subsystems & Engineering
  { name: "Propulsion & Thrusters", href: "/propulsion", category: "SUBSYSTEMS", description: "Hall-effect electric thrusters, chemical monopropellant & Isp sizing", badge: "HARDWARE", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "Mass Budget Allocator", href: "/mass-budget", category: "SUBSYSTEMS", description: "Subsystem mass contingency, launch margins & dry/wet mass breakdown", badge: "SYSTEMS", badgeColor: "border-slate-500/60 text-slate-400" },
  { name: "Mission Architecture Builder", href: "/mission-builder", category: "SUBSYSTEMS", description: "Full lifecycle modular spacecraft designer & dry-mass parametric estimator", badge: "FLAGSHIP", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "System Reliability & MTBF", href: "/reliability", category: "SUBSYSTEMS", description: "Weibull failure curves, dual-redundant cold spares & mission assurance", badge: "ASSURANCE", badgeColor: "border-slate-500/60 text-slate-400" },

  // 6. Ground Infrastructure
  { name: "Ground Station Passes", href: "/passes", category: "INFRASTRUCTURE", description: "AOS/LOS contact scheduling, Doppler frequency shifts & pedestal tracking", badge: "TT&C", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "Spaceport Directory", href: "/spaceports", category: "INFRASTRUCTURE", description: "Global launch pads, orbital inclination bounds & launch azimuth corridors", badge: "LOGISTICS", badgeColor: "border-slate-500/60 text-slate-400" },
  { name: "Launch Vehicle Manifest", href: "/launches", category: "INFRASTRUCTURE", description: "Commercial & defense heavy-lift launch schedules and payload capacities", badge: "MANIFEST", badgeColor: "border-slate-500/60 text-slate-400" },

  // 7. Defense Market & Intel
  { name: "Defense Contracts Intelligence", href: "/contracts", category: "MARKET & INTEL", description: "DoD, SDA, ESA, and UK Space Command contract awards and prime tracking", badge: "PROCUREMENT", badgeColor: "border-amber-500/60 text-amber-400" },
  { name: "Aerospace Companies Directory", href: "/companies", category: "MARKET & INTEL", description: "Prime contractors, smallsat manufacturers & commercial launch providers", badge: "ECOSYSTEM", badgeColor: "border-slate-500/60 text-slate-400" },
  { name: "Government Defense Grants", href: "/grants", category: "MARKET & INTEL", description: "SBIR/STTR solicitations, DIU challenges & ESA open funding programs", badge: "GRANTS", badgeColor: "border-slate-500/60 text-slate-400" },
  { name: "ITAR & Defense Compliance", href: "/compliance", category: "MARKET & INTEL", description: "Export control checklists, EAR technical ratings & NATO compliance gates", badge: "SECURITY", badgeColor: "border-rose-500/60 text-rose-400" },

  // 8. Developer & API
  { name: "Developer Documentation", href: "/developers", category: "DEVELOPER API", description: "REST endpoints, SDK quickstart, JSON schemas & programmatic authentication", badge: "API v1", badgeColor: "border-cyan-500/60 text-cyan-400" },
  { name: "Webhook Dispatch Engine", href: "/developers/webhooks", category: "DEVELOPER API", description: "Real-time webhooks for conjunction alerts, pass AOS & telemetry anomalies", badge: "EVENT-DRIVEN", badgeColor: "border-emerald-500/60 text-emerald-400" }
]

const CATEGORIES = [
  "ALL DECKS",
  "SDA & DEFENSE",
  "ORBITAL & FLIGHT",
  "PAYLOAD & COMMS",
  "PHYSICS & ENV",
  "SUBSYSTEMS",
  "INFRASTRUCTURE",
  "MARKET & INTEL",
  "DEVELOPER API"
] as const

function HomePageContent() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sessionContext = useSession()
  const session = sessionContext?.data

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL DECKS")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDecks = ALL_DECKS.filter(deck => {
    const matchesCategory = selectedCategory === "ALL DECKS" || deck.category === selectedCategory
    const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          deck.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          deck.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 4, 14)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xffffff, 2.5)
    sun.position.set(12, 10, 10)
    scene.add(sun)

    const earthRadius = 4.2
    const earthGeo = new THREE.SphereGeometry(earthRadius, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: false
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.15 })
    const wireEarth = new THREE.Mesh(new THREE.SphereGeometry(earthRadius * 1.01, 32, 32), wireMat)
    earth.add(wireEarth)

    const shellGroup = new THREE.Group()
    scene.add(shellGroup)

    const orbitRadius = 6.0
    for (let i = 0; i < 4; i++) {
      const plane = new THREE.Group()
      plane.rotation.y = (i * Math.PI) / 4
      plane.rotation.x = 0.95

      const ringCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringCurve.getPoints(64))
      const ringMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
      const ringMesh = new THREE.Line(ringGeo, ringMat)
      plane.add(ringMesh)

      for (let s = 0; s < 6; s++) {
        const satMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        )
        const angle = (s * Math.PI) / 3
        satMesh.position.set(orbitRadius * Math.cos(angle), orbitRadius * Math.sin(angle), 0)
        plane.add(satMesh)
      }

      shellGroup.add(plane)
    }

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      earth.rotation.y += 0.002
      shellGroup.rotation.y += 0.001
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* INSTITUTIONAL TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/80 px-8 py-4 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-black font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              VX
            </div>
            <div>
              <span className="text-white font-black text-sm tracking-wider uppercase block">VEROYX</span>
              <span className="text-[9px] text-slate-500 tracking-widest block uppercase">Space Domain Intelligence</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900/60 rounded-full border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-[10px]">OPERATIONAL DEFENSE DECK: <span className="text-white font-bold">87 COMPILED ROUTES</span></span>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-md mx-8 relative hidden md:block">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Quick search across all 87 space modules..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
          />
        </div>

        {/* Clearance & Auth Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border border-slate-800 rounded-lg px-3 py-1.5 bg-slate-900/40">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[10px]">CLEARANCE:</span>
            <span className="text-cyan-400 font-bold text-[10px]">
              {session?.user ? "TOP SECRET // SCI" : "UNCLASSIFIED"}
            </span>
          </div>

          {session ? (
            <button
              onClick={() => signOut()}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 font-bold text-[11px] transition-colors"
            >
              DISCONNECT
            </button>
          ) : (
            <button
              onClick={() => signIn()}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-1.5"
            >
              <Key className="w-3 h-3" /> ZERO-TRUST AUTH
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION WITH 3D ORBITAL GLOBE */}
      <section className="relative pt-32 pb-16 px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 border-b border-slate-800/80">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> INSTITUTIONAL SPACE DEFENSE PLATFORM
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Planetary Space Domain Awareness &amp; Satellite Engineering.
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
            Veroyx provides institutional defense commands, constellation operators, and prime aerospace contractors with real-time 3D orbital dynamics, electronic warfare counter-measures, MMOD hypervelocity risk mitigation, and full-stack RF/OISL communications engineering.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs">
            <Link 
              href="/conjunction"
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
            >
              <Crosshair className="w-4 h-4" /> LAUNCH CONJUNCTION DECK
            </Link>

            <Link 
              href="/developers"
              className="px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 font-bold flex items-center gap-2 transition-all bg-slate-900/40"
            >
              <Terminal className="w-4 h-4" /> API DOCUMENTATION
            </Link>
          </div>

          {/* Institutional Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Compiled Routes</span>
              <span className="text-2xl font-black text-white">87 DEPLOYED</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Catalog Screening</span>
              <span className="text-2xl font-black text-cyan-400">48,200+ OBJ</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Lasercom Crosslink</span>
              <span className="text-2xl font-black text-emerald-400">100 Gbps</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Collision Threshold</span>
              <span className="text-2xl font-black text-rose-400">Pc ≥ 10⁻⁴</span>
            </div>
          </div>
        </div>

        {/* 3D Earth Globe Visualizer */}
        <div className="w-full lg:w-[480px] h-[360px] sm:h-[420px] relative rounded-3xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-950/40">
          <div className="absolute top-4 left-4 z-10 font-mono text-[10px] text-cyan-400 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            LIVE ORBITAL RECON CONSTELLATION
          </div>
          <div ref={mountRef} className="w-full h-full cursor-move" />
        </div>
      </section>

      {/* FILTERABLE COMMAND DECK DIRECTORY */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <Layers className="w-5 h-5 text-cyan-400" /> Operational Decks &amp; Systems Registry
            </h2>
            <p className="text-slate-400 text-xs mt-1 font-mono">
              Showing {filteredDecks.length} analytical engines and programmatic APIs
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  selectedCategory === cat 
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Decks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map(deck => (
            <Link
              key={deck.href}
              href={deck.href}
              className="group p-5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/60 transition-all duration-200 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 font-mono">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${deck.badgeColor}`}>
                    {deck.badge}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">{deck.category}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                  {deck.name}
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </h3>

                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  {deck.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>{deck.href}</span>
                <span className="text-cyan-400 group-hover:underline flex items-center gap-1">
                  INITIALIZE <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* INSTITUTIONAL DEFENSE FOOTER */}
      <footer className="border-t border-slate-800 mt-16 px-8 py-10 bg-[#01040f] font-mono text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-black font-black text-xs">
              VX
            </div>
            <div>
              <span className="text-white font-bold block">VEROYX SPACE INTELLIGENCE PLATFORM</span>
              <span className="text-[10px] text-slate-500 block">© 2026 Veroyx IC. All rights reserved.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[10px]">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> ITAR / EAR COMPLIANT</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> NASA-STD-8719.14</span>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-amber-400" /> ZERO-TRUST ARCHITECTURE</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <SessionProvider>
      <HomePageContent />
    </SessionProvider>
  )
}
