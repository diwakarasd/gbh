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

  // normalized coordinates (-1 to 1)
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  uv = uv * 2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  float r = length(uv);

  vec3 col = vec3(0.0);

  // BIG RED CIRCLE (impossible to miss)
  if (r < 0.6) {
    col = vec3(0.4, 0.0, 0.0);
  }

  // THICK WHITE RING
  if (r > 0.6 && r < 0.75) {
    col = vec3(1.0, 1.0, 1.0);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
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
