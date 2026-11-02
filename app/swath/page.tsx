"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Crosshair, Eye, Camera, Activity, Layers, Gauge, 
  ShieldCheck, Maximize2, Zap, Compass, Radio, CheckCircle2 
} from "lucide-react"

type SensorPreset = "TACTICAL_OPTICAL" | "COMMERCIAL_SUPERRES" | "WIDE_MULTISPECTRAL" | "X_BAND_SAR"

interface SensorSpec {
  name: string
  payloadClass: "ELECTRO_OPTICAL" | "SAR"
  focalLengthMm: number
  pixelPitchUm: number
  detectorPixelsX: number
  detectorPixelsY: number
  spectralBand: string
  colorHex: number
}

const SENSORS: Record<SensorPreset, SensorSpec> = {
  TACTICAL_OPTICAL: {
    name: "AeroOptics Tactical-35",
    payloadClass: "ELECTRO_OPTICAL",
    focalLengthMm: 3500,
    pixelPitchUm: 5.5,
    detectorPixelsX: 12000,
    detectorPixelsY: 8000,
    spectralBand: "Panchromatic (450-800 nm)",
    colorHex: 0x38bdf8
  },
  COMMERCIAL_SUPERRES: {
    name: "Hyperion-80 Sub-Meter Imager",
    payloadClass: "ELECTRO_OPTICAL",
    focalLengthMm: 5200,
    pixelPitchUm: 4.2,
    detectorPixelsX: 24000,
    detectorPixelsY: 16000,
    spectralBand: "VNIR 8-Band Multispectral",
    colorHex: 0x10b981
  },
  WIDE_MULTISPECTRAL: {
    name: "TerraScan Wide-Swath",
    payloadClass: "ELECTRO_OPTICAL",
    focalLengthMm: 650,
    pixelPitchUm: 10.0,
    detectorPixelsX: 8192,
    detectorPixelsY: 4096,
    spectralBand: "SWIR / Thermal IR",
    colorHex: 0xf59e0b
  },
  X_BAND_SAR: {
    name: "Aperture-X Active Phased Array",
    payloadClass: "SAR",
    focalLengthMm: 1800,
    pixelPitchUm: 8.0,
    detectorPixelsX: 16000,
    detectorPixelsY: 10000,
    spectralBand: "X-Band (9.6 GHz)",
    colorHex: 0xa855f7
  }
}

