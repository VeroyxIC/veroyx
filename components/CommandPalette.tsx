"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Rocket, 
  Orbit, 
  Radio, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Terminal, 
  Flame, 
  DollarSign, 
  ArrowRight,
  ExternalLink,
  BookOpen
} from "lucide-react"

interface CommandItem {
  id: string
  title: string
  subtitle: string
  href: string
  category: "Architecture" | "Dynamics & Orbits" | "Comms & Payloads" | "Power & Thermal" | "Structures & Safety" | "Environment & Operations" | "Standards"
  keywords: string[]
  badge?: string
}

const COMMAND_REGISTRY: CommandItem[] = [
  // Architecture & Integrators
  {
    id: "mission-builder",
    title: "Unified Mission Architecture",
    subtitle: "Coupled concurrent engineering: orbit, mass, power, battery DoD, and delta-V",
    href: "/mission-builder",
    category: "Architecture",
    keywords: ["concurrent", "mission", "integrator", "state", "architecture", "trade study", "phase a", "phase b"],
    badge: "Core"
  },
  {
    id: "compliance",
    title: "Flight Compliance & VCRM Matrix",
    subtitle: "NASA, ECSS, AIAA, and FCC standards verification traceability matrix",
    href: "/compliance",
    category: "Standards",
    keywords: ["compliance", "vcrm", "standards", "nasa-std-5001b", "8719.14", "gevs", "ecss", "fcc"],
    badge: "VCRM"
  },
  {
    id: "visualizer",
    title: "3D Mission & Intercept Visualizer",
    subtitle: "High-fidelity 3D Earth, ISS rendezvous, debris intercept, and rangefinder",
    href: "/visualizer",
    category: "Architecture",
    keywords: ["visualizer", "3d", "globe", "iss", "rendezvous", "intercept", "target", "earth"],
    badge: "3D"
  },
  {
    id: "launches",
    title: "Orbital Launch Radar",
    subtitle: "Global spaceport grid tracking active launch azimuth corridors and booster recovery",
    href: "/launches",
    category: "Architecture",
    keywords: ["launches", "radar", "spaceport", "cape canaveral", "vandenberg", "manifest", "countdown"],
    badge: "Radar"
  },
  {
    id: "cost",
    title: "Parametric Cost Estimator",
    subtitle: "NASA PCEC & USCM cost estimating relationships (CERs) across WBS 01-09",
    href: "/cost",
    category: "Architecture",
    keywords: ["cost", "pcec", "wbs", "budget", "parametric", "cer", "reserve", "p80"],
    badge: "NASA PCEC"
  },
  {
    id: "developers",
    title: "Developer REST API & Python SDK",
    subtitle: "Headless calculation endpoints supporting J2000 ECI and CCSDS schemas",
    href: "/developers",
    category: "Architecture",
    keywords: ["api", "sdk", "python", "matlab", "rest", "j2000", "eci", "developer"],
    badge: "API"
  },
  {
    id: "reliability",
    title: "System Reliability & MTBF Sizing",
    subtitle: "MIL-HDBK-217F parts-count failure rates (FIT) and k-out-of-n redundancy",
    href: "/reliability",
    category: "Architecture",
    keywords: ["reliability", "mtbf", "fit", "failure rate", "redundancy", "mil-hdbk-217f"],
    badge: "Reliability"
  },

  // Dynamics & Orbits
  {
    id: "conjunction",
    title: "Conjunction Assessment (CAM)",
    subtitle: "2D B-plane covariance ellipsoids, Foster collision probability (Pc), and CAM burns",
    href: "/conjunction",
    category: "Dynamics & Orbits",
    keywords: ["conjunction", "cam", "collision", "foster", "b-plane", "debris", "cdm", "8719.66"],
    badge: "NASA CARA"
  },
  {
    id: "pass-schedule",
    title: "Pass Schedule & Tracking Windows",
    subtitle: "Topocentric Az/El antenna steering timelines and contact pass durations",
    href: "/pass-schedule",
    category: "Dynamics & Orbits",
    keywords: ["pass schedule", "tracking", "azimuth", "elevation", "aos", "los", "ground pass", "sgp4"],
    badge: "SGP4"
  },
  {
    id: "trajectory",
    title: "Interplanetary Trajectory Sizing",
    subtitle: "Lambert solver, orbital transfers, patched conics, and delta-V requirements",
    href: "/trajectory",
    category: "Dynamics & Orbits",
    keywords: ["trajectory", "lambert", "delta-v", "transfer", "hohmann", "patched conics"],
    badge: "Trajectory"
  },
  {
    id: "swath",
    title: "Sensor Swath & Constellation Revisit",
    subtitle: "Ground track access geometry, swath widths, and orbital revisit periods",
    href: "/swath",
    category: "Dynamics & Orbits",
    keywords: ["swath", "coverage", "revisit", "constellation", "ground track", "fov"],
    badge: "Coverage"
  },
  {
    id: "docking",
    title: "Rendezvous & Soft Docking",
    subtitle: "Clohessy-Wiltshire (C-W) relative motion equations and approach corridors",
    href: "/docking",
    category: "Dynamics & Orbits",
    keywords: ["docking", "rendezvous", "clohessy-wiltshire", "c-w", "relative motion", "idss"],
    badge: "NASA IDSS"
  },
  {
    id: "disturbance",
    title: "Orbital Environmental Disturbances",
    subtitle: "Gravity gradient, aerodynamic drag, solar radiation pressure (SRP), and magnetic torques",
    href: "/disturbance",
    category: "Dynamics & Orbits",
    keywords: ["disturbance", "torque", "gravity gradient", "srp", "solar pressure", "aerodynamic drag"],
    badge: "Torques"
  },

  // Comms & Payloads
  {
    id: "link",
    title: "RF Link Budget Closure",
    subtitle: "CCSDS 401.0-B free-space path loss, rain attenuation, G/T, and Eb/N0 margin",
    href: "/link",
    category: "Comms & Payloads",
    keywords: ["link", "rf", "link budget", "path loss", "eb/n0", "margin", "ccsds 401.0-b"],
    badge: "CCSDS"
  },
  {
    id: "optical-payload",
    title: "Optical Sensor Sizing & GSD",
    subtitle: "Ground Sample Distance (GSD), Nyquist Q-factor, cascaded MTF, and radiometric SNR",
    href: "/optical-payload",
    category: "Comms & Payloads",
    keywords: ["optical", "payload", "camera", "gsd", "mtf", "snr", "nyquist", "telescope"],
    badge: "Optics"
  },
  {
    id: "sar",
    title: "Synthetic Aperture Radar (SAR)",
    subtitle: "Noise equivalent sigma zero (NESZ), azimuth/range resolutions, and PRF diamond windows",
    href: "/sar",
    category: "Comms & Payloads",
    keywords: ["sar", "radar", "nesz", "chirp", "prf", "azimuth resolution", "synthetic aperture"],
    badge: "Radar"
  },
  {
    id: "lasercom",
    title: "Optical Intersatellite Link (OISL)",
    subtitle: "1550nm free-space lasercom crosslinks, beam divergence, and PAT jitter penalties",
    href: "/lasercom",
    category: "Comms & Payloads",
    keywords: ["lasercom", "oisl", "optical link", "pointing jitter", "1550nm", "crosslink"],
    badge: "Laser"
  },
  {
    id: "ew",
    title: "Electronic Warfare & Anti-Jamming",
    subtitle: "Jammer-to-signal (J/S) power ratios, burn-through ranges, and DSSS processing gain",
    href: "/ew",
    category: "Comms & Payloads",
    keywords: ["ew", "jamming", "anti-jam", "j/s", "dsss", "electronic warfare"],
    badge: "Anti-Jam"
  },

  // Power & Thermal
  {
    id: "eps",
    title: "EPS Bus Regulation & MPPT",
    subtitle: "ECSS-E-ST-20C 28V/100V regulated vs. DET bus topologies, solar array I-V, and recharge C-rates",
    href: "/eps",
    category: "Power & Thermal",
    keywords: ["eps", "mppt", "bus regulation", "i-v curve", "recharge", "det", "ecss-e-st-20c"],
    badge: "EPS"
  },
  {
    id: "power",
    title: "Solar Array Power & Fluence",
    subtitle: "Triple-junction GaAs cell degradation, particle radiation fluence, and temp deratings",
    href: "/power",
    category: "Power & Thermal",
    keywords: ["power", "solar array", "gaas", "fluence", "radiation degradation", "solar cells"],
    badge: "Solar"
  },
  {
    id: "battery",
    title: "Battery Cycle Life & Depth of Discharge",
    subtitle: "Lithium-ion eclipse capacity sizing, DoD limits, and cycle life degradation curves",
    href: "/battery",
    category: "Power & Thermal",
    keywords: ["battery", "dod", "depth of discharge", "lithium-ion", "eclipse capacity"],
    badge: "Battery"
  },
  {
    id: "thermal",
    title: "Spacecraft Thermal Nodal Equilibrium",
    subtitle: "Internal heat dissipation, solar absorption, Earth albedo/IR balances, and temps",
    href: "/thermal",
    category: "Power & Thermal",
    keywords: ["thermal", "heat", "nodal", "albedo", "emissivity", "absorptivity", "temperature"],
    badge: "Thermal"
  },
  {
    id: "two-phase",
    title: "Two-Phase Heat Pipes & CCHP",
    subtitle: "Capillary pumping limits, sonic/entrainment thresholds, and radiator condenser sizing",
    href: "/two-phase",
    category: "Power & Thermal",
    keywords: ["heat pipe", "two-phase", "cchp", "capillary limit", "radiator", "cooling"],
    badge: "Two-Phase"
  },
  {
    id: "cryo",
    title: "Cryogenic Boil-Off & MLI Sizing",
    subtitle: "Multi-layer insulation (MLI) heat leaks, boil-off mass loss rates, and cryocooler loads",
    href: "/cryo",
    category: "Power & Thermal",
    keywords: ["cryo", "boil-off", "mli", "insulation", "liquid oxygen", "liquid hydrogen"],
    badge: "Cryo"
  },

  // Structures & Safety
  {
    id: "launch-vehicle",
    title: "Launch Vehicle Ascent Staging & Fitment",
    subtitle: "Booster lift performance, fairing stay-out clearance envelopes, and staging sequences",
    href: "/launch-vehicle",
    category: "Structures & Safety",
    keywords: ["launch vehicle", "falcon 9", "electron", "ariane 6", "fairing", "ascent", "staging"],
    badge: "Launcher"
  },
  {
    id: "mass-budget",
    title: "Mass Budget & Inertia Matrix",
    subtitle: "AIAA S-120-2015 Mass Growth Allowance (MGA), center-of-gravity, and 3x3 inertia tensors",
    href: "/mass-budget",
    category: "Structures & Safety",
    keywords: ["mass", "mga", "inertia", "center of gravity", "mass budget", "aiaa s-120-2015"],
    badge: "Mass"
  },
  {
    id: "vibe",
    title: "Vibration & Launch Loads",
    subtitle: "NASA GEVS quasi-static limit loads, random vibration PSD, and shock response spectra",
    href: "/vibe",
    category: "Structures & Safety",
    keywords: ["vibe", "vibration", "psd", "gevs", "random vibration", "shock", "miles equation"],
    badge: "NASA GEVS"
  },
  {
    id: "prop-tank",
    title: "COPV Propellant Tank Sizing",
    subtitle: "Composite overwrapped pressure vessels, hoop stress, burst safety factors, and blowdown",
    href: "/prop-tank",
    category: "Structures & Safety",
    keywords: ["copv", "propellant tank", "pressure vessel", "burst factor", "hoop stress", "blowdown"],
    badge: "COPV"
  },
  {
    id: "mmod",
    title: "MMOD Hypervelocity Shielding",
    subtitle: "Whipple bumper shielding, Cour-Palais ballistic limit equations (BLE), and impact risk",
    href: "/mmod",
    category: "Structures & Safety",
    keywords: ["mmod", "micrometeoroid", "whipple", "ballistic limit", "shielding", "debris impact"],
    badge: "MMOD"
  },
  {
    id: "jitter",
    title: "Micro-Vibration & Line-of-Sight Jitter",
    subtitle: "Reaction wheel dynamic unbalance, structural resonant amplification, and LOS smear",
    href: "/jitter",
    category: "Structures & Safety",
    keywords: ["jitter", "reaction wheel", "micro-vibration", "unbalance", "los smear", "harmonics"],
    badge: "Jitter"
  },

  // Environment & Disposal
  {
    id: "reentry-footprint",
    title: "Re-Entry Footprint & Disposal",
    subtitle: "Targeted ocean disposal (Point Nemo SPOUA), 3-sigma dispersion ellipses, and casualty Ec",
    href: "/reentry-footprint",
    category: "Environment & Operations",
    keywords: ["reentry", "footprint", "point nemo", "spoua", "casualty risk", "dispersion", "8719.14"],
    badge: "Point Nemo"
  },
  {
    id: "decay",
    title: "Orbital Decay & 5-Year Compliance",
    subtitle: "Thermospheric drag decay timelines, ISO 24113 compliance, and de-orbit delta-V",
    href: "/decay",
    category: "Environment & Operations",
    keywords: ["decay", "fcc 5-year", "orbital lifetime", "de-orbit", "atmospheric drag", "iso 24113"],
    badge: "FCC 5-Yr"
  },
  {
    id: "space-weather",
    title: "Space Weather Operations Desk",
    subtitle: "Solar flux F10.7, geomagnetic Kp index, proton storm radiation, and density inflation",
    href: "/space-weather",
    category: "Environment & Operations",
    keywords: ["space weather", "f10.7", "kp index", "geomagnetic storm", "noaa", "solar flare"],
    badge: "NOAA"
  },
  {
    id: "rad",
    title: "Radiation Dose & Total Ionizing Dose (TID)",
    subtitle: "Trapped electron/proton belts, cosmic rays, and aluminum shielding attenuation",
    href: "/rad",
    category: "Environment & Operations",
    keywords: ["radiation", "tid", "shielding", "trapped belts", "single event", "rad-hard"],
    badge: "Radiation"
  }
]

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Keyboard shortcut listener: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Focus input upon open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Filter commands
  const filteredItems = useMemo(() => {
    if (!query.trim()) return COMMAND_REGISTRY.slice(0, 8)

    const q = query.toLowerCase()
    return COMMAND_REGISTRY.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q)
      const matchSub = item.subtitle.toLowerCase().includes(q)
      const matchCategory = item.category.toLowerCase().includes(q)
      const matchKeywords = item.keywords.some((k) => k.includes(q))
      return matchTitle || matchSub || matchCategory || matchKeywords
    }).slice(0, 10)
  }, [query])

  // Key navigation within results
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault()
      router.push(filteredItems[selectedIndex].href)
      setIsOpen(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <Search className="w-4 h-4 text-cyan-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search 34 engineering engines, NASA standards, or formulations..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/40 p-2 text-xs">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching aerospace engine or standard found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href)
                    setIsOpen(false)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-cyan-950/70 border border-cyan-500/40 text-white shadow-md shadow-cyan-950/30" 
                      : "text-slate-300 hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  <div className="space-y-0.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{item.title}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-950 text-cyan-400 border border-slate-800">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans line-clamp-1">
                      {item.subtitle}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase">{item.category}</span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "text-cyan-400 translate-x-1" : "text-slate-600"}`} />
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/90 text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Open Engine</span>
          </div>
          <div>
            34 INSTITUTIONAL AEROSPACE ENGINES
          </div>
        </div>

      </div>
    </div>
  )
}
