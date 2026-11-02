"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Radio, Eye, Activity, Zap, Layers, Gauge, 
  ShieldCheck, Crosshair, Target, Play, Square, RotateCcw, Maximize2 
} from "lucide-react"

type SarMode = "STRIPMAP" | "SPOTLIGHT" | "SCANSAR" | "SLIDING_SPOTLIGHT"
type RadarBand = "X_BAND" | "C_BAND" | "L_BAND"

interface BandSpec {
  name: string
  centerFreqGhz: number
  wavelengthM: number
  maxBandwidthMhz: number
  peakPowerWatts: number
  colorHex: string
}

const RADAR_BANDS: Record<RadarBand, BandSpec> = {
  "X_BAND": {
    name: "X-Band High-Resolution Recon (9.6 GHz)",
    centerFreqGhz: 9.6,
    wavelengthM: 0.0312,
    maxBandwidthMhz: 1200,
    peakPowerWatts: 3500,
    colorHex: "#38bdf8"
  },
  "C_BAND": {
    name: "C-Band Maritime & Surface (5.4 GHz)",
    centerFreqGhz: 5.4,
    wavelengthM: 0.0555,
    maxBandwidthMhz: 600,
    peakPowerWatts: 4500,
    colorHex: "#10b981"
  },
  "L_BAND": {
    name: "L-Band Foliage & Soil Penetration (1.27 GHz)",
    centerFreqGhz: 1.27,
    wavelengthM: 0.236,
    maxBandwidthMhz: 200,
    peakPowerWatts: 6000,
    colorHex: "#f59e0b"
  }
}

