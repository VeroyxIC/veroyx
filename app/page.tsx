"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import * as THREE from "three"
import { ShieldCheck, Rocket, Crosshair, Briefcase, Lock, Database } from "lucide-react"
import BrandLogo from "@/app/components/BrandLogo"

export default function RootGateway() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [bootSequence, setBootSequence] = useState(0)

  // Simulated Boot Sequence
  useEffect(() => {
    const timer1 = setTimeout(() => setBootSequence(1), 300)
    const timer2 = setTimeout(() => setBootSequence(2), 800)
    const timer3 = setTimeout(() => setBootSequence(3), 1200)
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3) }
  }, [])

  // Minimal Wireframe Globe Background
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
    
    const ringGeo = new THREE.RingGeometry(2.2, 2.21, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.1 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    globeGroup.add(ring)

    scene.add(globeGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      globeGroup.rotation.y += 0.001
      globeGroup.rotation.x = Math.sin(Date.now() * 0.0005) * 0.05
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

  const DIRECTORY = [
    {
      title: "Flight Dynamics & Physics",
      icon: <Rocket className="w-5 h-5 text-cyan-400" />,
      color: "border-cyan-500/30 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]",
      links: [
        { label: "Ascent & Trajectory", path: "/trajectory" },
        { label: "Attitude Control (ADCS)", path: "/adcs" },
        { label: "Propulsion & Kinetics", path: "/propulsion" },
        { label: "Power Systems (EPS)", path: "/eps" },
        { label: "Thermal Balance (TCS)", path: "/thermal" },
        { label: "Space Weather & Radiation", path: "/space-weather" },
      ]
    },
    {
      title: "Space Domain Awareness",
      icon: <Crosshair className="w-5 h-5 text-fuchsia-400" />,
      color: "border-fuchsia-500/30 hover:border-fuchsia-500 hover:shadow-[0_0_15px_rgba(217,70,239,0.2)]",
      links: [
        { label: "3D Orbital Visualizer", path: "/visualizer" },
        { label: "2D Mercator Ground Track", path: "/ground-track" },
        { label: "Conjunction Assessment", path: "/conjunction" },
        { label: "Sensor Swath & GSD", path: "/swath" },
        { label: "Ground Station AOS/LOS", path: "/passes" },
        { label: "RF Link Budget", path: "/link" },
      ]
    },
    {
      title: "Enterprise Command & Control",
      icon: <Briefcase className="w-5 h-5 text-emerald-400" />,
      color: "border-emerald-500/30 hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      links: [
        { label: "Constellation Watchlist", path: "/watchlist" },
        { label: "Telemetry & Analytics", path: "/telemetry" },
        { label: "Contracts & SLA Compliance", path: "/contracts" },
        { label: "Architecture & Cost Builder", path: "/mission-builder" },
        { label: "M2M Developer API", path: "/developers" },
      ]
    }
  ]

  return (
    <div className="relative w-full min-h-screen bg-slate-950 font-sans text-slate-100 overflow-y-auto flex items-center justify-center py-12">
      
      {/* Background WebGL (Fixed so it doesn't scroll away) */}
      <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />

      {/* Main Terminal Overlay */}
      <div className="relative z-10 w-full max-w-6xl p-6 md:p-8 flex flex-col items-center">
        
        {/* Branding & Auth Header */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center justify-center w-20 h-20 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent" />
            <BrandLogo className="w-12 h-12 relative z-10" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase mb-4">
            Veroyx
          </h1>
          
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 font-mono text-[10px] md:text-xs">
            <div className={`flex items-center gap-2 transition-opacity duration-500 ${bootSequence >= 1 ? "opacity-100 text-emerald-400" : "opacity-0"}`}>
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> TLS 1.3 SECURED
            </div>
            <div className={`flex items-center gap-2 transition-opacity duration-500 ${bootSequence >= 2 ? "opacity-100 text-cyan-400" : "opacity-0"}`}>
              <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" /> ZERO-TRUST ENFORCED
            </div>
            <div className={`flex items-center gap-2 transition-opacity duration-500 ${bootSequence >= 3 ? "opacity-100 text-indigo-400" : "opacity-0"}`}>
              <Database className="w-3.5 h-3.5 md:w-4 md:h-4" /> KERNEL ONLINE
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className={`w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 transition-all duration-1000 transform ${bootSequence >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {DIRECTORY.map((section, idx) => (
            <div key={idx} className={`bg-slate-900/70 backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 ${section.color}`}>
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                {section.icon}
                <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-widest">{section.title}</h2>
              </div>
              
              <div className="flex flex-col gap-1 md:gap-2 font-mono text-[11px] md:text-xs">
                {section.links.map((link, linkIdx) => (
                  <Link 
                    key={linkIdx} 
                    href={link.path}
                    className="flex items-center justify-between p-2.5 rounded hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors group"
                  >
                    <span>{link.label}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity">/</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`mt-12 font-mono text-[9px] md:text-[10px] text-slate-600 uppercase tracking-widest transition-opacity duration-1000 delay-500 text-center ${bootSequence >= 3 ? "opacity-100" : "opacity-0"}`}>
          Veroyx Flight Dynamics Facility &copy; 2026-2027 | Authorized Personnel Only
        </div>

      </div>
    </div>
  )
}
