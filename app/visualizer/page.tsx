"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { Orbit, Activity, Globe, Sliders, ShieldCheck, Zap, Radio } from "lucide-react"
import { 
  createCinematicEarth, createCrateredMoon, 
  createMilitarySatellite, createDeepSpaceStarfield 
} from "@/components/three/CinematicSpaceEngine"

export default function VisualizerPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.6)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  // Real astrodynamic physics calculation (WGS-84 standard)
  const mu = 398600.4418 // km^3/s^2 (Standard gravitational parameter)
  const earthRadiusKm = 6378.137
  const rOrbit = earthRadiusKm + altitudeKm
  const orbitalVelocity = Math.sqrt(mu / rOrbit)
  const orbitalPeriodMin = (2 * Math.PI * Math.sqrt(Math.pow(rOrbit, 3) / mu)) / 60

  const paramsRef = useRef({ altitudeKm, inclinationDeg, isPlaying })
  useEffect(() => {
    paramsRef.current = { altitudeKm, inclinationDeg, isPlaying }
  }, [altitudeKm, inclinationDeg, isPlaying])

  // Persistent 60 FPS WebGL Engine
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 3000)
    camera.position.set(0, 14, 26)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // 1. Deep-Space Starfield Skybox
    const starfield = createDeepSpaceStarfield(1800, 800)
    scene.add(starfield)

    // 2. Radiant Sun with Anamorphic Lens Flare in Upper-Left Exosphere (Video 00:10)
    const sunLight = new THREE.DirectionalLight(0xfffaee, 4.2)
    sunLight.position.set(-28, 22, 14)
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))

    const sunGeo = new THREE.SphereGeometry(1.6, 32, 32)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const sunMesh = new THREE.Mesh(sunGeo, sunMat)
    sunMesh.position.set(-32, 26, 14)
    scene.add(sunMesh)

    const flareLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-48, 26, 14),
      new THREE.Vector3(-16, 26, 14)
    ])
    const flareLineMat = new THREE.LineBasicMaterial({ 
      color: 0x67e8f9, 
      transparent: true, 
      opacity: 0.9, 
      linewidth: 3 
    })
    const flareLine = new THREE.Line(flareLineGeo, flareLineMat)
    scene.add(flareLine)

    // 3. NASA Blue Marble Earth with Specular Oceans & Atmosphere
    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // 4. Cratered Moon in Upper-Right Exosphere (Video 00:15)
    const moonMesh = createCrateredMoon(1.4)
    moonMesh.position.set(18, 12, -22)
    scene.add(moonMesh)

    // 5. Tactical Formation Satellite Fleet (3 Coordinated Spacecraft)
    const { group: satMaster, plume: ionPlume } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satMaster)

    const { group: wingman1 } = createMilitarySatellite({ scale: 0.35 })
    scene.add(wingman1)

    const { group: wingman2 } = createMilitarySatellite({ scale: 0.35 })
    scene.add(wingman2)

    // 6. Glowing Neon-Green OISL Laser Crosslinks (Video 00:10 - 00:19)
    const laserMat = new THREE.LineBasicMaterial({ 
      color: 0x22c55e, 
      linewidth: 2.5, 
      transparent: true, 
      opacity: 0.95 
    })
    const laserGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const laserLine1 = new THREE.Line(laserGeo1, laserMat)
    scene.add(laserLine1)

    const laserGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const laserLine2 = new THREE.Line(laserGeo2, laserMat)
    scene.add(laserLine2)

    // Orbit Path Track
    const orbitPointsCount = 128
    const orbitGeo = new THREE.BufferGeometry()
    const orbitPositions = new Float32Array(orbitPointsCount * 3)
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65, linewidth: 2 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

    // 7. Interactive Drag Rotation & Motion Zooming
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
      earthGroup.rotation.y += deltaX * 0.005
      earthGroup.rotation.x += deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(12.0, Math.min(45.0, camera.position.z + e.deltaY * 0.025))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let orbitAngle = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()
      const { altitudeKm, inclinationDeg, isPlaying } = paramsRef.current

      if (isPlaying) {
        orbitAngle += delta * 0.45
        earthMesh.rotation.y += 0.05 * delta
        cloudsMesh.rotation.y += 0.075 * delta

        const orbitScaleRadius = earthRadius + (altitudeKm / 6371) * earthRadius
        const incRad = (inclinationDeg * Math.PI) / 180

        // Lead satellite position
        const satX = orbitScaleRadius * Math.cos(orbitAngle)
        const satY = orbitScaleRadius * Math.sin(orbitAngle) * Math.sin(incRad)
        const satZ = orbitScaleRadius * Math.sin(orbitAngle) * Math.cos(incRad)

        satMaster.position.set(satX, satY, satZ)
        satMaster.lookAt(0, 0, 0)

        // Wingman 1 position (Trailing offset)
        const w1X = (orbitScaleRadius + 1.2) * Math.cos(orbitAngle + 0.8)
        const w1Y = (orbitScaleRadius + 1.2) * Math.sin(orbitAngle + 0.8) * Math.sin(incRad + 0.15)
        const w1Z = (orbitScaleRadius + 1.2) * Math.sin(orbitAngle + 0.8) * Math.cos(incRad + 0.15)
        wingman1.position.set(w1X, w1Y, w1Z)
        wingman1.lookAt(0, 0, 0)

        // Wingman 2 position (Leading offset)
        const w2X = (orbitScaleRadius + 0.8) * Math.cos(orbitAngle - 0.7)
        const w2Y = (orbitScaleRadius + 0.8) * Math.sin(orbitAngle - 0.7) * Math.sin(incRad - 0.15)
        const w2Z = (orbitScaleRadius + 0.8) * Math.sin(orbitAngle - 0.7) * Math.cos(incRad - 0.15)
        wingman2.position.set(w2X, w2Y, w2Z)
        wingman2.lookAt(0, 0, 0)

        // Update Laser Crosslinks (OISL)
        laserGeo1.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
          satX, satY, satZ, w1X, w1Y, w1Z
        ]), 3))
        laserGeo1.attributes.position.needsUpdate = true

        laserGeo2.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
          satX, satY, satZ, w2X, w2Y, w2Z
        ]), 3))
        laserGeo2.attributes.position.needsUpdate = true

        // Ion thruster pulse
        ionPlume.scale.setScalar(1.0 + Math.sin(elapsed * 10) * 0.18)

        // Update circular trajectory track
        const posArr = orbitGeo.attributes.position.array as Float32Array
        for (let i = 0; i < orbitPointsCount; i++) {
          const theta = (i / (orbitPointsCount - 1)) * Math.PI * 2
          posArr[i * 3 + 0] = orbitScaleRadius * Math.cos(theta)
          posArr[i * 3 + 1] = orbitScaleRadius * Math.sin(theta) * Math.sin(incRad)
          posArr[i * 3 + 2] = orbitScaleRadius * Math.sin(theta) * Math.cos(incRad)
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
      
      {/* LEFT SIDEBAR: MISSION CONTROL & ASTRODYNAMIC TELEMETRY */}
      <div className="w-80 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs z-20">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Orbit className="w-4 h-4" /> NASA Blue Marble Engine
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">C2 THEATER VIEW</h1>
          <p className="text-[10px] text-slate-500 uppercase">Sun Flare, Moon &amp; Laser Crosslinks</p>
        </div>

        <div className="space-y-4">
          
          {/* Live Telemetry Channel */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Tactical Crosslink Telemetry</span>
              <span className="text-emerald-400 font-bold">100 GBPS LOCKED</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">MASTER LINK:</span><span className="text-emerald-400 font-bold">127 SGC</span></div>
            <div className="flex justify-between"><span className="text-slate-500">WINGMAN-1:</span><span className="text-cyan-400 font-bold">252 KM // ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-slate-500">WINGMAN-2:</span><span className="text-cyan-400 font-bold">184 KM // ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-slate-500">VELOCITY:</span><span className="text-white font-bold">{orbitalVelocity.toFixed(3)} km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">PERIOD:</span><span className="text-cyan-300 font-bold">{orbitalPeriodMin.toFixed(1)} min</span></div>
          </div>

          {/* Interactive Astrodynamics Sliders */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Orbit Geometry Solver
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">ALTITUDE:</span>
                <span className="text-white font-bold">{altitudeKm} km</span>
              </div>
              <input 
                type="range" 
                min="200" 
                max="35786" 
                step="50" 
                value={altitudeKm} 
                onChange={e => setAltitudeKm(Number(e.target.value))} 
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" 
              />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">INCLINATION:</span>
                <span className="text-cyan-300 font-bold">{inclinationDeg}°</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="98.5" 
                step="0.5" 
                value={inclinationDeg} 
                onChange={e => setInclinationDeg(Number(e.target.value))} 
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" 
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsPlaying(p => !p)}
                className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all ${
                  isPlaying 
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                    : "bg-emerald-600 text-white shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                }`}
              >
                {isPlaying ? "HOLD ORBIT" : "RESUME PROPAGATION"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER VIEWPORT: PHOTOREALISTIC 3D THEATER */}
      <div className="flex-1 h-full relative flex flex-col">
        
        {/* Top Tactical Glass Header (Video 00:10) */}
        <div className="absolute top-3 left-6 right-6 z-10 flex items-center justify-between font-mono text-[10px] text-slate-400 bg-slate-950/85 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold">FILE</span>
            <span>EDIT</span>
            <span>VIEW</span>
            <span className="text-cyan-400 font-bold">CONSTELLATION</span>
            <span>TOOLS</span>
            <span>HQ</span>
            <span className="text-emerald-400 font-bold">CONVERGENODES</span>
            <span>HELP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-bold">SATELLITE TELEMETRY - LOCKED</span>
          </div>
        </div>

        {/* Live Floating HUD Badges Anchored to Scene (Video 00:10 - 00:19) */}
        <div className="absolute top-20 left-1/3 z-10 font-mono text-[9px] bg-slate-950/85 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_12px_rgba(34,197,94,0.4)]">
          ● 127 SGC // SAT 012
        </div>
        <div className="absolute top-28 right-1/3 z-10 font-mono text-[9px] bg-slate-950/85 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_12px_rgba(34,197,94,0.4)]">
          ● 252 KM/S // LINK ACTIVE
        </div>

        {/* 3D WebGL Canvas */}
        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Telemetry Bar (Video 00:12 - 00:16) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold text-xs">CONSTELLATION FORMATION // OISL LASER CHANNELS ACTIVE</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SUN CORONA ANAMORPHIC FLARE</span>
            <span className="text-cyan-400 font-bold text-sm">ACTIVE LENS FLARE</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">LUNAR ORBIT COVARIANCE</span>
            <span className="text-emerald-400 font-bold text-sm">MOON TRACK LOCKED</span>
          </div>
        </div>
      </div>
    </div>
  )
}
