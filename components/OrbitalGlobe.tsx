"use client"

import { useEffect, useRef, useState } from "react"
import { Globe2, Navigation } from "lucide-react"

interface Spaceport {
  name: string
  code: string
  lat: number
  lng: number
  activeCount: number
}

const SPACEPORTS: Spaceport[] = [
  { name: "Cape Canaveral SLC-40 / KSC LC-39", code: "CCSFS/KSC", lat: 28.57, lng: -80.65, activeCount: 3 },
  { name: "Vandenberg Space Force Base SLC-4E", code: "VSFB", lat: 34.63, lng: -120.61, activeCount: 2 },
  { name: "Rocket Lab Launch Complex 1", code: "NZ-LC1", lat: -39.26, lng: 177.86, activeCount: 1 },
  { name: "Wallops Flight Facility MARS Pad 0D", code: "WFF", lat: 37.84, lng: -75.48, activeCount: 1 },
]

export default function OrbitalGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activePort, setActivePort] = useState<Spaceport>(SPACEPORTS[0])
  const rotationRef = useRef({ yaw: 0.5, pitch: 0.3 })
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let angle = 0

    const render = () => {
      // Auto-rotation when not dragging
      if (!isDragging.current) {
        rotationRef.current.yaw += 0.003
      }
      angle += 0.04

      const width = canvas.width
      const height = canvas.height
      const cx = width / 2
      const cy = height / 2
      const radius = Math.min(width, height) * 0.38

      ctx.clearRect(0, 0, width, height)

      // Radial background glow
      const bgGrad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.4)
      bgGrad.addColorStop(0, "rgba(6, 182, 212, 0.08)")
      bgGrad.addColorStop(1, "rgba(2, 6, 23, 0)")
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Globe sphere outer glow ring
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(6, 182, 212, 0.25)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        const latRad = (lat * Math.PI) / 180
        const rLat = radius * Math.cos(latRad)
        const yLat = cy - radius * Math.sin(latRad) * Math.cos(rotationRef.current.pitch)
        ctx.ellipse(cx, yLat, rLat, rLat * 0.25 * Math.sin(rotationRef.current.pitch + Math.PI / 4), 0, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(148, 163, 184, 0.08)"
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Longitude lines
      for (let lng = 0; lng < 360; lng += 45) {
        ctx.beginPath()
        const theta = (lng * Math.PI) / 180 + rotationRef.current.yaw
        const xOffset = radius * Math.sin(theta)
        const isFront = Math.cos(theta) > 0

        ctx.ellipse(cx + xOffset * 0.4, cy, Math.abs(xOffset) * 0.6, radius, 0, 0, Math.PI * 2)
        ctx.strokeStyle = isFront ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.03)"
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Transform 3D Spherical Coordinates to 2D Screen
      const project = (lat: number, lng: number) => {
        const phi = (90 - lat) * (Math.PI / 180)
        const theta = (lng * (Math.PI / 180)) + rotationRef.current.yaw

        const x = radius * Math.sin(phi) * Math.sin(theta)
        const y = radius * Math.cos(phi)
        const z = radius * Math.sin(phi) * Math.cos(theta)

        // Pitch tilt rotation
        const p = rotationRef.current.pitch
        const yRot = y * Math.cos(p) - z * Math.sin(p)
        const zRot = y * Math.sin(p) + z * Math.cos(p)

        return {
          px: cx + x,
          py: cy - yRot,
          visible: zRot > 0,
        }
      }

      // Spaceport Beacons & Trajectory Arcs
      SPACEPORTS.forEach((port) => {
        const { px, py, visible } = project(port.lat, port.lng)
        if (!visible) return

        // Pulsing radar transponder ring
        const pulse = (Math.sin(angle) + 1) * 3 + 4
        ctx.beginPath()
        ctx.arc(px, py, pulse, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(34, 211, 238, 0.6)"
        ctx.lineWidth = 1
        ctx.stroke()

        // Solid core
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fillStyle = "#22d3ee"
        ctx.fill()

        // Spaceport Callout Label
        ctx.font = "9px monospace"
        ctx.fillStyle = "rgba(226, 232, 240, 0.85)"
        ctx.fillText(port.code, px + 8, py - 4)

        // Orbital Flight Trajectory Arc
        ctx.beginPath()
        ctx.moveTo(px, py)
        const arcX = px + 40 * (port.lng > 0 ? 1 : -1)
        const arcY = py - 45
        ctx.quadraticCurveTo(px + 20, py - 35, arcX, arcY)
        ctx.strokeStyle = "rgba(6, 182, 212, 0.4)"
        ctx.setLineDash([3, 3])
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.setLineDash([])

        // Orbiting Payload blip
        const t = (Math.sin(angle * 1.5) + 1) / 2
        const blipX = (1 - t) * (1 - t) * px + 2 * (1 - t) * t * (px + 20) + t * t * arcX
        const blipY = (1 - t) * (1 - t) * py + 2 * (1 - t) * t * (py - 35) + t * t * arcY
        ctx.beginPath()
        ctx.arc(blipX, blipY, 2, 0, Math.PI * 2)
        ctx.fillStyle = "#38bdf8"
        ctx.fill()
      })

      animId = requestAnimationFrame(render)
    }

    render()

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - lastMousePos.current.x
      const dy = e.clientY - lastMousePos.current.y
      rotationRef.current.yaw += dx * 0.006
      rotationRef.current.pitch = Math.max(-0.6, Math.min(0.6, rotationRef.current.pitch - dy * 0.006))
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 z-10 relative">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <h2 className="font-mono text-sm font-bold text-white tracking-widest uppercase">
            Global Spaceport Transponder Grid
          </h2>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          DRAG GLOBE TO ROTATE RADAR SPHERE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* 3D Canvas Sphere */}
        <div className="lg:col-span-2 flex items-center justify-center cursor-grab active:cursor-grabbing">
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            className="w-full max-w-[640px] h-[320px] sm:h-[380px]"
          />
        </div>

        {/* Spaceport telemetry sidebar */}
        <div className="space-y-3 font-mono text-xs">
          <div className="text-[10px] uppercase text-slate-500 tracking-wider">Monitored Spaceports</div>
          {SPACEPORTS.map((port) => (
            <button
              key={port.code}
              onClick={() => setActivePort(port)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                activePort.code === port.code
                  ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{port.code}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                  {port.activeCount} ACTIVE MANIFESTS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">{port.name}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {port.lat.toFixed(2)}° N, {Math.abs(port.lng).toFixed(2)}° W
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
