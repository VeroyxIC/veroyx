"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, ShieldCheck, ShieldAlert, Zap, Radio, 
  Activity, Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Crosshair, Target, Cpu, Signal, Lock, Flame, 
  Wind, Eye, Network, CheckCircle2, ArrowRight, Sparkles, Terminal 
} from "lucide-react"
import { createCinematicEarth, createDeepSpaceStarfield, createMilitarySatellite } from "@/components/three/CinematicSpaceEngine"

export default function NexusPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string>("VXO-01")

  const assets = [
    { id: "VXO-01", name: "Tactical Recon-1", tier: "LEO", alt: 510, inc: 97.4, status: "NOMINAL", health: 98, color: "#38bdf8" },
    { id: "SAR-02", name: "Aegis-SAR Radar", tier: "LEO", alt: 620, inc: 98.1, status: "ENGAGED", health: 74, color: "#f59e0b" },
    { id: "GPS-33", name: "Navstar GPS-III", tier: "MEO", alt: 20180, inc: 55.0, status: "NOMINAL", health: 99, color: "#10b981" },
    { id: "MIL-04", name: "Milstar Feeder-4", tier: "GEO", alt: 35786, inc: 0.1, status: "NOMINAL", health: 100, color: "#d946ef" }
  ]

  const activeAsset = assets.find(a => a.id === selectedAssetId) || assets[0]

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2500)
    camera.position.set(0, 24, 38)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
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

    // Multi-tier orbital shells
    const tiers = [
      { r: earthRadius + 2.2, color: 0x38bdf8 },
      { r: earthRadius + 5.5, color: 0x10b981 },
      { r: earthRadius + 10.5, color: 0xd946ef }
    ]
    tiers.forEach(t => {
      const ringGeo = new THREE.RingGeometry(t.r - 0.04, t.r + 0.04, 64)
      const ringMat = new THREE.MeshBasicMaterial({ color: t.color, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      scene.add(ring)
    })

    const { group: satGroup } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satGroup)

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      earthMesh.rotation.y += 0.05 * delta
      cloudsMesh.rotation.y += 0.075 * delta

      const r = earthRadius + 2.2
      satGroup.position.set(r * Math.cos(elapsed * 0.4), r * Math.sin(elapsed * 0.4) * 0.45, r * Math.sin(elapsed * 0.4) * 0.85)
      satGroup.lookAt(0, 0, 0)

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
  }, [selectedAssetId])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden select-none">
      
      {/* LEFT PANEL */}
      <div className="w-80 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Sparkles className="w-4 h-4" /> Grand Unified C2
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">COMMAND NEXUS</h1>
          <p className="text-[10px] text-slate-500 uppercase">Multi-Tier Space Domain Awareness</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold flex justify-between">
              <span>Active Tier Constellation</span>
              <span className="text-emerald-400 font-bold">100% HEALTH</span>
            </label>
            <div className="space-y-1.5">
              {assets.map(asset => {
                const isSelected = asset.id === selectedAssetId
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected ? "bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                        {asset.name}
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-cyan-300 font-mono">{asset.tier}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Alt: {asset.alt.toLocaleString()} km</div>
                    </div>
                    <span className="text-emerald-400 font-bold text-[10px]">{asset.health}%</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER VIEWPORT */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            Space Domain Awareness // Multi-Tier Tactical Focus
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">{activeAsset.name}</span>
            <span className="text-cyan-400 text-xs font-bold">[{activeAsset.tier} TIER // {activeAsset.alt.toLocaleString()} KM]</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">SDA PRODUCTION CAPACITY</span>
              <span className="text-white font-bold text-xs">109 PRODUCTION ROUTES COMPILED</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GLOBAL RADAR TRACK CUSTODY</span>
            <span className="text-emerald-400 font-bold text-sm">48,219 ORBITAL OBJECTS</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">AUTONOMOUS DEFENSE POSTURE</span>
            <span className="text-cyan-400 font-bold text-sm">MIL-STD-188 HARDENED</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-4 flex items-center gap-2 text-xs">
          <Activity className="w-4 h-4 text-cyan-400" /> Strategic Threat Bus
        </h2>

        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border bg-rose-950/30 border-rose-500/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-900 text-rose-200">CRITICAL</span>
              <span className="text-[10px] text-slate-500">11:42:05 UTC</span>
            </div>
            <div className="text-white font-bold text-[10px]">DEFENSE // /intercept</div>
            <p className="text-[10px] text-slate-400 mt-1">Direct-Ascent Kinetic ASAT launch detected from Kapustin Yar (T-140s).</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Specialized Tactical Decks</span>
            <Link href="/kill-chain" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>Space Kill-Chain JADC2</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </Link>
            <Link href="/catalog" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>48K Space-Track Catalog</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
