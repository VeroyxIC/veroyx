"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Sun, Zap, Radio, Globe, Activity, ShieldCheck, 
  Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Target, Cpu, CheckCircle2, ArrowRight 
} from "lucide-react"

type SbspArchitecture = "SPS_ALPHA_5GHZ" | "CASSIOPEIA_2GHZ" | "NASA_REFERENCE_1979" | "LASER_OPTICAL_1064"

interface ArchitectureSpec {
  name: string
  frequencyBand: string
  frequencyGhz: number
  wavelengthM: number
  txDiameterM: number
  rectennaDiameterKm: number
  orbitPowerGw: number
  pvEfficiencyPct: number
  dcToRfEfficiencyPct: number
  rfToDcEfficiencyPct: number
  description: string
  colorHex: string
}

const ARCHITECTURES: Record<SbspArchitecture, ArchitectureSpec> = {
  "SPS_ALPHA_5GHZ": {
    name: "SPS-ALPHA Modular Cassegrain (5.8 GHz)",
    frequencyBand: "C-Band ISM (5.8 GHz)",
    frequencyGhz: 5.8,
    wavelengthM: 0.0517,
    txDiameterM: 1000,
    rectennaDiameterKm: 4.8,
    orbitPowerGw: 2.4,
    pvEfficiencyPct: 34.0,
    dcToRfEfficiencyPct: 84.0,
    rfToDcEfficiencyPct: 87.0,
    description: "Thousands of modular mass-produced reflector facets concentrating sunlight onto central GaN SSPA transmitter.",
    colorHex: "#38bdf8"
  },
  "CASSIOPEIA_2GHZ": {
    name: "CASSIOPeiA Helical Concentrator (2.45 GHz)",
    frequencyBand: "S-Band ISM (2.45 GHz)",
    frequencyGhz: 2.45,
    wavelengthM: 0.1224,
    txDiameterM: 1700,
    rectennaDiameterKm: 6.5,
    orbitPowerGw: 2.0,
    pvEfficiencyPct: 32.5,
    dcToRfEfficiencyPct: 82.0,
    rfToDcEfficiencyPct: 88.5,
    description: "Helical geometry with zero rotating joints, beaming 2 GW base-load power through all weather conditions.",
    colorHex: "#10b981"
  },
  "NASA_REFERENCE_1979": {
    name: "NASA/DOE Reference SPS (2.45 GHz Planar)",
    frequencyBand: "S-Band (2.45 GHz)",
    frequencyGhz: 2.45,
    wavelengthM: 0.1224,
    txDiameterM: 1000,
    rectennaDiameterKm: 10.0,
    orbitPowerGw: 6.5,
    pvEfficiencyPct: 18.0,
    dcToRfEfficiencyPct: 80.0,
    rfToDcEfficiencyPct: 85.0,
    description: "Kilometer-scale planar silicon solar blanket deploying a 1-km klystron phased array transmitting 5 GW grid power.",
    colorHex: "#f59e0b"
  },
  "LASER_OPTICAL_1064": {
    name: "High-Fluence Optical Laser Relay (1064 nm)",
    frequencyBand: "NIR Fiber Laser (281.9 THz)",
    frequencyGhz: 281900,
    wavelengthM: 1.064e-6,
    txDiameterM: 12,
    rectennaDiameterKm: 0.15,
    orbitPowerGw: 0.5,
    pvEfficiencyPct: 40.0,
    dcToRfEfficiencyPct: 55.0,
    rfToDcEfficiencyPct: 62.0,
    description: "Ultra-compact phased array laser director providing high-density targeted power to tactical microgrids.",
    colorHex: "#d946ef"
  }
}

