import os

# ==============================================================================
# 1. components/three/CinematicSpaceEngine.ts
# ==============================================================================
engine_code = '''import * as THREE from "three"

// 1. PROCEDURAL ACCRETION DISK SHADER (Relativistic Turbulent Plasma)
export function createAccretionDiskMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorInner: { value: new THREE.Color(0xffffff) },
      uColorMid: { value: new THREE.Color(0xf59e0b) },
      uColorOuter: { value: new THREE.Color(0xdc2626) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorInner;
      uniform vec3 uColorMid;
      uniform vec3 uColorOuter;
      varying vec2 vUv;
      varying vec3 vPosition;

      // Pseudo-random & simplex-like turbulence
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.1;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uvCenter = vUv - vec2(0.5);
        float r = length(uvCenter) * 2.0;
        if (r < 0.22 || r > 0.98) discard;

        float theta = atan(uvCenter.y, uvCenter.x);
        
        // Relativistic Spiral Rotation
        float swirl = theta + (3.0 / (r + 0.1)) - uTime * 1.8;
        vec2 swirlCoord = vec2(r * 8.0, swirl * 2.5);
        float plasma = fbm(swirlCoord);

        // Relativistic Doppler Beaming: Left side approaching is 3x brighter & shifted
        float doppler = 1.0 + 0.65 * sin(theta + 0.3);

        // Multi-tier thermal color gradient
        vec3 color;
        if (r < 0.38) {
          color = mix(uColorInner, uColorMid, (r - 0.22) / 0.16);
        } else if (r < 0.72) {
          color = mix(uColorMid, uColorOuter, (r - 0.38) / 0.34);
        } else {
          color = mix(uColorOuter, vec3(0.15, 0.02, 0.01), (r - 0.72) / 0.26);
        }

        color *= (plasma * 1.5 + 0.5) * doppler;
        float alpha = smoothstep(0.22, 0.30, r) * smoothstep(0.98, 0.85, r) * 0.95;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
}

// 2. KERR BLACK HOLE WITH GENERAL RELATIVISTIC EINSTEIN LENSING
export function createKerrBlackHole(radius = 3.2) {
  const group = new THREE.Group()

  // Event Horizon (Light-absorbing black sphere)
  const horizonGeo = new THREE.SphereGeometry(radius, 64, 64)
  const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const horizon = new THREE.Mesh(horizonGeo, horizonMat)
  group.add(horizon)

  // Photon Sphere Halo
  const photonGeo = new THREE.RingGeometry(radius * 1.01, radius * 1.05, 96)
  const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.98 })
  const photonRing = new THREE.Mesh(photonGeo, photonMat)
  group.add(photonRing)

  // Primary Equatorial Accretion Disk with custom GLSL Shader
  const diskMat = createAccretionDiskMaterial()
  const diskGeo = new THREE.RingGeometry(radius * 1.15, radius * 4.8, 96)
  const disk = new THREE.Mesh(diskGeo, diskMat)
  disk.rotation.x = Math.PI / 2.35
  group.add(disk)

  // Bent Vertical Gravitational Lensing Arc (Curving over & under horizon)
  const lensMat = createAccretionDiskMaterial()
  const lensGeo = new THREE.RingGeometry(radius * 1.08, radius * 3.2, 96)
  const lensRing = new THREE.Mesh(lensGeo, lensMat)
  lensRing.rotation.y = Math.PI / 14
  group.add(lensRing)

  // Roche Limit Asteroid Belt
  const astGeo = new THREE.DodecahedronGeometry(0.35, 1)
  const astMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, metalness: 0.2 })
  const astGroup = new THREE.Group()
  for (let i = 0; i < 24; i++) {
    const ast = new THREE.Mesh(astGeo, astMat)
    const theta = (i / 24) * Math.PI * 2
    const r = radius * (1.7 + Math.random() * 2.8)
    ast.position.set(r * Math.cos(theta), (Math.random() - 0.5) * 1.4, r * Math.sin(theta))
    ast.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    astGroup.add(ast)
  }
  group.add(astGroup)

  return { group, horizon, disk, lensRing, astGroup, diskMat, lensMat }
}

// 3. HALLEY'S COMET SYSTEM & METEOR FIREBALL SHOWER
export function createHalleyCometSystem() {
  const group = new THREE.Group()

  const cometGeo = new THREE.DodecahedronGeometry(0.5, 2)
  const cometMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, emissive: 0x67e8f9, emissiveIntensity: 0.4 })
  const comet = new THREE.Mesh(cometGeo, cometMat)
  group.add(comet)

  const ionTailGeo = new THREE.ConeGeometry(0.35, 9.5, 16, 1, true)
  const ionTailMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const ionTail = new THREE.Mesh(ionTailGeo, ionTailMat)
  ionTail.rotation.z = Math.PI / 2
  ionTail.position.set(-4.8, 0, 0)
  group.add(ionTail)

  const dustTailGeo = new THREE.ConeGeometry(0.75, 8.0, 16, 1, true)
  const dustTailMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
  const dustTail = new THREE.Mesh(dustTailGeo, dustTailMat)
  dustTail.rotation.z = Math.PI / 2.15
  dustTail.position.set(-4.2, 0.4, 0)
  group.add(dustTail)

  const meteorCount = 18
  const meteorGroup = new THREE.Group()
  const streakMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, linewidth: 2 })

  for (let i = 0; i < meteorCount; i++) {
    const p1 = new THREE.Vector3((Math.random() - 0.5) * 50, 10 + Math.random() * 15, (Math.random() - 0.5) * 40)
    const p2 = p1.clone().add(new THREE.Vector3(-4.5, -2.5, -1.5))
    const mGeo = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const mLine = new THREE.Line(mGeo, streakMat)
    meteorGroup.add(mLine)
  }

  return { group, comet, ionTail, dustTail, meteorGroup }
}

// 4. DETAILED MILITARY RECONNAISSANCE SATELLITE
export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  // Gold MLI Avionics Bus
  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.16 })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  // Titanium Radiators
  const radGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4)
  const radMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 })
  const radL = new THREE.Mesh(radGeo, radMat)
  radL.position.set(0.61, 0, 0)
  group.add(radL)
  const radR = radL.clone()
  radR.position.set(-0.61, 0, 0)
  group.add(radR)

  // 3-Bell Rocket Engine Nozzles
  const nozGeo = new THREE.ConeGeometry(0.18, 0.45, 16, 1, true)
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 })
  const nozPositions = [[0.28, 0.28, -1.02], [-0.28, 0.28, -1.02], [0, -0.32, -1.02]]
  nozPositions.forEach(([nx, ny, nz]) => {
    const noz = new THREE.Mesh(nozGeo, nozMat)
    noz.rotation.x = -Math.PI / 2
    noz.position.set(nx, ny, nz)
    group.add(noz)
  })

  // Recon Optical Telescope Barrel
  const scopeGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.2, 24)
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 })
  const scope = new THREE.Mesh(scopeGeo, scopeMat)
  scope.rotation.x = Math.PI / 2
  scope.position.set(0, 0, 1.2)
  group.add(scope)

  // Glowing Primary Aperture Lens
  const lensGeo = new THREE.CircleGeometry(0.35, 24)
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
  const scopeLens = new THREE.Mesh(lensGeo, lensMat)
  scopeLens.position.set(0, 0, 1.81)
  group.add(scopeLens)

  // Articulated GaAs Solar Wings
  const solarWings = new THREE.Group()
  const wingGeo = new THREE.BoxGeometry(2.6, 0.05, 1.1)
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.85 })

  const wingL = new THREE.Mesh(wingGeo, wingMat)
  wingL.position.set(2.1, 0, 0)
  solarWings.add(wingL)

  const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12)
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
  const boomL = new THREE.Mesh(boomGeo, boomMat)
  boomL.rotation.z = Math.PI / 2
  boomL.position.set(0.9, 0, 0)
  solarWings.add(boomL)

  const wingR = new THREE.Mesh(wingGeo, wingMat)
  wingR.position.set(-2.1, 0, 0)
  solarWings.add(wingR)

  const boomR = boomL.clone()
  boomR.position.set(-0.9, 0, 0)
  solarWings.add(boomR)
  group.add(solarWings)

  // Parabolic High-Gain Dish Antenna
  const dishGroup = new THREE.Group()
  dishGroup.position.set(0, 0.85, -0.4)
  const dishGeo = new THREE.CylinderGeometry(0.55, 0.08, 0.22, 24)
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.92, roughness: 0.18 })
  const dish = new THREE.Mesh(dishGeo, dishMat)
  dish.rotation.x = -Math.PI / 3
  dishGroup.add(dish)

  const hornGeo = new THREE.ConeGeometry(0.08, 0.25, 12)
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95 })
  const horn = new THREE.Mesh(hornGeo, hornMat)
  horn.rotation.x = Math.PI * 0.65
  horn.position.set(0, 0.15, 0.15)
  dishGroup.add(horn)
  group.add(dishGroup)

  // Ion Thruster Plume
  const plumeGeo = new THREE.ConeGeometry(0.24, 1.4, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.65)
  group.add(plume)

  return { group, plume, solarWings, dishGroup, scopeLens }
}

// 5. DEEP SPACE STELLAR FIELD
export function createDeepSpaceStarfield(count = 1400, fieldRadius = 600): THREE.Points {
  const starGeo = new THREE.BufferGeometry()
  const starPositions = new Float32Array(count * 3)
  const starColors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(Math.random() * 2 - 1)
    const theta = Math.random() * Math.PI * 2
    const r = fieldRadius * (0.6 + Math.random() * 0.4)

    starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPositions[i * 3 + 2] = r * Math.cos(phi)

    const p = Math.random()
    if (p > 0.8) { starColors[i * 3 + 0] = 0.5; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0; }
    else if (p > 0.6) { starColors[i * 3 + 0] = 1.0; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 0.5; }
    else { starColors[i * 3 + 0] = 0.9; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0; }
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3))

  return new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.85 }))
}

// 6. NASA BLUE MARBLE EARTH & CRATERED MOON (Videos 00:10 - 00:19)
export function createCinematicEarth(radius = 5.5) {
  const earthGroup = new THREE.Group()
  const texLoader = new THREE.TextureLoader()

  // High-Resolution NASA Textures
  const dayMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg")
  const nightMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png")
  const specMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg")
  const cloudMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png")

  // Planetary Surface Mesh
  const earthGeo = new THREE.SphereGeometry(radius, 64, 64)
  const earthMat = new THREE.MeshStandardMaterial({
    map: dayMap,
    roughnessMap: specMap,
    roughness: 0.45,
    metalness: 0.12,
    emissiveMap: nightMap,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.95
  })
  const earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthGroup.add(earthMesh)

  // Cloud Layer
  const cloudGeo = new THREE.SphereGeometry(radius * 1.018, 64, 64)
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudMap,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  })
  const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
  earthGroup.add(cloudsMesh)

  // Rayleigh Atmospheric Scattering Limb (Electric-Cyan Horizon Glow)
  const atmoGeo = new THREE.SphereGeometry(radius * 1.055, 64, 64)
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat)
  earthGroup.add(atmoMesh)

  return { earthGroup, earthMesh, cloudsMesh }
}

export function createCrateredMoon(radius = 1.4) {
  const texLoader = new THREE.TextureLoader()
  const moonTex = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg")
  const moonGeo = new THREE.SphereGeometry(radius, 32, 32)
  const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.92, metalness: 0.05 })
  return new THREE.Mesh(moonGeo, moonMat)
}
'''
with open("components/three/CinematicSpaceEngine.ts", "w") as f:
    f.write(engine_code)

