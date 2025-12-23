// shaders.js
// =====================================================================
//  GARGANTUA BLACK HOLE — FINAL CINEMATIC SHADERS
//  (Interstellar-style, tuned & stable)
// =====================================================================


// =====================================================================
// FULL GR LENSING + FILMIC POST
// =====================================================================
export const LensingShader = {

  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uStrength: { value: 1.2 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = vec4(position,1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uStrength;
    varying vec2 vUv;

    void main(){
      vec2 uv = vUv * 2.0 - 1.0;
      float r = length(uv);

      // ---------------------------
      // CINEMATIC GRAVITY SHELL
      // ---------------------------
      float shell = smoothstep(0.25, 0.85, r);
      float bend  = uStrength * 0.22 / (r*r + 0.06);

      // Kerr-style swirl
      float swirl = 0.25 * sin(r * 8.0 - uTime * 1.5);
      float angle = atan(uv.y, uv.x) + swirl * shell;

      vec2 warped;
      warped.x = cos(angle) * r;
      warped.y = sin(angle) * r;

      warped += normalize(warped) * bend * shell;

      vec2 finalUV = warped * 0.5 + 0.5;

      vec3 col = texture2D(tDiffuse, finalUV).rgb;

      // vignette
      col *= smoothstep(1.0, 0.4, r);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};

// =====================================================================
// RELATIVISTIC ACCRETION DISK (DOPPLER + BEAMING)
// =====================================================================
export const DiskShader = {

  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 }
  },

  vertexShader: `
    varying vec3 vPos;
    void main(){
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vPos;
    uniform float uTime;
    uniform float uIntensity;

    void main(){

      float r = length(vPos.xz);
      float height = vPos.y * 0.04;

      // Doppler illusion
      float doppler = smoothstep(-1.0, 1.0, vPos.x);

      // Temperature gradient
      vec3 hot = vec3(1.0, 0.9, 0.7);
      vec3 cold = vec3(1.0, 0.3, 0.1);
      vec3 col = mix(cold, hot, doppler);

      // Falloff
      float glow = exp(-abs(r - 40.0) * 0.08);
      glow *= exp(-abs(height));

      gl_FragColor = vec4(col * glow * uIntensity, glow);
    }
  `
};
// =====================================================================
// PHOTON RING (EINSTEIN RING)
// =====================================================================
export const DiffractionShader = {

  uniforms: {
    uTime: { value: 0 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying vec2 vUv;

    void main(){
      float r = abs(length(vUv - 0.5) - 0.22);
      float glow = exp(-r * 80.0);
      glow += exp(-r * 20.0) * 0.4;

      gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * glow, glow);
    }
  `
};

// =====================================================================
// RELATIVISTIC JETS
// =====================================================================
export const JetShader = {

  uniforms: {
    uTime: { value: 0 }
  },

  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vPos;
    void main() {
      float a = exp(-length(vPos.xy) * 0.05);
      gl_FragColor = vec4(0.8, 0.5, 1.0, a);
    }
  `
};


// =====================================================================
// FOG / HALO
// =====================================================================
export const FogShader = {

  uniforms: {
    uTime: { value: 0 }
  },

  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vPos;
    void main() {
      float d = length(vPos.xz);
      float a = exp(-d * 0.01) * 0.3;
      gl_FragColor = vec4(0.3, 0.2, 0.1, a);
    }
  `
};
