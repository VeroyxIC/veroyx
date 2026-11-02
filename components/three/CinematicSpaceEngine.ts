import * as THREE from "three"

// PHOTOREALISTIC ACCRETION DISK TEXTURE (Fine golden filaments & white-hot core)
export function createPhotorealisticAccretionTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as any)
  const size = 2048
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const cx = size / 2
  const cy = size / 2
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, size, size)

  const rInner = size * 0.17
  const rOuter = size * 0.45

  // Concentric multi-frequency plasma filaments
  for (let r = rOuter; r >= rInner; r -= 1.2) {
    const t = (r - rInner) / (rOuter - rInner)
    let alpha = 0.0
    let rCol = 255, gCol = 255, bCol = 255

    if (t < 0.06) {
      alpha = 0.98
      rCol = 255; gCol = 255; bCol = 255
    } else if (t < 0.22) {
      const f = (t - 0.06) / 0.16
      alpha = 0.92 - f * 0.1
      rCol = 255; gCol = Math.round(255 - f * 35); bCol = Math.round(255 - f * 150)
    } else if (t < 0.55) {
      const f = (t - 0.22) / 0.33
      alpha = 0.82 - f * 0.25
      rCol = 255; gCol = Math.round(220 - f * 80); bCol = Math.round(105 - f * 80)
    } else if (t < 0.85) {
      const f = (t - 0.55) / 0.30
      alpha = 0.57 - f * 0.35
      rCol = Math.round(255 - f * 70); gCol = Math.round(140 - f * 80); bCol = Math.round(25 - f * 15)
    } else {
      const f = (t - 0.85) / 0.15
      alpha = (1.0 - f) * 0.22
      rCol = 185; gCol = 60; bCol = 10
    }

    ctx.strokeStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha})`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Fine spiral filament striations
  for (let i = 0; i < 2800; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = rInner + Math.pow(Math.random(), 1.4) * (rOuter - rInner)
    const len = 3.0 + Math.random() * 16.0
    const bright = Math.random()
    ctx.strokeStyle = bright > 0.65 ? "rgba(255, 255, 255, 0.40)" : "rgba(254, 215, 120, 0.25)"
    ctx.lineWidth = Math.random() * 1.2 + 0.4
    ctx.beginPath()
    ctx.arc(cx, cy, dist, angle, angle + (len / dist))
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

// KERR BLACK HOLE WITH EINSTEIN RELATIVISTIC LENSING
export function createKerrBlackHole(radius = 2.4) {
  const group = new THREE.Group()

  // Pitch-Black Event Horizon
  const horizonGeo = new THREE.SphereGeometry(radius, 64, 64)
  const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const horizon = new THREE.Mesh(horizonGeo, horizonMat)
  group.add(horizon)

  // Razor-Thin White-Hot Photon Ring
  const photonGeo = new THREE.RingGeometry(radius * 1.008, radius * 1.035, 96)
  const photonMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending
  })
  const photonRing = new THREE.Mesh(photonGeo, photonMat)
  group.add(photonRing)

  const diskTex = createPhotorealisticAccretionTexture()

  // Primary Equatorial Accretion Disk
  const diskGeo = new THREE.RingGeometry(radius * 1.15, radius * 3.6, 128)
  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending
  })
  const disk = new THREE.Mesh(diskGeo, diskMat)
  disk.rotation.x = Math.PI / 2.3
  group.add(disk)

  // Einstein Gravitational Lensing Arc (Bending light over & under horizon)
  const lensGeo = new THREE.RingGeometry(radius * 1.08, radius * 2.3, 128)
  const lensMat = new THREE.MeshBasicMaterial({
    map: diskTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  })
  const lensRing = new THREE.Mesh(lensGeo, lensMat)
  lensRing.rotation.y = Math.PI / 18
  group.add(lensRing)

  return { group, horizon, disk, lensRing }
}

// MILITARY RECONNAISSANCE SATELLITE
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

  // Rocket Engine Bell
  const nozGeo = new THREE.ConeGeometry(0.2, 0.45, 16, 1, true)
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 })
  const noz = new THREE.Mesh(nozGeo, nozMat)
  noz.rotation.x = -Math.PI / 2
  noz.position.set(0, 0, -1.05)
  group.add(noz)

  // Recon Optical Barrel & Glowing Lens
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

  // Dual Solar Wings
  const solarWings = new THREE.Group()
  const wingGeo = new THREE.BoxGeometry(2.4, 0.05, 1.0)
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.85 })

  const wingL = new THREE.Mesh(wingGeo, wingMat)
  wingL.position.set(1.9, 0, 0)
  solarWings.add(wingL)

  const wingR = new THREE.Mesh(wingGeo, wingMat)
  wingR.position.set(-1.9, 0, 0)
  solarWings.add(wingR)
  group.add(solarWings)

  // Parabolic Dish
  const dishGroup = new THREE.Group()
  dishGroup.position.set(0, 0.85, -0.4)
  const dishGeo = new THREE.CylinderGeometry(0.5, 0.08, 0.2, 24)
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.92, roughness: 0.18 })
  const dish = new THREE.Mesh(dishGeo, dishMat)
  dish.rotation.x = -Math.PI / 3
  dishGroup.add(dish)
  group.add(dishGroup)

  // Ion Thruster Plume
  const plumeGeo = new THREE.ConeGeometry(0.2, 1.2, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.55)
  group.add(plume)

  return { group, plume, solarWings, dishGroup }
}

// DEEP SPACE STARFIELD
export function createDeepSpaceStarfield(count = 2400, fieldRadius = 700): THREE.Points {
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
    if (p > 0.85) { starColors[i * 3 + 0] = 0.6; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 1.0 }
    else if (p > 0.65) { starColors[i * 3 + 0] = 1.0; starColors[i * 3 + 1] = 0.88; starColors[i * 3 + 2] = 0.6 }
    else { starColors[i * 3 + 0] = 0.95; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0 }
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3))

  return new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.9 }))
}

// NASA BLUE MARBLE EARTH & CRATERED MOON
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
