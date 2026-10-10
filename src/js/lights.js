import * as THREE from 'three';

export function createLights(scene) {
  // Sun / directional light (buat bayangan)
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.2);
  sun.position.set(60, 100, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x88bbff, 0x445522, 0.6);
  scene.add(hemi);

  return { sun, ambient, hemi };
}
