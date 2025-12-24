import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164/build/three.module.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.Camera();

// ================== RAY-BASED BLACK HOLE SHADER ==================
const rayShader = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;

#define MAX_STEPS 90
#define BH_RADIUS 1.0
#define DISK_RADIUS 6.0

mat2 rot(float a){
  float s = sin(a), c = cos(a);
  return mat2(c,-s,s,c);
}

// procedural stars
vec3 stars(vec3 dir){
  float n = fract(sin(dot(dir.xy,vec2(12.9898,78.233))) * 43758.5453);
  return vec3(step(0.9975, n));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

  // camera
  vec3 ro = vec3(0.0, 1.2, 8.0);
  vec3 rd = normalize(vec3(uv, -1.5));

  // disk tilt (Interstellar-like)
  rd.yz *= rot(radians(70.0));

  vec3 col = vec3(0.0);
  float t = 0.0;
  vec3 p = vec3(0.0);

  for(int i = 0; i < MAX_STEPS; i++){
    p = ro + rd * t;
    float r = length(p);

    // event horizon
    if(r < BH_RADIUS){
      col = vec3(0.0);
      break;
    }

    // gravitational bending (cheap Schwarzschild approx)
    float bend = 0.015 / (r * r);
    rd = normalize(rd - bend * p);

    // accretion disk (XZ plane)
    if(abs(p.y) < 0.02 && r < DISK_RADIUS){
      float heat = smoothstep(DISK_RADIUS, 1.5, r);

      vec3 diskColor = mix(
        vec3(1.0, 0.35, 0.1),
        vec3(1.0, 0.9, 0.7),
        heat
      );

      // Doppler-style brightness asymmetry
      diskColor *= 1.0 + p.x * 0.35;

      col = diskColor * 1.6;
      break;
    }

    t += 0.08;
  }

  // background stars
  if(col == vec3(0.0)){
    col = stars(rd);
  }

  // photon ring enhancement
  float ring = smoothstep(1.02, 1.06, length(p));
  col += ring * vec3(1.3, 1.2, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
// ================================================================

const material = new THREE.ShaderMaterial({
  uniforms: {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(innerWidth, innerHeight) }
  },
  vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: rayShader
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(quad);

function animate(t) {
  material.uniforms.iTime.value = t * 0.001;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate(0);

window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  material.uniforms.iResolution.value.set(innerWidth, innerHeight);
});
