"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  ShieldAlert, Crosshair, Orbit, Radio, Globe, 
  Terminal, Activity, Sparkles, ArrowRight, Check, AlertTriangle
} from "lucide-react"
import { createCinematicEarth, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

interface TrackingStation {
  name: string
  status: "LOCKED" | "TRACKING" | "STANDBY"
  signal: number
}

export default function PlanetaryDefensePage() {
  const globeMountRef = useRef<HTMLDivElement | null>(null)
  const asteroidMountRef = useRef<HTMLDivElement | null>(null)

  const [betaCoupling, setBetaCoupling] = useState<number>(2.4)
  const [impactorVelocity, setImpactorVelocity] = useState<number>(122.6)
  const [deflectionDistanceKm, setDeflectionDistanceKm] = useState<number>(34.73)

  const stations: TrackingStation[] = [
    { name: "Goldstone DSN-14", status: "LOCKED", signal: 100 },
    { name: "Goldstone DSN-24", status: "LOCKED", signal: 100 },
    { name: "DART-2 Kinetic Probe", status: "TRACKING", signal: 94 },
    { name: "JWST Near-IR Task", status: "TRACKING", signal: 90 },
    { name: "Palomar Planetary Radar", status: "LOCKED", signal: 100 }
  ]

  // Main 3D Earth & Asteroid Orbital Plane Viewport (Image 4 Center)
  useEffect(() => {
    const container = globeMountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 10, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep-Space Background
    const starfield = createDeepSpaceStarfield(1400, 600)
    scene.add(starfield)

    const sun = new THREE.DirectionalLight(0xffffff, 3.5)
    sun.position.set(-20, 15, 10)
    scene.add(sun)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.4))

    // NASA Blue Marble Earth
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(4.8)
    scene.add(earthGroup)

    // Keplerian Asteroid Orbit Path (Red Elliptical Arc)
    const orbitPts: THREE.Vector3[] = []
    const a = 9.8, b = 6.2
    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * Math.PI * 2
      orbitPts.push(new THREE.Vector3(Math.cos(theta) * a - 2.5, Math.sin(theta) * 1.5, Math.sin(theta) * b))
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts)
    const orbitMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2, transparent: true, opacity: 0.85 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

    // Deflected Trajectory Arc (Cyan Dashed Line)
    const defPts: THREE.Vector3[] = []
    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * Math.PI * 2
      defPts.push(new THREE.Vector3(Math.cos(theta) * (a + 1.2) - 1.8, Math.sin(theta) * 2.1, Math.sin(theta) * (b + 0.8)))
    }
    const defGeo = new THREE.BufferGeometry().setFromPoints(defPts)
    const defMat = new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 0.4, gapSize: 0.2, linewidth: 2 })
    const defLine = new THREE.Line(defGeo, defMat)
    defLine.computeLineDistances()
    scene.add(defLine)

    // Orbit Nodes
    const nodeGeo = new THREE.SphereGeometry(0.18, 16, 16)
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    const nodePositions = [
      new THREE.Vector3(5.8, 1.2, 4.2),
      new THREE.Vector3(-4.8, -0.6, 5.1),
      new THREE.Vector3(-7.5, 0.4, -2.1),
      new THREE.Vector3(3.2, -1.1, -5.4)
    ]
    nodePositions.forEach(pos => {
      const node = new THREE.Mesh(nodeGeo, nodeMat)
      node.position.copy(pos)
      scene.add(node)
    })

    // Asteroid Particle Position Marker
    const astMarkerGeo = new THREE.SphereGeometry(0.25, 16, 16)
    const astMarkerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    const astMarker = new THREE.Mesh(astMarkerGeo, astMarkerMat)
    scene.add(astMarker)

    // Drag Orbit Controls
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
      camera.position.z = Math.max(12, Math.min(38, camera.position.z + e.deltaY * 0.02))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let animId: number
    let theta = 0

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      theta += delta * 0.35

      earthMesh.rotation.y += 0.05 * delta
      cloudsMesh.rotation.y += 0.07 * delta

      astMarker.position.set(Math.cos(theta) * a - 2.5, Math.sin(theta) * 1.5, Math.sin(theta) * b)
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

  // 3D Asteroid Model Viewport (Image 4 Bottom-Left Box)
  useEffect(() => {
    const container = asteroidMountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#020617")

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100)
    camera.position.set(0, 0, 4.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    const light = new THREE.DirectionalLight(0xffffff, 3.0)
    light.position.set(5, 5, 5)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0x1e293b, 1.2))

    // Irregular Asteroid Topography Geometry
    const astGeo = new THREE.DodecahedronGeometry(1.3, 3)
    const pos = astGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const noise = (Math.sin(v.x * 4.0) + Math.cos(v.y * 4.0) + Math.sin(v.z * 4.0)) * 0.12
      v.multiplyScalar(1.0 + noise)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    astGeo.computeVertexNormals()

    const astMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.88,
      metalness: 0.15,
      flatShading: true
    })
    const asteroidMesh = new THREE.Mesh(astGeo, astMat)
    scene.add(asteroidMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      asteroidMesh.rotation.y += 0.012
      asteroidMesh.rotation.x += 0.007
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 flex flex-col bg-[#01030a] font-mono text-xs text-slate-100 select-none overflow-hidden">
      
      {/* TOP INDUSTRIAL HEADER BAR (Image 4 Top) */}
      <div className="h-11 px-4 border-b border-slate-800 bg-[#020617] flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-black tracking-widest text-white uppercase text-sm">AERO-ORBITAL SYSTEM SIMULATOR</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            ASTEROID TRACKING <span className="text-slate-600">&gt;</span> DEFENSE MONITORING
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">DSN MULTI-UPLINK: ACTIVE</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            TORINO: 0 (SAFE)
          </span>
        </div>
      </div>

      {/* MAIN 3-COLUMN WORKSTATION VIEWPORT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CENTER VIEWPORT (The Earth, Asteroid Orbit, and 3D Crater Box) */}
        <div className="flex-1 h-full relative flex flex-col border-r border-slate-800">
          
          {/* Subheader Overlay */}
          <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] text-slate-300 backdrop-blur-md">
              <span className="text-rose-400 font-bold">ASTEROID 9942 APOS TRACK</span>
              <span className="mx-2 text-slate-600">|</span>
              <span>INCLINATION: 3.33° // ECCENTRICITY: 0.191</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] text-emerald-400 font-bold backdrop-blur-md">
              PERIHELION: 0.746 AU // APHELION: 1.098 AU
            </div>
          </div>

          {/* 3D Earth Orbit Scene Canvas */}
          <div ref={globeMountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

          {/* Floating Live HUD Badges on Orbit Plane */}
          <div className="absolute top-24 right-1/4 z-10 font-mono text-[9px] bg-slate-950/80 border border-rose-500/60 text-rose-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_10px_rgba(244,63,94,0.4)]">
            ● ASTEROID 9942 APOS // 31.42 km/s
          </div>
          <div className="absolute top-44 left-1/4 z-10 font-mono text-[9px] bg-slate-950/80 border border-cyan-500/60 text-cyan-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            ● DART-2 IMPACT NODE // Δv: 34.73 km/s
          </div>

          {/* 3D Cratered Asteroid Box in Lower Left (Image 4 Bottom-Left) */}
          <div className="absolute bottom-4 left-4 w-72 h-56 rounded-xl bg-slate-950/90 border border-slate-800 p-3 shadow-2xl backdrop-blur-xl z-10 flex flex-col">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1 flex justify-between">
              <span>ASTEROID 9942 APOS TRACK</span>
              <span className="text-amber-400">PBR SURFACE</span>
            </div>
            <div ref={asteroidMountRef} className="flex-1 w-full my-1 rounded-lg overflow-hidden bg-black/60 border border-slate-900" />
            <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400 font-mono">
              <div>VELOCITY: <span className="text-white font-bold">31.42 km/s</span></div>
              <div>DISTANCE: <span className="text-white font-bold">0.14 AU</span></div>
              <div>DIAMETER: <span className="text-white font-bold">~340m</span></div>
              <div>EST. MASS: <span className="text-white font-bold">2.52e10 kg</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT CONTROL DECK (Image 4 Right Columns) */}
        <div className="w-[480px] h-full flex flex-col bg-[#020617] overflow-y-auto">
          
          {/* Top Panel: Target Info & Impact Risk Evaluation */}
          <div className="p-4 border-b border-slate-800 grid grid-cols-2 gap-4">
            
            {/* Target Info */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">
                Target Info: APOS (9942)
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">TARGET:</span><span className="text-white font-bold">APOS (9942)</span></div>
                <div className="flex justify-between"><span className="text-slate-500">VELOCITY:</span><span className="text-amber-400 font-bold">31.42 km/s</span></div>
                <div className="flex justify-between"><span className="text-slate-500">DISTANCE:</span><span className="text-white">0.14 AU</span></div>
                <div className="flex justify-between"><span className="text-slate-500">DIAMETER:</span><span className="text-white">~340 m</span></div>
                <div className="flex justify-between"><span className="text-slate-500">EST. MASS:</span><span className="text-white">2.520 kg·e10</span></div>
                <div className="flex justify-between"><span className="text-slate-500">CONNECTION:</span><span className="text-emerald-400 font-bold">0.05 s</span></div>
              </div>
            </div>

            {/* Impact Risk Evaluation (Color Spectrum Curve) */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1 flex justify-between">
                <span>Impact Risk Evaluation</span>
                <span className="text-emerald-400 font-bold">0.00%</span>
              </div>
              <div className="h-16 w-full rounded-lg bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-600 p-0.5 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[#020617]/70 rounded-lg" />
                <div className="relative text-[9px] text-slate-300 font-bold text-center">
                  <div>PALERMO: -2.88</div>
                  <div className="text-emerald-400">NO TERRESTRIAL IMPACT</div>
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>PROBABILITY: 0%</span>
                <span>RISK: MINIMAL</span>
              </div>
            </div>
          </div>

          {/* Middle Panel: Deep Space Tracking Stations & Kinetic Impactor Modeling */}
          <div className="p-4 border-b border-slate-800 grid grid-cols-2 gap-4">
            
            {/* Tracking Stations Matrix */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">
                Tracking Stations
              </div>
              <div className="space-y-1.5">
                {stations.map(st => (
                  <div key={st.name} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-slate-900/60 border border-slate-800/80">
                    <div>
                      <div className="text-white font-bold">{st.name}</div>
                      <div className="text-[8px] text-emerald-400">{st.status}</div>
                    </div>
                    <span className="text-cyan-400 font-bold text-[9px]">{st.signal}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Defensive Action: DART Kinetic Impactor Modeling */}
            <div className="space-y-2.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1 flex justify-between">
                <span>Defensive Action (DART)</span>
                <span className="text-rose-400 font-bold">KINETIC</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">BETA COUPLING (β):</span>
                  <span className="text-cyan-400 font-bold">{betaCoupling.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.1"
                  value={betaCoupling}
                  onChange={e => setBetaCoupling(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">IMPACTOR SPEED:</span>
                  <span className="text-white font-bold">{impactorVelocity.toFixed(1)} km/s</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="1"
                  value={impactorVelocity}
                  onChange={e => setImpactorVelocity(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800/80 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">DEFLECTION Δv:</span>
                  <span className="text-cyan-300 font-bold">{(betaCoupling * (580 / 2.52e10) * impactorVelocity * 1000).toFixed(4)} mm/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MISS DISTANCE:</span>
                  <span className="text-emerald-400 font-bold">&gt;{deflectionDistanceKm.toFixed(2)} km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Panel: System Console (Image 4 Bottom-Right) */}
          <div className="p-4 flex-1 flex flex-col space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>System Console // Trajectory Stream</span>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-black border border-slate-800 text-[10px] font-mono text-emerald-400 space-y-1 overflow-y-auto">
              <div>[SYSTEM] Terminal initialization sequence OK...</div>
              <div>[EPHEMERIS] Asteroid 9942 Apophis state vector updated J2000.</div>
              <div>[RADAR] Goldstone 70m metric range: 21,563,892 km.</div>
              <div className="text-amber-400">[ALERT] Predicted close approach within 0.14 AU.</div>
              <div className="text-cyan-400">[DART-2] Kinetic impactor deflection solution locked: Beta={betaCoupling.toFixed(1)}.</div>
              <div className="text-slate-500">[STATUS] Trajectory offset active. Earth impact probability: 0.00%.</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
