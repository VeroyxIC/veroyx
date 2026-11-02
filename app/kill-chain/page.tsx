"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Crosshair, Target, ShieldAlert, ShieldCheck, Zap, Radio, 
  Activity, Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Flame, Cpu, Terminal, ArrowRight, CheckCircle2, 
  Eye, Signal, Skull, Sparkles 
} from "lucide-react"

type KillChainStage = "FIND" | "FIX" | "TRACK" | "TARGET" | "ENGAGE" | "ASSESS"
type ThreatScenario = "HYPERSONIC_SALVO" | "CO_ORBITAL_SWARM" | "DIRECT_ASCENT_ASAT" | "JAMMER_COMPLEX"

interface ThreatTarget {
  id: string
  name: string
  type: string
  priorityValue: number
  altitudeKm: number
  speedKms: number
  lat: number
  lon: number
  timeToImpactSec: number
  status: "DETECTED" | "TRACK_LOCKED" | "ENGAGED" | "DESTROYED"
  colorHex: string
}

interface DefectiveEffector {
  id: string
  name: string
  type: "DEW_ORBITAL_LASER" | "KINETIC_KILL_VEHICLE" | "GROUND_EW_JAMMER" | "CYBER_EXPLOIT"
  rangeKm: number
  pKillNominal: number
  slewRateSec: number
  ammoRemaining: number
  status: "READY" | "SLEWING" | "FIRING" | "COOLDOWN"
  colorHex: string
}

const SCENARIOS: Record<ThreatScenario, { name: string; description: string; threats: ThreatTarget[] }> = {
  "HYPERSONIC_SALVO": {
    name: "Hypersonic Wave Salvo (Avangard / DF-ZF)",
    description: "Multi-axis non-Keplerian glide vehicles skimming upper mesosphere at Mach 18.2.",
    threats: [
      { id: "T-01", name: "HGV-Alpha (Mach 18.2)", type: "Waverider Glide", priorityValue: 95, altitudeKm: 48, speedKms: 5.6, lat: 52.0, lon: 36.0, timeToImpactSec: 145, status: "DETECTED", colorHex: "#ef4444" },
      { id: "T-02", name: "HGV-Bravo (Mach 17.5)", type: "Waverider Glide", priorityValue: 90, altitudeKm: 52, speedKms: 5.4, lat: 48.5, lon: 42.0, timeToImpactSec: 180, status: "DETECTED", colorHex: "#f59e0b" },
      { id: "T-03", name: "HGV-Charlie (Mach 19.0)", type: "Skip-Glide Reentry", priorityValue: 100, altitudeKm: 44, speedKms: 5.9, lat: 55.0, lon: 30.5, timeToImpactSec: 110, status: "DETECTED", colorHex: "#dc2626" }
    ]
  },
  "CO_ORBITAL_SWARM": {
    name: "Co-Orbital ASAT Swarm (LEO 550 km)",
    description: "Hostile inspector micro-satellites closing into high-value allied reconnaissance corridors.",
    threats: [
      { id: "T-11", name: "Cosmos-Killer-1", type: "Co-Orbital Chaser", priorityValue: 88, altitudeKm: 540, speedKms: 7.6, lat: 10.0, lon: -45.0, timeToImpactSec: 240, status: "DETECTED", colorHex: "#ef4444" },
      { id: "T-12", name: "Cosmos-Killer-2", type: "Proximity Rammer", priorityValue: 85, altitudeKm: 560, speedKms: 7.5, lat: 14.0, lon: -50.0, timeToImpactSec: 290, status: "DETECTED", colorHex: "#f59e0b" }
    ]
  },
  "DIRECT_ASCENT_ASAT": {
    name: "Suborbital SC-19 Direct-Ascent ASAT",
    description: "Solid-rocket booster lofting exoatmospheric hit-to-kill vehicle on allied radar flagship.",
    threats: [
      { id: "T-21", name: "SC-19 Interceptor", type: "Kinetic ASAT", priorityValue: 100, altitudeKm: 320, speedKms: 4.8, lat: 46.2, lon: 74.5, timeToImpactSec: 95, status: "DETECTED", colorHex: "#ef4444" }
    ]
  },
  "JAMMER_COMPLEX": {
    name: "Integrated EW Ground Denial Grid",
    description: "Multi-station ground jammers executing wideband barrage against GPS constellation.",
    threats: [
      { id: "T-31", name: "Krasukha-4 Complex", type: "High-Power Ground Jammer", priorityValue: 75, altitudeKm: 0.2, speedKms: 0, lat: 44.5, lon: 34.0, timeToImpactSec: 600, status: "DETECTED", colorHex: "#d946ef" },
      { id: "T-32", name: "Zhitel R-330Zh", type: "Spot Jammer", priorityValue: 65, altitudeKm: 0.1, speedKms: 0, lat: 47.8, lon: 39.2, timeToImpactSec: 600, status: "DETECTED", colorHex: "#38bdf8" }
    ]
  }
}

