import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164/build/three.module.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Scene & camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 5);

// Simple geometry (NO SHADERS)
const geometry = new THREE.CircleGeometry(1.2, 128);
const material = new THREE.MeshBasicMaterial({
  color: 0x000000
});
const blackHole = new THREE.Mesh(geometry, material);
scene.add(blackHole);

// Glowing ring (still NO shaders)
const ringGeometry = new THREE.RingGeometry(1.25, 1.35, 128);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.8
});
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
scene.add(ring);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  ring.rotation.z += 0.002;
  renderer.render(scene, camera);
}
animate();
