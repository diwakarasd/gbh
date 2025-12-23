// =====================================================================
//  INTERSTELLAR CINEMATIC BLACK HOLE SHADERS
//  (Visibility + Cinema > Physics)
// =====================================================================


// =======================================================
// ACCRETION DISK — CINEMATIC, THICK, WARM
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

      // Wide radial falloff
      float glow = smoothstep(600.0, 120.0, r);

      // Slow turbulence
      glow *= 0.7 + 0.3 * sin(r * 0.02 - uTime * 1.5);

      // Warm Interstellar palette
      vec3 color = mix(
        vec3(1.0, 0.35, 0.1),   // inner hot
        vec3(1.0, 0.9, 0.7),    // outer bright
        smoothstep(160.0, 420.0, r)
      );

      // Strong emission for bloom
      gl_FragColor = vec4(color * glow * 4.0, glow);
    }
  `
};


// =======================================================
// PHOTON RING — INTERSTELLAR STYLE (VERY IMPORTANT)
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

      // Screen-space radius
      float r = length(vUv - 0.5);

      // THICK photon ring band
      float ring = smoothstep(0.40, 0.45, r)
                 - smoothstep(0.50, 0.55, r);

      // Soft halo around the ring
      float glow = exp(-abs(r - 0.47) * 18.0);

      // Interstellar vertical bias (top brighter)
      float verticalBoost = smoothstep(0.2, 0.85, vUv.y);

      float intensity = (ring * 1.6 + glow)
                        * mix(0.6, 1.5, verticalBoost);

      // Warm white lens color
      vec3 color = vec3(1.0, 0.95, 0.85);

      // Overbright on purpose (cinema)
      gl_FragColor = vec4(color * intensity * 2.8, intensity);
    }
  `
};


// =======================================================
// HALO / DUST — SOFT CINEMATIC ATMOSPHERE
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

      vec3 color = vec3(0.45, 0.28, 0.18);

      gl_FragColor = vec4(color * fog, fog * 0.6);
    }
  `
};
