"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Crosshair, ShieldAlert, ShieldCheck, Radio, Zap, 
  Orbit, Globe, Activity, Eye, Terminal, Layers, 
  Compass, AlertTriangle, Play, Square, RotateCcw, Maximize2 
} from "lucide-react"

interface TrackedAsset {
  id: string
  name: string
  noradId: number
  country: string
  orbitType: "LEO_SSO" | "MEO_NAV" | "GEO_COMMS" | "FOREIGN_RPO"
  altitudeKm: number
  inclinationDeg: number
  velocityKms: number
  status: "NOMINAL" | "JAMMED" | "CONJUNCTION_ALERT" | "HOSTILE_DRIFT"
  threatLevel: "GREEN" | "YELLOW" | "RED"
  colorHex: number
}

const THEATER_ASSETS: TrackedAsset[] = [
  {
    id: "VXO-01",
    name: "VXO-1 Tactical Optical Recon",
    noradId: 58210,
    country: "US / ALLIED",
    orbitType: "LEO_SSO",
    altitudeKm: 510,
    inclinationDeg: 97.4,
    velocityKms: 7.61,
    status: "NOMINAL",
    threatLevel: "GREEN",
    colorHex: 0x38bdf8
  },
  {
    id: "VXO-02",
    name: "Aegis-SAR High-Res Radar",
    noradId: 59312,
    country: "US / ALLIED",
    orbitType: "LEO_SSO",
    altitudeKm: 620,
    inclinationDeg: 98.1,
    velocityKms: 7.55,
    status: "JAMMED",
    threatLevel: "YELLOW",
    colorHex: 0xf59e0b
  },
  {
    id: "TGT-99",
    name: "COSMOS-2558 Co-Orbital Inspector",
    noradId: 53324,
    country: "NON-ALLIED",
    orbitType: "FOREIGN_RPO",
    altitudeKm: 525,
    inclinationDeg: 97.4,
    velocityKms: 7.60,
    status: "HOSTILE_DRIFT",
    threatLevel: "RED",
    colorHex: 0xef4444
  },
  {
    id: "GEO-04",
    name: "Milstar Defense Feeder Gateway",
    noradId: 28114,
    country: "US / ALLIED",
    orbitType: "GEO_COMMS",
    altitudeKm: 35786,
    inclinationDeg: 0.05,
    velocityKms: 3.07,
    status: "NOMINAL",
    threatLevel: "GREEN",
    colorHex: 0x10b981
  }
]

