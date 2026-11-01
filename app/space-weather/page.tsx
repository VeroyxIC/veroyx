"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  ShieldAlert, Sun, Activity, Zap, Radio, AlertTriangle, 
  ShieldCheck, Layers, Gauge, RefreshCw, Orbit 
} from "lucide-react"

type SolarCycle = "SOLAR_MIN" | "MODERATE" | "SOLAR_MAX"

export default function SpaceWeatherPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Orbital & Environment Controls
  const [orbitAltKm, setOrbitAltKm] = useState(650)
  const [inclinationDeg, setInclinationDeg] = useState(51.6) // ISS / high-density LEO
  const [shieldingMmAl, setShieldingMmAl] = useState(2.5) // Aluminum shielding thickness
  const [solarCycle, setSolarCycle] = useState<SolarCycle>("SOLAR_MAX")
  const [kpIndex, setKpIndex] = useState(4.2) // Geomagnetic storm activity (0-9)
  const [missionYears, setMissionYears] = useState(5)

  // Radiation Dosimetry Engine (Parametric NASA AP8/AE8 approximation)
  // Inner belt peak: ~3,000 km (Protons). Outer belt peak: ~18,000 km (Electrons).
  const isInsideSAA = orbitAltKm >= 450 && orbitAltKm <= 850 && inclinationDeg >= 25
  const solarCycleMult = solarCycle === "SOLAR_MAX" ? 1.45 : solarCycle === "SOLAR_MIN" ? 0.75 : 1.0

  // Total Ionizing Dose (TID) estimation [krad(Si)]:
  // Base dose drops exponentially with aluminum shielding thickness (Lambert-Beer attenuation approx)
  const altitudeFactor = Math.exp(-Math.pow(orbitAltKm - 3000, 2) / (2 * Math.pow(1500, 2))) * 120 + (orbitAltKm > 1000 ? (orbitAltKm / 1000) * 1.8 : 0.8)
  const shieldingAttenuation = Math.exp(-shieldingMmAl / 2.2)
  const annualTidKrad = (altitudeFactor * solarCycleMult * shieldingAttenuation)
  const totalMissionTidKrad = annualTidKrad * missionYears

  // Single Event Upset (SEU) Rate [bit-flips per Gbit / day]:
  // Heavy ions and trapped high-energy protons trigger upsets in SRAM/FPGA cells
  const kpFactor = 1 + (kpIndex / 9) * 0.8
  const baseSeuRate = isInsideSAA ? 4.2 : 0.45
  const seuPerGbitDay = (baseSeuRate * solarCycleMult * kpFactor) / Math.sqrt(shieldingMmAl)

  // Proton Flux (>10 MeV) [pfu: particles / (cm^2 s sr)]:
  const protonFluxPfu = Math.max(1.2, (kpIndex * 8.4) * (isInsideSAA ? 3.5 : 1.0))

  // 3D Magnetosphere & Van Allen Belts
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 10, 16)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 1.5))
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.5)
    sunLight.position.set(12, 0, 8)
    scene.add(sunLight)

    // 1. Earth Sphere
    const earthGeo = new THREE.SphereGeometry(2.0, 32, 32)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.8,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // SAA Hazard Polygon (Visual patch on Earth surface)
    const saaGeo = new THREE.SphereGeometry(2.01, 16, 16, Math.PI * 0.9, Math.PI * 0.4, Math.PI * 0.45, Math.PI * 0.3)
    const saaMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    })
    const saaPatch = new THREE.Mesh(saaGeo, saaMat)
    scene.add(saaPatch)

    // 2. Inner Van Allen Belt (Proton Trap: Torus geometry)
    const innerBeltGeo = new THREE.TorusGeometry(3.6, 0.7, 16, 64)
    const innerBeltMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    })
    const innerBelt = new THREE.Mesh(innerBeltGeo, innerBeltMat)
    innerBelt.rotation.x = Math.PI / 2
    scene.add(innerBelt)

    // 3. Outer Van Allen Belt (Electron Trap: Larger Torus)
    const outerBeltGeo = new THREE.TorusGeometry(6.5, 1.4, 16, 64)
    const outerBeltMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    })
    const outerBelt = new THREE.Mesh(outerBeltGeo, outerBeltMat)
    outerBelt.rotation.x = Math.PI / 2
    scene.add(outerBelt)

    // 4. Satellite Orbit Ring
    const orbitR = 2.0 + (orbitAltKm / 2000)
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitR, orbitR, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(128)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints)
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    orbitLine.rotation.x = Math.PI / 2
    orbitLine.rotation.y = (inclinationDeg * Math.PI) / 180
    scene.add(orbitLine)

    // Satellite Dot
    const satMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    scene.add(satMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Orbit movement
      const t = Date.now() * 0.001
      const x = orbitR * Math.cos(t)
      const z = orbitR * Math.sin(t)

      const incRad = (inclinationDeg * Math.PI) / 180
      satMesh.position.set(x * Math.cos(incRad), x * Math.sin(incRad), z)

      // Gentle wobble of geomagnetic axis
      innerBelt.rotation.z = Math.sin(t * 0.2) * 0.05
      outerBelt.rotation.z = Math.sin(t * 0.2) * 0.05

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
  }, [orbitAltKm, inclinationDeg])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: RADIATION CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Sun className="w-5 h-5 text-amber-400" /> Space Weather &amp; Radiation
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Van Allen Belts &amp; Single Event Effects (SEE)
          </p>
        </div>

        <div className="space-y-6">
          {/* Orbital Geometry */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Orbital Insertion Parameters
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">ORBIT ALTITUDE:</span>
                <span className="text-cyan-400 font-bold">{orbitAltKm} km</span>
              </div>
              <input 
                type="range" min="300" max="2500" step="25"
                value={orbitAltKm}
                onChange={e => setOrbitAltKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>LEO (400km)</span>
                <span>Inner Belt Boundary (1200km)</span>
                <span>MEO (2500km)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">INCLINATION:</span>
                <span className="text-emerald-400 font-bold">{inclinationDeg}°</span>
              </div>
              <input 
                type="range" min="0" max="98" step="1"
                value={inclinationDeg}
                onChange={e => setInclinationDeg(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Shielding Sizing */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <label className="text-slate-400 font-bold uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-cyan-400" /> AL SHIELDING THICKNESS</span>
              <span className="text-white font-bold">{shieldingMmAl.toFixed(1)} mm Al</span>
            </label>
            <input 
              type="range" min="0.5" max="10.0" step="0.5"
              value={shieldingMmAl}
              onChange={e => setShieldingMmAl(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Foil (0.5mm)</span>
              <span>Standard Bus (2.5mm)</span>
              <span>Rad-Hard Vault (10mm)</span>
            </div>
          </div>

          {/* Solar Cycle & Space Weather Indices */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Geomagnetic &amp; Solar Activity
            </div>

            <div className="flex gap-2">
              {(["SOLAR_MIN", "MODERATE", "SOLAR_MAX"] as SolarCycle[]).map(sc => (
                <button
                  key={sc}
                  onClick={() => setSolarCycle(sc)}
                  className={`flex-1 py-1.5 rounded border text-[10px] font-bold ${
                    solarCycle === sc 
                      ? "bg-amber-950 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                      : "border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {sc.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">PLANETARY KP-INDEX:</span>
                <span className="text-amber-400 font-bold">{kpIndex.toFixed(1)} / 9</span>
              </div>
              <input 
                type="range" min="0" max="9" step="0.1"
                value={kpIndex}
                onChange={e => setKpIndex(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Quiet (0-2)</span>
                <span>Active (3-4)</span>
                <span>Severe Storm (5-9)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D MAGNETOSPHERE & BELTS */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Space Radiation Environment</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white">AP8/AE8 TRAPPED FLUX</span>
            {isInsideSAA && (
              <span className="px-2.5 py-0.5 rounded bg-rose-950/80 border border-rose-500 text-rose-400 text-[10px] font-bold animate-pulse">
                SAA INTERSECT DETECTED
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-rose-400">INNER BELT: Trapped Protons (10-100 MeV)</span>
            <span className="text-cyan-400">OUTER BELT: Relativistic Electrons (1-10 MeV)</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Hazard Status Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <span className="text-slate-500 block text-[9px]">SOLAR PROTON FLUX (&gt;10 MeV)</span>
              <span className="text-amber-400 font-bold text-sm">{protonFluxPfu.toFixed(1)} pfu</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SOUTH ATLANTIC ANOMALY</span>
            <span className={isInsideSAA ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
              {isInsideSAA ? "HIGH FLUX HAZARD REGION" : "NOMINAL QUIET SECTOR"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GEOMAGNETIC SHIELDING</span>
            <span className="text-cyan-400 font-bold">L-SHELL L = {(1 + orbitAltKm / 6371).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: DOSIMETRY & HARDENING BUDGET */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" /> Radiation Hardening
        </h2>

        <div className="space-y-6">
          {/* Mission Lifetime TID */}
          <div className={`p-5 rounded-2xl border ${totalMissionTidKrad > 25 ? "bg-rose-950/20 border-rose-500/40" : "bg-cyan-950/20 border-cyan-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              {missionYears}-YEAR TOTAL IONIZING DOSE (TID)
            </div>
            <div className={`text-3xl font-black ${totalMissionTidKrad > 25 ? "text-rose-400" : "text-cyan-400"}`}>
              {totalMissionTidKrad.toFixed(1)} <span className="text-sm font-normal text-slate-400">krad(Si)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              Annual Rate: {annualTidKrad.toFixed(2)} krad(Si)/yr. Standard COTS parts degrade at 10-15 krad; Rad-Tolerant grade required for &gt;20 krad.
            </div>
          </div>

          {/* Single Event Upset Rate */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold tracking-wider border-b border-slate-800 pb-2 flex justify-between">
              <span>SINGLE EVENT UPSET (SEU)</span>
              <span className="text-amber-400 font-bold">{seuPerGbitDay.toFixed(2)} / Gbit-day</span>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${seuPerGbitDay > 2 ? "bg-rose-500" : "bg-emerald-500"}`} 
                style={{ width: `${Math.min(100, (seuPerGbitDay / 5) * 100)}%` }} 
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>EDAC Scrub Rate Req: 100 Hz</span>
              <span>SEL Risk: LOW</span>
            </div>
          </div>

          {/* Component Hardening Recommendations */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Avionics Hardening Profile</div>
            <div className="flex justify-between"><span className="text-slate-500">MCU / FPGA Class:</span><span className="text-white">{totalMissionTidKrad > 20 ? "Rad-Hard (Xilinx RT)" : "Automotive Grade + EDAC"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Solar Cell Coverglass:</span><span className="text-amber-400 font-bold">150 μm CMX Quartz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Latchup Threshold (LET):</span><span className="text-cyan-400">&gt; 43 MeV·cm²/mg</span></div>
            <div className="flex justify-between"><span className="text-slate-500">GCR Proton Margin:</span><span className="text-emerald-400">+3.4 dB (Safe)</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
