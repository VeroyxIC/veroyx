import * as THREE from "three"

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

export function createProceduralAccretionTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as any)
  const canvas = document.createElement("canvas")
  canvas.width = 1024; canvas.height = 1024
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, 1024, 1024)
    const cx = 512, cy = 512
    for (let r = 500; r > 120; r -= 2) {
      const norm = (r - 120) / (500 - 120)
      if (norm < 0.15) ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
      else if (norm < 0.45) ctx.fillStyle = "rgba(255, 200, 70, 0.85)"
      else if (norm < 0.8) ctx.fillStyle = "rgba(240, 90, 15, 0.65)"
      else ctx.fillStyle = "rgba(140, 20, 5, 0.35)"

      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    }
    for (let i = 0; i < 1200; i++) {
      const ang = Math.random() * Math.PI * 2
      const rad = 130 + Math.random() * 360
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#ffb703"
      ctx.fillRect(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 2.5, 1.2)
    }
  }
  return new THREE.CanvasTexture(canvas)
}

export function createKerrBlackHole(radius = 3.0) {
  const group = new THREE.Group()

  const horizonGeo = new THREE.SphereGeometry(radius, 64, 64)
  const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const horizon = new THREE.Mesh(horizonGeo, horizonMat)
  group.add(horizon)

  const photonGeo = new THREE.RingGeometry(radius * 1.02, radius * 1.08, 96)
  const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  const photonRing = new THREE.Mesh(photonGeo, photonMat)
  group.add(photonRing)

  const diskTex = createProceduralAccretionTexture()

  const diskGeo = new THREE.RingGeometry(radius * 1.15, radius * 4.6, 96)
  const diskMat = new THREE.MeshBasicMaterial({ map: diskTex, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
  const disk = new THREE.Mesh(diskGeo, diskMat)
  disk.rotation.x = Math.PI / 2.3
  group.add(disk)

  const lensGeo = new THREE.RingGeometry(radius * 1.1, radius * 2.8, 96)
  const lensMat = new THREE.MeshBasicMaterial({ map: diskTex, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
  const lensRing = new THREE.Mesh(lensGeo, lensMat)
  lensRing.rotation.y = Math.PI / 12
  group.add(lensRing)

  const astGeo = new THREE.DodecahedronGeometry(0.35, 1)
  const astMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
  const astGroup = new THREE.Group()
  for (let i = 0; i < 14; i++) {
    const ast = new THREE.Mesh(astGeo, astMat)
    const theta = (i / 14) * Math.PI * 2
    const r = radius * (1.8 + Math.random() * 2.4)
    ast.position.set(r * Math.cos(theta), (Math.random() - 0.5) * 1.2, r * Math.sin(theta))
    astGroup.add(ast)
  }
  group.add(astGroup)

  return { group, horizon, disk, lensRing, astGroup }
}

export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.94, roughness: 0.18 })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  const nozGeo = new THREE.ConeGeometry(0.2, 0.5, 16, 1, true)
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95 })
  const nozOffsets = [[0.3, 0.3, -1.05], [-0.3, 0.3, -1.05], [0, -0.35, -1.05]]
  nozOffsets.forEach(([nx, ny, nz]) => {
    const noz = new THREE.Mesh(nozGeo, nozMat)
    noz.rotation.x = -Math.PI / 2
    noz.position.set(nx, ny, nz)
    group.add(noz)
  })

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

  const plumeGeo = new THREE.ConeGeometry(0.22, 1.2, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.65)
  group.add(plume)

  return { group, plume, solarWings, dishGroup, scopeLens }
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

    starColors[i * 3 + 0] = 0.8 + Math.random() * 0.2
    starColors[i * 3 + 1] = 0.85 + Math.random() * 0.15
    starColors[i * 3 + 2] = 1.0
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3))

  return new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.85 }))
}
