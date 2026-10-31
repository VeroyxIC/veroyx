"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { 
  Rocket, 
  Orbit, 
  Radio, 
  Sun, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Thermometer, 
  Compass, 
  Activity, 
  ArrowRight, 
  Crosshair, 
  Waves, 
  Camera, 
  Zap, 
  DollarSign, 
  Calendar, 
  FileCheck2, 
  Globe, 
  Sparkles,
  Search,
  Maximize2,
  Video,
  Play
} from "lucide-react"

interface ModuleEntry {
  title: string
  href: string
  category: "Architecture" | "Dynamics & Orbits" | "Comms & Payloads" | "Power & Thermal" | "Structures & Safety" | "Environment & Operations"
  badge: string
  description: string
}

const MODULES: ModuleEntry[] = [
  // Architecture
  { title: "Unified Mission Architecture", href: "/mission-builder", category: "Architecture", badge: "Core Integrator", description: "Coupled concurrent engineering: orbit, mass, power, battery DoD, thermal, and delta-V." },
  { title: "PDR / FRR Compliance Matrix", href: "/compliance", category: "Architecture", badge: "Standards Audit", description: "Automated flight readiness verification across AIAA, NASA, ECSS, ISO, and FCC standards." },
  { title: "3D Mission & Intercept Visualizer", href: "/visualizer", category: "Architecture", badge: "WebGL 3D", description: "Interactive orbital tracks, attitude pointing frames, star tracker exclusion cones, and ISS tracking." },
  { title: "Orbital Launch Radar", href: "/launches", category: "Architecture", badge: "Live Radar", description: "Real-time spaceport grid tracking active launch azimuth corridors and booster stage vectors." },
  { title: "Parametric Cost Estimator", href: "/cost", category: "Architecture", badge: "NASA PCEC", description: "Parametric lifecycle cost modeling across WBS 01-09, heritage discounts, and P80 reserves." },
  { title: "Developer API & SDK", href: "/developers", category: "Architecture", badge: "REST API", description: "Serverless calculation endpoints for Python notebooks, MATLAB scripts, and CI/CD pipelines." },
  { title: "System Reliability & MTBF", href: "/reliability", category: "Architecture", badge: "MIL-HDBK-217F", description: "Parts-count failure rates (FIT), k-out-of-n redundancy, and mission success probabilities." },

  // Dynamics & Orbits
  { title: "Interplanetary Trajectory", href: "/trajectory", category: "Dynamics & Orbits", badge: "Patched Conics", description: "Lambert solver, delta-V orbital transfers, and planetary gravity assists." },
  { title: "Sensor Swath & Revisit", href: "/swath", category: "Dynamics & Orbits", badge: "Coverage", description: "Ground track geometry, swath access widths, and constellation revisit frequencies." },
  { title: "Rendezvous & Docking", href: "/docking", category: "Dynamics & Orbits", badge: "NASA IDSS", description: "Clohessy-Wiltshire relative motion, approach corridors, and soft capture latches." },
  { title: "Environmental Disturbances", href: "/disturbance", category: "Dynamics & Orbits", badge: "Secular Drift", description: "Gravity gradient, aerodynamic drag, solar radiation pressure (SRP), and magnetic torques." },
  { title: "Conjunction Assessment (CAM)", href: "/conjunction", category: "Dynamics & Orbits", badge: "NASA CARA", description: "2D B-plane covariance ellipsoids, Foster collision probabilities (Pc), and CAM burns." },
  { title: "Pass Schedule & Tracking", href: "/pass-schedule", category: "Dynamics & Orbits", badge: "SGP4 / J2", description: "Topocentric Az/El antenna steering schedules, contact pass timelines, and visibility windows." },

  // Comms & Payloads
  { title: "RF Link Budget", href: "/link", category: "Comms & Payloads", badge: "CCSDS 401.0-B", description: "Free-space path loss, atmospheric rain attenuation, G/T, and Eb/N0 link closure." },
  { title: "Electronic Warfare & Jamming", href: "/ew", category: "Comms & Payloads", badge: "Anti-Jam", description: "J/S power ratios, burn-through ranges, and DSSS processing gains." },
  { title: "Data Storage & Downlink", href: "/data-budget", category: "Comms & Payloads", badge: "Buffer Balance", description: "Solid-state recorder (SSR) buffer sizing and ground station contact dump balancing." },
  { title: "Optical Lasercom (OISL)", href: "/lasercom", category: "Comms & Payloads", badge: "1550nm Laser", description: "Free-space optical crosslinks, Gaussian beam divergence, and PAT pointing jitter penalties." },
  { title: "Optical Sensor Sizing", href: "/optical-payload", category: "Comms & Payloads", badge: "GSD & MTF", description: "Ground sample distance (GSD), Nyquist Q-factor, cascaded MTF, and radiometric SNR." },
  { title: "SAR Radar Payload", href: "/sar", category: "Comms & Payloads", badge: "Active Radar", description: "Noise equivalent sigma zero (NESZ), azimuth/range resolutions, and PRF timing windows." },
  { title: "Ground Station Network", href: "/ground-station", category: "Comms & Payloads", badge: "KSAT / DSN", description: "Elevation slant ranges, Doppler frequency shifts, and daily downlink volume budgets." },

  // Power & Thermal
  { title: "Solar Array Power & Fluence", href: "/power", category: "Power & Thermal", badge: "GaAs Triple-Junction", description: "Solar cell efficiency degradation, electron/proton radiation fluence, and temperature derating." },
  { title: "Battery Cycle Life & DoD", href: "/battery", category: "Power & Thermal", badge: "ECSS-E-ST-20-30C", description: "Eclipse capacity sizing, lithium-ion depth-of-discharge (DoD), and capacity fade curves." },
  { title: "EPS Bus Regulation & MPPT", href: "/eps", category: "Power & Thermal", badge: "ECSS-E-ST-20C", description: "28V/100V regulated vs. DET bus architectures, solar array I-V curves, and recharge C-rates." },
  { title: "Spacecraft Thermal Nodal", href: "/thermal", category: "Power & Thermal", badge: "Lumped Capacitance", description: "Internal dissipation, solar absorption, Earth albedo/IR radiation balances, and equilibrium temps." },
  { title: "Cryogenic Boil-Off & MLI", href: "/cryo", category: "Power & Thermal", badge: "Zero Boil-Off", description: "Multi-layer insulation (MLI) heat leaks, cryogen mass loss rates, and cryocooler loads." },
  { title: "Two-Phase Heat Pipes", href: "/two-phase", category: "Power & Thermal", badge: "CCHP Radiators", description: "Capillary pumping limits, sonic/entrainment boiling thresholds, and condenser sizing." },

  // Structures & Safety
  { title: "Mass Budget & Inertia", href: "/mass-budget", category: "Structures & Safety", badge: "AIAA S-120-2015", description: "Mass growth allowance (MGA), center of gravity travel, and 3x3 inertia tensors." },
  { title: "Vibration & Launch Loads", href: "/vibe", category: "Structures & Safety", badge: "NASA GEVS", description: "Quasi-static g-loads, random vibration power spectral density (PSD), and shock spectra." },
  { title: "MMOD Hypervelocity Shielding", href: "/mmod", category: "Structures & Safety", badge: "NASA Bumper", description: "Whipple bumper shielding, ballistic limit equations (BLE), and impact penetration risk." },
  { title: "Deployment Mechanisms", href: "/mechanisms", category: "Structures & Safety", badge: "ECSS-E-ST-33-01C", description: "Solar wing deployment kinematics, spring torque margins, and latch lock-up dynamics." },
  { title: "Micro-Vibration & Jitter", href: "/jitter", category: "Structures & Safety", badge: "Sub-Microradian", description: "Reaction wheel dynamic unbalance, structural resonant amplification, and LOS smear." },
  { title: "COPV Propellant Tank Sizing", href: "/prop-tank", category: "Structures & Safety", badge: "MEOP & Burst", description: "Composite overwrapped pressure vessels, hoop stress, burst safety factors, and blowdown." },
  { title: "Launch Vehicle Ascent Staging", href: "/launch-vehicle", category: "Structures & Safety", badge: "Booster Lift", description: "Falcon 9, Electron, and Ariane 6 lift curves, fairing dynamic clearances, and separation shock." },

  // Environment & Operations
  { title: "Atomic Oxygen (ATOX) Erosion", href: "/atox", category: "Environment & Operations", badge: "Kapton Degradation", description: "Thermospheric neutral atomic oxygen fluence, surface recession, and drag make-up sizing." },
  { title: "Spacecraft Plasma Charging", href: "/plasma", category: "Environment & Operations", badge: "NASA-HDBK-4002B", description: "Auroral electron flux, differential surface potential, and electrostatic discharge (ESD) risk." },
  { title: "Radiation Dose & TID", href: "/rad", category: "Environment & Operations", badge: "SHIELDOSE-2", description: "Trapped electron/proton belts, cosmic rays, aluminum shielding attenuation, and SEU latchup." },
  { title: "Outgassing & Contamination", href: "/outgassing", category: "Environment & Operations", badge: "ASTM E595", description: "Total mass loss (TML), CVCM volatile condensation, and optical throughput losses." },
  { title: "Atmospheric Entry Aerothermo", href: "/reentry", category: "Environment & Operations", badge: "Sutton-Graves", description: "Hypersonic stagnation-point convective heating, thermal protection ablation, and RF blackout." },
  { title: "Space Weather Operations Desk", href: "/space-weather", category: "Environment & Operations", badge: "NOAA Scales", description: "Solar radio flux (F10.7), Kp geomagnetic index, proton storm scales, and density inflation." },
  { title: "Orbit Decay & Disposal", href: "/decay", category: "Environment & Operations", badge: "FCC 5-Year Rule", description: "Thermospheric aerodynamic decay timelines, ISO 24113 compliance, and de-orbit delta-V." },
  { title: "Re-Entry Footprint & Disposal", href: "/reentry-footprint", category: "Environment & Operations", badge: "Point Nemo", description: "Targeted ocean disposal corridors (SPOUA), 3-sigma dispersion ellipses, and casualty risk." },
  { title: "Geomagnetic Dipole & MTQ", href: "/magnetics", category: "Environment & Operations", badge: "IGRF-13", description: "Planetary dipole fields, magnetic torquer rod sizing, and reaction wheel desaturation." },
  { title: "Star Tracker Field-of-View", href: "/star-tracker", category: "Environment & Operations", badge: "ISO 16691", description: "Sun/Earth/Moon optical exclusion baffle angles, attitude availability, and slew smear." }
]

