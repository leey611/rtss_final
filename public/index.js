let socket



import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FlyControls } from "three/addons/controls/FlyControls.js";
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Water } from "three/addons/objects/Water.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { User } from "./user.js"
import { SeaCreature } from "/seacreature.js";

let camera, controls, scene, renderer;
let mouseX = 0,
  mouseY = 0;
let start_time = Date.now();
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let water;
const clock = new THREE.Clock();
const gui = new GUI();
let shouldAutoForward = false;
let jellyfish, squid, starfish;

let context
let contextResume = false
window.onload = function() {
  context = new AudioContext()
}
const listener = new THREE.AudioListener()
const audioLoader = new THREE.AudioLoader()
const bgm = new THREE.Audio(listener)

let user

init();
//render(); // remove when using next line for animation loop (requestAnimationFrame)
animate();

function makeSocketUser() {
  socket = io();
  io.connect()
  socket.on('connect', () => {
    user = new User(camera.position.x, camera.position.y, camera.position.z-20, scene, socket.id)
  })
}

function loadBGM() {
  audioLoader.load('/assets/sounds/the_heavy_truth.mp3', buffer => {
    bgm.setBuffer(buffer)
    bgm.setLoop(true)
    bgm.setVolume(0.5)
  })
}

function addWireframe() {
  const geometry = new THREE.SphereGeometry(1000, 100, 100);
  const material = new THREE.MeshBasicMaterial({
    // color: 0xd3d3d3,
    side: THREE.BackSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const wireframe = new THREE.WireframeGeometry(geometry);

  const line = new THREE.LineSegments(wireframe);
  line.material.depthTest = false;
  line.material.opacity = 0.5;
  line.material.transparent = false;
  // line.material.color = 0x000000;

  scene.add(line);

  var params = {
    fillColor: 0xd3d3d3,
    lineColor: 0x000000,
  };

  const wireframeFolder = gui.addFolder("wireframe");
  wireframeFolder.add(line.material, "depthTest", "switch").name("depthTest");
  wireframeFolder
    .add(line.material, "transparent", "switch")
    .name("transparent");
  wireframeFolder
    .addColor(params, "fillColor")
    .name("fill color")
    .onChange(() => {
      material.color.set(params.fillColor);
    });
  wireframeFolder
    .addColor(params, "lineColor")
    .name("line color")
    .onChange(() => {
      line.material.color.set(params.lineColor);
    });

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
        displacementScale: 100,
        // displacementBias: 0.01,
        // bumpMap: coralBump, // if there is a normal map this will be ignored
        // bumpScale: 3,
        // normalMap: coralNormal,
        // normalScale: new THREE.Vector2(0.1, 0.1),
      });
      const terrain = new THREE.Mesh(terraingeo, terrainmat);
      scene.add(terrain);
      terrain.position.set(0, -50, 0);
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
  const waterSize = 500;
  const waterGeo = new THREE.PlaneGeometry(waterSize, waterSize);
  const waterMat = loadTexture("/assets/waternormals.jpg");
  waterMat.wrapS = waterMat.wrapT = THREE.RepeatWrapping;

  const dummy = new THREE.Mesh(
    waterGeo,
    new THREE.MeshBasicMaterial({ color: 0x00ffe4, side: THREE.FrontSide })
  );
  scene.add(dummy);
  dummy.position.set(0, 400, 0);
  dummy.rotation.x = -Math.PI / 2;

  water = new Water(waterGeo, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: waterMat,
    sunDirection: new THREE.Vector3(),
    waterColor: 0x001e0f,
    distortionScale: 3.7,
  });
  water.rotation.x = Math.PI / 2;
  water.position.set(0, 500, 0);
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

function loadModel(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}

