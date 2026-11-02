import * as THREE from "three"

export function createProceduralEarthMaps() {
  if (typeof document === "undefined") {
    const dummy = new THREE.CanvasTexture({} as any)
    return { dayMap: dummy, nightMap: dummy, specMap: dummy, cloudMap: dummy }
  }

  const w = 2048
  const h = 1024

  // 1. DAY MAP
  const dayCanvas = document.createElement("canvas")
  dayCanvas.width = w
  dayCanvas.height = h
  const dCtx = dayCanvas.getContext("2d")
  if (dCtx) {
    const grad = dCtx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, "#031733")
    grad.addColorStop(0.5, "#083366")
    grad.addColorStop(1, "#031733")
    dCtx.fillStyle = grad
    dCtx.fillRect(0, 0, w, h)

    // Continents
    dCtx.fillStyle = "#1e3a1e"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.26, h * 0.32, w * 0.12, h * 0.18, -0.3, 0, Math.PI * 2)
    dCtx.fill()
    dCtx.beginPath()
    dCtx.ellipse(w * 0.33, h * 0.70, w * 0.08, h * 0.22, 0.2, 0, Math.PI * 2)
    dCtx.fill()
    dCtx.beginPath()
    dCtx.ellipse(w * 0.62, h * 0.34, w * 0.22, h * 0.20, 0.05, 0, Math.PI * 2)
    dCtx.fill()
    dCtx.beginPath()
    dCtx.ellipse(w * 0.58, h * 0.64, w * 0.09, h * 0.20, -0.1, 0, Math.PI * 2)
    dCtx.fill()

    // Arid Deserts
    dCtx.fillStyle = "#8a581e"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.57, h * 0.46, w * 0.10, h * 0.08, 0.1, 0, Math.PI * 2)
    dCtx.fill()
    dCtx.beginPath()
    dCtx.ellipse(w * 0.72, h * 0.38, w * 0.08, h * 0.06, 0.0, 0, Math.PI * 2)
    dCtx.fill()

    // Australia
    dCtx.fillStyle = "#944814"
    dCtx.beginPath()
    dCtx.ellipse(w * 0.82, h * 0.72, w * 0.06, h * 0.09, 0.1, 0, Math.PI * 2)
    dCtx.fill()

    // Polar Caps
    dCtx.fillStyle = "#e2e8f0"
    dCtx.fillRect(0, 0, w, h * 0.07)
    dCtx.fillRect(0, h * 0.93, w, h * 0.07)
  }

  // 2. NIGHT LIGHTS MAP
  const nightCanvas = document.createElement("canvas")
  nightCanvas.width = w
  nightCanvas.height = h
  const nCtx = nightCanvas.getContext("2d")
  if (nCtx) {
    nCtx.fillStyle = "#000000"
    nCtx.fillRect(0, 0, w, h)

    const clusters = [
      { cx: w * 0.28, cy: h * 0.34, count: 280, rMax: 120 },
      { cx: w * 0.20, cy: h * 0.36, count: 180, rMax: 80 },
      { cx: w * 0.53, cy: h * 0.32, count: 420, rMax: 100 },
      { cx: w * 0.78, cy: h * 0.38, count: 460, rMax: 130 },
      { cx: w * 0.68, cy: h * 0.48, count: 260, rMax: 90 },
      { cx: w * 0.59, cy: h * 0.46, count: 120, rMax: 40 },
      { cx: w * 0.35, cy: h * 0.74, count: 140, rMax: 70 },
      { cx: w * 0.84, cy: h * 0.75, count: 80, rMax: 50 }
    ]

    clusters.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        const rad = Math.pow(Math.random(), 1.8) * c.rMax
        const ang = Math.random() * Math.PI * 2
        const px = c.cx + Math.cos(ang) * rad
        const py = c.cy + Math.sin(ang) * rad

        const brightness = Math.random()
        nCtx.fillStyle = brightness > 0.85 ? "#fef08a" : brightness > 0.4 ? "#f59e0b" : "#b45309"
        nCtx.beginPath()
        nCtx.arc(px, py, Math.random() * 1.8 + 0.6, 0, Math.PI * 2)
        nCtx.fill()
      }
    })
  }

  // 3. SPECULAR MAP
  const specCanvas = document.createElement("canvas")
  specCanvas.width = w
  specCanvas.height = h
  const sCtx = specCanvas.getContext("2d")
  if (sCtx) {
    sCtx.fillStyle = "#ffffff"
    sCtx.fillRect(0, 0, w, h)

    sCtx.fillStyle = "#0a0a0a"
    sCtx.beginPath()
    sCtx.ellipse(w * 0.26, h * 0.32, w * 0.12, h * 0.18, -0.3, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.33, h * 0.70, w * 0.08, h * 0.22, 0.2, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.62, h * 0.34, w * 0.22, h * 0.20, 0.05, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.58, h * 0.64, w * 0.09, h * 0.20, -0.1, 0, Math.PI * 2)
    sCtx.ellipse(w * 0.82, h * 0.72, w * 0.06, h * 0.09, 0.1, 0, Math.PI * 2)
    sCtx.fill()
  }

  // 4. CLOUDS MAP
  const cloudCanvas = document.createElement("canvas")
  cloudCanvas.width = w
  cloudCanvas.height = h
  const cCtx = cloudCanvas.getContext("2d")
  if (cCtx) {
    cCtx.fillStyle = "rgba(0,0,0,0)"
    cCtx.fillRect(0, 0, w, h)

    cCtx.fillStyle = "rgba(255, 255, 255, 0.4)"
    for (let i = 0; i < 45; i++) {
      const cx = (i * (w / 35)) % w
      const cy = h * 0.18 + Math.sin(i * 0.8) * (h * 0.32) + (i % 4) * 45
      cCtx.beginPath()
      cCtx.ellipse(cx, cy, 90 + (i % 6) * 25, 30 + (i % 3) * 12, Math.sin(i) * 0.5, 0, Math.PI * 2)
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

  const earthGeo = new THREE.SphereGeometry(radius, 64, 64)
  const earthMat = new THREE.MeshStandardMaterial({
    map: dayMap,
    roughnessMap: specMap,
    roughness: 0.5,
    metalness: 0.1,
    emissiveMap: nightMap,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.95
  })
  const earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthGroup.add(earthMesh)

  const cloudGeo = new THREE.SphereGeometry(radius * 1.018, 64, 64)
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudMap,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  })
  const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
  earthGroup.add(cloudsMesh)

  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.08
  })
  const gridMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.004, 36, 18), gridMat)
  earthGroup.add(gridMesh)

  const atmoGeo = new THREE.SphereGeometry(radius * 1.055, 64, 64)
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat)
  earthGroup.add(atmoMesh)

  const haloGeo = new THREE.SphereGeometry(radius * 1.11, 48, 48)
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.14,
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

  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.94,
    roughness: 0.18
  })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  const radGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4)
  const radMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.1 })
  const radL = new THREE.Mesh(radGeo, radMat)
  radL.position.set(0.61, 0, 0)
  group.add(radL)
  const radR = radL.clone()
  radR.position.set(-0.61, 0, 0)
  group.add(radR)

  const scopeGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.2, 24)
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 })
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
  const wingPanelGeo = new THREE.BoxGeometry(2.6, 0.05, 1.1)
  const wingPanelMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.25,
    metalness: 0.85
  })

  const wingL = new THREE.Mesh(wingPanelGeo, wingPanelMat)
  wingL.position.set(2.1, 0, 0)
  solarWings.add(wingL)

  const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12)
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
  const boomL = new THREE.Mesh(boomGeo, boomMat)
  boomL.rotation.z = Math.PI / 2
  boomL.position.set(0.9, 0, 0)
  solarWings.add(boomL)

  const wingR = new THREE.Mesh(wingPanelGeo, wingPanelMat)
  wingR.position.set(-2.1, 0, 0)
  solarWings.add(wingR)

  const boomR = boomL.clone()
  boomR.position.set(-0.9, 0, 0)
  solarWings.add(boomR)

  group.add(solarWings)

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

  const oislGeo = new THREE.SphereGeometry(0.18, 16, 16)
  const oislMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
  const oisl = new THREE.Mesh(oislGeo, oislMat)
  oisl.position.set(0.62, 0.55, -0.6)
  const oislLens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0x00ffcc }))
  oislLens.position.set(0.1, 0, 0)
  oislLens.rotation.y = Math.PI / 2
  oisl.add(oislLens)
  group.add(oisl)

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