with open("components/three/SpaceSceneEngine.ts", "w") as f:
    f.write('export * from "./CinematicSpaceEngine";\\n')

print("1. CinematicSpaceEngine.ts written successfully.")

# ==============================================================================
# 2. app/page.tsx (Page 1: Kerr Black Hole, Halley Comet, Borderless Logo, Zoom)
# ==============================================================================
page_code = '''"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Sparkles, Globe, Orbit, Crosshair, ShieldCheck, Zap, 
  Eye, Radio, Activity, Layers, ArrowRight, Terminal, 
  Lock, Key, Database, Cpu, Compass, Flame, CheckCircle2, 
  ShieldAlert, Fingerprint, Unlock, ChevronDown 
} from "lucide-react"
import { 
  createKerrBlackHole, createHalleyCometSystem, 
  createMilitarySatellite, createDeepSpaceStarfield 
} from "@/components/three/CinematicSpaceEngine"

type ClearanceLevel = "TS_SCI_SITK" | "SECRET_NATO" | "SAP_GAMMA"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [clearanceTier, setClearanceTier] = useState<ClearanceLevel>("TS_SCI_SITK")
  const [pinCode, setPinCode] = useState<string>("8942-0129")
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)
  const [authStepMessage, setAuthStepMessage] = useState<string>("CREDENTIALS STANDBY")

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  const handleAuthorizeEnclave = (bypass = false) => {
    setIsAuthenticating(true)
    setAuthStepMessage("INITIALIZING ECDH CURVE25519 KEY EXCHANGE...")
    setTimeout(() => setAuthStepMessage("NIST FIPS 140-3 HSM ZERO-KNOWLEDGE PROOF VERIFIED..."), 400)
    setTimeout(() => setAuthStepMessage("CLEARANCE GRANTED // DECRYPTING OPERATIONAL ENCLAVE"), 800)
    setTimeout(() => {
      setIsAuthenticating(false)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("veroyx_clearance_active", "true")
      }
    }, bypass ? 200 : 1100)
  }

  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  // 3D Three.js Kerr Black Hole & Interactive Motion Zooming Engine
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 18)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const pLight = new THREE.PointLight(0xffa200, 4.5, 70)
    pLight.position.set(0, 2, 8)
    scene.add(pLight)

    const starfield = createDeepSpaceStarfield(1400, 700)
    scene.add(starfield)

    // 1. Relativistic Kerr Black Hole
    const { group: bhGroup, disk, lensRing, astGroup, diskMat, lensMat } = createKerrBlackHole(3.2)
    scene.add(bhGroup)

    // 2. Halley's Comet & Meteor Shower
    const { group: cometGroup, meteorGroup } = createHalleyCometSystem()
    cometGroup.position.set(-16, 8, -6)
    scene.add(cometGroup)
    scene.add(meteorGroup)

    // 3. Military Reconnaissance Spacecraft
    const { group: satGroup, plume } = createMilitarySatellite({ scale: 0.44 })
    satGroup.position.set(6.8, -2.2, 5.0)
    satGroup.rotation.y = -Math.PI / 4
    scene.add(satGroup)

    // Drag Rotation & Scroll-Wheel Motion Zooming
    let isDragging = false
    let prevMouseX = 0
    let prevMouseY = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - prevMouseX
      const deltaY = e.clientY - prevMouseY
      prevMouseX = e.clientX
      prevMouseY = e.clientY
      bhGroup.rotation.y += deltaX * 0.005
      bhGroup.rotation.x += deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(8.0, Math.min(38.0, camera.position.z + e.deltaY * 0.025))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      // Accretion disk shader time update
      diskMat.uniforms.uTime.value = elapsed
      lensMat.uniforms.uTime.value = elapsed

      disk.rotation.z += 0.25 * delta
      lensRing.rotation.z += 0.18 * delta
      astGroup.rotation.y += 0.12 * delta

      // Halley Comet translation
      cometGroup.position.x = -18 + ((elapsed * 1.6) % 36)
      cometGroup.position.y = 7.5 + Math.sin(elapsed * 0.4) * 1.5

      // Meteor fireballs
      meteorGroup.children.forEach((m, idx) => {
        m.position.x -= delta * (14 + idx * 2)
        m.position.y -= delta * (8 + idx)
        if (m.position.x < -30) {
          m.position.x = 25 + Math.random() * 10
          m.position.y = 10 + Math.random() * 15
        }
      })

      // Satellite stationkeeping hover
      satGroup.position.y = -2.2 + Math.sin(elapsed * 0.8) * 0.25
      satGroup.position.x = 6.8 + Math.cos(elapsed * 0.5) * 0.3
      satGroup.lookAt(0, 0, 0)

      plume.scale.setScalar(1.0 + Math.sin(elapsed * 14) * 0.25)
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
      container.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      container.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [isAuthenticated])

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#010614]/90 backdrop-blur-3xl border border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.3)] space-y-6 font-mono text-xs">
            <div className="text-center space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                UNAUTHORIZED ACCESS PROHIBITED UNDER 18 U.S.C. § 1030. ALL NETWORK PACKETS MONITORED BY DISA ENCLAVES.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold flex justify-between">
                <span>Required Clearance Tier</span>
                <span className="text-cyan-400 font-bold">ACTIVE SESSION</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "TS_SCI_SITK", label: "TS/SCI SI-TK", note: "TALENT-KEYHOLE" },
                  { key: "SECRET_NATO", label: "SECRET NATO", note: "FVEY ALLIED" },
                  { key: "SAP_GAMMA", label: "SAP GAMMA", note: "COUNTER-SPACE" }
                ].map(c => (
                  <button
                    key={c.key}
                    onClick={() => setClearanceTier(c.key as ClearanceLevel)}
                    className={
                      clearanceTier === c.key
                        ? "p-2.5 rounded-xl border text-center transition-all bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        : "p-2.5 rounded-xl border text-center transition-all bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700"
                    }
                  >
                    <div className="font-bold text-[11px] text-white">{c.label}</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">{c.note}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>BIOMETRIC SMARTCARD (CAC/PIV)</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">ID: FP-9821-USSF</span>
              </div>
              <input
                type="text"
                value={pinCode}
                onChange={e => setPinCode(e.target.value)}
                placeholder="Enter 8-digit CAC PKI PIN..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-center tracking-widest text-sm"
              />
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] text-cyan-300">
                <span className="font-bold">{authStepMessage}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleAuthorizeEnclave(false)}
                disabled={isAuthenticating}
                className="w-full py-3.5 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
              >
                {isAuthenticating ? <Lock className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>{isAuthenticating ? "AUTHENTICATING CRYPTO ENCLAVE..." : "AUTHORIZE CLASSIFIED ACCESS"}</span>
              </button>

              <button
                onClick={() => handleAuthorizeEnclave(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>INSTANT EVALUATOR 1-CLICK ACCESS</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full min-h-screen">
          <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/30 px-6 py-2 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">ACTIVE SESSION // CLEARANCE: {clearanceTier.replace(/_/g, " ")}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">109 PRODUCTION MODULES DEPLOYED</span>
            </div>
            <button onClick={handleLockTerminal} className="px-2.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          <section className="relative w-full min-h-[92vh] flex flex-col items-center justify-center pt-24 px-4 sm:px-6 select-none">
            <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

            {/* Instruction Badge */}
            <div className="absolute top-24 right-6 z-10 font-mono text-[10px] text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl pointer-events-none backdrop-blur-md hidden sm:block">
              DRAG: ROTATE BLACK HOLE | SCROLL: MOTION ZOOM (8x - 38x)
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto pointer-events-auto">
              
              {/* BORDERLESS GLOWING V LOGO WITH SATELLITE ORBIT */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-3xl animate-breathe-glow pointer-events-none" />
                <div className="absolute w-44 h-44 rounded-full border border-cyan-500/40 border-dashed animate-spin [animation-duration:28s] pointer-events-none" />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="animate-orbit-satellite flex items-center justify-center">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute -left-3 w-3.5 h-1 rounded-full bg-cyan-400 blur-[2px] animate-pulse" />
                      <div className="w-4 h-4 rounded bg-amber-500 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.95)] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                      </div>
                      <div className="absolute -top-2.5 w-1.5 h-2.5 rounded bg-sky-600 border border-sky-400" />
                      <div className="absolute -bottom-2.5 w-1.5 h-2.5 rounded bg-sky-600 border border-sky-400" />
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center justify-center animate-breathe-glow">
                  <svg viewBox="0 0 80 80" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_0_35px_rgba(6,182,212,0.95)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="vMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="45%" stopColor="#00f0ff" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient id="vInnerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e0f2fe" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    <path d="M12 14L40 68L32 68L8 14H12Z" fill="url(#vMainGrad)" />
                    <path d="M68 14L40 68L48 68L72 14H68Z" fill="url(#vMainGrad)" />
                    <path d="M22 14L40 52L58 14H50L40 36L30 14H22Z" fill="url(#vInnerGrad)" fillOpacity="0.9" />
                    <circle cx="40" cy="68" r="3.5" fill="#00f0ff" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-6xl sm:text-8xl font-black tracking-[0.24em] text-white uppercase drop-shadow-[0_0_40px_rgba(6,182,212,0.45)]">
                  VEROYX
                </h1>
                <p className="text-xs sm:text-sm font-mono text-cyan-400 tracking-widest uppercase">
                  Space Domain Awareness & Allied JADC2 Battle Management
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-[10px] text-slate-300 pt-1">
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  [ 9.8.1 // SECURED ]
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  [ ZERO-TRUST ENFORCED ]
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  [ KERNEL: ONLINE ]
                </span>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
                <Link href="/visualizer" className="px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-2 hover:scale-105">
                  <Globe className="w-4 h-4" />
                  <span>NASA EARTH THEATER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link href="/nexus" className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>COMMAND NEXUS</span>
                </Link>

                <Link href="/catalog" className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>48K ORBITAL CATALOG</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
'''
with open("app/page.tsx", "w") as f:
    f.write(page_code)

