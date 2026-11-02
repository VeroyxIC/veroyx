"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  AlertTriangle, ShieldAlert, ShieldCheck, Activity, Orbit, 
  Crosshair, Compass, Radio, Layers, Gauge, Zap, Target, RotateCcw, Play, Square 
} from "lucide-react"

type ConjunctionPreset = "COSMOS_FRAGMENT" | "FENGYUN_DEBRIS" | "IRIDIUM_HEAD_ON" | "CO_ORBITAL_INSPECTION"

interface ConjunctionSpec {
  name: string
  primarySat: string
  secondaryObj: string
  noradIdSecondary: number
  relativeVelocityKms: number
  nominalMissDistanceM: number
  radialSigmaM: number
  inTrackSigmaM: number
  crossTrackSigmaM: number
  hbrM: number
  regime: string
  colorHex: string
}

const PRESETS: Record<ConjunctionPreset, ConjunctionSpec> = {
  "COSMOS_FRAGMENT": {
    name: "Cosmos-2251 Lethal Fragment Intersect",
    primarySat: "VXO-1 Tactical Recon (LEO)",
    secondaryObj: "COSMOS 2251 DEB (#34185)",
    noradIdSecondary: 34185,
    relativeVelocityKms: 14.2,
    nominalMissDistanceM: 85,
    radialSigmaM: 18,
    inTrackSigmaM: 180,
    crossTrackSigmaM: 45,
    hbrM: 4.5,
    regime: "780 km Sun-Sync LEO",
    colorHex: "#ef4444"
  },
  "FENGYUN_DEBRIS": {
    name: "FY-1C ASAT Hypervelocity Shrapnel",
    primarySat: "Aegis-SAR Operational Bus",
    secondaryObj: "FENGYUN 1C DEB (#30284)",
    noradIdSecondary: 30284,
    relativeVelocityKms: 12.8,
    nominalMissDistanceM: 240,
    radialSigmaM: 25,
    inTrackSigmaM: 320,
    crossTrackSigmaM: 65,
    hbrM: 6.0,
    regime: "845 km Polar LEO",
    colorHex: "#f59e0b"
  },
  "IRIDIUM_HEAD_ON": {
    name: "Commercial Defunct Cross-Track Mesh",
    primarySat: "VXO-Comms Gateway Alpha",
    secondaryObj: "IRIDIUM 33 DEB (#33842)",
    noradIdSecondary: 33842,
    relativeVelocityKms: 15.1,
    nominalMissDistanceM: 45,
    radialSigmaM: 12,
    inTrackSigmaM: 95,
    crossTrackSigmaM: 30,
    hbrM: 5.2,
    regime: "770 km LEO 86.4°",
    colorHex: "#d946ef"
  },
  "CO_ORBITAL_INSPECTION": {
    name: "Foreign Inspector Near-Field Drift",
    primarySat: "VXO-Defense Core",
    secondaryObj: "UNREGISTERED OBJECT (#99412)",
    noradIdSecondary: 99412,
    relativeVelocityKms: 0.85,
    nominalMissDistanceM: 380,
    radialSigmaM: 8,
    inTrackSigmaM: 40,
    crossTrackSigmaM: 15,
    hbrM: 3.5,
    regime: "550 km Low-Inclination",
    colorHex: "#38bdf8"
  }
}

