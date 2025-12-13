// blackhole.js
// ===================================================================
//  GARGANTUA BLACK HOLE — OPTION A (MAX REALISM, TUNED & STABLE)
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

export function startBlackHole() {

  // ------------------------------------------------------------
  // Renderer / Scene / Camera
  // ------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    innerWidth / innerHeight,
    0.1,
    5000
  );
  camera.position.set(0, 20, 160);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // ------------------------------------------------------------
  // Render Targets
  // ------------------------------------------------------------
  const sceneRT = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });

  const starRT = new THREE.WebGLRenderTarget(1024, 1024);

  // ------------------------------------------------------------
  // Starfield (background)
  // ------------------------------------------------------------
  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(50, 1, 1, 5000);
  starCam.position.z = 1200;

  const starGeo = new THREE.BufferGeometry();
  const starCount = 12000;
  const starPos = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 400 + Math.random() * 1200;
    const a = Math.random() * Math.PI * 2;
    starPos[i * 3] = Math.cos(a) * r;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 400;
    starPos[i * 3 + 2] = Math.sin(a) * r;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starScene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 1.0, color: 0xffffff })
    )
  );

  // ------------------------------------------------------------
  // Black Hole Root
  // ------------------------------------------------------------
  const BH = new THREE.Group();
  scene.add(BH);

  // ------------------------------------------------------------
  // Event Horizon (NOT LENSED — Fix 2)
  // ------------------------------------------------------------
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(22, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );

  horizon.onBeforeRender = () => {
    lensMat.uniforms.uStrength.value = 0.0;
  };
  horizon.onAfterRender = () => {
    lensMat.uniforms.uStrength.value = 1.0;
  };

  BH.add(horizon);

  // ------------------------------------------------------------
  // Photon Ring
  // ------------------------------------------------------------
  BH.add(
    new THREE.Mesh(
      new THREE.RingGeometry(20.5, 21.3, 256),
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(DiffractionShader.uniforms),
        vertexShader: DiffractionShader.vertexShader,
        fragmentShader: DiffractionShader.fragmentShader,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      })
    )
  );

  // ------------------------------------------------------------
  // Accretion Disk (Relativistic)
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
  disk.rotation.x = Math.PI / 2;
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
  BH.add(
    new THREE.Mesh(
      new THREE.RingGeometry(40, 150, 256),
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
        vertexShader: FogShader.vertexShader,
        fragmentShader: FogShader.fragmentShader,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      })
    )
  );

  // ------------------------------------------------------------
  // Lensing + Bloom (Post)
  // ------------------------------------------------------------
  const lensMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(LensingShader.uniforms),
    vertexShader: LensingShader.vertexShader,
    fragmentShader: LensingShader.fragmentShader
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new ShaderPass(lensMat));

  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      1.6,   // strength
      0.6,   // radius
      0.18   // threshold
    )
  );

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

    // Stars → RT
    renderer.setRenderTarget(starRT);
    renderer.render(starScene, starCam);

    // Black hole → RT
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

    controls.update();
    composer.render();
  }

  animate(0);
}
