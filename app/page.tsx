"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import { ArrowRight, Sparkles } from "lucide-react"

export default function SpaceXMasterHomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)
  const [isCollapsing, setIsCollapsing] = useState<boolean>(false)
  const [collapseProgress, setCollapseProgress] = useState<number>(0)
  const vortexCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_auth_v") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  const triggerSingularitySuction = () => {
    setIsCollapsing(true)
    setCollapseProgress(0)
    const startTime = Date.now()
    const duration = 4000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const p = Math.min(1.0, elapsed / duration)
      setCollapseProgress(p)

      if (p >= 1.0) {
        clearInterval(interval)
        setIsCollapsing(false)
        setIsAuthenticated(true)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("veroyx_auth_v", "true")
        }
      }
    }, 16)
  }

  // Steady Accretion Flow & Relativistic Lensing on Homepage Canvas
  useEffect(() => {
    const canvas = heroCanvasRef.current
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

      const cx = w * 0.54
      const cy = h * 0.49

      // Relativistic Lensing Arcs
      for (let i = 0; i < 3; i++) {
        const wave = (time * 0.4 + i * (Math.PI / 1.5)) % (Math.PI * 2)
        const radius = 160 + Math.sin(wave) * 24 + i * 40
        const alpha = Math.max(0, 0.22 - (radius / 420) * 0.16)

        ctx.save()
        ctx.beginPath()
        ctx.ellipse(cx, cy, radius * 1.35, radius * 0.72, -0.06, 0, Math.PI * 2)
        ctx.strokeStyle = i % 2 === 0 ? `rgba(251, 191, 36, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.8})`
        ctx.lineWidth = 1.6
        ctx.setLineDash([14, 20])
        ctx.lineDashOffset = -time * 26
        ctx.stroke()
        ctx.restore()
      }

      // Singularity Ambient Core Glow
      const pulse = Math.sin(time * 2.4) * 0.5 + 0.5
      const radialGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140)
      radialGlow.addColorStop(0, `rgba(255, 255, 255, ${0.16 + pulse * 0.08})`)
      radialGlow.addColorStop(0.35, `rgba(245, 158, 11, ${0.18 + pulse * 0.08})`)
      radialGlow.addColorStop(0.75, `rgba(234, 88, 12, ${0.05 + pulse * 0.03})`)
      radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.fillStyle = radialGlow
      ctx.beginPath()
      ctx.arc(cx, cy, 140, 0, Math.PI * 2)
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
  }, [isAuthenticated])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-sans selection:bg-white/20 overflow-x-hidden flex flex-col justify-between">
      
      {/* 4-SECOND BLACK HOLE SUCTION OVERLAY */}
      {isCollapsing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <canvas ref={vortexCanvasRef} className="absolute inset-0 w-full h-full" />
          <div className="relative z-10 text-center font-mono space-y-3 pointer-events-none">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>SINGULARITY GRAVITATIONAL CAPTURE // T-MINUS {(4 - collapseProgress * 4).toFixed(1)}s</span>
            </div>
            <p className="text-xs text-white tracking-widest uppercase font-bold">CROSSING KERR EVENT HORIZON...</p>
          </div>
        </div>
      )}

      {/* Clean Single-Tier Navbar (No Double Stack) */}
      <Navbar onTriggerSuction={triggerSingularitySuction} />

      {/* Main Split Layout */}
      <main className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-28 lg:pt-36 pb-12 flex-1 flex flex-col lg:flex-row items-center justify-between">
        
        {/* Left Column: SpaceX Editorial Typography */}
        <section className="w-full lg:w-[42%] space-y-7 z-20">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-white/[0.03] border border-white/10 text-slate-300 text-[10px] font-mono tracking-[0.25em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>ALLIED JADC2 &amp; SPACE DEFENSE</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-[0.92]">
            SECURING<br />
            THE HIGH<br />
            GROUND
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 font-sans leading-relaxed max-w-md">
            Veroyx deploys institutional-grade orbital mechanics, relativistic gravitational tracking, and multi-domain JADC2 command systems for allied space superiority.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/c2"
              className="px-7 py-3.5 border border-white text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2.5"
            >
              <span>EXPLORE PLATFORM</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/planetary-defense"
              className="px-5 py-3.5 border border-white/20 text-neutral-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-all"
            >
              <span>KINETIC INTERCEPT</span>
            </Link>

            <Link
              href="/hypersonic"
              className="px-5 py-3.5 border border-white/20 text-neutral-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-all"
            >
              <span>AERO-ORBITAL CFD</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[10px] text-neutral-500">
            <div>
              <span className="text-neutral-400 block font-bold">RSO TRACKED</span>
              <span className="text-white text-sm font-bold">48,219</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-bold">PROPAGATION</span>
              <span className="text-white text-sm font-bold">SGP4 / J2</span>
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

        {/* Right Column: MUCH BIGGER BLACK HOLE HERO WITH ZERO RECTANGLE CUTOFF */}
        <section className="relative w-full lg:w-[58%] h-[65vh] lg:h-[88vh] flex items-center justify-center mt-4 lg:mt-0 select-none pointer-events-none">
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-visible"
            style={{
              maskImage: "radial-gradient(ellipse 72% 72% at 55% 50%, black 45%, transparent 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 72% 72% at 55% 50%, black 45%, transparent 85%)"
            }}
          >
            {/* Massive Scaled Black Hole with screen blend mode (Guarantees zero hard rectangle edge) */}
            <img
              src="/assets/hero/blackhole-v.jpg"
              alt="Relativistic Kerr Black Hole with V Singularity"
              className="w-full h-full object-contain scale-135 lg:scale-150 xl:scale-160 filter contrast-[1.12] brightness-[1.04]"
              style={{ mixBlendMode: "screen" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (!target.src.includes("VBH")) {
                  target.src = "/VBH.jpg"
                }
              }}
            />

            {/* Accretion Lensing Particles Canvas */}
            <canvas
              ref={heroCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>
        </section>

      </main>

      {/* SpaceX Minimalist Footer */}
      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/[0.08] bg-black/90 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] font-mono text-neutral-500 z-20">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider">VEROYX AEROSPACE © 2026</span>
          <span className="text-neutral-800">|</span>
          <span>ITAR RESTRICTED</span>
          <span className="text-neutral-800">|</span>
          <span>FIPS 140-3 ZERO-TRUST</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/c2" className="hover:text-white transition-colors">C2 BATTLE GLASS</Link>
          <Link href="/planetary-defense" className="hover:text-white transition-colors">PLANETARY DEFENSE</Link>
          <Link href="/catalog" className="hover:text-white transition-colors">48K SATELLITE CATALOG</Link>
        </div>
      </footer>
    </div>
  )
}
