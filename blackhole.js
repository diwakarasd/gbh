// ====================================================================
//  CINEMATIC GARGANTUA BLACK HOLE (INTERSTELLAR STYLE)
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
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // ------------------------------------------------------------------
  // SCENE & CAMERA
  // ------------------------------------------------------------------
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 8000);
  camera.position.set(0, 40, 420);

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
  // STARFIELD (BACKGROUND THAT WILL BEND)
  // ------------------------------------------------------------------
  const starRT = new THREE.WebGLRenderTarget(2048, 2048);

  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(60, 1, 1, 6000);
  starCam.position.z = 2000;

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(cfg.stars * 3);

  for (let i = 0; i < cfg.stars; i++) {
    const r = 1200 + Math.random() * 2600;
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;
    starPos[i * 3]     = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starScene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 1.5, color: 0xffffff })
    )
  );

  // Star sphere (so lensing has something to warp)
  const starSphere = new THREE.Mesh(
    new THREE.SphereGeometry(3500, 64, 64),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: starRT.texture
    })
  );
  scene.add(starSphere);

  // ------------------------------------------------------------------
  // BLACK HOLE GROUP
  // ------------------------------------------------------------------
  const BH = new THREE.Group();
  scene.add(BH);

  // Event Horizon
  BH.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(45, 128, 128),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    )
  );

  // ------------------------------------------------------------------
  // PHOTON RING (THICK + BRIGHT)
  // ------------------------------------------------------------------
  const photonRing = new THREE.Mesh(
    new THREE.RingGeometry(50, 58, 512),
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
  // ACCRETION DISK (BIG + THICK)
  // ------------------------------------------------------------------
  const diskMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader: DiskShader.vertexShader,
    fragmentShader: DiskShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const diskBase = new THREE.Mesh(
    new THREE.RingGeometry(60, 380, cfg.diskSegments),
    diskMat
  );
  diskBase.rotation.x = Math.PI / 2;

  // fake thickness (top + bottom)
  const diskTop = diskBase.clone();
  diskTop.position.y = 4;
  const diskBottom = diskBase.clone();
  diskBottom.position.y = -4;

  BH.add(diskTop);
  BH.add(diskBottom);

  // ------------------------------------------------------------------
  // JETS (OPTIONAL)
  // ------------------------------------------------------------------
  if (cfg.jetsEnabled) {
    const jets = new THREE.Group();
    [-1, 1].forEach(s => {
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 12, 260, 32, 1, true),
        new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.clone(JetShader.uniforms),
          vertexShader: JetShader.vertexShader,
          fragmentShader: JetShader.fragmentShader,
          transparent: true,
          blending: THREE.AdditiveBlending
        })
      );
      jet.rotation.x = Math.PI / 2;
      jet.position.y = s * 160;
      jets.add(jet);
    });
    BH.add(jets);
  }

  // ------------------------------------------------------------------
  // HALO / FOG
  // ------------------------------------------------------------------
  if (cfg.fogEnabled) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(120, 520, 256),
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
  }

  // ------------------------------------------------------------------
  // POST PROCESSING (CRITICAL ORDER)
  // ------------------------------------------------------------------
  const composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(scene, camera));

  const lensPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uStrength: { value: 1.4 }
    },
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader
  });
  composer.addPass(lensPass);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    2.2,
    0.65,
    0.15
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
  // ANIMATION LOOP
  // ------------------------------------------------------------------
  let last = performance.now();

  function animate(t) {
    requestAnimationFrame(animate);
    const dt = (t - last) * 0.001;
    last = t;

    // render stars
    renderer.setRenderTarget(starRT);
    renderer.render(starScene, starCam);
    renderer.setRenderTarget(null);

    // disk motion
    diskTop.rotation.z += dt * 0.35;
    diskBottom.rotation.z += dt * 0.35;
    diskMat.uniforms.uTime.value += dt;

    // lens time
    lensPass.uniforms.uTime.value = t * 0.001;

    // gestures
    Gesture.updateSmooth();
    camera.position.x += (Gesture.smoothX * 30 - camera.position.x) * 0.08;
    camera.position.y += (40 + Gesture.smoothY * 14 - camera.position.y) * 0.08;
    camera.position.z += (420 - Gesture.smoothScale * 90 - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);

    controls.update();
    composer.render();
  }

  animate(performance.now());
}
