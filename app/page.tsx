"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function SpaceXMasterHomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Fluid Relativistic Spacetime Warping & Photon Ring Breathing (Smooth 60 FPS, No Jitter)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let time = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      time += 0.015

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // Center coordinates corresponding to the V singularity / photon ring core
      const cx = w * 0.54
      const cy = h * 0.49

      // 1. Concentric Relativistic Spacetime Distortion Waves (Gravitational Lensing)
      for (let i = 0; i < 4; i++) {
        const wavePhase = (time * 0.4 + i * (Math.PI / 2)) % (Math.PI * 2)
        const radius = 125 + Math.sin(wavePhase) * 22 + i * 28
        const alpha = Math.max(0, 0.22 - (radius / 300) * 0.18)

        ctx.save()
        ctx.beginPath()
        // Elliptical Kerr accretion tilt
        ctx.ellipse(cx, cy, radius * 1.35, radius * 0.75, -0.08, 0, Math.PI * 2)
        ctx.strokeStyle = i % 2 === 0 ? "rgba(251, 191, 36, " + alpha + ")" : "rgba(255, 255, 255, " + (alpha * 0.7) + ")"
        ctx.lineWidth = 1.8
        ctx.setLineDash([12, 18])
        ctx.lineDashOffset = -time * 24
        ctx.stroke()
        ctx.restore()
      }

      // 2. Continuous Curved Geodesic Light Filaments (Light bending along the outer boundary)
      for (let j = 0; j < 3; j++) {
        const arcPhase = time * 0.35 + j * 2.1
        const rArc = 175 + j * 32
        
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(cx, cy, rArc * 1.4, rArc * 0.68, -0.12, arcPhase, arcPhase + Math.PI * 0.8)
        const grad = ctx.createLinearGradient(cx - rArc, cy, cx + rArc, cy)
        grad.addColorStop(0, "rgba(255, 255, 255, 0)")
        grad.addColorStop(0.5, "rgba(245, 158, 11, 0.45)")
        grad.addColorStop(1, "rgba(234, 88, 12, 0)")
        ctx.strokeStyle = grad
        ctx.lineWidth = 2.4
        ctx.stroke()
        ctx.restore()
      }

      // 3. Glowing "V" Singularity Breathing Energy (Heat shimmer)
      const pulse = Math.sin(time * 2.2) * 0.5 + 0.5
      const radialGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110)
      radialGlow.addColorStop(0, "rgba(255, 255, 255, " + (0.15 + pulse * 0.08) + ")")
      radialGlow.addColorStop(0.35, "rgba(245, 158, 11, " + (0.18 + pulse * 0.08) + ")")
      radialGlow.addColorStop(0.7, "rgba(234, 88, 12, " + (0.06 + pulse * 0.04) + ")")
      radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.fillStyle = radialGlow
      ctx.beginPath()
      ctx.arc(cx, cy, 110, 0, Math.PI * 2)
      ctx.fill()
    }

    const resize = () => {
      if (!canvas || !canvas.parentElement) return
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
    }
    resize()
    window.addEventListener("resize", resize)
    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-sans selection:bg-amber-500/30 overflow-x-hidden flex flex-col justify-between">
      
      {/* MAIN HERO SPLIT: EXACT SPACEX EDITORIAL ALIGNMENT */}
      <main className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-36 lg:pt-44 pb-16 flex-1 flex flex-col lg:flex-row items-center justify-between">
        
        {/* LEFT 45%: SPACEX EDITORIAL TYPOGRAPHY */}
        <section className="w-full lg:w-[45%] space-y-7 z-20">
          
          {/* Subtle Sector Eyebrow */}
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-none border border-white/10 bg-white/[0.03] text-amber-300 text-[10px] font-mono tracking-[0.25em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>ALLIED JADC2 &amp; SPACE DEFENSE</span>
          </div>

          {/* Heavyweight Editorial Headline (SpaceX Standard) */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-[0.94]">
            SECURING<br />
            THE HIGH<br />
            GROUND
          </h1>

          {/* Minimalist Sub-Copy */}
          <p className="text-sm sm:text-base text-neutral-400 font-sans leading-relaxed max-w-lg">
            Veroyx deploys institutional-grade orbital mechanics, relativistic gravitational tracking, and multi-domain JADC2 command systems for allied space superiority.
          </p>

          {/* SpaceX Outline CTA Button */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/c2"
              className="px-8 py-3.5 border border-white text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-3 hover:scale-105"
            >
              <span>EXPLORE PLATFORM</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/planetary-defense"
              className="px-6 py-3.5 border border-white/20 text-neutral-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-amber-400 hover:text-amber-300 transition-all"
            >
              <span>KINETIC INTERCEPT</span>
            </Link>

            <Link
              href="/hypersonic"
              className="px-6 py-3.5 border border-white/20 text-neutral-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-white/60 hover:text-white transition-all"
            >
              <span>AERO-ORBITAL CFD</span>
            </Link>
          </div>

          {/* Operational Telemetry Ticker */}
          <div className="pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-[10px] text-neutral-500">
            <div>
              <span className="text-neutral-400 block font-bold">RSO TRACKED</span>
              <span className="text-white text-sm font-bold">48,219</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-bold">PROPAGATION</span>
              <span className="text-amber-400 text-sm font-bold">SGP4 / J2</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-bold">KERR SPIN (a*)</span>
              <span className="text-white text-sm font-bold">0.998</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-bold">OISL CROSSLINK</span>
              <span className="text-emerald-400 text-sm font-bold">100 Gbps</span>
            </div>
          </div>

        </section>

        {/* RIGHT 55%: ROCK-SOLID, LIVING BLACK HOLE "V" THEATER (ZERO JITTER) */}
        <section className="relative w-full lg:w-[55%] h-[55vh] lg:h-[75vh] flex items-center justify-center mt-8 lg:mt-0 select-none pointer-events-none">
          
          {/* Seamless Radial Mask into Pure #000000 Black */}
          <div className="relative w-full h-full flex items-center justify-center [mask-image:radial-gradient(circle_at_center,black_65%,transparent_98%)]">
            
            {/* High-Fidelity Black Hole V Asset (Anchored, No Jitter) */}
            <img
              src="/assets/hero/blackhole-v.jpg"
              alt="Relativistic Kerr Black Hole with V Singularity"
              className="w-full h-full object-contain filter contrast-[1.06] brightness-[1.01]"
              onError={(e) => {
                // If not found in /assets/hero, check root public fallback
                const target = e.target as HTMLImageElement
                if (!target.src.includes("VBH")) {
                  target.src = "/VBH.jpg"
                }
              }}
            />

            {/* In-Depth Spacetime Gravitational Lensing Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

          </div>

        </section>

      </main>

      {/* Minimalist SpaceX Footer */}
      <footer className="relative w-full px-6 sm:px-12 py-5 border-t border-white/10 bg-black/80 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] font-mono text-neutral-500 z-20">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider">VEROYX AEROSPACE © 2026</span>
          <span className="text-neutral-800">|</span>
          <span>ITAR RESTRICTED</span>
          <span className="text-neutral-800">|</span>
          <span>FIPS 140-3 ZERO-TRUST</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/c2" className="hover:text-white transition-colors">C2 BATTLE GLASS</Link>
          <Link href="/catalog" className="hover:text-white transition-colors">48K SATELLITE CATALOG</Link>
          <Link href="/visualizer" className="hover:text-white transition-colors">ORBIT VISUALIZER</Link>
        </div>
      </footer>

    </div>
  )
}
