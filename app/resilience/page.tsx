"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Network, ShieldAlert, ShieldCheck, Zap, Activity, 
  Layers, Gauge, Play, Square, RotateCcw, AlertTriangle, 
  Radio, Compass, Cpu, RefreshCw, GitBranch, Share2, 
  CheckCircle2, ArrowRight, CornerDownRight 
} from "lucide-react"

type NodeStatus = "ONLINE" | "JAMMED" | "DESTROYED"

interface MeshNode {
  id: string
  name: string
  plane: number
  slot: number
  status: NodeStatus
  latencyBaseMs: number
  throughputGbps: number
  loadPct: number
}

interface MeshEdge {
  from: string
  to: string
  distanceKm: number
  baseLatencyMs: number
}

// 12-Node pLEO Constellation Mesh: 3 planes of 4 satellites
const INITIAL_NODES: MeshNode[] = [
  { id: "SAT-P1-1", name: "Alpha-1", plane: 1, slot: 1, status: "ONLINE", latencyBaseMs: 3.8, throughputGbps: 100, loadPct: 42 },
  { id: "SAT-P1-2", name: "Alpha-2", plane: 1, slot: 2, status: "ONLINE", latencyBaseMs: 4.1, throughputGbps: 100, loadPct: 55 },
  { id: "SAT-P1-3", name: "Alpha-3", plane: 1, slot: 3, status: "JAMMED", latencyBaseMs: 48.0, throughputGbps: 15, loadPct: 92 },
  { id: "SAT-P1-4", name: "Alpha-4", plane: 1, slot: 4, status: "ONLINE", latencyBaseMs: 3.9, throughputGbps: 100, loadPct: 38 },

  { id: "SAT-P2-1", name: "Bravo-1", plane: 2, slot: 1, status: "ONLINE", latencyBaseMs: 4.2, throughputGbps: 100, loadPct: 49 },
  { id: "SAT-P2-2", name: "Bravo-2", plane: 2, slot: 2, status: "ONLINE", latencyBaseMs: 4.0, throughputGbps: 100, loadPct: 61 },
  { id: "SAT-P2-3", name: "Bravo-3", plane: 2, slot: 3, status: "ONLINE", latencyBaseMs: 4.4, throughputGbps: 100, loadPct: 53 },
  { id: "SAT-P2-4", name: "Bravo-4", plane: 2, slot: 4, status: "DESTROYED", latencyBaseMs: 999.0, throughputGbps: 0, loadPct: 0 },

  { id: "SAT-P3-1", name: "Charlie-1", plane: 3, slot: 1, status: "ONLINE", latencyBaseMs: 4.5, throughputGbps: 100, loadPct: 34 },
  { id: "SAT-P3-2", name: "Charlie-2", plane: 3, slot: 2, status: "ONLINE", latencyBaseMs: 3.9, throughputGbps: 100, loadPct: 47 },
  { id: "SAT-P3-3", name: "Charlie-3", plane: 3, slot: 3, status: "ONLINE", latencyBaseMs: 4.1, throughputGbps: 100, loadPct: 65 },
  { id: "SAT-P3-4", name: "Charlie-4", plane: 3, slot: 4, status: "ONLINE", latencyBaseMs: 4.3, throughputGbps: 100, loadPct: 50 },
]

