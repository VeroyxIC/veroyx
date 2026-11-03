import * as THREE from "three"

// 1. STAR WARS HYPERSPACE WARP TUNNEL
export function createHyperspaceTunnel(count = 1200) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 6)
  const velocities = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1.5 + Math.random() * 28.0
    const z = -80 + Math.random() * 160

    positions[i * 6 + 0] = Math.cos(angle) * radius
    positions[i * 6 + 1] = Math.sin(angle) * radius
    positions[i * 6 + 2] = z

    positions[i * 6 + 3] = Math.cos(angle) * radius
    positions[i * 6 + 4] = Math.sin(angle) * radius
    positions[i * 6 + 5] = z - 3.5

    velocities[i] = 60.0 + Math.random() * 80.0
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    linewidth: 2
  })

  const warpLines = new THREE.LineSegments(geo, mat)
  return { warpLines, geo, positions, velocities, mat }
}

// 2. 3D GEODESIC PARTICLE SPHERE & ORBITAL NEXUS (Matches video 00:12)
export function createGeodesicOrbitalNexus(radius = 5.8) {
  const group = new THREE.Group()

  // Inner Wireframe Icosahedron / Geodesic Sphere
  const sphereGeo = new THREE.IcosahedronGeometry(radius, 2)
  const sphereWireMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    wireframe: true,
    transparent: true,
    opacity: 0.22
  })
  const sphereWire = new THREE.Mesh(sphereGeo, sphereWireMat)
  group.add(sphereWire)

  // Surface Nodes / Constellation Vertices
  const nodePositions = sphereGeo.attributes.position
  const nodeGeo = new THREE.BufferGeometry()
  nodeGeo.setAttribute("position", nodePositions)
  const nodeMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.18,
    transparent: true,
    opacity: 0.85
  })
  const nodePoints = new THREE.Points(nodeGeo, nodeMat)
  group.add(nodePoints)

  // Floating Orbital Halo Rings (Tilted)
  const ringsGroup = new THREE.Group()
  const ringAngles = [
    { r: radius * 1.25, tiltX: 0.8, tiltY: 0.3, color: 0x38bdf8 },
    { r: radius * 1.55, tiltX: -0.6, tiltY: 0.8, color: 0x0ea5e9 },
    { r: radius * 1.85, tiltX: 1.2, tiltY: -0.4, color: 0x0284c7 }
  ]

  ringAngles.forEach(cfg => {
    const ringGeo = new THREE.BufferGeometry()
    const pts = []
    const segs = 96
    for (let i = 0; i <= segs; i++) {
      const theta = (i / segs) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(theta) * cfg.r, Math.sin(theta) * cfg.r, 0))
    }
    ringGeo.setFromPoints(pts)
    const ringLine = new THREE.Line(
      ringGeo,
      new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.45, linewidth: 1.5 })
    )
    ringLine.rotation.set(cfg.tiltX, cfg.tiltY, 0)
    ringsGroup.add(ringLine)
  })
  group.add(ringsGroup)

  // Swarm of Outer Telemetry Particle Orbiters
  const orbiterCount = 180
  const orbiterGeo = new THREE.BufferGeometry()
  const orbPositions = new Float32Array(orbiterCount * 3)
  const orbColors = new Float32Array(orbiterCount * 3)

  for (let i = 0; i < orbiterCount; i++) {
    const phi = Math.acos(Math.random() * 2 - 1)
    const theta = Math.random() * Math.PI * 2
    const r = radius * (1.1 + Math.random() * 0.9)
    orbPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    orbPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    orbPositions[i * 3 + 2] = r * Math.cos(phi)

    const isGold = Math.random() > 0.65
    orbColors[i * 3 + 0] = isGold ? 1.0 : 0.2
    orbColors[i * 3 + 1] = isGold ? 0.8 : 0.85
    orbColors[i * 3 + 2] = isGold ? 0.3 : 1.0
  }

  orbiterGeo.setAttribute("position", new THREE.BufferAttribute(orbPositions, 3))
  orbiterGeo.setAttribute("color", new THREE.BufferAttribute(orbColors, 3))
  const orbiterPoints = new THREE.Points(
    orbiterGeo,
    new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.8 })
  )
  group.add(orbiterPoints)

  return { group, sphereWire, ringsGroup, orbiterPoints }
}

