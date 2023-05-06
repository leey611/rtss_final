let socket = io();
console.log(socket);

import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FlyControls } from "three/addons/controls/FlyControls.js";
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Water } from "three/addons/objects/Water.js";

let camera, controls, scene, renderer;
let mouseX = 0,
  mouseY = 0;
let start_time = Date.now();
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let water;
const clock = new THREE.Clock();
const gui = new GUI();
let shouldAutoForward = false

init();
//render(); // remove when using next line for animation loop (requestAnimationFrame)
animate();

function addWireframe() {
  const geometry = new THREE.SphereGeometry(500, 100, 100);

  const wireframe = new THREE.WireframeGeometry(geometry);

  const line = new THREE.LineSegments(wireframe);
  line.material.depthTest = false;
  line.material.opacity = 0.5;
  line.material.transparent = false;

  scene.add(line);

  const wireframeFolder = gui.addFolder("wireframe");
  wireframeFolder.add(line.material, "depthTest", "switch").name("depthTest");
  wireframeFolder
    .add(line.material, "transparent", "switch")
    .name("transparent");
  wireframeFolder.open();
}

function loadTexture(url) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, resolve);
  });
}

function addTerrain() {
  Promise.all([
    loadTexture("/assets/coral/coral.png"),
    loadTexture("/assets/coral/coral_bump.png"),
  ])
    .then((textures) => {
      const planeSize = 1500;
      let terraingeo = new THREE.PlaneGeometry(planeSize, planeSize, 100, 100);
      let terrainmat = new THREE.MeshStandardMaterial({
        color: "gray",
        side: THREE.DoubleSide,
        map: textures[0],
        displacementMap: textures[1],
        displacementScale: 30,
        // displacementBias: 0.01,
        // bumpMap: coralBump, // if there is a normal map this will be ignored
        // bumpScale: 3,
        // normalMap: coralNormal,
        // normalScale: new THREE.Vector2(0.1, 0.1),
      });
      const terrain = new THREE.Mesh(terraingeo, terrainmat);
      scene.add(terrain);
      terrain.position.set(0, 0, 0);
      terrain.rotateX(-Math.PI / 2);

      //   const terrainmatUniforms = terrainmat.uniforms;
      //   console.log(terrainmatUniforms);
      const terrainFolder = gui.addFolder("terrain");
      terrainFolder
        .add(terrainmat, "displacementScale", 0, 100, 30)
        .name("displacementScale");
      terrainFolder.open();
    })
    .catch((error) => {
      console.log(error);
    });
}

function addWater() {
  const waterSize = 1500;
  let waterGeo = new THREE.PlaneGeometry(waterSize, waterSize);
  let waterMat = loadTexture("/assets/waternormals.jpg");
  waterMat.wrapS = waterMat.wrapT = THREE.RepeatWrapping;

  water = new Water(waterGeo, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: waterMat,
    sunDirection: new THREE.Vector3(),
    waterColor: 0x001e0f,
    distortionScale: 3.7,
  });
  water.rotation.x = Math.PI / 2;
  water.position.set(0, 200, 0);
  scene.add(water);

  const waterUniforms = water.material.uniforms;
  const folderWater = gui.addFolder("Water");
  folderWater
    .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
    .name("distortionScale");
  folderWater.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");
  folderWater.add(water.position, "y", 1, 1000).name("y position");
  folderWater.open();
}

function init() {
  scene = new THREE.Scene();
  //   scene.background = new THREE.Color(0xcccccc);
  //   scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 20, 400);

  // controls

  controls = new FirstPersonControls(camera, renderer.domElement);
     //controls = new OrbitControls(camera, renderer.domElement);

  //controls.listenToKeyEvents(window); // optional

  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

  //controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  //controls.dampingFactor = 0.05;

  //controls.screenSpacePanning = false;

  //controls.minDistance = 100;
  //controls.maxDistance = 500;

  //controls.maxPolarAngle = Math.PI / 2;
  //controls.constrainVertical = [0,0]
  //controls.lookAt(0,0,0)
  // controls.autoForward = true;
  controls.movementSpeed = 10;
  controls.constrainVertical = true;
  controls.verticalMax = Math.PI / 2;
  controls.verticalMin = Math.PI / 4;

  controls.lookSpeed = 0.01;

  // world

  addWireframe();
  addTerrain();
  addWater();

  //   const geometry = new THREE.CylinderGeometry(0, 10, 30, 4, 1);
  //   const material = new THREE.MeshPhongMaterial({
  //     color: 0xffffff,
  //     flatShading: true,
  //   });

  //   for (let i = 0; i < 500; i++) {
  //     const mesh = new THREE.Mesh(geometry, material);
  //     mesh.position.x = Math.random() * 1600 - 800;
  //     mesh.position.y = 0;
  //     mesh.position.z = Math.random() * 1600 - 800;
  //     mesh.updateMatrix();
  //     mesh.matrixAutoUpdate = false;
  //     scene.add(mesh);
  //   }

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 2);
  dirLight1.position.set(0, 800, 0);
  scene.add(dirLight1);

  //   const dirLight2 = new THREE.DirectionalLight(0x002288);
  //   dirLight2.position.set(-50, -800, -50);
  //   scene.add(dirLight2);

  const dirLightFolder = gui.addFolder("directional light");
  dirLightFolder.add(dirLight1, "intensity", 0, 10).name("intensity");
  dirLightFolder.add(dirLight1.position, "x", -500, 500).name("x position");
  dirLightFolder.add(dirLight1.position, "y", -500, 500).name("y position");
  dirLightFolder.add(dirLight1.position, "z", -500, 500).name("z position");
  dirLightFolder.open();

  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  // window resize

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove, false);
  document.addEventListener('click', () => {
    shouldAutoForward = !shouldAutoForward
  })
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) * 0.25;
  mouseY = (event.clientY - windowHalfY) * 0.15;
}

function animate() {
  requestAnimationFrame(animate);
  //console.log('control',controls.object.position.distanceTo(new THREE.Vector3(0,20,400)))
  //console.log('camera', camera.position)
  controls.autoForward = shouldAutoForward

 
  
  //controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
  let position = ((Date.now() - start_time) * 0.03) % 8000;

  //camera.position.x += (  mouseX - camera.position.x ) * 0.01;
  //camera.position.y += ( - mouseY - camera.position.y ) * 0.01;
  //camera.position.z -= 1//= - position + 8000;
  render();
}

function render() {
  const delta = clock.getDelta();
  controls.update(delta);
  renderer.render(scene, camera);
}
