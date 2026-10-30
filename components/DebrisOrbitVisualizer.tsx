"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, ZoomIn, ZoomOut, Radio } from "lucide-react"

interface ConjunctionEvent {
  id: string
  event_id: string
  primary_object: string
  secondary_object: string
  miss_distance_m: number
  collision_probability: number
  relative_velocity_kms: number
  altitude_km: number
  risk_level: string
}

interface GroundStationLocation {
  name: string
  code: string
  lat: number
  lng: number
  polar: boolean
}

const DEFAULT_STATIONS: GroundStationLocation[] = [
  { name: "SvalSat", code: "SVS", lat: 78.23, lng: 15.4, polar: true },
  { name: "TrollSat", code: "TLS", lat: -72.01, lng: 2.53, polar: true },
  { name: "Goldstone DSN", code: "GDS", lat: 35.43, lng: -116.89, polar: false },
  { name: "Inuvik Facility", code: "ISS", lat: 68.32, lng: -133.53, polar: true },
  { name: "Hartebeesthoek", code: "HBK", lat: -25.88, lng: 27.7, polar: false },
  { name: "Punta Arenas", code: "PUQ", lat: -53.16, lng: -70.91, polar: true },
  { name: "Dongara Gateway", code: "DGA", lat: -29.25, lng: 114.93, polar: false },
]

interface DebrisOrbitVisualizerProps {
  events: ConjunctionEvent[]
  onSelectEvent?: (event: ConjunctionEvent) => void
  selectedEventId?: string | null
}

