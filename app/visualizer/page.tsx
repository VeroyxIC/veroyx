"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Orbit, Gauge, Activity, Zap, Compass, RotateCcw, 
  Play, Square, Layers, ShieldCheck, Flame, Radio, 
  ArrowRight, Sparkles, Navigation, Globe, Eye 
} from "lucide-react"
import { createMilitarySatellite, createCinematicEarth, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

export default function VisualizerPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Interactive UI State
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.6)
  const [eccentricity, setEccentricity] = useState<number>(0.002)
  const [timeWarp, setTimeWarp] = useState<number>(1)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [isBurning, setIsBurning] = useState<boolean>(false)
  const [burnDeltaVMs, setBurnDeltaVMs] = useState<number>(120)

  // Animation Engine Refs (Decouples 60 FPS loop from React renders)
  const paramsRef = useRef({
    altitudeKm: 550,
    inclinationDeg: 51.6,
    eccentricity: 0.002,
    timeWarp: 1,
    isPlaying: true,
    isBurning: false
  })

  // Keep refs synchronized with React state
  useEffect(() => {
    paramsRef.current = {
      altitudeKm,
      inclinationDeg,
      eccentricity,
      timeWarp,
      isPlaying,
      isBurning
    }
  }, [altitudeKm, inclinationDeg, eccentricity, timeWarp, isPlaying, isBurning])

  // Orbital Physics calculations
  const MU = 3.986004418e14
  const R_EARTH_KM = 6371
  const rM = (R_EARTH_KM + altitudeKm) * 1000
  const velocityKms = (Math.sqrt(MU / rM) / 1000).toFixed(2)
  const periodMin = ((2 * Math.PI * Math.sqrt(Math.pow(rM, 3) / MU)) / 60).toFixed(1)

  // Execute Impulsive Thruster Burn
  const triggerBurn = () => {
    setIsBurning(true)
    setTimeout(() => {
      setIsBurning(false)
      setAltitudeKm(prev => Math.min(35786, prev + Math.round(burnDeltaVMs * 2.5)))
    }, 2800)
  }

  // 60 FPS Three.js Engine Mount
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 16, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.4)
    sunLight.position.set(30, 25, 20)
    scene.add(sunLight)

    // Starfield & Cinematic Earth
    const starfield = createDeepSpaceStarfield(1400, 700)
    scene.add(starfield)

    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // Photorealistic Military Recon Satellite
    const { group: satGroup, plume: ionPlume } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satGroup)

    // Dynamic Orbital Path Line
    const orbitPointsCount = 128
    const orbitGeo = new THREE.BufferGeometry()
    const orbitPositions = new Float32Array(orbitPointsCount * 3)
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65, linewidth: 2 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

    // Mouse Drag Controls
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

      camera.position.x += deltaX * 0.05
      camera.position.y -= deltaY * 0.05
      camera.lookAt(0, 0, 0)
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(12, Math.min(70, camera.position.z + e.deltaY * 0.03))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    // Continuous 60 FPS Clock Loop
    const clock = new THREE.Clock()
    let orbitAngle = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const { altitudeKm, inclinationDeg, eccentricity, timeWarp, isPlaying, isBurning } = paramsRef.current

      if (isPlaying) {
        orbitAngle += delta * 0.6 * timeWarp

        earthMesh.rotation.y += 0.05 * delta * timeWarp
        cloudsMesh.rotation.y += 0.075 * delta * timeWarp

        const orbitScaleRadius = earthRadius + (altitudeKm / 6371) * earthRadius
        const incRad = (inclinationDeg * Math.PI) / 180
        const rCurrent = (orbitScaleRadius * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(orbitAngle))

        const satX = rCurrent * Math.cos(orbitAngle)
        const satY = rCurrent * Math.sin(orbitAngle) * Math.sin(incRad)
        const satZ = rCurrent * Math.sin(orbitAngle) * Math.cos(incRad)

        satGroup.position.set(satX, satY, satZ)
        satGroup.lookAt(0, 0, 0)

        if (isBurning) {
          ionPlume.visible = true
          const pulse = 1.8 + Math.sin(clock.getElapsedTime() * 18) * 0.5
          ionPlume.scale.set(pulse, pulse * 1.6, pulse)
          orbitMat.color.setHex(0xf59e0b)
        } else {
          ionPlume.visible = true
          const idle = 1.0 + Math.sin(clock.getElapsedTime() * 6) * 0.15
          ionPlume.scale.set(idle, idle, idle)
          orbitMat.color.setHex(0x00f0ff)
        }

        const posArr = orbitGeo.attributes.position.array as Float32Array
        for (let i = 0; i < orbitPointsCount; i++) {
          const theta = (i / (orbitPointsCount - 1)) * Math.PI * 2
          const rP = (orbitScaleRadius * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(theta))
          posArr[i * 3 + 0] = rP * Math.cos(theta)
          posArr[i * 3 + 1] = rP * Math.sin(theta) * Math.sin(incRad)
          posArr[i * 3 + 2] = rP * Math.sin(theta) * Math.cos(incRad)
        }
        orbitGeo.attributes.position.needsUpdate = true
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
  }, [])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden select-none">
      
      {/* LEFT PANEL */}
      <div className="w-80 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Orbit className="w-4 h-4" /> Flight Dynamics Core
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">ORBITAL PROPAGATOR</h1>
          <p className="text-[10px] text-slate-500 uppercase">J2 Zonal Geopotential Matrix</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Keplerian State Vector</span>
              <span className="text-emerald-400 font-bold">60 FPS REAL-TIME</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">ALTITUDE:</span><span className="text-white font-bold">{altitudeKm.toLocaleString()} KM</span></div>
            <div className="flex justify-between"><span className="text-slate-500">ORBITAL SPEED:</span><span className="text-cyan-400 font-bold">{velocityKms} KM/S</span></div>
            <div className="flex justify-between"><span className="text-slate-500">ORBIT PERIOD:</span><span className="text-emerald-400 font-bold">{periodMin} MIN</span></div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Orbital Geometry Sliders</span>
              <span className="text-cyan-400">ACTIVE</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">ALTITUDE (km):</span><span className="text-white font-bold">{altitudeKm} km</span></div>
              <input type="range" min="200" max="35786" step="50" value={altitudeKm} onChange={e => setAltitudeKm(Number(e.target.value))} className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">INCLINATION:</span><span className="text-cyan-300 font-bold">{inclinationDeg}°</span></div>
              <input type="range" min="0" max="98.5" step="0.5" value={inclinationDeg} onChange={e => setInclinationDeg(Number(e.target.value))} className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">ECCENTRICITY:</span><span className="text-amber-400 font-bold">{eccentricity.toFixed(3)}</span></div>
              <input type="range" min="0" max="0.5" step="0.005" value={eccentricity} onChange={e => setEccentricity(Number(e.target.value))} className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER 3D VIEWPORT */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            3D Ephemeris Tracking Engine // USSF Delta-2 Architecture
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">VXO-ALPHA TACTICAL RECON</span>
            <span className="text-cyan-400 text-xs font-bold">[MIL-SPEC GOLD MLI FOIL // 60 FPS]</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isBurning ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
            <div>
              <span className="text-slate-500 block text-[9px]">ATTITUDE STATUS</span>
              <span className="text-white font-bold text-xs">
                {isBurning ? "BURNING IMPULSIVE PROGRADE THRUST (+120 M/S)" : "NADIR-POINTED EARTH OBSERVATION LOCK"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CONJUNCTION MISS DISTANCE</span>
            <span className="text-emerald-400 font-bold text-sm">±1,420 METERS (CLEAR)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GROUND TRACK COVERAGE</span>
            <span className="text-cyan-400 font-bold text-sm">GLOBAL MULTI-PASS</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-4 flex items-center gap-2 text-xs">
          <Flame className="w-4 h-4 text-amber-500" /> Maneuver Control
        </h2>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Hohmann Orbit Burn</span>
              <span className="text-amber-400 font-bold">READY</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">IMPULSIVE BURN (Δv):</span><span className="text-amber-400 font-bold">+{burnDeltaVMs} m/s</span></div>
              <input type="range" min="10" max="600" step="10" value={burnDeltaVMs} onChange={e => setBurnDeltaVMs(Number(e.target.value))} className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>

            <button
              onClick={triggerBurn}
              disabled={isBurning}
              className={`w-full py-3 rounded-xl font-bold tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${
                isBurning ? "bg-amber-600 text-white animate-pulse" : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white"
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{isBurning ? "FIRING ION THRUSTER..." : "EXECUTE IMPULSIVE BURN"}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Time Warp Simulation Rate</span>
              <span className="text-cyan-400 font-bold">{timeWarp}x</span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 5, 10].map(w => (
                <button
                  key={w}
                  onClick={() => setTimeWarp(w)}
                  className={`py-1 rounded text-[10px] font-bold border transition-all ${
                    timeWarp === w ? "bg-cyan-950 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}
                >
                  {w}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-2"
            >
              {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "PAUSE PROPAGATION" : "RESUME PROPAGATION"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
