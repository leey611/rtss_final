import * as THREE from "three";

export class User {
    constructor(x,y,z,scene,id) {
        this.x = x
        this.y = y
        this.z = z
        this.id = id
        const geometry = new THREE.SphereGeometry( 1, 32, 16 ); 
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } ); 
        this.mesh = new THREE.Mesh( geometry, material );
        this.mesh.position.set(x,y,z)
        scene.add(this.mesh)
    }
    update(x,y,z) {
        this.mesh.position.set(x,y,z)
    }

}