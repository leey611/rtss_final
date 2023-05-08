let socket;

import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FlyControls } from "three/addons/controls/FlyControls.js";
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";
// import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Water } from "three/addons/objects/Water.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { User } from "./user.js";
import { SeaCreature } from "/seacreature.js";

let camera, controls, scene, renderer;
let mouseX = 0,
  mouseY = 0;
let start_time = Date.now();
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let water, dLight, pLightParent;
const pLights = [];
let jellyfish, squid, starfish;
const clock = new THREE.Clock();
// const gui = new GUI();
let shouldAutoForward = false;

let context;
let contextResume = false;
window.onload = function () {
  context = new AudioContext();
};
const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
const bgm = new THREE.Audio(listener);
const collisionSound = new THREE.Audio(listener);

let user;
let users = {};

init();
//render(); // remove when using next line for animation loop (requestAnimationFrame)
animate();

function makeSocketUser() {
  socket = io();
  socket.on("connect", () => {
    const { x, y, z } = camera.position;
    user = new User(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      scene,
      socket.id
    );
    socket.emit("addUser", { x, y, z, id: socket.id });
  });
  socket.on("exsisting", (data) => {
    for (let userID in data) {
      if (data[userID]) {
        const { x, y, z, id } = data[userID];
        users[userID] = new User(x, y, z, scene, id);
      }
    }
    console.log("exsisting", users);
  });
  socket.on("updateUserPosition", (data) => {
    //console.log('updateUserPosition', data)
    const { x, y, z, id } = data;
    users[id].update(x, y, z);
  });
  socket.on("addUser", (data) => {
    console.log("new user comes", data);
    const { x, y, z, id } = data;
    users[data.id] = new User(x, y, z, scene, id);
  });
  socket.on("removeUser", (data) => {
    console.log("user left ", data.id);
    delete users[data.id];
    console.log("users after one left", users);
  });
}

function loadSounds() {
  audioLoader.load("/assets/sounds/the_heavy_truth.mp3", (buffer) => {
    bgm.setBuffer(buffer);
    bgm.setLoop(true);
    bgm.setVolume(0.5);
  });
  audioLoader.load("/assets/sounds/falling.mp3", (buffer) => {
    collisionSound.setBuffer(buffer);
    collisionSound.setLoop(false);
    collisionSound.setVolume(1);
  });
}

function addWireframe() {
  const geometry = new THREE.SphereGeometry(1000, 100, 100);
  const material = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    color: 0x1b181b,
    // color: 0x2d5d8f,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const wireframe = new THREE.WireframeGeometry(geometry);

  const line = new THREE.LineSegments(wireframe);
  line.material.depthTest = false;
  line.material.opacity = 0.75;
  line.material.transparent = false;
  line.material.color = new THREE.Color(0x352f34);
  // line.material.color = new THREE.Color(0xc2c1dc);

  scene.add(line);

  var params = {
    fillColor: 0x2d5d8f,
    lineColor: 0xc2c1dc,
  };

  // const wireframeFolder = gui.addFolder("wireframe");
  // wireframeFolder.add(line.material, "depthTest", "switch").name("depthTest");
  // wireframeFolder
  //   .add(line.material, "transparent", "switch")
  //   .name("transparent");
  // wireframeFolder
  //   .addColor(params, "fillColor")
  //   .name("fill color")
  //   .onChange(() => {
  //     material.color.set(params.fillColor);
  //   });
  // wireframeFolder
  //   .addColor(params, "lineColor")
  //   .name("line color")
  //   .onChange(() => {
  //     line.material.color.set(params.lineColor);
  //   });

  // wireframeFolder.open();
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
      // terrain.receiveShadow = true;
      scene.add(terrain);
      terrain.position.set(0, -55, 0);
      terrain.rotateX(-Math.PI / 2);

      // const terrainFolder = gui.addFolder("terrain");
      // terrainFolder
      //   .add(terrainmat, "displacementScale", 0, 100, 30)
      //   .name("displacementScale");
      // terrainFolder.open();
    })
    .catch((error) => {
      console.log(error);
    });
}

function addWater() {
  const waterSize = 500;
  const waterGeo = new THREE.CircleGeometry(waterSize);
  // const waterGeo = new THREE.PlaneGeometry(waterSize, waterSize);
  const waterMat = loadTexture("/assets/waternormals.jpg");
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
  water.position.set(0, 850, 0);
  scene.add(water);

  // const waterUniforms = water.material.uniforms;
  // const folderWater = gui.addFolder("water");
  // folderWater
  //   .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
  //   .name("distortionScale");
  // folderWater.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");
  // folderWater.add(water.position, "y", 1, 1000).name("water y pos");
  // folderWater.open();
}

