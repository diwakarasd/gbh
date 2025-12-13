
// blackhole.js
// ====================================================================
//   MAIN ENGINE — GARGANTUA REALISTIC BLACK HOLE
// ====================================================================

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import {
  LensingShader, LensingShader_Mobile,
  DiskShader, DiskShader_Mobile,
  DiffractionShader, JetShader, FogShader
} from "./shaders.js";

import { Gesture } from "./gesture.js";
import { CONFIG } from "./config.js";

export function startBlackHole() {

  // ------------------------------------------------------------
  // RENDERER + BASIC SETUP
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
  // RENDER TARGET FOR BLACK HOLE SCENE (VERY IMPORTANT)
  // ====================================================================
  const sceneRT = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });

  // ====================================================================
  // MODE (MOBILE / MAX)
  // ====================================================================
  let mode = "max";
  let cfg = CONFIG[mode];

  const uiMode = document.getElementById("mode");
  uiMode.value = mode;
  uiMode.addEventListener("change", e => {
    mode = e.target.value;
    cfg = CONFIG[mode];
    applyMode();
  });


  // ====================================================================
  // STARFIELD → used as background inside lens shader
  // ====================================================================
  const starRT = new THREE.WebGLRenderTarget(1024, 1024);

  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(50, 1, 1, 5000);
  starCam.position.set(0, 0, 1100);

  const starGeo = new THREE.BufferGeometry();
  const starCount = cfg.stars;
  const starPos = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 600 + Math.random() * 1200;
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;

    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r * 0.6;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starScene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.2, color: 0xffffff })));


  // ====================================================================
  // LENSING MATERIAL (BENDS BOTH: sceneRT + starRT)
  // ====================================================================
  const lensMat = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(LensingShader.uniforms),
      tScene: { value: null } // <-- IMPORTANT
    },
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader
  });

  const lensPass = new ShaderPass(lensMat);


  // ====================================================================
  // BLACK HOLE GROUP
  // ====================================================================
  const BHroot = new THREE.Group();
  scene.add(BHroot);

  // ----- Horizon -----
  BHroot.add(new THREE.Mesh(
    new THREE.SphereGeometry(22, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  ));

  // ----- Photon Ring -----
  const ringMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiffractionShader.uniforms),
    vertexShader: DiffractionShader.vertexShader,
    fragmentShader: DiffractionShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const ring = new THREE.Mesh(new THREE.RingGeometry(20.3, 21.0, 256), ringMat);
  ring.rotation.x = Math.PI / 2;
  BHroot.add(ring);

  // ----- Accretion Disk -----
  let diskMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader: DiskShader.vertexShader,
    fragmentShader: DiskShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(24, 120, cfg.diskSegments),
    diskMat
  );
  disk.rotation.x = Math.PI / 2;
  BHroot.add(disk);

  // ----- Jets -----
  const jets = new THREE.Group();
  BHroot.add(jets);

  function createJet(sign) {
    const jMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(JetShader.uniforms),
      vertexShader: JetShader.vertexShader,
      fragmentShader: JetShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const j = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 10, 200, 32, 32, true),
      jMat
    );

    j.rotation.x = (sign > 0 ? Math.PI / 2 : -Math.PI / 2);
    j.position.y = sign * 110;

    jets.add(j);
  }

  createJet(1);
  createJet(-1);

  // ----- Fog -----
  const fogMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
    vertexShader: FogShader.vertexShader,
    fragmentShader: FogShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const fog = new THREE.Mesh(new THREE.RingGeometry(40, 140, 200), fogMat);
  fog.rotation.x = Math.PI / 2;
  BHroot.add(fog);


  // ====================================================================
  // POSTPROCESSING PIPELINE
  // ====================================================================
  const composer = new EffectComposer(renderer);

  // BLOOM FIRST (initialize early)
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    cfg.bloomStrength,
    cfg.bloomRadius,
    cfg.bloomThreshold
  );

  // PASS 1: Raw black hole scene is rendered manually (not here)
  composer.addPass(new RenderPass(new THREE.Scene(), camera)); // Dummy; will not be used

  // PASS 2: Lensing
  composer.addPass(lensPass);

  // PASS 3: Bloom
  composer.addPass(bloom);


  // ====================================================================
  // MODE SWITCHING
  // ====================================================================
  function applyMode() {
    cfg = CONFIG[mode];

    bloom.strength = cfg.bloomStrength;
    bloom.radius = cfg.bloomRadius;
    bloom.threshold = cfg.bloomThreshold;

    // Adjust disk resolution
    disk.geometry.dispose();
    disk.geometry = new THREE.RingGeometry(24, 120, cfg.diskSegments);
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
  // GESTURE INIT
  // ====================================================================
  Gesture.init(document.getElementById("gestureCam"));


  // ====================================================================
  // ANIMATION LOOP
  // ====================================================================
  let last = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

  const dt = (now - last) * 0.001;
  last = now;

  // ----------- DEBUG OUTPUT MODE 1 -----------
  // Show ONLY the raw black hole scene WITHOUT lensing.
  // This will reveal whether the BH actually renders.
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  return; 
  }

  animate(performance.now());
}
