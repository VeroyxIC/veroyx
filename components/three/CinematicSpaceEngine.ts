import * as THREE from "three"

// 1. PROCEDURAL ACCRETION DISK TEXTURE (Fiery Relativistic Plasma)
export function createProceduralAccretionTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as any)
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, 1024, 1024)
    const cx = 512, cy = 512

    // Relativistic Thermal Gradient: White-Hot Inner -> Gold -> Amber -> Deep Crimson
    for (let r = 500; r > 120; r -= 2) {
      const norm = (r - 120) / (500 - 120)
      if (norm < 0.12) ctx.fillStyle = "rgba(255, 255, 255, 0.98)"
      else if (norm < 0.35) ctx.fillStyle = "rgba(255, 215, 80, 0.90)"
      else if (norm < 0.65) ctx.fillStyle = "rgba(245, 120, 20, 0.75)"
      else if (norm < 0.88) ctx.fillStyle = "rgba(180, 40, 10, 0.50)"
      else ctx.fillStyle = "rgba(80, 10, 5, 0.20)"

      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // High-Density Relativistic Plasma Filaments & Flaring Spirals
    for (let i = 0; i < 1800; i++) {
      const ang = Math.random() * Math.PI * 2
      const rad = 130 + Math.pow(Math.random(), 1.4) * 360
      const sz = Math.random() * 3.5 + 1.0
      ctx.fillStyle = Math.random() > 0.4 ? "#ffffff" : Math.random() > 0.5 ? "#fde047" : "#ea580c"
      ctx.fillRect(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, sz, sz * 0.6)
    }
  }
  return new THREE.CanvasTexture(canvas)
}

