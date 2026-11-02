"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, ShieldCheck, Zap, ArrowRight, Terminal, 
  Lock, Database, Cpu, ShieldAlert, Fingerprint, Unlock, ChevronDown 
} from "lucide-react"
import { 
  createKerrBlackHole, createMilitarySatellite, createDeepSpaceStarfield 
} from "@/components/three/CinematicSpaceEngine"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  const handleAuthorize = () => {
    setIsAuthenticated(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("veroyx_clearance_active", "true")
    }
  }

  const handleLock = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  // 3D Three.js Gargantua Black Hole & Interactive Motion Zooming Engine
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010208")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 0, 22)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep Space Starfield
    const starfield = createDeepSpaceStarfield(2400, 700)
    scene.add(starfield)

    // Relativistic Kerr Black Hole
    const { group: bhGroup, disk, lensRing } = createKerrBlackHole(2.4)
    scene.add(bhGroup)

    // Military Reconnaissance Spacecraft in Lower-Right Foreground
    const { group: satGroup, plume } = createMilitarySatellite({ scale: 0.38 })
    satGroup.position.set(6.2, -2.4, 4.5)
    satGroup.rotation.y = -Math.PI / 3.5
    scene.add(satGroup)

    // Mouse Drag Rotation & Scroll-Wheel Motion Zooming
    let isDragging = false
    let prevMouseX = 0
    let prevMouseY = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - prevMouseX
      const deltaY = e.clientY - prevMouseY
      prevMouseX = e.clientX
      prevMouseY = e.clientY
      bhGroup.rotation.y += deltaX * 0.004
      bhGroup.rotation.x += deltaY * 0.004
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(10.0, Math.min(34.0, camera.position.z + e.deltaY * 0.022))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      // Accretion disk rotation
      disk.rotation.z += 0.12 * delta
      lensRing.rotation.z += 0.08 * delta

      // Satellite stationkeeping hover
      satGroup.position.y = -2.4 + Math.sin(elapsed * 0.7) * 0.15
      satGroup.position.x = 6.2 + Math.cos(elapsed * 0.5) * 0.2
      satGroup.lookAt(0, 0, 0)

      plume.scale.setScalar(1.0 + Math.sin(elapsed * 12) * 0.2)
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
      container.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      container.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-[#010208] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

      {/* STATE 1: CLASSIFIED MINIMALIST ACCESS GATE */}
      {!isAuthenticated ? (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 z-20 pointer-events-none select-none">
          <div className="text-center space-y-6 max-w-lg pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>DOD-DISA 18 U.S.C. § 1030 // QUANTUM ENCLAVE</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-[0.25em]">
                VEROYX
              </h1>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Classified Defense Intelligence System
              </p>
            </div>

            <button
              onClick={handleAuthorize}
              className="px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:scale-105 shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2.5 mx-auto"
            >
              <Unlock className="w-4 h-4 text-cyan-200" />
              <span>ENTER OPERATIONAL COMMAND</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: CLEAN MASTER HOMEPAGE */
        <div className="relative w-full min-h-screen z-10">
          
          {/* Top Session Security Banner */}
          <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/30 px-6 py-2 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">ACTIVE ENCLAVE // TOP SECRET SI-TK</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">109 PRODUCTION MODULES DEPLOYED</span>
            </div>
            <button onClick={handleLock} className="px-2.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          <section className="relative w-full min-h-[92vh] flex flex-col items-center justify-center pt-24 px-4 sm:px-6 select-none pointer-events-none">
            
            {/* Camera Tip */}
            <div className="absolute top-24 right-6 z-10 font-mono text-[10px] text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl backdrop-blur-md hidden sm:block">
              DRAG: ROTATE SPACE | SCROLL: MOTION ZOOM
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-5 max-w-3xl mx-auto pointer-events-auto">
              
              {/* CLEAN BORDERLESS VEROYX WORDMARK */}
              <div className="space-y-1">
                <h1 className="text-6xl sm:text-8xl font-black tracking-[0.24em] text-white uppercase select-none drop-shadow-[0_0_35px_rgba(6,182,212,0.35)]">
                  VE<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">RO</span>YX
                </h1>
                <p className="text-xs sm:text-sm font-mono text-cyan-300 tracking-widest uppercase">
                  Space Domain Awareness &amp; Allied JADC2 Battle Management
                </p>
              </div>

              {/* CLEAN STATUS BADGES */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-[10px] text-slate-300 pt-1">
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  [ 9.8.1 // SECURED ]
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  [ ZERO-TRUST ENFORCED ]
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  [ KERNEL: ONLINE ]
                </span>
              </div>

              {/* ACTION NAVIGATION BUTTONS */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/visualizer" className="px-7 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-2 hover:scale-105">
                  <Globe className="w-4 h-4" />
                  <span>NASA EARTH THEATER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link href="/nexus" className="px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>COMMAND NEXUS</span>
                </Link>

                <Link href="/catalog" className="px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>48K ORBITAL CATALOG</span>
                </Link>
              </div>

            </div>
          </section>
        </div>
      )}
    </div>
  )
}
