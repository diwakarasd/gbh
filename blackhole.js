import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DiskShader, DiffractionShader, FogShader } from "./shaders.js";

export function startBlackHole() {

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 10000);
  camera.position.set(0, 60, 520);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // ---------------- STARS ----------------
  const starsGeo = new THREE.BufferGeometry();
  const starsPos = new Float32Array(20000 * 3);

  for (let i = 0; i < 20000; i++) {
    const r = 2000 + Math.random() * 4000;
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;
    starsPos[i * 3]     = Math.cos(a) * Math.cos(e) * r;
    starsPos[i * 3 + 1] = Math.sin(e) * r;
    starsPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }

  starsGeo.setAttribute("position", new THREE.BufferAttribute(starsPos, 3));
  scene.add(new THREE.Points(
    starsGeo,
    new THREE.PointsMaterial({ size: 1.4, color: 0xffffff })
  ));

  // ---------------- BLACK HOLE ----------------
  const BH = new THREE.Group();
  scene.add(BH);

  // Shadow
  BH.add(new THREE.Mesh(
    new THREE.SphereGeometry(70, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  ));

  // Photon ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(76, 84, 512),
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DiffractionShader.uniforms),
      vertexShader: DiffractionShader.vertexShader,
      fragmentShader: DiffractionShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
  );
  ring.rotation.x = Math.PI / 2;
  BH.add(ring);

  // Disk
  const diskMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader: DiskShader.vertexShader,
    fragmentShader: DiskShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(90, 520, 600),
    diskMat
  );

  disk.rotation.x = THREE.MathUtils.degToRad(75);

  const diskTop = disk.clone();
  diskTop.position.y = 6;
  const diskBottom = disk.clone();
  diskBottom.position.y = -6;

  BH.add(diskTop, diskBottom);

  // Halo
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(140, 680, 256),
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
      vertexShader: FogShader.vertexShader,
      fragmentShader: FogShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
  );
  halo.rotation.x = Math.PI / 2;
  BH.add(halo);

  // ---------------- LOOP ----------------
  let last = performance.now();
  function animate(t) {
    requestAnimationFrame(animate);
    const dt = (t - last) * 0.001;
    last = t;

    diskTop.rotation.z += dt * 0.25;
    diskBottom.rotation.z += dt * 0.25;
    diskMat.uniforms.uTime.value += dt;

    controls.update();
    renderer.render(scene, camera);
  }
  animate(performance.now());
}
