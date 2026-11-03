"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, ShieldCheck, Zap, ArrowRight, Terminal, 
  Lock, Database, Cpu, Unlock, ShieldAlert, Fingerprint, 
  ChevronRight, Radio, Activity
} from "lucide-react"
import { 
  createCinematicEarth, createDeepSpaceStarfield, 
  createHyperspaceTunnel 
} from "@/components/three/CinematicSpaceEngine"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isWarping, setIsWarping] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  const handleInitiateWarp = () => {
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

  // =========================================================================
  // 3D WEBGL ENGINE: SPACEX MARS-STYLE EARTH POSITIONED TO THE RIGHT
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#000000") // Pure SpaceX black

    // Perspective camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 2000)
    camera.position.set(0, 0, 18)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep-Space Starfield
    const starfield = createDeepSpaceStarfield(1400, 800)
    scene.add(starfield)

    // Cinematic Lighting: Directional Sun from the right/top to light the right crescent
    const sunLight = new THREE.DirectionalLight(0xfffaee, 4.2)
    sunLight.position.set(22, 14, 16)
    scene.add(sunLight)

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8)
    rimLight.position.set(-20, -10, -10)
    scene.add(rimLight)

    const ambientLight = new THREE.AmbientLight(0x060b18, 1.4)
    scene.add(ambientLight)

    // Cinematic Earth shifted to the RIGHT (x = 4.8), exactly like Mars on SpaceX
    const earthRadius = 5.2
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    
    // Position Earth on the right side of the screen
    const isMobile = width < 768
    earthGroup.position.set(isMobile ? 0 : 5.2, isMobile ? -2.0 : 0, 0)
    earthGroup.rotation.z = (23.4 * Math.PI) / 180.0 // True axial tilt
    scene.add(earthGroup)

    // Subtle, elegant orbital ring (Thin & restrained)
    const ringPts: THREE.Vector3[] = []
    const ringRadius = earthRadius * 1.38
    for (let i = 0; i <= 96; i++) {
      const theta = (i / 96) * Math.PI * 2
      ringPts.push(new THREE.Vector3(Math.cos(theta) * ringRadius, Math.sin(theta) * ringRadius * 0.45, Math.sin(theta) * ringRadius))
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts)
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      linewidth: 1
    })
    const orbitRing = new THREE.Line(ringGeo, ringMat)
    earthGroup.add(orbitRing)

    // Single subtle satellite node on the orbit ring
    const satNodeGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const satNodeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    const satNode = new THREE.Mesh(satNodeGeo, satNodeMat)
    earthGroup.add(satNode)

    // Star Wars Hyperspace Warp Lines
    const { warpLines, velocities } = createHyperspaceTunnel(1200)
    scene.add(warpLines)

    // Interactive Drag Controls with Smooth Inertia
    let isDragging = false
    let prevX = 0, prevY = 0
    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = (e.clientX - prevX) * 0.005
      const dy = (e.clientY - prevY) * 0.005
      earthGroup.rotation.y += dx
      earthGroup.rotation.x += dy
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(12, Math.min(30, camera.position.z + e.deltaY * 0.02))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let satAngle = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      // Star Wars Lightspeed Warp Jump State
      if (isWarping) {
        warpLines.material.opacity = Math.min(0.95, warpLines.material.opacity + delta * 3.0)
        camera.fov = Math.min(95.0, camera.fov + delta * 45.0)
        camera.updateProjectionMatrix()

        const pArr = warpLines.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < 1200; i++) {
          pArr[i * 6 + 2] += velocities[i] * delta * 2.8
          pArr[i * 6 + 5] += velocities[i] * delta * 2.8
          if (pArr[i * 6 + 2] > 30) {
            pArr[i * 6 + 2] = -80
            pArr[i * 6 + 5] = -83.5
          }
        }
        warpLines.geometry.attributes.position.needsUpdate = true
      } else {
        warpLines.material.opacity = Math.max(0.0, warpLines.material.opacity - delta * 3.0)
        if (camera.fov > 36.0) {
          camera.fov = Math.max(36.0, camera.fov - delta * 40.0)
          camera.updateProjectionMatrix()
        }
      }

      // Smooth Earth & Cloud Rotation
      earthMesh.rotation.y += 0.025 * delta
      cloudsMesh.rotation.y += 0.045 * delta

      // Move satellite along orbit
      satAngle += 0.25 * delta
      satNode.position.set(
        Math.cos(satAngle) * ringRadius,
        Math.sin(satAngle) * ringRadius * 0.45,
        Math.sin(satAngle) * ringRadius
      )

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)

      const mobile = w < 768
      earthGroup.position.set(mobile ? 0 : 5.2, mobile ? -2.0 : 0, 0)
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
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* 3D WebGL Earth Viewport (Earth on the Right Side) */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

      {/* STATE 1: ZERO-TRUST WARP GATEWAY (Preserved Star Wars Entrance) */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20 select-none">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#030712]/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_70px_rgba(6,182,212,0.25)] space-y-6 font-mono text-xs pointer-events-auto">
            
            <div className="text-center space-y-2 border-b border-white/10 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                AUTHORIZED DEFENSE ENCLAVE. SGP4 ORBIT PROPAGATION &amp; JADC2 TELEMETRY INITIALIZED.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>CLEARANCE: TOP SECRET SI-TK</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">AUTH PIN: 8942-0129</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-cyan-300">
                <span className="font-bold">[ ZERO-KNOWLEDGE CRYPTOGRAPHIC TOKEN VERIFIED ]</span>
              </div>
            </div>

            <button
              onClick={handleInitiateWarp}
              disabled={isWarping}
              className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
            >
              {isWarping ? <Zap className="w-4 h-4 animate-spin text-cyan-200" /> : <Unlock className="w-4 h-4" />}
              <span>{isWarping ? "ENGAGING HYPERSPACE WARP JUMP..." : "ENTER OPERATIONAL PROPAGATOR"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: SPACEX-STYLE EDITORIAL HERO VIEW (Clean Left Typography + Earth on the Right) */
        <div className="relative w-full min-h-screen z-10 pointer-events-none select-none flex flex-col justify-between">
          
          {/* Top Session Security Banner */}
          <div className="fixed top-14 left-0 right-0 z-40 bg-black/85 backdrop-blur-md border-b border-white/10 px-8 py-2.5 flex items-center justify-between font-mono text-[11px] pointer-events-auto">
            <div className="flex items-center gap-3 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white tracking-wider">VEROYX // ORBITAL ARCHITECTURE</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">CLEARANCE: TS-SCI</span>
            </div>
            <button onClick={handleLockTerminal} className="px-3 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1.5 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          {/* MAIN EDITORIAL COLUMN (Left 50%, completely unobstructed, exactly like SpaceX) */}
          <div className="relative w-full max-w-7xl mx-auto px-8 pt-36 pb-20 flex-1 flex flex-col justify-center pointer-events-none">
            <div className="w-full max-w-xl space-y-6 pointer-events-auto">
              
              {/* Clearance Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-[10px] font-mono tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>ALLIED JADC2 &amp; SPACE DOMAIN DEFENSE</span>
              </div>

              {/* Bold SpaceX-Style Editorial Headline */}
              <div className="space-y-1">
                <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tight text-white leading-[1.05]">
                  SECURING<br />
                  THE HIGH<br />
                  GROUND
                </h1>
              </div>

              {/* Minimalist Sub-Copy */}
              <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed max-w-lg">
                Veroyx provides institutional-grade orbital mechanics, autonomous kinetic intercept modeling, and multi-domain space domain awareness for allied defense operations.
              </p>

              {/* Clean SpaceX Outline CTA Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href="/visualizer"
                  className="px-8 py-3.5 rounded-none border border-white text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-3 hover:scale-105"
                >
                  <span>EXPLORE PLATFORM</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/hypersonic"
                  className="px-6 py-3.5 rounded-none border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-all"
                >
                  <span>AERO-ORBITAL CFD</span>
                </Link>

                <Link
                  href="/planetary-defense"
                  className="px-6 py-3.5 rounded-none border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-rose-400 hover:text-rose-300 transition-all"
                >
                  <span>KINETIC INTERCEPT</span>
                </Link>
              </div>

              {/* Subdued Telemetry Ticker (Bottom-Left) */}
              <div className="pt-8 border-t border-white/10 flex flex-wrap items-center gap-6 font-mono text-[10px] text-slate-500">
                <div>
                  <span className="text-slate-400 block font-bold">RSO TRACKED</span>
                  <span className="text-white text-sm font-bold">48,219</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">PROPAGATION</span>
                  <span className="text-cyan-400 text-sm font-bold">SGP4 / J2</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">OISL MESH</span>
                  <span className="text-emerald-400 text-sm font-bold">100 Gbps</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">CLEARANCE</span>
                  <span className="text-amber-400 text-sm font-bold">TS-SCI</span>
                </div>
              </div>

            </div>
          </div>

          {/* Simple Bottom SpaceX-Style Footer Bar */}
          <div className="relative w-full px-8 py-4 border-t border-white/10 bg-black/60 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 z-20 pointer-events-auto">
            <div className="flex items-center gap-4">
              <span className="text-white font-bold tracking-wider">VEROYX AEROSPACE © 2026</span>
              <span className="text-slate-700">|</span>
              <span>MIL-STD-188 COMPLIANT</span>
              <span className="text-slate-700">|</span>
              <span>FIPS 140-3 HSM ZERO-TRUST</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/c2" className="hover:text-white transition-all">C2 BATTLE GLASS</Link>
              <Link href="/nexus" className="hover:text-white transition-all">COMMAND NEXUS</Link>
              <Link href="/catalog" className="hover:text-white transition-all">48K SATELLITE CATALOG</Link>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
