"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Orbit, Network, Globe, Activity, Rocket, 
  DollarSign, ShieldCheck, Play, Square, RotateCcw, 
  Radio, Compass, Layers, Zap, Clock 
} from "lucide-react"

type ConstellationPreset = "SDA_TRANCHE1" | "COMMERCIAL_BROADBAND" | "POLAR_RECON" | "MEO_NAVIGATION"

interface WalkerPreset {
  name: string
  inclinationDeg: number
  totalSats: number
  planes: number
  phaseFactor: number
  altitudeKm: number
  unitCostM: number
  payloadClass: string
  colorHex: string
}

const PRESETS: Record<ConstellationPreset, WalkerPreset> = {
  "SDA_TRANCHE1": {
    name: "SDA Tranche 1 Transport Layer",
    inclinationDeg: 81.0,
    totalSats: 126,
    planes: 6,
    phaseFactor: 1,
    altitudeKm: 1000,
    unitCostM: 14.5,
    payloadClass: "Optical Crosslink Mesh Router",
    colorHex: "#38bdf8"
  },
  "COMMERCIAL_BROADBAND": {
    name: "Global Broadband Shell Alpha",
    inclinationDeg: 53.0,
    totalSats: 72,
    planes: 6,
    phaseFactor: 2,
    altitudeKm: 550,
    unitCostM: 1.2,
    payloadClass: "Ka/Ku Phased Array Gateway",
    colorHex: "#10b981"
  },
  "POLAR_RECON": {
    name: "Arctic & Maritime Surveillance",
    inclinationDeg: 97.4,
    totalSats: 24,
    planes: 4,
    phaseFactor: 1,
    altitudeKm: 620,
    unitCostM: 28.0,
    payloadClass: "Synthetic Aperture Radar (SAR)",
    colorHex: "#f59e0b"
  },
  "MEO_NAVIGATION": {
    name: "Medium Earth Orbit PNT",
    inclinationDeg: 55.0,
    totalSats: 24,
    planes: 3,
    phaseFactor: 1,
    altitudeKm: 20200,
    unitCostM: 85.0,
    payloadClass: "Atomic Clock Navigation Payload",
    colorHex: "#d946ef"
  }
}

