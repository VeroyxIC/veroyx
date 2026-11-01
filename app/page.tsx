"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import * as THREE from "three"
import { Search, Sparkles, Box, Rocket, Cpu, ShieldCheck, Lock, Database } from "lucide-react"
import BrandLogo from "@/app/components/BrandLogo"

const MODULES = [
  { title: "Unified Mission Architecture", path: "/mission-builder", category: "Architecture", desc: "Coupled concurrent engineering: orbit, mass, power, battery DoD, thermal, and delta-V." },
  { title: "Contracts & SLA Compliance", path: "/contracts", category: "Architecture", desc: "Automated flight readiness verification and financial burn rate tracking." },
  { title: "3D Mission Visualizer", path: "/visualizer", category: "Environment & Operations", desc: "Interactive orbital tracks, attitude pointing frames, and ground swaths." },
  { title: "Constellation Watchlist", path: "/watchlist", category: "Environment & Operations", desc: "Real-time fleet tracking, health status, and live telemetry grid." },
  { title: "Developer API & SDK", path: "/developers", category: "Environment & Operations", desc: "Serverless calculation endpoints and WSS telemetry streams for M2M integration." },
  { title: "RF Link Budget Analyzer", path: "/link", category: "Comms & Payloads", desc: "Live FSPL, SNR, and Shannon-Hartley downlink rate simulations." },
  { title: "Electrical Power (EPS)", path: "/eps", category: "Power & Thermal", desc: "Solar array cosine loss, battery DoD kinetics, and eclipse detection." },
  { title: "Thermal Control (TCS)", path: "/thermal", category: "Power & Thermal", desc: "Stefan-Boltzmann radiation physics and FLIR thermal-cam shaders." },
  { title: "Attitude Control (ADCS)", path: "/adcs", category: "Dynamics & Orbits", desc: "Quaternion kinematics, reaction wheel speeds, and slew rates." },
  { title: "Propulsion & Kinetics", path: "/propulsion", category: "Dynamics & Orbits", desc: "Blowdown thermodynamics and Tsiolkovsky delta-V budgeting." },
  { title: "Space Weather & Radiation", path: "/space-weather", category: "Environment & Operations", desc: "Volumetric SAA, Van Allen belts, and TID dosimetry accumulation." },
  { title: "Conjunction Assessment", path: "/conjunction", category: "Dynamics & Orbits", desc: "Orbital debris screening and collision probability (Pc) screening." },
  { title: "Ground Station AOS/LOS", path: "/passes", category: "Environment & Operations", desc: "Elevation cones, slant range, and access window scheduling." },
  { title: "Sensor Swath & GSD", path: "/swath", category: "Comms & Payloads", desc: "Multi-spectral sensor gimbal steering and Ground Sample Distance calculations." }
]

const CATEGORIES = ["All", "Architecture", "Dynamics & Orbits", "Comms & Payloads", "Power & Thermal", "Environment & Operations"]

export default function RootHomepage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  const filteredModules = MODULES.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || m.desc.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === "All" || m.category === activeCategory
    return matchesSearch && matchesCategory
  })

  useEffect(() => {
    const container = mountRef.current
    if (!container) return
    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 5)
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    const globeGroup = new THREE.Group()
    const sphereGeo = new THREE.SphereGeometry(2, 32, 32)
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.05 })
    globeGroup.add(new THREE.Mesh(sphereGeo, wireMat))
    scene.add(globeGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      globeGroup.rotation.y += 0.001
      globeGroup.rotation.x = Math.sin(Date.now() * 0.0005) * 0.05
      renderer.render(scene, camera)
    }
    animate()
    return () => { cancelAnimationFrame(animId); renderer.dispose() }
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-slate-950 font-sans text-slate-100 overflow-y-auto">
      {/* FIXED BACKGROUND */}
      <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />

      {/* SCROLLABLE CONTENT */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center">
        
        {/* Header Section with Complex Logo */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center justify-center w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl mb-8 relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
            <BrandLogo className="w-14 h-14 relative z-10 animate-spin-slow" />
          </div>

          <div className="px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-[10px] font-bold tracking-widest uppercase mb-6 flex items-center gap-2 shadow-lg shadow-cyan-500/10">
            <Sparkles className="w-3.5 h-3.5" /> Institutional Aerospace Mission Design Suite
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-widest uppercase mb-4 drop-shadow-2xl">
            Veroyx
          </h1>

          <div className="flex items-center gap-6 mb-8 font-mono text-[10px] tracking-wider text-slate-400 border border-slate-800 bg-slate-900/50 rounded-lg px-4 py-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" /> TLS 1.3</div>
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5 text-cyan-400"><Lock className="w-3.5 h-3.5" /> ZERO-TRUST</div>
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5 text-indigo-400"><Database className="w-3.5 h-3.5" /> KERNEL ACTIVE</div>
          </div>
          
          <p className="text-slate-400 max-w-2xl text-sm md:text-base leading-relaxed mb-8">
            The end-to-end space systems engineering platform. 14 institutional simulation engines spanning orbital mechanics, payloads, power, structures, space environment, and compliance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/mission-builder" className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2">
              <Rocket className="w-4 h-4" /> Launch Mission Builder
            </Link>
            <Link href="/visualizer" className="px-6 py-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold text-sm tracking-wider uppercase transition-all shadow-xl flex items-center gap-2">
              <Box className="w-4 h-4" /> 3D Visualizer
            </Link>
            <Link href="/developers" className="px-6 py-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-indigo-500 text-indigo-400 font-bold text-sm tracking-wider uppercase transition-all shadow-xl flex items-center gap-2">
              <Cpu className="w-4 h-4" /> API &amp; SDK
            </Link>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-4 mb-10 shadow-2xl">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by subsystem, equation, or keyword (e.g., 'DoD', 'link budget', 'GSD')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  activeCategory === cat 
                    ? "bg-cyan-950 text-cyan-400 border border-cyan-500/50" 
                    : "bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Grid */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((mod, idx) => (
            <Link 
              href={mod.path} 
              key={idx}
              className="group flex flex-col bg-slate-900/40 backdrop-blur border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(6,182,212,0.1)]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{mod.category}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-slate-400 group-hover:bg-cyan-950 group-hover:text-cyan-400 transition-colors">
                  ENGINE ACTIVE
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{mod.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">{mod.desc}</p>
              <div className="text-xs font-mono text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                {mod.path} &rarr;
              </div>
            </Link>
          ))}
          
          {filteredModules.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 font-mono">
              NO MODULES MATCHING CRITERIA
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
