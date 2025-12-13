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
    uTime: { value: 0 },
    uStrength: { value: 1.0 },
    tScene: { value: null },
    tStars: { value: null }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tScene;
    uniform sampler2D tStars;
    uniform float uTime;
    uniform float uStrength;

    varying vec2 vUv;

    // -----------------------------
    // Random for film grain
    // -----------------------------
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {

      // Normalized screen coords
      vec2 uv = vUv * 2.0 - 1.0;
      float r = length(uv);

      // -----------------------------
      // GR LENSING (CLAMPED)
      // -----------------------------
      float bend = uStrength * 0.12 / (r*r + 0.08);
      bend *= smoothstep(0.0, 0.35, r);
      uv += normalize(uv) * bend;

      vec2 sampleUV = uv * 0.5 + 0.5;

      // Sample buffers
      vec4 sceneCol = texture2D(tScene, sampleUV);
      vec4 starCol  = texture2D(tStars, sampleUV);

      // Stars only where scene is dark
      vec4 col = mix(starCol, sceneCol, sceneCol.a + 0.15);

      // -----------------------------
      // FILMIC COLOR GRADING
      // -----------------------------
      col.rgb = pow(col.rgb, vec3(0.92));        // lift shadows
      col.rgb *= vec3(1.05, 0.98, 0.92);         // warm highlights
      col.rgb = clamp(col.rgb, 0.0, 1.0);

      // -----------------------------
      // VIGNETTE
      // -----------------------------
      float vignette = smoothstep(0.9, 0.4, r);
      col.rgb *= vignette;

      // -----------------------------
      // FILM GRAIN (VERY SUBTLE)
      // -----------------------------
      float grain = rand(vUv + uTime) * 0.04 - 0.02;
      col.rgb += grain;

      gl_FragColor = vec4(col.rgb, 1.0);
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
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying vec3 vPos;
    uniform float uTime;
    uniform float uIntensity;

    // Temperature-based spectrum
    vec3 spectrum(float t) {
      return mix(
        vec3(1.0, 0.35, 0.1),   // red-orange
        vec3(1.0, 1.0, 1.0),    // white-hot
        t
      );
    }

    void main() {

      float r = length(vPos.xz);

      // Orbital velocity (approx GR)
      float speed = sqrt(1.0 / max(r, 1.0));

      // Doppler beaming (tightened)
      float doppler = pow(clamp(speed, 0.0, 1.0), 2.2);

      // Radial brightness falloff
      float brightness = exp(-abs(r - 30.0) * 0.15) * uIntensity;

      vec3 col = spectrum(doppler) * brightness;

      gl_FragColor = vec4(col, brightness);
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
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying vec2 vUv;
    void main() {
      float r = abs(length(vUv - 0.5) - 0.23);
      float glow = exp(-r * 120.0);
      gl_FragColor = vec4(vec3(glow), glow);
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
