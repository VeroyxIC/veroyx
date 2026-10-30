"use client"

import { useEffect, useRef, useState } from "react"
import { Cpu, Shield, Building2, Network, Info } from "lucide-react"

interface Node {
  id: string
  label: string
  type: "prime" | "hardware" | "agency"
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  details?: string
}

interface Link {
  source: string
  target: string
}

interface SupplyChainGraphProps {
  companyName: string
  technologies: any[]
  grants: any[]
}

export default function SupplyChainGraph({ companyName, technologies = [], grants = [] }: SupplyChainGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const nodesRef = useRef<Node[]>([])
  const linksRef = useRef<Link[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2

    // Initialize Prime Center Node
    const nodes: Node[] = [
      {
        id: "prime",
        label: companyName,
        type: "prime",
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        radius: 28,
        details: "Tier-0 System Prime Integrator"
      }
    ]

    const links: Link[] = []

    // Add Hardware Subsystem Nodes
    technologies.forEach((tech, i) => {
      const angle = (i / Math.max(technologies.length, 1)) * Math.PI - Math.PI / 2
      const dist = 140
      const id = `tech-${tech.slug || i}`
      nodes.push({
        id,
        label: tech.name,
        type: "hardware",
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 18,
        details: `TRL ${tech.trl || 7} • ${tech.target_domain || "Orbital Flight"}`
      })
      links.push({ source: "prime", target: id })
    })

    // Add Government / Defense Customer Nodes
    grants.forEach((grant, i) => {
      const angle = (i / Math.max(grants.length, 1)) * Math.PI + Math.PI / 2
      const dist = 150
      const id = `grant-${grant.slug || i}`
      nodes.push({
        id,
        label: grant.awarding_agency || grant.name,
        type: "agency",
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 16,
        details: `$${grant.amount ? (Number(grant.amount) / 1000000).toFixed(1) + "M" : "Undisclosed"} Prime Obligation`
      })
      links.push({ source: "prime", target: id })
    })

    nodesRef.current = nodes
    linksRef.current = links

    let animId: number

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Background subtle matrix grid
      ctx.strokeStyle = "rgba(30, 41, 59, 0.4)"
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw Links
      linksRef.current.forEach((link) => {
        const sourceNode = nodesRef.current.find((n) => n.id === link.source)
        const targetNode = nodesRef.current.find((n) => n.id === link.target)
        if (!sourceNode || !targetNode) return

        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)
        ctx.strokeStyle = "rgba(6, 182, 212, 0.25)"
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
      })

      // Draw Nodes
      nodesRef.current.forEach((node) => {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)

        if (node.type === "prime") {
          ctx.fillStyle = "rgba(6, 182, 212, 0.2)"
          ctx.strokeStyle = "#22d3ee"
          ctx.lineWidth = 2.5
        } else if (node.type === "hardware") {
          ctx.fillStyle = "rgba(168, 85, 247, 0.2)"
          ctx.strokeStyle = "#c084fc"
          ctx.lineWidth = 2
        } else {
          ctx.fillStyle = "rgba(16, 185, 129, 0.2)"
          ctx.strokeStyle = "#34d399"
          ctx.lineWidth = 2
        }

        ctx.fill()
        ctx.stroke()

        // Core dot
        ctx.beginPath()
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = node.type === "prime" ? "#22d3ee" : node.type === "hardware" ? "#c084fc" : "#34d399"
        ctx.fill()

        // Text labels
        ctx.font = node.type === "prime" ? "bold 11px monospace" : "10px monospace"
        ctx.fillStyle = "#f8fafc"
        ctx.textAlign = "center"
        ctx.fillText(node.label.length > 18 ? node.label.slice(0, 16) + "..." : node.label, node.x, node.y + node.radius + 14)
      })

      animId = requestAnimationFrame(render)
    }

    render()

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const found = nodesRef.current.find((node) => {
        const dx = node.x - mx
        const dy = node.y - my
        return Math.sqrt(dx * dx + dy * dy) <= node.radius + 6
      })

      setHoveredNode(found || null)
    }

    canvas.addEventListener("mousemove", handleMouseMove)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener("mousemove", handleMouseMove)
    }
  }, [companyName, technologies, grants])

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono text-sm font-bold text-white tracking-widest uppercase">
              Relational Tier Architecture & Supply Linkage
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time topology mapping tier-0 integration, proprietary flight hardware, and customer obligations.
          </p>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Prime
          </span>
          <span className="flex items-center gap-1.5 text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span> Subsystems
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Procurement
          </span>
        </div>
      </div>

      <div className="relative flex justify-center">
        <canvas
          ref={canvasRef}
          width={760}
          height={360}
          className="w-full max-w-[760px] h-[320px] sm:h-[360px] rounded-xl bg-slate-950/80 border border-slate-800/60 cursor-crosshair"
        />

        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-cyan-500/40 p-3 rounded-lg shadow-xl font-mono text-xs max-w-xs pointer-events-none">
            <div className="text-[10px] uppercase text-cyan-400 font-bold mb-1">Node Telemetry</div>
            <div className="font-bold text-white">{hoveredNode.label}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">{hoveredNode.details}</div>
          </div>
        )}
      </div>
    </div>
  )
}
