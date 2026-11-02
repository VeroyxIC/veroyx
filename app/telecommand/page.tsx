"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Terminal, Radio, Key, Lock, ShieldCheck, ShieldAlert, 
  Send, RotateCcw, Activity, Layers, Gauge, Compass, 
  Play, Square, AlertTriangle, CheckCircle2, Cpu, Download, 
  ArrowRight, Signal, Sparkles, Orbit, Flame 
} from "lucide-react"
import { createMilitarySatellite, createCinematicEarth, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

type CommandDirective = "IMPULSIVE_BURN" | "ADCS_SLEW_QUATERNION" | "PAYLOAD_SAR_BURST" | "SAFE_MODE_ZEROIZE"
type GroundStationNode = "SCHRIEVER_SFB" | "RAF_FYLINGDALES" | "PINE_GAP" | "DIEGO_GARCIA"

interface GroundStationSpec {
  name: string
  location: string
  antennaDiameterM: number
  txPowerKw: number
  carrierBand: "S_BAND" | "X_BAND"
  carrierFreqGhz: number
  eirpDbw: number
}

const GROUND_STATIONS: Record<GroundStationNode, GroundStationSpec> = {
  "SCHRIEVER_SFB": { name: "Schriever SFB 50th SW", location: "Colorado, USA", antennaDiameterM: 12.0, txPowerKw: 5.0, carrierBand: "X_BAND", carrierFreqGhz: 7.19, eirpDbw: 88.5 },
  "RAF_FYLINGDALES": { name: "RAF Fylingdales Node", location: "North York, UK", antennaDiameterM: 10.0, txPowerKw: 4.0, carrierBand: "X_BAND", carrierFreqGhz: 7.21, eirpDbw: 86.2 },
  "PINE_GAP": { name: "Pine Gap Joint Facility", location: "Alice Springs, AUS", antennaDiameterM: 15.0, txPowerKw: 8.0, carrierBand: "S_BAND", carrierFreqGhz: 2.08, eirpDbw: 82.0 },
  "DIEGO_GARCIA": { name: "Diego Garcia Tracking Station", location: "BIOT Indian Ocean", antennaDiameterM: 10.0, txPowerKw: 3.5, carrierBand: "S_BAND", carrierFreqGhz: 2.06, eirpDbw: 80.8 }
}

export default function TelecommandPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [directive, setDirective] = useState<CommandDirective>("IMPULSIVE_BURN")
  const [stationKey, setStationKey] = useState<GroundStationNode>("SCHRIEVER_SFB")
  const [spacecraftId, setSpacecraftId] = useState<number>(58210) // USA-326
  const [vcid, setVcid] = useState<number>(1) // Virtual Channel 1
  const [deltaVX, setDeltaVX] = useState<number>(45.0)
  const [deltaVY, setDeltaVY] = useState<number>(12.5)
  const [deltaVZ, setDeltaVZ] = useState<number>(-8.0)
  const [seqCount, setSeqCount] = useState<number>(1042)
  const [authKeyHex, setAuthKeyHex] = useState<string>("8F4A2C19E70B3D6A11C4F8E29A5B3D7C")
  
  const [isUplinking, setIsUplinking] = useState<boolean>(false)
  const [uplinkSuccess, setUplinkSuccess] = useState<boolean>(false)
  const [telemetryAck, setTelemetryAck] = useState<string>("READY FOR TRANSMISSION")
  const [simStep, setSimStep] = useState<number>(0)

  const station = GROUND_STATIONS[stationKey]

  // Construct CCSDS 232.0-B TC Frame & RF Link Budget
  const commandFrame = useMemo(() => {
    // 1. Data Field Payload Construction
    let dataPayloadHex = ""
    if (directive === "IMPULSIVE_BURN") {
      dataPayloadHex = `01A0${Math.round(deltaVX * 100).toString(16).padStart(4, "0")}${Math.round(deltaVY * 100).toString(16).padStart(4, "0")}${Math.round(Math.abs(deltaVZ) * 100).toString(16).padStart(4, "0")}`
    } else if (directive === "ADCS_SLEW_QUATERNION") {
      dataPayloadHex = "02B17FFF000000007FFF"
    } else if (directive === "PAYLOAD_SAR_BURST") {
      dataPayloadHex = "03C4003C000AFFFF0000"
    } else {
      dataPayloadHex = "0FF0DEADBEEF00000000"
    }

    // 2. Transfer Frame Header (TFH: 40 bits)
    // Version (2 bits = 00), Bypass/Control (2 bits = 00), Reserved (2 bits), SCID (10 bits), VCID (6 bits), Frame Length (10 bits), Seq (8 bits)
    const headerHex = `00${spacecraftId.toString(16).padStart(4, "0").slice(-3)}${vcid.toString(16)}${(dataPayloadHex.length / 2 + 10).toString(16).padStart(3, "0")}${seqCount.toString(16).padStart(2, "0")}`.toUpperCase()

    // 3. Security Header (SDLS SPI + Anti-Replay Counter)
    const securityHeaderHex = "00010000" + seqCount.toString(16).padStart(4, "0")

    // 4. Simulated HMAC-SHA256 truncated MAC (128-bit)
    const macHex = "E4A9F02B81C3D76E2A10FB9C"

    // 5. CRC-16 CCITT
    const crcHex = "8B4E"

    const fullFrameHex = `${headerHex}${securityHeaderHex}${dataPayloadHex}${macHex}${crcHex}`

    // RF Link Budget Calculations (Uplink to 550 km LEO)
    const slantRangeKm = 750
    const lambdaM = 0.299792458 / station.carrierFreqGhz
    const pathLossDb = 20 * Math.log10((4 * Math.PI * slantRangeKm * 1000) / lambdaM)
    const satGtDbK = -12.5 // Spacecraft receiver antenna G/T
    const cn0DbHz = Number((station.eirpDbw - pathLossDb - 0.8 + satGtDbK + 228.6).toFixed(1))
    const bitRateKbps = 64.0
    const ebN0Db = Number((cn0DbHz - 10 * Math.log10(bitRateKbps * 1000)).toFixed(1))
    const linkMarginDb = Number((ebN0Db - 9.6).toFixed(1)) // 9.6 dB required for 1e-6 BER

    return {
      headerHex,
      securityHeaderHex,
      dataPayloadHex,
      macHex,
      crcHex,
      fullFrameHex,
      frameLengthBytes: fullFrameHex.length / 2,
      pathLossDb: Number(pathLossDb.toFixed(1)),
      cn0DbHz,
      ebN0Db,
      linkMarginDb,
      isLinkViable: linkMarginDb > 3.0
    }
  }, [directive, station, spacecraftId, vcid, deltaVX, deltaVY, deltaVZ, seqCount])

  // Dispatch Telecommand
  const executeTransmission = () => {
    setIsUplinking(true)
    setUplinkSuccess(false)
    setTelemetryAck("CARRIER ACQUISITION & RF UPLINK TRANSMITTING...")

    setTimeout(() => {
      setIsUplinking(false)
      setUplinkSuccess(true)
      setSeqCount(s => s + 1)
      setTelemetryAck(`TELECOMMAND ACCEPTED // S/C EXECUTION ACK RECEIVED (SEQ #${seqCount})`)
    }, 2800)
  }

  // Animation Clock
  useEffect(() => {
    const timer = setInterval(() => setSimStep(s => s + 1), 50)
    return () => clearInterval(timer)
  }, [])

  // 3D Three.js Ground-to-Space Uplink Visualization
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 16, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.2)
    sun.position.set(30, 25, 20)
    scene.add(sun)

    // Starfield & Earth
    const starfield = createDeepSpaceStarfield(1200, 700)
    scene.add(starfield)

    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // Tactical Target Spacecraft (Receiver)
    const { group: satGroup, plume: ionPlume } = createMilitarySatellite({ scale: 0.55 })
    satGroup.position.set(0, earthRadius + 2.2, 0)
    scene.add(satGroup)

    // Ground Station Base Dome
    const gsGroup = new THREE.Group()
    gsGroup.position.set(0, -earthRadius + 0.1, 0)
    scene.add(gsGroup)

    const gsDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.1, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 })
    )
    gsDish.position.set(0, 0.4, 0)
    gsGroup.add(gsDish)

    // RF Telecommand Uplink Beam Line
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 3,
      transparent: true,
      opacity: isUplinking ? 0.95 : 0.0
    })
    const beamLine = new THREE.Line(beamGeo, beamMat)
    scene.add(beamLine)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Orbit spacecraft
      const t = simStep * 0.01
      const orbitR = earthRadius + 2.4
      satGroup.position.set(orbitR * Math.cos(t), orbitR * Math.sin(t) * 0.4, orbitR * Math.sin(t) * 0.9)
      satGroup.lookAt(0, 0, 0)

      // Uplink Beam
      if (isUplinking) {
        beamMat.opacity = 0.5 + Math.sin(simStep * 0.8) * 0.45
        const posArr = new Float32Array([
          0, 0.5, 0,
          satGroup.position.x, satGroup.position.y, satGroup.position.z
        ])
        beamGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3))
        beamGeo.attributes.position.needsUpdate = true
      }

      // If burn command executed, fire plume
      if (uplinkSuccess && directive === "IMPULSIVE_BURN") {
        ionPlume.visible = true
        ionPlume.scale.set(1.5, 2.0, 1.5)
      } else {
        ionPlume.visible = true
        ionPlume.scale.set(1.0, 1.0, 1.0)
      }

      earthMesh.rotation.y += 0.0006
      cloudsMesh.rotation.y += 0.00085

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
  }, [isUplinking, uplinkSuccess, directive, simStep])

  return (
    <div className="w-full h-full pt-16 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: DIRECTIVE SELECTION & TELECOMMAND FORMULATOR */}
      <div className="w-96 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Radio className="w-4 h-4" /> CCSDS 232.0-B Uplink
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">TELECOMMAND ENGINE</h1>
          <p className="text-[10px] text-slate-500 uppercase">Cryptographic Space Data Link Protocol</p>
        </div>

        <div className="space-y-5">
          {/* Ground Station Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold flex justify-between">
              <span>Ground Station Antenna</span>
              <span className="text-cyan-400">{station.carrierBand} ({station.carrierFreqGhz} GHz)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["SCHRIEVER_SFB", "RAF_FYLINGDALES", "PINE_GAP", "DIEGO_GARCIA"] as GroundStationNode[]).map(key => (
                <button
                  key={key}
                  onClick={() => setStationKey(key)}
                  className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                    stationKey === key 
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                >
                  {key.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Operational Directive Preset */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Operational Directive</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["IMPULSIVE_BURN", "ADCS_SLEW_QUATERNION", "PAYLOAD_SAR_BURST", "SAFE_MODE_ZEROIZE"] as CommandDirective[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDirective(d)}
                  className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                    directive === d 
                      ? "bg-cyan-950 border-cyan-500 text-cyan-200" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {d.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Directive Parameters (Delta-V or Quaternion) */}
          {directive === "IMPULSIVE_BURN" && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
                <span>Burn Vector [ΔVx, ΔVy, ΔVz]</span>
                <span className="text-amber-400 font-bold">{(Math.sqrt(deltaVX * deltaVX + deltaVY * deltaVY + deltaVZ * deltaVZ)).toFixed(1)} m/s NET</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]"><span className="text-slate-400">ΔVx (Prograde):</span><span className="text-white font-bold">{deltaVX} m/s</span></div>
                <input type="range" min="-100" max="100" step="5" value={deltaVX} onChange={e => setDeltaVX(Number(e.target.value))} className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]"><span className="text-slate-400">ΔVy (Radial):</span><span className="text-white font-bold">{deltaVY} m/s</span></div>
                <input type="range" min="-50" max="50" step="2.5" value={deltaVY} onChange={e => setDeltaVY(Number(e.target.value))} className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]"><span className="text-slate-400">ΔVz (Cross-Track):</span><span className="text-white font-bold">{deltaVZ} m/s</span></div>
                <input type="range" min="-50" max="50" step="2" value={deltaVZ} onChange={e => setDeltaVZ(Number(e.target.value))} className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          )}

          {/* Cryptographic Key Parameters */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Security Parameters (SDLS)</span>
              <span className="text-emerald-400 font-bold">HMAC-SHA256</span>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block mb-1">AUTHENTICATION KEY (CIK HEX):</span>
              <input 
                type="text" 
                value={authKeyHex} 
                onChange={e => setAuthKeyHex(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-300 font-mono text-[10px] focus:outline-none focus:border-cyan-500" 
              />
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500">FRAME SEQ NUMBER:</span>
              <span className="text-cyan-400 font-bold">N(S) = #{seqCount}</span>
            </div>
          </div>

          {/* Uplink Dispatch Button */}
          <button
            onClick={executeTransmission}
            disabled={isUplinking}
            className={`w-full py-3 rounded-xl font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 ${
              isUplinking 
                ? "bg-amber-600 text-white animate-pulse" 
                : "bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isUplinking ? "UPLINKING RF CARRIER..." : "AUTHORIZE & DISPATCH TC FRAME"}</span>
          </button>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS UPLINK VISUALIZATION & RAW TC FRAME DUMP */}
      <div className="flex-1 h-full relative flex flex-col">
        {/* Top Header Overlay */}
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            CCSDS Telecommand Uplink // Ground Station &rarr; Spacecraft
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">
              {station.name}
            </span>
            <span className="text-cyan-400 text-xs font-bold">
              [TARGET SCID #{spacecraftId} // VCID #{vcid}]
            </span>
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px]">
            <span className="text-emerald-400">LINK MARGIN: +{commandFrame.linkMarginDb} dB (VIABLE)</span>
            <span className="text-cyan-400">CARRIER C/N0: {commandFrame.cn0DbHz} dB-Hz</span>
            <span className="text-amber-400">EIRP: {station.eirpDbw} dBW</span>
          </div>
        </div>

        {/* 3D Canvas Mount */}
        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Raw Hex Telecommand Frame Inspector */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl font-mono text-xs shadow-2xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-slate-400 font-bold text-[10px] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              AUTHENTICATED CCSDS 232.0-B TRANSFER FRAME ({commandFrame.frameLengthBytes} BYTES)
            </span>
            <span className={`text-[10px] font-bold ${uplinkSuccess ? "text-emerald-400 animate-pulse" : "text-amber-400"}`}>
              {telemetryAck}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-cyan-300 break-all select-all">
            {commandFrame.fullFrameHex}
          </div>

          <div className="flex gap-4 text-[10px] text-slate-400">
            <span>HEADER: <span className="text-white font-bold">{commandFrame.headerHex}</span></span>
            <span>SEC-HEADER: <span className="text-emerald-400 font-bold">{commandFrame.securityHeaderHex}</span></span>
            <span>DATA: <span className="text-cyan-400 font-bold">{commandFrame.dataPayloadHex}</span></span>
            <span>MAC: <span className="text-amber-400 font-bold">{commandFrame.macHex}</span></span>
            <span>CRC: <span className="text-rose-400 font-bold">{commandFrame.crcHex}</span></span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: LINK BUDGET CASCADE & SECURITY PROOF */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2 text-xs">
          <Activity className="w-4 h-4 text-cyan-400" /> Uplink RF Budget
        </h2>

        <div className="space-y-5">
          {/* RF Intercept Cascade Table */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Uplink RF Power Cascade</span>
              <span className="text-cyan-400 font-bold">{station.carrierBand}</span>
            </div>

            <div className="flex justify-between"><span className="text-slate-500">Transmitter EIRP:</span><span className="text-white font-bold">+{station.eirpDbw} dBW</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Free-Space Path Loss:</span><span className="text-rose-400 font-bold">-{commandFrame.pathLossDb} dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Atmospheric Fade:</span><span className="text-slate-400">-0.8 dB</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Spacecraft G/T:</span><span className="text-slate-300">-12.5 dB/K</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Received C/N0:</span><span className="text-cyan-400 font-bold">{commandFrame.cn0DbHz} dB-Hz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Energy Per Bit (Eb/N0):</span><span className="text-emerald-400 font-bold">{commandFrame.ebN0Db} dB</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">LINK MARGIN:</span><span className="text-emerald-400">+{commandFrame.linkMarginDb} dB</span></div>
          </div>

          {/* Security Assurance Card */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Anti-Spoofing Security</span>
              <span className="text-emerald-400 font-bold">VERIFIED</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Every telecommand transfer frame incorporates a monotonically increasing sequence counter N(S) to prevent replay attacks. The 128-bit MAC is verified by the on-board cryptographic core before passing bytes to the flight computer.
            </p>
          </div>

          {/* ISO 13537 Compliance Fact */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 pb-1.5">
              CCSDS / ISO 13537 Standard
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Formatted according to Space Data Link Security (SDLS) core standards. Supports command encryption and authenticated execution for DoD and allied space assets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
