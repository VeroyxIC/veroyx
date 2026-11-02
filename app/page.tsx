"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Sparkles, Globe, Orbit, Crosshair, ShieldCheck, Zap, 
  Eye, Radio, Activity, Layers, ArrowRight, Terminal, 
  Lock, Key, Database, Cpu, Compass, Flame, CheckCircle2, 
  ShieldAlert, Fingerprint, Unlock, ChevronDown 
} from "lucide-react"
import { 
  createKerrBlackHole, createHalleyCometSystem, 
  createHyperspaceTunnel, createMilitarySatellite, createDeepSpaceStarfield 
} from "@/components/three/CinematicSpaceEngine"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isWarping, setIsWarping] = useState<boolean>(false)

  // Verify persistent session
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Execute Star Wars Hyperspace Jump
  const handleInitiateHyperspace = () => {
    setIsWarping(true)
    setTimeout(() => {
      setIsWarping(false)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("veroyx_clearance_active", "true")
      }
    }, 1600)
  }

  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  // 3D Three.js Hyperspace Warp Jump + Kerr Black Hole Engine
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 18)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const pLight = new THREE.PointLight(0xffa200, 4.5, 70)
    pLight.position.set(0, 2, 8)
    scene.add(pLight)

    const starfield = createDeepSpaceStarfield(1400, 700)
    scene.add(starfield)

    // 1. Relativistic Kerr Black Hole
    const { group: bhGroup, disk, lensRing, diskMat, lensMat } = createKerrBlackHole(3.2)
    scene.add(bhGroup)

    // 2. Halley's Comet & Meteor Shower
    const { group: cometGroup, meteorGroup } = createHalleyCometSystem()
    cometGroup.position.set(-16, 8, -6)
    scene.add(cometGroup)
    scene.add(meteorGroup)

    // 3. Gold-Foil Reconnaissance Satellite
    const { group: satGroup, plume } = createMilitarySatellite({ scale: 0.44 })
    satGroup.position.set(6.8, -2.2, 5.0)
    satGroup.rotation.y = -Math.PI / 4
    scene.add(satGroup)

    // 4. Star Wars Hyperspace Warp Tunnel Lines
    const { warpLines, positions, velocities } = createHyperspaceTunnel(900)
    scene.add(warpLines)

    // Interactive Drag Rotation & Motion Zooming
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
      bhGroup.rotation.y += deltaX * 0.005
      bhGroup.rotation.x += deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(8.0, Math.min(36.0, camera.position.z + e.deltaY * 0.025))
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

      // Star Wars Lightspeed Warp Mode
      if (isWarping) {
        warpLines.material.opacity = Math.min(0.95, warpLines.material.opacity + delta * 2.5)
        camera.fov = Math.min(95.0, camera.fov + delta * 35.0)
        camera.updateProjectionMatrix()

        const pArr = warpLines.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < 900; i++) {
          pArr[i * 6 + 2] += velocities[i] * delta * 2.5
          pArr[i * 6 + 5] += velocities[i] * delta * 2.5

          if (pArr[i * 6 + 2] > 30) {
            pArr[i * 6 + 2] = -90
            pArr[i * 6 + 5] = -92
          }
        }
        warpLines.geometry.attributes.position.needsUpdate = true
      } else {
        warpLines.material.opacity = Math.max(0.0, warpLines.material.opacity - delta * 3.0)
        if (camera.fov > 45.0) {
          camera.fov = Math.max(45.0, camera.fov - delta * 40.0)
          camera.updateProjectionMatrix()
        }
      }

      // Normal Black Hole Accretion Disk Simulation
      diskMat.uniforms.uTime.value = elapsed
      lensMat.uniforms.uTime.value = elapsed

      disk.rotation.z += 0.25 * delta
      lensRing.rotation.z += 0.18 * delta

      // Halley's Comet
      cometGroup.position.x = -18 + ((elapsed * 1.6) % 36)
      cometGroup.position.y = 7.5 + Math.sin(elapsed * 0.4) * 1.5

      // Meteor Streaks
      meteorGroup.children.forEach((m, idx) => {
        m.position.x -= delta * (14 + idx * 2)
        m.position.y -= delta * (8 + idx)
        if (m.position.x < -30) {
          m.position.x = 25 + Math.random() * 10
          m.position.y = 10 + Math.random() * 15
        }
      })

      // Satellite stationkeeping hover
      satGroup.position.y = -2.2 + Math.sin(elapsed * 0.8) * 0.25
      satGroup.position.x = 6.8 + Math.cos(elapsed * 0.5) * 0.3
      satGroup.lookAt(0, 0, 0)

      plume.scale.setScalar(1.0 + Math.sin(elapsed * 14) * 0.25)
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
  }, [isWarping])

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* 3D CANVAS RUNNING PERSISTENTLY ACROSS BOTH STATES */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

      {/* STATE 1: MINIMALIST CLASSIFIED WARP GATE */}
      {!isAuthenticated ? (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 z-20 pointer-events-none select-none">
          <div className="text-center space-y-6 max-w-lg pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>DOD-DISA 18 U.S.C. § 1030 // QUANTUM ZERO-TRUST</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-[0.25em]">
                VEROYX
              </h1>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Level-5 Orbital Authentication Required
              </p>
            </div>

            <button
              onClick={handleInitiateHyperspace}
              disabled={isWarping}
              className={`px-8 py-4 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3 mx-auto ${
                isWarping 
                  ? "bg-cyan-400 text-black scale-105 shadow-[0_0_50px_rgba(6,182,212,0.8)]" 
                  : "bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:scale-105"
              }`}
            >
              <Zap className={`w-4 h-4 ${isWarping ? "animate-spin" : "text-cyan-200"}`} />
              <span>{isWarping ? "ENGAGING HYPERSPACE WARP JUMP..." : "INITIATE SECURE WARP HANDSHAKE"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: MASTER HOMEPAGE WITH BORDERLESS V LOGO & SATELLITE AT THE END */
        <div className="relative w-full min-h-screen z-10">
          <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/30 px-6 py-2 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">ACTIVE ENCLAVE // TOP SECRET SI-TK</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">109 PRODUCTION MODULES DEPLOYED</span>
            </div>
            <button onClick={handleLockTerminal} className="px-2.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          <section className="relative w-full min-h-[92vh] flex flex-col items-center justify-center pt-24 px-4 sm:px-6 select-none pointer-events-none">
            <div className="absolute top-24 right-6 z-10 font-mono text-[10px] text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl backdrop-blur-md hidden sm:block">
              DRAG: ROTATE BLACK HOLE | SCROLL: MOTION ZOOM (8x - 36x)
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto pointer-events-auto">
              
              {/* THE NEW BORDERLESS VEROYX WORDMARK WITH DOCKED ORBITING SATELLITE AT THE END */}
              <div className="relative flex items-center justify-center pt-8">
                
                {/* Radial Cyan Glow Bloom */}
                <div className="absolute -inset-8 bg-cyan-500/20 blur-3xl animate-breathe-glow pointer-events-none" />

                {/* Pure Typography & Trailing End-Satellite */}
                <div className="relative flex items-center">
                  <h1 className="text-6xl sm:text-8xl font-black tracking-[0.26em] text-white uppercase drop-shadow-[0_0_35px_rgba(6,182,212,0.45)] select-none">
                    VEROY
                    <span className="relative inline-block text-cyan-400">
                      X
                      {/* Miniature Orbiting Military Satellite Gliding Around 'X' */}
                      <span className="absolute -right-7 -top-4 w-10 h-10 flex items-center justify-center pointer-events-none">
                        <span className="relative flex items-center justify-center animate-pulse">
                          {/* Satellite Bus */}
                          <span className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,1.0)] flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                          </span>
                          {/* Blue GaAs Solar Array Wings */}
                          <span className="absolute -left-3 w-3 h-1 rounded bg-sky-600 border border-sky-400" />
                          <span className="absolute -right-3 w-3 h-1 rounded bg-sky-600 border border-sky-400" />
                          {/* Ion Exhaust Plume */}
                          <span className="absolute -bottom-2 w-1 h-2 rounded-full bg-cyan-400 blur-[1px] animate-pulse" />
                        </span>
                      </span>
                    </span>
                  </h1>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-mono text-cyan-300 tracking-widest uppercase">
                Space Domain Awareness & Allied JADC2 Battle Management
              </p>

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
              <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
                <Link href="/visualizer" className="px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-2 hover:scale-105">
                  <Globe className="w-4 h-4" />
                  <span>NASA EARTH THEATER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link href="/nexus" className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>COMMAND NEXUS</span>
                </Link>

                <Link href="/catalog" className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
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
