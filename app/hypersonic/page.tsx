"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Flame, Play, Pause, RotateCcw, Activity, 
  Terminal, ShieldCheck, Sliders, BarChart3, Wind, Layers
} from "lucide-react"

export default function HypersonicSimulationPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const shockCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sensorCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [isRunning, setIsRunning] = useState<boolean>(true)
  const [simTime, setSimTime] = useState<number>(10.4)
  const [machNumber, setMachNumber] = useState<number>(22.4)
  const [altitudeKm, setAltitudeKm] = useState<number>(48.5)
  const [angleAttackDeg, setAngleAttackDeg] = useState<number>(18.0)

  // 1. MAIN 3D HYPERSONIC STREAMLINE WIND TUNNEL (Image 2 Left Viewport)
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(-10, 5, 14)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Directional Lighting for Vehicle
    const mainLight = new THREE.DirectionalLight(0xfffaed, 3.5)
    mainLight.position.set(-15, 12, 10)
    scene.add(mainLight)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.5))

    // Hypersonic Spacecraft Assembly (Ablative Capsule + Service Module)
    const spacecraft = new THREE.Group()
    spacecraft.rotation.y = Math.PI / 5.5
    spacecraft.rotation.z = (18 * Math.PI) / 180

    // Heat Shield (Blunt Forebody Stagnation Region)
    const shieldGeo = new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3)
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
      emissive: 0xef4444,
      emissiveIntensity: 0.45
    })
    const heatShield = new THREE.Mesh(shieldGeo, shieldMat)
    heatShield.rotation.x = Math.PI / 2
    heatShield.position.set(0, 0, 1.1)
    spacecraft.add(heatShield)

    // Conical Frustum Capsule Fuselage
    const coneGeo = new THREE.CylinderGeometry(0.85, 1.6, 1.8, 32)
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.9 })
    const coneMesh = new THREE.Mesh(coneGeo, coneMat)
    coneMesh.position.set(0, 0, 0)
    coneMesh.rotation.x = Math.PI / 2
    spacecraft.add(coneMesh)

    // Service Module Cylinder
    const smGeo = new THREE.CylinderGeometry(1.5, 1.5, 2.2, 32)
    const smMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.85 })
    const smMesh = new THREE.Mesh(smGeo, smMat)
    smMesh.rotation.x = Math.PI / 2
    smMesh.position.set(0, 0, -1.8)
    spacecraft.add(smMesh)

    // Solar Panel Wings
    const wingGeo = new THREE.BoxGeometry(3.6, 0.04, 1.1)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.9 })
    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(2.8, 0, -1.8)
    spacecraft.add(wingL)
    const wingR = new THREE.Mesh(wingGeo, wingMat)
    wingR.position.set(-2.8, 0, -1.8)
    spacecraft.add(wingR)

    // Engine Bells Cluster
    const bellGeo = new THREE.ConeGeometry(0.24, 0.6, 16, 1, true)
    const bellMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95 })
    const offsets = [[0.35, 0.35, -3.0], [-0.35, 0.35, -3.0], [0, -0.4, -3.0]]
    offsets.forEach(([bx, by, bz]) => {
      const bell = new THREE.Mesh(bellGeo, bellMat)
      bell.rotation.x = -Math.PI / 2
      bell.position.set(bx, by, bz)
      spacecraft.add(bell)
    })

    scene.add(spacecraft)

    // 2. High-Speed CFD Streamlines (Particles moving along aerodynamic flow curves)
    const streamCount = 950
    const streamGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(streamCount * 3)
    const colors = new Float32Array(streamCount * 3)
    const velocities = new Float32Array(streamCount)

    for (let i = 0; i < streamCount; i++) {
      // Spawn streamlines in front of the vehicle
      const x = -14 + Math.random() * 28
      const y = -7 + Math.random() * 14
      const z = 10 + Math.random() * 4

      positions[i * 3 + 0] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      velocities[i] = 22.0 + Math.random() * 14.0

      // Initial color assignment
      colors[i * 3 + 0] = 0.2
      colors[i * 3 + 1] = 0.8
      colors[i * 3 + 2] = 1.0
    }

    streamGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    streamGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const streamPoints = new THREE.Points(
      streamGeo,
      new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      })
    )
    scene.add(streamPoints)

    // Interactive Drag Rotation
    let isDragging = false
    let prevX = 0, prevY = 0
    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      scene.rotation.y += (e.clientX - prevX) * 0.005
      scene.rotation.x += (e.clientY - prevY) * 0.005
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(8, Math.min(32, camera.position.z + e.deltaY * 0.02))
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

      // Animate Streamlines passing spacecraft
      const pArr = streamGeo.attributes.position.array as Float32Array
      const cArr = streamGeo.attributes.color.array as Float32Array

      for (let i = 0; i < streamCount; i++) {
        pArr[i * 3 + 2] -= velocities[i] * delta

        const x = pArr[i * 3 + 0]
        const y = pArr[i * 3 + 1]
        const z = pArr[i * 3 + 2]

        // Deflect particles around the blunt nose
        const distToNose = Math.sqrt(x * x + y * y + (z - 1.1) * (z - 1.1))
        if (distToNose < 2.4 && z > -1.0) {
          pArr[i * 3 + 0] += x * 0.12
          pArr[i * 3 + 1] += y * 0.12

          // Color shift to Stagnation Red/Orange
          cArr[i * 3 + 0] = 1.0
          cArr[i * 3 + 1] = 0.2
          cArr[i * 3 + 2] = 0.1
        } else if (z < -1.0 && z > -4.0) {
          // Flank expansion: Green / Yellow
          cArr[i * 3 + 0] = 0.8
          cArr[i * 3 + 1] = 0.9
          cArr[i * 3 + 2] = 0.1
        } else {
          // Freestream: Cyan / Blue
          cArr[i * 3 + 0] = 0.1
          cArr[i * 3 + 1] = 0.6
          cArr[i * 3 + 2] = 1.0
        }

        // Reset particle loop
        if (pArr[i * 3 + 2] < -10) {
          pArr[i * 3 + 0] = -14 + Math.random() * 28
          pArr[i * 3 + 1] = -7 + Math.random() * 14
          pArr[i * 3 + 2] = 12 + Math.random() * 3
        }
      }

      streamGeo.attributes.position.needsUpdate = true
      streamGeo.attributes.color.needsUpdate = true

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

  // 2. 2D THERMAL SHOCKWAVE CONTOUR PLOT (Image 2 Top Right)
  useEffect(() => {
    const canvas = shockCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, w, h)

    // Stagnation Bow Shock Heat Envelope (Red -> Yellow -> Blue)
    const cx = w * 0.42, cy = h * 0.5
    for (let r = 85; r > 10; r -= 3) {
      const norm = (r - 10) / 75
      if (norm < 0.2) ctx.fillStyle = "rgba(239, 68, 68, 0.95)" // 120+ Stagnation Peak
      else if (norm < 0.45) ctx.fillStyle = "rgba(245, 158, 11, 0.85)"
      else if (norm < 0.7) ctx.fillStyle = "rgba(34, 197, 94, 0.65)"
      else ctx.fillStyle = "rgba(2, 132, 199, 0.35)"

      ctx.beginPath()
      ctx.ellipse(cx + (1.0 - norm) * 20, cy, r * 1.3, r * 0.85, 0, -Math.PI / 2, Math.PI / 2)
      ctx.fill()
    }

    // Vehicle Blunt Outline
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(cx + 25, cy, 18, -Math.PI / 2, Math.PI / 2)
    ctx.fill()
    ctx.fillRect(cx + 25, cy - 18, 45, 36)
  }, [])

  // 3. DRAG COEFFICIENT DYNAMIC CURVE (Image 2 Mid Right)
  useEffect(() => {
    const canvas = dragCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 1
    for (let y = 10; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // Drag Coefficient curve
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.moveTo(10, h * 0.75)
    ctx.bezierCurveTo(w * 0.3, h * 0.25, w * 0.6, h * 0.85, w - 10, h * 0.45)
    ctx.stroke()
  }, [])

  // 4. SENSOR SPECTRAL TELEMETRY (Image 2 Bottom Right Oscilloscope)
  useEffect(() => {
    const canvas = sensorCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let offset = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      offset += 0.05
      const w = canvas.width
      const h = canvas.height

      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, w, h)

      // Draw 4 Waveform Channels
      const channels = [
        { color: "#eab308", yBase: h * 0.2, freq: 0.08, amp: 10 },
        { color: "#22c55e", yBase: h * 0.42, freq: 0.12, amp: 8 },
        { color: "#38bdf8", yBase: h * 0.65, freq: 0.05, amp: 12 },
        { color: "#ef4444", yBase: h * 0.85, freq: 0.18, amp: 6 }
      ]

      channels.forEach(ch => {
        ctx.strokeStyle = ch.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let x = 0; x < w; x += 2) {
          const y = ch.yBase + Math.sin(x * ch.freq + offset) * ch.amp + (Math.random() - 0.5) * 2.5
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      })
    }
    render()

    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 flex flex-col bg-[#01030a] font-mono text-xs text-slate-100 select-none overflow-hidden">
      
      {/* TOP INDUSTRIAL HEADER (Image 2 Top) */}
      <div className="h-11 px-4 border-b border-slate-800 bg-[#020617] flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-black tracking-widest text-white uppercase text-sm">AERO-ORBITAL SYSTEM SIMULATOR</span>
          <div className="flex items-center gap-3 text-slate-400 text-[10px]">
            <span className="text-white font-bold">File</span>
            <span>Design</span>
            <span className="text-cyan-400 font-bold">Simulation</span>
            <span className="text-emerald-400 font-bold">Aerodynamics</span>
            <span>Telemetry</span>
            <span>Tools</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">FLOW SOLVER: RUNNING (60 FPS)</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            MACH: {machNumber.toFixed(1)}
          </span>
        </div>
      </div>

      {/* MAIN DUAL-PANE WORKSTATION */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT VIEWPORT: 3D WIND TUNNEL & TIMELINE SCRUBBER (Image 2 Left) */}
        <div className="flex-1 h-full relative flex flex-col border-r border-slate-800">
          
          {/* Top Subheader */}
          <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] text-slate-300 backdrop-blur-md">
              <span className="text-cyan-400 font-bold">3D Modeling Viewport</span>
              <span className="mx-2 text-slate-600">|</span>
              <span>Mach {machNumber.toFixed(1)} Super-Orbital Entry Flow</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] text-amber-400 font-bold backdrop-blur-md">
              ALTITUDE: {altitudeKm.toFixed(1)} KM // AoA: {angleAttackDeg}°
            </div>
          </div>

          {/* Left Vertical Pressure Color-Bar Legend (Image 2 Left) */}
          <div className="absolute left-4 top-20 z-10 p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-md text-[9px] font-mono space-y-2 pointer-events-none">
            <div className="text-slate-400 font-bold">Pressure [Kn/m²]</div>
            <div className="h-44 w-4 rounded bg-gradient-to-t from-blue-600 via-green-500 via-yellow-400 to-red-600 border border-slate-800" />
            <div className="space-y-3.5 text-slate-400 text-[8px] pl-1 font-bold">
              <div>60</div><div>40</div><div>20</div><div>0</div>
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

          {/* BOTTOM TIMELINE & SUBSYSTEM MATRIX (Image 2 Bottom Left) */}
          <div className="h-40 border-t border-slate-800 bg-[#020617]/95 p-3 flex flex-col justify-between shrink-0 font-mono text-[10px] z-10">
            
            {/* Timeline Scrubber */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>TIMELINE: <span className="text-white font-bold">{simTime.toFixed(1)} s</span></span>
                <span className="text-cyan-400">STAGNATION PEAK: T+10.4s</span>
              </div>
              <input
                type="range"
                min="0"
                max="18"
                step="0.1"
                value={simTime}
                onChange={e => setSimTime(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Subsystem Health Grid */}
            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[9px]">THERMAL SHIELD</div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">NOMINAL (94%)</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[9px]">RCS PROPULSION</div>
                <div className="text-cyan-400 font-bold text-xs mt-0.5">ACTIVE (88%)</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[9px]">BUS POWER (EPS)</div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">99.2% CHARGED</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRunning(r => !r)}
                  className={`flex-1 py-3 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                    isRunning 
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                      : "bg-emerald-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? "PAUSE" : "RUN"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT ANALYTICAL PANELS (Image 2 Right Side) */}
        <div className="w-[520px] h-full flex flex-col bg-[#020617] overflow-y-auto">
          
          {/* Top Panel: Aerodynamic Analysis Heatmap & Drag Curve (Image 2 Top Right) */}
          <div className="p-4 border-b border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-800 pb-1.5">
              <span className="text-white">Aerodynamic Analysis</span>
              <div className="flex gap-3 text-[10px]">
                <span className="text-cyan-400">✓ Thermal heating</span>
                <span className="text-amber-400">✓ Drag coefficient</span>
              </div>
            </div>

            {/* 2D Stagnation Heatmap & Drag Curve Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400">BOW SHOCK STAGNATION PLOT</div>
                <canvas ref={shockCanvasRef} width={220} height={110} className="w-full h-28 rounded-lg border border-slate-800 bg-black" />
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400">DRAG COEFFICIENT vs TIME</div>
                <canvas ref={dragCanvasRef} width={220} height={110} className="w-full h-28 rounded-lg border border-slate-800 bg-black" />
              </div>
            </div>
          </div>

          {/* Middle Panel: Aerodynamic Coefficients & Orbital Parameters */}
          <div className="p-4 border-b border-slate-800 grid grid-cols-2 gap-4 text-[10px]">
            
            {/* Aerodynamic Coefficients Table */}
            <div className="space-y-1.5">
              <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">
                Aero Coefficients
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Cd (DRAG):</span><span className="text-white font-bold">0.3355</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cl (LIFT):</span><span className="text-cyan-400 font-bold">0.2008</span></div>
              <div className="flex justify-between"><span className="text-slate-500">L/D RATIO:</span><span className="text-emerald-400 font-bold">0.598</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cm (PITCH):</span><span className="text-white">-0.0125</span></div>
              <div className="flex justify-between"><span className="text-slate-500">STAGNATION T0:</span><span className="text-rose-400 font-bold">3,650 K</span></div>
            </div>

            {/* Orbital Parameters */}
            <div className="space-y-1.5">
              <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">
                Orbital Parameters
              </div>
              <div className="flex justify-between"><span className="text-slate-500">ALTITUDE:</span><span className="text-white font-bold">{altitudeKm.toFixed(1)} km</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VELOCITY:</span><span className="text-amber-400 font-bold">27,500 m/s</span></div>
              <div className="flex justify-between"><span className="text-slate-500">DYNAMIC PRESS:</span><span className="text-white font-bold">48.2 kPa</span></div>
              <div className="flex justify-between"><span className="text-slate-500">HEATING RATE:</span><span className="text-rose-400 font-bold">185 W/cm²</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ENTRY FLIGHT PATH:</span><span className="text-white">-1.45°</span></div>
            </div>
          </div>

          {/* Lower Panel: Sensor Spectral Simulation Oscilloscope (Image 2 Bottom Right) */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1">
              <span>Sensor Spectral Telemetry</span>
              <span className="text-emerald-400">RF IONIZATION SHEATH</span>
            </div>
            <canvas ref={sensorCanvasRef} width={460} height={90} className="w-full h-24 rounded-lg border border-slate-800 bg-black" />
          </div>

          {/* Bottom Terminal Output Stream */}
          <div className="p-4 flex-1 flex flex-col space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Execution Logs // Aero-Thermal Stream</span>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-black border border-slate-800 text-[10px] font-mono text-emerald-400 space-y-1 overflow-y-auto">
              <div>[SOLVER] Navier-Stokes compressible flow initialized...</div>
              <div>[HYPERSONIC] Mach {machNumber.toFixed(1)} stagnation point verified at nose tip.</div>
              <div className="text-rose-400">[THERMAL] Max heat flux 185 W/cm² absorbed by carbon-phenolic shield.</div>
              <div className="text-cyan-400">[AERO] L/D equilibrium 0.598 maintains entry corridor guidance.</div>
              <div className="text-slate-500">[STATUS] All sensor channels nominal. Blackout margins stable.</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