// 2. KERR BLACK HOLE WITH EINSTEIN GRAVITATIONAL LENSING
export function createKerrBlackHole(radius = 3.2) {
  const group = new THREE.Group()

  // Central Event Horizon (Pitch Black Absorbing Sphere)
  const horizonGeo = new THREE.SphereGeometry(radius, 64, 64)
  const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const horizon = new THREE.Mesh(horizonGeo, horizonMat)
  group.add(horizon)

  // Photon Sphere / Inner Lensing Boundary
  const photonGeo = new THREE.RingGeometry(radius * 1.01, radius * 1.06, 96)
  const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  const photonRing = new THREE.Mesh(photonGeo, photonMat)
  group.add(photonRing)

  const diskTex = createProceduralAccretionTexture()

  // Primary Equatorial Accretion Disk
  const diskGeo = new THREE.RingGeometry(radius * 1.15, radius * 4.8, 96)
  const diskMat = new THREE.MeshBasicMaterial({ map: diskTex, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  const disk = new THREE.Mesh(diskGeo, diskMat)
  disk.rotation.x = Math.PI / 2.35
  group.add(disk)

  // Bent Vertical Gravitational Lensing Arc (Light curving over and under horizon)
  const lensGeo = new THREE.RingGeometry(radius * 1.08, radius * 3.2, 96)
  const lensMat = new THREE.MeshBasicMaterial({ map: diskTex, side: THREE.DoubleSide, transparent: true, opacity: 0.82 })
  const lensRing = new THREE.Mesh(lensGeo, lensMat)
  lensRing.rotation.y = Math.PI / 14
  group.add(lensRing)

  // Accreting Asteroid Belt (Roche Limit Debris)
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

  return { group, horizon, disk, lensRing, astGroup }
}

// 3. HALLEY'S COMET & HIGH-VELOCITY METEOR SHOWER
export function createHalleyCometSystem() {
  const group = new THREE.Group()

  // Comet Nucleus (Icy Dust Rock)
  const cometGeo = new THREE.DodecahedronGeometry(0.5, 2)
  const cometMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, emissive: 0x67e8f9, emissiveIntensity: 0.4 })
  const comet = new THREE.Mesh(cometGeo, cometMat)
  group.add(comet)

  // Electric-Blue Ion Tail (Straight, Narrow, Highly Luminous)
  const ionTailGeo = new THREE.ConeGeometry(0.35, 9.5, 16, 1, true)
  const ionTailMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const ionTail = new THREE.Mesh(ionTailGeo, ionTailMat)
  ionTail.rotation.z = Math.PI / 2
  ionTail.position.set(-4.8, 0, 0)
  group.add(ionTail)

  // Curved Golden Dust Tail
  const dustTailGeo = new THREE.ConeGeometry(0.75, 8.0, 16, 1, true)
  const dustTailMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
  const dustTail = new THREE.Mesh(dustTailGeo, dustTailMat)
  dustTail.rotation.z = Math.PI / 2.15
  dustTail.position.set(-4.2, 0.4, 0)
  group.add(dustTail)

  // Meteor Fireball Streaks (Exospheric Burners)
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

// 4. PHOTOREALISTIC MILITARY RECONNAISSANCE SATELLITE
export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  // Central Avionics Bus (Gold Multi-Layer Insulation Foil)
  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.16 })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  // Titanium Thermal Radiators
  const radGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4)
  const radMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 })
  const radL = new THREE.Mesh(radGeo, radMat)
  radL.position.set(0.61, 0, 0)
  group.add(radL)
  const radR = radL.clone()
  radR.position.set(-0.61, 0, 0)
  group.add(radR)

  // 3-Bell Rocket Engine Cluster
  const nozGeo = new THREE.ConeGeometry(0.18, 0.45, 16, 1, true)
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 })
  const nozPositions = [[0.28, 0.28, -1.02], [-0.28, 0.28, -1.02], [0, -0.32, -1.02]]
  nozPositions.forEach(([nx, ny, nz]) => {
    const noz = new THREE.Mesh(nozGeo, nozMat)
    noz.rotation.x = -Math.PI / 2
    noz.position.set(nx, ny, nz)
    group.add(noz)
  })

  // Reconnaissance Optical Telescope (Nadir Objective)
  const scopeGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.2, 24)
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 })
  const scope = new THREE.Mesh(scopeGeo, scopeMat)
  scope.rotation.x = Math.PI / 2
  scope.position.set(0, 0, 1.2)
  group.add(scope)

  // Glowing Primary Lens Aperture
  const lensGeo = new THREE.CircleGeometry(0.35, 24)
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
  const scopeLens = new THREE.Mesh(lensGeo, lensMat)
  scopeLens.position.set(0, 0, 1.81)
  group.add(scopeLens)

  // Articulated Dual GaAs Photovoltaic Wings
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

  // Steerable Parabolic High-Gain Dish
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

  // Active Ion Thruster Exhaust Plume
  const plumeGeo = new THREE.ConeGeometry(0.24, 1.4, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.65)
  group.add(plume)

  return { group, plume, solarWings, dishGroup, scopeLens }
}

// 5. DEEP SPACE STARFIELD
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