export default function SbspPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [archKey, setArchKey] = useState<SbspArchitecture>("SPS_ALPHA_5GHZ")
  const [arrayDiameterM, setArrayDiameterM] = useState<number>(1000)
  const [rectennaDiameterKm, setRectennaDiameterKm] = useState<number>(4.8)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const spec = ARCHITECTURES[archKey]

  // Physical Calculations
  const GEO_ALTITUDE_M = 35786 * 1000
  const SOLAR_FLUX_W_M2 = 1361 // AM0 Solar Constant in GEO
  const ATMOSPHERIC_TRANSMISSION = spec.frequencyGhz > 100 ? 0.72 : 0.98 // Rain/cloud fade

  // Solar Collection Area & In-Orbit Generation
  const pvAreaM2 = Math.PI * Math.pow(arrayDiameterM / 2, 2)
  const rawSolarPowerMw = (pvAreaM2 * SOLAR_FLUX_W_M2) / 1e6
  const orbitGeneratedPowerMw = rawSolarPowerMw * (spec.pvEfficiencyPct / 100)

  // RF Transmitter Power
  const transmittedRfPowerMw = orbitGeneratedPowerMw * (spec.dcToRfEfficiencyPct / 100)

  // Goubau Beam Coupling & Collection Efficiency (eta_col)
  const tauG = useMemo(() => {
    return (Math.PI * arrayDiameterM * (rectennaDiameterKm * 1000)) / (4 * spec.wavelengthM * GEO_ALTITUDE_M)
  }, [arrayDiameterM, rectennaDiameterKm, spec.wavelengthM, GEO_ALTITUDE_M])

  const beamCollectionEfficiencyPct = Math.min(99.8, (1 - Math.exp(-Math.pow(tauG, 2))) * 100)

  // Ground Spot Sizing (First Airy Null)
  const groundSpotDiameterKm = (2.44 * spec.wavelengthM * GEO_ALTITUDE_M) / arrayDiameterM / 1000

  // Ground Deliverable Power
  const receivedGroundRfMw = transmittedRfPowerMw * (beamCollectionEfficiencyPct / 100) * ATMOSPHERIC_TRANSMISSION
  const deliverableGridPowerMw = receivedGroundRfMw * (spec.rfToDcEfficiencyPct / 100)
  const deliverableGridPowerGw = deliverableGridPowerMw / 1000

  // Peak Ground Power Density (Center of Beam)
  const rectennaAreaM2 = Math.PI * Math.pow((rectennaDiameterKm * 1000) / 2, 2)
  const peakPowerDensityW_M2 = (2 * (receivedGroundRfMw * 1e6)) / rectennaAreaM2
  const isSafetyThresholdCompliant = peakPowerDensityW_M2 <= 250 // 250 W/m2 ICNIRP safety envelope

  // Equivalent Clean Energy Metrics
  const homesPoweredCount = Math.round(deliverableGridPowerGw * 850000) // ~850k homes per GW
  const co2AvoidedTonsPerYear = Math.round(deliverableGridPowerGw * 4200000)

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

  // 3D Three.js SBSP GEO Orbit & Terrestrial Rectenna Beaming Visualization
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 14, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.2)
    sun.position.set(30, 20, 20)
    scene.add(sun)

    // 1. Earth Body (Origin)
    const earthR = 5.2
    const earthGeo = new THREE.SphereGeometry(earthR, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.8,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 })
    const earthWire = new THREE.Mesh(new THREE.SphereGeometry(earthR * 1.005, 36, 18), wireMat)
    earth.add(earthWire)

    // 2. Terrestrial Rectenna Site (Ground Station Footprint)
    const rectennaGroup = new THREE.Group()
    earth.add(rectennaGroup)

    const rectennaLat = 34.0 // Barstow / Mojave Desert Site
    const rectennaLon = -116.8
    const phi = (90 - rectennaLat) * (Math.PI / 180)
    const theta = (rectennaLon + 180) * (Math.PI / 180)
    const rectennaPos = new THREE.Vector3(
      -earthR * Math.sin(phi) * Math.cos(theta),
      earthR * Math.cos(phi),
      earthR * Math.sin(phi) * Math.sin(theta)
    )

    const rGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24)
    const rMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.4 })
    const rectennaMesh = new THREE.Mesh(rGeo, rMat)
    rectennaMesh.position.copy(rectennaPos)
    rectennaMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rectennaPos.clone().normalize())
    rectennaGroup.add(rectennaMesh)

    // 3. GEO Satellite Platform (Scale elevated for visual ergonomics)
    const geoRadius = 14.2
    const satGroup = new THREE.Group()
    satGroup.position.set(geoRadius * 0.7, geoRadius * 0.5, 0)
    scene.add(satGroup)

    // Solar Collector Blanket Disk
    const collectorGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.1, 32)
    const collectorMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.2
    })
    const collectorMesh = new THREE.Mesh(collectorGeo, collectorMat)
    collectorMesh.rotation.x = Math.PI / 3
    satGroup.add(collectorMesh)

    // Central Phased Array Transmitter Subsystem
    const txGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 24)
    const txMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.colorHex), metalness: 0.9 })
    const txMesh = new THREE.Mesh(txGeo, txMat)
    txMesh.position.set(0, -0.2, 0)
    satGroup.add(txMesh)

    // 4. Coherent Power Beaming Transmission Cone (GEO to Earth Rectenna)
    const beamGeo = new THREE.CylinderGeometry(0.2, 1.4, 18, 24, 1, true)
    const beamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.colorHex),
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    })
    const beamCone = new THREE.Mesh(beamGeo, beamMat)
    beamCone.position.set(satGroup.position.x / 2, satGroup.position.y / 2, 0)
    beamCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), satGroup.position.clone().normalize().negate())
    scene.add(beamCone)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Slow Earth rotation
      earth.rotation.y += 0.0006

      // Pulsing power transfer beam intensity
      beamMat.opacity = 0.35 + Math.sin(simStep * 0.1) * 0.15

      // Sub-satellite tracking orientation
      satGroup.lookAt(rectennaPos)

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
  }, [spec, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: ARCHITECTURE SPECIFICATIONS & SIZING */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Sun className="w-5 h-5 text-amber-400" /> Space-Based Solar Power
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            GEO Orbital Generation &amp; Microwave Wireless Transfer
          </p>
        </div>

        <div className="space-y-6">
          {/* Architecture Presets */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Transmission Architecture
            </label>
            <div className="space-y-2">
              {(["SPS_ALPHA_5GHZ", "CASSIOPEIA_2GHZ", "NASA_REFERENCE_1979", "LASER_OPTICAL_1064"] as SbspArchitecture[]).map(key => {
                const item = ARCHITECTURES[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setArchKey(key)
                      setArrayDiameterM(item.txDiameterM)
                      setRectennaDiameterKm(item.rectennaDiameterKm)
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      archKey === key 
                        ? "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.frequencyBand} | λ = {((item.wavelengthM * 100).toFixed(1))} cm
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.orbitPowerGw} GW</span>
                      <span className="text-slate-500">Tx: {item.txDiameterM}m</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Aperture & Geometry Scaling */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>SBSP Transmitter &amp; Rectenna Sizing</span>
              <span className="text-emerald-400 font-bold">τ = {tauG.toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">TRANSMITTER APERTURE (Dtx):</span>
                <span className="text-cyan-400 font-bold">{arrayDiameterM} meters</span>
              </div>
              <input 
                type="range" min="200" max="2500" step="50"
                value={arrayDiameterM}
                onChange={e => setArrayDiameterM(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">TERRESTRIAL RECTENNA (Drx):</span>
                <span className="text-emerald-400 font-bold">{rectennaDiameterKm.toFixed(1)} km</span>
              </div>
              <input 
                type="range" min="1.0" max="15.0" step="0.2"
                value={rectennaDiameterKm}
                onChange={e => setRectennaDiameterKm(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">GROUND AIRY SPOT (FIRST NULL):</span>
                <span className="text-white font-bold">{groundSpotDiameterKm.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GOUBAU COUPLING (ηcol):</span>
                <span className="text-emerald-400 font-bold">{beamCollectionEfficiencyPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Operational Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Grid Dispatch Status</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> CONTINUOUS BASELOAD
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
                {isPlaying ? "HOLD TRANSMISSION" : "RESUME POWER BEAM"}
              </button>

              <button
                onClick={() => {
                  setArrayDiameterM(spec.txDiameterM)
                  setRectennaDiameterKm(spec.rectennaDiameterKm)
                }}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Sizing"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS SBSP GEO BEAMING HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Terrestrial Grid Dispatch [Barstow Rectenna Complex]
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-emerald-400">
              {deliverableGridPowerGw.toFixed(2)} GW
            </span>
            <span className="text-slate-500 text-sm">DELIVERED TO NATIONAL GRID ({deliverableGridPowerMw.toFixed(0)} MW)</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">ORBIT POWER: {((orbitGeneratedPowerMw / 1000).toFixed(2))} GW</span>
            <span className="text-amber-400">BEAM COUPLING: {beamCollectionEfficiencyPct.toFixed(1)}%</span>
            <span className={isSafetyThresholdCompliant ? "text-emerald-400" : "text-rose-400"}>
              PEAK FLUX: {peakPowerDensityW_M2.toFixed(1)} W/m² {isSafetyThresholdCompliant ? "(SAFE)" : "(OVER-LIMIT)"}
            </span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">CAPACITY FACTOR</span>
              <span className="text-white font-bold text-sm">99.4% (GEO ZERO-WEATHER)</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">RESIDENTIAL HOMES POWERED</span>
            <span className="text-emerald-400 font-bold text-sm">~{homesPoweredCount.toLocaleString()} HOMES</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CO2 OFFSET EQUIVALENCE</span>
            <span className="text-cyan-400 font-bold text-sm">{((co2AvoidedTonsPerYear / 1e6).toFixed(2))}M TONS/YR</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">WPT FREQUENCY</span>
            <span className="text-white font-bold text-sm">{spec.frequencyGhz} GHz ISM</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: LINK BUDGET & SAFETY COMPLIANCE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> SBSP Link Budget
        </h2>

        <div className="space-y-6">
          {/* Compliance Card */}
          <div className={`p-5 rounded-2xl border ${isSafetyThresholdCompliant ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              ICNIRP RF RADIATION SAFETY
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${isSafetyThresholdCompliant ? "text-emerald-400" : "text-rose-400"}`}>
              {isSafetyThresholdCompliant ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {isSafetyThresholdCompliant ? "SAFETY ENVELOPE VERIFIED" : "EXCEEDS 250 W/m² LIMIT"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isSafetyThresholdCompliant 
                ? `Peak power density of ${(peakPowerDensityW_M2).toFixed(1)} W/m² at the rectenna center is less than 1/4th the natural sun's thermal intensity (1000 W/m²). Outside the perimeter fence, RF leakage is <1 W/m².`
                : "Power density exceeds non-ionizing threshold limits. Enlarge terrestrial rectenna diameter to disperse energy flux safely across broader footprint."}
            </p>
          </div>

          {/* Efficiency Cascade Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">GEO-to-Grid Efficiency Cascade</div>
            <div className="flex justify-between"><span className="text-slate-500">Solar Photon Intercept:</span><span className="text-white font-bold">{rawSolarPowerMw.toFixed(0)} MW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">PV Conversion (ηpv):</span><span className="text-emerald-400">+{spec.pvEfficiencyPct}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Solid-State DC-RF (ηrf):</span><span className="text-cyan-400">+{spec.dcToRfEfficiencyPct}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Aperture Coupling (ηcol):</span><span className="text-emerald-400">+{beamCollectionEfficiencyPct.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Atmosphere Transmission:</span><span className="text-white">{((ATMOSPHERIC_TRANSMISSION * 100).toFixed(0))}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rectenna RF-DC (ηrec):</span><span className="text-cyan-400">+{spec.rfToDcEfficiencyPct}%</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">NET GRID DELIVERABLE:</span><span className="text-emerald-400">{deliverableGridPowerGw.toFixed(2)} GW</span></div>
          </div>

          {/* Engineering Principle */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Retrodirective Phase Conjugation
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              To prevent mispointing, the terrestrial rectenna sends a coded pilot signal upward. The GEO satellite conjugates the phase of each subarray, locking the microwave beam to the rectenna with sub-millimeter precision. If the pilot signal drops, the beam defocuses instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
