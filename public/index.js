let socket = io();
console.log(socket)

import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

let camera, controls, scene, renderer;
let mouseX = 0, mouseY = 0;
let start_time = Date.now();
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
const clock = new THREE.Clock();

init();
//render(); // remove when using next line for animation loop (requestAnimationFrame)
animate();

function addWireframe() {
    const geometry = new THREE.SphereGeometry( 500, 100, 100 );

const wireframe = new THREE.WireframeGeometry( geometry );

const line = new THREE.LineSegments( wireframe );
line.material.depthTest = false;
line.material.opacity = 0.25;
line.material.transparent = true;

scene.add( line );
}

function init() {

    scene = new THREE.Scene();
    //scene.background = new THREE.Color(0xcccccc);
    //scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 20, 400);
   

    // controls

    controls = new FirstPersonControls(camera, renderer.domElement);
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
    controls.autoForward = true
    controls.constrainVertical  = true
    controls.verticalMax = Math.PI/2
    controls.verticalMin = Math.PI/4
    
    controls.lookSpeed = 0.01

    // world

    addWireframe()

    const geometry = new THREE.CylinderGeometry(0, 10, 30, 4, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });

    for (let i = 0; i < 500; i++) {

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = Math.random() * 1600 - 800;
        mesh.position.y = 0;
        mesh.position.z = Math.random() * 1600 - 800;
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        scene.add(mesh);

    }

    // lights

    const dirLight1 = new THREE.DirectionalLight(0xffffff);
    dirLight1.position.set(1, 1, 1);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x002288);
    dirLight2.position.set(- 1, - 1, - 1);
    scene.add(dirLight2);

    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    //
    
    window.addEventListener('resize', onWindowResize);
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function onDocumentMouseMove( event ) {
    console.log('move')
    mouseX = ( event.clientX - windowHalfX ) * 0.25;
    mouseY = ( event.clientY - windowHalfY ) * 0.15;

}
function animate() {

    requestAnimationFrame(animate);

    //controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    let position = ( ( Date.now() - start_time ) * 0.03 ) % 8000;

	//camera.position.x += (  mouseX - camera.position.x ) * 0.01;
	//camera.position.y += ( - mouseY - camera.position.y ) * 0.01;
	//camera.position.z -= 1//= - position + 8000;
    render();

}

function render() {
    const delta = clock.getDelta();
    controls.update( delta );
    renderer.render(scene, camera);

}