async function init() {
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
  camera.add(listener)
  // controls
  controls = new FirstPersonControls(camera, renderer.domElement);
     //controls = new OrbitControls(camera, renderer.domElement);

  // controls = new FirstPersonControls(camera, renderer.domElement);

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

  loadBGM()

  loadModel("/assets/models/jellyfish.glb")
    .then((object) => {
      const amount = 600;

      const mesh1 = object.getObjectByName("Object_6");
      const geo1 = mesh1.geometry.clone();
      const mat1 = mesh1.material;
      const jelly1 = new THREE.InstancedMesh(geo1, mat1, amount);
      scene.add(jelly1);

      const dummy = new THREE.Object3D();
      for (let i = 0; i < amount; i++) {
        dummy.position.x = Math.random() * 1000;
        dummy.position.y = Math.random() * 1000;
        dummy.position.z = Math.random() * 1000;

        dummy.rotation.x = Math.random() * 2 * Math.PI;
        dummy.rotation.y = Math.random() * 2 * Math.PI;
        dummy.rotation.z = Math.random() * 2 * Math.PI;

        dummy.scale.x = dummy.scale.y = dummy.scale.z = Math.random() * 2;

        dummy.updateMatrix();
        jelly1.setMatrixAt(i, dummy.matrix);
      }

      // const mesh = object.getObjectByName("Sketchfab_Scene");
      // object.traverse((child) => {
      //   if (child.isMesh) {
      //     console.log(child);
      //     // console.log(child.geometry);
      //     // console.log(child.material);
      //   }
    })
    .catch((error) => {
      console.log(error);
    });

  // addWater();

  // sea creatures

  jellyfish = new SeaCreature(
    scene,
    "/assets/models/jellyfish.glb",
    "Object_6",
    100
  );
  // jellyfish.init(-500, 500, -500, 500, -500, 500, 2, 2, 2, 1, 20);
  // jellyfish.init(500, Math.PI * 2, 2, 2, 2, 1, 20);
  jellyfish.init(750, 2, 2, 2, 1, 20);

  squid = new SeaCreature(scene, "/assets/models/squid.glb", "Object_4", 100);
  // squid.init(-500, 500, -500, 500, -500, 500, 2, 2, 2, 1, 10);
  squid.init(750, 2, 2, 2, 1, 10);

  starfish = new SeaCreature(
    scene,
    "/assets/models/starfish.glb",
    "Object_2",
    25
  );
  // starfish.init(-500, 500, 0, 10, -500, 500, -0.5, 0, 2, 0.5, 1);
  starfish.init(750, -0.5, 0, 2, 0.5, 1);




  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 2);
  dirLight1.position.set(0, 470, 0);
  scene.add(dirLight1);

  //   const dirLight2 = new THREE.DirectionalLight(0x002288);
  //   dirLight2.position.set(-50, -800, -50);
  //   scene.add(dirLight2);

  const dirLightFolder = gui.addFolder("directional light");
  dirLightFolder.add(dirLight1, "intensity", 0, 10).name("intensity");
  dirLightFolder.add(dirLight1.position, "x", 0, 1500).name("x position");
  dirLightFolder.add(dirLight1.position, "y", 0, 1500).name("y position");
  dirLightFolder.add(dirLight1.position, "z", 0, 1500).name("z position");
  dirLightFolder.open();

  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  // window resize

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove, false);

  document.addEventListener('click', () => {
    shouldAutoForward = !shouldAutoForward
    if (!contextResume) {
      //context.resume().then(() => bgm.play())
      contextResume = true
    }
  })

  document.getElementById('close_modal').addEventListener('click', () => {
    document.getElementById('instruction_modal').style.display = 'none'
  })

  await makeSocketUser()

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
  controls.autoForward = shouldAutoForward;

  //console.log('camera position',camera.position)
  //console.log('control', controls.object.position)
  //controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
  let position = ((Date.now() - start_time) * 0.03) % 8000;
  //cube.position.set(camera.position.x,camera.position.y, camera.position.z - 20)


  jellyfish.update(0.1, 0, 0, 0, 0, 0);

  //camera.position.x += (  mouseX - camera.position.x ) * 0.01;
  //camera.position.y += ( - mouseY - camera.position.y ) * 0.01;
  //camera.position.z -= 1//= - position + 8000;
  if (user) {
    user.update(camera.position.x, camera.position.y, camera.position.z)
  }

  render();
}

function render() {
  const delta = clock.getDelta();
  controls.update(delta);
  renderer.render(scene, camera);
}

function getRandom(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
