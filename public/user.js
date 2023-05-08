import * as THREE from "three";

export class User {
    constructor(x,y,z,scene,id) {
        this.x = x
        this.y = y
        this.z = z
        this.id = id
        const geometry = new THREE.SphereGeometry( 1, 32, 16 ); 
        const material = new THREE.MeshStandardMaterial( { color: 0xffff00, transparent: true, opacity: 0.8 } ); 
        this.mesh = new THREE.Mesh( geometry, material );
        this.mesh.position.set(x,y,z)
        this.bounding = new THREE.Sphere(this.mesh.position, 1)
        scene.add(this.mesh)
        console.log('bounding', this.bounding)
    }
    update(x,y,z) {
        this.mesh.position.set(x,y,z)
        this.x = x
        this.y = y
        this.z = z
        this.bounding = new THREE.Sphere(this.mesh.position, 1)
    }

}