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

  uniforms: {
    uStrength: { value: 1.0 }
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
    uniform float uStrength;

    void main() {

      // Camera-facing halo (screen-space illusion)
      float r = length(vUv - 0.5);

      // Thick photon ring band
      float ring = smoothstep(0.42, 0.45, r)
                 - smoothstep(0.48, 0.51, r);

      // Soft outer glow
      float glow = exp(-abs(r - 0.46) * 35.0);

      float intensity = ring * 1.8 + glow * 0.8;

      vec3 color = vec3(1.0, 0.95, 0.85);

      gl_FragColor = vec4(color * intensity * 2.5, intensity);
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