// Optical Inter-Satellite Links (Intra-plane rings & Inter-plane crosslinks)
const STATIC_EDGES: MeshEdge[] = [
  // Plane 1 Intra-plane Ring
  { from: "SAT-P1-1", to: "SAT-P1-2", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P1-2", to: "SAT-P1-3", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P1-3", to: "SAT-P1-4", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P1-4", to: "SAT-P1-1", distanceKm: 2200, baseLatencyMs: 7.3 },

  // Plane 2 Intra-plane Ring
  { from: "SAT-P2-1", to: "SAT-P2-2", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P2-2", to: "SAT-P2-3", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P2-3", to: "SAT-P2-4", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P2-4", to: "SAT-P2-1", distanceKm: 2200, baseLatencyMs: 7.3 },

  // Plane 3 Intra-plane Ring
  { from: "SAT-P3-1", to: "SAT-P3-2", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P3-2", to: "SAT-P3-3", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P3-3", to: "SAT-P3-4", distanceKm: 2200, baseLatencyMs: 7.3 },
  { from: "SAT-P3-4", to: "SAT-P3-1", distanceKm: 2200, baseLatencyMs: 7.3 },

  // Inter-Plane Crosslinks (P1 <-> P2)
  { from: "SAT-P1-1", to: "SAT-P2-1", distanceKm: 1850, baseLatencyMs: 6.2 },
  { from: "SAT-P1-2", to: "SAT-P2-2", distanceKm: 1850, baseLatencyMs: 6.2 },
  { from: "SAT-P1-3", to: "SAT-P2-3", distanceKm: 1850, baseLatencyMs: 6.2 },
  { from: "SAT-P1-4", to: "SAT-P2-4", distanceKm: 1850, baseLatencyMs: 6.2 },

  // Inter-Plane Crosslinks (P2 <-> P3)
  { from: "SAT-P2-1", to: "SAT-P3-1", distanceKm: 1850, baseLatencyMs: 6.2 },
  { from: "SAT-P2-2", to: "SAT-P3-2", distanceKm: 1850, baseLatencyMs: 6.2 },
  { from: "SAT-P2-3", to: "SAT-P3-3", distanceKm: 1850, baseLatencyMs: 6.2 },
  { from: "SAT-P2-4", to: "SAT-P3-4", distanceKm: 1850, baseLatencyMs: 6.2 },

  // Cross-Seam Links (P3 <-> P1)
  { from: "SAT-P3-1", to: "SAT-P1-1", distanceKm: 2400, baseLatencyMs: 8.0 },
  { from: "SAT-P3-2", to: "SAT-P1-2", distanceKm: 2400, baseLatencyMs: 8.0 },
  { from: "SAT-P3-3", to: "SAT-P1-3", distanceKm: 2400, baseLatencyMs: 8.0 },
  { from: "SAT-P3-4", to: "SAT-P1-4", distanceKm: 2400, baseLatencyMs: 8.0 },
]

export default function ResiliencePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [nodes, setNodes] = useState<MeshNode[]>(INITIAL_NODES)
  const [sourceNodeId, setSourceNodeId] = useState<string>("SAT-P1-1")
  const [destNodeId, setDestNodeId] = useState<string>("SAT-P3-3")
  const [rerouteCount, setRerouteCount] = useState<number>(3)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  // Dijkstra Shortest Path Solver with Dynamic Edge Weighting
  const dijkstraResult = useMemo(() => {
    const nodeMap = new Map<string, MeshNode>()
    nodes.forEach(n => nodeMap.set(n.id, n))

    const adj = new Map<string, { neighbor: string; weight: number }[]>()
    nodes.forEach(n => adj.set(n.id, []))

    STATIC_EDGES.forEach(edge => {
      const uNode = nodeMap.get(edge.from)
      const vNode = nodeMap.get(edge.to)
      if (!uNode || !vNode) return

      const computeWeight = (targetNode: MeshNode) => {
        if (targetNode.status === "DESTROYED") return Infinity
        if (targetNode.status === "JAMMED") return edge.baseLatencyMs + 75.0 + (targetNode.loadPct * 0.4)
        return edge.baseLatencyMs + targetNode.latencyBaseMs + (targetNode.loadPct * 0.05)
      }

      const wFromV = computeWeight(vNode)
      const wFromU = computeWeight(uNode)

      adj.get(edge.from)?.push({ neighbor: edge.to, weight: wFromV })
      adj.get(edge.to)?.push({ neighbor: edge.from, weight: wFromU })
    })

    const dist = new Map<string, number>()
    const prev = new Map<string, string | null>()
    const visited = new Set<string>()

    nodes.forEach(n => {
      dist.set(n.id, Infinity)
      prev.set(n.id, null)
    })

    dist.set(sourceNodeId, 0)

    while (visited.size < nodes.length) {
      let u: string | null = null
      let minD = Infinity
      nodes.forEach(n => {
        if (!visited.has(n.id)) {
          const d = dist.get(n.id) ?? Infinity
          if (d < minD) {
            minD = d
            u = n.id
          }
        }
      })

      if (!u || minD === Infinity) break
      visited.add(u)

      if (u === destNodeId) break

      const neighbors = adj.get(u) || []
      neighbors.forEach(({ neighbor, weight }) => {
        if (visited.has(neighbor)) return
        const alt = minD + weight
        if (alt < (dist.get(neighbor) ?? Infinity)) {
          dist.set(neighbor, alt)
          prev.set(neighbor, u)
        }
      })
    }

    const path: string[] = []
    let curr: string | null = destNodeId
    while (curr) {
      path.unshift(curr)
      curr = prev.get(curr) || null
      if (curr === sourceNodeId) {
        path.unshift(curr)
        break
      }
    }

    const isValidPath = path[0] === sourceNodeId && path[path.length - 1] === destNodeId
    const finalPath = isValidPath ? path : []
    const totalLatency = isValidPath ? (dist.get(destNodeId) || 0) : 999.0

    return {
      path: finalPath,
      totalLatency,
      isReachable: isValidPath
    }
  }, [nodes, sourceNodeId, destNodeId])

  // Constellation Health Metrics
  const onlineCount = nodes.filter(n => n.status === "ONLINE").length
  const jammedCount = nodes.filter(n => n.status === "JAMMED").length
  const destroyedCount = nodes.filter(n => n.status === "DESTROYED").length
  const meshAvailabilityPct = ((onlineCount + jammedCount * 0.25) / nodes.length) * 100

  // Interactive Node Status Toggle
  const toggleNodeStatus = (id: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n
      const nextStatus: NodeStatus = n.status === "ONLINE" ? "JAMMED" : n.status === "JAMMED" ? "DESTROYED" : "ONLINE"
      return { ...n, status: nextStatus }
    }))
    setRerouteCount(c => c + 1)
  }

  // Animation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Optical Mesh Constellation Visualization
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 16, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 2.8)
    sun.position.set(25, 20, 15)
    scene.add(sun)

    // 1. Earth Body
    const earthR = 5.8
    const earthGeo = new THREE.SphereGeometry(earthR, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.85,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 })
    const earthWire = new THREE.Mesh(new THREE.SphereGeometry(earthR * 1.005, 36, 18), wireMat)
    earth.add(earthWire)

    // 2. 3D Satellites across 3 orbital planes
    const orbitR = 8.6
    const planeAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
    const inclination = 0.95

    const satPositions: Record<string, THREE.Vector3> = {}
    const nodeObjMap = new Map<string, MeshNode>()
    nodes.forEach(n => nodeObjMap.set(n.id, n))

    nodes.forEach(node => {
      const planeIdx = node.plane - 1
      const slotIdx = node.slot - 1
      const planeBaseRot = planeAngles[planeIdx]
      const slotAngle = (slotIdx * Math.PI) / 2

      const pX = orbitR * Math.cos(slotAngle)
      const pY = orbitR * Math.sin(slotAngle) * Math.sin(inclination)
      const pZ = orbitR * Math.sin(slotAngle) * Math.cos(inclination)

      const finalX = pX * Math.cos(planeBaseRot) - pZ * Math.sin(planeBaseRot)
      const finalY = pY
      const finalZ = pX * Math.sin(planeBaseRot) + pZ * Math.cos(planeBaseRot)

      const pos = new THREE.Vector3(finalX, finalY, finalZ)
      satPositions[node.id] = pos

      const isPath = dijkstraResult.path.includes(node.id)
      const nodeColor = node.status === "DESTROYED" ? 0x64748b : node.status === "JAMMED" ? 0xf59e0b : isPath ? 0x10b981 : 0x38bdf8

      const sGeo = new THREE.BoxGeometry(0.45, 0.45, 0.7)
      const sMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: isPath ? 0.8 : 0.2
      })
      const sMesh = new THREE.Mesh(sGeo, sMat)
      sMesh.position.copy(pos)
      sMesh.lookAt(0, 0, 0)
      scene.add(sMesh)
    })

    // 3. Render Optical Crosslinks
    STATIC_EDGES.forEach(edge => {
      const p1 = satPositions[edge.from]
      const p2 = satPositions[edge.to]
      if (!p1 || !p2) return

      const uNode = nodeObjMap.get(edge.from)
      const vNode = nodeObjMap.get(edge.to)
      const isSevered = uNode?.status === "DESTROYED" || vNode?.status === "DESTROYED"
      const isJammed = uNode?.status === "JAMMED" || vNode?.status === "JAMMED"

      const pathIdx = dijkstraResult.path.indexOf(edge.from)
      const isPathSegment = pathIdx !== -1 && (
        dijkstraResult.path[pathIdx + 1] === edge.to || 
        dijkstraResult.path[pathIdx - 1] === edge.to
      )

      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2])
      const lineColor = isPathSegment 
        ? 0x10b981 
        : isSevered 
        ? 0xef4444 
        : isJammed 
        ? 0xf59e0b 
        : 0x38bdf8

      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: isPathSegment ? 1.0 : isSevered ? 0.15 : 0.35,
        linewidth: isPathSegment ? 3 : 1
      })

      const line = new THREE.Line(lineGeo, lineMat)
      scene.add(line)
    })

    // 4. Animated Laser Data Packets along Dijkstra Path
    const packetGeo = new THREE.SphereGeometry(0.15, 12, 12)
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc })
    const packetMesh = new THREE.Mesh(packetGeo, packetMat)
    packetMesh.visible = dijkstraResult.path.length >= 2
    scene.add(packetMesh)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      if (dijkstraResult.path.length >= 2) {
        const pathSegments = dijkstraResult.path.length - 1
        const cycleProgress = (simStep * 0.02) % pathSegments
        const currentSegIndex = Math.floor(cycleProgress)
        const segT = cycleProgress - currentSegIndex

        const n1 = dijkstraResult.path[currentSegIndex]
        const n2 = dijkstraResult.path[currentSegIndex + 1]
        const pos1 = satPositions[n1]
        const pos2 = satPositions[n2]

        if (pos1 && pos2) {
          packetMesh.position.lerpVectors(pos1, pos2, segT)
          packetMesh.visible = true
        }
      } else {
        packetMesh.visible = false
      }

      earth.rotation.y += 0.0006

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [nodes, dijkstraResult, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Network className="w-5 h-5 text-emerald-400" /> Mesh Self-Healing
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            Autonomous Dijkstra pLEO Crosslink Convergence
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Traffic Ingress &amp; Egress Pair</span>
              <span className="text-emerald-400 font-bold">{dijkstraResult.isReachable ? "ROUTE CONVERGED" : "PARTITIONED"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Source Gateway</label>
                <select
                  value={sourceNodeId}
                  onChange={e => setSourceNodeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold text-[11px] focus:outline-none focus:border-cyan-500"
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id} ({n.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Destination Target</label>
                <select
                  value={destNodeId}
                  onChange={e => setDestNodeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold text-[11px] focus:outline-none focus:border-cyan-500"
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id} ({n.name})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Satellite Node State Manager
              </label>
              <span className="text-[10px] text-slate-500">CLICK TO CYCLE STATUS</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {nodes.map(n => {
                const isPath = dijkstraResult.path.includes(n.id)
                return (
                  <button
                    key={n.id}
                    onClick={() => toggleNodeStatus(n.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      n.status === "DESTROYED"
                        ? "bg-slate-950/60 border-slate-800 text-slate-600 line-through"
                        : n.status === "JAMMED"
                        ? "bg-amber-950/40 border-amber-500/60 text-amber-300"
                        : isPath
                        ? "bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[10px]">{n.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${n.status === "ONLINE" ? "bg-emerald-400" : n.status === "JAMMED" ? "bg-amber-400 animate-ping" : "bg-rose-500"}`} />
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 flex justify-between">
                      <span>P{n.plane}-S{n.slot}</span>
                      <span className="font-bold">{n.status}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2 flex justify-between">
              <span>Dynamic Rerouting Engine</span>
              <span className="text-cyan-400 font-bold">{rerouteCount} RECONVERGENCES</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Autonomous Self-Healing:</span><span className="text-emerald-400 font-bold">ACTIVE (DIJKSTRA)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mesh Topology:</span><span className="text-white">Walker 54.4° (3x4 pLEO)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Convergence Latency:</span><span className="text-cyan-400 font-bold">14.8 ms</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Laser Crosslink Capacity:</span><span className="text-white">100 Gbps / OISL</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Network Availability:</span><span className="text-emerald-400 font-bold">{meshAvailabilityPct.toFixed(1)}%</span></div>
          </div>

          <button
            onClick={() => {
              setNodes(INITIAL_NODES)
              setRerouteCount(c => c + 1)
            }}
            className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> RESET CONSTELLATION NODES
          </button>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Autonomous Optimal Path Convergence
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${dijkstraResult.isReachable ? "text-emerald-400" : "text-rose-500"}`}>
              {dijkstraResult.isReachable ? `${dijkstraResult.totalLatency.toFixed(1)} ms` : "LINK SEVERED"}
            </span>
            <span className="text-slate-500 text-sm">END-TO-END HOP LATENCY</span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">ACTIVE HOPS: {Math.max(0, dijkstraResult.path.length - 1)}</span>
            <span className="text-emerald-400">ONLINE NODES: {onlineCount} / {nodes.length}</span>
            <span className="text-amber-400">JAMMED NODES: {jammedCount} BYPASSED</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">CONVERGED SHORTEST PATH</span>
              <span className="text-white font-bold text-xs flex items-center gap-1.5 flex-wrap">
                {dijkstraResult.path.map((nodeId, i) => (
                  <span key={nodeId} className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">{nodeId}</span>
                    {i < dijkstraResult.path.length - 1 && <ArrowRight className="w-3 h-3 text-slate-500" />}
                  </span>
                ))}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">PACKET LOSS RATE</span>
            <span className="text-emerald-400 font-bold text-sm">0.0001% (FEC LOCKED)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CROSS-SEAM ROUTING</span>
            <span className="text-cyan-400 font-bold text-sm">ACTIVE ISL BRIDGE</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Dijkstra Hop Budget
        </h2>

        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border ${dijkstraResult.isReachable ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40"}`}>
            <div className="text-[10px] font-bold tracking-wider mb-1 text-slate-400">
              CONSTELLATION INTEGRITY
            </div>
            <div className={`text-xl font-black flex items-center gap-2 ${dijkstraResult.isReachable ? "text-emerald-400" : "text-rose-400"}`}>
              {dijkstraResult.isReachable ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              {dijkstraResult.isReachable ? "MESH SELF-HEALED" : "ISOLATED PARTITION"}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {dijkstraResult.isReachable 
                ? `Constellation routing dynamically bypassed ${jammedCount} jammed nodes and ${destroyedCount} severed satellites, establishing optimal path across ${dijkstraResult.path.length - 1} OISL crosslinks.`
                : "No valid path exists between source and destination nodes due to catastrophic multi-node severance. Reconfigure satellite positions or deploy reserve relays."}
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Hop Delay Breakdown</div>
            {dijkstraResult.path.map((nodeId, idx) => {
              const node = nodes.find(n => n.id === nodeId)
              return (
                <div key={nodeId} className="flex justify-between items-center">
                  <span className="text-slate-500">Hop {idx}: {nodeId}</span>
                  <span className={node?.status === "JAMMED" ? "text-amber-400 font-bold" : "text-white"}>
                    {node?.latencyBaseMs} ms {node?.status === "JAMMED" ? "(JAMMED)" : ""}
                  </span>
                </div>
              )
            })}
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5">
              <span className="text-white">TOTAL E2E LATENCY:</span>
              <span className="text-emerald-400">{dijkstraResult.totalLatency.toFixed(1)} ms</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Autonomous Rerouting Dynamics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Every 10 ms, constellation nodes execute localized Link-State Advertisements (LSA). Edge costs penalize degraded paths, preventing buffer overflows and maintaining sub-50 ms strategic command links.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
