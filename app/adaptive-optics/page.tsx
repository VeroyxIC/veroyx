"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Eye, Sparkles, Sliders, ShieldCheck, Activity, Gauge, 
  Play, Square, RotateCcw, AlertTriangle, Layers, Zap, 
  Crosshair, RefreshCw, Aperture, CircleDot, ArrowRight 
} from "lucide-react"

type ObservatorySite = "AMOS_MAUI" | "STARFIRE_SOR" | "PARANAL_VLT" | "LA_PALMA_WHT"

interface ObservatorySpec {
  name: string
  location: string
  altitudeM: number
  primaryApertureM: number
  nominalR0Cm: number
  laserBeamsCount: number
  actuatorCount: number
  loopRateHz: number
  wavelengthNm: number
  description: string
  colorHex: string
}

const OBSERVATORIES: Record<ObservatorySite, ObservatorySpec> = {
  "AMOS_MAUI": {
    name: "AMOS 3.67m AEOS Telescope",
    location: "Haleakala, Hawaii (3,055m)",
    altitudeM: 3055,
    primaryApertureM: 3.67,
    nominalR0Cm: 18.0,
    laserBeamsCount: 4,
    actuatorCount: 1600,
    loopRateHz: 2000,
    wavelengthNm: 850,
    description: "US Space Force prime deep-space optical surveillance platform resolving high-altitude orbital assets.",
    colorHex: "#38bdf8"
  },
  "STARFIRE_SOR": {
    name: "Starfire Optical Range 3.5m",
    location: "Kirtland AFB, New Mexico (1,900m)",
    altitudeM: 1900,
    primaryApertureM: 3.5,
    nominalR0Cm: 12.0,
    laserBeamsCount: 2,
    actuatorCount: 1024,
    loopRateHz: 1600,
    wavelengthNm: 750,
    description: "Air Force Research Laboratory advanced sodium laser guide star adaptive optics testbed.",
    colorHex: "#10b981"
  },
  "PARANAL_VLT": {
    name: "VLT 4LGSF 8.2m UT4 (Yepun)",
    location: "Cerro Paranal, Chile (2,635m)",
    altitudeM: 2635,
    primaryApertureM: 8.2,
    nominalR0Cm: 22.0,
    laserBeamsCount: 4,
    actuatorCount: 4096,
    loopRateHz: 2500,
    wavelengthNm: 1064,
    description: "Extreme adaptive optics facility projecting quad 22W 589nm sodium guide stars into the mesosphere.",
    colorHex: "#f59e0b"
  },
  "LA_PALMA_WHT": {
    name: "William Herschel 4.2m CANARY",
    location: "Roque de los Muchachos (2,396m)",
    altitudeM: 2396,
    primaryApertureM: 4.2,
    nominalR0Cm: 14.5,
    laserBeamsCount: 1,
    actuatorCount: 768,
    loopRateHz: 1200,
    wavelengthNm: 900,
    description: "Multi-object adaptive optics demonstrator measuring atmospheric turbulence tomography.",
    colorHex: "#d946ef"
  }
}

