"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { Eye, Radio, Flame, Mountain } from "lucide-react"

type SensorMode = "OPTICAL" | "RADAR" | "THERMAL" | "TOPO"

export default function Asteroid3DViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [sensorMode, setSensorMode] = useState<SensorMode>("OPTICAL")
  const meshRef = useRef<THREE.Mesh | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 3.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // Generate Procedural Regolith Textures
    const bumpCanvas = document.createElement("canvas")
    bumpCanvas.width = 512
    bumpCanvas.height = 512
    const bCtx = bumpCanvas.getContext("2d")
    if (bCtx) {
      bCtx.fillStyle = "#808080"
      bCtx.fillRect(0, 0, 512, 512)
      for (let i = 0; i < 30000; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        const gray = Math.floor(Math.random() * 255)
        bCtx.fillStyle = `rgb(${gray},${gray},${gray})`
        bCtx.fillRect(x, y, 1.2, 1.2)
      }
      for (let c = 0; c < 45; c++) {
        const cx = Math.random() * 512
        const cy = Math.random() * 512
        const rad = 4 + Math.random() * 24
        const grad = bCtx.createRadialGradient(cx, cy, 1, cx, cy, rad)
        grad.addColorStop(0, "#1a1a1a")
        grad.addColorStop(0.7, "#666666")
        grad.addColorStop(0.95, "#ffffff")
        grad.addColorStop(1, "#808080")
        bCtx.fillStyle = grad
        bCtx.beginPath()
        bCtx.arc(cx, cy, rad, 0, Math.PI * 2)
        bCtx.fill()
      }
    }
    const bumpTexture = new THREE.CanvasTexture(bumpCanvas)
    bumpTexture.wrapS = THREE.RepeatWrapping
    bumpTexture.wrapT = THREE.RepeatWrapping

    // Solid Non-Tearing Apophis Geometry
    const geometry = new THREE.IcosahedronGeometry(1.12, 28)
    const pos = geometry.attributes.position
    const v = new THREE.Vector3()

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const norm = v.clone().normalize()

      const r1 = 1.0 + 0.22 * Math.sin(2.0 * norm.x + 0.4) * Math.cos(2.0 * norm.y)
      const r2 = 0.10 * Math.sin(3.4 * norm.z) * Math.cos(2.6 * norm.x)

      const craterDist1 = Math.hypot(norm.x - 0.45, norm.y - 0.25, norm.z - 0.65)
      const crater1 = craterDist1 < 0.42 ? -0.15 * Math.cos((craterDist1 / 0.42) * Math.PI * 0.5) : 0

      const craterDist2 = Math.hypot(norm.x + 0.5, norm.y + 0.35, norm.z - 0.3)
      const crater2 = craterDist2 < 0.35 ? -0.12 * Math.cos((craterDist2 / 0.35) * Math.PI * 0.5) : 0

      const finalRadius = 1.05 * (r1 + r2) + crater1 + crater2
      v.copy(norm).multiplyScalar(finalRadius)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geometry.computeVertexNormals()

    // 1. OPTICAL PBR MATERIAL
    const opticalMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.88,
      metalness: 0.05,
      bumpMap: bumpTexture,
      bumpScale: 0.045,
      flatShading: false,
    })

    const asteroidMesh = new THREE.Mesh(geometry, opticalMaterial)
    scene.add(asteroidMesh)
    meshRef.current = asteroidMesh

    // Lights
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.6)
    sunLight.position.set(5, 3.2, 3.5)
    scene.add(sunLight)

    const ambientLight = new THREE.AmbientLight(0x0c1322, 0.3)
    scene.add(ambientLight)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      asteroidMesh.rotation.y += 0.005
      asteroidMesh.rotation.x += 0.002
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
      renderer.dispose()
      bumpTexture.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Switch Sensor Material Dynamically (Zero duplicate keys)
  const handleSensorChange = (mode: SensorMode) => {
    setSensorMode(mode)
    const mesh = meshRef.current
    if (!mesh) return

    if (mode === "OPTICAL") {
      mesh.material = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.88,
        metalness: 0.05,
        wireframe: false,
        flatShading: false,
      })
    } else if (mode === "RADAR") {
      mesh.material = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
      })
    } else if (mode === "THERMAL") {
      mesh.material = new THREE.MeshStandardMaterial({
        color: 0xff4500,
        roughness: 0.25,
        metalness: 0.1,
        wireframe: false,
      })
    } else if (mode === "TOPO") {
      mesh.material = new THREE.MeshNormalMaterial({
        wireframe: false,
        flatShading: true,
      })
    }
  }

  return (
    <div className="relative w-full h-full bg-[#020408]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Sensor Mode Switcher Bar */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-10 text-[9px] font-mono">
        <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md border border-white/10 p-1">
          <button
            onClick={() => handleSensorChange("OPTICAL")}
            className={`px-2 py-0.5 uppercase tracking-wider transition-all flex items-center gap-1 ${
              sensorMode === "OPTICAL" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-2.5 h-2.5" />
            <span>OPTICAL</span>
          </button>

          <button
            onClick={() => handleSensorChange("RADAR")}
            className={`px-2 py-0.5 uppercase tracking-wider transition-all flex items-center gap-1 ${
              sensorMode === "RADAR" ? "bg-sky-400 text-black font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Radio className="w-2.5 h-2.5" />
            <span>RADAR</span>
          </button>

          <button
            onClick={() => handleSensorChange("THERMAL")}
            className={`px-2 py-0.5 uppercase tracking-wider transition-all flex items-center gap-1 ${
              sensorMode === "THERMAL" ? "bg-rose-500 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-2.5 h-2.5" />
            <span>THERMAL</span>
          </button>

          <button
            onClick={() => handleSensorChange("TOPO")}
            className={`px-2 py-0.5 uppercase tracking-wider transition-all flex items-center gap-1 ${
              sensorMode === "TOPO" ? "bg-emerald-400 text-black font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Mountain className="w-2.5 h-2.5" />
            <span>TOPO</span>
          </button>
        </div>

        <div className="px-2 py-1 bg-black/85 border border-white/10 text-slate-300">
          340m CHONDRITE
        </div>
      </div>

      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/85 border border-white/10 text-[8px] text-slate-400 font-mono">
        {sensorMode === "OPTICAL" && "DRACO NARROW-ANGLE CAMERA (0.4-0.9µm)"}
        {sensorMode === "RADAR" && "GOLDSTONE DSN 70m DELAY-DOPPLER SCATTER"}
        {sensorMode === "THERMAL" && "WISE/NEOS W3/W4 INFRARED (12-22µm)"}
        {sensorMode === "TOPO" && "SURFACE SLOPE & GRAVITY CONTOURS"}
      </div>

      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/85 border border-white/10 text-[9px] text-white font-bold font-mono">
        ROT: 30.56h
      </div>
    </div>
  )
}
