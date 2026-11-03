"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Box, Cpu, Orbit, Sliders, Layers, Eye, 
  Terminal, ShieldCheck, Zap, Download, RefreshCw, Check
} from "lucide-react"

export default function MissionBuilderCADPage() {
  const mount3DRef = useRef<HTMLDivElement | null>(null)
  const mountFrontRef = useRef<HTMLDivElement | null>(null)
  const mountSideRef = useRef<HTMLDivElement | null>(null)
  const mountTopRef = useRef<HTMLDivElement | null>(null)

  const [selectedPayload, setSelectedPayload] = useState<string>("Payload 1 (Optical)")
  const [wireframeMode, setWireframeMode] = useState<boolean>(false)
  const [activeSubsystem, setActiveSubsystem] = useState<string>("PROPULSION")

  // Quad-Viewport Synchronized Three.js Engine
  useEffect(() => {
    // Shared Vehicle Mesh Assembly
    const createVehicleAssembly = () => {
      const group = new THREE.Group()

      // Central Honeycomb Composite Avionics Bus
      const busGeo = new THREE.CylinderGeometry(1.4, 1.4, 2.8, 32)
      const busMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.92,
        roughness: 0.18,
        wireframe: wireframeMode
      })
      const bus = new THREE.Mesh(busGeo, busMat)
      group.add(bus)

      // Service Module / Radiator Ring
      const smGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.8, 32)
      const smMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.12,
        wireframe: wireframeMode
      })
      const sm = new THREE.Mesh(smGeo, smMat)
      sm.position.set(0, -2.1, 0)
      group.add(sm)

      // Forebody Instrument Cone
      const noseGeo = new THREE.ConeGeometry(1.4, 1.6, 32)
      const noseMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.25,
        wireframe: wireframeMode
      })
      const nose = new THREE.Mesh(noseGeo, noseMat)
      nose.position.set(0, 2.2, 0)
      group.add(nose)

      // Dual Solar Wings
      const wingGeo = new THREE.BoxGeometry(4.8, 0.05, 1.2)
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.88,
        roughness: 0.2,
        wireframe: wireframeMode
      })
      const wingL = new THREE.Mesh(wingGeo, wingMat)
      wingL.position.set(3.6, 0, 0)
      group.add(wingL)

      const wingR = new THREE.Mesh(wingGeo, wingMat)
      wingR.position.set(-3.6, 0, 0)
      group.add(wingR)

      // Main Engine Bell Cluster
      const nozGeo = new THREE.ConeGeometry(0.3, 0.7, 16, 1, true)
      const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95 })
      const nozOffsets = [[0.45, -3.2, 0.45], [-0.45, -3.2, 0.45], [0, -3.2, -0.55]]
      nozOffsets.forEach(([nx, ny, nz]) => {
        const noz = new THREE.Mesh(nozGeo, nozMat)
        noz.position.set(nx, ny, nz)
        group.add(noz)
      })

      return group
    }

    const renderers: THREE.WebGLRenderer[] = []
    const animIds: number[] = []

    // Helper for Mounting Viewports
    const setupViewport = (
      container: HTMLDivElement | null,
      camConfig: { ortho: boolean; pos: [number, number, number]; look: [number, number, number] }
    ) => {
      if (!container) return
      const w = container.clientWidth, h = container.clientHeight
      const scene = new THREE.Scene()
      scene.background = new THREE.Color("#020617")

      // Grid Helper
      const grid = new THREE.GridHelper(16, 16, 0x0284c7, 0x1e293b)
      grid.position.y = -3.2
      scene.add(grid)

      // Lighting
      const light = new THREE.DirectionalLight(0xffffff, 3.0)
      light.position.set(10, 15, 10)
      scene.add(light)
      scene.add(new THREE.AmbientLight(0x0f172a, 1.8))

      const vehicle = createVehicleAssembly()
      scene.add(vehicle)

      let camera: THREE.Camera
      if (camConfig.ortho) {
        const aspect = w / h
        const d = 5.8
        camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100)
      } else {
        camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)
      }
      camera.position.set(...camConfig.pos)
      camera.lookAt(...camConfig.look)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      container.innerHTML = ""
      container.appendChild(renderer.domElement)
      renderers.push(renderer)

      const animate = () => {
        const id = requestAnimationFrame(animate)
        animIds.push(id)
        if (!camConfig.ortho) {
          vehicle.rotation.y += 0.006
        }
        renderer.render(scene, camera)
      }
      animate()
    }

    setupViewport(mount3DRef.current, { ortho: false, pos: [8, 6, 10], look: [0, 0, 0] })
    setupViewport(mountFrontRef.current, { ortho: true, pos: [0, 0, 15], look: [0, 0, 0] })
    setupViewport(mountSideRef.current, { ortho: true, pos: [15, 0, 0], look: [0, 0, 0] })
    setupViewport(mountTopRef.current, { ortho: true, pos: [0, 15, 0], look: [0, 0, 0] })

    return () => {
      animIds.forEach(id => cancelAnimationFrame(id))
      renderers.forEach(r => r.dispose())
    }
  }, [wireframeMode])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 flex flex-col bg-[#01030a] font-mono text-xs text-slate-100 select-none overflow-hidden">
      
      {/* TOP CAD MENU BAR (Image 1 Top) */}
      <div className="h-11 px-4 border-b border-slate-800 bg-[#020617] flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-black tracking-widest text-white uppercase text-sm">AERO-ORBITAL SYSTEM SIMULATOR</span>
          <div className="flex items-center gap-3 text-slate-400 text-[10px]">
            <span className="text-white font-bold cursor-pointer hover:text-cyan-400">File</span>
            <span className="text-cyan-400 font-bold cursor-pointer">Design</span>
            <span className="cursor-pointer hover:text-cyan-400">Analysis</span>
            <span className="cursor-pointer hover:text-cyan-400">Simulation</span>
            <span className="cursor-pointer hover:text-cyan-400">Aero Testing</span>
            <span className="cursor-pointer hover:text-cyan-400">Trade Studies</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <button
            onClick={() => setWireframeMode(w => !w)}
            className={`px-3 py-1 rounded-md border font-bold transition-all ${
              wireframeMode 
                ? "bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {wireframeMode ? "WIREFRAME: ACTIVE" : "SHADED PBR MESH"}
          </button>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
            MESH: OPTIMAL (0.02 mm)
          </span>
        </div>
      </div>

      {/* MAIN WORKSTATION: CAD TREE + 4 SYNCHRONIZED VIEWPORTS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT CAD SUBSYSTEM HIERARCHY TREE (Image 1 Left Sidebar) */}
        <div className="w-64 h-full border-r border-slate-800 bg-[#020617] p-3 flex flex-col space-y-3 overflow-y-auto shrink-0">
          <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
            <span>CAD Filters // Subsystems</span>
            <span className="text-cyan-400">TREE</span>
          </div>

          <div className="space-y-1">
            {["Payload 1 (Optical)", "Payload 2 (SAR Radar)", "Payload 3 (SIGINT)", "Payload 4 (Cryo Dewar)", "Solar Arrays (GaAs)", "Propulsion (Xenon Hall)", "Avionics Bus (MIL-STD)"].map(item => {
              const isSel = selectedPayload === item
              return (
                <button
                  key={item}
                  onClick={() => setSelectedPayload(item)}
                  className={`w-full text-left p-2 rounded-lg text-[10px] transition-all flex items-center justify-between ${
                    isSel 
                      ? "bg-cyan-950/80 border border-cyan-500/60 text-cyan-200" 
                      : "bg-slate-900/40 border border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>{item}</span>
                  {isSel && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
              )
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2 text-[10px]">
            <div className="text-slate-400 font-bold uppercase">Mass &amp; Balance</div>
            <div className="flex justify-between"><span className="text-slate-500">DRY MASS:</span><span className="text-white font-bold">1,480 kg</span></div>
            <div className="flex justify-between"><span className="text-slate-500">PROPELLANT:</span><span className="text-cyan-400 font-bold">320 kg Xe</span></div>
            <div className="flex justify-between"><span className="text-slate-500">CG OFFSET:</span><span className="text-emerald-400 font-bold">&lt; 0.02 mm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">NATURAL FREQ:</span><span className="text-white font-bold">94.2 Hz</span></div>
          </div>
        </div>

        {/* 4-QUADRANT VIEWPORT GRID (Image 1 4-Box Grid) */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 bg-slate-900 p-1">
          
          {/* QUADRANT 1: PERSPECTIVE 3D VIEW (Top-Left) */}
          <div className="relative bg-[#020617] rounded-lg overflow-hidden border border-slate-800/80">
            <div className="absolute top-2 left-3 z-10 text-[10px] text-cyan-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Perspective Interactive 3D Fit
            </div>
            <div ref={mount3DRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          </div>

          {/* QUADRANT 2: FRONT / AFT VIEW (Top-Right) */}
          <div className="relative bg-[#020617] rounded-lg overflow-hidden border border-slate-800/80">
            <div className="absolute top-2 left-3 z-10 text-[10px] text-amber-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Front / AFT View (Orthographic)
            </div>
            <div ref={mountFrontRef} className="w-full h-full" />
            <div className="absolute bottom-2 right-3 z-10 text-[9px] text-slate-500 font-mono">
              Thruster Placements &amp; Sensor Callouts
            </div>
          </div>

          {/* QUADRANT 3: SIDE ORTHOGRAPHIC VIEW (Bottom-Left) */}
          <div className="relative bg-[#020617] rounded-lg overflow-hidden border border-slate-800/80">
            <div className="absolute top-2 left-3 z-10 text-[10px] text-rose-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Side Orthographic Elevation // Dimension Calipers
            </div>
            <div ref={mountSideRef} className="w-full h-full" />
            <div className="absolute bottom-3 left-6 z-10 flex gap-4 text-[9px] text-cyan-300 font-bold bg-slate-950/80 px-3 py-1 rounded border border-slate-800">
              <span>SPAN: 3.18m</span>
              <span>FOREBODY: 1.67m</span>
              <span>NOZZLE: 0.23m</span>
            </div>
          </div>

          {/* QUADRANT 4: TOP-DOWN PLAN VIEW (Bottom-Right) */}
          <div className="relative bg-[#020617] rounded-lg overflow-hidden border border-slate-800/80">
            <div className="absolute top-2 left-3 z-10 text-[10px] text-emerald-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              Top-Down Plan View // Solar Array Deployment
            </div>
            <div ref={mountTopRef} className="w-full h-full" />
            <div className="absolute bottom-2 right-3 z-10 text-[9px] text-slate-500 font-mono">
              ARRAY SPAN: 14.2m // DUAL-AXIS GIMBAL
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