// 6. NASA BLUE MARBLE EARTH TEXTURES
export function createProceduralEarthMaps() {
  if (typeof document === "undefined") {
    const dummy = new THREE.CanvasTexture({} as any)
    return { dayMap: dummy, nightMap: dummy, specMap: dummy, cloudMap: dummy }
  }

  const w = 2048, h = 1024
  const dayCanvas = document.createElement("canvas")
  dayCanvas.width = w; dayCanvas.height = h
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

    dCtx.fillStyle = "#16381b"
    dCtx.beginPath(); dCtx.ellipse(w * 0.25, h * 0.28, w * 0.11, h * 0.12, -0.25, 0, Math.PI * 2); dCtx.fill()
    dCtx.beginPath(); dCtx.ellipse(w * 0.22, h * 0.38, w * 0.08, h * 0.09, -0.4, 0, Math.PI * 2); dCtx.fill()
    dCtx.fillStyle = "#123b1a"
    dCtx.beginPath(); dCtx.ellipse(w * 0.33, h * 0.68, w * 0.07, h * 0.19, 0.2, 0, Math.PI * 2); dCtx.fill()
    dCtx.fillStyle = "#1e4020"
    dCtx.beginPath(); dCtx.ellipse(w * 0.52, h * 0.28, w * 0.07, h * 0.08, 0.1, 0, Math.PI * 2); dCtx.fill()
    dCtx.beginPath(); dCtx.ellipse(w * 0.56, h * 0.62, w * 0.08, h * 0.18, -0.1, 0, Math.PI * 2); dCtx.fill()
    dCtx.fillStyle = "#a8742d"
    dCtx.beginPath(); dCtx.ellipse(w * 0.54, h * 0.44, w * 0.10, h * 0.07, 0.08, 0, Math.PI * 2); dCtx.fill()
    dCtx.fillStyle = "#18381c"
    dCtx.beginPath(); dCtx.ellipse(w * 0.70, h * 0.28, w * 0.18, h * 0.14, 0.05, 0, Math.PI * 2); dCtx.fill()
    dCtx.fillStyle = "#8a3c10"
    dCtx.beginPath(); dCtx.ellipse(w * 0.83, h * 0.72, w * 0.06, h * 0.08, 0.1, 0, Math.PI * 2); dCtx.fill()
    dCtx.fillStyle = "#f1f5f9"
    dCtx.fillRect(0, 0, w, h * 0.06); dCtx.fillRect(0, h * 0.94, w, h * 0.06)
  }

  const nightCanvas = document.createElement("canvas")
  nightCanvas.width = w; nightCanvas.height = h
  const nCtx = nightCanvas.getContext("2d")
  if (nCtx) {
    nCtx.fillStyle = "#000000"; nCtx.fillRect(0, 0, w, h)
    const clusters = [
      { cx: w * 0.29, cy: h * 0.33, count: 280, rMax: 90 },
      { cx: w * 0.19, cy: h * 0.35, count: 180, rMax: 70 },
      { cx: w * 0.52, cy: h * 0.30, count: 420, rMax: 95 },
      { cx: w * 0.80, cy: h * 0.36, count: 450, rMax: 110 }
    ]
    clusters.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        const rad = Math.pow(Math.random(), 1.7) * c.rMax
        const ang = Math.random() * Math.PI * 2
        nCtx.fillStyle = Math.random() > 0.6 ? "#fef08a" : "#f59e0b"
        nCtx.beginPath(); nCtx.arc(c.cx + Math.cos(ang) * rad, c.cy + Math.sin(ang) * rad, 1.2, 0, Math.PI * 2); nCtx.fill()
      }
    })
  }

  const cloudCanvas = document.createElement("canvas")
  cloudCanvas.width = w; cloudCanvas.height = h
  const cCtx = cloudCanvas.getContext("2d")
  if (cCtx) {
    cCtx.fillStyle = "rgba(0,0,0,0)"; cCtx.fillRect(0, 0, w, h)
    cCtx.fillStyle = "rgba(255, 255, 255, 0.42)"
    for (let i = 0; i < 48; i++) {
      const cx = (i * (w / 38)) % w
      const cy = h * 0.16 + Math.sin(i * 0.75) * (h * 0.34) + (i % 4) * 40
      cCtx.beginPath(); cCtx.ellipse(cx, cy, 95 + (i % 6) * 22, 28 + (i % 3) * 12, Math.sin(i) * 0.45, 0, Math.PI * 2); cCtx.fill()
    }
  }

  return {
    dayMap: new THREE.CanvasTexture(dayCanvas),
    nightMap: new THREE.CanvasTexture(nightCanvas),
    specMap: new THREE.CanvasTexture(dayCanvas),
    cloudMap: new THREE.CanvasTexture(cloudCanvas)
  }
}

export function createCinematicEarth(radius = 5.5) {
  const earthGroup = new THREE.Group()
  const { dayMap, nightMap, specMap, cloudMap } = createProceduralEarthMaps()

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
  const cloudMat = new THREE.MeshStandardMaterial({ map: cloudMap, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending })
  const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
  earthGroup.add(cloudsMesh)

  const atmoGeo = new THREE.SphereGeometry(radius * 1.055, 64, 64)
  const atmoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.BackSide })
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat)
  earthGroup.add(atmoMesh)

  return { earthGroup, earthMesh, cloudsMesh }
}
