"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, ShieldCheck, Zap, ArrowRight, Terminal, 
  Lock, Database, Cpu, Unlock, ShieldAlert, Fingerprint, 
  Crosshair, Activity, Radio, BarChart3, ChevronRight, Sliders,
  Compass, Eye, Satellite, Target
} from "lucide-react"
import { 
  createCinematicEarth, createMilitarySatellite, 
  createDeepSpaceStarfield, createHyperspaceTunnel 
} from "@/components/three/CinematicSpaceEngine"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sdaCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const interceptCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const satMiniMountRef = useRef<HTMLDivElement | null>(null)
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isWarping, setIsWarping] = useState<boolean>(false)

  // Real-time Ephemeris Clock
  const [simSeconds, setSimSeconds] = useState<number>(13150)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Execute Star Wars Hyperspace Jump
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
  // 1. 3D WEBGL FILM STUDIO SCENE: HOLLYWOOD EARTH + 3D METALLIC VEROYX LOGO
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#02040a")

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 2000)
    camera.position.set(0, 3.2, 22.5)
    camera.lookAt(0, 0.2, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep-Space Starfield
    const starfield = createDeepSpaceStarfield(1800, 800)
    scene.add(starfield)

    // Film Studio Directional Lighting
    const sunLight = new THREE.DirectionalLight(0xfffaee, 4.5)
    sunLight.position.set(-24, 15, 18)
    scene.add(sunLight)

    const cyanRimLight = new THREE.DirectionalLight(0x00f0ff, 2.5)
    cyanRimLight.position.set(20, -12, -8)
    scene.add(cyanRimLight)

    const ambientLight = new THREE.AmbientLight(0x0a1128, 1.8)
    scene.add(ambientLight)

    // Photorealistic Earth with Top Radiant Sun Flare & Amber Night Lights
    const earthRadius = 5.8
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    earthGroup.position.set(0, -1.8, 0)
    scene.add(earthGroup)

    // =========================================================================
    // 3D CHISELED METALLIC "VEROYX" LOGO OVER PLANET (Video 1 00:08 - 00:09)
    // =========================================================================
    const logoGroup = new THREE.Group()

    const createLetterMesh = (shape: THREE.Shape) => {
      const extrudeSettings = {
        depth: 0.28,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.06
      }
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.16,
        emissive: 0x0284c7,
        emissiveIntensity: 0.15
      })
      return new THREE.Mesh(geo, mat)
    }

    // Letter V
    const vShape = new THREE.Shape()
    vShape.moveTo(-0.65, 0.9); vShape.lineTo(-0.22, 0.9); vShape.lineTo(0.0, -0.3); vShape.lineTo(0.22, 0.9); vShape.lineTo(0.65, 0.9); vShape.lineTo(0.18, -0.9); vShape.lineTo(-0.18, -0.9); vShape.closePath()
    const letterV = createLetterMesh(vShape)
    letterV.position.set(-4.2, 0, 0)
    logoGroup.add(letterV)

    // Letter E
    const eShape = new THREE.Shape()
    eShape.moveTo(-0.55, -0.9); eShape.lineTo(0.55, -0.9); eShape.lineTo(0.55, -0.55); eShape.lineTo(-0.18, -0.55); eShape.lineTo(-0.18, -0.15); eShape.lineTo(0.45, -0.15); eShape.lineTo(0.45, 0.18); eShape.lineTo(-0.18, 0.18); eShape.lineTo(-0.18, 0.55); eShape.lineTo(0.55, 0.55); eShape.lineTo(0.55, 0.9); eShape.lineTo(-0.55, 0.9); eShape.closePath()
    const letterE = createLetterMesh(eShape)
    letterE.position.set(-2.5, 0, 0)
    logoGroup.add(letterE)

    // Letter R
    const rShape = new THREE.Shape()
    rShape.moveTo(-0.55, -0.9); rShape.lineTo(-0.18, -0.9); rShape.lineTo(-0.18, -0.15); rShape.lineTo(0.2, -0.9); rShape.lineTo(0.6, -0.9); rShape.lineTo(0.22, -0.1); rShape.lineTo(0.55, 0.25); rShape.lineTo(0.55, 0.7); rShape.lineTo(0.25, 0.9); rShape.lineTo(-0.55, 0.9); rShape.closePath()
    const rHole = new THREE.Path()
    rHole.moveTo(-0.18, 0.25); rHole.lineTo(0.18, 0.25); rHole.lineTo(0.22, 0.5); rHole.lineTo(0.18, 0.65); rHole.lineTo(-0.18, 0.65); rHole.closePath()
    rShape.holes.push(rHole)
    const letterR = createLetterMesh(rShape)
    letterR.position.set(-0.8, 0, 0)
    logoGroup.add(letterR)

    // Letter O
    const oShape = new THREE.Shape()
    oShape.moveTo(-0.55, -0.65); oShape.lineTo(0.55, -0.65); oShape.lineTo(0.65, -0.45); oShape.lineTo(0.65, 0.45); oShape.lineTo(0.55, 0.65); oShape.lineTo(-0.55, 0.65); oShape.lineTo(-0.65, 0.45); oShape.lineTo(-0.65, -0.45); oShape.closePath()
    const oHole = new THREE.Path()
    oHole.moveTo(-0.25, -0.35); oHole.lineTo(0.25, -0.35); oHole.lineTo(0.3, -0.18); oHole.lineTo(0.3, 0.18); oHole.lineTo(0.25, 0.35); oHole.lineTo(-0.25, 0.35); oHole.lineTo(-0.3, 0.18); oHole.lineTo(-0.3, -0.18); oHole.closePath()
    oShape.holes.push(oHole)
    const letterO = createLetterMesh(oShape)
    letterO.position.set(0.9, 0, 0)
    logoGroup.add(letterO)

    // Letter Y
    const yShape = new THREE.Shape()
    yShape.moveTo(-0.55, 0.9); yShape.lineTo(-0.18, 0.9); yShape.lineTo(0.0, 0.2); yShape.lineTo(0.18, 0.9); yShape.lineTo(0.55, 0.9); yShape.lineTo(0.18, 0.0); yShape.lineTo(0.18, -0.9); yShape.lineTo(-0.18, -0.9); yShape.lineTo(-0.18, 0.0); yShape.closePath()
    const letterY = createLetterMesh(yShape)
    letterY.position.set(2.6, 0, 0)
    logoGroup.add(letterY)

    // Letter X
    const xShape = new THREE.Shape()
    xShape.moveTo(-0.6, 0.9); xShape.lineTo(-0.25, 0.9); xShape.lineTo(0.0, 0.35); xShape.lineTo(0.25, 0.9); xShape.lineTo(0.6, 0.9); xShape.lineTo(0.2, 0.0); xShape.lineTo(0.6, -0.9); xShape.lineTo(0.25, -0.9); xShape.lineTo(0.0, -0.35); xShape.lineTo(-0.25, -0.9); xShape.lineTo(-0.6, -0.9); xShape.lineTo(-0.2, 0.0); xShape.closePath()
    const letterX = createLetterMesh(xShape)
    letterX.position.set(4.3, 0, 0)
    logoGroup.add(letterX)

    logoGroup.position.set(0, 1.6, 5.2)
    logoGroup.scale.set(0.85, 0.85, 0.85)
    scene.add(logoGroup)

    // Glowing Anamorphic Cyan Flare Bar across wordmark
    const flareGeo = new THREE.PlaneGeometry(11.5, 0.08)
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    })
    const flare = new THREE.Mesh(flareGeo, flareMat)
    flare.position.set(0, 1.6, 5.35)
    scene.add(flare)

    // Multi-Inclination Constellation Rings & Satellites (Video 1 00:00 - 00:02)
    const ringConfigs = [
      { r: earthRadius * 1.34, inc: 51.6, color: 0x10b981 },
      { r: earthRadius * 1.46, inc: 97.4, color: 0x06b6d4 },
      { r: earthRadius * 1.60, inc: 28.5, color: 0x3b82f6 },
      { r: earthRadius * 1.72, inc: -45.0, color: 0x10b981 }
    ]

    const orbitRingsGroup = new THREE.Group()
    const satelliteNodes: { mesh: THREE.Mesh; r: number; inc: number; speed: number; angle: number }[] = []

    ringConfigs.forEach((cfg, idx) => {
      const pts: THREE.Vector3[] = []
      const segs = 96
      const incRad = (cfg.inc * Math.PI) / 180.0

      for (let i = 0; i <= segs; i++) {
        const theta = (i / segs) * Math.PI * 2
        const x = cfg.r * Math.cos(theta)
        const y = cfg.r * Math.sin(theta) * Math.sin(incRad)
        const z = cfg.r * Math.sin(theta) * Math.cos(incRad)
        pts.push(new THREE.Vector3(x, y, z))
      }

      const ringGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const ringMat = new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.75, linewidth: 1.8 })
      orbitRingsGroup.add(new THREE.Line(ringGeo, ringMat))

      for (let s = 0; s < 2; s++) {
        const nodeGeo = new THREE.SphereGeometry(0.18, 16, 16)
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat)
        orbitRingsGroup.add(nodeMesh)
        satelliteNodes.push({
          mesh: nodeMesh,
          r: cfg.r,
          inc: cfg.inc,
          speed: 0.32 + idx * 0.06,
          angle: (s * Math.PI) + idx * 0.6
        })
      }
    })
    orbitRingsGroup.position.copy(earthGroup.position)
    scene.add(orbitRingsGroup)

    // Dynamic Inter-Satellite Laser Links (OISL)
    const laserMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85, linewidth: 2.0 })
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
    const laserLines = new THREE.LineSegments(laserGeo, laserMat)
    scene.add(laserLines)

    // Star Wars Hyperspace Warp Lines
    const { warpLines, velocities } = createHyperspaceTunnel(1200)
    scene.add(warpLines)

    // Interactive Drag Controls with Subtle Title Parallax
    let isDragging = false
    let prevX = 0, prevY = 0
    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = (e.clientX - prevX) * 0.005
      const dy = (e.clientY - prevY) * 0.005
      earthGroup.rotation.y += dx
      earthGroup.rotation.x += dy
      logoGroup.position.x += dx * 0.3
      logoGroup.position.y -= dy * 0.3
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(12, Math.min(36, camera.position.z + e.deltaY * 0.02))
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

      // Smooth Earth & Cloud Rotation
      earthMesh.rotation.y += 0.035 * delta
      cloudsMesh.rotation.y += 0.055 * delta

      // Subtle metallic title specular breath
      flare.material.opacity = 0.55 + Math.sin(t * 3.0) * 0.25

      // Orbit satellites and update laser crosslinks
      const currentPositions: THREE.Vector3[] = []
      satelliteNodes.forEach(sat => {
        sat.angle += sat.speed * delta
        const incRad = (sat.inc * Math.PI) / 180.0
        const x = sat.r * Math.cos(sat.angle)
        const y = sat.r * Math.sin(sat.angle) * Math.sin(incRad) + earthGroup.position.y
        const z = sat.r * Math.sin(sat.angle) * Math.cos(incRad)
        sat.mesh.position.set(x, y, z)
        currentPositions.push(new THREE.Vector3(x, y, z))
      })

      if (currentPositions.length >= 4) {
        const laserPts = [
          currentPositions[0], currentPositions[2],
          currentPositions[1], currentPositions[3],
          currentPositions[2], currentPositions[5],
          currentPositions[4], currentPositions[6]
        ]
        laserLines.geometry.setFromPoints(laserPts)
        laserLines.geometry.attributes.position.needsUpdate = true
      }

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

  // =========================================================================
  // 2. CARD 1: SPACE DOMAIN AWARENESS RADAR CANVAS (Video 1 00:09 Left Card)
  // =========================================================================
  useEffect(() => {
    const canvas = sdaCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let angle = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      angle += 0.02
      const w = canvas.width, h = canvas.height
      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = "#38bdf8"
      ctx.beginPath(); ctx.arc(w * 0.42, h * 0.5, 7, 0, Math.PI * 2); ctx.fill()

      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)"
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(w * 0.42, h * 0.5, w * 0.36, h * 0.38, -0.2, 0, Math.PI * 2)
      ctx.stroke()

      const mx = w * 0.42 + Math.cos(angle) * (w * 0.36)
      const my = h * 0.5 + Math.sin(angle) * (h * 0.38)
      ctx.fillStyle = "#f8fafc"
      ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill()

      ctx.strokeStyle = "#10b981"
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(w * 0.42, h * 0.5); ctx.lineTo(mx, my); ctx.stroke()
    }
    render()

    return () => cancelAnimationFrame(animId)
  }, [])

  // =========================================================================
  // 3. CARD 2: KINETIC INTERCEPT TRAJECTORY CANVAS (Video 1 00:09 Center Card)
  // =========================================================================
  useEffect(() => {
    const canvas = interceptCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let pulse = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      pulse += 0.04
      const w = canvas.width, h = canvas.height
      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(w * 0.5, h * 0.85, w * 0.42, -Math.PI * 0.85, -Math.PI * 0.15)
      ctx.stroke()

      ctx.strokeStyle = "#ef4444"
      ctx.lineWidth = 2.0
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.55, w * 0.32, h * 0.32, 0.4, -Math.PI * 0.9, -Math.PI * 0.05)
      ctx.stroke()

      const ix = w * 0.55, iy = h * 0.32
      const radius = 4 + Math.sin(pulse) * 2
      ctx.fillStyle = "#ef4444"
      ctx.beginPath(); ctx.arc(ix, iy, radius, 0, Math.PI * 2); ctx.fill()

      ctx.strokeStyle = "rgba(239, 68, 68, 0.4)"
      ctx.beginPath(); ctx.arc(ix, iy, radius * 2.2, 0, Math.PI * 2); ctx.stroke()
    }
    render()

    return () => cancelAnimationFrame(animId)
  }, [])

  // =========================================================================
  // 4. CARD 3: SATELLITE ASSET MINI 3D VIEWPORT (Video 1 00:09 Right Card)
  // =========================================================================
  useEffect(() => {
    const container = satMiniMountRef.current
    if (!container) return

    const w = container.clientWidth, h = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100)
    camera.position.set(3.5, 2.0, 4.5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    const light = new THREE.DirectionalLight(0xffffff, 3.2)
    light.position.set(5, 5, 5)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.4))

    const { group: satGroup } = createMilitarySatellite({ scale: 0.75 })
    scene.add(satGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      satGroup.rotation.y += 0.015
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
    }
  }, [])

  // =========================================================================
  // 5. RIGHT HUD PANEL POLAR RADAR CANVAS (Video 1 00:01)
  // =========================================================================
  useEffect(() => {
    const canvas = radarCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let sweepAngle = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      sweepAngle += 0.03
      const w = canvas.width, h = canvas.height
      const cx = w / 2, cy = h / 2
      const rMax = Math.min(cx, cy) - 8

      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = "rgba(56, 189, 248, 0.22)"
      ctx.lineWidth = 1
      for (let r = rMax * 0.33; r <= rMax; r += rMax * 0.33) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.strokeStyle = "rgba(148, 163, 184, 0.3)"
      ctx.beginPath()
      ctx.moveTo(cx, 4); ctx.lineTo(cx, h - 4)
      ctx.moveTo(4, cy); ctx.lineTo(w - 4, cy)
      ctx.stroke()

      const sweepX = cx + Math.cos(sweepAngle) * rMax
      const sweepY = cy + Math.sin(sweepAngle) * rMax
      ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(sweepX, sweepY)
      ctx.stroke()

      const blips = [
        { r: rMax * 0.52, a: 1.15 },
        { r: rMax * 0.75, a: 2.75 },
        { r: rMax * 0.38, a: 4.45 }
      ]
      blips.forEach(b => {
        const bx = cx + Math.cos(b.a) * b.r
        const by = cy + Math.sin(b.a) * b.r
        ctx.fillStyle = "#00f0ff"
        ctx.beginPath()
        ctx.arc(bx, by, 3, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    render()

    return () => cancelAnimationFrame(animId)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSimSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatHMS = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600) % 24
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* 3D WebGL World Canvas */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

      {/* STATE 1: ZERO-TRUST WARP GATEWAY (Star Wars entrance preserved) */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20 select-none">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#020617]/90 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_0_70px_rgba(6,182,212,0.25)] space-y-6 font-mono text-xs pointer-events-auto">
            
            <div className="text-center space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                AUTHORIZED DEFENSE ENCLAVE. SGP4 ORBIT PROPAGATION &amp; JADC2 TELEMETRY INITIALIZED.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>CLEARANCE: TOP SECRET SI-TK</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">AUTH PIN: 8942-0129</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] text-cyan-300">
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
        /* STATE 2: THE EXACT HOLLYWOOD CLIMAX THEATER (Matches Video 1 00:08 - 00:09) */
        <div className="relative w-full min-h-screen z-10 pointer-events-none select-none flex flex-col justify-between">
          
          {/* Top Session Security Banner */}
          <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/30 px-6 py-2 flex items-center justify-between font-mono text-[11px] pointer-events-auto">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">VEROYX SPACE DOMAIN AWARENESS // TS-SCI</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">109 PRODUCTION MODULES DEPLOYED</span>
            </div>
            <button onClick={handleLockTerminal} className="px-2.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          {/* FLOATING DEEP-SPACE VECTOR CALLOUTS (Matches Video 1 00:09) */}
          <div className="absolute top-28 left-12 z-20 font-mono text-[10px] text-slate-400 pointer-events-none flex items-center gap-2">
            <div className="w-2 h-2 rounded-full border border-cyan-400 bg-cyan-400/20" />
            <span className="font-bold text-white tracking-wider">SF59</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400">C2 DEFENSE BEACON</span>
          </div>

          <div className="absolute top-44 left-16 z-20 font-mono text-[10px] text-slate-400 pointer-events-none flex items-center gap-2">
            <div className="w-2 h-2 rounded-full border border-amber-400 bg-amber-400/20" />
            <span className="font-bold text-white tracking-wider">SWDIA</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400">CISLUNAR RADAR RELAY</span>
          </div>

          <div className="absolute top-32 right-16 z-20 font-mono text-[10px] text-slate-400 pointer-events-none flex items-center gap-2">
            <span className="font-bold text-emerald-400 tracking-wider">VEROYX-01</span>
            <span className="text-slate-600">|</span>
            <span className="text-white">LINK ACTIVE (100 Gbps)</span>
            <div className="w-2 h-2 rounded-full border border-emerald-400 bg-emerald-400/20" />
          </div>

          {/* LEFT & RIGHT HUD DECKS (Video 1 00:00 - 00:02) */}
          <div className="relative w-full pt-20 px-6 flex justify-between items-start pointer-events-none">
            
            {/* Left HUD Panel */}
            <div className="w-72 p-4 rounded-2xl bg-[#020617]/85 border border-slate-800/80 shadow-2xl backdrop-blur-md font-mono text-xs space-y-3 pointer-events-auto">
              <div className="border-b border-slate-800 pb-2">
                <div className="text-white font-black text-sm uppercase tracking-wider">MISSION PROPAGATION</div>
                <div className="text-[10px] text-cyan-400 font-bold">NORAD ID: 48219 // LEO 51.6°</div>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">VELOCITY:</span><span className="text-amber-400 font-bold">7.612 km/s</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ALTITUDE:</span><span className="text-white font-bold">550.2 km</span></div>
                <div className="flex justify-between"><span className="text-slate-500">PERIOD:</span><span className="text-slate-300 font-bold">95.3 min</span></div>
                <div className="flex justify-between"><span className="text-slate-500">OISL LINK:</span><span className="text-emerald-400 font-bold">100 Gbps</span></div>
              </div>
            </div>

            {/* Right HUD Panel: SGP4 Radar Reticle */}
            <div className="w-72 p-4 rounded-2xl bg-[#020617]/85 border border-slate-800/80 shadow-2xl backdrop-blur-md font-mono text-xs space-y-3 pointer-events-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">PROPAGATION</div>
                  <div className="text-base font-black text-white">SGP4</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">EPOCH</div>
                  <div className="text-xs font-bold text-cyan-400">{formatHMS(simSeconds)}</div>
                </div>
              </div>
              <canvas ref={radarCanvasRef} width={260} height={130} className="w-full h-32 rounded-xl border border-slate-800 bg-black" />
            </div>

          </div>

          {/* Spacer */}
          <div className="flex-1 w-full" />

          {/* THE THREE LOWER TELEMETRY HUD CARDS (Matches Video 1 00:09 Bottom Center) */}
          <div className="relative w-full max-w-5xl mx-auto px-4 pb-6 z-20 pointer-events-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              
              {/* CARD 1: SPACE DOMAIN AWARENESS (Video 1 00:09 Left) */}
              <div className="p-4 rounded-2xl bg-[#020617]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px]">
                  <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    SPACE DOMAIN AWARENESS
                  </span>
                  <span className="text-cyan-400 font-bold">CISLUNAR</span>
                </div>
                <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-900 bg-black">
                  <canvas ref={sdaCanvasRef} width={280} height={112} className="w-full h-full" />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div>ALT: <span className="text-white font-bold">384,400 KM</span></div>
                  <div>PHASE: <span className="text-amber-400 font-bold">0.74 WAXING</span></div>
                  <div>PERIGEE: <span className="text-slate-300">363,300 KM</span></div>
                  <div>SENSOR: <span className="text-emerald-400 font-bold">LOCKED</span></div>
                </div>
              </div>

              {/* CARD 2: KINETIC INTERCEPT (Video 1 00:09 Center) */}
              <div className="p-4 rounded-2xl bg-[#020617]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px]">
                  <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-rose-400" />
                    KINETIC INTERCEPT
                  </span>
                  <span className="text-rose-400 font-bold">NODE: IN-01</span>
                </div>
                <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-900 bg-black">
                  <canvas ref={interceptCanvasRef} width={280} height={112} className="w-full h-full" />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div>CLOSING VEL: <span className="text-white font-bold">11.24 KM/S</span></div>
                  <div>MISS DIST: <span className="text-emerald-400 font-bold">0.00 M</span></div>
                  <div>PROBABILITY: <span className="text-rose-400 font-bold">99.8%</span></div>
                  <div>STATUS: <span className="text-cyan-400 font-bold">TERMINAL</span></div>
                </div>
              </div>

              {/* CARD 3: KINETIC INTERCEPT // SATELLITE ASSET (Video 1 00:09 Right) */}
              <div className="p-4 rounded-2xl bg-[#020617]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px]">
                  <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5 text-emerald-400" />
                    KINETIC INTERCEPT
                  </span>
                  <span className="text-emerald-400 font-bold">ASSET PBR</span>
                </div>
                <div ref={satMiniMountRef} className="h-28 w-full rounded-lg overflow-hidden border border-slate-900 bg-black cursor-grab active:cursor-grabbing" />
                <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div>EPS BUS: <span className="text-emerald-400 font-bold">99.4%</span></div>
                  <div>PROPULSION: <span className="text-white font-bold">ARMED</span></div>
                  <div>OISL MESH: <span className="text-cyan-400 font-bold">100 GBPS</span></div>
                  <div>CRYPTO: <span className="text-slate-300">KYBER-512</span></div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  )
}
