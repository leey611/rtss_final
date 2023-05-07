import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class SeaCreature {
  constructor(scene, url, objectName, amount) {
    this.url = url;
    this.objectName = objectName;
    this.amount = amount;
    this.scene = scene;

    // this.currentInstance = 0;
    this.instancesLoaded = false;

    this.parent = new THREE.Object3D();
    this.initialPosition = [];
    this.direction = [];

    for (let i = 0; i < this.amount; i++) {
      this.direction[i] = 1;
      // this.direction[i] = this.getRandomSign();
    }
  }

  loadModel(path) {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        path,
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

  getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  getRandomSign() {
    return Math.random() < 0.5 ? -1 : 1;
  }

  getRandomCoordinatesInHemisphere(radius) {
    const latitude = THREE.MathUtils.randFloat(0, 90);
    const longitude = THREE.MathUtils.randFloat(-180, 180);

    const phi = THREE.MathUtils.degToRad(90 - latitude);
    const theta = THREE.MathUtils.degToRad(longitude);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return { x, y, z };
  }

  init(radius, rotX = 0, rotY = 0, rotZ = 0, sL = 0, sU = 1) {
    this.loadModel(this.url)
      .then((object) => {
        const origMesh = object.getObjectByName(this.objectName);
        const geo = origMesh.geometry.clone();
        const mat = origMesh.material;
        this.mesh = new THREE.InstancedMesh(geo, mat, this.amount);
        this.parent.add(this.mesh);
        this.scene.add(this.parent);

        this.dummy = new THREE.Object3D();
        for (let i = 0; i < this.amount; i++) {
          this.dummy.position.x =
            this.getRandomCoordinatesInHemisphere(radius).x;
          this.dummy.position.y =
            this.getRandomCoordinatesInHemisphere(radius).y;
          this.dummy.position.z =
            this.getRandomCoordinatesInHemisphere(radius).z;

          this.initialPosition[i] = this.dummy.position.clone();

          this.dummy.rotation.x = Math.random() * rotX * Math.PI;
          this.dummy.rotation.y = Math.random() * rotY * Math.PI;
          this.dummy.rotation.z = Math.random() * rotZ * Math.PI;

          this.dummy.scale.x =
            this.dummy.scale.y =
            this.dummy.scale.z =
              this.getRandom(sL, sU);

          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
          // this.mesh.setMatrixAt(this.currentInstance, this.dummy.matrix);
          // this.currentInstance += 1;
        }
        this.instancesLoaded = true;

        setInterval(() => {
          console.log(`this.dummy.position.y: ${this.dummy.position.y}`);
          console.log(`this.position: ${this.initialPosition[0].y}`);
          console.log(`this.direction: ${this.direction[0]}`);
        }, 20000);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  rotateAnimation() {
    const matrix = new THREE.Matrix4();
    if (this.instancesLoaded) {
      for (let i = 0; i < this.amount; i++) {
        this.mesh.getMatrixAt(i, matrix);
        matrix.decompose(
          this.dummy.position,
          this.dummy.rotation,
          this.dummy.scale
        );
        this.dummy.rotation.x += Math.random() * 0.005;
        this.dummy.rotation.y += Math.random() * 0.005;
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      this.parent.rotation.y += 0.001;
    }
  }

  bobAnimation(time) {
    if (this.instancesLoaded) {
      const matrix = new THREE.Matrix4();
      const speed = 0.001;
      const range = 2;
      // let direction = 1;

      for (let i = 0; i < this.amount; i++) {
        this.mesh.getMatrixAt(i, matrix);
        matrix.decompose(
          this.dummy.position,
          this.dummy.rotation,
          this.dummy.scale
        );

        //   // const initialPosition = this.dummy.position.y;
        //   // this.dummy.position.y =
        //   //   initialPosition + Math.sin(time * speed) * range * this.direction[i];

        this.dummy.position.y =
          this.initialPosition[i].y +
          Math.sin(time * speed) * range * this.direction[i];

        if (
          this.dummy.position.y >= this.initialPosition[i].y + range ||
          this.dummy.position.y <= this.initialPosition[i].y - range
        ) {
          this.direction[i] *= -1;
        }

        this.dummy.rotation.x += Math.random() * speed;
        this.dummy.rotation.y += Math.random() * speed;
        this.dummy.rotation.z += Math.random() * speed;

        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  update(time, animation) {
    if (animation === "rotate") {
      this.rotateAnimation(time);
    } else if (animation === "bob") {
      this.bobAnimation(time);
    } else {
      console.warn(`Unknown animation type: ${animation}`);
    }
  }
}
