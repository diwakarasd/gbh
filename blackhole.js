// ====================================================================
//  CINEMATIC INTERSTELLAR BLACK HOLE (CHEATED GR)
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
  JetShader,
  FogShader
} from "./shaders.js";

import { Gesture } from "./gesture.js";
import { CONFIG } from "./config.js";

export function startBlackHole() {

  // ------------------------------------------------------------------
  // RENDERER
  // ------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // ------------------------------------------------------------------
  // SCENE & CAMERA
  // ------------------------------------------------------------------
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.set(0, 18, 160);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  // ------------------------------------------------------------------
  // MODE CONFIG
  // ------------------------------------------------------------------
  let mode = "max";
  let cfg = CONFIG[mode];

  document.getElementById("mode").addEventListener("change", e => {
    mode = e.target.value;
    cfg = CONFIG[mode];
  });

  // ------------------------------------------------------------------
  // STARFIELD (BACKGROUND)
  // ------------------------------------------------------------------
  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(60, 1, 1, 4000);
  starCam.position.z = 1200;

  const starRT = new THREE.WebGLRenderTarget(
    cfg.textureSize,
    cfg.textureSize
  );

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(cfg.stars * 3);

  for (let i = 0; i < cfg.stars; i++) {
    const r = 600 + Math.random() * 1400;
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;

    starPos[i * 3]     = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r * 0.6;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starScene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 1.2, color: 0xffffff })
    )
  );

  // ------------------------------------------------------------------
  // BLACK HOLE GROUP
  // ------------------------------------------------------------------
  const BH = new THREE.Group();
  scene.add(BH);

  // Event Horizon (pure black)
  BH.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(22, 128, 128),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    )
  );

  // ------------------------------------------------------------------
  // PHOTON RING
  // ------------------------------------------------------------------
  const photonRing = new THREE.Mesh(
    new THREE.RingGeometry(20.8, 22.2, 256),
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

  // ------------------------------------------------------------------
  // ACCRETION DISK
  // ------------------------------------------------------------------
  const diskMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader: DiskShader.vertexShader,
    fragmentShader: DiskShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(26, 130, cfg.diskSegments),
    diskMat
  );
  disk.rotation.x = Math.PI / 2;
  BH.add(disk);

  // ------------------------------------------------------------------
  // RELATIVISTIC JETS
  // ------------------------------------------------------------------
  if (cfg.jetsEnabled) {
    const jets = new THREE.Group();
    [-1, 1].forEach(s => {
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 10, 200, 32, 1, true),
        new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.clone(JetShader.uniforms),
          vertexShader: JetShader.vertexShader,
          fragmentShader: JetShader.fragmentShader,
          transparent: true,
          blending: THREE.AdditiveBlending
        })
      );
      jet.rotation.x = Math.PI / 2;
      jet.position.y = s * 110;
      jets.add(jet);
    });
    BH.add(jets);
  }

  // ------------------------------------------------------------------
  // FOG / HALO
  // ------------------------------------------------------------------
  if (cfg.fogEnabled) {
    const fog = new THREE.Mesh(
      new THREE.RingGeometry(40, 160, 200),
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
        vertexShader: FogShader.vertexShader,
        fragmentShader: FogShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending
      })
    );
    fog.rotation.x = Math.PI / 2;
    BH.add(fog);
  }

  // ------------------------------------------------------------------
  // POST PROCESSING
  // ------------------------------------------------------------------
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const lensPass = new ShaderPass({
    uniforms: THREE.UniformsUtils.clone(LensingShader.uniforms),
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader
  });
  composer.addPass(lensPass);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    cfg.bloomStrength,
    cfg.bloomRadius,
    cfg.bloomThreshold
  );
  composer.addPass(bloom);

  // ------------------------------------------------------------------
  // GESTURES (CAMERA ONLY)
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
  // ANIMATION LOOP
  // ------------------------------------------------------------------
  let last = performance.now();

  function animate(t) {
    requestAnimationFrame(animate);
    const dt = (t - last) * 0.001;
    last = t;

    // render stars to texture
    renderer.setRenderTarget(starRT);
    renderer.render(starScene, starCam);
    renderer.setRenderTarget(null);

    lensPass.uniforms.tDiffuse.value = null;
    lensPass.uniforms.uTime.value = t * 0.001;

    // disk motion
    disk.rotation.z += dt * 0.35;
    diskMat.uniforms.uTime.value += dt;

    // gesture smoothing
    Gesture.updateSmooth();
    camera.position.x += (Gesture.smoothX * 25 - camera.position.x) * 0.08;
    camera.position.y += (18 + Gesture.smoothY * 10 - camera.position.y) * 0.08;
    camera.position.z += (160 - Gesture.smoothScale * 45 - camera.position.z) * 0.06;
    camera.lookAt(0, 0, 0);

    // fake gravity shell distortion (objects)
    scene.traverse(obj => {
      if (!obj.isMesh || obj.parent === BH) return;
      const d = obj.position.length();
      if (d < 220) {
        const pull = 1.0 - d / 220.0;
        obj.position.multiplyScalar(1.0 - pull * 0.002);
      }
    });

    controls.update();
    composer.render();
  }

  animate(performance.now());
}
