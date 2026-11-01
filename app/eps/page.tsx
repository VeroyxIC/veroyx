"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { 
  Zap, Sun, BatteryCharging, ShieldAlert, CheckCircle2, 
  Activity, Orbit, Cpu, RefreshCw, BarChart3, AlertTriangle 
} from "lucide-react"

export default function EPSPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // System Parameters
  const [arrayAreaM2, setArrayAreaM2] = useState(2.4) // m^2
  const [cellEfficiency, setCellEfficiency] = useState(29.5) // % (Triple-Junction GaAs)
  const [orbitAltKm, setOrbitAltKm] = useState(550) // km
  const [betaAngleDeg, setBetaAngleDeg] = useState(25) // deg
  const [batteryCapacityWh, setBatteryCapacityWh] = useState(650) // Wh (LiFePO4 / NMC)
  const [busVoltageV, setBusVoltageV] = useState(28) // 28V regulated bus
  const [daylightLoadW, setDaylightLoadW] = useState(280) // W
  const [eclipseLoadW, setEclipseLoadW] = useState(190) // W
  const [missionLifeYears, setMissionLifeYears] = useState(5)

  // Physical Constants
  const SOLAR_FLUX_W_M2 = 1361 // AM0 Solar Constant at 1 AU
  const EARTH_RADIUS_KM = 6371
  const MU = 398600.4418 // km^3/s^2

  // Orbital Period Calculation: T = 2π * sqrt(a^3 / μ)
  const semiMajorAxisKm = EARTH_RADIUS_KM + orbitAltKm
  const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3) / MU)
  const orbitPeriodMin = orbitPeriodSec / 60

  // Eclipse Duration (Cylindrical Shadow Model with Beta Angle):
  // sin(ρ) = R_E / r
  const rhoRad = Math.asin(EARTH_RADIUS_KM / semiMajorAxisKm)
  const betaRad = Math.abs(betaAngleDeg) * (Math.PI / 180)
  
  let eclipseFraction = 0
  if (betaRad < rhoRad) {
    const cosVal = Math.sqrt(Math.max(0, Math.sin(rhoRad)**2 - Math.sin(betaRad)**2)) / Math.cos(betaRad)
    eclipseFraction = Math.asin(Math.min(1, Math.max(0, cosVal))) / Math.PI
  }
  const eclipseTimeMin = orbitPeriodMin * eclipseFraction
  const daylightTimeMin = orbitPeriodMin - eclipseTimeMin

  // Solar Array Generation (BOL vs EOL with 2.5% degradation/year):
  const degradationFactor = Math.pow(1 - 0.025, missionLifeYears)
  const cellEffDecimal = cellEfficiency / 100
  const cosIncidence = Math.cos(betaRad) // Assuming Sun-tracking 1-axis array
  const bolPowerW = SOLAR_FLUX_W_M2 * arrayAreaM2 * cellEffDecimal * cosIncidence
  const eolPowerW = bolPowerW * degradationFactor

  // Energy Balance during Daylight:
  // Energy to recharge battery: E_batt_recharge = (Eclipse Load * Eclipse Time) / (η_discharge * η_charge)
  const chargeEff = 0.92
  const dischargeEff = 0.94
  const eclipseEnergyDemandWh = (eclipseLoadW * (eclipseTimeMin / 60)) / dischargeEff
  const requiredRechargePowerW = (eclipseEnergyDemandWh / (daylightTimeMin / 60)) / chargeEff
  const totalDaylightDemandW = daylightLoadW + requiredRechargePowerW
  const powerMarginW = eolPowerW - totalDaylightDemandW
  const isPowerPositive = powerMarginW >= 0

  // Battery Depth of Discharge (DoD):
  const batteryDoDPct = (eclipseEnergyDemandWh / batteryCapacityWh) * 100
  const maxSafeDoDPct = 40.0 // LEO standard for 5+ year cycle life (~28,000 cycles)

  // 3D Orbital Sun/Shadow Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 8, 14)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Sun Vector Directional Light (Pointing along +X)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.0)
    sunLight.position.set(15, 0, 0)
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.2))

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(3.0, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.8,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // Cylindrical Earth Shadow Cylinder (Umbra projection)
    const shadowGeo = new THREE.CylinderGeometry(3.0, 3.0, 16, 32, 1, true)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      side: THREE.BackSide
    })
    const shadowCylinder = new THREE.Mesh(shadowGeo, shadowMat)
    shadowCylinder.rotation.z = Math.PI / 2
    shadowCylinder.position.set(-8, 0, 0)
    scene.add(shadowCylinder)

    // Orbit Ring tilted by Beta Angle
    const orbitRadius = 4.8
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(128)
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints)
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    orbitLine.rotation.x = Math.PI / 2
    orbitLine.rotation.y = (betaAngleDeg * Math.PI) / 180
    scene.add(orbitLine)

    // Satellite Model Marker with Articulated Panels
    const satGroup = new THREE.Group()
    const busMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
    )
    satGroup.add(busMesh)

    const panelMeshL = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.02, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.2 })
    )
    panelMeshL.position.set(0.65, 0, 0)
    satGroup.add(panelMeshL)

    const panelMeshR = panelMeshL.clone()
    panelMeshR.position.set(-0.65, 0, 0)
    satGroup.add(panelMeshR)

    scene.add(satGroup)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Orbit angular progression
      const t = Date.now() * 0.0008
      const x = orbitRadius * Math.cos(t)
      const z = orbitRadius * Math.sin(t)

      // Apply beta angle inclination rotation to position
      const rad = (betaAngleDeg * Math.PI) / 180
      const rotatedX = x * Math.cos(rad)
      const rotatedY = x * Math.sin(rad)

      satGroup.position.set(rotatedX, rotatedY, z)
      satGroup.lookAt(0, 0, 0)

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
  }, [betaAngleDeg, orbitAltKm])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: EPS CONFIGURATION */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Zap className="w-5 h-5 text-amber-400" /> Power Systems (EPS)
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Solar Generation &amp; Battery DoD Energy Balance
          </p>
        </div>

        <div className="space-y-6">
          {/* Solar Array Controls */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <label className="text-slate-400 font-bold uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Sun className="w-3.5 h-3.5 text-amber-400" /> SOLAR ARRAY AREA</span>
              <span className="text-amber-400 font-bold">{arrayAreaM2.toFixed(2)} m²</span>
            </label>
            <input 
              type="range" min="0.5" max="8.0" step="0.1"
              value={arrayAreaM2}
              onChange={e => setArrayAreaM2(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>CubeSat (0.5m²)</span>
              <span>ESPA Class (2.4m²)</span>
              <span>SmallSat (8.0m²)</span>
            </div>
          </div>

          {/* Orbit Beta Angle */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <label className="text-slate-400 font-bold uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Orbit className="w-3.5 h-3.5 text-cyan-400" /> BETA ANGLE (β)</span>
              <span className="text-cyan-400 font-bold">{betaAngleDeg}°</span>
            </label>
            <input 
              type="range" min="0" max="75" step="1"
              value={betaAngleDeg}
              onChange={e => setBetaAngleDeg(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Max Eclipse (0°)</span>
              <span>Sun-Synchronous Noon (25°)</span>
              <span>Full Sun / Dawn-Dusk (75°)</span>
            </div>
          </div>

          {/* Battery Sizing & Bus */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <label className="text-slate-400 font-bold uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> BATT CAPACITY</span>
              <span className="text-emerald-400 font-bold">{batteryCapacityWh} Wh</span>
            </label>
            <input 
              type="range" min="100" max="2500" step="25"
              value={batteryCapacityWh}
              onChange={e => setBatteryCapacityWh(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">BUS VOLTAGE:</span>
              <div className="flex gap-2">
                {[28, 50, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => setBusVoltageV(v)}
                    className={`px-2 py-0.5 rounded border text-[10px] ${busVoltageV === v ? "bg-cyan-950 border-cyan-500 text-cyan-400 font-bold" : "border-slate-800 text-slate-500"}`}
                  >
                    {v}V
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payload Load Profiles */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Power Consumption Profiles
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Sunlit Mode Load:</span>
                <span className="text-white font-bold">{daylightLoadW} W</span>
              </div>
              <input 
                type="range" min="50" max="1200" step="10"
                value={daylightLoadW}
                onChange={e => setDaylightLoadW(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">Eclipse Mode Load:</span>
                <span className="text-white font-bold">{eclipseLoadW} W</span>
              </div>
              <input 
                type="range" min="30" max="800" step="10"
                value={eclipseLoadW}
                onChange={e => setEclipseLoadW(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D ORBITAL ECLIPSE VISUALIZER */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Orbit Illumination Geometry</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white">{orbitPeriodMin.toFixed(1)} min</span>
            <span className="text-slate-500 text-xs">ORBIT PERIOD</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-amber-400">SUN: {daylightTimeMin.toFixed(1)}m ({( (daylightTimeMin / orbitPeriodMin) * 100).toFixed(0)}%)</span>
            <span className="text-cyan-400">UMBRA: {eclipseTimeMin.toFixed(1)}m ({( (eclipseTimeMin / orbitPeriodMin) * 100).toFixed(0)}%)</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Orbit Eclipse Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl">
          <div className="flex justify-between mb-1.5 text-[10px]">
            <span className="text-amber-400 flex items-center gap-1"><Sun className="w-3 h-3" /> SUNLIT PHASE ({daylightTimeMin.toFixed(1)} min)</span>
            <span className="text-slate-400 flex items-center gap-1"><Orbit className="w-3 h-3" /> ECLIPSE SHADOW ({eclipseTimeMin.toFixed(1)} min)</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-amber-400" style={{ width: `${(daylightTimeMin / orbitPeriodMin) * 100}%` }} />
            <div className="h-full bg-slate-950 border-l border-slate-700" style={{ width: `${(eclipseTimeMin / orbitPeriodMin) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: ENERGY BALANCE & BATTERY METRICS */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" /> Power Balance
        </h2>

        <div className="space-y-6">
          {/* Power Margin Status Box */}
          <div className={`p-5 rounded-2xl border ${isPowerPositive ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className={`text-[10px] font-bold tracking-wider mb-1 ${isPowerPositive ? "text-emerald-400/80" : "text-rose-400/80"}`}>
              EOL POWER BALANCE MARGIN
            </div>
            <div className={`text-3xl font-black ${isPowerPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPowerPositive ? `+${powerMarginW.toFixed(1)}` : powerMarginW.toFixed(1)} W
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              {isPowerPositive 
                ? "Array provides sufficient energy to power daylight loads and fully replenish battery before next eclipse." 
                : "NEGATIVE ENERGY BALANCE: Satellite will experience progressive battery depletion each orbit."}
            </div>
          </div>

          {/* Battery DoD Metric */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold tracking-wider border-b border-slate-800 pb-2 flex justify-between">
              <span>BATTERY DOD (PER ORBIT)</span>
              <span className={batteryDoDPct <= maxSafeDoDPct ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {batteryDoDPct.toFixed(1)}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${batteryDoDPct <= maxSafeDoDPct ? "bg-emerald-500" : "bg-rose-500"}`} 
                style={{ width: `${Math.min(100, (batteryDoDPct / 50) * 100)}%` }} 
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Max Safe DoD: 40%</span>
              <span>Eclipse Demand: {eclipseEnergyDemandWh.toFixed(1)} Wh</span>
            </div>
          </div>

          {/* Solar Array Sizing Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Solar Array Metrics</div>
            <div className="flex justify-between"><span className="text-slate-500">BOL Generation:</span><span className="text-white">{bolPowerW.toFixed(0)} W</span></div>
            <div className="flex justify-between"><span className="text-slate-500">EOL Generation ({missionLifeYears} yr):</span><span className="text-amber-400 font-bold">{eolPowerW.toFixed(0)} W</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Recharge Requirement:</span><span className="text-cyan-400">{requiredRechargePowerW.toFixed(0)} W</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Bus Current (at {busVoltageV}V):</span><span className="text-white">{(eolPowerW / busVoltageV).toFixed(1)} A</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
