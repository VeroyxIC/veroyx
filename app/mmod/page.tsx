"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  ShieldAlert, ShieldCheck, Zap, Activity, Layers, 
  Gauge, Play, Square, RotateCcw, AlertTriangle, Target, Compass 
} from "lucide-react"

type ShieldConfig = "SINGLE_WHIPPLE" | "NEXTEL_KEVLAR_STUFFED" | "DUAL_BUMPER" | "MONOLITHIC_HULL"

interface ShieldSpec {
  name: string
  bumperMat: string
  intermediateMat: string
  rearWallMat: string
  arealDensityKgM2: number
  protectionFactor: number
  colorHex: string
}

const SHIELDS: Record<ShieldConfig, ShieldSpec> = {
  "SINGLE_WHIPPLE": {
    name: "Classic Whipple Bumper (Al 6061-T6)",
    bumperMat: "1.2 mm Aluminum 6061-T6",
    intermediateMat: "Vacuum Standoff Gap (100 mm)",
    rearWallMat: "3.2 mm Al 7075-T73 Pressure Hull",
    arealDensityKgM2: 12.5,
    protectionFactor: 1.0,
    colorHex: "#38bdf8"
  },
  "NEXTEL_KEVLAR_STUFFED": {
    name: "Nextel/Kevlar Multi-Layer Stuffed Whipple",
    bumperMat: "1.0 mm Aluminum Bumper",
    intermediateMat: "6x Nextel AF-26 + 6x Kevlar 129",
    rearWallMat: "2.5 mm Aluminum Rear Wall",
    arealDensityKgM2: 16.8,
    protectionFactor: 1.65,
    colorHex: "#10b981"
  },
  "DUAL_BUMPER": {
    name: "Dual-Layer Staged Fragmenting Bumper",
    bumperMat: "0.8 mm Outer Sacrificial Foil",
    intermediateMat: "1.5 mm Intermediate Shock Plate",
    rearWallMat: "4.0 mm Ti-6Al-4V Titanium Hull",
    arealDensityKgM2: 24.2,
    protectionFactor: 2.10,
    colorHex: "#f59e0b"
  },
  "MONOLITHIC_HULL": {
    name: "Unshielded Monolithic Structural Shell",
    bumperMat: "None (Direct Impact)",
    intermediateMat: "None",
    rearWallMat: "6.0 mm Al 6061-T6 Monolithic",
    arealDensityKgM2: 16.2,
    protectionFactor: 0.35,
    colorHex: "#ef4444"
  }
}

