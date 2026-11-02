"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Radio, Compass, Signal, Clock, MapPin, 
  Activity, Play, Square, RotateCcw, CheckCircle2, AlertTriangle, Layers
} from "lucide-react"

interface GroundStation {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  altM: number
  minElevationDeg: number
  band: "S-BAND" | "X-BAND" | "KA-BAND"
  uplinkFreqGhz: number
  downlinkFreqGhz: number
}

const GROUND_STATIONS: GroundStation[] = [
  {
    id: "SGS",
    name: "Svalbard Satellite Station (KSAT)",
    country: "Norway (78.2° N)",
    lat: 78.2297,
    lon: 15.4077,
    altM: 400,
    minElevationDeg: 5,
    band: "X-BAND",
    uplinkFreqGhz: 7.2,
    downlinkFreqGhz: 8.45
  },
  {
    id: "WPS",
    name: "Wallops Ground Station (NASA)",
    country: "USA (37.9° N)",
    lat: 37.9402,
    lon: -75.4664,
    altM: 10,
    minElevationDeg: 5,
    band: "S-BAND",
    uplinkFreqGhz: 2.05,
    downlinkFreqGhz: 2.25
  },
  {
    id: "KRN",
    name: "Kiruna Ground Station (ESA)",
    country: "Sweden (67.8° N)",
    lat: 67.8571,
    lon: 20.9644,
    altM: 380,
    minElevationDeg: 5,
    band: "X-BAND",
    uplinkFreqGhz: 7.19,
    downlinkFreqGhz: 8.4
  },
  {
    id: "TRL",
    name: "Troll Satellite Station (TrollSat)",
    country: "Antarctica (72.0° S)",
    lat: -72.0114,
    lon: 2.5350,
    altM: 1270,
    minElevationDeg: 5,
    band: "KA-BAND",
    uplinkFreqGhz: 27.5,
    downlinkFreqGhz: 26.2
  }
]

