import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164/build/three.module.js";

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.Camera();

const material = new THREE.ShaderMaterial({
  uniforms: {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(innerWidth, innerHeight) }
  },
  vertexShader: `
    void main() {
      gl_Position = vec4(position,1.0);
    }
  `,
  fragmentShader: rayShader
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
scene.add(quad);

function animate(t){
  material.uniforms.iTime.value = t * 0.001;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate(0);

window.addEventListener("resize", ()=>{
  renderer.setSize(innerWidth, innerHeight);
  material.uniforms.iResolution.value.set(innerWidth, innerHeight);
});
