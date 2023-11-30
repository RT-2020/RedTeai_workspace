import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

const loading = document.querySelector('.loading')

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  15,
  window.innerWidth / window.innerHeight,
  1,
  10000
)
camera.position.set(40, 40, 40)

const renderer = new THREE.WebGLRenderer({
  antialias: true,
})

camera.aspect = window.innerWidth / window.innerHeight
camera.updateProjectionMatrix()

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
// controls.enableDamping = true;

const render = (callback, time) => {
  controls.update()
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
  callback && callback(time)
  requestAnimationFrame((time) => render(callback, time))
}

const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight)

  renderer.render(scene, camera)
  // 更新相机的纵横比
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

window.addEventListener('resize', resize)

const light = new THREE.AmbientLight(0x404040, 40) // 柔和的白光
scene.add(light)

// 创建一个FBXLoader实例
let fbxLoader = new FBXLoader()
let objLoader = new OBJLoader()
let mesh = undefined
const intersection = {
  intersects: false,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(),
}
const mouse = new THREE.Vector2()
const intersects = []
let moved = false
const size = new THREE.Vector3(0.1, 0.1, 0.1)

const decals = []
const textureLoader = new THREE.TextureLoader()
const decalDiffuse = textureLoader.load('./decal/decal-diffuse.png')
decalDiffuse.colorSpace = THREE.SRGBColorSpace
const decalNormal = textureLoader.load('./decal/decal-normal.jpg')

const orientation = new THREE.Euler()
const mouseHelper = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 10),
  new THREE.MeshNormalMaterial()
)
mouseHelper.visible = false
scene.add(mouseHelper)

const position = new THREE.Vector3()
const geometry = new THREE.BufferGeometry()
geometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3()])

const line = new THREE.Line(geometry, new THREE.LineBasicMaterial())
scene.add(line)

const params = {
  minScale: 1,
  maxScale: 2,
  rotate: true,
  clear: function () {
    removeDecals()
  },
}

let raycaster = new THREE.Raycaster()

// 加载FBX模型
fbxLoader.load('./model/1.fbx', function (fbx) {
  fbx.traverse((element) => {
    if (element.type == 'Mesh') {
      // 解决点阴影模糊的问题
      // element.material.shadowSide = THREE.BackSide;
      element.material.side = THREE.DoubleSide

      element.castShadow = true

      // element.receiveShadow = true;
      mesh = element
    }
  })
  scene.add(fbx)
})

const axesHelper = new THREE.AxesHelper(100)
// scene.add(axesHelper);

// 设置天空盒子
const textureCubeLoader = new THREE.CubeTextureLoader()
const textureCube = textureCubeLoader.load([
  './textures/1.jpg',
  './textures/2.jpg',
  './textures/3.jpg',
  './textures/4.jpg',
  './textures/5.jpg',
  './textures/6.jpg',
])

scene.background = textureCube
scene.environment = textureCube

function removeDecals() {
  decals.forEach(function (d) {
    scene.remove(d)
  })

  decals.length = 0
}
controls.addEventListener('change', function () {
  console.log('change')
  moved = true
})
window.addEventListener('pointerdown', function () {
  moved = false
})

window.addEventListener('pointerup', function (event) {
  if (moved === false) {
    console.log(1)
    checkIntersection(event.clientX, event.clientY)

    if (intersection.intersects) shoot()
  }
})
window.addEventListener('pointermove', onPointerMove)

const decalMaterial = new THREE.MeshPhongMaterial({
  specular: 0x444444,
  map: decalDiffuse,
  normalMap: decalNormal,
  normalScale: new THREE.Vector2(1, 1),
  shininess: 30,
  transparent: true,
  depthTest: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  wireframe: false,
})

function shoot() {
  position.copy(intersection.point)
  orientation.copy(mouseHelper.rotation)

  if (params.rotate) orientation.z = Math.random() * 2 * Math.PI

  // 随机大小
  const scale =
    params.minScale + Math.random() * (params.maxScale - params.minScale)
  size.set(scale, scale, scale)

  const material = decalMaterial.clone()
  material.color.setHex(Math.random() * 0x404040)

  // 创建贴花
  const m = new THREE.Mesh(
    new DecalGeometry(mesh, position, orientation, size),
    material
  )

  decals.push(m)
  scene.add(m)
}

function onPointerMove(event) {
  if (event.isPrimary) {
    checkIntersection(event.clientX, event.clientY)
  }
}

function checkIntersection(x, y) {
  if (mesh === undefined) return

  mouse.x = (x / window.innerWidth) * 2 - 1
  mouse.y = -(y / window.innerHeight) * 2 + 1

  // 检测物体
  raycaster.setFromCamera(mouse, camera)
  raycaster.intersectObject(mesh, false, intersects)

  if (intersects.length > 0) {
    const p = intersects[0].point
    mouseHelper.position.copy(p)
    intersection.point.copy(p)

    const n = intersects[0].face.normal.clone()
    n.transformDirection(mesh.matrixWorld)
    n.multiplyScalar(10)
    n.add(intersects[0].point)

    intersection.normal.copy(intersects[0].face.normal)
    mouseHelper.lookAt(n)

    // 设置线的长度
    const newLength = 5 // 设置新的长度
    const direction = new THREE.Vector3() // 创建一个向量用于表示线段的方向
    direction.subVectors(n, p).normalize() // 计算线段的方向
    direction.multiplyScalar(newLength) // 缩放方向以设置新的长度
    const newEndpoint = new THREE.Vector3().addVectors(p, direction) // 计算新的第二个端点坐标

    // 设置检测的线
    const positions = line.geometry.attributes.position
    positions.setXYZ(0, p.x, p.y, p.z)
    positions.setXYZ(1, n.x, n.y, n.z)
    positions.needsUpdate = true

    intersection.intersects = true

    intersects.length = 0
  } else {
    intersection.intersects = false
  }
}

render()
