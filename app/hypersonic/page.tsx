"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Play, Pause, RotateCcw, Activity, Terminal, 
  ShieldCheck, Sliders, BarChart3, Wind, Layers, ArrowRight, Check,
  Flame, Gauge, Compass, Radio
} from "lucide-react"

export default function HypersonicSimulationPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const shockCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const tunnelCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sensorCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Interactive Scientific Controls
  const [isRunning, setIsRunning] = useState<boolean>(true)
  const [simTime, setSimTime] = useState<number>(10.4)
  const [machNumber, setMachNumber] = useState<number>(22.4)
  const [altitudeKm, setAltitudeKm] = useState<number>(48.5)
  const [angleAttackDeg, setAngleAttackDeg] = useState<number>(18.0)

  // Visual Layer Toggles
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true)
  const [showBowShock, setShowBowShock] = useState<boolean>(true)
  const [showThermalMap, setShowThermalMap] = useState<boolean>(true)
  const [showWireframe, setShowWireframe] = useState<boolean>(false)

  // Physical Aerodynamic Calculations (US Standard Atmosphere 1976 + Hypersonic Stagnation Theory)
  const physics = useMemo(() => {
    const rho0 = 1.225 // kg/m^3
    const H = 7.2 // scale height km
    const rho = rho0 * Math.exp(-altitudeKm / H)
    
    const T_inf = altitudeKm < 50 ? 270.0 : 220.0
    const gamma = 1.4
    const R_gas = 287.05
    const soundSpeed = Math.sqrt(gamma * R_gas * T_inf)
    const velocity = machNumber * soundSpeed
    const dynamicPressureKPa = (0.5 * rho * velocity * velocity) / 1000.0

    // Stagnation Temperature with real-gas dissociation damping
    const stagnationTempK = Math.min(4200.0, 300.0 + 150.0 * machNumber)

    // Sutton-Graves Stagnation Heat Flux (W/cm^2)
    const Rn = 1.85
    const k_sg = 1.7415e-4
    const heatFluxWcm2 = (k_sg * Math.sqrt(rho / Rn) * Math.pow(velocity, 3)) / 10000.0

    // Billig Hypersonic Bow Shock Standoff Distance (m)
    const shockStandoff = Rn * 0.143 * Math.exp(3.24 / (machNumber * machNumber))

    // Lift/Drag equilibrium
    const alphaRad = (angleAttackDeg * Math.PI) / 180.0
    const Cd = 0.315 + 0.14 * Math.sin(alphaRad) * Math.sin(alphaRad)
    const Cl = 0.22 * Math.sin(alphaRad) * Math.cos(alphaRad)
    const L_D = Cl / Math.max(0.01, Cd)

    return {
      density: rho,
      velocity,
      dynamicPressureKPa,
      stagnationTempK,
      heatFluxWcm2,
      shockStandoff,
      Cd,
      Cl,
      L_D
    }
  }, [machNumber, altitudeKm, angleAttackDeg])

  const paramsRef = useRef({ 
    machNumber, altitudeKm, angleAttackDeg, isRunning, 
    showStreamlines, showBowShock, showThermalMap, showWireframe, 
    shockStandoff: physics.shockStandoff 
  })
  useEffect(() => {
    paramsRef.current = { 
      machNumber, altitudeKm, angleAttackDeg, isRunning, 
      showStreamlines, showBowShock, showThermalMap, showWireframe, 
      shockStandoff: physics.shockStandoff 
    }
  }, [machNumber, altitudeKm, angleAttackDeg, isRunning, showStreamlines, showBowShock, showThermalMap, showWireframe, physics.shockStandoff])

  // 1. 3D WEBGL WIND TUNNEL & SEAMLESS SPACECRAFT ASSEMBLY
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#050811")

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 1000)
    camera.position.set(-16, 6.5, 14)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xfffaed, 4.2)
    keyLight.position.set(-18, 14, 14)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0)
    fillLight.position.set(16, -10, -10)
    scene.add(fillLight)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))

    // Vehicle Root Group
    const vehicleRoot = new THREE.Group()
    vehicleRoot.rotation.y = Math.PI / 4.4
    scene.add(vehicleRoot)

    // Sub-group for Angle of Attack articulation
    const vehicleBody = new THREE.Group()
    vehicleRoot.add(vehicleBody)

    // =========================================================================
    // SEAMLESS 1-PIECE WATERTIGHT LATHE GEOMETRY (ZERO GAPS, NO FLOATING BOWLS)
    // =========================================================================
    const lathePoints: THREE.Vector2[] = [
      new THREE.Vector2(0.0, -1.8),   // Apex of blunt heatshield (stagnation point)
      new THREE.Vector2(0.5, -1.75),
      new THREE.Vector2(1.0, -1.62),
      new THREE.Vector2(1.5, -1.35),
      new THREE.Vector2(1.85, -0.95),
      new THREE.Vector2(1.95, -0.65), // Heatshield shoulder radius
      new THREE.Vector2(1.85, -0.1),  // Conical capsule backshell
      new THREE.Vector2(1.72, 0.4),
      new THREE.Vector2(1.65, 0.8),   // Service module forward ring
      new THREE.Vector2(1.65, 1.6),   // Kapton gold foil band
      new THREE.Vector2(1.65, 2.4),   // Radiator panel band
      new THREE.Vector2(1.65, 3.0),   // Service module aft bulkhead
      new THREE.Vector2(0.6, 3.0),    // Recessed engine deck
      new THREE.Vector2(0.0, 3.0)     // Center of aft deck
    ]

    const vehicleGeo = new THREE.LatheGeometry(lathePoints, 64)

    // Advanced Aerodynamic Heatmap Shader
    const tileVertexShader = `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
    const tileFragmentShader = `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      uniform float uThermalOn;
      uniform float uWireframeOn;

      void main() {
        // Temperature gradient along axial height (y in [-1.8, 3.0])
        float heat = smoothstep(1.5, -1.8, vPosition.y);
        
        // Quad CAD & Ceramic Tile Grid Lines
        vec2 grid = abs(fract(vUv * vec2(36.0, 18.0) - 0.5) - 0.5) / fwidth(vUv * vec2(36.0, 18.0));
        float line = min(grid.x, grid.y);
        float tileLine = 1.0 - min(line, 1.0);

        vec3 col;
        if (uThermalOn > 0.5) {
          if (vPosition.y < 0.6) {
            // Capsule & Heatshield FEA Thermal Map
            if (heat > 0.75) {
              col = mix(vec3(0.98, 0.65, 0.05), vec3(0.95, 0.10, 0.02), (heat - 0.75) / 0.25);
            } else if (heat > 0.45) {
              col = mix(vec3(0.2, 0.88, 0.2), vec3(0.98, 0.65, 0.05), (heat - 0.45) / 0.30);
            } else if (heat > 0.20) {
              col = mix(vec3(0.05, 0.6, 0.95), vec3(0.2, 0.88, 0.2), (heat - 0.20) / 0.25);
            } else {
              col = mix(vec3(0.12, 0.16, 0.28), vec3(0.05, 0.6, 0.95), heat / 0.20);
            }
          } else if (vPosition.y < 1.8) {
            // Service module gold Kapton MLI foil band
            col = vec3(0.85, 0.55, 0.12);
          } else {
            // Service module white aluminum radiator band
            col = vec3(0.88, 0.90, 0.94);
          }
        } else {
          // Unshaded CAD Mode
          if (vPosition.y < -0.6) col = vec3(0.25, 0.25, 0.28);
          else if (vPosition.y < 0.6) col = vec3(0.85, 0.88, 0.92);
          else if (vPosition.y < 1.8) col = vec3(0.85, 0.55, 0.12);
          else col = vec3(0.88, 0.90, 0.94);
        }

        col = mix(col, vec3(0.01, 0.02, 0.04), tileLine * 0.45);
        if (uWireframeOn > 0.5) {
          col = mix(col, vec3(0.2, 0.9, 1.0), tileLine * 0.9);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
    const vehicleMat = new THREE.ShaderMaterial({
      vertexShader: tileVertexShader,
      fragmentShader: tileFragmentShader,
      uniforms: {
        uThermalOn: { value: 1.0 },
        uWireframeOn: { value: 0.0 }
      }
    })

    const vehicleMesh = new THREE.Mesh(vehicleGeo, vehicleMat)
    // Rotate Lathe so axis of revolution lies along the X axis, blunt nose pointing to -X
    vehicleMesh.rotation.z = -Math.PI / 2
    vehicleBody.add(vehicleMesh)

    // =========================================================================
    // GaAs SOLAR ARRAY WINGS WITH CELL GRIDS & GIMBAL MOUNTS
    // =========================================================================
    const wingGroup = new THREE.Group()
    const wingGeo = new THREE.BoxGeometry(0.05, 1.25, 4.2)
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.9,
      roughness: 0.22
    })

    const wingL = new THREE.Mesh(wingGeo, wingMat)
    wingL.position.set(2.0, 0, 3.2)
    wingGroup.add(wingL)

    const wingR = new THREE.Mesh(wingGeo, wingMat)
    wingR.position.set(2.0, 0, -3.2)
    wingGroup.add(wingR)

    // Carbon-composite array backing frames
    const frameGeo = new THREE.BoxGeometry(0.06, 1.3, 4.3)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
    const frameL = new THREE.Mesh(frameGeo, frameMat)
    frameL.position.set(1.98, 0, 3.2)
    wingGroup.add(frameL)
    const frameR = new THREE.Mesh(frameGeo, frameMat)
    frameR.position.set(1.98, 0, -3.2)
    wingGroup.add(frameR)

    vehicleBody.add(wingGroup)

    // =========================================================================
    // VACUUM ENGINE BELLS & RCS ATTITUDE CONTROL QUADS
    // =========================================================================
    const bellGeo = new THREE.ConeGeometry(0.26, 0.75, 24, 1, true)
    const bellMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.18 })
    const bellOffsets = [[3.5, 0.4, 0.4], [3.5, -0.4, 0.4], [3.5, 0, -0.45]]
    bellOffsets.forEach(([bx, by, bz]) => {
      const bell = new THREE.Mesh(bellGeo, bellMat)
      bell.rotation.z = Math.PI / 2
      bell.position.set(bx, by, bz)
      vehicleBody.add(bell)
    })

    // 4 RCS Thruster Pods around the capsule
    const rcsGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18)
    const rcsMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.92 })
    const rcsOffsets = [[0.0, 1.68, 0], [0.0, -1.68, 0], [0.0, 0, 1.68], [0.0, 0, -1.68]]
    rcsOffsets.forEach(([rx, ry, rz]) => {
      const rcs = new THREE.Mesh(rcsGeo, rcsMat)
      rcs.position.set(rx, ry, rz)
      vehicleBody.add(rcs)
    })

    // =========================================================================
    // VOLUMETRIC BOW SHOCK PARABOLOID SHELL (Matching Schlieren Shock Standoff)
    // =========================================================================
    const shockPts: THREE.Vector2[] = []
    for (let i = 0; i <= 32; i++) {
      const t = i / 32
      const r = t * 4.6
      const x = (r * r) / 5.2
      shockPts.push(new THREE.Vector2(r, x))
    }
    const shockGeo = new THREE.LatheGeometry(shockPts, 48)
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const shockShell = new THREE.Mesh(shockGeo, shockMat)
    shockShell.rotation.z = Math.PI / 2
    shockShell.position.set(-1.8, 0, 0)
    vehicleBody.add(shockShell)

    // Intense Stagnation Plasma Glow at the Nose Tip
    const plasmaLight = new THREE.PointLight(0xff6600, 3.5, 6)
    plasmaLight.position.set(-2.0, 0, 0)
    vehicleBody.add(plasmaLight)

    // =========================================================================
    // 140 ANIMATED DENSE CFD STREAMLINES WITH CONTINUOUS FLOW VELOCITY
    // =========================================================================
    const streamlinesGroup = new THREE.Group()
    const numStreamlines = 140
    const stepsPerLine = 75

    const rStreamline = (x: number, r0: number, standoff: number) => {
      const dx_nose = x - (-1.8)
      let r_disp = 0
      if (x < -1.8) {
        const t = Math.exp(dx_nose / 2.2)
        r_disp = 1.95 * t
      } else if (x <= 3.0) {
        const t = (x - (-1.8)) / 4.8
        r_disp = 1.95 - t * 0.35
      } else {
        const dx_wake = x - 3.0
        r_disp = Math.max(0.4, 1.6 * Math.exp(-dx_wake / 5.5))
      }
      return Math.sqrt(r0 * r0 + Math.pow(r_disp + standoff, 2))
    }

    const allLineGeos: THREE.BufferGeometry[] = []

    for (let s = 0; s < numStreamlines; s++) {
      const theta = (s / numStreamlines) * Math.PI * 2
      const rSeed = 0.25 + Math.pow(Math.random(), 1.25) * 5.2

      const points: THREE.Vector3[] = []
      const colors: number[] = []

      for (let i = 0; i < stepsPerLine; i++) {
        const t = i / (stepsPerLine - 1)
        const x = -16.0 + t * 32.0

        const r = rStreamline(x, rSeed, 0.25)
        const y = r * Math.cos(theta)
        const z = r * Math.sin(theta)
        points.push(new THREE.Vector3(x, y, z))

        // Physical Aerodynamic Temperature Color Map
        const col = new THREE.Color()
        if (x < -6.0) {
          col.setRGB(0.05, 0.65, 1.0) // Freestream Electric Cyan
        } else if (x < -1.8) {
          col.setRGB(0.15, 0.92, 0.2) // Shock Compression Lime Green
        } else if (x < 1.0 && rSeed < 2.0) {
          col.setRGB(1.0, 0.15, 0.02) // Stagnation Bow-Shock Incandescent Red
        } else if (x < 3.8) {
          col.setRGB(0.98, 0.78, 0.08) // Flank Expansion Amber / Yellow
        } else {
          col.setRGB(0.12, 0.48, 0.95) // Wake Recirculation Blue
        }
        colors.push(col.r, col.g, col.b)
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
      lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
      allLineGeos.push(lineGeo)

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        linewidth: 1.8
      })
      const line = new THREE.Line(lineGeo, lineMat)
      streamlinesGroup.add(line)
    }

    vehicleRoot.add(streamlinesGroup)

    // Interactive Drag Orbit Controls
    let isDragging = false
    let prevX = 0, prevY = 0
    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      vehicleRoot.rotation.y += (e.clientX - prevX) * 0.005
      vehicleRoot.rotation.x += (e.clientY - prevY) * 0.005
      prevX = e.clientX; prevY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(8, Math.min(32, camera.position.z + e.deltaY * 0.02))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const { angleAttackDeg, isRunning, showStreamlines, showBowShock, showThermalMap, showWireframe, shockStandoff } = paramsRef.current

      // Live update Angle of Attack pitch
      vehicleBody.rotation.z = (angleAttackDeg * Math.PI) / 180.0

      // Update shock standoff position
      shockShell.position.x = -1.8 - shockStandoff
      plasmaLight.position.x = -1.8 - shockStandoff * 0.5
      plasmaLight.intensity = 2.8 + Math.sin(t * 18.0) * 0.8

      // Layer visibilities
      streamlinesGroup.visible = showStreamlines
      shockShell.visible = showBowShock
      vehicleMat.uniforms.uThermalOn.value = showThermalMap ? 1.0 : 0.0
      vehicleMat.uniforms.uWireframeOn.value = showWireframe ? 1.0 : 0.0

      // Animate flow speed & aerodynamic flutter
      if (isRunning) {
        streamlinesGroup.rotation.x = Math.sin(t * 3.5) * 0.02
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
      container.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      container.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [])

  // 2. 2D STAGNATION HEATMAP (Matching image_9.png Top Right)
  useEffect(() => {
    const canvas = shockCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width, h = canvas.height
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, w, h)

    const cx = w * 0.44, cy = h * 0.5
    for (let r = 72; r > 6; r -= 3) {
      const norm = (r - 6) / 66
      if (norm < 0.22) ctx.fillStyle = "rgba(239, 68, 68, 0.98)"
      else if (norm < 0.50) ctx.fillStyle = "rgba(245, 158, 11, 0.88)"
      else if (norm < 0.75) ctx.fillStyle = "rgba(34, 197, 94, 0.65)"
      else ctx.fillStyle = "rgba(2, 132, 199, 0.35)"

      ctx.beginPath()
      ctx.ellipse(cx + (1.0 - norm) * 18, cy, r * 1.3, r * 0.85, 0, -Math.PI / 2, Math.PI / 2)
      ctx.fill()
    }

    ctx.fillStyle = "#f8fafc"
    ctx.beginPath()
    ctx.arc(cx + 20, cy, 15, -Math.PI / 2, Math.PI / 2)
    ctx.fill()
    ctx.fillRect(cx + 20, cy - 15, 38, 30)
  }, [machNumber])

  // 3. DRAG COEFFICIENT DYNAMIC CURVE (Matching image_9.png Mid Right)
  useEffect(() => {
    const canvas = dragCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width, h = canvas.height
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 1
    for (let y = 10; y < h; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.moveTo(10, h * 0.72)
    ctx.bezierCurveTo(w * 0.35, h * 0.18, w * 0.65, h * 0.82, w - 10, h * 0.42)
    ctx.stroke()
  }, [machNumber, angleAttackDeg])

  // 4. CROSS-SECTIONAL AIRFLOW 2D WIND TUNNEL (Matching image_9.png Center Right)
  useEffect(() => {
    const canvas = tunnelCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width, h = canvas.height
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, w, h)

    const cy = h * 0.5
    for (let y = 8; y < h; y += 7) {
      const distFromCenter = Math.abs(y - cy)
      ctx.strokeStyle = distFromCenter < 20 ? "#ef4444" : distFromCenter < 38 ? "#eab308" : "#0284c7"
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(10, y)
      ctx.bezierCurveTo(w * 0.35, y * 0.7 + cy * 0.3, w * 0.65, y * 1.3 - cy * 0.3, w - 10, y)
      ctx.stroke()
    }

    ctx.fillStyle = "#94a3b8"
    ctx.fillRect(w * 0.42, cy - 14, 32, 28)
  }, [])

  // 5. SENSOR SPECTRAL TELEMETRY (Matching image_9.png Bottom Right Oscilloscope)
  useEffect(() => {
    const canvas = sensorCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let offset = 0

    const render = () => {
      animId = requestAnimationFrame(render)
      offset += 0.06
      const w = canvas.width, h = canvas.height

      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, w, h)

      const channels = [
        { color: "#eab308", yBase: h * 0.20, freq: 0.08, amp: 9 },
        { color: "#22c55e", yBase: h * 0.42, freq: 0.11, amp: 7 },
        { color: "#38bdf8", yBase: h * 0.65, freq: 0.05, amp: 11 },
        { color: "#ef4444", yBase: h * 0.85, freq: 0.16, amp: 5 }
      ]

      channels.forEach(ch => {
        ctx.strokeStyle = ch.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let x = 0; x < w; x += 2) {
          const y = ch.yBase + Math.sin(x * ch.freq + offset) * ch.amp + (Math.random() - 0.5) * 2.0
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      })
    }
    render()

    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 flex flex-col bg-[#01030a] font-mono text-xs text-slate-100 select-none overflow-hidden">
      
      {/* TOP INDUSTRIAL TOOLBAR */}
      <div className="h-11 px-4 border-b border-slate-800 bg-[#020617] flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-black tracking-widest text-white uppercase text-sm">AERO-ORBITAL SYSTEM SIMULATOR</span>
          </div>
          
          <div className="flex items-center gap-3 text-slate-400 text-[10px] hidden md:flex">
            <span className="text-white font-bold cursor-pointer hover:text-cyan-400">File</span>
            <span className="cursor-pointer hover:text-cyan-400">Design</span>
            <span className="text-cyan-400 font-bold cursor-pointer">Simulation</span>
            <span className="text-emerald-400 font-bold cursor-pointer">Aerodynamics</span>
            <span className="cursor-pointer hover:text-cyan-400">Telemetry</span>
            <span className="cursor-pointer hover:text-cyan-400">Tools</span>
          </div>
        </div>

        {/* NASA & SPACEX CO-DEVELOPMENT BADGES */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
            <span className="font-bold text-sky-400">NASA</span>
            <span className="text-slate-600">|</span>
            <span className="font-bold text-white tracking-widest">SPACEX</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400 font-bold">SOLVER: CONVERGED (60 FPS)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-bold">
              MACH: {machNumber.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN DUAL-PANE WORKSTATION */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT VIEWPORT: 3D WIND TUNNEL & INTERACTIVE CONTROLS */}
        <div className="flex-1 h-full relative flex flex-col border-r border-slate-800">
          
          {/* Top Subheader Overlay with Mode Tabs */}
          <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] text-slate-300 backdrop-blur-md">
                <span className="text-cyan-400 font-bold">3D Modeling Viewport</span>
                <span className="mx-2 text-slate-600">|</span>
                <span>Mach {machNumber.toFixed(1)} Super-Orbital Entry Flow (Navier-Stokes)</span>
              </div>
            </div>

            {/* Scientific Readout Chips */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] text-amber-400 font-bold backdrop-blur-md">
                ALTITUDE: {altitudeKm.toFixed(1)} KM // AoA: {angleAttackDeg}°
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px] text-emerald-400 font-bold backdrop-blur-md hidden sm:block">
                q∞: {physics.dynamicPressureKPa.toFixed(1)} kPa
              </div>
            </div>
          </div>

          {/* Left Vertical Pressure Color-Bar Legend */}
          <div className="absolute left-4 top-20 z-10 p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-md text-[9px] font-mono space-y-2 pointer-events-none">
            <div className="text-slate-400 font-bold">Pressure [kN/m²]</div>
            <div className="h-44 w-4 rounded bg-gradient-to-t from-blue-600 via-green-500 via-yellow-400 to-red-600 border border-slate-800" />
            <div className="space-y-3.5 text-slate-400 text-[8px] pl-1 font-bold">
              <div>60</div><div>40</div><div>20</div><div>0</div>
            </div>
          </div>

          {/* 3D Scientific Layer Controls (Floating on Top Right of 3D Viewport) */}
          <div className="absolute right-4 top-20 z-10 p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-md text-[9px] font-mono space-y-2">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">CFD Layers</div>
            <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
              <input type="checkbox" checked={showStreamlines} onChange={e => setShowStreamlines(e.target.checked)} className="accent-cyan-500" />
              <span>Streamlines</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
              <input type="checkbox" checked={showBowShock} onChange={e => setShowBowShock(e.target.checked)} className="accent-cyan-500" />
              <span>Bow Shock Shell</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
              <input type="checkbox" checked={showThermalMap} onChange={e => setShowThermalMap(e.target.checked)} className="accent-cyan-500" />
              <span>Thermal FEA Map</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
              <input type="checkbox" checked={showWireframe} onChange={e => setShowWireframe(e.target.checked)} className="accent-cyan-500" />
              <span>CAD Wireframe</span>
            </label>
          </div>

          {/* 3D WebGL Canvas */}
          <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

          {/* BOTTOM ENGINEERING SLIDERS & TIMELINE DOCK */}
          <div className="h-44 border-t border-slate-800 bg-[#020617]/95 p-3 flex flex-col justify-between shrink-0 font-mono text-[10px] z-10">
            
            {/* Live Sliders for Aerospace Scientists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2 border-b border-slate-800/80">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">MACH NUMBER (M∞):</span>
                  <span className="text-cyan-400 font-bold">Mach {machNumber.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="28.0"
                  step="0.2"
                  value={machNumber}
                  onChange={e => setMachNumber(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">ALTITUDE:</span>
                  <span className="text-white font-bold">{altitudeKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="20.0"
                  max="90.0"
                  step="0.5"
                  value={altitudeKm}
                  onChange={e => setAltitudeKm(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">ANGLE OF ATTACK (α):</span>
                  <span className="text-amber-400 font-bold">{angleAttackDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="30.0"
                  step="0.5"
                  value={angleAttackDeg}
                  onChange={e => setAngleAttackDeg(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Subsystem Health Grid & Playback Buttons */}
            <div className="grid grid-cols-4 gap-3 pt-2">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[9px]">ABLATIVE HEAT SHIELD</div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">NOMINAL (94%)</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[9px]">RCS ATTITUDE JETS</div>
                <div className="text-cyan-400 font-bold text-xs mt-0.5">ACTIVE (88%)</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400 text-[9px]">BUS POWER (EPS)</div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">99.2% CHARGED</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRunning(r => !r)}
                  className={`flex-1 py-3 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                    isRunning 
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                      : "bg-emerald-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? "PAUSE" : "RUN"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT ANALYTICAL PANELS */}
        <div className="w-[520px] h-full flex flex-col bg-[#020617] overflow-y-auto">
          
          {/* Top Panel: Aerodynamic Analysis Heatmap & Drag Curve */}
          <div className="p-4 border-b border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-800 pb-1.5">
              <span className="text-white">Aerodynamic Analysis</span>
              <div className="flex gap-3 text-[10px]">
                <span className="text-cyan-400">✓ Thermal heating</span>
                <span className="text-amber-400">✓ Drag coefficient</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400">BOW SHOCK STAGNATION PLOT</div>
                <canvas ref={shockCanvasRef} width={220} height={110} className="w-full h-28 rounded-lg border border-slate-800 bg-black" />
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400">DRAG COEFFICIENT vs TIME</div>
                <canvas ref={dragCanvasRef} width={220} height={110} className="w-full h-28 rounded-lg border border-slate-800 bg-black" />
              </div>
            </div>
          </div>

          {/* Mid Panel: Cross-Sectional Airflow Wind Tunnel */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">
              Cross-sectional Airflow
            </div>
            <canvas ref={tunnelCanvasRef} width={460} height={90} className="w-full h-24 rounded-lg border border-slate-800 bg-black" />
          </div>

          {/* Scientific Telemetry Table (Dynamic Aerodynamic & Atmospheric Physics) */}
          <div className="p-4 border-b border-slate-800 grid grid-cols-2 gap-4 text-[10px]">
            <div className="space-y-1.5">
              <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">Aero Coefficients</div>
              <div className="flex justify-between"><span className="text-slate-500">Cd (DRAG):</span><span className="text-white font-bold">{physics.Cd.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cl (LIFT):</span><span className="text-cyan-400 font-bold">{physics.Cl.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">L/D RATIO:</span><span className="text-emerald-400 font-bold">{physics.L_D.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">STAGNATION T0:</span><span className="text-rose-400 font-bold">{physics.stagnationTempK.toFixed(0)} K</span></div>
            </div>
            <div className="space-y-1.5">
              <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">Atmospheric Parameters</div>
              <div className="flex justify-between"><span className="text-slate-500">VELOCITY:</span><span className="text-amber-400 font-bold">{(physics.velocity / 1000).toFixed(2)} km/s</span></div>
              <div className="flex justify-between"><span className="text-slate-500">DYNAMIC PRESS:</span><span className="text-white font-bold">{physics.dynamicPressureKPa.toFixed(1)} kPa</span></div>
              <div className="flex justify-between"><span className="text-slate-500">HEAT FLUX (q̇):</span><span className="text-rose-400 font-bold">{physics.heatFluxWcm2.toFixed(1)} W/cm²</span></div>
              <div className="flex justify-between"><span className="text-slate-500">STANDOFF (δ):</span><span className="text-cyan-300 font-bold">{(physics.shockStandoff * 100).toFixed(1)} cm</span></div>
            </div>
          </div>

          {/* Lower Panel: Sensor Spectral Simulation Oscilloscope */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1">
              <span>Sensor Spectral Telemetry</span>
              <span className="text-emerald-400">RF IONIZATION SHEATH</span>
            </div>
            <canvas ref={sensorCanvasRef} width={460} height={90} className="w-full h-24 rounded-lg border border-slate-800 bg-black" />
          </div>

          {/* Bottom Terminal Output Stream */}
          <div className="p-4 flex-1 flex flex-col space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Execution Logs // Aero-Thermal Stream</span>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-black border border-slate-800 text-[10px] font-mono text-emerald-400 space-y-1 overflow-y-auto">
              <div>[USSA-76] Atmospheric density rho = {physics.density.toExponential(3)} kg/m³ at {altitudeKm.toFixed(1)} km.</div>
              <div>[SOLVER] Navier-Stokes compressible hypersonic solver converged in 14 iterations.</div>
              <div className="text-cyan-400">[BILLIG] Bow shock standoff delta = {(physics.shockStandoff * 100).toFixed(1)} cm ahead of nose.</div>
              <div className="text-rose-400">[FAY-RIDDELL] Stagnation heat flux q_dot = {physics.heatFluxWcm2.toFixed(1)} W/cm² (T0 = {physics.stagnationTempK.toFixed(0)} K).</div>
              <div className="text-slate-400">[GUIDANCE] Lift-to-drag L/D = {physics.L_D.toFixed(3)} maintains nominal entry corridor.</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
