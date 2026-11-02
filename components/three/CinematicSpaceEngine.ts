import * as THREE from "three"

// 1. GPU RELATIVISTIC ACCRETION DISK SHADER (Fractal Plasma + Doppler Beaming)
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
        float swirl = theta + (3.0 / (r + 0.1)) - uTime * 1.8;
        vec2 swirlCoord = vec2(r * 8.0, swirl * 2.5);
        float plasma = fbm(swirlCoord);

        // Relativistic Doppler Beaming: Approaching side is 3x brighter & shifted
        float doppler = 1.0 + 0.65 * sin(theta + 0.3);

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

// 2. KERR BLACK HOLE WITH EINSTEIN GRAVITATIONAL LENSING
export function createKerrBlackHole(radius = 3.2) {
  const group = new THREE.Group()

  const horizonGeo = new THREE.SphereGeometry(radius, 64, 64)
  const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const horizon = new THREE.Mesh(horizonGeo, horizonMat)
  group.add(horizon)

  const photonGeo = new THREE.RingGeometry(radius * 1.01, radius * 1.05, 96)
  const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.98 })
  const photonRing = new THREE.Mesh(photonGeo, photonMat)
  group.add(photonRing)

  const diskMat = createAccretionDiskMaterial()
  const diskGeo = new THREE.RingGeometry(radius * 1.15, radius * 4.8, 96)
  const disk = new THREE.Mesh(diskGeo, diskMat)
  disk.rotation.x = Math.PI / 2.35
  group.add(disk)

  const lensMat = createAccretionDiskMaterial()
  const lensGeo = new THREE.RingGeometry(radius * 1.08, radius * 3.2, 96)
  const lensRing = new THREE.Mesh(lensGeo, lensMat)
  lensRing.rotation.y = Math.PI / 14
  group.add(lensRing)

  return { group, horizon, disk, lensRing, diskMat, lensMat }
}

// 3. HALLEY'S COMET & METEOR SHOWER
export function createHalleyCometSystem() {
  const group = new THREE.Group()

  const cometGeo = new THREE.DodecahedronGeometry(0.45, 2)
  const cometMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, emissive: 0x67e8f9, emissiveIntensity: 0.5 })
  const comet = new THREE.Mesh(cometGeo, cometMat)
  group.add(comet)

  const ionTailGeo = new THREE.ConeGeometry(0.3, 10.0, 16, 1, true)
  const ionTailMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const ionTail = new THREE.Mesh(ionTailGeo, ionTailMat)
  ionTail.rotation.z = Math.PI / 2
  ionTail.position.set(-5.0, 0, 0)
  group.add(ionTail)

  const dustTailGeo = new THREE.ConeGeometry(0.7, 8.5, 16, 1, true)
  const dustTailMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
  const dustTail = new THREE.Mesh(dustTailGeo, dustTailMat)
  dustTail.rotation.z = Math.PI / 2.15
  dustTail.position.set(-4.4, 0.4, 0)
  group.add(dustTail)

  const meteorCount = 18
  const meteorGroup = new THREE.Group()
  const streakMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, linewidth: 2 })

  for (let i = 0; i < meteorCount; i++) {
    const p1 = new THREE.Vector3((Math.random() - 0.5) * 50, 10 + Math.random() * 15, (Math.random() - 0.5) * 40)
    const p2 = p1.clone().add(new THREE.Vector3(-4.5, -2.5, -1.5))
    const mGeo = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const mLine = new THREE.Line(mGeo, streakMat)
    meteorGroup.add(mLine)
  }

  return { group, comet, ionTail, dustTail, meteorGroup }
}

// 4. STAR WARS HYPERSPACE WARP TUNNEL ENGINE
export function createHyperspaceTunnel(count = 900) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 6)
  const velocities = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 2.5 + Math.random() * 22.0
    const z = -60 + Math.random() * 120

    positions[i * 6 + 0] = Math.cos(angle) * radius
    positions[i * 6 + 1] = Math.sin(angle) * radius
    positions[i * 6 + 2] = z

    positions[i * 6 + 3] = Math.cos(angle) * radius
    positions[i * 6 + 4] = Math.sin(angle) * radius
    positions[i * 6 + 5] = z - 2.0

    velocities[i] = 40.0 + Math.random() * 60.0
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

// 5. DETAILED RECONNAISSANCE SATELLITE
export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.16 })
  const busMesh = new THREE.Mesh(busGeo, busMat)
  group.add(busMesh)

  const radGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4)
  const radMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 })
  const radL = new THREE.Mesh(radGeo, radMat)
  radL.position.set(0.61, 0, 0)
  group.add(radL)
  const radR = radL.clone()
  radR.position.set(-0.61, 0, 0)
  group.add(radR)

  const nozGeo = new THREE.ConeGeometry(0.18, 0.45, 16, 1, true)
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 })
  const nozPositions = [[0.28, 0.28, -1.02], [-0.28, 0.28, -1.02], [0, -0.32, -1.02]]
  nozPositions.forEach(([nx, ny, nz]) => {
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

  const plumeGeo = new THREE.ConeGeometry(0.24, 1.4, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.65)
  group.add(plume)

  return { group, plume, solarWings, dishGroup, scopeLens }
}

// 6. DEEP SPACE STARFIELD
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

// 7. NASA BLUE MARBLE EARTH & CRATERED MOON
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