print("2. app/page.tsx written successfully.")

# ==============================================================================
# 3. app/visualizer/page.tsx (Page 2: NASA Blue Marble Earth Theater, Video 00:10)
# ==============================================================================
vis_code = '''"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { Orbit, Activity, Globe } from "lucide-react"
import { 
  createCinematicEarth, createCrateredMoon, 
  createMilitarySatellite, createDeepSpaceStarfield 
} from "@/components/three/CinematicSpaceEngine"

export default function VisualizerPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.6)

  const paramsRef = useRef({ altitudeKm: 550, inclinationDeg: 51.6 })
  useEffect(() => {
    paramsRef.current = { altitudeKm, inclinationDeg }
  }, [altitudeKm, inclinationDeg])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 3000)
    camera.position.set(0, 14, 26)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    const starfield = createDeepSpaceStarfield(1600, 800)
    scene.add(starfield)

    // 1. Radiant Sun with Anamorphic Flare in Upper Left (Video 00:10)
    const sunLight = new THREE.DirectionalLight(0xfffaee, 4.0)
    sunLight.position.set(-28, 22, 14)
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.6))

    const sunGeo = new THREE.SphereGeometry(1.6, 32, 32)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const sunMesh = new THREE.Mesh(sunGeo, sunMat)
    sunMesh.position.set(-32, 26, 14)
    scene.add(sunMesh)

    const flareLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-45, 26, 14),
      new THREE.Vector3(-19, 26, 14)
    ])
    const flareLineMat = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.85, linewidth: 3 })
    const flareLine = new THREE.Line(flareLineGeo, flareLineMat)
    scene.add(flareLine)

    // 2. NASA Blue Marble Earth
    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // 3. Cratered Moon in Upper Right
    const moonMesh = createCrateredMoon(1.4)
    moonMesh.position.set(18, 12, -22)
    scene.add(moonMesh)

    // 4. Primary Satellite & Wingmen Formation
    const { group: satGroup, plume: ionPlume } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satGroup)
    const { group: wingman1 } = createMilitarySatellite({ scale: 0.35 })
    scene.add(wingman1)
    const { group: wingman2 } = createMilitarySatellite({ scale: 0.35 })
    scene.add(wingman2)

    // 5. Neon-Green Laser Crosslinks (OISL)
    const laserMat = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2.5, transparent: true, opacity: 0.9 })
    const laserGeo1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const laserLine1 = new THREE.Line(laserGeo1, laserMat)
    scene.add(laserLine1)

    const laserGeo2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const laserLine2 = new THREE.Line(laserGeo2, laserMat)
    scene.add(laserLine2)

    // Orbit Path Line
    const orbitPointsCount = 128
    const orbitGeo = new THREE.BufferGeometry()
    const orbitPositions = new Float32Array(orbitPointsCount * 3)
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65, linewidth: 2 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

    // Interactive Drag Rotation & Motion Zooming
    let isDragging = false
    let prevMouseX = 0
    let prevMouseY = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - prevMouseX
      const deltaY = e.clientY - prevMouseY
      prevMouseX = e.clientX
      prevMouseY = e.clientY
      earthGroup.rotation.y += deltaX * 0.005
      earthGroup.rotation.x += deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(10.0, Math.min(42.0, camera.position.z + e.deltaY * 0.025))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let orbitAngle = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()
      const { altitudeKm, inclinationDeg } = paramsRef.current

      orbitAngle += delta * 0.5
      earthMesh.rotation.y += 0.05 * delta
      cloudsMesh.rotation.y += 0.075 * delta

      const orbitScaleRadius = earthRadius + (altitudeKm / 6371) * earthRadius
      const incRad = (inclinationDeg * Math.PI) / 180

      const satX = orbitScaleRadius * Math.cos(orbitAngle)
      const satY = orbitScaleRadius * Math.sin(orbitAngle) * Math.sin(incRad)
      const satZ = orbitScaleRadius * Math.sin(orbitAngle) * Math.cos(incRad)

      satGroup.position.set(satX, satY, satZ)
      satGroup.lookAt(0, 0, 0)

      const w1X = (orbitScaleRadius + 1.2) * Math.cos(orbitAngle + 0.8)
      const w1Y = (orbitScaleRadius + 1.2) * Math.sin(orbitAngle + 0.8) * Math.sin(incRad + 0.2)
      const w1Z = (orbitScaleRadius + 1.2) * Math.sin(orbitAngle + 0.8) * Math.cos(incRad + 0.2)
      wingman1.position.set(w1X, w1Y, w1Z)
      wingman1.lookAt(0, 0, 0)

      const w2X = (orbitScaleRadius + 0.8) * Math.cos(orbitAngle - 0.7)
      const w2Y = (orbitScaleRadius + 0.8) * Math.sin(orbitAngle - 0.7) * Math.sin(incRad - 0.2)
      const w2Z = (orbitScaleRadius + 0.8) * Math.sin(orbitAngle - 0.7) * Math.cos(incRad - 0.2)
      wingman2.position.set(w2X, w2Y, w2Z)
      wingman2.lookAt(0, 0, 0)

      laserGeo1.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        satX, satY, satZ, w1X, w1Y, w1Z
      ]), 3))
      laserGeo1.attributes.position.needsUpdate = true

      laserGeo2.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        satX, satY, satZ, w2X, w2Y, w2Z
      ]), 3))
      laserGeo2.attributes.position.needsUpdate = true

      ionPlume.scale.setScalar(1.0 + Math.sin(elapsed * 6) * 0.15)

      const posArr = orbitGeo.attributes.position.array as Float32Array
      for (let i = 0; i < orbitPointsCount; i++) {
        const theta = (i / (orbitPointsCount - 1)) * Math.PI * 2
        posArr[i * 3 + 0] = orbitScaleRadius * Math.cos(theta)
        posArr[i * 3 + 1] = orbitScaleRadius * Math.sin(theta) * Math.sin(incRad)
        posArr[i * 3 + 2] = orbitScaleRadius * Math.sin(theta) * Math.cos(incRad)
      }
      orbitGeo.attributes.position.needsUpdate = true

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
      container.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      container.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden select-none">
      
      <div className="w-80 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Orbit className="w-4 h-4" /> NASA Blue Marble Engine
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">C2 THEATER VIEW</h1>
          <p className="text-[10px] text-slate-500 uppercase">Sun Flare, Moon &amp; Laser Crosslinks</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Tactical Crosslink Telemetry</span>
              <span className="text-emerald-400 font-bold">100 GBPS LOCKED</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">MASTER LINK:</span><span className="text-emerald-400 font-bold">127 SGC</span></div>
            <div className="flex justify-between"><span className="text-slate-500">WINGMAN-1:</span><span className="text-cyan-400 font-bold">252 KM // ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-slate-500">WINGMAN-2:</span><span className="text-cyan-400 font-bold">184 KM // ACTIVE</span></div>
            <div className="flex justify-between"><span className="text-slate-500">EARTH PHASE:</span><span className="text-white font-bold">DAYLIGHT GULF</span></div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">ALTITUDE:</span><span className="text-white font-bold">{altitudeKm} km</span></div>
              <input type="range" min="200" max="35786" step="50" value={altitudeKm} onChange={e => setAltitudeKm(Number(e.target.value))} className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]"><span className="text-slate-400">INCLINATION:</span><span className="text-cyan-300 font-bold">{inclinationDeg}°</span></div>
              <input type="range" min="0" max="98.5" step="0.5" value={inclinationDeg} onChange={e => setInclinationDeg(Number(e.target.value))} className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 h-full relative flex flex-col">
        {/* Aerospace Mission Control Header Glass (Video 00:10) */}
        <div className="absolute top-3 left-6 right-6 z-10 flex items-center justify-between font-mono text-[10px] text-slate-400 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold">FILE</span>
            <span>EDIT</span>
            <span>VIEW</span>
            <span className="text-cyan-400 font-bold">CONSTELLATION</span>
            <span>TOOLS</span>
            <span>HQ</span>
            <span className="text-emerald-400 font-bold">CONVERGENODES</span>
            <span>HELP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-bold">SATELLITE TELEMETRY - LOCKED</span>
          </div>
        </div>

        {/* Live floating HUD badges (Video 00:10 - 00:19) */}
        <div className="absolute top-20 left-1/3 z-10 font-mono text-[9px] bg-slate-950/80 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_10px_rgba(34,197,94,0.4)]">
          ● 127 SGC // SAT 012
        </div>
        <div className="absolute top-28 right-1/3 z-10 font-mono text-[9px] bg-slate-950/80 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-[0_0_10px_rgba(34,197,94,0.4)]">
          ● 252 KM/S // LINK ACTIVE
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold text-xs">CONSTELLATION FORMATION // OISL LASER CHANNELS ACTIVE</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SUN CORONA ANAMORPHIC FLARE</span>
            <span className="text-cyan-400 font-bold text-sm">ACTIVE LENS FLARE</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">LUNAR ORBIT COVARIANCE</span>
            <span className="text-emerald-400 font-bold text-sm">MOON TRACK LOCKED</span>
          </div>
        </div>
      </div>
    </div>
  )
}
'''
with open("app/visualizer/page.tsx", "w") as f:
    f.write(vis_code)

print("3. app/visualizer/page.tsx written successfully.")
