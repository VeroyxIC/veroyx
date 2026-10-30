"use client"

import { useState, useEffect } from "react"
import { Bookmark, BookmarkCheck } from "lucide-react"

interface WatchlistButtonProps {
  entityType: "company" | "technology" | "launch"
  entityId: string
  entityName: string
  entitySlug: string
}

export default function WatchlistButton({
  entityType,
  entityId,
  entityName,
  entitySlug,
}: WatchlistButtonProps) {
  const [watched, setWatched] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check local sync or fetch
    const stored = localStorage.getItem(`vx_watch_${entityType}_${entityId}`)
    if (stored === "true") setWatched(true)
  }, [entityType, entityId])

  const toggleWatch = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, entityName, entitySlug }),
      })
      const data = await res.json()
      if (data.action === "added") {
        setWatched(true)
        localStorage.setItem(`vx_watch_${entityType}_${entityId}`, "true")
      } else {
        setWatched(false)
        localStorage.removeItem(`vx_watch_${entityType}_${entityId}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleWatch}
      disabled={loading}
      className={`px-3 py-2 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
        watched
          ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
          : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
      }`}
    >
      {watched ? (
        <>
          <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>WATCHING</span>
        </>
      ) : (
        <>
          <Bookmark className="w-3.5 h-3.5 text-slate-400" />
          <span>TRACK ENTITY</span>
        </>
      )}
    </button>
  )
}