export default function SwathPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // System Configuration
  const [sensorPreset, setSensorPreset] = useState<SensorPreset>("TACTICAL_OPTICAL")
  const [orbitAltKm, setOrbitAltKm] = useState(500)
  const [rollAngleDeg, setRollAngleDeg] = useState(15) // Off-nadir slew angle
  const [groundSpeedKms, setGroundSpeedKms] = useState(7.06)

  const spec = SENSORS[sensorPreset]

  // Optical Calculations
  // IFOV = pixel_pitch / focal_length [rad]
  const ifovUrad = (spec.pixelPitchUm / spec.focalLengthMm) * 1000 // μrad
  const ifovRad = ifovUrad / 1e6

  // Field of View (FOV) across detector: FOV = 2 * arctan((pixels * pitch) / (2 * focal_length))
  const detectorWidthMm = (spec.detectorPixelsX * spec.pixelPitchUm) / 1000
  const fovCrossDeg = 2 * Math.atan(detectorWidthMm / (2 * spec.focalLengthMm)) * (180 / Math.PI)
  const fovRad = fovCrossDeg * (Math.PI / 180)

  // Off-nadir geometry:
  // Slant range: R = h / cos(theta) (flat-Earth approximation for small angles)
  const rollRad = Math.abs(rollAngleDeg) * (Math.PI / 180)
  const slantRangeKm = orbitAltKm / Math.cos(rollRad)

  // Ground Sample Distance (GSD):
  // Nadir GSD [cm] = (h * p) / f
  const nadirGsdCm = ((orbitAltKm * 1000) * (spec.pixelPitchUm * 1e-6) / (spec.focalLengthMm * 1e-3)) * 100

  // Off-nadir elongated GSD:
  // Cross-track GSD = Nadir GSD / cos^2(theta)
  // Along-track GSD = Nadir GSD / cos(theta)
  const crossTrackGsdCm = nadirGsdCm / Math.pow(Math.cos(rollRad), 2)
  const alongTrackGsdCm = nadirGsdCm / Math.cos(rollRad)
  const meanGsdCm = Math.sqrt(crossTrackGsdCm * alongTrackGsdCm)

  // Swath Width on Ground [km]:
  // W = 2 * h * tan(FOV / 2) / cos^2(theta)
  const nadirSwathWidthKm = 2 * orbitAltKm * Math.tan(fovRad / 2)
  const actualSwathWidthKm = nadirSwathWidthKm / Math.cos(rollRad)

  // Area Coverage Rate [sq km / sec]:
  const areaCoverageRateKm2s = actualSwathWidthKm * groundSpeedKms

  // National Imagery Interpretability Rating Scale (NIIRS) approximation:
  // General Image Quality Equation (GIQE): NIIRS ≈ 10.251 - 3.32 * log10(GSD_inches)
  const meanGsdInches = meanGsdCm / 2.54
  const estimatedNiirs = Math.max(0, Math.min(9.0, 10.251 - 3.32 * Math.log10(meanGsdInches)))

  // 3D Earth, Sensor Frustum & Ground Footprint Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 10, 18)
    camera.lookAt(0, -1, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.5)
    sun.position.set(10, 12, 10)
    scene.add(sun)

    // 1. Earth Curved Surface Patch
    const earthRadius = 25
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.12)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: true
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earth.position.set(0, -earthRadius, 0)
    scene.add(earth)

    // 2. Spacecraft Position (Origin at Altitude)
    const satHeight = 5.0
    const satGeo = new THREE.BoxGeometry(0.5, 0.5, 0.8)
    const satMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
    const satMesh = new THREE.Mesh(satGeo, satMat)
    satMesh.position.set(0, satHeight, 0)
    scene.add(satMesh)

    // Solar Wings
    const wingGeo = new THREE.BoxGeometry(1.4, 0.02, 0.4)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.6, roughness: 0.3 })
    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(1.0, 0, 0)
    satMesh.add(wingL)
    const wingR = wingL.clone()
    wingR.position.set(-1.0, 0, 0)
    satMesh.add(wingR)

    // 3. Sensor Ray Pyramid (Frustum)
    const frustumGroup = new THREE.Group()
    satMesh.add(frustumGroup)

    // Calculate ground corners based on FOV and off-nadir roll
    const groundDistance = satHeight
    const halfWidth = groundDistance * Math.tan(fovRad / 2) * 2.5
    const halfHeight = halfWidth * 0.65

    // Frustum Wireframe Lines
    const corners = [
      new THREE.Vector3(-halfWidth, -groundDistance, -halfHeight),
      new THREE.Vector3(halfWidth, -groundDistance, -halfHeight),
      new THREE.Vector3(halfWidth, -groundDistance, halfHeight),
      new THREE.Vector3(-halfWidth, -groundDistance, halfHeight)
    ]

    const linePoints: THREE.Vector3[] = []
    corners.forEach(c => {
      linePoints.push(new THREE.Vector3(0, 0, 0))
      linePoints.push(c)
    })
    // Base perimeter
    linePoints.push(corners[0], corners[1])
    linePoints.push(corners[1], corners[2])
    linePoints.push(corners[2], corners[3])
    linePoints.push(corners[3], corners[0])

    const frustumGeo = new THREE.BufferGeometry().setFromPoints(linePoints)
    const frustumMat = new THREE.LineBasicMaterial({
      color: spec.colorHex,
      transparent: true,
      opacity: 0.6
    })
    const frustumLines = new THREE.LineSegments(frustumGeo, frustumMat)
    frustumGroup.add(frustumLines)

    // Projected Ground Footprint Surface (Swath rectangle)
    const patchGeo = new THREE.PlaneGeometry(halfWidth * 2, halfHeight * 2)
    const patchMat = new THREE.MeshBasicMaterial({
      color: spec.colorHex,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })
    const patchMesh = new THREE.Mesh(patchGeo, patchMat)
    patchMesh.rotation.x = Math.PI / 2
    patchMesh.position.set(0, -groundDistance, 0)
    frustumGroup.add(patchMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Apply off-nadir roll tilt to sensor frustum
      frustumGroup.rotation.z = (rollAngleDeg * Math.PI) / 180

      // Slow orbital track simulation
      earth.rotation.y += 0.001

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
  }, [spec, fovRad, rollAngleDeg, orbitAltKm])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: OPTICAL & SENSOR CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Camera className="w-5 h-5 text-cyan-400" /> Sensor Swath &amp; GSD
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Electro-Optical &amp; SAR Footprint Geometry
          </p>
        </div>

        <div className="space-y-6">
          {/* Sensor Preset Selector */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Payload Optical Architecture
            </label>
            <div className="space-y-2">
              {(["TACTICAL_OPTICAL", "COMMERCIAL_SUPERRES", "WIDE_MULTISPECTRAL", "X_BAND_SAR"] as SensorPreset[]).map(s => {
                const item = SENSORS[s]
                return (
                  <button
                    key={s}
                    onClick={() => setSensorPreset(s)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      sensorPreset === s 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.spectralBand}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-slate-500 block">FOCAL LEN</span>
                      <span className="text-cyan-400 font-bold">{item.focalLengthMm} mm</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Orbit Altitude & Gimbal Slew Sliders */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Orbital Altitude &amp; Slew Geometry
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">ORBIT ALTITUDE:</span>
                <span className="text-emerald-400 font-bold">{orbitAltKm} km LEO</span>
              </div>
              <input 
                type="range" min="300" max="900" step="10"
                value={orbitAltKm}
                onChange={e => setOrbitAltKm(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>VLEO (300km)</span>
                <span>SSO Standard (500km)</span>
                <span>High LEO (900km)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">OFF-NADIR ROLL SLEW:</span>
                <span className="text-cyan-400 font-bold">{rollAngleDeg}° (SLANT TILT)</span>
              </div>
              <input 
                type="range" min="0" max="45" step="1"
                value={rollAngleDeg}
                onChange={e => setRollAngleDeg(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Pure Nadir (0°)</span>
                <span>Standard (15°)</span>
                <span>Extreme Slew (45°)</span>
              </div>
            </div>
          </div>

          {/* Optical Subsystem Hardware Parameters */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Focal Plane Specs</div>
            <div className="flex justify-between"><span className="text-slate-500">Pixel Pitch (p):</span><span className="text-white">{spec.pixelPitchUm.toFixed(1)} μm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Focal Length (f):</span><span className="text-white">{spec.focalLengthMm} mm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Detector Matrix:</span><span className="text-white">{spec.detectorPixelsX.toLocaleString()} x {spec.detectorPixelsY.toLocaleString()} px</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Instantaneous FOV (IFOV):</span><span className="text-amber-400 font-bold">{ifovUrad.toFixed(2)} μrad</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cross-Track FOV:</span><span className="text-cyan-400 font-bold">{fovCrossDeg.toFixed(2)}°</span></div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D OPTICAL RAY FRUSTUM VIEW */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Target Ground Resolution</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">{meanGsdCm.toFixed(1)} cm</span>
            <span className="text-slate-500 text-sm">GROUND SAMPLE DISTANCE (GSD)</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">SWATH WIDTH: {actualSwathWidthKm.toFixed(1)} km</span>
            <span className="text-emerald-400">SLANT RANGE: {slantRangeKm.toFixed(0)} km</span>
            <span className="text-amber-400">NIIRS RATING: {estimatedNiirs.toFixed(1)} / 9.0</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Footprint Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Maximize2 className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">TOTAL GROUND SWATH WIDTH</span>
              <span className="text-white font-bold text-sm">{actualSwathWidthKm.toFixed(1)} km</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">COVERAGE ACCUMULATION RATE</span>
            <span className="text-emerald-400 font-bold text-sm">{areaCoverageRateKm2s.toFixed(0)} km²/sec</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CROSS-TRACK PIXEL ELONGATION</span>
            <span className="text-amber-400 font-bold text-sm">x{(crossTrackGsdCm / nadirGsdCm).toFixed(2)} STRETCH</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">TARGET DISCRIMINATION TIER</span>
            <span className="text-cyan-400 font-bold text-sm">
              {meanGsdCm <= 35 ? "TACTICAL MILITARY" : meanGsdCm <= 70 ? "HIGH-RES COMMERCIAL" : "SURVEY MULTISPECTRAL"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: NIIRS & MISSION UTILITY */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Image Intelligence
        </h2>

        <div className="space-y-6">
          {/* NIIRS Score Card */}
          <div className="bg-cyan-950/20 border border-cyan-500/40 rounded-2xl p-5 space-y-2">
            <div className="text-[10px] font-bold tracking-wider text-cyan-400/80">
              ESTIMATED NIIRS LEVEL (GIQE MODEL)
            </div>
            <div className="text-4xl font-black text-cyan-400 flex items-center gap-2">
              <Eye className="w-8 h-8" />
              {estimatedNiirs.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 9.0</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {estimatedNiirs >= 6.0 
                ? "NIIRS 6+: Detect individual civilian vehicles, identify small aircraft types, detect radar antennas and tactical missile launcher positions."
                : estimatedNiirs >= 4.0 
                ? "NIIRS 4-5: Detect port cargo operations, identify highway lanes, identify military transport aircraft categories."
                : "NIIRS 1-3: Broad area surveillance, identify major road networks, determine coastline morphology and sea-ice boundaries."}
            </p>
          </div>

          {/* Elongation Distortion Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>GSD Off-Nadir Dispersion</span>
              <span className="text-emerald-400 font-bold">{rollAngleDeg}° ROLL</span>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Pure Nadir GSD:</span>
                <span className="text-white font-bold">{nadirGsdCm.toFixed(1)} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cross-Track (Elongated):</span>
                <span className="text-amber-400 font-bold">{crossTrackGsdCm.toFixed(1)} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Along-Track GSD:</span>
                <span className="text-white">{alongTrackGsdCm.toFixed(1)} cm</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500" 
                style={{ width: `${Math.min(100, (nadirGsdCm / crossTrackGsdCm) * 100)}%` }} 
              />
            </div>
          </div>

          {/* Target Detection Limits */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Target Identification Criteria</div>
            <div className="flex justify-between"><span className="text-slate-500">Detect Object (2-3 px):</span><span className="text-white font-bold">{(meanGsdCm * 2.5 / 100).toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Recognize Object (6-8 px):</span><span className="text-white font-bold">{(meanGsdCm * 7 / 100).toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Identify Exact Model (12+ px):</span><span className="text-amber-400 font-bold">{(meanGsdCm * 14 / 100).toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Raw Data Rate (12-bit):</span><span className="text-cyan-400 font-bold">{((spec.detectorPixelsX * spec.detectorPixelsY * 12 * 5) / 1e6).toFixed(0)} Mbps</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