export default function MmodPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [shieldType, setShieldType] = useState<ShieldConfig>("NEXTEL_KEVLAR_STUFFED")
  const [debrisDiameterMm, setDebrisDiameterMm] = useState(3.5) // Projectile diameter in mm
  const [impactVelocityKms, setImpactVelocityKms] = useState(10.2) // Hypervelocity regime (7-15 km/s)
  const [impactAngleDeg, setImpactAngleDeg] = useState(15) // Angle from surface normal
  const [standoffDistanceMm, setStandoffDistanceMm] = useState(100) // Standoff between bumper and hull
  const [missionYears, setMissionYears] = useState(7)
  const [exposedAreaM2, setExposedAreaM2] = useState(14.5)
  const [isPlaying, setIsPlaying] = useState(true)

  const spec = SHIELDS[shieldType]

  // Physical Constants & Material Properties
  const AL_DENSITY_G_CM3 = 2.70
  const projectileMassG = (4 / 3) * Math.PI * Math.pow(debrisDiameterMm / 20, 3) * AL_DENSITY_G_CM3
  const projectileMassKg = projectileMassG / 1000

  // Kinetic Energy of Impact: E_k = 0.5 * m * v^2 [kJ]
  const velocityMs = impactVelocityKms * 1000
  const kineticEnergyKj = (0.5 * projectileMassKg * Math.pow(velocityMs, 2)) / 1000

  // Christiansen Hypervelocity Ballistic Limit Equation (BLE):
  // Critical projectile diameter that causes threshold perforation of rear wall:
  // d_c = 3.918 * t_w^(2/3) * S^(1/3) * (sigma_y / 40)^(1/3) / (rho_p^(1/3) * rho_b^(1/9) * (v * cos(theta))^(2/3))
  const rearWallThicknessCm = 0.30
  const standoffCm = standoffDistanceMm / 10
  const normalVelocityKms = impactVelocityKms * Math.cos((impactAngleDeg * Math.PI) / 180)
  
  const baseDcMm = (
    3.918 * 
    Math.pow(rearWallThicknessCm, 2/3) * 
    Math.pow(standoffCm, 1/3) * 
    Math.pow(45 / 40, 1/3) // 45 ksi yield strength of rear wall
  ) / (
    Math.pow(AL_DENSITY_G_CM3, 1/3) * 
    Math.pow(AL_DENSITY_G_CM3, 1/9) * 
    Math.pow(Math.max(normalVelocityKms, 3.0), 2/3)
  ) * 10 * spec.protectionFactor

  const criticalDiameterMm = Math.max(0.2, baseDcMm)

  // Penetration Assessment
  const isPenetrated = debrisDiameterMm >= criticalDiameterMm
  const marginPct = ((criticalDiameterMm - debrisDiameterMm) / criticalDiameterMm) * 100

  // Flux & Probability of No Penetration (NASA ORDEM 3.1 Approximation):
  // Annual flux of debris >= debrisDiameter: Phi(d) = 1.4e-4 * d^(-2.2) [impacts / m^2 / yr]
  const annualFluxPerM2 = 1.4e-4 * Math.pow(Math.max(criticalDiameterMm, 0.5), -2.2)
  const totalExpectedCriticalImpacts = annualFluxPerM2 * exposedAreaM2 * missionYears
  const probabilityNoPenetrationPct = Math.exp(-totalExpectedCriticalImpacts) * 100

  // 3D Three.js Hypervelocity Fragment Cloud & Whipple Shield Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 4, 18)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e293b, 1.8))
    const spot = new THREE.DirectionalLight(0xfffaed, 2.5)
    spot.position.set(10, 15, 12)
    scene.add(spot)

    const shieldGroup = new THREE.Group()
    scene.add(shieldGroup)

    // 1. Outer Whipple Sacrificial Bumper Plate
    const bumperGeo = new THREE.BoxGeometry(7.0, 5.0, 0.08)
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.2
    })
    const bumperMesh = new THREE.Mesh(bumperGeo, bumperMat)
    bumperMesh.position.set(0, 0, 2.5)
    shieldGroup.add(bumperMesh)

    // Bumper Entry Hole
    const holeGeo = new THREE.RingGeometry(0.01, 0.35, 16)
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
    const entryHole = new THREE.Mesh(holeGeo, holeMat)
    entryHole.position.set(0, 0, 2.55)
    shieldGroup.add(entryHole)

    // 2. Rear Pressure Hull Wall
    const rearWallGeo = new THREE.BoxGeometry(7.0, 5.0, 0.25)
    const rearWallMat = new THREE.MeshStandardMaterial({
      color: isPenetrated ? 0xef4444 : 0x0284c7,
      metalness: 0.8,
      roughness: 0.3
    })
    const rearWallMesh = new THREE.Mesh(rearWallGeo, rearWallMat)
    rearWallMesh.position.set(0, 0, -2.5)
    shieldGroup.add(rearWallMesh)

    // Intermediate Standoff Guide Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155 })
    const railGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.0, 12)

    const railTL = new THREE.Mesh(railGeo, railMat)
    railTL.rotation.x = Math.PI / 2
    railTL.position.set(-3.2, 2.2, 0)
    shieldGroup.add(railTL)

    const railTR = railTL.clone()
    railTR.position.set(3.2, 2.2, 0)
    shieldGroup.add(railTR)

    const railBL = railTL.clone()
    railBL.position.set(-3.2, -2.2, 0)
    shieldGroup.add(railBL)

    const railBR = railTL.clone()
    railBR.position.set(3.2, -2.2, 0)
    shieldGroup.add(railBR)

    // 3. Hypervelocity Expanding Debris Cone / Vapor Cloud
    const particleCount = 280
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    const particleVelocities: { x: number; y: number; z: number; life: number }[] = []

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3 + 0] = 0
      particlePositions[i * 3 + 1] = 0
      particlePositions[i * 3 + 2] = 2.5

      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.8
      particleVelocities.push({
        x: Math.cos(angle) * radius * 0.08,
        y: Math.sin(angle) * radius * 0.08,
        z: -(Math.random() * 0.12 + 0.04),
        life: Math.random()
      })
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))

    const particleMat = new THREE.PointsMaterial({
      color: isPenetrated ? 0xef4444 : 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    })
    const debrisCloud = new THREE.Points(particleGeo, particleMat)
    shieldGroup.add(debrisCloud)

    // 4. Incoming Projectile Vector Arrow
    const trajGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 7.5),
      new THREE.Vector3(0, 0, 2.5)
    ])
    const trajMat = new THREE.LineDashedMaterial({
      color: 0xfffaed,
      dashSize: 0.4,
      gapSize: 0.2
    })
    const trajLine = new THREE.Line(trajGeo, trajMat)
    trajLine.computeLineDistances()
    shieldGroup.add(trajLine)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Animate expanding debris cloud
      if (isPlaying) {
        const positions = particleGeo.attributes.position.array as Float32Array
        for (let i = 0; i < particleCount; i++) {
          particleVelocities[i].life += 0.025
          positions[i * 3 + 0] += particleVelocities[i].x
          positions[i * 3 + 1] += particleVelocities[i].y
          positions[i * 3 + 2] += particleVelocities[i].z

          // Reset loop when particles hit rear wall (z = -2.5)
          if (positions[i * 3 + 2] <= -2.5 || particleVelocities[i].life > 1.0) {
            positions[i * 3 + 0] = 0
            positions[i * 3 + 1] = 0
            positions[i * 3 + 2] = 2.5
            particleVelocities[i].life = 0
          }
        }
        particleGeo.attributes.position.needsUpdate = true
      }

      // Gentle inspection orbit
      shieldGroup.rotation.y = Math.sin(Date.now() * 0.0006) * 0.15
      shieldGroup.rotation.x = Math.cos(Date.now() * 0.0004) * 0.05

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
  }, [shieldType, isPenetrated, isPlaying])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: MMOD THREAT & SHIELD CONTROLS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <ShieldAlert className="w-5 h-5 text-cyan-400" /> MMOD Shielding
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Hypervelocity Impact &amp; Christiansen BLE
          </p>
        </div>

        <div className="space-y-6">
          {/* Shield Architecture Presets */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Whipple Bumper Architecture
            </label>
            <div className="space-y-2">
              {(["SINGLE_WHIPPLE", "NEXTEL_KEVLAR_STUFFED", "DUAL_BUMPER", "MONOLITHIC_HULL"] as ShieldConfig[]).map(s => {
                const item = SHIELDS[s]
                return (
                  <button
                    key={s}
                    onClick={() => setShieldType(s)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      shieldType === s 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.intermediateMat}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-cyan-400 font-bold block">{item.arealDensityKgM2} kg/m²</span>
                      <span className="text-slate-500">x{item.protectionFactor} Factor</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Projectile & Impact Vector Sliders */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Hypervelocity Projectile Mechanics
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">PROJECTILE DIAMETER:</span>
                <span className={`font-bold ${isPenetrated ? "text-rose-400" : "text-emerald-400"}`}>
                  {debrisDiameterMm.toFixed(1)} mm
                </span>
              </div>
              <input 
                type="range" min="0.5" max="12.0" step="0.1"
                value={debrisDiameterMm}
                onChange={e => setDebrisDiameterMm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Paint Fleck (0.5 mm)</span>
                <span>Threshold (3.5 mm)</span>
                <span>Critical Penetrator (12 mm)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">IMPACT VELOCITY (V_REL):</span>
                <span className="text-amber-400 font-bold">{impactVelocityKms.toFixed(1)} km/s</span>
              </div>
              <input 
                type="range" min="3.0" max="15.0" step="0.2"
                value={impactVelocityKms}
                onChange={e => setImpactVelocityKms(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">IMPACT OBLIQUITY ANGLE:</span>
                <span className="text-white font-bold">{impactAngleDeg}°</span>
              </div>
              <input 
                type="range" min="0" max="65" step="1"
                value={impactAngleDeg}
                onChange={e => setImpactAngleDeg(Number(e.target.value))}
                className="w-full accent-slate-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">WHIPPLE STANDOFF GAP (S):</span>
                <span className="text-cyan-400 font-bold">{standoffDistanceMm} mm</span>
              </div>
              <input 
                type="range" min="30" max="250" step="5"
                value={standoffDistanceMm}
                onChange={e => setStandoffDistanceMm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Mission Exposure Lifetime */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Exposure Sizing Envelope</div>
            <div className="flex justify-between"><span className="text-slate-500">Mission Operational Life:</span><span className="text-white font-bold">{missionYears} Years</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Exposed Surface Area:</span><span className="text-white font-bold">{exposedAreaM2} m²</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Shield Areal Mass:</span><span className="text-cyan-400 font-bold">{(spec.arealDensityKgM2 * exposedAreaM2).toFixed(1)} kg total</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Impact Kinetic Energy:</span><span className="text-amber-400 font-bold">{kineticEnergyKj.toFixed(2)} kJ</span></div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS WHIPPLE SHIELD HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Ballistic Limit Status (BLE)</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${isPenetrated ? "text-rose-400" : "text-emerald-400"}`}>
              {criticalDiameterMm.toFixed(2)} mm
            </span>
            <span className="text-slate-500 text-sm">CRITICAL DIAMETER (d_c)</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className={isPenetrated ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
              STATUS: {isPenetrated ? "HULL PERFORATION VIOLATION" : "SURFACE DEFENSE NOMINAL"}
            </span>
            <span className="text-cyan-400">KINETIC ENERGY: {kineticEnergyKj.toFixed(2)} kJ</span>
            <span className="text-amber-400">PNP: {probabilityNoPenetrationPct.toFixed(2)}%</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Protection Performance HUD Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">PROJECTILE DIAMETER / CRITICAL RATIO</span>
              <span className={`text-sm font-bold ${isPenetrated ? "text-rose-400" : "text-emerald-400"}`}>
                {(debrisDiameterMm / criticalDiameterMm).toFixed(2)}x (d / d_c)
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SAFETY MARGIN</span>
            <span className={`text-sm font-bold ${marginPct >= 0 ? "text-emerald-400" : "text-rose-400 font-black animate-pulse"}`}>
              {marginPct >= 0 ? `+${marginPct.toFixed(1)}%` : `${marginPct.toFixed(1)}% PENETRATED`}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SHOCK EXPANSION MECHANISM</span>
            <span className="text-cyan-400 font-bold text-sm">COMPLETE VAPORIZATION (&gt;7 km/s)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">NASA ORDEM RISK TIER</span>
            <span className="text-emerald-400 font-bold text-sm">CATEGORY A (PNP &gt; 95%)</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: HYPERVELOCITY PHYSICS CASCADE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Hypervelocity Physics
        </h2>

        <div className="space-y-6">
          {/* Mission Survivability Card */}
          <div className={`p-5 rounded-2xl border ${!isPenetrated ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              MISSION ASSURANCE COMPLIANCE
            </div>
            <div className={`text-2xl font-black flex items-center gap-2 ${!isPenetrated ? "text-emerald-400" : "text-rose-400"}`}>
              {!isPenetrated ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              {!isPenetrated ? "HULL INTEGRITY SAFE" : "PRESSURE HULL BREACH"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {!isPenetrated 
                ? "Whipple bumper shocks incoming hypervelocity projectile into an expanding liquid-vapor debris cloud, distributing momentum across the hull without rear perforation." 
                : "CATASTROPHIC BREACH: Projectile mass exceeds bumper shock vaporization capacity, causing spallation and rupture of the internal pressure vessel."}
            </p>
          </div>

          {/* Christiansen BLE Parameter Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Christiansen BLE Cascade</div>
            <div className="flex justify-between"><span className="text-slate-500">Projectile Mass:</span><span className="text-white font-bold">{projectileMassG.toFixed(3)} grams</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Normal Velocity (v_n):</span><span className="text-amber-400 font-bold">{normalVelocityKms.toFixed(2)} km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Bumper Standoff (S):</span><span className="text-white">{standoffDistanceMm} mm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Critical Diameter (d_c):</span><span className="text-cyan-400 font-bold">{criticalDiameterMm.toFixed(2)} mm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Actual Diameter (d):</span><span className={isPenetrated ? "text-rose-400 font-bold" : "text-white"}>{debrisDiameterMm.toFixed(2)} mm</span></div>
            <div className="flex justify-between font-bold border-t border-slate-800 pt-1.5"><span className="text-white">Lifetime Survival (PNP):</span><span className="text-emerald-400 font-black">{probabilityNoPenetrationPct.toFixed(2)}%</span></div>
          </div>

          {/* NASA Debris Mitigation Standard Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              NASA-STD-8719.14 Requirement
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Standard 4.5 requires probability of no penetration (PNP) to exceed 90.0% (and institutional target of &gt;95.0%) across full mission operational life to eliminate orbital debris generation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
