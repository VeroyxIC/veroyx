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

// 2. HOLLYWOOD FILM-GRADE NASA BLUE MARBLE EARTH (Matches Screenshot 2026-11-01 14.41.34)
export function createCinematicEarth(radius = 5.8) {
  const earthGroup = new THREE.Group()
  const texLoader = new THREE.TextureLoader()

  const dayMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg")
  const nightMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png")
  const specMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg")
  const cloudMap = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png")

  // High-density sphere geometry
  const earthGeo = new THREE.SphereGeometry(radius, 80, 80)
  
  // Custom Hollywood PBR Earth Material: Intense Amber Night Lights & Specular Oceans
  const earthMat = new THREE.MeshStandardMaterial({
    map: dayMap,
    roughnessMap: specMap,
    roughness: 0.38,
    metalness: 0.15,
    emissiveMap: nightMap,
    emissive: new THREE.Color(0xff9922), // Warm Golden/Amber incandescent city lights
    emissiveIntensity: 1.6
  })
  const earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthGroup.add(earthMesh)

  // Floating High-Altitude Clouds
  const cloudGeo = new THREE.SphereGeometry(radius * 1.016, 80, 80)
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudMap,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  })
  const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
  earthGroup.add(cloudsMesh)

  // Rayleigh Atmospheric Rim Shell
  const atmoGeo = new THREE.SphereGeometry(radius * 1.045, 80, 80)
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat)
  earthGroup.add(atmoMesh)

  // Radiant Sun Flare at Top Pole Limb (Matches Screenshot 2026-11-01 14.41.34)
  const sunFlareGroup = new THREE.Group()
  sunFlareGroup.position.set(0, radius * 1.02, 0)

  // Core white-hot sun disc
  const sunDiscGeo = new THREE.CircleGeometry(0.85, 32)
  const sunDiscMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  })
  const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat)
  sunFlareGroup.add(sunDisc)

  // Warm golden corona halo
  const coronaGeo = new THREE.CircleGeometry(2.4, 32)
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  })
  const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat)
  sunFlareGroup.add(coronaMesh)

  // Anamorphic horizontal lens flare streak across the northern horizon
  const streakGeo = new THREE.PlaneGeometry(16.0, 0.18)
  const streakMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  })
  const streakMesh = new THREE.Mesh(streakGeo, streakMat)
  sunFlareGroup.add(streakMesh)

  earthGroup.add(sunFlareGroup)

  return { earthGroup, earthMesh, cloudsMesh, sunFlareGroup }
}

// 3. PHOTOREALISTIC RECONNAISSANCE SATELLITE (Film Studio Detail)
export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  // Gold MLI Foil Avionics Bus
  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.18 })
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

  // Conical Optical Telescope Barrel & Glowing Sensor Aperture
  const scopeGeo = new THREE.CylinderGeometry(0.38, 0.44, 1.3, 32)
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.88, roughness: 0.22 })
  const scope = new THREE.Mesh(scopeGeo, scopeMat)
  scope.rotation.x = Math.PI / 2
  scope.position.set(0, 0, 1.25)
  group.add(scope)

  const lensGeo = new THREE.CircleGeometry(0.36, 32)
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.88 })
  const lens = new THREE.Mesh(lensGeo, lensMat)
  lens.position.set(0, 0, 1.91)
  group.add(lens)

  // Dual GaAs Photovoltaic Wings
  const solarWings = new THREE.Group()
  const wingGeo = new THREE.BoxGeometry(2.8, 0.05, 1.15)
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.22, metalness: 0.88 })

  const wingL = new THREE.Mesh(wingGeo, wingMat)
  wingL.position.set(2.2, 0, 0)
  solarWings.add(wingL)

  const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12)
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
  const boomL = new THREE.Mesh(boomGeo, boomMat)
  boomL.rotation.z = Math.PI / 2
  boomL.position.set(0.9, 0, 0)
  solarWings.add(boomL)

  const wingR = new THREE.Mesh(wingGeo, wingMat)
  wingR.position.set(-2.2, 0, 0)
  solarWings.add(wingR)

  const boomR = boomL.clone()
  boomR.position.set(-0.9, 0, 0)
  solarWings.add(boomR)
  group.add(solarWings)

  // Parabolic High-Gain Antenna Dish on Dual-Axis Gimbal
  const dishGroup = new THREE.Group()
  dishGroup.position.set(0, 0.88, -0.4)
  const dishGeo = new THREE.CylinderGeometry(0.55, 0.08, 0.22, 24)
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.92, roughness: 0.18 })
  const dish = new THREE.Mesh(dishGeo, dishMat)
  dish.rotation.x = -Math.PI / 3
  dishGroup.add(dish)
  group.add(dishGroup)

  return { group, solarWings, dishGroup, lens }
}

// 4. DEEP SPACE STARFIELD
export function createDeepSpaceStarfield(count = 1800, fieldRadius = 800): THREE.Points {
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

// 5. BACKWARD-COMPATIBILITY EXPORTS FOR OTHER ROUTES
export function createCrateredMoon(radius = 1.4) {
  const texLoader = new THREE.TextureLoader()
  const moonTex = texLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg")
  const moonGeo = new THREE.SphereGeometry(radius, 32, 32)
  const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.92, metalness: 0.05 })
  return new THREE.Mesh(moonGeo, moonMat)
}

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

export function createDeepSpaceNebulaSkybox() {
  return createDeepSpaceStarfield(2000, 700)
}

export function createGeodesicOrbitalNexus(radius = 5.8) {
  const group = new THREE.Group()
  const geo = new THREE.IcosahedronGeometry(radius, 2)
  const mat = new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true, transparent: true, opacity: 0.25 })
  const mesh = new THREE.Mesh(geo, mat)
  group.add(mesh)
  return { group, sphereWire: mesh, ringsGroup: group, orbiterPoints: mesh }
}
