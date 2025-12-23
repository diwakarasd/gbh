// =====================================================================
//  CINEMATIC BLACK HOLE SHADERS — VISIBILITY FIRST
// =====================================================================


// =======================================================
// ACCRETION DISK — CINEMATIC (GUARANTEED VISIBLE)
// =======================================================
export const DiskShader = {

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
    uniform float uTime;

    void main() {

      float r = length(vPos.xz);

      // Wide cinematic falloff
      float glow = smoothstep(600.0, 120.0, r);

      // Subtle animated turbulence
      glow *= 0.6 + 0.4 * sin(r * 0.02 - uTime * 2.0);

      // Warm Interstellar palette
      vec3 color = mix(
        vec3(1.0, 0.35, 0.1),
        vec3(1.0, 0.9, 0.7),
        smoothstep(150.0, 400.0, r)
      );

      // FORCE brightness
      gl_FragColor = vec4(color * glow * 4.0, glow);
    }
  `
};


// =======================================================
// PHOTON RING — SCREEN-SPACE HALO (ALWAYS VISIBLE)
// =======================================================
export const DiffractionShader = {

  uniforms: {},

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

      // Ring centered in UV space
      float r = abs(length(vUv - 0.5) - 0.5);

      // Thick cinematic glow
      float glow = exp(-r * 25.0);
      glow += exp(-r * 6.0) * 0.7;

      vec3 color = vec3(1.0, 0.95, 0.85);

      gl_FragColor = vec4(color * glow * 3.0, glow);
    }
  `
};


// =======================================================
// HALO / DUST — SOFT VOLUMETRIC CHEAT
// =======================================================
export const FogShader = {

  uniforms: {},

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

      float r = length(vPos.xz);

      float fog = exp(-r * 0.004);

      vec3 color = vec3(0.4, 0.25, 0.15);

      gl_FragColor = vec4(color * fog, fog * 0.6);
    }
  `
};
