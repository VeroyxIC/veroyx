"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Orbit, ShieldCheck, Zap, ArrowRight, Terminal, 
  Lock, Database, Cpu, Unlock, ShieldAlert, Fingerprint, 
  ChevronRight, Radio, Activity, Compass, Eye, Satellite, Layers, BarChart3
} from "lucide-react"
import { 
  createMilitarySatellite, createDeepSpaceStarfield, 
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
  // 3D WEBGL ENGINE: KERR BLACK HOLE, GLOWING "V" SINGULARITY & AST-01 SATELLITE
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#000000") // Pure void black

    // Perspective camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 2000)
    camera.position.set(0, 0, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      powerPreference: "high-performance" 
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep-Space Background Starfield
    const starfield = createDeepSpaceStarfield(1600, 800)
    scene.add(starfield)

    // Scene Lighting: Incandescent amber and cyan plasma lighting
    const amberLight = new THREE.DirectionalLight(0xf59e0b, 3.5)
    amberLight.position.set(15, 10, 12)
    scene.add(amberLight)

    const blueLight = new THREE.DirectionalLight(0x38bdf8, 2.0)
    blueLight.position.set(-18, -12, 10)
    scene.add(blueLight)

    const ambientLight = new THREE.AmbientLight(0x050814, 1.6)
    scene.add(ambientLight)

    // =========================================================================
    // 1. KERR BLACK HOLE ASSEMBLY (Center-Right composition)
    // =========================================================================
    const blackHoleGroup = new THREE.Group()
    const isMobile = width < 768
    blackHoleGroup.position.set(isMobile ? 0 : 3.8, isMobile ? -1.5 : 0.2, 0)
    scene.add(blackHoleGroup)

    // Event Horizon Sphere (Pure absorbing blackness)
    const horizonRadius = 3.6
    const horizonGeo = new THREE.SphereGeometry(horizonRadius, 64, 64)
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat)
    horizonMesh.renderOrder = 2
    blackHoleGroup.add(horizonMesh)

    // Luminous Photon Sphere Ring (Lensed boundary)
    const photonRingGeo = new THREE.RingGeometry(horizonRadius * 1.01, horizonRadius * 1.055, 96)
    const photonRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    const photonRing = new THREE.Mesh(photonRingGeo, photonRingMat)
    photonRing.renderOrder = 3
    blackHoleGroup.add(photonRing)

    // =========================================================================
    // 2. THE GLOWING "V" SINGULARITY EMBLEM (Video Climax 00:01 - 00:03)
    // =========================================================================
    const vShape = new THREE.Shape()
    // Sharp modern chevron "V" geometry
    vShape.moveTo(-1.25, 1.45)
    vShape.lineTo(-0.65, 1.45)
    vShape.lineTo(0.0, -0.15)
    vShape.lineTo(0.65, 1.45)
    vShape.lineTo(1.25, 1.45)
    vShape.lineTo(0.28, -1.25)
    vShape.lineTo(-0.28, -1.25)
    vShape.closePath()

    const vGeo = new THREE.ShapeGeometry(vShape)
    const vMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending
    })
    const vMesh = new THREE.Mesh(vGeo, vMat)
    vMesh.position.set(0, 0, horizonRadius * 0.98)
    vMesh.scale.set(1.4, 1.4, 1.4)
    vMesh.renderOrder = 4
    blackHoleGroup.add(vMesh)

    // Inner White-Hot Core for the "V"
    const vCoreShape = new THREE.Shape()
    vCoreShape.moveTo(-1.18, 1.40)
    vCoreShape.lineTo(-0.75, 1.40)
    vCoreShape.lineTo(0.0, 0.05)
    vCoreShape.lineTo(0.75, 1.40)
    vCoreShape.lineTo(1.18, 1.40)
    vCoreShape.lineTo(0.20, -1.15)
    vCoreShape.lineTo(-0.20, -1.15)
    vCoreShape.closePath()

    const vCoreGeo = new THREE.ShapeGeometry(vCoreShape)
    const vCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    })
    const vCoreMesh = new THREE.Mesh(vCoreGeo, vCoreMat)
    vCoreMesh.position.set(0, 0, horizonRadius * 0.99)
    vCoreMesh.scale.set(1.36, 1.36, 1.36)
    vCoreMesh.renderOrder = 5
    blackHoleGroup.add(vCoreMesh)

    // Dedicated Point Light from Singularity
    const vLight = new THREE.PointLight(0xff7700, 4.5, 14)
    vLight.position.set(0, 0, horizonRadius * 1.1)
    blackHoleGroup.add(vLight)

    // =========================================================================
    // 3. RELATIVISTIC ACCRETION DISK (Dual-Plane Gravitational Lensing)
    // =========================================================================
    const diskVertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `

    const diskFragmentShader = `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec2 pos = vUv - 0.5;
        float dist = length(pos) * 2.0;
        float angle = atan(pos.y, pos.x);

        if (dist < 0.35 || dist > 0.98) {
          discard;
        }

        // Swirling spiral turbulence
        float spiral = angle * 4.0 - dist * 14.0 + uTime * 2.5;
        float noise = sin(spiral) * 0.5 + 0.5;
        float noise2 = sin(spiral * 2.4 - uTime * 3.8) * 0.5 + 0.5;
        float combinedNoise = mix(noise, noise2, 0.45);

        // Relativistic Doppler beaming: approaching left side is boosted & blueshifted
        float doppler = 1.0 + 0.52 * cos(angle - 0.35);

        // Temperature gradient: White-hot ISCO -> Amber Body -> Deep Crimson Edge
        float tNorm = (dist - 0.35) / (0.98 - 0.35);
        vec3 col;
        if (tNorm < 0.16) {
          col = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.88, 0.45), tNorm / 0.16);
        } else if (tNorm < 0.58) {
          col = mix(vec3(1.0, 0.75, 0.25), vec3(0.95, 0.35, 0.05), (tNorm - 0.16) / 0.42);
        } else {
          col = mix(vec3(0.95, 0.35, 0.05), vec3(0.35, 0.06, 0.02), (tNorm - 0.58) / 0.40);
        }

        col *= (0.75 + 0.55 * combinedNoise) * doppler;
        float alpha = smoothstep(0.35, 0.42, dist) * smoothstep(0.98, 0.78, dist) * 0.92;

        gl_FragColor = vec4(col, alpha);
      }
    `

    const diskUniforms = { uTime: { value: 0 } }
    const diskMat = new THREE.ShaderMaterial({
      vertexShader: diskVertexShader,
      fragmentShader: diskFragmentShader,
      uniforms: diskUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    // 1. Equatorial Primary Disk
    const eqDiskGeo = new THREE.RingGeometry(horizonRadius * 1.08, horizonRadius * 3.2, 80, 80)
    const eqDisk = new THREE.Mesh(eqDiskGeo, diskMat)
    eqDisk.rotation.x = (68 * Math.PI) / 180.0
    eqDisk.rotation.y = (18 * Math.PI) / 180.0
    blackHoleGroup.add(eqDisk)

    // 2. Gravitational Lensed Halo (Einstein Upper/Lower Arcs)
    const lensDiskGeo = new THREE.RingGeometry(horizonRadius * 1.04, horizonRadius * 2.85, 80, 80)
    const lensDisk = new THREE.Mesh(lensDiskGeo, diskMat)
    lensDisk.rotation.y = (12 * Math.PI) / 180.0
    blackHoleGroup.add(lensDisk)

    // =========================================================================
    // 4. RECONNAISSANCE SATELLITE (AST-01) ON LEFT FLANK
    // =========================================================================
    const satGroupWrapper = new THREE.Group()
    satGroupWrapper.position.set(isMobile ? 0 : -8.5, isMobile ? 3.5 : 2.8, 2.5)
    satGroupWrapper.rotation.y = Math.PI / 4.2
    satGroupWrapper.rotation.z = (14 * Math.PI) / 180.0

    const { group: satGroup } = createMilitarySatellite({ scale: 1.15 })
    satGroupWrapper.add(satGroup)
    scene.add(satGroupWrapper)

    // =========================================================================
    // 5. TIDAL DISRUPTION DEBRIS PARTICLES (Stream trailing into black hole)
    // =========================================================================
    const debrisCount = 420
    const debrisGeo = new THREE.BufferGeometry()
    const debrisPositions = new Float32Array(debrisCount * 3)
    const debrisColors = new Float32Array(debrisCount * 3)
    const debrisSeeds: { x0: number; y0: number; z0: number; tOffset: number; speed: number }[] = []

    for (let i = 0; i < debrisCount; i++) {
      const tOff = Math.random()
      const x0 = -8.5 + (Math.random() - 0.5) * 1.5
      const y0 = 2.8 + (Math.random() - 0.5) * 1.2
      const z0 = 2.5 + (Math.random() - 0.5) * 1.5

      debrisPositions[i * 3 + 0] = x0
      debrisPositions[i * 3 + 1] = y0
      debrisPositions[i * 3 + 2] = z0

      // Orange/amber incandescent dust colors
      const isHot = Math.random() > 0.65
      debrisColors[i * 3 + 0] = 1.0
      debrisColors[i * 3 + 1] = isHot ? 0.85 : 0.45
      debrisColors[i * 3 + 2] = isHot ? 0.4 : 0.08

      debrisSeeds.push({
        x0, y0, z0,
        tOffset: tOff,
        speed: 0.12 + Math.random() * 0.18
      })
    }

    debrisGeo.setAttribute("position", new THREE.BufferAttribute(debrisPositions, 3))
    debrisGeo.setAttribute("color", new THREE.BufferAttribute(debrisColors, 3))

    const debrisMesh = new THREE.Points(
      debrisGeo,
      new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending
      })
    )
    scene.add(debrisMesh)

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
      blackHoleGroup.rotation.y += dx
      blackHoleGroup.rotation.x += dy
      satGroupWrapper.rotation.y += dx * 0.7
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(14, Math.min(36, camera.position.z + e.deltaY * 0.02))
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
      const t = clock.getElapsedTime()

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
        if (camera.fov > 38.0) {
          camera.fov = Math.max(38.0, camera.fov - delta * 40.0)
          camera.updateProjectionMatrix()
        }
      }

      // Update Accretion Disk Shader Time
      diskUniforms.uTime.value = t

      // Subtle pulse and specular glow on the "V" emblem
      vMesh.scale.setScalar(1.4 + Math.sin(t * 2.2) * 0.04)
      vCoreMesh.scale.setScalar(1.36 + Math.sin(t * 2.2) * 0.04)
      vLight.intensity = 4.2 + Math.sin(t * 3.5) * 0.8

      // Slow satellite attitude drift
      satGroup.rotation.y += 0.008

      // Animate Tidal Debris Particles into the Black Hole
      const pArr = debrisGeo.attributes.position.array as Float32Array
      for (let i = 0; i < debrisCount; i++) {
        const seed = debrisSeeds[i]
        const prog = ((t * seed.speed) + seed.tOffset) % 1.0

        // Spiral path from satellite origin to black hole accretion disk
        const targetX = blackHoleGroup.position.x
        const targetY = blackHoleGroup.position.y
        const targetZ = blackHoleGroup.position.z

        const curX = THREE.MathUtils.lerp(seed.x0, targetX + Math.cos(prog * 12.0) * 4.5, prog)
        const curY = THREE.MathUtils.lerp(seed.y0, targetY + Math.sin(prog * 12.0) * 1.5, prog)
        const curZ = THREE.MathUtils.lerp(seed.z0, targetZ + Math.sin(prog * 12.0) * 4.5, prog)

        pArr[i * 3 + 0] = curX
        pArr[i * 3 + 1] = curY
        pArr[i * 3 + 2] = curZ
      }
      debrisGeo.attributes.position.needsUpdate = true

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
      blackHoleGroup.position.set(mobile ? 0 : 3.8, mobile ? -1.5 : 0.2, 0)
      satGroupWrapper.position.set(mobile ? 0 : -8.5, mobile ? 3.5 : 2.8, 2.5)
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
      
      {/* 3D WebGL Canvas (Kerr Black Hole + V Singularity + Satellite Debris) */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

      {/* STATE 1: ZERO-TRUST WARP GATEWAY (Preserved Star Wars Entrance) */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20 select-none">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#030712]/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_70px_rgba(245,158,11,0.25)] space-y-6 font-mono text-xs pointer-events-auto">
            
            <div className="text-center space-y-2 border-b border-white/10 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                AUTHORIZED DEFENSE ENCLAVE. SGP4 ORBIT PROPAGATION &amp; RELATIVISTIC ASTRODYNAMICS INITIALIZED.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-amber-400" />
                  <span>CLEARANCE: TOP SECRET SI-TK</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">AUTH PIN: 8942-0129</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-amber-300">
                <span className="font-bold">[ ZERO-KNOWLEDGE CRYPTOGRAPHIC TOKEN VERIFIED ]</span>
              </div>
            </div>

            <button
              onClick={handleInitiateWarp}
              disabled={isWarping}
              className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
            >
              {isWarping ? <Zap className="w-4 h-4 animate-spin text-amber-200" /> : <Unlock className="w-4 h-4" />}
              <span>{isWarping ? "ENGAGING HYPERSPACE WARP JUMP..." : "ENTER OPERATIONAL PROPAGATOR"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: THE HOLLYWOOD BLACK HOLE V CLIMAX THEATER */
        <div className="relative w-full min-h-screen z-10 pointer-events-none select-none flex flex-col justify-between">
          
          {/* Top Session Security Banner */}
          <div className="fixed top-14 left-0 right-0 z-40 bg-black/85 backdrop-blur-md border-b border-white/10 px-8 py-2.5 flex items-center justify-between font-mono text-[11px] pointer-events-auto">
            <div className="flex items-center gap-3 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-white tracking-wider">VEROYX // RELATIVISTIC ASTRODYNAMICS &amp; SDA</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">CLEARANCE: TS-SCI</span>
            </div>
            <button onClick={handleLockTerminal} className="px-3 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1.5 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          {/* MAIN EDITORIAL COLUMN (Left 50%, completely unobstructed, SpaceX standard) */}
          <div className="relative w-full max-w-7xl mx-auto px-8 pt-36 pb-20 flex-1 flex flex-col justify-center pointer-events-none">
            <div className="w-full max-w-xl space-y-6 pointer-events-auto">
              
              {/* Clearance Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-300 text-[10px] font-mono tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>RELATIVISTIC SPACE DOMAIN DOMINANCE</span>
              </div>

              {/* Bold Editorial Headline */}
              <div className="space-y-1">
                <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tight text-white leading-[1.05]">
                  SINGULARITY<br />
                  SPACE DOMAIN<br />
                  AWARENESS
                </h1>
              </div>

              {/* Minimalist Sub-Copy */}
              <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed max-w-lg">
                Veroyx unifies relativistic gravitational tracking, autonomous kinetic intercept modeling, and next-generation JADC2 battle systems for allied defense dominance.
              </p>

              {/* SpaceX Outline CTA Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href="/c2"
                  className="px-8 py-3.5 rounded-none border border-white text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-3 hover:scale-105"
                >
                  <span>EXPLORE PLATFORM</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/hypersonic"
                  className="px-6 py-3.5 rounded-none border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-amber-400 hover:text-amber-300 transition-all"
                >
                  <span>AERO-ORBITAL CFD</span>
                </Link>

                <Link
                  href="/planetary-defense"
                  className="px-6 py-3.5 rounded-none border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-rose-400 hover:text-rose-300 transition-all"
                >
                  <span>KINETIC INTERCEPT</span>
                </Link>

                <Link
                  href="/mission-builder"
                  className="px-6 py-3.5 rounded-none border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-cyan-400 hover:text-cyan-300 transition-all"
                >
                  <span>CAD BUILDER</span>
                </Link>
              </div>

              {/* Gravitational Physics Telemetry Readouts (Bottom-Left) */}
              <div className="pt-8 border-t border-white/10 flex flex-wrap items-center gap-6 font-mono text-[10px] text-slate-500">
                <div>
                  <span className="text-slate-400 block font-bold">KERR SPIN (a*)</span>
                  <span className="text-amber-400 text-sm font-bold">0.998</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">SCHWARZSCHILD (Rs)</span>
                  <span className="text-white text-sm font-bold">2.95 km/M☉</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">TIDAL MARGIN</span>
                  <span className="text-emerald-400 text-sm font-bold">NOMINAL</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">OISL CROSSLINK</span>
                  <span className="text-cyan-400 text-sm font-bold">100 Gbps</span>
                </div>
              </div>

            </div>
          </div>

          {/* Simple Bottom SpaceX-Style Footer Bar */}
          <div className="relative w-full px-8 py-4 border-t border-white/10 bg-black/70 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 z-20 pointer-events-auto">
            <div className="flex items-center gap-4">
              <span className="text-white font-bold tracking-wider">VEROYX AEROSPACE © 2026</span>
              <span className="text-slate-700">|</span>
              <span>MIL-STD-188 COMPLIANT</span>
              <span className="text-slate-700">|</span>
              <span>FIPS 140-3 HSM ZERO-TRUST</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/c2" className="hover:text-white transition-all">C2 BATTLE GLASS</Link>
              <Link href="/visualizer" className="hover:text-white transition-all">ORBIT VISUALIZER</Link>
              <Link href="/catalog" className="hover:text-white transition-all">48K SATELLITE CATALOG</Link>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