function addDLight(color) {
  dLight = new THREE.DirectionalLight(color, 2);
  dLight.position.set(0, 470, 0);
  // dLight.shadow.mapSize.width = 1024;
  // dLight.shadow.camera.near = 1;
  // dLight.shadow.camera.far = 500;
  scene.add(dLight);

  var helper = new THREE.DirectionalLightHelper(dLight);
  // scene.add(helper);

  // var shadowHelper = new THREE.CameraHelper(dLight.shadow.camera);
  // scene.add(shadowHelper); // I don't think this even works bc apparently shadow helper uses orthographic positioning?

  // const dLightFolder = gui.addFolder("directional light");
  // dLightFolder.add(dLight, "intensity", 0, 10).name("intensity");
  // dLightFolder.add(dLight.position, "x", 0, 1500).name("x position");
  // dLightFolder.add(dLight.position, "y", 0, 1500).name("y position");
  // dLightFolder.add(dLight.position, "z", 0, 1500).name("z position");
  // dLightFolder.open();
}

function animateDLight(time) {
  dLight.intensity = Math.sin(time * 0.0001) * 1 + 1;
  // dLight.intensity = Math.sin(time * 0.0001) * 0.5 + (1 + 0.5);
  dLight.position.z = Math.sin(time * 0.0005) * 500;
}

function addPLights(color, amount, intensity, xPos = 0, yPos = 0, zPos = 0) {
  for (let i = 0; i < amount; i++) {
    pLightParent = new THREE.Object3D();
    pLights[i] = new THREE.PointLight(color, intensity);
    scene.add(pLights[i]);
    pLights[i].position.set(xPos, yPos, zPos);
    pLightParent.position.set(0, 0, 0);

    const pLhelper = new THREE.PointLightHelper(pLights[i], 100);
    pLightParent.add(pLhelper);
  }
}

function animatePLights(time) {
  pLightParent.position.x += Math.cos(time * 0.005);
  pLightParent.position.z += -Math.sin(time * 0.005);
}

async function init() {
  scene = new THREE.Scene();
  //   scene.background = new THREE.Color(0xcccccc);
  //   scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );

  camera.position.set(
    THREE.MathUtils.randFloat(0, 10),
    20,
    THREE.MathUtils.randFloat(380, 400)
  );

  camera.add(listener);

  // controls
  controls = new FirstPersonControls(camera, renderer.domElement);
  // controls = new OrbitControls(camera, renderer.domElement);

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

  loadSounds();

  // addWater();

  // sea creatures

  jellyfish = new SeaCreature(
    scene,
    "/assets/models/jellyfish.glb",
    "Object_6",
    50
  );
  jellyfish.init(750, 2, 2, 2, 1, 20);

  squid = new SeaCreature(scene, "/assets/models/squid.glb", "Object_4", 100);
  squid.init(750, 2, 2, 2, 1, 10);

  starfish = new SeaCreature(
    scene,
    "/assets/models/starfish.glb",
    "Object_2",
    25
  );
  starfish.init(
    750,
    -Math.PI / 2 / Math.PI, // as close to Math.PI/2 as possible
    0.5 / Math.PI, // as close to 0 as possible
    2,
    0.5,
    1,
    0 // starfish factor applied
  );

  // lights

  addDLight(0xffbd21);
  addPLights(
    0xdb45de,
    15,
    0.5,
    THREE.MathUtils.randFloat(0, 10),
    15,
    THREE.MathUtils.randFloat(300, 400)
  );
  // addPLights(
  //   0x006ff7,
  //   0.3,
  //   Math.random() * 500,
  //   Math.random() * 200 + 200,
  //   Math.random() * 500
  // );

  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  // window resize

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove, false);

  document.addEventListener("click", () => {
    shouldAutoForward = !shouldAutoForward;
    if (!contextResume) {
      context.resume().then(() => bgm.play());
      contextResume = true;
    }
  });

  document.getElementById("close_modal").addEventListener("click", () => {
    document.getElementById("instruction_modal").style.display = "none";
  });

  await makeSocketUser();
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

  const now = Date.now();
  jellyfish.update(now, "rotate");
  squid.update(now, "bob");

  animateDLight(now);
  animatePLights(now);

  //cube.position.set(camera.position.x,camera.position.y, camera.position.z - 20)

  //camera.position.x += (  mouseX - camera.position.x ) * 0.01;
  //camera.position.y += ( - mouseY - camera.position.y ) * 0.01;
  //camera.position.z -= 1//= - position + 8000;
  if (user) {
    user.update(camera.position.x, camera.position.y, camera.position.z);
    socket.emit("updateUserPosition", user);
    checkCollisions();
  }

  render();
}

function checkCollisions() {
  for (let userID in users) {
    if (user.bounding.intersectsSphere(users[userID].bounding)) {
      console.log("intersec");
      collisionSound.play();
    } else {
      //console.log('noooooo')
    }
  }
}

function render() {
  const delta = clock.getDelta();
  controls.update(delta);
  renderer.render(scene, camera);
}