export default function PassesPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [selectedStation, setSelectedStation] = useState<GroundStation>(GROUND_STATIONS[0])
  const [orbitAltKm, setOrbitAltKm] = useState(550)
  const [maxElevationDeg, setMaxElevationDeg] = useState(68)
  const [passDurationSec, setPassDurationSec] = useState(612) // ~10.2 min contact
  const [simTimeSec, setSimTimeSec] = useState(180) // Current playback position
  const [isPlaying, setIsPlaying] = useState(true)

  // Pass Geometry Kinematic Calculation
  const tNorm = simTimeSec / passDurationSec // 0 = AOS, 0.5 = PCA (Max El), 1 = LOS

  // Elevation Profile: Parabolic trajectory arc peaking at maxElevationDeg
  const currentElevationDeg = Math.max(0, 4 * maxElevationDeg * tNorm * (1 - tNorm))

  // Azimuth Profile: Sweeps across the sky dome (e.g. South to North for SSO)
  const currentAzimuthDeg = (30 + tNorm * 180) % 360

  // Slant Range [km]: Minimum at PCA, maximum at horizon
  const re = 6371
  const rSat = re + orbitAltKm
  const elRad = (currentElevationDeg * Math.PI) / 180
  const slantRangeKm = Math.sqrt(Math.pow(re * Math.sin(elRad), 2) + 2 * re * orbitAltKm + Math.pow(orbitAltKm, 2)) - re * Math.sin(elRad)

  // Doppler Shift: f_doppler = -f0 * (v_radial / c)
  // Radial velocity transitions from +7.5 km/s (closing) -> 0 km/s (at PCA) -> -7.5 km/s (receding)
  const maxRadialVelKms = 6.8
  const radialVelocityKms = (1 - 2 * tNorm) * maxRadialVelKms
  const SPEED_OF_LIGHT = 299792.458
  const dopplerShiftKhz = ((-selectedStation.downlinkFreqGhz * 1e6) * (radialVelocityKms / SPEED_OF_LIGHT))

  // Link Status
  const isAOS = currentElevationDeg >= selectedStation.minElevationDeg
  const linkStatus = !isAOS ? "BELOW_HORIZON" : currentElevationDeg > 20 ? "HIGH_GAIN_LOCK" : "MARGINAL_LINK"

  // Playback timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSec(t => {
          if (t >= passDurationSec) {
            setIsPlaying(false)
            return passDurationSec
          }
          return t + 1
        })
      }, 100)
    }
    return () => clearInterval(timer)
  }, [isPlaying, passDurationSec])

  // 3D Polar Tracking Dish & Horizon Dome
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 8, 14)
    camera.lookAt(0, 1, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const sun = new THREE.DirectionalLight(0xffffff, 2.5)
    sun.position.set(10, 12, 10)
    scene.add(sun)

    // 1. Horizon Sky Dome (Translucent wireframe hemisphere)
    const domeGeo = new THREE.SphereGeometry(6.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    })
    const dome = new THREE.Mesh(domeGeo, domeMat)
    scene.add(dome)

    // Horizon Ring (0° Elevation)
    const horizonRing = new THREE.RingGeometry(5.98, 6.02, 64)
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    const horizonMesh = new THREE.Mesh(horizonRing, horizonMat)
    horizonMesh.rotation.x = Math.PI / 2
    scene.add(horizonMesh)

    // 2. Tracking Satellite Parabolic Dish Antenna
    const pedestalGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 16)
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat)
    pedestal.position.set(0, 0.6, 0)
    scene.add(pedestal)

    // Azimuth Turret
    const turretGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16)
    const turret = new THREE.Mesh(turretGeo, pedestalMat)
    turret.position.set(0, 1.35, 0)
    scene.add(turret)

    // Elevation Gimbal
    const dishGroup = new THREE.Group()
    dishGroup.position.set(0, 1.5, 0)
    scene.add(dishGroup)

    const parabolicGeo = new THREE.SphereGeometry(1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3)
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.6,
      roughness: 0.2,
      side: THREE.DoubleSide
    })
    const dishMesh = new THREE.Mesh(parabolicGeo, dishMat)
    dishMesh.rotation.x = Math.PI // Flip dish orientation
    dishGroup.add(dishMesh)

    // Feedhorn sub-reflector
    const hornGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8)
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    const horn = new THREE.Mesh(hornGeo, hornMat)
    horn.position.set(0, 0, -0.6)
    horn.rotation.x = Math.PI / 2
    dishGroup.add(horn)

    // 3. Satellite Tracking Beacon (in the sky dome)
    const satBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshBasicMaterial({ color: isAOS ? 0x10b981 : 0xf43f5e })
    )
    scene.add(satBeacon)

    // Connecting RF Line-of-Sight Vector
    const beamMat = new THREE.LineBasicMaterial({
      color: isAOS ? 0x38bdf8 : 0x475569,
      transparent: true,
      opacity: isAOS ? 0.7 : 0.2
    })
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.5, 0),
      new THREE.Vector3(0, 5, 0)
    ])
    const rfBeam = new THREE.Line(beamGeo, beamMat)
    scene.add(rfBeam)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Calculate satellite position inside dome from Az/El
      const domeR = 5.8
      const azRad = (currentAzimuthDeg * Math.PI) / 180
      const elRadCalc = (currentElevationDeg * Math.PI) / 180

      const satX = domeR * Math.cos(elRadCalc) * Math.sin(azRad)
      const satY = domeR * Math.sin(elRadCalc)
      const satZ = domeR * Math.cos(elRadCalc) * Math.cos(azRad)

      satBeacon.position.set(satX, satY, satZ)

      // Update RF Beam
      const pos = rfBeam.geometry.attributes.position.array as Float32Array
      pos[3] = satX
      pos[4] = satY
      pos[5] = satZ
      rfBeam.geometry.attributes.position.needsUpdate = true

      // Aim dish toward satellite beacon
      turret.rotation.y = azRad
      dishGroup.rotation.y = azRad
      dishGroup.rotation.x = -elRadCalc

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
  }, [currentAzimuthDeg, currentElevationDeg, isAOS])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: GROUND STATION SELECTOR */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Radio className="w-5 h-5 text-cyan-400" /> Ground Station Passes
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            AOS / LOS Contact Windows &amp; Doppler Tracking
          </p>
        </div>

        <div className="space-y-6">
          {/* Ground Station Selection */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Primary Terminal Node
            </label>
            <div className="space-y-2">
              {GROUND_STATIONS.map(gs => (
                <button
                  key={gs.id}
                  onClick={() => { setSelectedStation(gs); setSimTimeSec(0); setIsPlaying(true) }}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedStation.id === gs.id 
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-bold text-[11px] text-white">{gs.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{gs.country}</div>
                  </div>
                  <div className="font-mono text-right text-[10px]">
                    <span className="text-cyan-400 font-bold block">{gs.band}</span>
                    <span className="text-slate-500">{gs.downlinkFreqGhz} GHz</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Orbit Altitude & Geometry Controls */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Pass Trajectory Constraints
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">MAX ELEVATION (PCA):</span>
                <span className="text-emerald-400 font-bold">{maxElevationDeg}°</span>
              </div>
              <input 
                type="range" min="15" max="90" step="1"
                value={maxElevationDeg}
                onChange={e => setMaxElevationDeg(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">ORBIT ALTITUDE:</span>
                <span className="text-cyan-400 font-bold">{orbitAltKm} km LEO</span>
              </div>
              <input 
                type="range" min="300" max="1000" step="25"
                value={orbitAltKm}
                onChange={e => setOrbitAltKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Timeline Playback Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Pass Progress</span>
              <span className="text-cyan-400 font-bold font-mono">
                {Math.floor(simTimeSec / 60)}m {simTimeSec % 60}s / {Math.floor(passDurationSec / 60)}m
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
                {isPlaying ? "HOLD PASS" : "RESUME TRACK"}
              </button>

              <button
                onClick={() => { setSimTimeSec(0); setIsPlaying(true) }}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Pass"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-cyan-400" style={{ width: `${tNorm * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D POLAR DISH TRACKER */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Pedestal Pointing Vector</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">{currentElevationDeg.toFixed(1)}° EL</span>
            <span className="text-cyan-400 text-2xl font-bold">{currentAzimuthDeg.toFixed(1)}° AZ</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className={isAOS ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              LINK: {linkStatus.replace(/_/g, " ")}
            </span>
            <span className="text-slate-400">SLANT RANGE: {slantRangeKm.toFixed(0)} km</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Real-time Pass Metrics HUD */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Signal className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">DOPPLER FREQ OFFSET</span>
              <span className={`text-sm font-bold ${Math.abs(dopplerShiftKhz) > 100 ? "text-amber-400" : "text-emerald-400"}`}>
                {dopplerShiftKhz > 0 ? `+${dopplerShiftKhz.toFixed(1)}` : dopplerShiftKhz.toFixed(1)} kHz
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">RADIAL VELOCITY</span>
            <span className="text-white font-bold text-sm">
              {radialVelocityKms > 0 ? `+${radialVelocityKms.toFixed(2)}` : radialVelocityKms.toFixed(2)} km/s
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CONTACT WINDOW</span>
            <span className="text-cyan-400 font-bold text-sm">
              {Math.max(0, passDurationSec - simTimeSec)}s REMAINING
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ESTIMATED DATA TRANSFER</span>
            <span className="text-emerald-400 font-bold text-sm">
              {((simTimeSec * 150) / 8 / 1000).toFixed(1)} GB
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: PASS EPHEMERIS SCHEDULE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Pass Schedule
        </h2>

        <div className="space-y-6">
          {/* Key Milestone Timetable */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Event Timeline (UTC)
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">AOS (Acquisition):</span>
                <span className="text-emerald-400 font-bold">14:22:04 UTC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">PCA (Max El {maxElevationDeg}°):</span>
                <span className="text-white font-bold">14:27:10 UTC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">LOS (Loss of Signal):</span>
                <span className="text-rose-400 font-bold">14:32:16 UTC</span>
              </div>
            </div>
          </div>

          {/* Terminal RF Sizing */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Ground Terminal Hardware</div>
            <div className="flex justify-between"><span className="text-slate-500">Reflector Aperture:</span><span className="text-white font-bold">7.3 m Cassegrain</span></div>
            <div className="flex justify-between"><span className="text-slate-500">G/T Figure of Merit:</span><span className="text-cyan-400 font-bold">+28.5 dB/K</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Slew Rate Limit:</span><span className="text-white">15°/sec (Az/El)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Horizon Mask:</span><span className="text-emerald-400 font-bold">{selectedStation.minElevationDeg}° Cutoff</span></div>
          </div>

          {/* Doppler Curve Summary */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Doppler Compensation Loop
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Receiver PLL tracks intermediate frequency through PCA zero-crossing at {selectedStation.downlinkFreqGhz} GHz with real-time automatic frequency control (AFC).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
