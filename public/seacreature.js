import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class SeaCreature {
  constructor(scene, url, objectName, amount) {
    this.url = url;
    this.objectName = objectName;
    this.amount = amount;
    this.scene = scene;

    this.currentInstance = 0;
    this.instancesLoaded = false;
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

  // getRandomCoordinatesInHemisphere(radius, hemisphereAngle) {
  //   // Generate a random radius within the hemisphere
  //   const randomRadius = Math.random() * radius;

  //   // Generate a random azimuth angle (longitude)
  //   const randomAzimuth = Math.random() * (2 * Math.PI);

  //   // Generate a random inclination angle (latitude)
  //   const randomInclination = Math.random() * hemisphereAngle;

  //   // Convert spherical coordinates to Cartesian coordinates
  //   const x =
  //     randomRadius * Math.cos(randomAzimuth) * Math.sin(randomInclination);
  //   const y =
  //     randomRadius * Math.sin(randomAzimuth) * Math.sin(randomInclination);
  //   const z = randomRadius * Math.cos(randomInclination);

  //   return { x, y, z };
  // }

  init(
    /* xL = 0,
    xU = 0,
    yL = 0,
    yU = 0,
    zL = 0,
    zU = 0, */
    radius,
    // hemisphereAngle,
    rotX = 0,
    rotY = 0,
    rotZ = 0,
    sL = 0,
    sU = 1
  ) {
    this.loadModel(this.url)
      .then((object) => {
        const origMesh = object.getObjectByName(this.objectName);
        const geo = origMesh.geometry.clone();
        const mat = origMesh.material;
        this.mesh = new THREE.InstancedMesh(geo, mat, this.amount);
        this.scene.add(this.mesh);

        this.dummy = new THREE.Object3D();
        for (let i = 0; i < this.amount; i++) {
          this.dummy.position.x =
            this.getRandomCoordinatesInHemisphere(radius).x;
          this.dummy.position.y =
            this.getRandomCoordinatesInHemisphere(radius).y;
          this.dummy.position.z =
            this.getRandomCoordinatesInHemisphere(radius).z;

          /*
          this.dummy.position.x = this.getRandomCoordinatesInHemisphere(
            radius,
            hemisphereAngle
          ).x;
          this.dummy.position.y = this.getRandomCoordinatesInHemisphere(
            radius,
            hemisphereAngle
          ).y;
          this.dummy.position.z = this.getRandomCoordinatesInHemisphere(
            radius,
            hemisphereAngle
          ).z;
          */

          /*
          this.dummy.position.x = this.getRandom(xL, xU);
          this.dummy.position.y = this.getRandom(yL, yU);
          this.dummy.position.z = this.getRandom(zL, zU);
          */
          this.dummy.rotation.x = Math.random() * rotX * Math.PI;
          this.dummy.rotation.y = Math.random() * rotY * Math.PI;
          this.dummy.rotation.z = Math.random() * rotZ * Math.PI;

          this.dummy.scale.x =
            this.dummy.scale.y =
            this.dummy.scale.z =
              this.getRandom(sL, sU);

          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(this.currentInstance, this.dummy.matrix);
          this.currentInstance += 1;
        }
        this.instancesLoaded = true;
      })
      .catch((error) => {
        console.log(error);
      });
  }

  update(
    time,
    posXq = 0,
    posYq = 0,
    posZq = 0,
    rotXq = 0,
    rotYq = 0,
    rotZq = 0
  ) {
    const matrix = new THREE.Matrix4();

    if (this.instancesLoaded) {
      for (let i = 0; i < this.currentInstance; i++) {
        this.mesh.getMatrixAt(i, matrix);
        matrix.decompose(
          this.dummy.position,
          this.dummy.rotation,
          this.dummy.scale
        );

        this.dummy.position.x += Math.random() * posXq;
        this.dummy.position.y += Math.random() * posYq;
        this.dummy.position.z += Math.random() * posZq;

        this.dummy.rotation.x += Math.random() * rotXq;
        this.dummy.rotation.y += Math.random() * rotYq;
        this.dummy.rotation.z += Math.random() * rotZq;

        // setInterval(() => {
        //   console.log(this.dummy.rotation.z);
        // }, 5000);

        // if (this.dummy.position.y <= 0) {
        //   this.dummy.position.y += Math.random() * speedQuotient * now;
        // } else if (this.dummy.position.y >= 75) {
        //   speedQuotient *= -1;
        // }
        // this.dummy.rotation.y += (i / instances) * now;

        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
