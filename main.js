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

  // -----------------------------
  // BASE COORDINATES
  // -----------------------------
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  uv = uv * 2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  float r = length(uv);
  vec3 col = vec3(0.0);

  // -----------------------------
  // BLACK HOLE SHADOW
  // -----------------------------
  float shadow = smoothstep(0.32, 0.30, r);

  // -----------------------------
  // MAIN PHOTON RING
  // -----------------------------
  float ring = smoothstep(0.36, 0.34, r)
             - smoothstep(0.42, 0.40, r);

  vec3 ringColor = vec3(1.0, 0.9, 0.7);
  col += ring * ringColor * 1.4;

  // -----------------------------
  // SAFE SPACE WARP (NO NORMALIZE)
  // -----------------------------
  vec2 warpUv = uv;
  float warpStrength = 0.12 * smoothstep(1.2, 0.3, r);
  warpUv *= 1.0 + warpStrength / (r + 0.45);

  float rw = length(warpUv);

  // -----------------------------
  // VERTICAL PHOTON RING (LENSED DISK)
  // -----------------------------
  float v = abs(warpUv.y);
  float h = abs(warpUv.x);

  // ellipse controls (tuned for Interstellar look)
  float verticalR = length(vec2(h * 0.6, v * 1.45));

  float vRing = smoothstep(0.36, 0.34, verticalR)
              - smoothstep(0.42, 0.40, verticalR);

  // fade toward center horizontally
  vRing *= smoothstep(0.30, 0.08, h);

  col += vRing * ringColor * 1.3;

  // -----------------------------
  // SOFT GR GLOW
  // -----------------------------
  float glow = exp(-abs(rw - 0.38) * 12.0);
  col += glow * ringColor * 0.4;

  // apply shadow last
  col *= shadow;

  gl_FragColor = vec4(col, 1.0);
}
`
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
