import * as THREE from "three"

export function createProceduralEarthMaps() {
  if (typeof document === "undefined") {
    const dummy = new THREE.CanvasTexture({} as any)
    return { dayMap: dummy, nightMap: dummy, specMap: dummy, cloudMap: dummy }
  }

  const w = 2048
  const h = 1024

  // 1. HIGH-RESOLUTION DAY MAP (Oceans, Topographic Continents, Deserts, Polar Caps)
  const dayCanvas = document.createElement("canvas")
  dayCanvas.width = w
  dayCanvas.height = h
  const dCtx = dayCanvas.getContext("2d")
  if (dCtx) {
    const oceanGrad = dCtx.createLinearGradient(0, 0, 0, h)
    oceanGrad.addColorStop(0, "#011229")
    oceanGrad.addColorStop(0.35, "#06305a")
    oceanGrad.addColorStop(0.5, "#09447a")
    oceanGrad.addColorStop(0.65, "#06305a")
    oceanGrad.addColorStop(1, "#011229")
    dCtx.fillStyle = oceanGrad
    dCtx.fillRect(0, 0, w, h)

    // Continents
    dCtx.fillStyle = "#16381b"

    // North America & Arctic
    dCtx.beginPath()
    dCtx.ellipse(w * 0.25, h * 0.28, w * 0.11, h * 0.12, -0.25, 0, Math.PI * 2)
    dCtx.fill()
    dCtx.beginPath()
    dCtx.ellipse(w * 0.22, h * 0.38, w * 0.08, h * 0.09, -0.4, 0, Math.PI * 2)
    dCtx.fill()

    // South America
    dCtx.fillStyle = "#123b1a"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.33, h * 0.68, w * 0.07, h * 0.19, 0.2, 0, Math.PI * 2)
    dCtx.fill()

    // Europe & Mediterranean
    dCtx.fillStyle = "#1e4020"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.52, h * 0.28, w * 0.07, h * 0.08, 0.1, 0, Math.PI * 2)
    dCtx.fill()

    // Africa & Sahara
    dCtx.beginPath()
    dCtx.ellipse(w * 0.56, h * 0.62, w * 0.08, h * 0.18, -0.1, 0, Math.PI * 2)
    dCtx.fill()
    dCtx.fillStyle = "#a8742d"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.54, h * 0.44, w * 0.10, h * 0.07, 0.08, 0, Math.PI * 2)
    dCtx.fill()

    // Asia & Siberia
    dCtx.fillStyle = "#18381c"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.70, h * 0.28, w * 0.18, h * 0.14, 0.05, 0, Math.PI * 2)
    dCtx.fill()
    dCtx.fillStyle = "#9c6b25"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.63, h * 0.44, w * 0.06, h * 0.05, 0.1, 0, Math.PI * 2)
    dCtx.ellipse(w * 0.74, h * 0.38, w * 0.07, h * 0.05, 0, 0, Math.PI * 2)
    dCtx.fill()

    // India & Southeast Asia
    dCtx.fillStyle = "#1a4a25"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.71, h * 0.50, w * 0.04, h * 0.07, 0.1, 0, Math.PI * 2)
    dCtx.ellipse(w * 0.80, h * 0.58, w * 0.05, h * 0.06, 0.3, 0, Math.PI * 2)
    dCtx.fill()

    // Australia
    dCtx.fillStyle = "#8a3c10"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.83, h * 0.72, w * 0.06, h * 0.08, 0.1, 0, Math.PI * 2)
    dCtx.fill()

    // Polar Caps
    dCtx.fillStyle = "#f1f5f9"
    dCtx.fillRect(0, 0, w, h * 0.06)
    dCtx.fillRect(0, h * 0.94, w, h * 0.06)
  }

  // 2. NIGHT LIGHTS MAP (High-Density Sodium City Clusters)
  const nightCanvas = document.createElement("canvas")
  nightCanvas.width = w
  nightCanvas.height = h
  const nCtx = nightCanvas.getContext("2d")
  if (nCtx) {
    nCtx.fillStyle = "#000000"
    nCtx.fillRect(0, 0, w, h)

    const urbanClusters = [
      { cx: w * 0.29, cy: h * 0.33, count: 320, rMax: 90 },
      { cx: w * 0.19, cy: h * 0.35, count: 200, rMax: 70 },
      { cx: w * 0.52, cy: h * 0.30, count: 480, rMax: 95 },
      { cx: w * 0.80, cy: h * 0.36, count: 520, rMax: 110 },
      { cx: w * 0.70, cy: h * 0.46, count: 300, rMax: 80 },
      { cx: w * 0.58, cy: h * 0.44, count: 180, rMax: 50 },
      { cx: w * 0.36, cy: h * 0.72, count: 150, rMax: 60 },
      { cx: w * 0.85, cy: h * 0.75, count: 90, rMax: 40 }
    ]

    urbanClusters.forEach(cluster => {
      for (let i = 0; i < cluster.count; i++) {
        const rad = Math.pow(Math.random(), 1.7) * cluster.rMax
        const ang = Math.random() * Math.PI * 2
        const px = cluster.cx + Math.cos(ang) * rad
        const py = cluster.cy + Math.sin(ang) * rad

        const b = Math.random()
        nCtx.fillStyle = b > 0.85 ? "#fef08a" : b > 0.4 ? "#f59e0b" : "#b45309"
        nCtx.beginPath()
        nCtx.arc(px, py, Math.random() * 1.8 + 0.6, 0, Math.PI * 2)
        nCtx.fill()
      }
    })
  }

  // 3. SPECULAR OCEAN MAP (Oceans Reflect Sunlight Glint)
  const specCanvas = document.createElement("canvas")
  specCanvas.width = w
  specCanvas.height = h
  const sCtx = specCanvas.getContext("2d")
  if (sCtx) {
    sCtx.fillStyle = "#ffffff"
    sCtx.fillRect(0, 0, w, h)

    sCtx.fillStyle = "#080808"
    sCtx.beginPath()
    sCtx.ellipse(w * 0.25, h * 0.28, w * 0.11, h * 0.12, -0.25, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.22, h * 0.38, w * 0.08, h * 0.09, -0.4, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.33, h * 0.68, w * 0.07, h * 0.19, 0.2, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.52, h * 0.28, w * 0.07, h * 0.08, 0.1, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.56, h * 0.62, w * 0.08, h * 0.18, -0.1, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.70, h * 0.28, w * 0.18, h * 0.14, 0.05, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.83, h * 0.72, w * 0.06, h * 0.08, 0.1, 0, Math.PI * 2)
    sCtx.fill()
  }

  // 4. CLOUD DECK MAP
  const cloudCanvas = document.createElement("canvas")
  cloudCanvas.width = w
  cloudCanvas.height = h
  const cCtx = cloudCanvas.getContext("2d")
  if (cCtx) {
    cCtx.fillStyle = "rgba(0,0,0,0)"
    cCtx.fillRect(0, 0, w, h)

    cCtx.fillStyle = "rgba(255, 255, 255, 0.42)"
    for (let i = 0; i < 48; i++) {
      const cx = (i * (w / 38)) % w
      const cy = h * 0.16 + Math.sin(i * 0.75) * (h * 0.34) + (i % 4) * 40
      cCtx.beginPath()
      cCtx.ellipse(cx, cy, 95 + (i % 6) * 22, 28 + (i % 3) * 12, Math.sin(i) * 0.45, 0, Math.PI * 2)
      cCtx.fill()
    }
  }

  const dayMap = new THREE.CanvasTexture(dayCanvas)
  const nightMap = new THREE.CanvasTexture(nightCanvas)
  const specMap = new THREE.CanvasTexture(specCanvas)
  const cloudMap = new THREE.CanvasTexture(cloudCanvas)

  return { dayMap, nightMap, specMap, cloudMap }
}

