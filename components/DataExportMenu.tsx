"use client"

import React, { useState, useRef, useEffect } from "react"
import { Download, FileSpreadsheet, FileCode, ChevronDown } from "lucide-react"

interface DataExportMenuProps {
  filename: string
  data: Record<string, any>[]
}

export default function DataExportMenu({ filename, data }: DataExportMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const exportCSV = () => {
    if (!data || data.length === 0) return
    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((field) => {
            const val = row[field] ?? ""
            const escaped = typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val
            return escaped
          })
          .join(",")
      ),
    ]
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${filename}-telemetry.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setOpen(false)
  }

  const exportJSON = () => {
    if (!data || data.length === 0) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${filename}-telemetry.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setOpen(false)
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs font-mono transition-all"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400" />
        <span>EXPORT TELEMETRY</span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-900 border border-slate-800 shadow-xl py-1 z-20 font-mono text-xs">
          <button
            onClick={exportCSV}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 text-left transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download CSV Table</span>
          </button>
          <button
            onClick={exportJSON}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 text-left transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download Raw JSON</span>
          </button>
        </div>
      )}
    </div>
  )
}
