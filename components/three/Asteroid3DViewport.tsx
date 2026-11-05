"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function Asteroid3DViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 3.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // Generate Procedural Regolith Bump Map
    const bumpCanvas = document.createElement("canvas")
    bumpCanvas.width = 512
    bumpCanvas.height = 512
    const bCtx = bumpCanvas.getContext("2d")
    if (bCtx) {
      bCtx.fillStyle = "#808080"
      bCtx.fillRect(0, 0, 512, 512)
      // High-frequency silicate regolith dust
      for (let i = 0; i < 28000; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        const gray = Math.floor(Math.random() * 255)
        bCtx.fillStyle = `rgb(${gray},${gray},${gray})`
        bCtx.fillRect(x, y, 1.5, 1.5)
      }
      // Micro-crater depressions
      for (let c = 0; c < 50; c++) {
        const cx = Math.random() * 512
        const cy = Math.random() * 512
        const rad = 4 + Math.random() * 20
        const grad = bCtx.createRadialGradient(cx, cy, 1, cx, cy, rad)
        grad.addColorStop(0, "#222222")
        grad.addColorStop(0.7, "#666666")
        grad.addColorStop(0.9, "#ffffff")
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

    // Solid, Non-Tearing Asteroid Geometry (Smooth Icosahedron)
    const geometry = new THREE.IcosahedronGeometry(1.12, 28)
    const pos = geometry.attributes.position
    const v = new THREE.Vector3()

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const norm = v.clone().normalize()

      // Smooth harmonic boulder displacement
      const r1 = 1.0 + 0.22 * Math.sin(2.0 * norm.x + 0.4) * Math.cos(2.0 * norm.y)
      const r2 = 0.10 * Math.sin(3.4 * norm.z) * Math.cos(2.6 * norm.x)
      
      // Impact crater depressions
      const craterDist1 = Math.hypot(norm.x - 0.45, norm.y - 0.25, norm.z - 0.65)
      const crater1 = craterDist1 < 0.42 ? -0.15 * Math.cos((craterDist1 / 0.42) * Math.PI * 0.5) : 0

      const craterDist2 = Math.hypot(norm.x + 0.5, norm.y + 0.35, norm.z - 0.3)
      const crater2 = craterDist2 < 0.35 ? -0.12 * Math.cos((craterDist2 / 0.35) * Math.PI * 0.5) : 0

      const finalRadius = 1.05 * (r1 + r2) + crater1 + crater2
      v.copy(norm).multiplyScalar(finalRadius)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geometry.computeVertexNormals()

    // SpaceX Starshield Chondrite PBR Material
    const material = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.88,
      metalness: 0.05,
      bumpMap: bumpTexture,
      bumpScale: 0.045,
      flatShading: false,
    })

    const asteroidMesh = new THREE.Mesh(geometry, material)
    scene.add(asteroidMesh)

    // Unfiltered Direct Solar Radiation
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5)
    sunLight.position.set(5, 3.2, 3.5)
    scene.add(sunLight)

    // Deep space cold ambient scatter
    const ambientLight = new THREE.AmbientLight(0x0c1322, 0.35)
    scene.add(ambientLight)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      // Realistic non-principal tumbling rotation (Apophis 30.56h period)
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

  return <div ref={containerRef} className="w-full h-full relative" />
}
