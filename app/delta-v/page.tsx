"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { Orbit, Activity, Rocket, Crosshair, AlertTriangle, ShieldCheck, Zap } from "lucide-react"

export default function DeltaVPlanner() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  
  // Orbital Parameters
  const EARTH_RADIUS_KM = 6371
  const MU = 398600.4418 // Earth's standard gravitational parameter (km^3/s^2)
  
  const [initialAltKm, setInitialAltKm] = useState(550)
  const [targetAltKm, setTargetAltKm] = useState(600)
  const [inclinationChangeDeg, setInclinationChangeDeg] = useState(0)

  // Physics Calculations
  const r1 = EARTH_RADIUS_KM + initialAltKm
  const r2 = EARTH_RADIUS_KM + targetAltKm
  
  const v1 = Math.sqrt(MU / r1)
  const v2 = Math.sqrt(MU / r2)
  
  // Hohmann Transfer Delta-V
  const vTransfer1 = Math.sqrt(MU * (2 / r1 - 1 / ((r1 + r2) / 2)))
  const vTransfer2 = Math.sqrt(MU * (2 / r2 - 1 / ((r1 + r2) / 2)))
  const deltaV1 = Math.abs(vTransfer1 - v1)
  const deltaV2 = Math.abs(v2 - vTransfer2)
  const hohmannDeltaV = deltaV1 + deltaV2

  // Pure Inclination Change Delta-V (calculated at initial orbit for worst-case)
  const incChangeRad = inclinationChangeDeg * (Math.PI / 180)
  const inclinationDeltaV = 2 * v1 * Math.sin(incChangeRad / 2)

  const totalDeltaVKms = hohmannDeltaV + inclinationDeltaV
  const totalDeltaVMs = totalDeltaVKms * 1000

  // 3D Visualizer
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 15, 25)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Earth
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS_KM / 1000, 32, 32)
    const earthMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, wireframe: true, transparent: true, opacity: 0.3 })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // Helper: Create Orbit Ring
    const createOrbit = (radiusKm: number, color: number, dashed = false) => {
      const radius = radiusKm / 1000
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0)
      const points = curve.getPoints(100)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = dashed 
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.2 })
        : new THREE.LineBasicMaterial({ color })
      const ellipse = new THREE.Line(geometry, material)
      if (dashed) ellipse.computeLineDistances()
      ellipse.rotation.x = Math.PI / 2
      return ellipse
    }

    // Current Orbit (Blue)
    const currentOrbit = createOrbit(r1, 0x38bdf8)
    scene.add(currentOrbit)

    // Target Orbit (Emerald)
    const targetOrbit = createOrbit(r2, 0x10b981)
    scene.add(targetOrbit)

    // Satellite Marker
    const satGeo = new THREE.SphereGeometry(0.2, 16, 16)
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const sat = new THREE.Mesh(satGeo, satMat)
    scene.add(sat)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      
      // Animate satellite along initial orbit
      const time = Date.now() * 0.001
      sat.position.x = (r1 / 1000) * Math.cos(time)
      sat.position.z = (r1 / 1000) * Math.sin(time)
      
      // Tilt entire system if inclination is changed
      currentOrbit.rotation.x = (Math.PI / 2)
      targetOrbit.rotation.x = (Math.PI / 2) + (inclinationChangeDeg * Math.PI / 180)
      
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
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [r1, r2, inclinationChangeDeg])

  return (
    <div className="w-full h-full pt-24 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: MANEUVER CONTROLS */}
      <div className="w-1/3 h-full flex flex-col border-r border-slate-800 bg-slate-950/50 backdrop-blur-md p-8 overflow-y-auto">
        <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase mb-2">
          <Rocket className="w-5 h-5 text-amber-400" /> Delta-V Planner
        </h1>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-8">
          Orbital Maneuver &amp; Kinetics Engine
        </p>

        <div className="space-y-8 font-mono">
          {/* Altitude Controls */}
          <div className="space-y-4">
            <label className="text-slate-500 font-bold uppercase tracking-widest text-xs flex justify-between">
              <span>TARGET ALTITUDE (km)</span>
              <span className="text-emerald-400">{targetAltKm} km</span>
            </label>
            <input 
              type="range" 
              min="300" max="2000" step="10"
              value={targetAltKm}
              onChange={(e) => setTargetAltKm(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>LEO (300km)</span>
              <span>MEO (2000km)</span>
            </div>
          </div>

          {/* Inclination Controls */}
          <div className="space-y-4">
            <label className="text-slate-500 font-bold uppercase tracking-widest text-xs flex justify-between">
              <span>INCLINATION CHANGE (deg)</span>
              <span className="text-fuchsia-400">{inclinationChangeDeg}°</span>
            </label>
            <input 
              type="range" 
              min="0" max="90" step="0.5"
              value={inclinationChangeDeg}
              onChange={(e) => setInclinationChangeDeg(Number(e.target.value))}
              className="w-full accent-fuchsia-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="mt-8 p-4 bg-slate-900/60 border border-slate-700 rounded-xl">
            <div className="text-xs text-slate-400 mb-2 font-bold uppercase">Maneuver Sequence</div>
            <ul className="text-[10px] space-y-2 text-slate-300">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400"/> Coast to ascending node.</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"/> Execute Burn 1 (Prograde) - {deltaV1.toFixed(3)} km/s</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"/> Transfer orbit coast phase.</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> Execute Burn 2 (Circularize) - {deltaV2.toFixed(3)} km/s</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: WEBGL VISUALIZER */}
      <div className="flex-1 h-full relative">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest mb-1 uppercase">Astrodynamics View</div>
          <div className="flex items-center gap-4 text-[10px] uppercase">
            <span className="text-cyan-400 flex items-center gap-1"><div className="w-2 h-2 bg-cyan-400 rounded-full"/> Current Orbit</span>
            <span className="text-emerald-400 flex items-center gap-1"><div className="w-2 h-2 bg-emerald-400 rounded-full"/> Target Orbit</span>
          </div>
        </div>
        <div ref={mountRef} className="w-full h-full cursor-move" />
      </div>

      {/* RIGHT PANEL: TELEMETRY & BUDGET */}
      <div className="w-80 h-full bg-slate-950/50 backdrop-blur-md border-l border-slate-800 flex flex-col p-6 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Kinetic Budget
        </h2>

        <div className="space-y-6">
          {/* Total Delta-V Highlight */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5">
            <div className="text-[10px] font-bold tracking-wider mb-2 text-amber-400/80">TOTAL REQUIRED ΔV</div>
            <div className="text-4xl font-black text-amber-400 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              {totalDeltaVMs.toFixed(1)} <span className="text-lg">m/s</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 space-y-4">
            <div className="text-slate-400 font-bold tracking-wider border-b border-slate-800 pb-2">MANEUVER BREAKDOWN</div>
            
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between items-end">
                <span className="text-slate-500">Hohmann Transfer</span>
                <span className="text-white text-sm">{(hohmannDeltaV * 1000).toFixed(1)} m/s</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-500">Inclination Change</span>
                <span className="text-fuchsia-400 text-sm">{(inclinationDeltaV * 1000).toFixed(1)} m/s</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
            <div className="text-slate-400 font-bold tracking-wider border-b border-slate-800 pb-2 mb-3">STATE VECTORS</div>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">Initial Velocity (v1)</span><span className="text-cyan-400">{v1.toFixed(3)} km/s</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Target Velocity (v2)</span><span className="text-emerald-400">{v2.toFixed(3)} km/s</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Orbit Period (Current)</span><span>{(2 * Math.PI * Math.sqrt(Math.pow(r1, 3) / MU) / 60).toFixed(1)} min</span></div>
            </div>
          </div>

          <button className="w-full py-4 mt-4 bg-slate-800 hover:bg-amber-600 text-white font-black tracking-widest uppercase rounded-xl transition-colors shadow-lg">
            Commit to Flight Plan
          </button>
        </div>
      </div>
    </div>
  )
}