export default function ConstellationsPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [preset, setPreset] = useState<ConstellationPreset>("SDA_TRANCHE1")
  const [altitudeKm, setAltitudeKm] = useState(1000)
  const [inclinationDeg, setInclinationDeg] = useState(81)
  const [planes, setPlanes] = useState(6)
  const [satsPerPlane, setSatsPerPlane] = useState(21)
  const [phaseFactor, setPhaseFactor] = useState(1)
  const [showCrosslinks, setShowCrosslinks] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)

  const totalSats = planes * satsPerPlane
  const spec = PRESETS[preset]

  // Keplerian Orbital Physics
  const EARTH_RADIUS_KM = 6371
  const MU = 398600.4418
  const semiMajorAxisKm = EARTH_RADIUS_KM + altitudeKm
  const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3) / MU)
  const orbitPeriodMin = orbitPeriodSec / 60
  const orbitalVelocityKms = Math.sqrt(MU / semiMajorAxisKm)

  // Walker Geometry Calculations
  const raanSpacingDeg = 360 / planes
  const inPlaneSpacingDeg = 360 / satsPerPlane
  const interPlanePhaseDeg = (phaseFactor * 360) / totalSats

  // Line-of-Sight Intersatellite Link (ISL) Range Calculation:
  // Intra-plane neighbor chord distance: d = 2 * r * sin(theta / 2)
  const intraPlaneAngleRad = (inPlaneSpacingDeg * Math.PI) / 180
  const intraPlaneDistanceKm = 2 * semiMajorAxisKm * Math.sin(intraPlaneAngleRad / 2)

  // Tangent Grazing Altitude for Intra-plane ISL:
  // h_tangent = r * cos(theta / 2) - R_E
  const tangentAltKm = semiMajorAxisKm * Math.cos(intraPlaneAngleRad / 2) - EARTH_RADIUS_KM
  const isIslObscuredByEarth = tangentAltKm < 80 // Dense atmospheric cutoff

  // Revisit Time Approximation (Statistical Poisson coverage across mid-latitudes):
  const footprintHalfAngleRad = Math.acos(EARTH_RADIUS_KM / semiMajorAxisKm)
  const footprintDiameterKm = 2 * EARTH_RADIUS_KM * footprintHalfAngleRad
  const surfaceAreaFraction = (footprintDiameterKm / 40075) ** 2
  const meanRevisitMin = Math.max(2, (orbitPeriodMin / (totalSats * surfaceAreaFraction * 0.8)))

  // Constellation Production Economics (Wright's 85% Learning Curve):
  // C_cum = C_1 * T^(log2(0.85) + 1) / (log2(0.85) + 1)
  const learningExponent = Math.log2(0.85)
  const totalFleetCostM = spec.unitCostM * Math.pow(totalSats, learningExponent + 1) * 0.75
  const launchPayloadCapacity = 24 // e.g. 24 smallsats per heavy launch
  const requiredLaunches = Math.ceil(totalSats / launchPayloadCapacity)

  // 3D Three.js Multi-Plane Constellation Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 14, 22)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.5))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.0)
    sun.position.set(20, 20, 20)
    scene.add(sun)

    // 1. Earth Sphere
    const earthR = 5.0
    const earthGeo = new THREE.SphereGeometry(earthR, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.8,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // Earth Equatorial Reference Ring
    const eqGeo = new THREE.RingGeometry(earthR * 1.01, earthR * 1.02, 64)
    const eqMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
    const eqRing = new THREE.Mesh(eqGeo, eqMat)
    eqRing.rotation.x = Math.PI / 2
    scene.add(eqRing)

    // 2. Walker Orbital Planes & Satellites Group
    const orbitR = earthR * (1 + Math.min(altitudeKm, 3000) / 4000)
    const incRad = (inclinationDeg * Math.PI) / 180

    const constellationGroup = new THREE.Group()
    scene.add(constellationGroup)

    const satMeshes: { mesh: THREE.Mesh; planeIdx: number; satIdx: number }[] = []

    // Helper: Build each orbital plane ring
    for (let p = 0; p < planes; p++) {
      const planeGroup = new THREE.Group()
      const raanRad = ((p * raanSpacingDeg) * Math.PI) / 180

      // Rotate to RAAN around Polar Axis (Y), then tilt by Inclination (X)
      planeGroup.rotation.y = raanRad
      planeGroup.rotation.x = incRad

      // Circular Orbit Ring
      const ringCurve = new THREE.EllipseCurve(0, 0, orbitR, orbitR, 0, 2 * Math.PI, false, 0)
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringCurve.getPoints(64))
      const ringMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(spec.colorHex),
        transparent: true,
        opacity: 0.35
      })
      const ringMesh = new THREE.Line(ringGeo, ringMat)
      planeGroup.add(ringMesh)

      // Instantiate Satellites in Plane
      for (let s = 0; s < satsPerPlane; s++) {
        const satGeo = new THREE.SphereGeometry(0.12, 12, 12)
        const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const satMesh = new THREE.Mesh(satGeo, satMat)
        planeGroup.add(satMesh)

        satMeshes.push({ mesh: satMesh, planeIdx: p, satIdx: s })
      }

      constellationGroup.add(planeGroup)
    }

    // 3. Dynamic Inter-Satellite Optical Crosslinks (LineSegments)
    const maxLinkCount = planes * satsPerPlane * 2
    const linkPositions = new Float32Array(maxLinkCount * 6)
    const linkGeo = new THREE.BufferGeometry()
    linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3))

    const linkMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    })
    const linkLines = new THREE.LineSegments(linkGeo, linkMat)
    scene.add(linkLines)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = Date.now() * 0.0006

      // Update Satellites along Orbit Rings
      satMeshes.forEach(item => {
        // True anomaly with in-plane spacing and Walker phase offset
        const phaseOffsetRad = (item.planeIdx * interPlanePhaseDeg * Math.PI) / 180
        const inPlaneOffsetRad = (item.satIdx * inPlaneSpacingDeg * Math.PI) / 180
        const u = isPlaying ? (t + phaseOffsetRad + inPlaneOffsetRad) : (phaseOffsetRad + inPlaneOffsetRad)

        item.mesh.position.set(orbitR * Math.cos(u), orbitR * Math.sin(u), 0)
      })

      // Update ISL Mesh Beams
      if (showCrosslinks && !isIslObscuredByEarth) {
        linkLines.visible = true
        let linkIdx = 0
        const worldPosA = new THREE.Vector3()
        const worldPosB = new THREE.Vector3()

        for (let p = 0; p < planes; p++) {
          for (let s = 0; s < satsPerPlane; s++) {
            const currentItem = satMeshes.find(item => item.planeIdx === p && item.satIdx === s)
            const nextItem = satMeshes.find(item => item.planeIdx === p && item.satIdx === (s + 1) % satsPerPlane)

            if (currentItem && nextItem && linkIdx < maxLinkCount) {
              currentItem.mesh.getWorldPosition(worldPosA)
              nextItem.mesh.getWorldPosition(worldPosB)

              linkPositions[linkIdx * 6 + 0] = worldPosA.x
              linkPositions[linkIdx * 6 + 1] = worldPosA.y
              linkPositions[linkIdx * 6 + 2] = worldPosA.z

              linkPositions[linkIdx * 6 + 3] = worldPosB.x
              linkPositions[linkIdx * 6 + 4] = worldPosB.y
              linkPositions[linkIdx * 6 + 5] = worldPosB.z

              linkIdx++
            }
          }
        }
        linkGeo.attributes.position.needsUpdate = true
      } else {
        linkLines.visible = false
      }

      // Rotate Earth slowly
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
  }, [planes, satsPerPlane, inclinationDeg, altitudeKm, phaseFactor, showCrosslinks, isPlaying, spec, inPlaneSpacingDeg, interPlanePhaseDeg, raanSpacingDeg, isIslObscuredByEarth])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: WALKER DELTA GEOMETRY CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Network className="w-5 h-5 text-cyan-400" /> Constellation Architect
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Walker Delta (i : T / P / F) &amp; Mesh Crosslinks
          </p>
        </div>

        <div className="space-y-6">
          {/* Preset Architectures */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Operational Constellation Presets
            </label>
            <div className="space-y-2">
              {(["SDA_TRANCHE1", "COMMERCIAL_BROADBAND", "POLAR_RECON", "MEO_NAVIGATION"] as ConstellationPreset[]).map(p => {
                const item = PRESETS[p]
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setPreset(p)
                      setAltitudeKm(item.altitudeKm)
                      setInclinationDeg(item.inclinationDeg)
                      setPlanes(item.planes)
                      setSatsPerPlane(item.totalSats / item.planes)
                      setPhaseFactor(item.phaseFactor)
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      preset === p 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.payloadClass}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.totalSats} Spacecraft</span>
                      <span className="text-slate-500">{item.planes} Planes ({item.inclinationDeg}°)</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Walker Notation Tuning */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Walker Delta Parameters</span>
              <span className="text-cyan-400 font-bold">{inclinationDeg}° : {totalSats} / {planes} / {phaseFactor}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">ORBITAL PLANES (P):</span>
                <span className="text-cyan-400 font-bold">{planes} PLANES</span>
              </div>
              <input 
                type="range" min="1" max="12" step="1"
                value={planes}
                onChange={e => setPlanes(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">SATS PER PLANE (S):</span>
                <span className="text-emerald-400 font-bold">{satsPerPlane} SATS</span>
              </div>
              <input 
                type="range" min="2" max="36" step="1"
                value={satsPerPlane}
                onChange={e => setSatsPerPlane(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">INCLINATION (i):</span>
                <span className="text-amber-400 font-bold">{inclinationDeg}°</span>
              </div>
              <input 
                type="range" min="0" max="100" step="1"
                value={inclinationDeg}
                onChange={e => setInclinationDeg(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">ALTITUDE:</span>
                <span className="text-white font-bold">{altitudeKm} km</span>
              </div>
              <input 
                type="range" min="300" max="2500" step="50"
                value={altitudeKm}
                onChange={e => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-slate-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Toggle Crosslinks */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">OPTICAL INTER-SATELLITE LINKS:</span>
              <button
                onClick={() => setShowCrosslinks(!showCrosslinks)}
                className={`px-3 py-1 rounded border text-[10px] font-bold ${
                  showCrosslinks 
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {showCrosslinks ? "ISL ACTIVE (1550nm)" : "DISABLED"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS CONSTELLATION DISPLAY */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Constellation Telemetry</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">{totalSats} Spacecraft</span>
            <span className="text-cyan-400 font-bold text-lg">({planes} x {satsPerPlane})</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-emerald-400">REVISIT: ~{meanRevisitMin.toFixed(1)} min</span>
            <span className="text-cyan-400">VELOCITY: {orbitalVelocityKms.toFixed(2)} km/s</span>
            <span className="text-amber-400">ISL RANGE: {intraPlaneDistanceKm.toFixed(0)} km</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Global Architecture Status Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Orbit className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">WALKER DELTA NOTATION</span>
              <span className="text-white font-bold text-sm">{inclinationDeg}° : {totalSats} / {planes} / {phaseFactor}</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ISL GRAZING MARGIN</span>
            <span className={`text-sm font-bold ${isIslObscuredByEarth ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
              {isIslObscuredByEarth ? "EARTH OCCULTED" : `+${tangentAltKm.toFixed(0)} km CLEAR`}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GLOBAL SURFACE COVERAGE</span>
            <span className="text-cyan-400 font-bold text-sm">
              {Math.min(100, totalSats * surfaceAreaFraction * 90).toFixed(0)}% CONTINUOUS
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">FLEET REFRESH CADENCE</span>
            <span className="text-amber-400 font-bold text-sm">{orbitPeriodMin.toFixed(0)} MIN PERIOD</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: FLEET ECONOMICS & MANIFEST */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Fleet Manifest
        </h2>

        <div className="space-y-6">
          {/* Program Acquisition Budget Card */}
          <div className="bg-cyan-950/20 border border-cyan-500/40 rounded-2xl p-5 space-y-2">
            <div className="text-[10px] font-bold tracking-wider text-cyan-400/80">
              FLEET PRODUCTION CAPITAL (85% LEARNING)
            </div>
            <div className="text-3xl font-black text-cyan-400 flex items-center gap-1">
              <DollarSign className="w-6 h-6" />
              {totalFleetCostM.toFixed(1)}M
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Based on Wright's learning curve over {totalSats} serial space vehicles, yielding an effective recurring build cost of ${(totalFleetCostM / totalSats).toFixed(2)}M per satellite.
            </p>
          </div>

          {/* Launch Manifest Schedule */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Launch Campaign</span>
              <span className="text-emerald-400 font-bold">{requiredLaunches} LAUNCHES</span>
            </div>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between"><span className="text-slate-500">Launch Vehicle:</span><span className="text-white">Falcon Heavy / Dedicated SSO</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Manifest Density:</span><span className="text-white font-bold">{launchPayloadCapacity} sats/launch</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Planes Per Launch:</span><span className="text-cyan-400">1.0 Plane / Burn</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Constellation Insertion:</span><span className="text-emerald-400 font-bold">{planes} Dedicated Rides</span></div>
            </div>
          </div>

          {/* Intersatellite Routing Performance */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">ISL Routing Specs</div>
            <div className="flex justify-between"><span className="text-slate-500">Mesh Topology:</span><span className="text-white font-bold">4-Node Grid (Toroidal)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Optical Optical Terminals:</span><span className="text-cyan-400 font-bold">4x 1550nm OISL</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Crosslink Throughput:</span><span className="text-white">100 Gbps / Term</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Transit Latency:</span><span className="text-emerald-400 font-bold">3.3 ms / 1,000 km</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
