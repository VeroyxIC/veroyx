import * as THREE from 'three'

export function createHighFidelitySatellite(scale = 1.0) {
  const group = new THREE.Group()
  
  // A. Procedural Kapton Gold Foil (MLI)
  const noiseCanvas = document.createElement('canvas')
  noiseCanvas.width = 256
  noiseCanvas.height = 256
  const ctxN = noiseCanvas.getContext('2d')
  if (ctxN) {
    for (let i = 0; i < 256; i+=2) {
      for (let j = 0; j < 256; j+=2) {
        const v = Math.floor(Math.random() * 255)
        ctxN.fillStyle = `rgb(${v},${v},${v})`
        ctxN.fillRect(i, j, 2, 2)
      }
    }
  }
  const bumpTex = new THREE.CanvasTexture(noiseCanvas)
  bumpTex.wrapS = THREE.RepeatWrapping
  bumpTex.wrapT = THREE.RepeatWrapping

  const foilMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Gold
    metalness: 0.6,
    roughness: 0.5,
    bumpMap: bumpTex,
    bumpScale: 0.05
  })

  // B. Procedural Solar Cell Grid
  const solarCanvas = document.createElement('canvas')
  solarCanvas.width = 512
  solarCanvas.height = 512
  const ctxS = solarCanvas.getContext('2d')
  if (ctxS) {
    ctxS.fillStyle = '#020617' 
    ctxS.fillRect(0, 0, 512, 512)
    ctxS.strokeStyle = '#0ea5e9'
    ctxS.lineWidth = 3
    for(let i=0; i<=512; i+=32) { 
      ctxS.beginPath(); ctxS.moveTo(i,0); ctxS.lineTo(i,512); ctxS.stroke()
      ctxS.beginPath(); ctxS.moveTo(0,i); ctxS.lineTo(512,i); ctxS.stroke()
    }
  }
  const solarTex = new THREE.CanvasTexture(solarCanvas)
  solarTex.wrapS = THREE.RepeatWrapping
  solarTex.wrapT = THREE.RepeatWrapping
  solarTex.repeat.set(3, 1)

  const panelMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    metalness: 0.8,
    roughness: 0.2,
    color: 0x38bdf8
  })

  // 1. Hexagonal Bus Chassis
  const busGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.0, 6)
  const bus = new THREE.Mesh(busGeo, foilMat)
  bus.rotation.x = Math.PI / 2
  group.add(bus)

  // 2. Solar Arrays
  const panelGeo = new THREE.BoxGeometry(2.0, 0.02, 0.6)
  const leftPanel = new THREE.Mesh(panelGeo, panelMat)
  leftPanel.position.set(1.3, 0, 0)
  group.add(leftPanel)
  
  const rightPanel = new THREE.Mesh(panelGeo, panelMat)
  rightPanel.position.set(-1.3, 0, 0)
  group.add(rightPanel)

  // 3. Nadir Communications Dish
  const dishGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })
  const dish = new THREE.Mesh(dishGeo, dishMat)
  dish.position.set(0, 0, 0.5)
  group.add(dish)
  
  // 4. Zenith Thruster Bell
  const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.18, 0.25, 16)
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.5 })
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat)
  nozzle.position.set(0, 0, -0.6)
  nozzle.rotation.x = Math.PI / 2
  group.add(nozzle)

  group.scale.setScalar(scale)
  return group
}