export default function DebrisOrbitVisualizer({
  events,
  onSelectEvent,
  selectedEventId,
}: DebrisOrbitVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [showStations, setShowStations] = useState<boolean>(true)
  const [zoom, setZoom] = useState<number>(1.0)
  const angleRef = useRef<number>(0)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const centerX = width / 2
    const centerY = height / 2
    const earthRadius = 60 * zoom

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      if (isPlaying) {
        angleRef.current += 0.005
      }
      const rot = angleRef.current

      // 1. Orbital Ring Guides
      ctx.strokeStyle = "rgba(30, 41, 59, 0.4)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(centerX, centerY, earthRadius * 3.2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(centerX, centerY, earthRadius * 4.4, 0, Math.PI * 2)
      ctx.stroke()

      // 2. Atmosphere Glow Rim
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        earthRadius * 0.8,
        centerX,
        centerY,
        earthRadius * 1.35
      )
      glowGrad.addColorStop(0, "rgba(6, 182, 212, 0.25)")
      glowGrad.addColorStop(0.5, "rgba(14, 165, 233, 0.08)")
      glowGrad.addColorStop(1, "rgba(15, 23, 42, 0)")
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(centerX, centerY, earthRadius * 1.35, 0, Math.PI * 2)
      ctx.fill()

      // 3. Earth Core Body
      const earthGrad = ctx.createRadialGradient(
        centerX - earthRadius * 0.3,
        centerY - earthRadius * 0.3,
        earthRadius * 0.1,
        centerX,
        centerY,
        earthRadius
      )
      earthGrad.addColorStop(0, "#0e3a5a")
      earthGrad.addColorStop(0.7, "#081d30")
      earthGrad.addColorStop(1, "#030a13")

      ctx.fillStyle = earthGrad
      ctx.beginPath()
      ctx.arc(centerX, centerY, earthRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 4. Parallels of Latitude
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)"
      ctx.lineWidth = 1
      for (let lat = -60; lat <= 60; lat += 30) {
        const rLat = earthRadius * Math.cos((lat * Math.PI) / 180)
        const yOffset = earthRadius * Math.sin((lat * Math.PI) / 180) * 0.4
        ctx.beginPath()
        ctx.ellipse(centerX, centerY + yOffset, rLat, rLat * 0.35, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Meridians of Longitude (Rotating with Earth)
      for (let i = 0; i < 6; i++) {
        const mAngle = rot + (i * Math.PI) / 3
        const cosM = Math.cos(mAngle)
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, Math.abs(earthRadius * cosM), earthRadius, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 5. Ground Station Network Nodes & 10-deg Elevation Cones
      if (showStations) {
        DEFAULT_STATIONS.forEach((gs) => {
          const latRad = (gs.lat * Math.PI) / 180
          const lngRad = (gs.lng * Math.PI) / 180 + rot

          // Check if on visible hemisphere (cos(lngRad) > 0)
          const cosLng = Math.cos(lngRad)
          if (cosLng > -0.2) {
            const gx = centerX + earthRadius * Math.cos(latRad) * Math.sin(lngRad)
            const gy = centerY - earthRadius * Math.sin(latRad) * 0.7

            // Elevation Mask Footprint Cone (Ground station line of sight)
            const coneRadius = earthRadius * 0.32
            ctx.fillStyle = "rgba(16, 185, 129, 0.08)"
            ctx.strokeStyle = "rgba(16, 185, 129, 0.35)"
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.ellipse(gx, gy, coneRadius, coneRadius * 0.45, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            // Station Antenna Node
            ctx.fillStyle = gs.polar ? "#a855f7" : "#10b981"
            ctx.beginPath()
            ctx.arc(gx, gy, 3, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = "#ffffff"
            ctx.lineWidth = 1
            ctx.stroke()

            // Station Code Tag
            ctx.font = "8px monospace"
            ctx.fillStyle = gs.polar ? "#d8b4fe" : "#6ee7b7"
            ctx.fillText(gs.code, gx + 5, gy - 3)
          }
        })
      }

      // 6. Common LEO Shell Bands
      const shells = [
        { alt: 500, color: "rgba(6, 182, 212, 0.25)" },
        { alt: 600, color: "rgba(168, 85, 247, 0.25)" },
        { alt: 1200, color: "rgba(234, 179, 8, 0.2)" },
      ]

      shells.forEach((shell) => {
        const rShell = (earthRadius * (6378 + shell.alt)) / 6378
        ctx.strokeStyle = shell.color
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, rShell, rShell * 0.65, rot * 0.2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      })

      // 7. Conjunction Intercept Vectors & Miss Distance Markers
      events.forEach((evt, idx) => {
        const isSelected = evt.event_id === selectedEventId
        const isCrit = evt.risk_level === "CRITICAL"
        const isElev = evt.risk_level === "ELEVATED"

        const altKm = Number(evt.altitude_km) || 550
        const rOrb = (earthRadius * (6378 + altKm)) / 6378

        const incOffset = idx * 0.85 + 0.5
        const evtAngle = rot * (1.2 + idx * 0.2) + idx * (Math.PI / 2.5)

        const px = centerX + Math.cos(evtAngle) * rOrb
        const py = centerY + Math.sin(evtAngle) * (rOrb * 0.65) * Math.cos(incOffset)

        const missScale = Math.max(10, Math.min(35, Number(evt.miss_distance_m) / 10))
        const sx = px + Math.sin(rot * 3 + idx) * missScale * 0.5
        const sy = py - Math.cos(rot * 3 + idx) * missScale * 0.5

        // Vector line between primary asset and debris target
        ctx.strokeStyle = isCrit
          ? "rgba(239, 68, 68, 0.85)"
          : isElev
          ? "rgba(245, 158, 11, 0.8)"
          : "rgba(6, 182, 212, 0.7)"
        ctx.lineWidth = isSelected ? 2.5 : 1.5
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(sx, sy)
        ctx.stroke()

        // Primary Asset (Cyan Satellite)
        ctx.fillStyle = isSelected ? "#38bdf8" : "#06b6d4"
        ctx.beginPath()
        ctx.arc(px, py, isSelected ? 5.5 : 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 1
        ctx.stroke()

        // Debris / Conjunction Secondary (Red / Amber)
        ctx.fillStyle = isCrit ? "#ef4444" : isElev ? "#f59e0b" : "#94a3b8"
        ctx.beginPath()
        ctx.arc(sx, sy, isSelected ? 5 : 3.5, 0, Math.PI * 2)
        ctx.fill()

        // Pulsing warning ring on critical items
        if (isCrit || isSelected) {
          const pulse = (Math.sin(Date.now() / 200) + 1) * 6 + 6
          ctx.strokeStyle = isCrit ? "rgba(239, 68, 68, 0.6)" : "rgba(56, 189, 248, 0.6)"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(px, py, pulse + (isSelected ? 4 : 0), 0, Math.PI * 2)
          ctx.stroke()
        }

        if (isSelected || isCrit) {
          ctx.font = "9px monospace"
          ctx.fillStyle = isCrit ? "#fca5a5" : "#bae6fd"
          ctx.fillText(
            `${evt.primary_object} / ${Number(evt.miss_distance_m).toFixed(0)}m`,
            px + 8,
            py - 6
          )
        }
      })

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [events, isPlaying, showStations, zoom, selectedEventId])

  return (
    <div className="relative w-full h-[480px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-between p-4 font-mono select-none">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Top HUD Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            3D ORBITAL RADAR &amp; GROUND FOOTPRINT CORRIDORS
          </span>
          <span className="text-slate-500 text-[10px] hidden sm:inline">
            WGS-84 LEO SHELL (300-1200 KM)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowStations(!showStations)}
            className={`px-2.5 py-1 rounded border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showStations
                ? "bg-emerald-950 border-emerald-500/50 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Toggle Ground Station Footprint Cones"
          >
            <Radio className="w-3 h-3" />
            STATIONS {showStations ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isPlaying ? "Pause Rotation" : "Resume Rotation"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* Bottom Legend Overlay */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Primary Asset
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Critical Conjunction (&lt;200m)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Ground Station Mask (10&deg; Cone)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Polar Gateway
          </span>
        </div>

        <div className="text-slate-500">
          TRACKING: {events.length} CONJUNCTIONS • {DEFAULT_STATIONS.length} GATEWAYS
        </div>
      </div>
    </div>
  )
}
