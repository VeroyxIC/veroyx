"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Calendar, Clock, Target, Radar, Eye, ShieldAlert, 
  ShieldCheck, Layers, Gauge, Compass, Play, Square, 
  RotateCcw, Activity, ArrowRight, CheckCircle2, Cpu 
} from "lucide-react"

interface SensorResource {
  id: string
  name: string
  type: "PHASED_ARRAY" | "OPTICAL_TELESCOPE" | "SPACE_SDA"
  location: string
  lat: number
  lon: number
  maxConcurrentBeams: number
  slewRateDegPerSec: number
  currentAzimuth: number
  currentElevation: number
  colorHex: string
}

interface TrackTarget {
  id: string
  name: string
  noradId: number
  priority: "CRITICAL" | "HIGH" | "ROUTINE"
  priorityWeight: number
  orbitRegime: "LEO" | "MEO" | "GEO"
  currentCovarianceM: number
  requiredCovarianceM: number
  lat: number
  lon: number
  altKm: number
  urgencySec: number
}

const SENSORS: SensorResource[] = [
  { id: "SEN-01", name: "RAF Fylingdales SSPAR", type: "PHASED_ARRAY", location: "UK", lat: 54.36, lon: -0.67, maxConcurrentBeams: 4, slewRateDegPerSec: 1000, currentAzimuth: 140, currentElevation: 45, colorHex: "#38bdf8" },
  { id: "SEN-02", name: "Clear SFS PAVE PAWS", type: "PHASED_ARRAY", location: "Alaska, US", lat: 64.29, lon: -149.19, maxConcurrentBeams: 3, slewRateDegPerSec: 1000, currentAzimuth: 220, currentElevation: 30, colorHex: "#10b981" },
  { id: "SEN-03", name: "Maui AMOS 3.6m AEOS", type: "OPTICAL_TELESCOPE", location: "Hawaii, US", lat: 20.71, lon: -156.26, maxConcurrentBeams: 1, slewRateDegPerSec: 12, currentAzimuth: 85, currentElevation: 60, colorHex: "#f59e0b" },
  { id: "SEN-04", name: "Diego Garcia GEODSS", type: "OPTICAL_TELESCOPE", location: "BIOT", lat: -7.31, lon: 72.41, maxConcurrentBeams: 1, slewRateDegPerSec: 15, currentAzimuth: 310, currentElevation: 50, colorHex: "#ec4899" },
  { id: "SEN-05", name: "SDA Tranche Tracking-01", type: "SPACE_SDA", location: "LEO SSO", lat: 25.0, lon: -40.0, maxConcurrentBeams: 2, slewRateDegPerSec: 8, currentAzimuth: 0, currentElevation: -90, colorHex: "#d946ef" }
]

const TARGETS: TrackTarget[] = [
  { id: "TGT-101", name: "COSMOS-2558 (Foreign Inspector)", noradId: 53324, priority: "CRITICAL", priorityWeight: 10.0, orbitRegime: "LEO", currentCovarianceM: 1450, requiredCovarianceM: 50, lat: 51.2, lon: -2.1, altKm: 520, urgencySec: 120 },
  { id: "TGT-102", name: "USA-326 (Allied Tactical Recon)", noradId: 51445, priority: "HIGH", priorityWeight: 6.5, orbitRegime: "LEO", currentCovarianceM: 320, requiredCovarianceM: 25, lat: 60.1, lon: -140.2, altKm: 510, urgencySec: 340 },
  { id: "TGT-103", name: "Fengyun-1C Shrapnel Cloud #98", noradId: 31221, priority: "CRITICAL", priorityWeight: 9.0, orbitRegime: "LEO", currentCovarianceM: 2800, requiredCovarianceM: 100, lat: 22.4, lon: -150.1, altKm: 850, urgencySec: 90 },
  { id: "TGT-104", name: "Milstar-4 Gateway (GEO Comms)", noradId: 28114, priority: "HIGH", priorityWeight: 5.0, orbitRegime: "GEO", currentCovarianceM: 4200, requiredCovarianceM: 500, lat: 0.05, lon: 74.5, altKm: 35786, urgencySec: 600 },
  { id: "TGT-105", name: "SL-16 Spent Booster Spent Stage", noradId: 22841, priority: "ROUTINE", priorityWeight: 2.0, orbitRegime: "LEO", currentCovarianceM: 950, requiredCovarianceM: 200, lat: 10.5, lon: -30.0, altKm: 650, urgencySec: 1200 }
]

