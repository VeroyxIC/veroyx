import * as THREE from "three"

// 1. PROCEDURAL ACCRETION DISK SHADER (Relativistic Fiery Plasma + Doppler Beaming)
export function createAccretionDiskMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorInner: { value: new THREE.Color(0xffffff) },
      uColorMid: { value: new THREE.Color(0xfbbf24) },
      uColorOuter: { value: new THREE.Color(0xd97706) }
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
          p *= 2.15;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uvCenter = vUv - vec2(0.5);
        float r = length(uvCenter) * 2.0;
        if (r < 0.20 || r > 0.98) discard;

        float theta = atan(uvCenter.y, uvCenter.x);
        
        // Relativistic Spiral Rotation & Filament Striations
        float swirl = theta + (4.0 / (r + 0.08)) - uTime * 1.4;
        vec2 swirlCoord = vec2(r * 12.0, swirl * 3.0);
        float plasma = fbm(swirlCoord);

        // Dark dust absorption filaments
        float dust = smoothstep(0.35, 0.65, fbm(swirlCoord * 1.8 + vec2(2.1, 4.3)));

        // Relativistic Doppler Beaming Asymmetry (Approaching left side is amplified)
        float doppler = 1.0 + 0.70 * sin(theta + 0.4);

        vec3 color;
        if (r < 0.32) {
          color = mix(uColorInner, uColorMid, (r - 0.20) / 0.12);
        } else if (r < 0.68) {
          color = mix(uColorMid, uColorOuter, (r - 0.32) / 0.36);
        } else {
          color = mix(uColorOuter, vec3(0.35, 0.08, 0.02), (r - 0.68) / 0.30);
        }

        color *= (plasma * 1.6 + 0.4) * dust * doppler;
        float alpha = smoothstep(0.20, 0.28, r) * smoothstep(0.98, 0.82, r) * 0.96;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
}

// 2. KERR BLACK HOLE MATCHING REFERENCE IMAGE
export function createPhotorealisticKerrBlackHole(radius = 2.4) {
  const group = new THREE.Group()

  // Pitch-Black Event Horizon
  const horizonGeo = new THREE.SphereGeometry(radius, 64, 64)
  const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const horizon = new THREE.Mesh(horizonGeo, horizonMat)
  group.add(horizon)

  // Razor-Thin White-Hot Inner Photon Ring
  const photonGeo = new THREE.RingGeometry(radius * 1.008, radius * 1.035, 128)
  const photonMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending
  })
  const photonRing = new THREE.Mesh(photonGeo, photonMat)
  group.add(photonRing)

  // Glowing Plasma V Glyph inside the Singularity Core
  const vShape = new THREE.Shape()
  vShape.moveTo(-0.95, 1.1)
  vShape.lineTo(0.0, -1.25)
  vShape.lineTo(0.95, 1.1)
  vShape.lineTo(0.52, 1.1)
  vShape.lineTo(0.0, -0.42)
  vShape.lineTo(-0.52, 1.1)
  vShape.closePath()

  const vGeo = new THREE.ShapeGeometry(vShape)
  const vMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  })
  const vCoreMesh = new THREE.Mesh(vGeo, vMat)
  vCoreMesh.position.set(0, 0, 0.05)
  group.add(vCoreMesh)

  // Secondary Golden Energy Aura on V Core
  const vGlowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending
  })
  const vGlowMesh = new THREE.Mesh(vGeo, vGlowMat)
  vGlowMesh.scale.set(1.15, 1.15, 1.0)
  vGlowMesh.position.set(0, 0, 0.02)
  group.add(vGlowMesh)

  // Primary Diagonal Relativistic Accretion Blade
  const diskMat = createAccretionDiskMaterial()
  const diskGeo = new THREE.RingGeometry(radius * 1.15, radius * 5.2, 128)
  const disk = new THREE.Mesh(diskGeo, diskMat)
  // Tilted at acute diagonal angle matching reference image
  disk.rotation.x = Math.PI / 2.3
  disk.rotation.z = -Math.PI / 7.5
  group.add(disk)

  // Concentric Einstein Gravitational Lensing Light Rings
  const lensingGroup = new THREE.Group()
  const ringRadii = [
    { rIn: radius * 1.25, rOut: radius * 1.30, opacity: 0.65, color: 0xffffff },
    { rIn: radius * 1.75, rOut: radius * 1.82, opacity: 0.45, color: 0x93c5fd },
    { rIn: radius * 2.45, rOut: radius * 2.53, opacity: 0.32, color: 0x60a5fa },
    { rIn: radius * 3.35, rOut: radius * 3.45, opacity: 0.22, color: 0x38bdf8 }
  ]

  ringRadii.forEach(spec => {
    const rGeo = new THREE.RingGeometry(spec.rIn, spec.rOut, 96)
    const rMat = new THREE.MeshBasicMaterial({
      color: spec.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: spec.opacity,
      blending: THREE.AdditiveBlending
    })
    const rMesh = new THREE.Mesh(rGeo, rMat)
    lensingGroup.add(rMesh)
  })
  group.add(lensingGroup)

  return { group, horizon, disk, diskMat, vCoreMesh, vGlowMesh, lensingGroup }
}

