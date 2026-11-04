"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import { 
  ArrowRight, ShieldAlert, Fingerprint, Zap, Unlock, Lock,
  ChevronRight, Radio, Activity, Orbit, Sparkles
} from "lucide-react"

export default function SpaceXMasterHomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
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

  // 4-SECOND RELATIVISTIC BLACK HOLE SUCTION EXPERIENCE
  const triggerSingularitySuction = () => {
    setIsCollapsing(true)
    setCollapseProgress(0)

    const startTime = Date.now()
    const duration = 4000 // Exact 4.0 seconds

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

  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_auth_v")
    }
  }

  // 4-Second Suction Canvas Vortex Rendering
  useEffect(() => {
    if (!isCollapsing) return
    const canvas = vortexCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    const w = (canvas.width = window.innerWidth)
    const h = (canvas.height = window.innerHeight)
    const cx = w * 0.5
    const cy = h * 0.5

    // 250 inward-falling star rays
    const rays = Array.from({ length: 250 }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * Math.max(w, h) * 0.85,
      speed: 1.5 + Math.random() * 3.5,
      size: 0.8 + Math.random() * 2.5,
      color: Math.random() > 0.4 ? "#f59e0b" : "#ffffff"
    }))

    const render = () => {
      animId = requestAnimationFrame(render)
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)"
      ctx.fillRect(0, 0, w, h)

      const p = collapseProgress // 0.0 to 1.0

      // Inward pull acceleration
      const speedMultiplier = 1.0 + Math.pow(p, 3.2) * 28.0

      rays.forEach((ray) => {
        ray.dist -= ray.speed * speedMultiplier
        ray.angle += 0.015 * (1.0 + p * 8.0) // Frame dragging rotation

        if (ray.dist < 8) {
          ray.dist = Math.max(w, h) * 0.75
        }

        const x = cx + Math.cos(ray.angle) * ray.dist
        const y = cy + Math.sin(ray.angle) * ray.dist

        ctx.fillStyle = ray.color
        ctx.beginPath()
        ctx.arc(x, y, ray.size * (1.0 + p * 2.0), 0, Math.PI * 2)
        ctx.fill()

        // Filament trails toward singularity
        ctx.strokeStyle = ray.color === "#f59e0b" ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.2)"
        ctx.lineWidth = 1.0
        ctx.beginPath()
        ctx.moveTo(x, y)
        const trailX = cx + Math.cos(ray.angle - 0.15) * (ray.dist + 18)
        const trailY = cy + Math.sin(ray.angle - 0.15) * (ray.dist + 18)
        ctx.lineTo(trailX, trailY)
        ctx.stroke()
      })

      // Central Event Horizon Pulse & Shockwave
      const coreRadius = Math.max(20, 160 * (1.0 - p) + (p > 0.75 ? Math.sin((p - 0.75) * Math.PI * 4) * 80 : 0))
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, coreRadius)
      grad.addColorStop(0, "#ffffff")
      grad.addColorStop(0.35, "#f59e0b")
      grad.addColorStop(0.7, "#ea580c")
      grad.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2)
      ctx.fill()

      // Final blinding flash emergence at p > 0.8
      if (p > 0.8) {
        const flashAlpha = Math.sin(((p - 0.8) / 0.2) * Math.PI)
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.9})`
        ctx.fillRect(0, 0, w, h)
      }
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [isCollapsing, collapseProgress])

  // Steady Accretion Flow on Homepage Canvas
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
        const radius = 135 + Math.sin(wave) * 18 + i * 32
        const alpha = Math.max(0, 0.22 - (radius / 340) * 0.16)

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
      const radialGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120)
      radialGlow.addColorStop(0, `rgba(255, 255, 255, ${0.16 + pulse * 0.08})`)
      radialGlow.addColorStop(0.35, `rgba(245, 158, 11, ${0.18 + pulse * 0.08})`)
      radialGlow.addColorStop(0.75, `rgba(234, 88, 12, ${0.05 + pulse * 0.03})`)
      radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.fillStyle = radialGlow
      ctx.beginPath()
      ctx.arc(cx, cy, 120, 0, Math.PI * 2)
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
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-sans selection:bg-amber-500/30 overflow-x-hidden flex flex-col justify-between">
      
      {/* AMBIENT WARM COSMIC GLOW (Left side illumination) */}
      <div className="absolute top-1/4 -left-48 w-[640px] h-[640px] rounded-full bg-gradient-to-r from-amber-600/12 via-orange-600/6 to-transparent blur-[140px] pointer-events-none z-0" />

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

      {/* Clean SpaceX Top Navbar */}
      <Navbar onTriggerSuction={triggerSingularitySuction} />

      {/* STATE 1: ZERO-TRUST WARP GATEWAY (If not authenticated) */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-24 px-4 pb-12 z-20 select-none">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#080808]/95 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(245,158,11,0.2)] space-y-6 font-mono text-xs pointer-events-auto">
            
            <div className="text-center space-y-2 border-b border-white/10 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>RESTRICTED ACCESS // ALLIED SPACE COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                TOP SECRET ENCLAVE. RELATIVISTIC KERR ASTRODYNAMICS &amp; JADC2 PROPAGATION INITIALIZED.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-neutral-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-amber-400" />
                  <span>CLEARANCE: TOP SECRET SI-TK</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">ENCLAVE VERIFIED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-amber-300 font-bold">
                [ FIPS 140-3 HSM CRYPTOGRAPHIC TOKEN VALIDATED ]
              </div>
            </div>

            <button
              onClick={triggerSingularitySuction}
              className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white transition-all shadow-[0_0_35px_rgba(245,158,11,0.45)] flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-200" />
              <span>ENGAGE 4-SECOND SINGULARITY DIVE</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: SPACEX EDITORIAL HERO (44%+ Viewport Scale, Clean Monochrome & Amber) */
        <div className="relative w-full min-h-screen flex flex-col justify-between z-10 select-none">
          
          {/* Top Session Security Banner (Pure Monochrome & Warm Amber) */}
          <div className="fixed top-14 left-0 right-0 z-30 bg-black/85 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 py-2 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-3 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-white tracking-wider">VEROYX // RELATIVISTIC SPACE DOMAIN AWARENESS</span>
              <span className="text-neutral-700">|</span>
              <span className="text-neutral-400">CLEARANCE: TS-SCI</span>
            </div>
            <button 
              onClick={handleLockTerminal} 
              className="px-3 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-white/20 text-neutral-300 font-bold transition-all flex items-center gap-1.5 text-[10px]"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          {/* MAIN HERO SPLIT: EXACT SPACEX 44%+ VIEWPORT COMPOSITION */}
          <main className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-36 lg:pt-40 pb-16 flex-1 flex flex-col lg:flex-row items-center justify-between">
            
            {/* LEFT 46%: SPACEX EDITORIAL TYPOGRAPHY */}
            <section className="w-full lg:w-[46%] space-y-7 z-20">
              
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-none border border-white/10 bg-white/[0.03] text-amber-300 text-[10px] font-mono tracking-[0.25em] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>ALLIED JADC2 &amp; SPACE DEFENSE</span>
              </div>

              {/* Heavyweight Headline */}
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-[0.94]">
                SECURING<br />
                THE HIGH<br />
                GROUND
              </h1>

              {/* Minimalist Sub-Copy */}
              <p className="text-sm sm:text-base text-neutral-400 font-sans leading-relaxed max-w-lg">
                Veroyx deploys institutional-grade orbital mechanics, relativistic gravitational tracking, and multi-domain JADC2 command systems for allied space superiority.
              </p>

              {/* SpaceX Outline CTA Buttons */}
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

              {/* Operational Telemetry Ticker (Zero Blue) */}
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
                  <span className="text-amber-400 text-sm font-bold">100 Gbps</span>
                </div>
              </div>

            </section>

            {/* RIGHT 54%: DOMINANT BLACK HOLE THEATER (SCALED UP TO FILL 44%+ OF PAGE) */}
            <section className="relative w-full lg:w-[54%] h-[60vh] lg:h-[84vh] flex items-center justify-center mt-6 lg:mt-0 select-none pointer-events-none">
              
              {/* Outer Radial Vignette Fade */}
              <div className="relative w-full h-full flex items-center justify-center [mask-image:radial-gradient(circle_at_center,black_68%,transparent_98%)]">
                
                {/* Scaled-up Black Hole Asset (Clean, Unobstructed, Dominant) */}
                <img
                  src="/assets/hero/blackhole-v.jpg"
                  alt="Relativistic Kerr Black Hole with V Singularity"
                  className="w-full h-full object-contain scale-110 lg:scale-125 xl:scale-130 filter contrast-[1.08] brightness-[1.02]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (!target.src.includes("VBH")) {
                      target.src = "/VBH.jpg"
                    }
                  }}
                />

                {/* TARGETED SPACESHIP GLOW & XENON PULSE (Lower-Left Satellite) */}
                <div className="absolute bottom-[16%] left-[18%] -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent blur-2xl animate-pulse duration-[3000ms] pointer-events-none" />
                <div className="absolute bottom-[22%] left-[24%] w-3 h-3 rounded-full bg-amber-300 blur-sm animate-ping duration-[2500ms] pointer-events-none" />

                {/* Relativistic Accretion Lensing Wave Canvas */}
                <canvas
                  ref={heroCanvasRef}
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
      )}

    </div>
  )
}
