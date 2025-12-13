

// blackhole.js
// ====================================================================
//   MAIN ENGINE — GARGANTUA REALISTIC BLACK HOLE
// ====================================================================


import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/UnrealBloomPass.js";

import {
  LensingShader, LensingShader_Mobile,
  DiskShader, DiskShader_Mobile,
  DiffractionShader, JetShader, FogShader
} from "./shaders.js";

import { Gesture } from "./gesture.js";
import { CONFIG } from "./config.js";


// ====================================================================
// ENTRY POINT
// ====================================================================
export function startBlackHole() {

  // ------------------------------------------------------------
  // BASIC RENDERER
  // ------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 5000);
  camera.position.set(0, 18, 160);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;


  // ====================================================================
  // MODE (MOBILE / MAX)
  // ====================================================================
  let mode = "mobile";
  let cfg = CONFIG[mode];

  const uiMode = document.getElementById("mode");
  uiMode.value = mode;
  uiMode.addEventListener("change", e => {
    mode = e.target.value;
    cfg = CONFIG[mode];
    applyMode();
  });


  // ====================================================================
  // STARFIELD (used as background for GR lensing)
  // ====================================================================
  let starRT = new THREE.WebGLRenderTarget(cfg.textureSize, cfg.textureSize, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });

  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(50, 1, 1, 5000);
  starCam.position.set(0, 0, 1100);

  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(cfg.stars * 3);
  for (let i = 0; i < cfg.stars; i++) {
    const r = 600 + Math.random() * 1200;
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;
    starPositions[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPositions[i * 3 + 1] = Math.sin(e) * r * 0.6;
    starPositions[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

  const starMat = new THREE.PointsMaterial({ size: 1.4, color: 0xffffff });
  const stars = new THREE.Points(starGeo, starMat);
  starScene.add(stars);


  // ====================================================================
  // GR LENSING SCREEN QUAD
  // ====================================================================
  const lensMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(LensingShader.uniforms),
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader,
  });
  lensMat.uniforms.tStars.value = starRT.texture;

  const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat);
  const lensScene = new THREE.Scene();
  lensScene.add(lensQuad);


  // ====================================================================
  // BLACK HOLE ROOT GROUP
  // ====================================================================
  const BHroot = new THREE.Group();
  scene.add(BHroot);

  // EVENT HORIZON
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(22, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  BHroot.add(horizon);


  // ====================================================================
  // PHOTON RING
  // ====================================================================
  const ringMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiffractionShader.uniforms),
    vertexShader: DiffractionShader.vertexShader,
    fragmentShader: DiffractionShader.fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(20.3, 21.0, 256),
    ringMat
  );
  ring.rotation.x = Math.PI / 2;
  BHroot.add(ring);


  // ====================================================================
  // ACCRETION DISK
  // ====================================================================
  let diskMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader: DiskShader.vertexShader,
    fragmentShader: DiskShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(24, 120, cfg.diskSegments),
    diskMat
  );
  disk.rotation.x = Math.PI / 2;
  BHroot.add(disk);


  // ====================================================================
  // JETS
  // ====================================================================
  let jets = new THREE.Group();
  BHroot.add(jets);

  function createJet(sign) {
    const jetMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(JetShader.uniforms),
      vertexShader: JetShader.vertexShader,
      fragmentShader: JetShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 10, 200, 32, 32, true),
      jetMat
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.y = sign * 110;
    if (sign < 0) cone.rotation.x += Math.PI;

    jets.add(cone);
  }

  if (cfg.jetsEnabled) {
    createJet(1);
    createJet(-1);
  }


  // ====================================================================
  // FOG HALO
  // ====================================================================
  const fogMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
    vertexShader: FogShader.vertexShader,
    fragmentShader: FogShader.fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  const fog = new THREE.Mesh(
    new THREE.RingGeometry(40, 140, 200),
    fogMat
  );
  fog.rotation.x = Math.PI / 2;
  BHroot.add(fog);


  // ====================================================================
  // POST PROCESSING (Bloom)
  // ====================================================================
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(lensScene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    cfg.bloomStrength,
    cfg.bloomRadius,
    cfg.bloomThreshold
  );
  composer.addPass(bloom);


  // ====================================================================
  // MODE SWITCHING
  // ====================================================================
  function applyMode() {
    cfg = CONFIG[mode];

    bloom.strength = cfg.bloomStrength;
    bloom.radius = cfg.bloomRadius;
    bloom.threshold = cfg.bloomThreshold;

    // Switch shaders
    lensMat.vertexShader = (mode === "max")
      ? LensingShader.vertexShader
      : LensingShader_Mobile.vertexShader;

    lensMat.fragmentShader = (mode === "max")
      ? LensingShader.fragmentShader
      : LensingShader_Mobile.fragmentShader;

    lensMat.needsUpdate = true;

    disk.geometry.dispose();
    disk.geometry = new THREE.RingGeometry(24, 120, cfg.diskSegments);

    diskMat.vertexShader = (mode === "max")
      ? DiskShader.vertexShader
      : DiskShader_Mobile.vertexShader;

    diskMat.fragmentShader = (mode === "max")
      ? DiskShader.fragmentShader
      : DiskShader_Mobile.fragmentShader;

    diskMat.needsUpdate = true;
  }

  applyMode();


  // ====================================================================
  // UI CONTROLS
  // ====================================================================
  const diskIntensity = document.getElementById("diskIntensity");
  const diskSpin = document.getElementById("diskSpin");
  const bloomStrength = document.getElementById("bloomStrength");
  const bloomRadius = document.getElementById("bloomRadius");
  const bloomThreshold = document.getElementById("bloomThreshold");


  // ====================================================================
  // INITIALIZE GESTURES
  // ====================================================================
  Gesture.init(document.getElementById("gestureCam"), () => {
    console.log("Gesture system ready.");
  });


  // ====================================================================
  // RESIZE HANDLING
  // ====================================================================
  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });


  // ====================================================================
  // ANIMATION LOOP
  // ====================================================================
  let last = performance.now();

  function animate(now) {

    requestAnimationFrame(animate);
    const dt = (now - last) * 0.001;
    last = now;

    // Render stars into RT
    renderer.setRenderTarget(starRT);
    renderer.render(starScene, starCam);
    renderer.setRenderTarget(null);

    // Update uniforms
    diskMat.uniforms.uTime.value += dt;
    diskMat.uniforms.uIntensity.value = parseFloat(diskIntensity.value);

    lensMat.uniforms.uTime.value += dt;
    lensMat.uniforms.uStrength.value = cfg.lensStrength;

    ringMat.uniforms.uTime.value += dt;
    jets.children.forEach(j => { j.material.uniforms.uTime.value += dt; });
    fogMat.uniforms.uTime.value += dt;

    bloom.strength = parseFloat(bloomStrength.value);
    bloom.radius = parseFloat(bloomRadius.value);
    bloom.threshold = parseFloat(bloomThreshold.value);

    // Disk spin
    disk.rotation.z += parseFloat(diskSpin.value) * dt;

    // Gesture
    Gesture.updateSmooth();
    BHroot.scale.setScalar(Gesture.smoothScale);
    BHroot.rotation.x += (Gesture.smoothX - BHroot.rotation.x) * 0.08;
    BHroot.rotation.y += (Gesture.smoothY - BHroot.rotation.y) * 0.08;

    // Pulse effect
    let baseI = parseFloat(diskIntensity.value);
    diskMat.uniforms.uIntensity.value = baseI + Gesture.smoothPulse * 0.3;

    // Camera autopilot (very subtle)
    camera.position.x = Math.sin(now * 0.00005 * cfg.cameraAutoSpeed) * 15;
    camera.position.y = 18 + Math.sin(now * 0.00007 * cfg.cameraAutoSpeed) * 4;

    controls.update();
    composer.render();
  }

  animate(performance.now());
}
