// blackhole.js — FINAL FIXED VERSION
// ====================================================================
//   GARGANTUA REALISTIC BLACK HOLE RENDERER
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
  // RENDERER
  // ------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50, innerWidth / innerHeight, 0.1, 5000
  );
  camera.position.set(0, 18, 160);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;


  // ====================================================================
  // OFFSCREEN RENDER TARGET FOR BLACK HOLE BEFORE LENSING
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
  // STARFIELD (rendered into tStars → lens shader)
  // ====================================================================
  const starRT = new THREE.WebGLRenderTarget(1024, 1024);

  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(50, 1, 1, 5000);
  starCam.position.set(0, 0, 1100);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(cfg.stars * 3);

  for (let i = 0; i < cfg.stars; i++) {
    const r = 600 + Math.random() * 1200;
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;
    starPos[i*3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i*3+1] = Math.sin(e) * r * 0.6;
    starPos[i*3+2] = Math.sin(a) * Math.cos(e) * r;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starScene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.2, color: 0xffffff })));


  // ====================================================================
  // LENSING SHADER SETUP (tScene + tStars)
  // ====================================================================
  const lensMat = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(LensingShader.uniforms),
      tScene: { value: null } // ← IMPORTANT
    },
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader
  });

  const lensPass = new ShaderPass(lensMat);


  // ====================================================================
  // BLACK HOLE ROOT GROUP
  // ====================================================================
  const BHroot = new THREE.Group();
  scene.add(BHroot);


  // ====================================================================
  // EVENT HORIZON (FIXED VERSION)
  // ====================================================================
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(22, 128, 128),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide
    })
  );
  horizon.renderOrder = 1;
  BHroot.add(horizon);


  // ====================================================================
  // PHOTON RING (FIXED VERSION)
  // ====================================================================
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(20.6, 21.2, 256),
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DiffractionShader.uniforms),
      vertexShader: DiffractionShader.vertexShader,
      fragmentShader: DiffractionShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.renderOrder = 2;  
  BHroot.add(ring);


  // ====================================================================
  // ACCRETION DISK
  // ====================================================================
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


  // ====================================================================
  // JETS
  // ====================================================================
  const jets = new THREE.Group();
  BHroot.add(jets);

  function createJet(sign) {
    const jMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(JetShader.uniforms),
      vertexShader: JetShader.vertexShader,
      fragmentShader: JetShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 10, 200, 32, 32, true),
      jMat
    );

    cone.rotation.x = (sign > 0) ? Math.PI / 2 : -Math.PI / 2;
    cone.position.y = sign * 110;

    jets.add(cone);
  }

  createJet(1);
  createJet(-1);


  // ====================================================================
  // FOG
  // ====================================================================
  const fogMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
    vertexShader: FogShader.vertexShader,
    fragmentShader: FogShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const fog = new THREE.Mesh(
    new THREE.RingGeometry(40, 140, 200),
    fogMat
  );
  fog.rotation.x = Math.PI / 2;
  fog.renderOrder = 0;
  BHroot.add(fog);


  // ====================================================================
  // POST-PROCESSING PIPELINE
  // ====================================================================
  //const composer = new EffectComposer(renderer);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    cfg.bloomStrength,
    cfg.bloomRadius,
    cfg.bloomThreshold
  );

  const composer = new EffectComposer(renderer);

// Step 1: lens pass
composer.addPass(lensPass);

// Step 2: bloom
composer.addPass(bloom);



  // ====================================================================
  // MODE SWITCHING
  // ====================================================================
  function applyMode() {
    cfg = CONFIG[mode];

    bloom.strength = cfg.bloomStrength;
    bloom.radius = cfg.bloomRadius;
    bloom.threshold = cfg.bloomThreshold;

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

  // --- 1. Render stars to RT ---
  renderer.setRenderTarget(starRT);
  renderer.render(starScene, starCam);

  // --- 2. Render black hole scene to RT ---
  renderer.setRenderTarget(sceneRT);
  renderer.render(scene, camera);

  renderer.setRenderTarget(null);

  // --- 3. Feed both textures to lens shader ---
  lensMat.uniforms.tStars.value = starRT.texture;
  lensMat.uniforms.tScene.value = sceneRT.texture;
  lensMat.uniforms.uTime.value = now * 0.001;

  // Disk updates
  disk.rotation.z += parseFloat(diskSpin.value) * dt;
  diskMat.uniforms.uIntensity.value = parseFloat(diskIntensity.value);
  diskMat.uniforms.uTime.value += dt;

  // Jets
  jets.children.forEach(j => {
    j.material.uniforms.uTime.value = now * 0.002;
  });

  // Fog
  fogMat.uniforms.uTime.value = now * 0.001;

  // Gesture transforms
  Gesture.updateSmooth();
  BHroot.scale.setScalar(Gesture.smoothScale);
  BHroot.rotation.x += (Gesture.smoothX - BHroot.rotation.x) * 0.1;
  BHroot.rotation.y += (Gesture.smoothY - BHroot.rotation.y) * 0.1;

  // Bloom
  bloom.strength = parseFloat(bloomStrength.value);
  bloom.radius = parseFloat(bloomRadius.value);
  bloom.threshold = parseFloat(bloomThreshold.value);

  controls.update();

  // --- 4. FINAL render through composer ---
  composer.render();
}


  animate(performance.now());
}
