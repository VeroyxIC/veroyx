"use client"

import { useEffect, useRef } from "react"
import { useMission } from "@/lib/missionStore"
import * as THREE from "three"

export default function GroundTrackPage() {
  const { mission, isPlaying, timeScale, simTimeSec } = useMission()
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#010308")

    const aspect = width / height
    const viewSize = 200
    const camera = new THREE.OrthographicCamera(-viewSize * aspect / 2, viewSize * aspect / 2, viewSize / 2, -viewSize / 2, 0.1, 1000)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    const textureLoader = new THREE.TextureLoader()
    const mapTexture = textureLoader.load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg", () => renderer.render(scene, camera))
    mapTexture.colorSpace = THREE.SRGBColorSpace

    const mapWidth = 360 
    const mapHeight = 180 

    const mapGeo = new THREE.PlaneGeometry(mapWidth, mapHeight)
    const mapMat = new THREE.MeshBasicMaterial({ map: mapTexture, transparent: true, opacity: 0.8 })
    const mapMesh = new THREE.Mesh(mapGeo, mapMat)
    scene.add(mapMesh)

    const gridHelper = new THREE.GridHelper(mapWidth, 36, 0x1e293b, 0x0f172a)
    gridHelper.rotation.x = Math.PI / 2
    scene.add(gridHelper)

    const orbitGeo = new THREE.BufferGeometry()
    const maxPts = 500
    const positions = new Float32Array(maxPts * 3)
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

    const satMesh = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    )
    scene.add(satMesh)

    const swathMesh = new THREE.Mesh(
      new THREE.RingGeometry(12, 14, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 })
    )
    scene.add(swathMesh)

    const mu = 398600.4418
    const a = 6378.137 + mission.altitudeKm
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const n = Math.sqrt(mu / Math.pow(a, 3))

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = useMission.getState().simTimeSec

      const pts = orbitGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < maxPts; i++) {
        const timeOffset = t + (i * 12)
        const u = (n * timeOffset) % (2 * Math.PI)
        const x = a * Math.cos(u)
        const z = a * Math.sin(u)
        const earthRotAngle = timeOffset * 0.00007292115
        
        const latRad = Math.asin(z * Math.sin(incRad) / a)
        const lonRad = Math.atan2(z * Math.cos(incRad), x) - earthRotAngle

        const mapX = (((lonRad * 180 / Math.PI) + 180) % 360) - 180
        const mapY = latRad * 180 / Math.PI
        pts.setXYZ(i, mapX, mapY, 1)
      }
      pts.needsUpdate = true

      const uCurrent = (n * t) % (2 * Math.PI)
      const xC = a * Math.cos(uCurrent)
      const zC = a * Math.sin(uCurrent)
      const earthRotC = t * 0.00007292115
      const latC = Math.asin(zC * Math.sin(incRad) / a)
      const lonC = Math.atan2(zC * Math.cos(incRad), xC) - earthRotC
      
      const curX = (((lonC * 180 / Math.PI) + 180) % 360) - 180
      const curY = latC * 180 / Math.PI

      satMesh.position.set(curX, curY, 2)
      swathMesh.position.set(curX, curY, 1.5)

      renderer.render(scene, camera)
    }

    animate()

    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      const asp = w / h
      camera.left = -viewSize * asp / 2
      camera.right = viewSize * asp / 2
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [mission])

  return (
    <div className="w-full h-full pt-20">
      <div ref={mountRef} className="absolute inset-0 w-full h-full bg-slate-950" />
      <div className="absolute bottom-6 left-6 z-20 px-4 py-2 rounded-lg bg-slate-950/80 backdrop-blur border border-slate-800 text-xs font-mono text-slate-400">
        <span>PROJECTION: <strong className="text-white">MERCATOR (2D)</strong></span>
        <span className="mx-3">|</span>
        <span>GROUND TRACK ALIGNMENT: <strong className="text-cyan-400">NOMINAL</strong></span>
      </div>
    </div>
  )
}
