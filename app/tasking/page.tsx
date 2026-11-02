"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Radar, Radio, Eye, Target, Activity, Zap, 
  Layers, Gauge, Compass, ShieldCheck, ShieldAlert, 
  Play, Square, RotateCcw, AlertTriangle, ArrowRight, CheckCircle2 
} from "lucide-react"

type SensorNodeId = "FYLINGDALES" | "EGLIN_FPS85" | "CLEAR_PAVEPAWS" | "DIEGO_GARCIA_GEODSS" | "MAUI_AMOS"

interface SensorNode {
  id: SensorNodeId
  name: string
  location: string
  lat: number
  lon: number
  type: "PHASED_ARRAY_RADAR" | "OPTICAL_TELESCOPE"
  frequencyBand: string
  peakPowerMw: number
  antennaGainDbi: number
  maxRangeKm: number
  fovAzimuthDeg: [number, number]
  colorHex: string
}

const SENSOR_NETWORK: Record<SensorNodeId, SensorNode> = {
  "FYLINGDALES": {
    id: "FYLINGDALES",
    name: "RAF Fylingdales SSPAR",
    location: "North Yorkshire, UK",
    lat: 54.36,
    lon: -0.67,
    type: "PHASED_ARRAY_RADAR",
    frequencyBand: "UHF (420–450 MHz)",
    peakPowerMw: 2.5,
    antennaGainDbi: 41.5,
    maxRangeKm: 5000,
    fovAzimuthDeg: [0, 360],
    colorHex: "#38bdf8"
  },
  "EGLIN_FPS85": {
    id: "EGLIN_FPS85",
    name: "Eglin AN/FPS-85 Phased Array",
    location: "Florida, USA",
    lat: 30.57,
    lon: -86.21,
    type: "PHASED_ARRAY_RADAR",
    frequencyBand: "UHF (442 MHz)",
    peakPowerMw: 32.0,
    antennaGainDbi: 43.0,
    maxRangeKm: 8000,
    fovAzimuthDeg: [120, 240],
    colorHex: "#10b981"
  },
  "CLEAR_PAVEPAWS": {
    id: "CLEAR_PAVEPAWS",
    name: "Clear Space Force Station EWR",
    location: "Alaska, USA",
    lat: 64.29,
    lon: -149.19,
    type: "PHASED_ARRAY_RADAR",
    frequencyBand: "UHF PAVE PAWS",
    peakPowerMw: 1.8,
    antennaGainDbi: 38.5,
    maxRangeKm: 5500,
    fovAzimuthDeg: [180, 360],
    colorHex: "#f59e0b"
  },
  "DIEGO_GARCIA_GEODSS": {
    id: "DIEGO_GARCIA_GEODSS",
    name: "Diego Garcia GEODSS Site 3",
    location: "British Indian Ocean Territory",
    lat: -7.31,
    lon: 72.41,
    type: "OPTICAL_TELESCOPE",
    frequencyBand: "Visible Electro-Optical (V-Band)",
    peakPowerMw: 0,
    antennaGainDbi: 0,
    maxRangeKm: 40000,
    fovAzimuthDeg: [0, 360],
    colorHex: "#d946ef"
  },
  "MAUI_AMOS": {
    id: "MAUI_AMOS",
    name: "Air Force Maui Optical & Supercomputing (AMOS)",
    location: "Haleakala, Hawaii",
    lat: 20.71,
    lon: -156.26,
    type: "OPTICAL_TELESCOPE",
    frequencyBand: "Visible / LWIR (3.67m AEOS)",
    peakPowerMw: 0,
    antennaGainDbi: 0,
    maxRangeKm: 42000,
    fovAzimuthDeg: [0, 360],
    colorHex: "#ec4899"
  }
}

