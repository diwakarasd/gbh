import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164/build/three.module.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.Camera();

// ===================== DEBUG SHADER =====================
const fragmentShader = `
precision mediump float;

uniform vec2 iResolution;

void main() {

  // Normalized coordinates (-1 to 1)
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  uv = uv * 2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  float r = length(uv);

  vec3 col = vec3(0.0);

  // -----------------------------
  // BLACK HOLE SHADOW
  // -----------------------------
  float shadow = smoothstep(0.35, 0.33, r);
  col *= shadow;

  // -----------------------------
  // PHOTON RING (THICK + VISIBLE)
  // -----------------------------
  float ring = smoothstep(0.38, 0.36, r)
             - smoothstep(0.45, 0.43, r);

  vec3 ringColor = vec3(1.0, 0.9, 0.7);
  col += ring * ringColor * 1.5;

  // -----------------------------
  // SOFT GLOW AROUND RING
  // -----------------------------
  float glow = exp(-abs(r - 0.40) * 12.0);
  col += glow * ringColor * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
;
// ======================================================

const material = new THREE.ShaderMaterial({
  uniforms: {
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(quad);

// resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.iResolution.value.set(
    window.innerWidth,
    window.innerHeight
  );
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