// Video feeds showcasing tactical orbital dynamics & rocket staging
const LIVE_FEEDS = [
  {
    id: "feed-1",
    title: "STAGE-1 RECOVERY BURN",
    source: "ASDS 'ASOG' DOWNRANGE",
    badge: "LIVE CAM 01",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    telemetry: "ALT: 64.2 km · VEL: 1,840 m/s"
  },
  {
    id: "feed-2",
    title: "ISS NADIR EARTH SCAN",
    source: "COLUMBUS LAB HIGH-DEF",
    badge: "OPTICAL 02",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    telemetry: "ALT: 418.5 km · 7.66 km/s"
  },
  {
    id: "feed-3",
    title: "FAIRING EXPULSION / SECO",
    source: "MVAC TELEMETRY STREAM",
    badge: "VACUUM 03",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    telemetry: "ALT: 122.0 km · APOGEE 550 km"
  }
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("All")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const categories = ["All", "Architecture", "Dynamics & Orbits", "Comms & Payloads", "Power & Thermal", "Structures & Safety", "Environment & Operations"]

  // Jarvis Hologram Canvas Background
  useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
      canvas.height = canvas.parentElement?.clientHeight || 600
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    let angle = 0
    const particles: { r: number; theta: number; speed: number; size: number }[] = []
    for (let i = 0; i < 90; i++) {
      particles.push({
        r: 60 + Math.random() * 220,
        theta: Math.random() * Math.PI * 2,
        speed: (Math.random() - 0.5) * 0.015,
        size: Math.random() * 2 + 1
      })
    }

    const render = () => {
      angle += 0.008
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2

      // 1. Concentric Holographic Lattice Rings
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)"
      ctx.lineWidth = 1
      for (let r = 80; r <= 260; r += 50) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 2. Rotating Segmented Calibrations
      ctx.strokeStyle = "rgba(14, 165, 233, 0.28)"
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(cx, cy, 210, angle, angle + Math.PI * 0.45)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(cx, cy, 210, angle + Math.PI, angle + Math.PI * 1.45)
      ctx.stroke()

      ctx.strokeStyle = "rgba(251, 191, 36, 0.25)"
      ctx.beginPath()
      ctx.arc(cx, cy, 140, -angle * 1.5, -angle * 1.5 + Math.PI * 0.35)
      ctx.stroke()

      // 3. Jarvis Swarming Nodes (Ultron/Jarvis Data Cluster)
      particles.forEach((p, idx) => {
        p.theta += p.speed
        const px = cx + Math.cos(p.theta) * p.r
        const py = cy + Math.sin(p.theta) * (p.r * 0.55) // Elliptical projection

        ctx.fillStyle = idx % 4 === 0 ? "rgba(251, 191, 36, 0.6)" : "rgba(56, 189, 248, 0.6)"
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fill()

        // Filament linkages
        if (idx % 6 === 0) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.08)"
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(px, py)
          ctx.stroke()
        }
      })

      // 4. Central Reactor Core Pulse
      const corePulse = 28 + Math.sin(angle * 4) * 4
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, corePulse * 2.5)
      coreGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)")
      coreGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.12)")
      coreGrad.addColorStop(1, "rgba(2, 6, 23, 0)")
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, corePulse * 2.5, 0, Math.PI * 2)
      ctx.fill()

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const filteredModules = MODULES.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.badge.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === "All" || m.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-24 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-14">

        {/* Hero Section with Live Jarvis Holographic Core */}
        <div className="relative rounded-3xl border border-slate-800/80 bg-slate-950/60 overflow-hidden p-8 sm:p-14 shadow-2xl">
          {/* Animated Background Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none opacity-80"
          />

          <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-mono uppercase tracking-widest backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              JARVIS-CLASS INSTITUTIONAL FLIGHT ENGINE
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white font-mono uppercase">
              VEROYX
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-sans">
              Autonomous space systems concurrent engineering platform. 34 institutional simulation engines coordinating orbital mechanics, RF/lasercom links, power regulation, launch vehicle staging, and NASA flight verification.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
              <Link
                href="/mission-builder"
                className="px-6 py-3.5 rounded-xl bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                CONCURRENT MISSION BUILDER
              </Link>
              <Link
                href="/visualizer"
                className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-white font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <Orbit className="w-4 h-4 text-cyan-400" />
                3D SPATIAL INTERCEPT
              </Link>
              <Link
                href="/launches"
                className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <Radio className="w-4 h-4 text-orange-400" />
                ORBITAL LAUNCH RADAR
              </Link>
            </div>
          </div>
        </div>

        {/* Live Multi-Angle Tactical Video Feeds */}
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-white font-bold uppercase tracking-wider flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-400 animate-pulse" />
              TACTICAL FLIGHT TELEMETRY FEEDS (LIVE-LOOP)
            </span>
            <span className="text-[10px] text-cyan-400">
              SYNCHRONIZED DOWNLINK FEEDS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LIVE_FEEDS.map((feed) => (
              <div 
                key={feed.id} 
                className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group hover:border-cyan-500/60 transition-all shadow-xl"
              >
                {/* Loop Video */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  <video
                    src={feed.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  />

                  {/* Holographic Scanline Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-slate-950/80 pointer-events-none" />

                  {/* Corner Reticle Brackets */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/70" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/70" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/70" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/70" />

                  {/* Badge */}
                  <div className="absolute top-2.5 left-3.5 px-2 py-0.5 rounded bg-slate-950/80 border border-cyan-500/40 text-cyan-300 font-bold text-[9px] backdrop-blur-md">
                    {feed.badge}
                  </div>
                </div>

                {/* Video Info Header */}
                <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px]">{feed.title}</span>
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> REC
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{feed.source}</div>
                  <div className="text-[9px] text-cyan-400 font-mono pt-1 border-t border-slate-800/60">
                    {feed.telemetry}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module Search & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 font-mono text-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by subsystem, equation, or standard (e.g., 'DoD', 'link budget', 'GSD', 'CAM', 'PCEC', 'SPOUA')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat
                    ? "bg-cyan-950 border-cyan-500/60 text-cyan-300 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 34 Engine Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          {filteredModules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/60 transition-all flex flex-col justify-between group space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">{m.category}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold">
                    {m.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors mt-2">
                  {m.title}
                </h3>
                <p className="text-slate-400 text-xs font-sans mt-1.5 leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-cyan-400 border-t border-slate-800/40">
                <span>{m.href}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Global Footer */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 gap-4">
          <div>
            VEROYX FLIGHT PLATFORM &copy; 2026 &middot; INSTITUTIONAL SPACE SYSTEMS ENGINEERING
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/compliance" className="hover:text-cyan-400">Compliance</Link>
            <Link href="/developers" className="hover:text-cyan-400">API Documentation</Link>
            <Link href="/launches" className="hover:text-cyan-400">Orbital Radar</Link>
            <Link href="/mission-builder" className="hover:text-cyan-400">Mission Builder</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