export default function AdaptiveOpticsPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [siteKey, setSiteKey] = useState<ObservatorySite>("AMOS_MAUI")
  const [friedParamR0Cm, setFriedParamR0Cm] = useState<number>(18.0)
  const [windSpeedMs, setWindSpeedMs] = useState<number>(18.5)
  const [actuatorDensity, setActuatorDensity] = useState<number>(32) // 32x32 array = ~1024 actuators
  const [closedLoopActive, setClosedLoopActive] = useState<boolean>(true)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = OBSERVATORIES[siteKey]

  // Adaptive Optics Physics Engine Calculations
  const calculations = useMemo(() => {
    const lambdaM = spec.wavelengthNm * 1e-9
    const r0M = friedParamR0Cm / 100
    const D = spec.primaryApertureM

    // Greenwood frequency f_G
    const fGreenwoodHz = 0.427 * (windSpeedMs / r0M)

    // Subaperture diameter d_act
    const dActM = D / actuatorDensity

    // 1. Deformable mirror fitting error (rad^2)
    const muDm = 0.28
    const sigmaFitSq = closedLoopActive ? muDm * Math.pow(dActM / r0M, 5 / 3) : 9.5

    // 2. Temporal delay error (rad^2)
    const sigmaTempSq = closedLoopActive ? Math.pow(fGreenwoodHz / spec.loopRateHz, 5 / 3) : 4.2

    // 3. Focal anisoplanatism (cone effect) error for 90 km mesosphere LGS
    const d0ConeM = 2.8 * Math.pow(r0M / 0.15, 1.0)
    const sigmaConeSq = closedLoopActive ? Math.pow(D / Math.max(0.5, d0ConeM * 4.5), 5 / 3) : 2.5

    // 4. Shack-Hartmann WFS noise variance
    const sigmaWfsSq = closedLoopActive ? 0.045 : 1.8

    // Total residual wavefront phase variance (rad^2)
    const sigmaTotalSq = closedLoopActive 
      ? sigmaFitSq + sigmaTempSq + sigmaConeSq + sigmaWfsSq 
      : 18.0

    // Residual RMS Wavefront Error in nanometers
    const rmsWfeNm = (Math.sqrt(sigmaTotalSq) * spec.wavelengthNm) / (2 * Math.PI)

    // Strehl Ratio via Maréchal Approximation
    const strehlRatio = Math.max(0.01, Math.min(0.96, Math.exp(-sigmaTotalSq)))

    // Angular Resolution
    const seeingResolutionArcsec = ((lambdaM / r0M) * 206265)
    const diffractionLimitArcsec = (1.22 * (lambdaM / D) * 206265)
    const effectiveResolutionArcsec = closedLoopActive 
      ? diffractionLimitArcsec * (1 / Math.sqrt(Math.max(0.1, strehlRatio)))
      : seeingResolutionArcsec

    // Resolvable Ground Sampling Distance (GSD) at 600 km LEO
    const resolvableFeatureCmLEO = Math.tan((effectiveResolutionArcsec / 3600) * (Math.PI / 180)) * 600000 * 100

    return {
      fGreenwoodHz,
      rmsWfeNm,
      strehlRatio,
      seeingResolutionArcsec,
      diffractionLimitArcsec,
      effectiveResolutionArcsec,
      resolvableFeatureCmLEO,
      isDiffractionLimited: strehlRatio >= 0.80
    }
  }, [spec, friedParamR0Cm, windSpeedMs, actuatorDensity, closedLoopActive])

  // Simulation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Optical Beam Director & Dynamic Wavefront Correction Scene
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
    const sun = new THREE.DirectionalLight(0xfffaed, 2.5)
    sun.position.set(20, 25, 20)
    scene.add(sun)

    // 1. Observatory Mount & Ground Base
    const baseGeo = new THREE.CylinderGeometry(4.2, 4.6, 2.0, 32)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.position.set(0, -6.5, 0)
    scene.add(baseMesh)

    // Primary Mirror
    const mirrorGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.4, 32)
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.98,
      roughness: 0.05
    })
    const mirrorMesh = new THREE.Mesh(mirrorGeo, mirrorMat)
    mirrorMesh.position.set(0, -5.2, 0)
    scene.add(mirrorMesh)

    // 2. Laser Guide Star Beacons (Continuous 589nm Sodium Laser Projection)
    const lgsGroup = new THREE.Group()
    scene.add(lgsGroup)

    const beamOffsets = [
      [-1.4, -1.4],
      [1.4, -1.4],
      [-1.4, 1.4],
      [1.4, 1.4]
    ]

    beamOffsets.slice(0, spec.laserBeamsCount).forEach(([ox, oz]) => {
      const beamGeo = new THREE.CylinderGeometry(0.04, 0.18, 22, 16)
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b, // 589 nm Sodium Amber Glow
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      })
      const lgsBeam = new THREE.Mesh(beamGeo, beamMat)
      lgsBeam.position.set(ox, 5.8, oz)
      lgsGroup.add(lgsBeam)

      // Sodium Layer Guide Star Spot at Mesosphere
      const spotGeo = new THREE.SphereGeometry(0.25, 16, 16)
      const spotMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, blending: THREE.AdditiveBlending })
      const spotMesh = new THREE.Mesh(spotGeo, spotMat)
      spotMesh.position.set(ox, 16.8, oz)
      lgsGroup.add(spotMesh)
    })

    // 3. Dynamic Wavefront Surface Map (Turbulent vs Corrected Phase Grid)
    const gridSize = 24
    const waveGeo = new THREE.PlaneGeometry(8, 8, gridSize - 1, gridSize - 1)
    waveGeo.rotateX(-Math.PI / 2)
    const waveMat = new THREE.MeshStandardMaterial({
      color: closedLoopActive ? 0x10b981 : 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    })
    const waveMesh = new THREE.Mesh(waveGeo, waveMat)
    waveMesh.position.set(0, -1.5, 0)
    scene.add(waveMesh)

    // 4. Resolved Point Spread Function (PSF) Target Plane in Focus
    const psfGeo = new THREE.SphereGeometry(closedLoopActive ? 0.35 : 1.6, 24, 24)
    const psfMat = new THREE.MeshBasicMaterial({
      color: closedLoopActive ? 0x00f0ff : 0xef4444,
      wireframe: !closedLoopActive,
      transparent: true,
      opacity: closedLoopActive ? 0.9 : 0.35
    })
    const psfMesh = new THREE.Mesh(psfGeo, psfMat)
    psfMesh.position.set(0, 1.5, 0)
    scene.add(psfMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Animate wavefront perturbations
      const posArr = waveGeo.attributes.position.array as Float32Array
      const t = simStep * 0.08
      const amp = closedLoopActive ? 0.08 : 0.65 // Amplitude collapsed by AO loop

      for (let i = 0; i < posArr.length; i += 3) {
        const x = posArr[i]
        const z = posArr[i + 2]
        posArr[i + 1] = Math.sin(x * 1.2 + t) * Math.cos(z * 1.2 + t) * amp +
                        Math.sin(x * 2.5 - t * 1.5) * (amp * 0.4)
      }
      waveGeo.attributes.position.needsUpdate = true

      // Slow rotation of telescope base
      mirrorMesh.rotation.y += 0.001

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
  }, [spec, closedLoopActive, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: OBSERVATORY PROFILES & OPTICAL TUNING */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Eye className="w-5 h-5 text-cyan-400" /> Adaptive Optics
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Laser Guide Star &amp; Atmospheric Turbulence SBM
          </p>
        </div>

        <div className="space-y-6">
          {/* Observatory Selection */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Space Surveillance Telescopes
            </label>
            <div className="space-y-2">
              {(["AMOS_MAUI", "STARFIRE_SOR", "PARANAL_VLT", "LA_PALMA_WHT"] as ObservatorySite[]).map(key => {
                const item = OBSERVATORIES[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSiteKey(key)
                      setFriedParamR0Cm(item.nominalR0Cm)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      siteKey === key 
                        ? "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.location} | {item.primaryApertureM}m Primary
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.laserBeamsCount}x 589nm LGS</span>
                      <span className="text-slate-500">{item.loopRateHz} Hz Loop</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Turbulence & Deformable Mirror Controls */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Atmospheric Boundary Layer (HV 5/7)</span>
              <span className="text-amber-400 font-bold">fG = {calculations.fGreenwoodHz.toFixed(1)} Hz</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">FRIED PARAMETER (r0):</span>
                <span className="text-cyan-400 font-bold">{friedParamR0Cm.toFixed(1)} cm (@ 500nm)</span>
              </div>
              <input 
                type="range" min="5.0" max="30.0" step="0.5"
                value={friedParamR0Cm}
                onChange={e => setFriedParamR0Cm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Severe (5 cm)</span>
                <span>Median (18 cm)</span>
                <span>Exceptional (30 cm)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">TROPOPAUSE WIND SPEED:</span>
                <span className="text-white font-bold">{windSpeedMs.toFixed(1)} m/s (JET STREAM)</span>
              </div>
              <input 
                type="range" min="5.0" max="45.0" step="1.0"
                value={windSpeedMs}
                onChange={e => setWindSpeedMs(Number(e.target.value))}
                className="w-full accent-white bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">DEFORMABLE MIRROR ACTUATOR MESH:</span>
                <span className="text-emerald-400 font-bold">{actuatorDensity}x{actuatorDensity} ({actuatorDensity * actuatorDensity} PIEZOS)</span>
              </div>
              <input 
                type="range" min="16" max="64" step="8"
                value={actuatorDensity}
                onChange={e => setActuatorDensity(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Closed-Loop Control Mode */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Wavefront Correction Loop</span>
              <span className={`font-bold ${closedLoopActive ? "text-emerald-400" : "text-rose-500"}`}>
                {closedLoopActive ? "CLOSED LOOP (KILOHERTZ LOCK)" : "OPEN LOOP (SEEING LIMITED)"}
              </span>
            </div>

            <button
              onClick={() => setClosedLoopActive(!closedLoopActive)}
              className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                closedLoopActive 
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              }`}
            >
              <Zap className="w-4 h-4 fill-white" />
              {closedLoopActive ? "DISENGAGE AO SERVO" : "ENGAGE ADAPTIVE OPTICS LOCK"}
            </button>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS BEAM DIRECTOR & RESOLUTION HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Wavefront SBM Correction [Maréchal Limit Performance]
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${calculations.isDiffractionLimited ? "text-emerald-400" : "text-amber-400"}`}>
              {(calculations.strehlRatio * 100).toFixed(1)}% STREHL
            </span>
            <span className="text-slate-500 text-sm">
              {calculations.isDiffractionLimited ? "DIFFRACTION LIMITED (S >= 0.80)" : "PARTIAL CORRECTION"}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">RESIDUAL WFE: {calculations.rmsWfeNm.toFixed(0)} nm RMS</span>
            <span className="text-emerald-400">RESOLUTION: {calculations.effectiveResolutionArcsec.toFixed(3)} arcsec</span>
            <span className="text-amber-400">RESOLVABLE FEATURE (600 km LEO): {calculations.resolvableFeatureCmLEO.toFixed(1)} cm</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical Status HUD Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Aperture className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">OPTICAL RESOLUTION GAIN</span>
              <span className="text-white font-bold text-sm">
                {(calculations.seeingResolutionArcsec / calculations.effectiveResolutionArcsec).toFixed(1)}x MAGNIFICATION
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ATMOSPHERIC SEEING BLUR</span>
            <span className="text-rose-400 font-bold text-sm">{calculations.seeingResolutionArcsec.toFixed(2)} arcsec</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SODIUM LGS RETURN FLUX</span>
            <span className="text-amber-400 font-bold text-sm">1.8e6 PHOTONS/SEC</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">WFS SERVO BANDWIDTH</span>
            <span className="text-emerald-400 font-bold text-sm">{spec.loopRateHz} Hz REAL-TIME</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: ERROR BUDGET & STREHL CASCADE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Wavefront Budget
        </h2>

        <div className="space-y-6">
          {/* Target Imagery Verification Card */}
          <div className={`p-5 rounded-2xl border ${closedLoopActive ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              TARGET RESOLUTION RECONNAISSANCE
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${closedLoopActive ? "text-emerald-400" : "text-rose-400"}`}>
              {closedLoopActive ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {closedLoopActive ? "SUB-DECIMETER RESOLUTION" : "UNRESOLVED SEEING SPOT"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {closedLoopActive 
                ? `AO loop suppresses atmospheric phase variance to ${calculations.rmsWfeNm.toFixed(0)} nm RMS, contracting ground resolution to ${calculations.effectiveResolutionArcsec.toFixed(3)} arcseconds. Resolves individual solar panel hinges and feed horns on LEO spacecraft.`
                : "Atmospheric phase variance expands optical beam into random speckle pattern. Target is observed purely as an unresolved point-source centroid."}
            </p>
          </div>

          {/* Wavefront Variance Cascade */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Error Variance Breakdown</div>
            <div className="flex justify-between"><span className="text-slate-500">DM Fitting Error:</span><span className="text-white font-bold">{closedLoopActive ? "0.28 rad²" : "9.50 rad²"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Temporal Servo Lag:</span><span className="text-white font-bold">{closedLoopActive ? "0.14 rad²" : "4.20 rad²"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Focal Anisoplanatism:</span><span className="text-white font-bold">{closedLoopActive ? "0.08 rad²" : "2.50 rad²"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">WFS Measurement Noise:</span><span className="text-white font-bold">{closedLoopActive ? "0.04 rad²" : "1.80 rad²"}</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">NET STREHL RATIO:</span><span className={closedLoopActive ? "text-emerald-400" : "text-rose-400"}>{(calculations.strehlRatio * 100).toFixed(1)}%</span></div>
          </div>

          {/* Engineering Principle */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Sodium Layer Resonant Backscatter
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Tuning continuous-wave lasers to the 589.159 nm D2 atomic line excites natural atomic sodium vapor in the mesosphere at 90 km. The resulting artificial star samples the identical turbulent atmospheric column traversed by downwelling satellite photons.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
