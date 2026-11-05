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
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    // Deformed 3D Asteroid Geometry (Apophis Sq-type chondrite)
    const geometry = new THREE.DodecahedronGeometry(1.08, 5)
    const pos = geometry.attributes.position
    const v = new THREE.Vector3()

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      // Multi-frequency impact cratering and escarpments
      const craterNoise = 
        Math.sin(v.x * 3.8) * 0.14 + 
        Math.cos(v.y * 4.2 + v.z * 2.2) * 0.08 + 
        Math.sin(v.z * 7.5 + v.x * 5.2) * 0.04
      
      // Irregular triaxial elongation (potato-shaped asteroid)
      const elongation = 1.0 + 0.35 * (v.x * v.x) - 0.18 * (v.y * v.y)
      v.multiplyScalar((1.0 + craterNoise) * elongation)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geometry.computeVertexNormals()

    // SpaceX Starshield PBR Material (Harsh reflective silicate regolith)
    const material = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    })

    const asteroidMesh = new THREE.Mesh(geometry, material)
    scene.add(asteroidMesh)

    // Directional Key Light (Unfiltered direct solar radiation in vacuum)
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.4)
    sunLight.position.set(5, 3.2, 3)
    scene.add(sunLight)

    // Deep space cold ambient fill
    const ambientLight = new THREE.AmbientLight(0x0a0f1d, 0.35)
    scene.add(ambientLight)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      // Real-time tumbling astrodynamics (non-principal axis rotation)
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full relative" />
}
