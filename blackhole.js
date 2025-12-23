// ====================================================================
//  INTERSTELLAR GARGANTUA BLACK HOLE — WORKING PIPELINE
// ====================================================================

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import {
  LensingShader,
  DiskShader,
  DiffractionShader,
  FogShader
} from "./shaders.js";

import { Gesture } from "./gesture.js";
import { CONFIG } from "./config.js";

export function startBlackHole() {

  // ------------------------------------------------------------------
  // RENDERER
  // ------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // ------------------------------------------------------------------
  // SCENES
  // ------------------------------------------------------------------
  const backgroundScene = new THREE.Scene();
  const mainScene = new THREE.Scene();

  // ------------------------------------------------------------------
  // CAMERA
  // ------------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 10000);
  camera.position.set(0, 60, 520);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  // ------------------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------------------
  let cfg = CONFIG.max;
  document.getElementById("mode").addEventListener("change", e => {
    cfg = CONFIG[e.target.value];
  });

  // ------------------------------------------------------------------
  // STARFIELD (BACKGROUND)
  // ------------------------------------------------------------------
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(cfg.stars * 3);

  for (let i = 0; i < cfg.stars; i++) {
    const r = 2000 + Math.random() * 3500;
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;
    starPos[i * 3]     = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  backgroundScene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 1.5, color: 0xffffff })
    )
  );

  // ------------------------------------------------------------------
  // BLACK HOLE (MAIN SCENE — NOT LENSED)
  // ------------------------------------------------------------------
  const BH = new THREE.Group();
  mainScene.add(BH);

  // Event horizon
  BH.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(70, 128, 128),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    )
  );

  // Photon ring
  const photonRing = new THREE.Mesh(
    new THREE.RingGeometry(76, 84, 512),
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DiffractionShader.uniforms),
      vertexShader: DiffractionShader.vertexShader,
      fragmentShader: DiffractionShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
  );
  photonRing.rotation.x = Math.PI / 2;
  BH.add(photonRing);

  // Accretion disk (tilted)
  const diskMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader: DiskShader.vertexShader,
    fragmentShader: DiskShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(90, 520, cfg.diskSegments),
    diskMat
  );

  const tilt = THREE.MathUtils.degToRad(75);
  disk.rotation.x = tilt;

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

  // ------------------------------------------------------------------
  // POST PROCESSING (FIXED)
  // ------------------------------------------------------------------
  const composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(backgroundScene, camera));

  // ✅ CORRECT ShaderPass creation
  const lensMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(LensingShader.uniforms),
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader
  });

  const lensPass = new ShaderPass(lensMaterial);
  composer.addPass(lensPass);

  composer.addPass(new RenderPass(mainScene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    2.0,
    0.55,
    0.18
  );
  composer.addPass(bloom);

  // ------------------------------------------------------------------
  // GESTURES
  // ------------------------------------------------------------------
  Gesture.init(document.getElementById("gestureCam"));

  // ------------------------------------------------------------------
  // RESIZE
  // ------------------------------------------------------------------
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  // ------------------------------------------------------------------
  // ANIMATION
  // ------------------------------------------------------------------
  let last = performance.now();

  function animate(t) {
    requestAnimationFrame(animate);
    const dt = (t - last) * 0.001;
    last = t;

    diskTop.rotation.z += dt * 0.25;
    diskBottom.rotation.z += dt * 0.25;
    diskMat.uniforms.uTime.value += dt;

    lensMaterial.uniforms.uTime.value = t * 0.001;

    Gesture.updateSmooth();
    camera.position.x += (Gesture.smoothX * 40 - camera.position.x) * 0.06;
    camera.position.y += (60 + Gesture.smoothY * 20 - camera.position.y) * 0.06;
    camera.position.z += (520 - Gesture.smoothScale * 120 - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);

    controls.update();
    composer.render();
  }

  animate(performance.now());
}
