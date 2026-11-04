"use client"

import { useState, useRef, useEffect } from "react"
import { RotateCw, Play, Pause, Compass, Maximize2, Crosshair } from "lucide-react"

interface TurntableProps {
  src: string
  title?: string
  hullCode?: string
}

export default function InteractiveTurntable({
  src,
  title = "AST-01 EO/IR RECONNAISSANCE BUS",
  hullCode = "AST-01 // NORAD 48219"
}: TurntableProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [azimuth, setAzimuth] = useState<number>(0)
  const startXRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  // Update azimuth degree readouts from current time
  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video || !video.duration) return
    const deg = Math.round((video.currentTime / video.duration) * 360)
    setAzimuth(deg)
  }

  // Drag interaction to scrub through 360 degrees
  const handleMouseDown = (e: React.MouseEvent) => {
    const video = videoRef.current
    if (!video) return
    setIsDragging(true)
    setIsPlaying(false)
    video.pause()
    startXRef.current = e.clientX
    startTimeRef.current = video.currentTime
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container || !video.duration) return

    const deltaX = e.clientX - startXRef.current
    const containerWidth = container.clientWidth
    const scrubRatio = deltaX / containerWidth

    let newTime = (startTimeRef.current + scrubRatio * video.duration) % video.duration
    if (newTime < 0) newTime += video.duration
    video.currentTime = newTime
    handleTimeUpdate()
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      video.play()
      setIsPlaying(true)
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-72 rounded-xl overflow-hidden border border-white/10 bg-black select-none cursor-ew-resize group"
    >
      {/* 360 Video Stream */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* Top Header Overlay */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10 text-[9px] font-mono">
        <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-cyan-300 font-bold backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>{title}</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-black/80 border border-white/10 text-amber-400 font-bold backdrop-blur-md">
          AZ: {azimuth.toString().padStart(3, "0")}°
        </div>
      </div>

      {/* Crosshair Center Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
        <Crosshair className="w-12 h-12 text-cyan-400 stroke-[1]" />
      </div>

      {/* Drag Scrub Hint */}
      <div className="absolute bottom-10 left-3 px-2 py-0.5 rounded bg-black/70 border border-white/10 text-[8px] text-slate-400 font-mono pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        ← DRAG TO ROTATE 360° →
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between z-10 text-[9px] font-mono pointer-events-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayback}
            className="p-1 rounded bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all"
            title={isPlaying ? "Pause Rotation" : "Auto-Rotate"}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
          </button>
          <span className="text-slate-400">{hullCode}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-emerald-400 font-bold">
          <RotateCw className="w-2.5 h-2.5" />
          <span>360° PBR</span>
        </div>
      </div>
    </div>
  )
}
