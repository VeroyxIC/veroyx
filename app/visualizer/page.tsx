"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { Orbit, Activity, Globe } from "lucide-react"
import { 
  createCinematicEarth, createCrateredMoon, 
  createMilitarySatellite, createDeepSpaceStarfield 
} from "@/components/three/CinematicSpaceEngine"

export default function VisualizerPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.6)

  const paramsRef = useRef({ altitudeKm: 550, inclinationDeg: 51.6 })
  useEffect(() => {
    paramsRef.current = { altitudeKm, inclinationDeg }
  }, [altitudeKm, inclinationDeg])

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

    const starfield = createDeepSpaceStarfield(1600, 800)
    scene.add(starfield)

    // 1. Radiant Sun with Anamorphic Flare in Upper Left (Video 00:10)
    const sunLight = new THREE.DirectionalLight(0xfffaee, 4.0)
    sunLight.position.set(-28, 22, 14)
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.6))

    const sunGeo = new THREE.SphereGeometry(1.6, 32, 32)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const sunMesh = new THREE.Mesh(sunGeo, sunMat)
    sunMesh.position.set(-32, 26, 14)
    scene.add(sunMesh)

    const flareLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-45, 26, 14),
      new THREE.Vector3(-19, 26, 14)
    ])
    const flareLineMat = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.85, linewidth: 3 })
    const flareLine = new THREE.Line(flareLineGeo, flareLineMat)
    scene.add(flareLine)

    // 2. NASA Blue Marble Earth
    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // 3. Cratered Moon in Upper Right
    const moonMesh = createCrateredMoon(1.4)
    moonMesh.position.set(18, 12, -22)
    scene.add(moonMesh)

    // 4. Primary Satellite & Wingmen Formation
    const { group: satGroup, plume: ionPlume } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satGroup)
    const { group: wingman1 } = createMilitarySatellite({ scale: 0.35 })
    scene.add(wingman1)
    const { group: wingman2 } = createMilitarySatellite({ scale: 0.35 })
    scene.add(wingman2)

    // 5. Neon-Green Laser Crosslinks (OISL)
    const laserMat = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2.5, transparent: true, opacity: 0.9 })
    const laserGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const laserLine1 = new THREE.Line(laserGeo1, laserMat)
    scene.add(laserLine1)

    const laserGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const laserLine2 = new THREE.Line(laserGeo2, laserMat)
    scene.add(laserLine2)

    // Orbit Path Line
    const orbitPointsCount = 128
    const orbitGeo = new THREE.BufferGeometry()
    const orbitPositions = new Float32Array(orbitPointsCount * 3)
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65, linewidth: 2 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

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
      earthGroup.rotation.y += deltaX * 0.005
      earthGroup.rotation.x += deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(10.0, Math.min(42.0, camera.position.z + e.deltaY * 0.025))
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
      const { altitudeKm, inclinationDeg } = paramsRef.current

      orbitAngle += delta * 0.5
      earthMesh.rotation.y += 0.05 * delta
      cloudsMesh.rotation.y += 0.075 * delta

      const orbitScaleRadius = earthRadius + (altitudeKm / 6371) * earthRadius
      const incRad = (inclinationDeg * Math.PI) / 180

      const satX = orbitScaleRadius * Math.cos(orbitAngle)
      const satY = orbitScaleRadius * Math.sin(orbitAngle) * Math.sin(incRad)
      const satZ = orbitScaleRadius * Math.sin(orbitAngle) * Math.cos(incRad)

      satGroup.position.set(satX, satY, satZ)
      satGroup.lookAt(0, 0, 0)

      const w1X = (orbitScaleRadius + 1.2) * Math.cos(orbitAngle + 0.8)
      const w1Y = (orbitScaleRadius + 1.2) * Math.sin(orbitAngle + 0.8) * Math.sin(incRad + 0.2)
      const w1Z = (orbitScaleRadius + 1.2) * Math.sin(orbitAngle + 0.8) * Math.cos(incRad + 0.2)
      wingman1.position.set(w1X, w1Y, w1Z)
      wingman1.lookAt(0, 0, 0)

      const w2X = (orbitScaleRadius + 0.8) * Math.cos(orbitAngle - 0.7)
      const w2Y = (orbitScaleRadius + 0.8) * Math.sin(orbitAngle - 0.7) * Math.sin(incRad - 0.2)
      const w2Z = (orbitScaleRadius + 0.8) * Math.sin(orbitAngle - 0.7) * Math.cos(incRad - 0.2)
      wingman2.position.set(w2X, w2Y, w2Z)
      wingman2.lookAt(0, 0, 0)

      laserGeo1.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        satX, satY, satZ, w1X, w1Y, w1Z
      ]), 3))
      laserGeo1.attributes.position.needsUpdate = true

      laserGeo2.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        satX, satY, satZ, w2X, w2Y, w2Z
      ]), 3))
      laserGeo2.attributes.position.needsUpdate = true

      ionPlume.scale.setScalar(1.0 + Math.sin(elapsed * 6) * 0.15)

      const posArr = orbitGeo.attributes.position.array as Float32Array
      for (let i = 0; i < orbitPointsCount; i++) {
        const theta = (i / (orbitPointsCount - 1)) * Math.PI * 2
        posArr[i * 3 + 0] = orbitScaleRadius * Math.cos(theta)
        posArr[i * 3 + 1] = orbitScaleRadius * Math.sin(theta) * Math.sin(incRad)
        posArr[i * 3 + 2] = orbitScaleRadius * Math.sin(theta) * Math.cos(incRad)
      }
      orbitGeo.attributes.position.needsUpdate = true

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
      
      <div className="w-80 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Orbit className="w-4 h-4" /> NASA Blue Marble Engine
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">C2 THEATER VIEW</h1>
          <p className="text-[10px] text-slate-500 uppercase">Sun Flare, Moon &amp; Laser Crosslinks</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Tactical Crosslink Telemetry</span>
              <span className="text-emerald-400 font-bold">100 GBPS LOCKED</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">MASTER LINK:</span><span className="text-emerald-400 font-bold">127 SGC</span></div>
            <div className="flex justify-between"><span className="text-slate-500">WINGMAN-1:</span><span className="text-cyan-400 font-bold">252 KM // ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-slate-500">WINGMAN-2:</span><span className="text-cyan-400 font-bold">184 KM // ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-slate-500">EARTH PHASE:</span><span className="text-white font-bold">DAYLIGHT GULF</span></div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">ALTITUDE:</span><span className="text-white font-bold">{altitudeKm} km</span></div>
              <input type="range" min="200" max="35786" step="50" value={altitudeKm} onChange={e => setAltitudeKm(Number(e.target.value))} className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">INCLINATION:</span><span className="text-cyan-300 font-bold">{inclinationDeg}°</span></div>
              <input type="range" min="0" max="98.5" step="0.5" value={inclinationDeg} onChange={e => setInclinationDeg(Number(e.target.value))} className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 h-full relative flex flex-col">
        {/* Aerospace Mission Control Header Glass (Video 00:10) */}
        <div className="absolute top-3 left-6 right-6 z-10 flex items-center justify-between font-mono text-[10px] text-slate-400 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur-md">
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

        {/* Live floating HUD badges (Video 00:10 - 00:19) */}
        <div className="absolute top-20 left-1/3 z-10 font-mono text-[9px] bg-slate-950/80 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_10px_rgba(34,197,94,0.4)]">
          ● 127 SGC // SAT 012
        </div>
        <div className="absolute top-28 right-1/3 z-10 font-mono text-[9px] bg-slate-950/80 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_10px_rgba(34,197,94,0.4)]">
          ● 252 KM/S // LINK ACTIVE
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
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