const EFFECTORS: DefectiveEffector[] = [
  { id: "E-01", name: "HELIOS Orbital Laser (50 kW)", type: "DEW_ORBITAL_LASER", rangeKm: 850, pKillNominal: 0.94, slewRateSec: 2.5, ammoRemaining: 18, status: "READY", colorHex: "#00f0ff" },
  { id: "E-02", name: "Aegis SM-3 Block IIA KKV", type: "KINETIC_KILL_VEHICLE", rangeKm: 2500, pKillNominal: 0.91, slewRateSec: 6.0, ammoRemaining: 4, status: "READY", colorHex: "#10b981" },
  { id: "E-03", name: "Thor Airborne High-Power Microwave", type: "GROUND_EW_JAMMER", rangeKm: 450, pKillNominal: 0.82, slewRateSec: 1.0, ammoRemaining: 100, status: "READY", colorHex: "#d946ef" },
  { id: "E-04", name: "Cyber Counter-Command Node", type: "CYBER_EXPLOIT", rangeKm: 40000, pKillNominal: 0.78, slewRateSec: 0.5, ammoRemaining: 50, status: "READY", colorHex: "#f59e0b" }
]

export default function KillChainPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [scenarioKey, setScenarioKey] = useState<ThreatScenario>("HYPERSONIC_SALVO")
  const [currentStage, setCurrentStage] = useState<KillChainStage>("FIND")
  const [threats, setThreats] = useState<ThreatTarget[]>(SCENARIOS["HYPERSONIC_SALVO"].threats)
  const [activeEffectorId, setActiveEffectorId] = useState<string>("E-01")
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [autoEngageEnabled, setAutoEngageEnabled] = useState<boolean>(true)

  // Switch scenario
  const switchScenario = (key: ThreatScenario) => {
    setScenarioKey(key)
    setThreats(SCENARIOS[key].threats.map(t => ({ ...t, status: "DETECTED" })))
    setCurrentStage("FIND")
    setSimStep(0)
  }

  // Active target being processed
  const activeThreat = threats.find(t => t.status !== "DESTROYED") || threats[0]
  const activeEffector = EFFECTORS.find(e => e.id === activeEffectorId) || EFFECTORS[0]

  // Dynamic WTP Probability of Kill Engine
  const battleMetrics = useMemo(() => {
    const rangeKm = Math.sqrt(
      Math.pow((activeThreat.lat - 50) * 111, 2) + 
      Math.pow((activeThreat.lon - 35) * 80, 2) + 
      Math.pow(activeThreat.altitudeKm, 2)
    )

    // Range attenuation for effector
    const rangeFactor = Math.max(0.1, 1 - Math.pow(rangeKm / (activeEffector.rangeKm * 1.5), 2))
    const pKillEstimated = Number((activeEffector.pKillNominal * rangeFactor).toFixed(3))
    const timeToIntercept = Number(((rangeKm / (activeEffector.type === "DEW_ORBITAL_LASER" ? 300000 : 7.2)) + activeEffector.slewRateSec).toFixed(1))

    // Expected Value of Engagement: E = Threat_Value * P_kill
    const expectedValue = Math.round(activeThreat.priorityValue * pKillEstimated)
    const isLethalEngagement = pKillEstimated >= 0.75

    return {
      rangeKm: Math.round(rangeKm),
      pKillEstimated,
      timeToIntercept,
      expectedValue,
      isLethalEngagement
    }
  }, [activeThreat, activeEffector])

  // Automated F2T2EA State Machine Cycle
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setSimStep(s => s + 1)

      if (autoEngageEnabled) {
        setCurrentStage(prev => {
          if (prev === "FIND") return "FIX"
          if (prev === "FIX") return "TRACK"
          if (prev === "TRACK") return "TARGET"
          if (prev === "TARGET") return "ENGAGE"
          if (prev === "ENGAGE") {
            // Mark threat as neutralized
            setThreats(prevThreats => prevThreats.map(t => {
              if (t.id === activeThreat.id) return { ...t, status: "DESTROYED" }
              return t
            }))
            return "ASSESS"
          }
          if (prev === "ASSESS") return "FIND"
          return "FIND"
        })
      }
    }, 1800)

    return () => clearInterval(timer)
  }, [isPlaying, autoEngageEnabled, activeThreat.id])

  // 3D Three.js Tactical Globe & Multi-Effector Firing Vectors
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 14, 26)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.0)
    sun.position.set(25, 20, 15)
    scene.add(sun)

    // 1. Earth Body (Radius 5.5 units)
    const earthR = 5.5
    const earthGeo = new THREE.SphereGeometry(earthR, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.85,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 })
    const earthWire = new THREE.Mesh(new THREE.SphereGeometry(earthR * 1.005, 36, 18), wireMat)
    earth.add(earthWire)

    // 2. Allied Effector Satellite (Blue Orbital Platform)
    const effGroup = new THREE.Group()
    const effAltitudeUnits = earthR + 2.2
    effGroup.position.set(-3.2, effAltitudeUnits * 0.9, 1.5)
    scene.add(effGroup)

    const effMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9 })
    )
    effGroup.add(effMesh)

    // Effector Director Dish/Laser Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 })
    )
    barrel.rotation.z = Math.PI / 2
    barrel.position.set(0.4, 0, 0)
    effGroup.add(barrel)

    // 3. Threat Target Missile Meshes (Inbound Red Cones)
    const threatMeshes: THREE.Mesh[] = []
    const threatGroup = new THREE.Group()
    scene.add(threatGroup)

    threats.forEach(t => {
      const phi = (90 - t.lat) * (Math.PI / 180)
      const theta = (t.lon + 180) * (Math.PI / 180)
      const r = earthR + (t.altitudeKm / 6371) * earthR + 0.35

      const pos = new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      )

      const isDead = t.status === "DESTROYED"
      const tGeo = isDead ? new THREE.SphereGeometry(0.4, 8, 8) : new THREE.ConeGeometry(0.2, 0.8, 8)
      const tMat = new THREE.MeshStandardMaterial({
        color: isDead ? 0x64748b : new THREE.Color(t.colorHex),
        wireframe: isDead,
        emissive: isDead ? 0x000000 : new THREE.Color(t.colorHex),
        emissiveIntensity: 0.8
      })
      const tMesh = new THREE.Mesh(tGeo, tMat)
      tMesh.position.copy(pos)
      tMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      threatGroup.add(tMesh)
      threatMeshes.push(tMesh)
    })

    // 4. Active Directed Energy / Kinetic Firing Laser Beam
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const isFiring = currentStage === "ENGAGE" || currentStage === "ASSESS"
    const beamMat = new THREE.LineBasicMaterial({
      color: activeEffector.type === "DEW_ORBITAL_LASER" ? 0x00ffcc : 0xff9900,
      linewidth: 3,
      transparent: true,
      opacity: isFiring ? 0.95 : 0.0
    })
    const beamLine = new THREE.Line(beamGeo, beamMat)
    scene.add(beamLine)

    // 5. Impact Detonation Flare Particles
    const flareGeo = new THREE.SphereGeometry(0.65, 16, 16)
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: currentStage === "ASSESS" ? 0.9 : 0
    })
    const flareMesh = new THREE.Mesh(flareGeo, flareMat)
    scene.add(flareMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Aim Effector at Active Target
      if (threatMeshes.length > 0 && threatMeshes[0]) {
        const targetWorldPos = new THREE.Vector3()
        threatMeshes[0].getWorldPosition(targetWorldPos)
        effGroup.lookAt(targetWorldPos)

        // Update Laser Intercept Vector
        if (isFiring) {
          const effWorldPos = new THREE.Vector3()
          effGroup.getWorldPosition(effWorldPos)

          const posArr = new Float32Array([
            effWorldPos.x, effWorldPos.y, effWorldPos.z,
            targetWorldPos.x, targetWorldPos.y, targetWorldPos.z
          ])
          beamGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3))
          beamGeo.attributes.position.needsUpdate = true

          flareMesh.position.copy(targetWorldPos)
        }
      }

      earth.rotation.y += 0.0006

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
  }, [threats, activeEffector, currentStage, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: F2T2EA CYCLE & SCENARIO MANAGER */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Crosshair className="w-5 h-5 text-rose-500" /> Space Kill-Chain
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Automated JADC2 F2T2EA Battle Management Engine
          </p>
        </div>

        <div className="space-y-6">
          {/* Threat Scenario Selector */}
          <div className="space-y-2">
            <label className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-rose-400" /> Threat Engagement Scenario
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["HYPERSONIC_SALVO", "CO_ORBITAL_SWARM", "DIRECT_ASCENT_ASAT", "JAMMER_COMPLEX"] as ThreatScenario[]).map(sc => (
                <button
                  key={sc}
                  onClick={() => switchScenario(sc)}
                  className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                    scenarioKey === sc 
                      ? "bg-rose-950/60 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)]" 
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {sc.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* F2T2EA Kill-Chain Pipeline Progress Bar */}
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 pb-2 flex justify-between">
              <span>F2T2EA Autonomous Execution Cycle</span>
              <span className="text-cyan-400 font-bold">CYCLE #{simStep}</span>
            </div>

            <div className="grid grid-cols-6 gap-1 text-center font-mono text-[9px]">
              {(["FIND", "FIX", "TRACK", "TARGET", "ENGAGE", "ASSESS"] as KillChainStage[]).map((stage, idx) => {
                const isActive = currentStage === stage
                return (
                  <div
                    key={stage}
                    className={`py-2 rounded border font-bold transition-all ${
                      isActive 
                        ? "bg-cyan-500 text-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse" 
                        : "bg-slate-950 border-slate-800 text-slate-500"
                    }`}
                  >
                    {idx + 1}. {stage}
                  </div>
                )
              })}
            </div>

            <div className="text-[10px] text-slate-400 pt-1 flex justify-between items-center">
              <span>STAGE STATUS:</span>
              <span className="text-white font-bold">
                {currentStage === "FIND" && "Overhead OPIR wide-angle scan detecting thermal plume"}
                {currentStage === "FIX" && "TDOA/FDOA multilateration establishing state vector"}
                {currentStage === "TRACK" && "SSN phased array locked in metric custody loop"}
                {currentStage === "TARGET" && "Hungarian solver allocated HELIOS 50 kW orbital laser"}
                {currentStage === "ENGAGE" && "Laser thermal dwell firing at stagnation cap (12 MW/m²)"}
                {currentStage === "ASSESS" && "Optical BDA confirms thermal breakup & loss of telemetry"}
              </span>
            </div>
          </div>

          {/* Assigned Effector Arsenal */}
          <div className="space-y-2">
            <label className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center justify-between">
              <span>Available Effector Arsenal</span>
              <span className="text-emerald-400 font-bold">WTP SOLVER READY</span>
            </label>
            <div className="space-y-1.5">
              {EFFECTORS.map(e => {
                const isSelected = e.id === activeEffectorId
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveEffectorId(e.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                        {e.name}
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {e.type.replace(/_/g, " ")} | Range: {e.rangeKm.toLocaleString()} km
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-emerald-400 font-bold block">{((e.pKillNominal * 100).toFixed(0))}% Pk</span>
                      <span className="text-slate-500">{e.ammoRemaining} SHOTS</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Automation Control Toggle */}
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Automated Engagement Servo</span>
              <button
                onClick={() => setAutoEngageEnabled(!autoEngageEnabled)}
                className={`px-2.5 py-1 rounded border text-[9px] font-bold ${
                  autoEngageEnabled ? "bg-emerald-950 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {autoEngageEnabled ? "AUTONOMOUS MODE" : "MANUAL AUTHORIZATION"}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                {isPlaying ? "HALT KILL-CHAIN" : "ENGAGE TARGET"}
              </button>

              <button
                onClick={() => switchScenario(scenarioKey)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Reset Scenario"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS TACTICAL HUD & ENGAGEMENT SOLUTION */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Target Engagement Solution [Weapon-Target Pairing]
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-rose-500">
              {activeThreat.name}
            </span>
            <span className="text-slate-500 text-sm">
              [{activeThreat.type} // {activeThreat.status}]
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-emerald-400">P(KILL): {((battleMetrics.pKillEstimated * 100).toFixed(1))}%</span>
            <span className="text-cyan-400">SLANT RANGE: {battleMetrics.rangeKm.toLocaleString()} km</span>
            <span className="text-amber-400">TIME TO INTERCEPT: {battleMetrics.timeToIntercept}s</span>
            <span className="text-rose-400">ENGAGEMENT VALUE: +{battleMetrics.expectedValue} PTS</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-rose-500" />
            <div>
              <span className="text-slate-500 block text-[9px]">ACTIVE WEAPON PAIRING</span>
              <span className="text-white font-bold text-sm">{activeEffector.name}</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ENGAGEMENT PIPELINE PHASE</span>
            <span className="text-cyan-400 font-bold text-sm">{currentStage} (STAGE {currentStage === "FIND" ? "1" : currentStage === "FIX" ? "2" : currentStage === "TRACK" ? "3" : currentStage === "TARGET" ? "4" : currentStage === "ENGAGE" ? "5" : "6"}/6)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">BATTLE DAMAGE ASSESSMENT</span>
            <span className={`text-sm font-bold ${activeThreat.status === "DESTROYED" ? "text-emerald-400" : "text-amber-400"}`}>
              {activeThreat.status === "DESTROYED" ? "CATASTROPHIC KILL (CONFIRMED)" : "ENGAGEMENT IN PROGRESS"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">COLLATERAL DEBRIS RISK</span>
            <span className="text-emerald-400 font-bold text-sm">&lt; 0.05% CASUALTY AREA</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: LIVE THREAT TRACK ROSTER & BDA DOSSIER */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Threat Intercept Roster
        </h2>

        <div className="space-y-6">
          {/* Active Threats Cards */}
          <div className="space-y-2">
            {threats.map(t => (
              <div 
                key={t.id} 
                className={`p-3.5 rounded-xl border transition-all ${
                  t.status === "DESTROYED" 
                    ? "bg-slate-950/40 border-slate-800 text-slate-500 line-through" 
                    : "bg-rose-950/20 border-rose-500/40 text-slate-200"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[11px] text-white">{t.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    t.status === "DESTROYED" ? "bg-slate-800 text-slate-400" : "bg-rose-950 text-rose-300 border border-rose-800"
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Speed: {t.speedKms} km/s</span>
                  <span>Alt: {t.altitudeKm} km</span>
                  <span className="text-rose-400 font-bold">Val: {t.priorityValue}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Engagement Mathematics Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Kill-Chain Solution Cascade</div>
            <div className="flex justify-between"><span className="text-slate-500">Threat Priority:</span><span className="text-rose-400 font-bold">CLASS 1 ({activeThreat.priorityValue} PTS)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Nominal Effector Pk:</span><span className="text-emerald-400 font-bold">{((activeEffector.pKillNominal * 100).toFixed(0))}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Slant Range Loss:</span><span className="text-amber-400 font-bold">-{(Math.abs(1 - battleMetrics.pKillEstimated / activeEffector.pKillNominal) * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Fire-Control Latency:</span><span className="text-white">12.4 ms (LEO OISL)</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">NET PROBABILITY:</span><span className="text-emerald-400">{((battleMetrics.pKillEstimated * 100).toFixed(1))}% Pk</span></div>
          </div>

          {/* JADC2 Doctrine Principle */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              JADC2 Automated Pairing
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              When threats enter the Engagement Zone, automated mixed-integer linear programming pairs available effectors to targets to minimize aggregate leakage probability. Fire commands execute without human latency, while preserving manual abort override authority.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