export default function ConjunctionPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [preset, setPreset] = useState<ConjunctionPreset>("COSMOS_FRAGMENT")
  const [missDistanceM, setMissDistanceM] = useState(85)
  const [hardBodyRadiusM, setHardBodyRadiusM] = useState(4.5)
  const [radialSigmaM, setRadialSigmaM] = useState(18)
  const [inTrackSigmaM, setInTrackSigmaM] = useState(180)
  const [crossTrackSigmaM, setCrossTrackSigmaM] = useState(45)
  const [simTimeSec, setSimTimeSec] = useState(-30)
  const [isPlaying, setIsPlaying] = useState(true)

  const spec = PRESETS[preset]

  const sigmaX = crossTrackSigmaM
  const sigmaY = Math.sqrt(Math.pow(radialSigmaM, 2) + Math.pow(inTrackSigmaM * 0.15, 2))

  const effectiveSigma = Math.sqrt(sigmaX * sigmaY)
  const uParam = Math.pow(missDistanceM / effectiveSigma, 2)
  const hbrArea = Math.PI * Math.pow(hardBodyRadiusM, 2)
  
  const rawPc = (hbrArea / (2 * Math.PI * sigmaX * sigmaY)) * Math.exp(-0.5 * uParam)
  const collisionProbability = Math.max(1e-12, Math.min(0.999, rawPc))

  const isRedAlert = collisionProbability >= 1e-4
  const isYellowWatch = collisionProbability >= 1e-5 && collisionProbability < 1e-4

  const requiredColaDeltaVMs = Math.max(0.05, (500 - missDistanceM) * 0.00045)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSec(t => {
          if (t >= 30) {
            return -30
          }
          return t + 0.5
        })
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 16, 32)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.5)
    sun.position.set(20, 25, 20)
    scene.add(sun)

    const primaryGroup = new THREE.Group()
    scene.add(primaryGroup)

    const busGeo = new THREE.BoxGeometry(1.6, 1.6, 2.2)
    const busMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
    const bus = new THREE.Mesh(busGeo, busMat)
    primaryGroup.add(bus)

    const hbrScale = (hardBodyRadiusM / 10) * 3.5
    const hbrGeo = new THREE.SphereGeometry(hbrScale, 32, 16)
    const hbrMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    })
    const hbrMesh = new THREE.Mesh(hbrGeo, hbrMat)
    primaryGroup.add(hbrMesh)

    const bPlaneGeo = new THREE.RingGeometry(0.1, 14, 32)
    const bPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    })
    const bPlane = new THREE.Mesh(bPlaneGeo, bPlaneMat)
    bPlane.rotation.x = Math.PI / 2
    scene.add(bPlane)

    const covGroup = new THREE.Group()
    scene.add(covGroup)

    const covGeo = new THREE.SphereGeometry(1, 32, 16)
    const covMat = new THREE.MeshPhysicalMaterial({
      color: isRedAlert ? 0xef4444 : isYellowWatch ? 0xf59e0b : 0x10b981,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    })
    const covEllipsoid = new THREE.Mesh(covGeo, covMat)
    covEllipsoid.scale.set(
      Math.max(1.2, (crossTrackSigmaM / 40) * 3.5),
      Math.max(1.0, (radialSigmaM / 20) * 2.5),
      Math.max(2.5, (inTrackSigmaM / 100) * 6.5)
    )
    covGroup.add(covEllipsoid)

    const debrisGroup = new THREE.Group()
    scene.add(debrisGroup)

    const debrisMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9, roughness: 0.2 })
    )
    debrisGroup.add(debrisMesh)

    const trajLinePoints: THREE.Vector3[] = []
    const scaleMissX = (missDistanceM / 150) * 8
    for (let t = -40; t <= 40; t += 2) {
      const zPos = t * 0.8
      trajLinePoints.push(new THREE.Vector3(scaleMissX, 0, zPos))
    }
    const trajGeo = new THREE.BufferGeometry().setFromPoints(trajLinePoints)
    const trajMat = new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 0.6, gapSize: 0.3 })
    const trajLine = new THREE.Line(trajGeo, trajMat)
    trajLine.computeLineDistances()
    scene.add(trajLine)

    const missVecGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(scaleMissX, 0, 0)
    ])
    const missVecMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    const missVec = new THREE.Line(missVecGeo, missVecMat)
    scene.add(missVec)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const currentZ = simTimeSec * 0.8
      debrisGroup.position.set(scaleMissX, 0, currentZ)
      debrisMesh.rotation.x += 0.05
      debrisMesh.rotation.y += 0.03

      covGroup.position.set(scaleMissX, 0, 0)
      primaryGroup.rotation.y = Math.sin(Date.now() * 0.0004) * 0.05

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
  }, [missDistanceM, hardBodyRadiusM, radialSigmaM, inTrackSigmaM, crossTrackSigmaM, isRedAlert, isYellowWatch, simTimeSec])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Orbit className="w-5 h-5 text-rose-500" /> Conjunction Assessment
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Foster / Akella Collision Probability (Pc) Engine
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Operational CDM Threat Alert
            </label>
            <div className="space-y-2">
              {(["COSMOS_FRAGMENT", "FENGYUN_DEBRIS", "IRIDIUM_HEAD_ON", "CO_ORBITAL_INSPECTION"] as ConjunctionPreset[]).map(p => {
                const item = PRESETS[p]
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setPreset(p)
                      setMissDistanceM(item.nominalMissDistanceM)
                      setHardBodyRadiusM(item.hbrM)
                      setRadialSigmaM(item.radialSigmaM)
                      setInTrackSigmaM(item.inTrackSigmaM)
                      setCrossTrackSigmaM(item.crossTrackSigmaM)
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      preset === p 
                        ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.secondaryObj}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-rose-400 font-bold block">{item.nominalMissDistanceM} m</span>
                      <span className="text-slate-500">{item.relativeVelocityKms} km/s</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              B-Plane Geometry &amp; Covariances
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">MISS DISTANCE (TCA):</span>
                <span className="text-white font-bold">{missDistanceM} meters</span>
              </div>
              <input 
                type="range" min="5" max="600" step="5"
                value={missDistanceM}
                onChange={e => setMissDistanceM(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Critical (10 m)</span>
                <span>Threshold (150 m)</span>
                <span>Cleared (&gt;500 m)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">HARD-BODY RADIUS (HBR):</span>
                <span className="text-cyan-400 font-bold">{hardBodyRadiusM.toFixed(1)} m</span>
              </div>
              <input 
                type="range" min="1.0" max="15.0" step="0.5"
                value={hardBodyRadiusM}
                onChange={e => setHardBodyRadiusM(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">RADIAL UNCERTAINTY (1-σ):</span>
                <span className="text-emerald-400 font-bold">±{radialSigmaM} m</span>
              </div>
              <input 
                type="range" min="5" max="80" step="1"
                value={radialSigmaM}
                onChange={e => setRadialSigmaM(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">IN-TRACK UNCERTAINTY (1-σ):</span>
                <span className="text-amber-400 font-bold">±{inTrackSigmaM} m</span>
              </div>
              <input 
                type="range" min="30" max="600" step="10"
                value={inTrackSigmaM}
                onChange={e => setInTrackSigmaM(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Time to Closest Approach</span>
              <span className={`font-mono font-bold text-sm ${Math.abs(simTimeSec) <= 5 ? "text-rose-400 animate-pulse" : "text-cyan-400"}`}>
                TCA {simTimeSec > 0 ? `+${simTimeSec.toFixed(1)}s` : `${simTimeSec.toFixed(1)}s`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "FREEZE ENCOUNTER" : "RUN TCA SEQUENCE"}
              </button>

              <button
                onClick={() => setSimTimeSec(-30)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Approach"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Collision Probability (Foster / Akella 2D)</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isRedAlert ? "text-rose-400" : isYellowWatch ? "text-amber-400" : "text-emerald-400"}`}>
              {collisionProbability.toExponential(2)}
            </span>
            <span className="text-slate-500 text-sm">PROBABILITY (Pc)</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-white">MISS: {missDistanceM} m</span>
            <span className="text-rose-400">V_REL: {spec.relativeVelocityKms} km/s</span>
            <span className="text-cyan-400">HBR: {hardBodyRadiusM} m</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-rose-500" />
            <div>
              <span className="text-slate-500 block text-[9px]">ENCOUNTER CLASSIFICATION</span>
              <span className={`text-sm font-bold ${isRedAlert ? "text-rose-400 font-black animate-pulse" : isYellowWatch ? "text-amber-400" : "text-emerald-400"}`}>
                {isRedAlert ? "RED ALERT (Pc ≥ 1e-4) COLA REQ" : isYellowWatch ? "YELLOW WATCH (Pc ≥ 1e-5)" : "GREEN NOMINAL (Pc < 1e-5)"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">COV ELLIPSOID ENVELOPE</span>
            <span className="text-cyan-400 font-bold text-sm">±{radialSigmaM}m R x ±{crossTrackSigmaM}m C</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">REACTIVE COLA ΔV</span>
            <span className="text-amber-400 font-bold text-sm">{requiredColaDeltaVMs.toFixed(2)} m/s (RCS THRUST)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">KINETIC ENERGY THREAT</span>
            <span className="text-rose-400 font-bold text-sm">{(0.5 * 2.5 * Math.pow(spec.relativeVelocityKms * 1000, 2) / 1e6).toFixed(1)} MJ</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> CDM Telemetry
        </h2>

        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border ${isRedAlert ? "bg-rose-950/20 border-rose-500/40" : isYellowWatch ? "bg-amber-950/20 border-amber-500/40" : "bg-emerald-950/20 border-emerald-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              MISSION ASSURANCE PROTOCOL
            </div>
            <div className={`text-2xl font-black flex items-center gap-2 ${isRedAlert ? "text-rose-400" : isYellowWatch ? "text-amber-400" : "text-emerald-400"}`}>
              {isRedAlert ? <ShieldAlert className="w-6 h-6" /> : isYellowWatch ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              {isRedAlert ? "COLA BURN MANDATORY" : isYellowWatch ? "ELEVATED TRACKING" : "PASS REQUISITE"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isRedAlert 
                ? "Collision probability exceeds 1.0e-4 threshold. Execute retrograde Collision Avoidance (COLA) burn at least 1 orbit prior to TCA to expand miss distance beyond 5.0 km." 
                : isYellowWatch 
                ? "Probability within elevated risk watch window. Task dedicated radar/optical tracking nodes to shrink state covariance." 
                : "Conjunction within acceptable institutional risk bounds. No maneuvering required."}
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Conjunction Data Message (CDM)</div>
            <div className="flex justify-between"><span className="text-slate-500">Target Secondary:</span><span className="text-white font-bold">{spec.secondaryObj.split(" ")[0]}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">NORAD Catalog ID:</span><span className="text-amber-400 font-bold">#{spec.noradIdSecondary}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Encounter Regime:</span><span className="text-white">{spec.regime}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Relative Velocity:</span><span className="text-rose-400 font-bold">{spec.relativeVelocityKms} km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Encounter Angle:</span><span className="text-white">128.4° (Cross-Track)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Miss Distance:</span><span className="text-cyan-400 font-bold">{missDistanceM} m</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">CALCULATED Pc:</span><span className={isRedAlert ? "text-rose-400" : isYellowWatch ? "text-amber-400" : "text-emerald-400"}>{collisionProbability.toExponential(2)}</span></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              B-Plane Coordinate Projection
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              At hypervelocity encounters, relative velocity vector v_rel collapses 3D uncertainty into an instantaneous 2D encounter disk. The Foster method integrates bivariate Gaussian probability density across the hard-body circle R_A.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