export function createCinematicEarth(radius = 5.5) {
  const earthGroup = new THREE.Group()
  const { dayMap, nightMap, specMap, cloudMap } = createProceduralEarthMaps()

  // 1. Earth Planetary Mesh with Night City Lights & Specular Glint
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

  // 2. Swirling Cloud Deck
  const cloudGeo = new THREE.SphereGeometry(radius * 1.018, 64, 64)
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudMap,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending
  })
  const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
  earthGroup.add(cloudsMesh)

  // 3. Technical Coordinate Grid Shell
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.08
  })
  const gridMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.004, 36, 18), gridMat)
  earthGroup.add(gridMesh)

  // 4. Rayleigh Atmospheric Scattering Limb (Cyan Horizon Glow)
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

  // 5. Exosphere Soft Dark-Blue Halo
  const haloGeo = new THREE.SphereGeometry(radius * 1.11, 48, 48)
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
  const haloMesh = new THREE.Mesh(haloGeo, haloMat)
  earthGroup.add(haloMesh)

  return { earthGroup, earthMesh, cloudsMesh }
}

export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  // 1. Central Avionics Bus (Gold Multi-Layer Insulation Foil)
  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.94,
    roughness: 0.18
  })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  // Lateral Heat Radiators
  const radGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4)
  const radMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 })
  const radL = new THREE.Mesh(radGeo, radMat)
  radL.position.set(0.61, 0, 0)
  group.add(radL)
  const radR = radL.clone()
  radR.position.set(-0.61, 0, 0)
  group.add(radR)

  // 2. Optical Reconnaissance Telescope Barrel (Nadir Facing)
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

  // 3. Articulated Dual Photovoltaic Solar Wings (GaAs Multi-Junction)
  const solarWings = new THREE.Group()
  const wingPanelGeo = new THREE.BoxGeometry(2.6, 0.05, 1.1)
  const wingPanelMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.25,
    metalness: 0.85
  })

  // Left Wing & Boom
  const wingL = new THREE.Mesh(wingPanelGeo, wingPanelMat)
  wingL.position.set(2.1, 0, 0)
  solarWings.add(wingL)

  const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12)
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
  const boomL = new THREE.Mesh(boomGeo, boomMat)
  boomL.rotation.z = Math.PI / 2
  boomL.position.set(0.9, 0, 0)
  solarWings.add(boomL)

  // Right Wing & Boom
  const wingR = new THREE.Mesh(wingPanelGeo, wingPanelMat)
  wingR.position.set(-2.1, 0, 0)
  solarWings.add(wingR)

  const boomR = boomL.clone()
  boomR.position.set(-0.9, 0, 0)
  solarWings.add(boomR)

  group.add(solarWings)

  // 4. Steerable High-Gain Parabolic Communications Dish
  const dishGroup = new THREE.Group()
  dishGroup.position.set(0, 0.85, -0.4)
  const dishGeo = new THREE.CylinderGeometry(0.55, 0.08, 0.22, 24)
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.92, roughness: 0.18 })
  const dish = new THREE.Mesh(dishGeo, dishMat)
  dish.rotation.x = -Math.PI / 3
  dishGroup.add(dish)

  // Gold Sub-Reflector Feed Horn
  const hornGeo = new THREE.ConeGeometry(0.08, 0.25, 12)
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95 })
  const horn = new THREE.Mesh(hornGeo, hornMat)
  horn.rotation.x = Math.PI * 0.65
  horn.position.set(0, 0.15, 0.15)
  dishGroup.add(horn)
  group.add(dishGroup)

  // 5. Laser Crosslink Optical Terminals (OISL Turrets)
  const oislGeo = new THREE.SphereGeometry(0.18, 16, 16)
  const oislMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
  const oisl = new THREE.Mesh(oislGeo, oislMat)
  oisl.position.set(0.62, 0.55, -0.6)
  const oislLens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0x00ffcc }))
  oislLens.position.set(0.1, 0, 0)
  oislLens.rotation.y = Math.PI / 2
  oisl.add(oislLens)
  group.add(oisl)

  // 6. Xenon Ion Thruster with Animated Cyan Plasma Glow Plume
  const thrusterGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.35, 16)
  const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
  const thruster = new THREE.Mesh(thrusterGeo, thrusterMat)
  thruster.rotation.x = Math.PI / 2
  thruster.position.set(0, 0, -0.98)
  group.add(thruster)

  const plumeGeo = new THREE.ConeGeometry(0.22, 1.2, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.65)
  group.add(plume)

  // 7. Corner RCS Thruster Quads
  const rcsGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12)
  const rcsMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })
  const cornerOffsets = [
    [0.62, 0.62, 0.85],
    [-0.62, 0.62, 0.85],
    [0.62, -0.62, 0.85],
    [-0.62, -0.62, 0.85],
    [0.62, 0.62, -0.85],
    [-0.62, 0.62, -0.85],
    [0.62, -0.62, -0.85],
    [-0.62, -0.62, -0.85]
  ]
  cornerOffsets.forEach(([cx, cy, cz]) => {
    const rcs = new THREE.Mesh(rcsGeo, rcsMat)
    rcs.position.set(cx, cy, cz)
    group.add(rcs)
  })

  return { group, plume, solarWings, dishGroup, scopeLens }
}

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
    if (p > 0.8) {
      starColors[i * 3 + 0] = 0.5; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0
    } else if (p > 0.6) {
      starColors[i * 3 + 0] = 1.0; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 0.5
    } else {
      starColors[i * 3 + 0] = 0.9; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0
    }
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3))

  const starMat = new THREE.PointsMaterial({
    size: 1.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  })

  return new THREE.Points(starGeo, starMat)
}