export default function SensorTaskingPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [activeSensorId, setActiveSensorId] = useState<SensorNodeId>("FYLINGDALES")
  const [targetRcsM2, setTargetRcsM2] = useState<number>(0.85) // 0.85 m2 (standard smallsat)
  const [pulseIntegrationCount, setPulseIntegrationCount] = useState<number>(64) // Coherent pulses
  const [targetAltitudeKm, setTargetAltitudeKm] = useState<number>(620)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const sensor = SENSOR_NETWORK[activeSensorId]

  // Dynamic Slant Range & Orbital Motion Simulation
  const EARTH_R_KM = 6371
  const angularSpeed = 0.0012
  const targetLat = Math.sin(simStep * 0.05) * 65 // Oscillating high-inclination orbit
  const targetLon = ((simStep * 1.8) % 360) - 180

  // Calculate Geocentric Slant Range (Spherical Law of Cosines):
  const phi1 = (sensor.lat * Math.PI) / 180
  const phi2 = (targetLat * Math.PI) / 180
  const deltaLambda = ((targetLon - sensor.lon) * Math.PI) / 180
  const centralAngleRad = Math.acos(
    Math.min(1, Math.max(-1, Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)))
  )
  const rSensor = EARTH_R_KM
  const rTarget = EARTH_R_KM + targetAltitudeKm
  const slantRangeKm = Math.sqrt(
    rSensor * rSensor + rTarget * rTarget - 2 * rSensor * rTarget * Math.cos(centralAngleRad)
  )

  // Elevation Angle from Sensor Horizon
  const sinElevation = (rTarget * Math.cos(centralAngleRad) - rSensor) / slantRangeKm
  const elevationDeg = (Math.asin(Math.max(-1, Math.min(1, sinElevation))) * 180) / Math.PI
  const isLineOfSight = elevationDeg >= 3.0 // 3-deg radar horizon screening

  // Radar Equation Calculations
  const BOLTZMANN_K = 1.380649e-23
  const T0_KELVIN = 290
  const NOISE_FIG_LINEAR = 2.5 // 4 dB noise figure
  const WAVELENGTH_M = sensor.type === "PHASED_ARRAY_RADAR" ? 0.69 : 5.5e-7 // 435 MHz UHF vs 550 nm Vis
  const BANDWIDTH_HZ = 1e6 // 1 MHz receiver bandwidth
  const noisePowerWatts = BOLTZMANN_K * T0_KELVIN * BANDWIDTH_HZ * NOISE_FIG_LINEAR

  const ptWatts = sensor.peakPowerMw * 1e6
  const gainLinear = Math.pow(10, sensor.antennaGainDbi / 10)
  const slantRangeM = slantRangeKm * 1000

  // Single-pulse SNR
  const singlePulseSnrLinear = isLineOfSight && sensor.type === "PHASED_ARRAY_RADAR"
    ? (ptWatts * Math.pow(gainLinear, 2) * Math.pow(WAVELENGTH_M, 2) * targetRcsM2) /
      (Math.pow(4 * Math.PI, 3) * Math.pow(slantRangeM, 4) * noisePowerWatts)
    : 0

  // Coherent Integration Pulse Gain
  const integratedSnrLinear = singlePulseSnrLinear * Math.sqrt(pulseIntegrationCount)
  const radarSnrDb = integratedSnrLinear > 0 ? 10 * Math.log10(integratedSnrLinear) : -30.0

  // Optical Visual Magnitude (GEODSS)
  const phaseAngleDeg = 45.0
  const phaseFactor = (1 + Math.cos((phaseAngleDeg * Math.PI) / 180)) / 2
  const opticalVisualMag = -26.74 - 2.5 * Math.log10((targetRcsM2 * 0.18 * phaseFactor) / Math.pow(slantRangeKm * 1000, 2))

  // Detection Verification
  const isRadarLocked = isLineOfSight && (sensor.type === "PHASED_ARRAY_RADAR" ? radarSnrDb >= 12.0 : opticalVisualMag <= 16.5)

  // Covariance Matrix Uncertainty Radius
  const rawCovarianceM = 450
  const posteriorCovarianceM = isRadarLocked 
    ? Math.max(12.5, rawCovarianceM / Math.sqrt(pulseIntegrationCount * 1.8))
    : rawCovarianceM

  // Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 100)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Global Sensor Surveillance Globe
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

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
    sun.position.set(20, 20, 15)
    scene.add(sun)

    // 1. Earth Body
    const earthR = 6.0
    const earthGeo = new THREE.SphereGeometry(earthR, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.8,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // Earth Coordinate Grid Lines
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 })
    const earthWire = new THREE.Mesh(new THREE.SphereGeometry(earthR * 1.005, 36, 18), wireMat)
    earth.add(earthWire)

    // 2. SSN Sensor Ground Sites
    const sensorGroup = new THREE.Group()
    earth.add(sensorGroup)

    const sensorPositions: Record<SensorNodeId, THREE.Vector3> = {} as any

    Object.values(SENSOR_NETWORK).forEach(node => {
      const phi = (90 - node.lat) * (Math.PI / 180)
      const theta = (node.lon + 180) * (Math.PI / 180)
      const pos = new THREE.Vector3(
        -earthR * Math.sin(phi) * Math.cos(theta),
        earthR * Math.cos(phi),
        earthR * Math.sin(phi) * Math.sin(theta)
      )
      sensorPositions[node.id] = pos

      // Ground Base Dish/Tower
      const nodeGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.35, 12)
      const nodeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(node.colorHex), metalness: 0.9 })
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat)
      nodeMesh.position.copy(pos)
      nodeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      sensorGroup.add(nodeMesh)

      // Radar Coverage Fan Cone
      const coneHeight = (node.maxRangeKm / 8000) * 5.0
      const coneGeo = new THREE.ConeGeometry(coneHeight * 0.6, coneHeight, 20, 1, true)
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.colorHex),
        wireframe: true,
        transparent: true,
        opacity: node.id === activeSensorId ? 0.35 : 0.08
      })
      const cone = new THREE.Mesh(coneGeo, coneMat)
      cone.position.copy(pos).addScaledVector(pos.clone().normalize(), coneHeight / 2)
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      sensorGroup.add(cone)
    })

    // 3. Target Satellite Object in Orbit
    const targetGroup = new THREE.Group()
    scene.add(targetGroup)

    const satGeo = new THREE.BoxGeometry(0.4, 0.4, 0.6)
    const satMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 })
    const satMesh = new THREE.Mesh(satGeo, satMat)
    targetGroup.add(satMesh)

    // Tracking Covariance Bubble around Target
    const covGeo = new THREE.SphereGeometry(1, 16, 16)
    const covMat = new THREE.MeshBasicMaterial({
      color: isRadarLocked ? 0x10b981 : 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    })
    const covBubble = new THREE.Mesh(covGeo, covMat)
    covBubble.scale.setScalar(isRadarLocked ? 0.65 : 1.6)
    targetGroup.add(covBubble)

    // 4. Radar Tracking Beam Line (Active Sensor to Target)
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const beamMat = new THREE.LineBasicMaterial({
      color: isRadarLocked ? 0x00f0ff : 0x64748b,
      transparent: true,
      opacity: isLineOfSight ? 0.85 : 0.0
    })
    const beamLine = new THREE.Line(beamGeo, beamMat)
    scene.add(beamLine)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Orbit position of target
      const orbR = earthR + (targetAltitudeKm / 1000) * 1.5
      const u = simStep * angularSpeed * 15
      const incRad = (65 * Math.PI) / 180
      const tgtX = orbR * Math.cos(u)
      const tgtY = orbR * Math.sin(u) * Math.sin(incRad)
      const tgtZ = orbR * Math.sin(u) * Math.cos(incRad)

      targetGroup.position.set(tgtX, tgtY, tgtZ)
      targetGroup.lookAt(0, 0, 0)

      // Update Tracking Beam
      const activeSensorPos = sensorPositions[activeSensorId]
      if (activeSensorPos) {
        const positions = new Float32Array([
          activeSensorPos.x, activeSensorPos.y, activeSensorPos.z,
          tgtX, tgtY, tgtZ
        ])
        beamGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        beamGeo.attributes.position.needsUpdate = true
      }

      // Rotate Earth slowly
      earth.rotation.y += 0.0005

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
  }, [activeSensorId, targetAltitudeKm, simStep, isRadarLocked, isLineOfSight])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: SENSOR NETWORK & TASKING QUEUE */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Radar className="w-5 h-5 text-cyan-400" /> SSN Sensor Tasking
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Space Surveillance Network &amp; Metric Handover
          </p>
        </div>

        <div className="space-y-6">
          {/* Active Surveillance Site Roster */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Space Surveillance Network Sites
            </label>
            <div className="space-y-2">
              {Object.values(SENSOR_NETWORK).map(node => {
                const isSelected = node.id === activeSensorId
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveSensorId(node.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {node.name}
                        {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {node.location} | {node.type.replace("_", " ")}
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{node.maxRangeKm.toLocaleString()} km</span>
                      <span className="text-slate-500">{node.type === "PHASED_ARRAY_RADAR" ? `${node.peakPowerMw} MW` : "OPTICAL"}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Radar Waveform & Target RCS Tuning */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Metric Tracking Waveform Parameters
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">TARGET RADAR CROSS SECTION (RCS):</span>
                <span className="text-cyan-400 font-bold">{targetRcsM2.toFixed(2)} m² ({(10 * Math.log10(targetRcsM2)).toFixed(1)} dBsm)</span>
              </div>
              <input 
                type="range" min="0.01" max="10.0" step="0.05"
                value={targetRcsM2}
                onChange={e => setTargetRcsM2(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>CubeSat (0.01 m²)</span>
                <span>SmallSat (0.85 m²)</span>
                <span>Upper Stage (10 m²)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">PULSE INTEGRATION COUNT (N):</span>
                <span className="text-emerald-400 font-bold">{pulseIntegrationCount} PULSES</span>
              </div>
              <input 
                type="range" min="8" max="256" step="8"
                value={pulseIntegrationCount}
                onChange={e => setPulseIntegrationCount(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">TARGET ORBIT ALTITUDE:</span>
                <span className="text-amber-400 font-bold">{targetAltitudeKm} km LEO</span>
              </div>
              <input 
                type="range" min="300" max="1500" step="25"
                value={targetAltitudeKm}
                onChange={e => setTargetAltitudeKm(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Handover & Queue Automation Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Automated Handover Scheduler</span>
              <span className={`font-bold ${isRadarLocked ? "text-emerald-400" : "text-amber-400"}`}>
                {isRadarLocked ? "METRIC TRACK CONFIRMED" : "ACQUISITION SEARCH"}
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
                {isPlaying ? "HOLD RADAR PASS" : "PROPAGATE PASS"}
              </button>

              <button
                onClick={() => setSimStep(0)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Handover Track"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D SSN SENSOR GLOBE & LOOK ANGLES */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            {sensor.name} [METRIC RADAR TRACK]
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isRadarLocked ? "text-emerald-400" : "text-amber-400"}`}>
              {sensor.type === "PHASED_ARRAY_RADAR" 
                ? (radarSnrDb > 0 ? `+${radarSnrDb.toFixed(1)} dB SNR` : `${radarSnrDb.toFixed(1)} dB`)
                : `+${opticalVisualMag.toFixed(1)} V-MAG`}
            </span>
            <span className="text-slate-500 text-sm">
              {sensor.type === "PHASED_ARRAY_RADAR" ? "RADAR SNR" : "GEODSS APPARENT MAG"}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">SLANT RANGE: {slantRangeKm.toFixed(0)} km</span>
            <span className={elevationDeg >= 3 ? "text-emerald-400 font-bold" : "text-rose-400"}>
              ELEVATION: {elevationDeg.toFixed(1)}° {elevationDeg >= 3 ? "(IN FOV)" : "(BELOW HORIZON)"}
            </span>
            <span className="text-amber-400">POSTERIOR 1-σ: ±{posteriorCovarianceM.toFixed(1)} m</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical Sensor HUD Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">SURVEILLANCE TRACK ID</span>
              <span className="text-white font-bold text-sm">UCT-99182 (HIGH-VALUE RECON)</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">DETECTION THRESHOLD</span>
            <span className={`text-sm font-bold ${isRadarLocked ? "text-emerald-400" : "text-rose-400"}`}>
              {isRadarLocked ? "CONFIRMED CUSTODY LOCK" : "UNRESOLVED ECHO"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">BEAM INTEGRATION</span>
            <span className="text-cyan-400 font-bold text-sm">+{10 * Math.log10(Math.sqrt(pulseIntegrationCount)).toFixed(1)} dB PULSE GAIN</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">NEXT SENSOR HANDOVER</span>
            <span className="text-amber-400 font-bold text-sm">CLEAR SFS (T-410s)</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: COVARIANCE SHRINKAGE & RADAR LINK CASCADE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Custody Telemetry
        </h2>

        <div className="space-y-6">
          {/* Tracking Accuracy Card */}
          <div className={`p-5 rounded-2xl border ${isRadarLocked ? "bg-emerald-950/20 border-emerald-500/40" : "bg-amber-950/20 border-amber-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              ORBITAL COVARIANCE SIZING
            </div>
            <div className={`text-2xl font-black flex items-center gap-2 ${isRadarLocked ? "text-emerald-400" : "text-amber-400"}`}>
              {isRadarLocked ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              ±{posteriorCovarianceM.toFixed(1)} METERS
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {isRadarLocked 
                ? `Coherent phased array tracking across ${pulseIntegrationCount} pulses reduces state position covariance from ±${rawCovarianceM}m down to ±${posteriorCovarianceM.toFixed(1)}m (1-sigma).` 
                : "TARGET UNRESOLVED: Slant range or elevation horizon limits prevent coherent pulse integration. State covariance continues open-loop orbital dispersion."}
            </p>
          </div>

          {/* Radar Link Equation Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Radar Equation Cascade</div>
            <div className="flex justify-between"><span className="text-slate-500">Transmitter Peak Power:</span><span className="text-white">+{sensor.type === "PHASED_ARRAY_RADAR" ? (10 * Math.log10(ptWatts)).toFixed(1) : 0} dBW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phased Array Gain:</span><span className="text-emerald-400">+{sensor.antennaGainDbi} dBi</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Target RCS (σ):</span><span className="text-white">{(10 * Math.log10(targetRcsM2)).toFixed(1)} dBsm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Two-Way Path Loss (R⁴):</span><span className="text-rose-400">-{isLineOfSight ? (40 * Math.log10(slantRangeM)).toFixed(1) : "---"} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Receiver Thermal Noise:</span><span className="text-slate-400">{(10 * Math.log10(noisePowerWatts)).toFixed(1)} dBW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pulse Integration Gain:</span><span className="text-cyan-400 font-bold">+{(10 * Math.log10(Math.sqrt(pulseIntegrationCount))).toFixed(1)} dB</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">NET RECEIVED SNR:</span><span className={isRadarLocked ? "text-emerald-400" : "text-amber-400"}>{radarSnrDb.toFixed(1)} dB</span></div>
          </div>

          {/* SSN Handover Protocol Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              SSN Handover Execution
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Upon pass completion at Fylingdales (Elevation &lt; 3°), automated B-plane covariance extrapolation dispatches look-angle vectors directly to Clear SFS and Eglin AFB for uninterrupted metric tracking custody.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