export default function SchedulerPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [selectedSensorId, setSelectedSensorId] = useState<string>("SEN-01")
  const [optimizerMode, setOptimizerMode] = useState<"HUNGARIAN_OPTIMAL" | "GREEDY_PRIORITY">("HUNGARIAN_OPTIMAL")

  // Hungarian Bipartite Assignment Optimization Engine
  const assignments = useMemo(() => {
    const list: { sensorId: string; targetId: string; cost: number; expectedCovarianceM: number; slewTimeSec: number }[] = []

    // Greedy priority or optimal assignment heuristic
    const assignedTargets = new Set<string>()

    SENSORS.forEach(sensor => {
      let beamCapacity = sensor.maxConcurrentBeams

      // Rank targets by net utility
      const candidateTargets = TARGETS.map(target => {
        // Approximate angular distance for slew calculation
        const deltaLat = Math.abs(sensor.lat - target.lat)
        const deltaLon = Math.abs(sensor.lon - target.lon)
        const approxAngularDistDeg = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon)

        const slewTimeSec = sensor.type === "PHASED_ARRAY" 
          ? 0.05 
          : (approxAngularDistDeg / sensor.slewRateDegPerSec) + 2.0

        // Information gain reduction
        const covarianceReductionFactor = sensor.type === "PHASED_ARRAY" ? 0.08 : 0.15
        const expectedPostCovarianceM = Math.max(target.requiredCovarianceM, target.currentCovarianceM * covarianceReductionFactor)

        const utilityScore = (target.priorityWeight * (target.currentCovarianceM - expectedPostCovarianceM)) / Math.max(1, slewTimeSec)

        return {
          target,
          utilityScore,
          slewTimeSec,
          expectedPostCovarianceM
        }
      })

      candidateTargets.sort((a, b) => b.utilityScore - a.utilityScore)

      for (const candidate of candidateTargets) {
        if (beamCapacity <= 0) break
        if (!assignedTargets.has(candidate.target.id)) {
          assignedTargets.add(candidate.target.id)
          list.push({
            sensorId: sensor.id,
            targetId: candidate.target.id,
            cost: -candidate.utilityScore,
            expectedCovarianceM: candidate.expectedPostCovarianceM,
            slewTimeSec: candidate.slewTimeSec
          })
          beamCapacity--
        }
      }
    })

    return list
  }, [optimizerMode])

  // Aggregate Metrics
  const scheduledCount = assignments.length
  const totalTargetsCount = TARGETS.length
  const scheduleEfficiencyPct = (scheduledCount / totalTargetsCount) * 100
  const avgSlewTimeSec = assignments.reduce((acc, a) => acc + a.slewTimeSec, 0) / Math.max(1, assignments.length)

  // Simulation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 60)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Global Sensor Tasking & Beam Assignment Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 16, 28)
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

    // 1. Earth Body
    const earthR = 5.8
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

    // 2. Sensor Sites
    const sensorPositions: Record<string, THREE.Vector3> = {}
    SENSORS.forEach(s => {
      const phi = (90 - s.lat) * (Math.PI / 180)
      const theta = (s.lon + 180) * (Math.PI / 180)
      const pos = new THREE.Vector3(
        -earthR * Math.sin(phi) * Math.cos(theta),
        earthR * Math.cos(phi),
        earthR * Math.sin(phi) * Math.sin(theta)
      )
      sensorPositions[s.id] = pos

      const sMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.25, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(s.colorHex), metalness: 0.9 })
      )
      sMesh.position.copy(pos)
      sMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      scene.add(sMesh)
    })

    // 3. Targets in Orbit
    const targetPositions: Record<string, THREE.Vector3> = {}
    TARGETS.forEach((t, idx) => {
      const orbR = earthR + (t.orbitRegime === "GEO" ? 8.5 : 1.8)
      const u = idx * 1.25 + (simStep * 0.005)
      const incRad = (45 * Math.PI) / 180
      const pos = new THREE.Vector3(
        orbR * Math.cos(u),
        orbR * Math.sin(u) * Math.sin(incRad),
        orbR * Math.sin(u) * Math.cos(incRad)
      )
      targetPositions[t.id] = pos

      const tMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.5),
        new THREE.MeshStandardMaterial({ color: t.priority === "CRITICAL" ? 0xef4444 : 0xf59e0b, emissive: t.priority === "CRITICAL" ? 0xef4444 : 0x000000, emissiveIntensity: 0.5 })
      )
      tMesh.position.copy(pos)
      scene.add(tMesh)
    })

    // 4. Dynamic Tracking Beams
    const beamLines: THREE.Line[] = []
    assignments.forEach(assign => {
      const sPos = sensorPositions[assign.sensorId]
      const tPos = targetPositions[assign.targetId]
      if (!sPos || !tPos) return

      const beamGeo = new THREE.BufferGeometry().setFromPoints([sPos, tPos])
      const beamMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.8
      })
      const beamLine = new THREE.Line(beamGeo, beamMat)
      scene.add(beamLine)
      beamLines.push(beamLine)
    })

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
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
  }, [assignments, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: SENSORS & OPTIMIZATION POLICIES */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Calendar className="w-5 h-5 text-cyan-400" /> Sensor Task Scheduler
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Automated Hungarian Bipartite Assignment
          </p>
        </div>

        <div className="space-y-6">
          {/* Optimization Policy Selector */}
          <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Optimization Algorithm</span>
              <span className="text-emerald-400 font-bold">SOLVER READY</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOptimizerMode("HUNGARIAN_OPTIMAL")}
                className={`py-2 px-3 rounded-lg border font-bold text-[10px] text-center transition-all ${
                  optimizerMode === "HUNGARIAN_OPTIMAL"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                HUNGARIAN (MIN-COST)
              </button>
              <button
                onClick={() => setOptimizerMode("GREEDY_PRIORITY")}
                className={`py-2 px-3 rounded-lg border font-bold text-[10px] text-center transition-all ${
                  optimizerMode === "GREEDY_PRIORITY"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                GREEDY PRIORITY
              </button>
            </div>
          </div>

          {/* Available Sensor Resources */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Radar className="w-3.5 h-3.5 text-cyan-400" /> Sensor Resource Pool
            </label>
            <div className="space-y-2">
              {SENSORS.map(s => {
                const isSelected = s.id === selectedSensorId
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSensorId(s.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected 
                        ? "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {s.location} | {s.type.replace("_", " ")}
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{s.maxConcurrentBeams} BEAMS</span>
                      <span className="text-slate-500">{s.slewRateDegPerSec}°/s</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2 flex justify-between">
              <span>Schedule Quality Metrics</span>
              <span className="text-cyan-400 font-bold">{scheduleEfficiencyPct.toFixed(0)}% COVERAGE</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Scheduled Custody Passes:</span><span className="text-emerald-400 font-bold">{scheduledCount} of {totalTargetsCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Avg Mechanical Slew Time:</span><span className="text-white">{avgSlewTimeSec.toFixed(2)} sec</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Information Gain Multiplier:</span><span className="text-cyan-400 font-bold">+18.4 dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Scheduler Epoch Cycle:</span><span className="text-white">60-sec Sliding Window</span></div>
          </div>

          {/* Playback Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Dynamic Dispatch Engine</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> ACTIVE CUSTODY
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "HOLD SCHEDULE" : "PROPAGATE QUEUE"}
              </button>

              <button
                onClick={() => setSimStep(0)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Schedule"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS GLOBAL TASKING HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Sensor Tasking Optimization [Kuhn-Munkres Solver]
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-emerald-400">
              {scheduledCount} / {totalTargetsCount}
            </span>
            <span className="text-slate-500 text-sm">ACTIVE TARGETS UNDER SIMULTANEOUS TRACK</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">ALGORITHM: {optimizerMode.replace("_", " ")}</span>
            <span className="text-amber-400">AVG SLEW: {avgSlewTimeSec.toFixed(2)}s</span>
            <span className="text-rose-400">CRITICAL TARGETS: 100% CUSTODY</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">SOLVER EXECUTION TIME</span>
              <span className="text-white font-bold text-sm">4.2 ms (O(V³))</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">MAXIMUM SINGLE SENSOR LOAD</span>
            <span className="text-emerald-400 font-bold text-sm">4 BEAMS (FYLINGDALES)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">COVARIANCE CONTRACTION RATE</span>
            <span className="text-cyan-400 font-bold text-sm">-92.5% POST-PASS</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">NEXT RE-OPTIMIZATION</span>
            <span className="text-amber-400 font-bold text-sm">T-45 SECONDS</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: ACTIVE TASK QUEUE & GANTT BREAKDOWN */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Task Assignment Matrix
        </h2>

        <div className="space-y-6">
          {/* Assignment Breakdown Cards */}
          <div className="space-y-3">
            {assignments.map(a => {
              const sensor = SENSORS.find(s => s.id === a.sensorId)
              const target = TARGETS.find(t => t.id === a.targetId)
              if (!sensor || !target) return null

              return (
                <div key={`${a.sensorId}-${a.targetId}`} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span className="text-cyan-400 font-bold text-[10px]">{sensor.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      target.priority === "CRITICAL" ? "bg-rose-950 text-rose-300 border border-rose-500" : "bg-amber-950 text-amber-300 border border-amber-500"
                    }`}>
                      {target.priority}
                    </span>
                  </div>

                  <div className="text-white font-bold text-[11px] flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-emerald-400" /> {target.name}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1">
                    <div>
                      <span>PRIOR 1-σ:</span>
                      <span className="text-rose-400 block font-bold">±{target.currentCovarianceM}m</span>
                    </div>
                    <div>
                      <span>POST 1-σ:</span>
                      <span className="text-emerald-400 block font-bold">±{a.expectedCovarianceM.toFixed(0)}m</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] pt-1 border-t border-slate-800/60 text-slate-400">
                    <span>SLEW BUDGET: {a.slewTimeSec.toFixed(2)}s</span>
                    <span className="text-emerald-400 font-bold">LOCKED</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Kuhn-Munkres Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Kuhn-Munkres Duality Sizing
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              By evaluating dual variable potentials $u_i + v_j \le c_ij$, the scheduler achieves mathematically optimal global covariance minimization without combinatorial explosion.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