export default function SarPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [mode, setMode] = useState<SarMode>("SPOTLIGHT")
  const [band, setBand] = useState<RadarBand>("X_BAND")
  const [orbitAltKm, setOrbitAltKm] = useState(510)
  const [incidenceAngleDeg, setIncidenceAngleDeg] = useState(35)
  const [chirpBandwidthMhz, setChirpBandwidthMhz] = useState(800)
  const [antennaLengthM, setAntennaLengthM] = useState(3.6)
  const [antennaWidthM, setAntennaWidthM] = useState(0.8)
  const [isPlaying, setIsPlaying] = useState(true)

  const spec = RADAR_BANDS[band]

  // Physical Constants & Orbital Parameters
  const SPEED_OF_LIGHT = 299792458
  const EARTH_RADIUS_KM = 6371
  const MU = 398600.4418
  const orbitalVelocityMs = Math.sqrt((MU * 1e9) / ((EARTH_RADIUS_KM + orbitAltKm) * 1000))

  // Geometry Calculations
  const incRad = (incidenceAngleDeg * Math.PI) / 180
  const slantRangeM = (orbitAltKm * 1000) / Math.cos(incRad)

  // Radar Resolution Engine:
  // 1. Ground Range Resolution: delta_Rg = c / (2 * B * sin(theta_inc))
  const bandwidthHz = chirpBandwidthMhz * 1e6
  const groundRangeResM = SPEED_OF_LIGHT / (2 * bandwidthHz * Math.sin(incRad))

  // 2. Azimuth Resolution:
  // Stripmap: delta_x = L_a / 2 (fundamental SAR theorem)
  // Spotlight: Synthetic aperture extended via continuous steering (sub-half antenna limit)
  const azimuthResM = mode === "SPOTLIGHT" 
    ? (antennaLengthM / 2) * 0.22 
    : mode === "SLIDING_SPOTLIGHT" 
    ? (antennaLengthM / 2) * 0.55 
    : mode === "SCANSAR" 
    ? (antennaLengthM / 2) * 3.5 
    : (antennaLengthM / 2)

  // 3. Swath Width (Ground):
  // W_g = (lambda * R) / (W_a * cos(theta_inc))
  const elevationBeamwidthRad = spec.wavelengthM / antennaWidthM
  const groundSwathWidthKm = ((slantRangeM * elevationBeamwidthRad) / Math.cos(incRad)) / 1000
  const actualSwathWidthKm = mode === "SPOTLIGHT" ? 5.0 : mode === "SCANSAR" ? groundSwathWidthKm * 3.2 : groundSwathWidthKm

  // 4. Pulse Repetition Frequency (PRF) Operating Limits:
  // PRF_min (Doppler Bandwidth): B_d = (2 * v) / L_a
  const dopplerBandwidthHz = (2 * orbitalVelocityMs) / antennaLengthM
  const prfMinHz = Math.ceil(dopplerBandwidthHz * 1.25)
  // PRF_max (Range Ambiguity): c / (2 * R_swath_slant)
  const slantSwathM = actualSwathWidthKm * 1000 * Math.sin(incRad)
  const prfMaxHz = Math.floor(SPEED_OF_LIGHT / (2 * Math.max(slantSwathM, 15000)))
  const nominalPrfHz = Math.round((prfMinHz + prfMaxHz) / 2)

  // 5. Radiometric Sensitivity (Noise Equivalent Sigma Zero - NESZ):
  const estimatedNeszDb = -26.5 + (incidenceAngleDeg - 30) * 0.25 - (chirpBandwidthMhz / 1000) * 1.2

  // 3D Radar Wavefront & Target Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 14, 26)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.5)
    sun.position.set(20, 25, 20)
    scene.add(sun)

    // 1. Terrain Grid (Target Surface)
    const groundGeo = new THREE.PlaneGeometry(35, 24, 32, 32)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      wireframe: true,
      roughness: 0.9
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.set(0, -4, 0)
    scene.add(ground)

    // 2. Spacecraft Model with Planar Phased Array SAR Antenna
    const satGroup = new THREE.Group()
    satGroup.position.set(0, 8, -6)
    scene.add(satGroup)

    const busGeo = new THREE.BoxGeometry(1.4, 1.4, 2.0)
    const busMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
    const bus = new THREE.Mesh(busGeo, busMat)
    satGroup.add(bus)

    // Planar Active Electronically Scanned Array (AESA) Antenna
    const antGeo = new THREE.BoxGeometry(antennaLengthM * 0.8, 0.08, antennaWidthM * 1.6)
    const antMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2
    })
    const antMesh = new THREE.Mesh(antGeo, antMat)
    antMesh.position.set(0, -0.75, 0)
    satGroup.add(antMesh)

    // 3. Microwave Radar Chirp Wavefronts (Pulsing Beams)
    const beamAngleRad = (incidenceAngleDeg * Math.PI) / 180
    const targetGroundZ = 3.5
    const beamOrigin = satGroup.position

    const coneDepth = 15
    const coneRadius = coneDepth * Math.tan(elevationBeamwidthRad * 3.5)
    const radarFrustumGeo = new THREE.ConeGeometry(coneRadius, coneDepth, 24, 1, true)
    const radarFrustumMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.colorHex),
      wireframe: true,
      transparent: true,
      opacity: 0.25
    })
    const radarFrustum = new THREE.Mesh(radarFrustumGeo, radarFrustumMat)
    radarFrustum.position.set(0, 2, targetGroundZ / 2)
    radarFrustum.rotation.x = Math.PI / 2 - beamAngleRad * 0.6
    scene.add(radarFrustum)

    // Ground Target Footprint (Swath illumination patch)
    const footprintGeo = new THREE.RingGeometry(0.1, 2.4, 32)
    const footprintMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.colorHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    })
    const footprint = new THREE.Mesh(footprintGeo, footprintMat)
    footprint.rotation.x = -Math.PI / 2
    footprint.position.set(0, -3.98, targetGroundZ)
    scene.add(footprint)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = Date.now() * 0.002
      
      // Microwave wavefront oscillation
      if (isPlaying) {
        radarFrustumMat.opacity = 0.20 + Math.sin(t * 8) * 0.1
        footprint.scale.set(1 + Math.sin(t * 6) * 0.08, 1 + Math.sin(t * 6) * 0.08, 1)

        // Spotlight Mode Target Dwelling
        if (mode === "SPOTLIGHT") {
          satGroup.rotation.x = Math.sin(t * 0.5) * 0.08
        } else {
          satGroup.rotation.x = 0
        }
      }

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
  }, [spec, incidenceAngleDeg, mode, antennaLengthM, antennaWidthM, isPlaying, elevationBeamwidthRad])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: SAR RADAR CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Radio className="w-5 h-5 text-cyan-400" /> Synthetic Aperture Radar
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            All-Weather High-Resolution AESA Imaging
          </p>
        </div>

        <div className="space-y-6">
          {/* Mode Selector */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> SAR Operational Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["SPOTLIGHT", "STRIPMAP", "SCANSAR", "SLIDING_SPOTLIGHT"] as SarMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === m 
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-[11px]">{m.replace("_", " ")}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {m === "SPOTLIGHT" ? "Sub-0.5m High-Value Target" : m === "STRIPMAP" ? "Continuous Linear Swath" : m === "SCANSAR" ? "Wide-Area Maritime" : "Agile Phased Steering"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Radar Frequency Band */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Carrier Frequency Band
            </label>
            <div className="space-y-2">
              {(["X_BAND", "C_BAND", "L_BAND"] as RadarBand[]).map(b => {
                const item = RADAR_BANDS[b]
                return (
                  <button
                    key={b}
                    onClick={() => {
                      setBand(b)
                      setChirpBandwidthMhz(Math.min(chirpBandwidthMhz, item.maxBandwidthMhz))
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      band === b 
                        ? "bg-amber-950/40 border-amber-500 text-amber-300" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">λ: {(item.wavelengthM * 100).toFixed(1)} cm | P_peak: {item.peakPowerWatts} W</div>
                    </div>
                    <span className="font-mono text-cyan-400 font-bold">{item.centerFreqGhz} GHz</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Chirp Bandwidth & Incidence Angle Sliders */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Chirp &amp; Slant Range Geometry
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">CHIRP PULSE BANDWIDTH (B):</span>
                <span className="text-cyan-400 font-bold">{chirpBandwidthMhz} MHz</span>
              </div>
              <input 
                type="range" min="50" max={spec.maxBandwidthMhz} step="25"
                value={chirpBandwidthMhz}
                onChange={e => setChirpBandwidthMhz(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">INCIDENCE ANGLE (θ_inc):</span>
                <span className="text-emerald-400 font-bold">{incidenceAngleDeg}°</span>
              </div>
              <input 
                type="range" min="20" max="55" step="1"
                value={incidenceAngleDeg}
                onChange={e => setIncidenceAngleDeg(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Steep (20°)</span>
                <span>Standard Recon (35°)</span>
                <span>Grazing (55°)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">ANTENNA APERTURE LENGTH:</span>
                <span className="text-amber-400 font-bold">{antennaLengthM.toFixed(1)} m</span>
              </div>
              <input 
                type="range" min="2.0" max="8.0" step="0.2"
                value={antennaLengthM}
                onChange={e => setAntennaLengthM(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D RADAR SWATH HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Imaging Resolution (Range x Azimuth)</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">
              {(groundRangeResM * 100).toFixed(0)} cm x {(azimuthResM * 100).toFixed(0)} cm
            </span>
            <span className="text-cyan-400 font-bold text-lg">GROUND RESOLUTION</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-emerald-400">SWATH WIDTH: {actualSwathWidthKm.toFixed(1)} km</span>
            <span className="text-slate-400">SLANT RANGE: {(slantRangeM / 1000).toFixed(0)} km</span>
            <span className="text-amber-400">NESZ SENSITIVITY: {estimatedNeszDb.toFixed(1)} dB</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Radar Performance HUD Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">PULSE REPETITION FREQ (PRF)</span>
              <span className="text-white font-bold text-sm">{nominalPrfHz.toLocaleString()} Hz (OPTIMAL)</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">DOPPLER CENTROID (B_D)</span>
            <span className="text-cyan-400 font-bold text-sm">{dopplerBandwidthHz.toFixed(0)} Hz</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">AMBIGUITY ENVELOPE</span>
            <span className="text-emerald-400 font-bold text-sm">
              [{prfMinHz} Hz - {prfMaxHz} Hz]
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SURVEILLANCE TIER</span>
            <span className={`text-sm font-bold ${groundRangeResM <= 0.30 ? "text-cyan-400" : "text-emerald-400"}`}>
              {groundRangeResM <= 0.30 ? "TACTICAL MILITARY (&lt;30cm)" : "COMMERCIAL SURVEILLANCE"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: RADAR EQUATION CASCADE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> SAR Radar Budget
        </h2>

        <div className="space-y-6">
          {/* Target Discrimination Card */}
          <div className="bg-cyan-950/20 border border-cyan-500/40 rounded-2xl p-5 space-y-2">
            <div className="text-[10px] font-bold tracking-wider text-cyan-400/80">
              TACTICAL RESOLUTION COMPLIANCE
            </div>
            <div className="text-3xl font-black text-cyan-400 flex items-center gap-2">
              <Eye className="w-6 h-6" />
              {(groundRangeResM * 100).toFixed(0)} cm GSD
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {groundRangeResM <= 0.35 
                ? "Sub-35cm resolution enables identification of armored vehicle models, surface-to-air missile launchers, and aircraft wing geometries through heavy overcast and night." 
                : "Resolution suitable for port facility monitoring, ship wake tracking, and broad area maritime surveillance."}
            </p>
          </div>

          {/* SAR System Parameters */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Aperture &amp; Waveform Specs</div>
            <div className="flex justify-between"><span className="text-slate-500">Radar Wavelength (λ):</span><span className="text-white font-bold">{(spec.wavelengthM * 100).toFixed(2)} cm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ground Range Res (δRg):</span><span className="text-cyan-400 font-bold">{(groundRangeResM * 100).toFixed(1)} cm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Azimuth Res (δx):</span><span className="text-emerald-400 font-bold">{(azimuthResM * 100).toFixed(1)} cm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Synthetic Aperture Length:</span><span className="text-white">{((spec.wavelengthM * slantRangeM) / (2 * azimuthResM) / 1000).toFixed(1)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Peak RF Power:</span><span className="text-amber-400 font-bold">{spec.peakPowerWatts.toLocaleString()} W</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Average Duty Cycle:</span><span className="text-white">18.5% (GaN Transmitters)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Raw Data Rate (12-bit I/Q):</span><span className="text-cyan-400 font-bold">{((nominalPrfHz * 8192 * 24) / 1e6).toFixed(0)} Mbps</span></div>
          </div>

          {/* Ambiguity Avoidance Profile */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Ambiguity Diamond Diagram
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Operating PRF of {nominalPrfHz} Hz avoids both nadir blind echo returns and azimuth Doppler aliasing across the entire {actualSwathWidthKm.toFixed(0)} km ground swath.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