export default function C2CommandPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [selectedAssetId, setSelectedAssetId] = useState<string>("VXO-01")
  const [showGroundStations, setShowGroundStations] = useState(true)
  const [defconLevel, setDefconLevel] = useState<number>(3)
  const [simSpeed, setSimSpeed] = useState<number>(1)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const activeAsset = THEATER_ASSETS.find(a => a.id === selectedAssetId) || THEATER_ASSETS[0]

  const [telemetry, setTelemetry] = useState({
    lat: 42.15,
    lon: -71.22,
    altKm: activeAsset.altitudeKm,
    groundSpeedKms: activeAsset.velocityKms,
    betaAngleDeg: 24.5,
    eclipseCountdownMin: 41.2
  })

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setTelemetry(prev => ({
          lat: Number((Math.sin(Date.now() * 0.0004 * simSpeed) * activeAsset.inclinationDeg).toFixed(2)),
          lon: Number((((prev.lon + 0.15 * simSpeed) + 180) % 360 - 180).toFixed(2)),
          altKm: activeAsset.altitudeKm + Number((Math.sin(Date.now() * 0.001) * 1.5).toFixed(1)),
          groundSpeedKms: activeAsset.velocityKms,
          betaAngleDeg: 24.5,
          eclipseCountdownMin: Math.max(0.5, Number((prev.eclipseCountdownMin - 0.05 * simSpeed).toFixed(1)))
        }))
      }, 100)
    }
    return () => clearInterval(timer)
  }, [isPlaying, simSpeed, activeAsset])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 16, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.2)
    sun.position.set(30, 15, 20)
    scene.add(sun)

    const earthRadius = 6.371
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.8,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    })
    const earthGrid = new THREE.Mesh(new THREE.SphereGeometry(earthRadius * 1.005, 36, 18), gridMat)
    earth.add(earthGrid)

    const stations = [
      { name: "Svalbard", lat: 78.2, lon: 15.4 },
      { name: "Wallops", lat: 37.9, lon: -75.5 },
      { name: "Diego Garcia", lat: -7.3, lon: 72.4 },
      { name: "Pine Gap", lat: -23.7, lon: 133.8 }
    ]

    const stationConesGroup = new THREE.Group()
    earth.add(stationConesGroup)

    stations.forEach(st => {
      const phi = (90 - st.lat) * (Math.PI / 180)
      const theta = (st.lon + 180) * (Math.PI / 180)
      const pos = new THREE.Vector3(
        -earthRadius * Math.sin(phi) * Math.cos(theta),
        earthRadius * Math.cos(phi),
        earthRadius * Math.sin(phi) * Math.sin(theta)
      )

      const coneGeo = new THREE.ConeGeometry(1.6, 3.5, 16, 1, true)
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.25
      })
      const cone = new THREE.Mesh(coneGeo, coneMat)
      cone.position.copy(pos)
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      stationConesGroup.add(cone)
    })

    const assetMeshes: { id: string; mesh: THREE.Mesh; orbitGroup: THREE.Group; radius: number; speed: number }[] = []

    THEATER_ASSETS.forEach(asset => {
      const orbitGroup = new THREE.Group()
      orbitGroup.rotation.x = (asset.inclinationDeg * Math.PI) / 180

      const orbitR = earthRadius + (asset.altitudeKm > 5000 ? 10.5 : (asset.altitudeKm / 350) * 1.4)
      const orbitCurve = new THREE.EllipseCurve(0, 0, orbitR, orbitR, 0, 2 * Math.PI, false, 0)
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitCurve.getPoints(96))
      const orbitMat = new THREE.LineBasicMaterial({
        color: asset.colorHex,
        transparent: true,
        opacity: 0.4
      })
      const orbitLine = new THREE.Line(orbitGeo, orbitMat)
      orbitGroup.add(orbitLine)

      const satGeo = new THREE.BoxGeometry(0.35, 0.35, 0.5)
      const satMat = new THREE.MeshStandardMaterial({
        color: asset.colorHex,
        emissive: asset.colorHex,
        emissiveIntensity: 0.6
      })
      const satMesh = new THREE.Mesh(satGeo, satMat)
      orbitGroup.add(satMesh)

      const fGeo = new THREE.ConeGeometry(1.2, 4.0, 16, 1, true)
      const fMat = new THREE.MeshBasicMaterial({
        color: asset.colorHex,
        wireframe: true,
        transparent: true,
        opacity: 0.2
      })
      const fCone = new THREE.Mesh(fGeo, fMat)
      fCone.rotation.x = Math.PI
      fCone.position.set(0, 0, -2.0)
      satMesh.add(fCone)

      scene.add(orbitGroup)
      assetMeshes.push({
        id: asset.id,
        mesh: satMesh,
        orbitGroup,
        radius: orbitR,
        speed: asset.velocityKms * 0.0003
      })
    })

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = Date.now()

      earth.rotation.y += 0.0008 * simSpeed

      assetMeshes.forEach((item, idx) => {
        const u = (t * item.speed * simSpeed) + idx * 1.5
        item.mesh.position.set(item.radius * Math.cos(u), item.radius * Math.sin(u), 0)
        item.mesh.lookAt(0, 0, 0)
      })

      stationConesGroup.visible = showGroundStations

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
  }, [simSpeed, showGroundStations])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
              <Crosshair className="w-5 h-5 text-cyan-400" /> JSpOC Tactical C2
            </h1>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
              Space Operations Center Theater Glass
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500 text-[10px]">DEFCON:</span>
            <span className={`font-black text-sm ${defconLevel <= 2 ? "text-rose-500 animate-pulse" : defconLevel === 3 ? "text-amber-400" : "text-emerald-400"}`}>
              {defconLevel}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Orbit className="w-3.5 h-3.5 text-cyan-400" /> Active Theater Objects</span>
              <span className="text-slate-400 font-bold">{THEATER_ASSETS.length} TRACKED</span>
            </label>
            <div className="space-y-2">
              {THEATER_ASSETS.map(asset => {
                const isSelected = asset.id === selectedAssetId
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {asset.name}
                        {asset.threatLevel === "RED" && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        NORAD #{asset.noradId} | {asset.country} | {asset.altitudeKm.toLocaleString()} km
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className={`font-bold block ${asset.threatLevel === "RED" ? "text-rose-400" : asset.threatLevel === "YELLOW" ? "text-amber-400" : "text-emerald-400"}`}>
                        {asset.status.replace("_", " ")}
                      </span>
                      <span className="text-slate-500">{asset.velocityKms} km/s</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>Threat Level Protocol</span>
              <div className="flex gap-1.5">
                {[5, 4, 3, 2, 1].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setDefconLevel(lvl)}
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${defconLevel === lvl ? "bg-rose-950 border-rose-500 text-rose-300" : "border-slate-800 text-slate-500"}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">PROPAGATION WARP:</span>
                <span className="text-cyan-400 font-bold">{simSpeed}x REAL-TIME</span>
              </div>
              <input 
                type="range" min="1" max="10" step="1"
                value={simSpeed}
                onChange={e => setSimSpeed(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">GROUND STATION VISIBILITY DOMES:</span>
              <button
                onClick={() => setShowGroundStations(!showGroundStations)}
                className={`px-3 py-1 rounded border text-[10px] font-bold ${showGroundStations ? "bg-cyan-950 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
              >
                {showGroundStations ? "ACTIVE (4 NODES)" : "HIDDEN"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Target Ephemeris Summary</div>
            <div className="flex justify-between"><span className="text-slate-500">Designation:</span><span className="text-white font-bold">{activeAsset.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">NORAD Catalog:</span><span className="text-cyan-400 font-bold">#{activeAsset.noradId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Sub-Satellite Lat/Lon:</span><span className="text-white">{telemetry.lat}&deg;N, {telemetry.lon}&deg;E</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Instantaneous Altitude:</span><span className="text-emerald-400 font-bold">{telemetry.altKm.toFixed(1)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ground Speed:</span><span className="text-white">{telemetry.groundSpeedKms} km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Beta Angle:</span><span className="text-amber-400 font-bold">{telemetry.betaAngleDeg}&deg;</span></div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Global Theater Operations</div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">{activeAsset.name}</span>
            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeAsset.threatLevel === "RED" ? "bg-rose-950 border-rose-500 text-rose-300" : "bg-cyan-950 border-cyan-500 text-cyan-300"}`}>
              {activeAsset.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">NEXT UMBRA PASS: {telemetry.eclipseCountdownMin} MIN</span>
            <span className="text-emerald-400">GROUND TRACK: LOCKED</span>
            <span className="text-amber-400">SENSORS: ACTIVE AESA/OPTICAL</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">SATELLITE DOWNLINK</span>
              <span className="text-white font-bold text-sm">X-BAND CARRIER (8.45 GHz)</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CROSS-TRACK THREAT</span>
            <span className={`text-sm font-bold ${activeAsset.threatLevel === "RED" ? "text-rose-400 font-black animate-pulse" : "text-emerald-400"}`}>
              {activeAsset.threatLevel === "RED" ? "PROXIMITY DRIFT DETECTED" : "SCREENING CLEAR"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">TRACKING NETWORK</span>
            <span className="text-cyan-400 font-bold text-sm">SSN PHASED ARRAY MESH</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SYSTEM READINESS</span>
            <span className="text-emerald-400 font-bold text-sm">OPERATIONAL 100%</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Tactical Intelligence
        </h2>

        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border ${activeAsset.threatLevel === "RED" ? "bg-rose-950/20 border-rose-500/40" : "bg-cyan-950/20 border-cyan-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              SPACE SITUATIONAL ALERT
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${activeAsset.threatLevel === "RED" ? "text-rose-400" : "text-cyan-400"}`}>
              {activeAsset.threatLevel === "RED" ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              {activeAsset.threatLevel === "RED" ? "HOSTILE RPO DRIFT" : "NOMINAL REGIME"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {activeAsset.threatLevel === "RED" 
                ? "Foreign inspector satellite is executing non-cooperative co-elliptic closing maneuvers. S-band command uplink monitoring active for potential jamming." 
                : "Orbital elements conform strictly to published ephemeris with zero uncoordinated orbital plane shifts."}
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Live Theater Activity</div>
            <div className="text-emerald-400 text-[10px]">• 08:24:12 UTC: Svalbard ground station acquisition of signal (AOS) locked.</div>
            <div className="text-amber-400 text-[10px]">• 08:26:45 UTC: RF interference detection threshold exceeded on Aegis-SAR (+12.4 dB J/S).</div>
            <div className="text-cyan-400 text-[10px]">• 08:28:01 UTC: OISL crosslink handshake verified between VXO-1 and VXO-2.</div>
            <div className="text-rose-400 text-[10px]">• 08:30:19 UTC: COSMOS-2558 plane change burn detected by Fylingdales radar.</div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              JSpOC Architecture Standard
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Real-time telemetry and state vector propagation conform to CCSDS Orbit Data Messages (ODM) and USSF Space Domain Awareness tracking specifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