// 3. DEEP-SPACE AZURE & INDIGO NEBULA SKYBOX
export function createDeepSpaceNebulaSkybox(): THREE.Group {
  const group = new THREE.Group()

  // Starfield
  const count = 2800
  const starGeo = new THREE.BufferGeometry()
  const starPositions = new Float32Array(count * 3)
  const starColors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(Math.random() * 2 - 1)
    const theta = Math.random() * Math.PI * 2
    const r = 400 + Math.random() * 300

    starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPositions[i * 3 + 2] = r * Math.cos(phi)

    const p = Math.random()
    if (p > 0.8) {
      starColors[i * 3 + 0] = 0.55; starColors[i * 3 + 1] = 0.80; starColors[i * 3 + 2] = 1.0;
    } else if (p > 0.6) {
      starColors[i * 3 + 0] = 1.0; starColors[i * 3 + 1] = 0.88; starColors[i * 3 + 2] = 0.65;
    } else {
      starColors[i * 3 + 0] = 0.95; starColors[i * 3 + 1] = 0.98; starColors[i * 3 + 2] = 1.0;
    }
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3))
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 1.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9
  }))
  group.add(stars)

  // Cosmic Cyan/Indigo Nebula Gas Clouds
  const cloudCount = 14
  for (let i = 0; i < cloudCount; i++) {
    const planeGeo = new THREE.PlaneGeometry(160 + i * 20, 90 + i * 15)
    const planeMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0x0284c7 : 0x1e1b4b,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    const cloud = new THREE.Mesh(planeGeo, planeMat)
    cloud.position.set((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, -180 - i * 10)
    cloud.rotation.z = Math.random() * Math.PI
    group.add(cloud)
  }

  return group
}

// 4. PHOTOREALISTIC MILITARY RECONNAISSANCE SATELLITE
export function createMilitarySatellite(options?: { scale?: number }) {
  const scale = options?.scale ?? 1.0
  const group = new THREE.Group()
  group.scale.set(scale, scale, scale)

  // Gold MLI Foil Avionics Bus
  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.8)
  const busMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.95,
    roughness: 0.18
  })
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

  // Rocket Engine Bells
  const nozGeo = new THREE.ConeGeometry(0.18, 0.45, 16, 1, true)
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 })
  const nozPositions = [[0.28, 0.28, -1.02], [-0.28, 0.28, -1.02], [0, -0.32, -1.02]]
  nozPositions.forEach(([nx, ny, nz]) => {
    const noz = new THREE.Mesh(nozGeo, nozMat)
    noz.rotation.x = -Math.PI / 2
    noz.position.set(nx, ny, nz)
    group.add(noz)
  })

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

  // Dual GaAs Photovoltaic Wings
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

  // Parabolic Communications Dish
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
  const plumeGeo = new THREE.ConeGeometry(0.22, 1.4, 16, 1, true)
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  const plume = new THREE.Mesh(plumeGeo, plumeMat)
  plume.rotation.x = -Math.PI / 2
  plume.position.set(0, 0, -1.65)
  group.add(plume)

  return { group, plume, solarWings, dishGroup, scopeLens }
}

// 5. NASA BLUE MARBLE EARTH & MOON
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
