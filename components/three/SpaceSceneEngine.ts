import * as THREE from "three"

export interface SatelliteAssembly {
  group: THREE.Group
  plume: THREE.Mesh
  solarWings: THREE.Group
  dishGroup: THREE.Group
  scopeLens: THREE.Mesh
}

export function createMilitarySatellite(options?: { scale?: number }): SatelliteAssembly {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  // 1. Central Avionics Bus (Gold Multi-Layer Insulation Foil)
  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.92,
    roughness: 0.22
  })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  // Lateral Titanium Heat Radiators
  const radGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4)
  const radMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })
  const radL = new THREE.Mesh(radGeo, radMat)
  radL.position.set(0.61, 0, 0)
  group.add(radL)
  const radR = radL.clone()
  radR.position.set(-0.61, 0, 0)
  group.add(radR)

  // 2. Optical Reconnaissance Telescope Aperture
  const scopeGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.2, 24)
  const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 })
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

  // 3. Articulated Dual Photovoltaic Solar Wings (GaAs Multi-Junction)
  const solarWings = new THREE.Group()
  const wingPanelGeo = new THREE.BoxGeometry(2.6, 0.05, 1.1)
  const wingPanelMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.25,
    metalness: 0.85
  })

  // Left Wing
  const wingL = new THREE.Mesh(wingPanelGeo, wingPanelMat)
  wingL.position.set(2.1, 0, 0)
  solarWings.add(wingL)

  const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12)
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
  const boomL = new THREE.Mesh(boomGeo, boomMat)
  boomL.rotation.z = Math.PI / 2
  boomL.position.set(0.9, 0, 0)
  solarWings.add(boomL)

  // Right Wing
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

export function createCinematicEarth(radius = 5.5) {
  const earthGroup = new THREE.Group()

  // 1. Earth Base Spherical Surface
  const earthGeo = new THREE.SphereGeometry(radius, 64, 64)
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.8,
    metalness: 0.15
  })
  const earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthGroup.add(earthMesh)

  // 2. High-Tech Tactical Wireframe Latitude/Longitude Grid
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.12
  })
  const gridMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.004, 36, 18), gridMat)
  earthGroup.add(gridMesh)

  // 3. Dynamic Atmospheric Rayleigh Scattering Rim Glow Shell (Limb Glow)
  const atmoGeo = new THREE.SphereGeometry(radius * 1.035, 64, 64)
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat)
  earthGroup.add(atmoMesh)

  // 4. Secondary Soft Mesospheric Outer Halo
  const haloGeo = new THREE.SphereGeometry(radius * 1.075, 48, 48)
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
  const haloMesh = new THREE.Mesh(haloGeo, haloMat)
  earthGroup.add(haloMesh)

  return { earthGroup, earthMesh, atmoMesh }
}

export function createDeepSpaceStarfield(count = 1200, fieldRadius = 600): THREE.Points {
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
