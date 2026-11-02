"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Orbit, Crosshair, Radio, ShieldAlert, ShieldCheck, 
  Activity, Layers, Gauge, Compass, Play, Square, 
  RotateCcw, Globe, Terminal, ArrowRight, Zap, Eye, Satellite 
} from "lucide-react"
import { createCinematicEarth, createMilitarySatellite, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

export default function C2TacticalPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<string>("VXO-01")
  const [simStep, setSimStep] = useState<number>(0)

  const tracks = [
    { id: "VXO-01", name: "Tactical Optical Recon", orbit: "LEO 510 km", status: "NOMINAL", lat: 48.2, lon: 35.4, inc: 97.4, color: "#38bdf8" },
    { id: "SAR-02", name: "Aegis High-Res Radar", orbit: "LEO 620 km", status: "ENGAGED", lat: 51.5, lon: 30.2, inc: 98.1, color: "#f59e0b" },
    { id: "INSP-03", name: "COSMOS-2558 Co-Orbital", orbit: "LEO 512 km", status: "HOSTILE DRIFT", lat: 48.1, lon: 35.1, inc: 97.4, color: "#ef4444" },
    { id: "MIL-04", name: "Milstar Feeder-4", orbit: "GEO 35,786 km", status: "NOMINAL", lat: 0.1, lon: -45.0, inc: 0.1, color: "#d946ef" }
  ]

  const active = tracks.find(t => t.id === selectedTrack) || tracks[0]

  useEffect(() => {
    const timer = setInterval(() => setSimStep(s => s + 1), 50)
    return () => clearInterval(timer)
  }, [])

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.4)
    sun.position.set(30, 25, 20)
    scene.add(sun)

    const starfield = createDeepSpaceStarfield(1200, 700)
    scene.add(starfield)

    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    const { group: satGroup } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = simStep * 0.008
      const r = earthRadius + 2.2
      satGroup.position.set(r * Math.cos(t), r * Math.sin(t) * 0.45, r * Math.sin(t) * 0.85)
      satGroup.lookAt(0, 0, 0)

      earthMesh.rotation.y += 0.0006
      cloudsMesh.rotation.y += 0.00085

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
  }, [selectedTrack, simStep])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden select-none">
      
      {/* LEFT PANEL */}
      <div className="w-80 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Orbit className="w-4 h-4" /> Space Operations Command
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">C2 BATTLE GLASS</h1>
          <p className="text-[10px] text-slate-500 uppercase">JSpOC Tactical Theater Operations</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold flex justify-between">
              <span>Custodial Track Roster</span>
              <span className="text-emerald-400 font-bold">4 ONLINE</span>
            </label>
            <div className="space-y-1.5">
              {tracks.map(t => {
                const isSelected = t.id === selectedTrack
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrack(t.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                        {t.name}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{t.id} | {t.orbit}</div>
                    </div>
                    <span className={`text-[9px] font-bold ${t.status === "HOSTILE DRIFT" ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                      {t.status}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Telemetry Telecommand Link</span>
              <span className="text-cyan-400 font-bold">CARRIER LOCKED</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Sub-Sat Lat:</span><span className="text-white font-bold">{active.lat}° N</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Sub-Sat Lon:</span><span className="text-white font-bold">{active.lon}° E</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Orbital Speed:</span><span className="text-emerald-400 font-bold">7.61 km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Inclination:</span><span className="text-cyan-400 font-bold">{active.inc}°</span></div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            Global Theater Operations // Live Optical Recon Focus
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">{active.name}</span>
            <span className="text-cyan-400 text-xs font-bold">[{active.id} // {active.orbit}]</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold text-xs">{active.name} TRACKED IN TACTICAL GLASS</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SDA CUSTODY</span>
            <span className="text-cyan-400 font-bold text-sm">USSF SPACE COMMAND</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">INTERCEPT READINESS</span>
            <span className="text-emerald-400 font-bold text-sm">WEAPONS ENGAGED</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-4 flex items-center gap-2 text-xs">
          <Activity className="w-4 h-4 text-cyan-400" /> Tactical Intelligence
        </h2>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Operational Regime</span>
              <span className="text-emerald-400 font-bold">NOMINAL</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Real-time space operations center battle glass fusing telemetry downlinks, SSN radar tracking, and autonomous intercept fire-control vectors.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Related Command Decks</span>
            <Link href="/kill-chain" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>Space Kill-Chain JADC2</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </Link>
            <Link href="/telecommand" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>CCSDS Telecommand Uplink</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