// 3. DEEP SPACE STARFIELD (Used across /c2, /catalog, /nexus, /visualizer)
export function createDeepSpaceStarfield(count = 1600, fieldRadius = 600): THREE.Points {
  const starGeo = new THREE.BufferGeometry()
  const starPositions = new Float32Array(count * 3)
  const starColors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(Math.random() * 2 - 1)
    const theta = Math.random() * Math.PI * 2
    const r = fieldRadius * (0.5 + Math.random() * 0.5)

    starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPositions[i * 3 + 2] = r * Math.cos(phi)

    const p = Math.random()
    if (p > 0.85) { starColors[i * 3 + 0] = 0.55; starColors[i * 3 + 1] = 0.80; starColors[i * 3 + 2] = 1.0; }
    else if (p > 0.65) { starColors[i * 3 + 0] = 1.0; starColors[i * 3 + 1] = 0.88; starColors[i * 3 + 2] = 0.65; }
    else { starColors[i * 3 + 0] = 0.95; starColors[i * 3 + 1] = 0.98; starColors[i * 3 + 2] = 1.0; }
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3))

  return new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.85 }))
}

// 4. DEEP SPACE NEBULA SKYBOX
export function createDeepSpaceNebulaSkybox(): THREE.Group {
  const group = new THREE.Group()
  const stars = createDeepSpaceStarfield(2000, 700)
  group.add(stars)
  return group
}

// 5. PHOTOREALISTIC MILITARY RECONNAISSANCE SATELLITE
export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.18 })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  const radGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4)
  const radMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 })
  const radL = new THREE.Mesh(radGeo, radMat)
  radL.position.set(0.61, 0, 0); group.add(radL)
  const radR = radL.clone()
  radR.position.set(-0.61, 0, 0); group.add(radR)

  const nozGeo = new THREE.ConeGeometry(0.18, 0.45, 16, 1, true)
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 })
  const noz = new THREE.Mesh(nozGeo, nozMat)
  noz.rotation.x = -Math.PI / 2
  noz.position.set(0, 0, -1.02)
  group.add(noz)

  const scopeGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.2, 24)
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 })
  const scope = new THREE.Mesh(scopeGeo, scopeMat)
  scope.rotation.x = Math.PI / 2
  scope.position.set(0, 0, 1.2)
  group.add(scope)

  const lensGeo = new THREE.CircleGeometry(0.35, 24)
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
  const scopeLens = new THREE.Mesh(lensGeo, lensMat)
  scopeLens.position.set(0, 0, 1.81)
  group.add(scopeLens)

  const solarWings = new THREE.Group()
  const wingGeo = new THREE.BoxGeometry(2.6, 0.05, 1.1)
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.85 })
  const wingL = new THREE.Mesh(wingGeo, wingMat)
  wingL.position.set(2.1, 0, 0); solarWings.add(wingL)
  const wingR = new THREE.Mesh(wingGeo, wingMat)
  wingR.position.set(-2.1, 0, 0); solarWings.add(wingR)
  group.add(solarWings)

  const dishGroup = new THREE.Group()
  dishGroup.position.set(0, 0.85, -0.4)
  const dishGeo = new THREE.CylinderGeometry(0.55, 0.08, 0.22, 24)
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.92, roughness: 0.18 })
  const dish = new THREE.Mesh(dishGeo, dishMat)
  dish.rotation.x = -Math.PI / 3
  dishGroup.add(dish)
  group.add(dishGroup)

  const plumeGeo = new THREE.ConeGeometry(0.22, 1.4, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.65)
  group.add(plume)

  return { group, plume, solarWings, dishGroup, scopeLens }
}

// 6. NASA BLUE MARBLE EARTH & MOON
export function createCinematicEarth(radius = 5.5) {
  const earthGroup = new THREE.Group()
  const texLoader = new THREE.TextureLoader()

  const dayMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg")
  const nightMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png")
  const specMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg")
  const cloudMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png")

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

  const cloudGeo = new THREE.SphereGeometry(radius * 1.018, 64, 64)
  const cloudMat = new THREE.MeshStandardMaterial({ map: cloudMap, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
  earthGroup.add(cloudsMesh)

  const atmoGeo = new THREE.SphereGeometry(radius * 1.055, 64, 64)
  const atmoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.BackSide })
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

// 7. COMPATIBILITY EXPORTS
export function createAccretionDiskMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
    transparent: true
  })
}

export function createPhotorealisticKerrBlackHole(radius = 2.4) {
  const group = new THREE.Group()
  return { group, horizon: group, disk: group, diskMat: { uniforms: { uTime: { value: 0 } } }, vCoreMesh: group, vGlowMesh: group, lensingGroup: group }
}
export const createKerrBlackHole = createPhotorealisticKerrBlackHole

export function createHalleyCometSystem() {
  const group = new THREE.Group()
  return { group, comet: group, ionTail: group, dustTail: group, meteorGroup: group }
}
