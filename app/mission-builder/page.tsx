"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import * as THREE from "three"
import { createHighFidelitySatellite } from "@/lib/cad"
import { 
  Calculator, Settings2, Save, Cpu, Rocket, 
  DollarSign, Scale, Zap, Layers, ShieldCheck 
} from "lucide-react"

type BusClass = "NANO" | "MICRO" | "ESPA" | "HEAVY"
type PayloadType = "OPTICAL" | "SAR" | "SIGINT" | "COMM"

export default function MissionBuilderPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Configuration State
  const [busClass, setBusClass] = useState<BusClass>("ESPA")
  const [payloadType, setPayloadType] = useState<PayloadType>("OPTICAL")
  const [redundancy, setRedundancy] = useState<"SINGLE" | "DUAL">("DUAL")
  const [saveState, setSaveState] = useState<"IDLE" | "SAVING" | "SUCCESS">("IDLE")

  // Dynamic Engine (Hardware Specifications)
  const getBusSpecs = (bus: BusClass) => {
    switch(bus) {
      case "NANO": return { massKg: 12, powerW: 45, costM: 1.5, scale: 0.3 }
      case "MICRO": return { massKg: 85, powerW: 150, costM: 8.0, scale: 0.6 }
      case "ESPA": return { massKg: 350, powerW: 800, costM: 25.0, scale: 1.0 }
      case "HEAVY": return { massKg: 1200, powerW: 3500, costM: 95.0, scale: 1.8 }
    }
  }

  const getPayloadSpecs = (payload: PayloadType) => {
    switch(payload) {
      case "OPTICAL": return { massKg: 80, powerW: 120, costM: 15.0 }
      case "SAR": return { massKg: 250, powerW: 1200, costM: 45.0 }
      case "SIGINT": return { massKg: 150, powerW: 400, costM: 35.0 }
      case "COMM": return { massKg: 120, powerW: 800, costM: 20.0 }
    }
  }

  const busSpecs = getBusSpecs(busClass)
  const payloadSpecs = getPayloadSpecs(payloadType)
  
  const redundancyMult = redundancy === "DUAL" ? 1.4 : 1.0
  const totalDryMass = (busSpecs.massKg + payloadSpecs.massKg) * redundancyMult
  const totalPower = busSpecs.powerW + payloadSpecs.powerW
  const estimatedCostM = (busSpecs.costM + payloadSpecs.costM) * redundancyMult
  const launchMarginPct = ((10000 - totalDryMass) / 10000) * 100

  const handleSave = async () => {
    setSaveState("SAVING")
    try {
      const payload = {
        designation: `VXO-${busClass}-${payloadType}`,
        orbitRegime: "LEO",
        dryMassKg: totalDryMass,
        totalPowerW: totalPower,
        estimatedCostM: estimatedCostM
      }
      
      const res = await fetch('/api/v1/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        setSaveState("SUCCESS")
        setTimeout(() => setSaveState("IDLE"), 3000)
      } else {
        setSaveState("IDLE")
      }
    } catch (e) {
      setSaveState("IDLE")
    }
  }

  // 3D CAD Visualizer
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100)
    camera.position.set(3, 2, 4)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Studio Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 2.0))
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0)
    dirLight.position.set(5, 5, 5)
    scene.add(dirLight)
    const backLight = new THREE.DirectionalLight(0x38bdf8, 2.0)
    backLight.position.set(-5, -5, -5)
    scene.add(backLight)
    scene.add(new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a))

    const scGroup = new THREE.Group()
    const satGroup = createHighFidelitySatellite(busSpecs.scale)
    scGroup.add(satGroup)
    scene.add(scGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      scGroup.rotation.y += 0.005
      scGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.1
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
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); renderer.dispose() }
  }, [busClass, payloadType, totalPower, busSpecs.scale])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Settings2 className="w-5 h-5 text-emerald-400" /> System Architecture
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-1 uppercase tracking-wider">Parametric Cost &amp; Mass Modeling</p>
        </div>
        <div className="space-y-8 font-mono text-xs">
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Chassis Class
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["NANO", "MICRO", "ESPA", "HEAVY"] as BusClass[]).map(b => (
                <button key={b} onClick={() => setBusClass(b)} className={`py-2 rounded border transition-all ${busClass === b ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 font-bold" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"}`}>{b}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-fuchsia-400" /> Primary Payload
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["OPTICAL", "SAR", "SIGINT", "COMM"] as PayloadType[]).map(p => (
                <button key={p} onClick={() => setPayloadType(p)} className={`py-2 rounded border transition-all ${payloadType === p ? "bg-fuchsia-950/50 border-fuchsia-500 text-fuchsia-400 font-bold" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-amber-400" /> Avionics Redundancy
            </label>
            <div className="flex bg-slate-900 rounded border border-slate-800 p-1">
              {(["SINGLE", "DUAL"] as const).map(r => (
                <button key={r} onClick={() => setRedundancy(r)} className={`flex-1 py-1.5 rounded transition-all ${redundancy === r ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}>{r} STRING</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div ref={mountRef} className="flex-1 w-full cursor-move" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl shadow-2xl">
          <button 
            onClick={handleSave}
            disabled={saveState !== "IDLE"}
            className={`px-6 py-2 rounded-lg font-black tracking-widest text-sm uppercase transition-all flex items-center gap-2 ${
              saveState === "SUCCESS" 
                ? "bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)]" 
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            }`}
          >
            {saveState === "IDLE" && <><Save className="w-4 h-4" /> Save Architecture</>}
            {saveState === "SAVING" && <><Cpu className="w-4 h-4 animate-spin" /> Committing...</>}
            {saveState === "SUCCESS" && <><ShieldCheck className="w-4 h-4" /> Architecture Saved</>}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2"><Calculator className="w-4 h-4" /> System Budgets</h2>
        <div className="space-y-6">
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
            <div className="text-emerald-400/70 text-[10px] font-bold tracking-wider mb-1">ESTIMATED NRE + BUILD COST</div>
            <div className="text-3xl font-black text-emerald-400 flex items-center"><DollarSign className="w-6 h-6" />{estimatedCostM.toFixed(1)}M</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-slate-400 font-bold tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-2"><Scale className="w-3.5 h-3.5" /> MASS BUDGET</span><span className="text-white">{totalDryMass.toFixed(0)} kg</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between"><span>Bus Structure</span><span>{busClass === "NANO" ? 12 : busClass === "MICRO" ? 85 : busClass === "ESPA" ? 350 : 1200} kg</span></div>
              <div className="flex justify-between text-amber-400"><span>Redundancy Penalty</span><span>+{((totalDryMass) - ((busClass === "NANO" ? 12 : busClass === "MICRO" ? 85 : busClass === "ESPA" ? 350 : 1200) + (payloadType === "OPTICAL" ? 80 : payloadType === "SAR" ? 250 : payloadType === "SIGINT" ? 150 : 120))).toFixed(0)} kg</span></div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-slate-400 font-bold tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-3"><Rocket className="w-3.5 h-3.5 text-cyan-400" /> LAUNCH VEHICLE</div>
            <div className="flex justify-between items-center mb-1"><span className="text-white font-bold">FALCON 9 (SSO)</span><span className="text-emerald-400">{launchMarginPct.toFixed(1)}% MARGIN</span></div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2"><div className="h-full bg-cyan-500" style={{ width: `${100 - launchMarginPct}%` }} /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
