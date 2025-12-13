// blackhole.js
// ======================================================
//  GARGANTUA BLACK HOLE — OPTION A (MAX REALISM)
// ======================================================

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

export function startBlackHole(){

  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,5000);
  camera.position.set(0,20,160);

  new OrbitControls(camera,renderer.domElement);

  // Render targets
  const sceneRT = new THREE.WebGLRenderTarget(innerWidth,innerHeight);
  const starRT  = new THREE.WebGLRenderTarget(1024,1024);

  // Starfield
  const starScene = new THREE.Scene();
  const starCam = new THREE.PerspectiveCamera(50,1,1,5000);
  starCam.position.z = 1200;

  const sg = new THREE.BufferGeometry();
  const sp = new Float32Array(12000*3);
  for(let i=0;i<12000;i++){
    const r=800*Math.random()+400;
    const a=Math.random()*6.28;
    sp[i*3]=Math.cos(a)*r;
    sp[i*3+1]=(Math.random()-0.5)*400;
    sp[i*3+2]=Math.sin(a)*r;
  }
  sg.setAttribute("position",new THREE.BufferAttribute(sp,3));
  starScene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:1,color:0xffffff})));

  // Black hole root
  const bh = new THREE.Group();
  scene.add(bh);

  // Horizon
  bh.add(new THREE.Mesh(
    new THREE.SphereGeometry(22,128,128),
    new THREE.MeshBasicMaterial({color:0x000000})
  ));

  // Photon ring
  bh.add(new THREE.Mesh(
    new THREE.RingGeometry(20.5,21.3,256),
    new THREE.ShaderMaterial({
      uniforms:THREE.UniformsUtils.clone(DiffractionShader.uniforms),
      vertexShader:DiffractionShader.vertexShader,
      fragmentShader:DiffractionShader.fragmentShader,
      blending:THREE.AdditiveBlending,
      transparent:true
    })
  ));

  // Accretion disk
  const diskMat = new THREE.ShaderMaterial({
    uniforms:THREE.UniformsUtils.clone(DiskShader.uniforms),
    vertexShader:DiskShader.vertexShader,
    fragmentShader:DiskShader.fragmentShader,
    blending:THREE.AdditiveBlending,
    transparent:true,
    side:THREE.DoubleSide
  });

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(24,120,512),
    diskMat
  );
  disk.rotation.x=Math.PI/2;
  bh.add(disk);

  // Jets
  const jets=new THREE.Group();
  bh.add(jets);
  for(const s of [1,-1]){
    const j=new THREE.Mesh(
      new THREE.CylinderGeometry(0,10,200,32,true),
      new THREE.ShaderMaterial({
        uniforms:THREE.UniformsUtils.clone(JetShader.uniforms),
        vertexShader:JetShader.vertexShader,
        fragmentShader:JetShader.fragmentShader,
        blending:THREE.AdditiveBlending,
        transparent:true
      })
    );
    j.position.y=s*110;
    j.rotation.x=s>0?Math.PI/2:-Math.PI/2;
    jets.add(j);
  }

  // Fog halo
  bh.add(new THREE.Mesh(
    new THREE.RingGeometry(40,150,256),
    new THREE.ShaderMaterial({
      uniforms:THREE.UniformsUtils.clone(FogShader.uniforms),
      vertexShader:FogShader.vertexShader,
      fragmentShader:FogShader.fragmentShader,
      blending:THREE.AdditiveBlending,
      transparent:true
    })
  ));

  // Lensing
  const lensMat=new THREE.ShaderMaterial({
    uniforms:THREE.UniformsUtils.clone(LensingShader.uniforms),
    vertexShader:LensingShader.vertexShader,
    fragmentShader:LensingShader.fragmentShader
  });

  const composer=new EffectComposer(renderer);
  composer.addPass(new ShaderPass(lensMat));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(innerWidth,innerHeight),
    1.8,0.7,0.15
  ));

  // Animation
  function animate(t){
    requestAnimationFrame(animate);

    renderer.setRenderTarget(starRT);
    renderer.render(starScene,starCam);

    renderer.setRenderTarget(sceneRT);
    renderer.render(scene,camera);
    renderer.setRenderTarget(null);

    lensMat.uniforms.tStars.value=starRT.texture;
    lensMat.uniforms.tScene.value=sceneRT.texture;
    lensMat.uniforms.uTime.value=t*0.001;

    diskMat.uniforms.uTime.value+=0.01;
    disk.rotation.z+=0.002;

    composer.render();
  }
  animate(0);
}
