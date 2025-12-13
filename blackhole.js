// blackhole.js
// ===================================================================
// GARGANTUA BLACK HOLE — FINAL CINEMATIC VERSION (GESTURES RESTORED)
// Option C: Hand Gestures + Mouse Fallback
// ===================================================================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/EffectComposer.js";
import { ShaderPass } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/UnrealBloomPass.js";

import {
  LensingShader,
  DiskShader,
  DiffractionShader,
  JetShader,
  FogShader
} from "./shaders.js";

import { Gesture } from "./gesture.js"; // MediaPipe-based

export function startBlackHole() {

  // ------------------------------------------------------------
  // Renderer / Scene
  // ------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // ------------------------------------------------------------
  // Camera (CINEMATIC LOCK)
  // ------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 5000);

  let camTarget = new THREE.Vector3(0, 18, 160);
  camera.position.copy(camTarget);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false; // we control camera manually

  // ------------------------------------------------------------
  // Render Targets
  // ------------------------------------------------------------
  const sceneRT = new THREE.WebGLRenderTarget(innerWidth, innerHeight);
  const starRT = new THREE.WebGLRenderTarget(1024, 1024);

  // ------------------------------------------------------------
  // Starfield
  // ------------------------------------------------------------
  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(50, 1, 1, 5000);
  starCam.position.z = 1200;

  const starGeo = new THREE.BufferGeometry();
  const stars = 14000;
  const pos = new Float32Array(stars * 3);

  for (let i = 0; i < stars; i++) {
    const r = 500 + Math.random() * 1200;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 400;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starScene.add(new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ size: 1.1, color: 0xffffff })
  ));

  // ------------------------------------------------------------
  // Black Hole Root
  // ------------------------------------------------------------
  const BH = new THREE.Group();
  scene.add(BH);

  // ------------------------------------------------------------
  // Event Horizon (NOT LENSED)
  // ------------------------------------------------------------
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(22, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  BH.add(horizon);

  // ------------------------------------------------------------
  // Photon Ring
  // ------------------------------------------------------------
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(20.5, 21.3, 256),
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DiffractionShader.uniforms),
      vertexShader: DiffractionShader.vertexShader,
      fragmentShader: DiffractionShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
  ring.rotation.x = Math.PI / 2;
  BH.add(ring);

  // ------------------------------------------------------------
  // Accretion Disk (KERR TILT)
  // ------------------------------------------------------------
  const diskMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader: DiskShader.vertexShader,
    fragmentShader: DiskShader.fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(24, 120, 512),
    diskMat
  );

  disk.rotation.x = Math.PI / 2 + 0.15; // Kerr-like tilt
  BH.add(disk);

  // ------------------------------------------------------------
  // Jets
  // ------------------------------------------------------------
  const jets = new THREE.Group();
  BH.add(jets);

  [1, -1].forEach(sign => {
    const jet = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 10, 200, 32, true),
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(JetShader.uniforms),
        vertexShader: JetShader.vertexShader,
        fragmentShader: JetShader.fragmentShader,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      })
    );
    jet.position.y = sign * 110;
    jet.rotation.x = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
    jets.add(jet);
  });

  // ------------------------------------------------------------
  // Fog Halo
  // ------------------------------------------------------------
  const fog = new THREE.Mesh(
    new THREE.RingGeometry(40, 150, 256),
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
      vertexShader: FogShader.vertexShader,
      fragmentShader: FogShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
  fog.rotation.x = Math.PI / 2;
  BH.add(fog);

  // ------------------------------------------------------------
  // Lensing + Bloom
  // ------------------------------------------------------------
  const lensMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(LensingShader.uniforms),
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new ShaderPass(lensMat));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    1.4, 0.55, 0.18
  ));

  // ------------------------------------------------------------
  // Gesture Init (Option C)
  // ------------------------------------------------------------
  Gesture.init(document.getElementById("gestureCam"));

  // ------------------------------------------------------------
  // Resize
  // ------------------------------------------------------------
  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  // ------------------------------------------------------------
  // Animation Loop
  // ------------------------------------------------------------
  function animate(t) {
    requestAnimationFrame(animate);

    // Render stars
    renderer.setRenderTarget(starRT);
    renderer.render(starScene, starCam);

    // Render BH
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    // Feed lens shader
    lensMat.uniforms.tStars.value = starRT.texture;
    lensMat.uniforms.tScene.value = sceneRT.texture;
    lensMat.uniforms.uTime.value = t * 0.001;
    lensMat.uniforms.uStrength.value = 1.0;

    // Disk animation
    disk.rotation.z += 0.002;
    diskMat.uniforms.uTime.value += 0.01;

    // ---- Gesture → CAMERA (NOT OBJECT) ----
    Gesture.updateSmooth();

    camTarget.x = Gesture.smoothX * 25;
    camTarget.y = 18 + Gesture.smoothY * 12;
    camTarget.z = 160 - Gesture.smoothScale * 40;

    camera.position.lerp(camTarget, 0.08);
    camera.lookAt(0, 0, 0);

    composer.render();
  }

  animate(0);
}
