
// shaders.js
// ====================================================================
//  ALL GLSL SHADERS FOR THE GARGANTUA ENGINE
//  - GR Lensing (Max + Mobile)
//  - Accretion Disk (Max + Mobile)
//  - Diffraction Photon Ring
//  - Jets
//  - Fog Layer
// ====================================================================

// ------------------------------------------------------------
// Shared GLSL noise (simple hash + fbm)
// ------------------------------------------------------------
export const GLSL_NOISE = `
float hash(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p+34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a, b, u.x) + (c - a)*u.y*(1.0-u.x) + (d - b)*u.x*u.y;
}

float fbm(vec2 p){
  float v=0.0;
  float a=0.5;
  for(int i=0;i<5;i++){
    v += a*noise(p);
    p*=2.0;
    a*=0.5;
  }
  return v;
}
`;

// ====================================================================
// 1) MAX REALISM — GR LENSING SHADER
// ====================================================================
export const LensingShader = {

  uniforms: {
    uTime: { value: 0 },
    uStrength: { value: 1.0 },
    tScene: { value: null },   // <-- BH scene
    tStars: { value: null }    // <-- starfield
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform float uStrength;
    uniform sampler2D tScene;
    uniform sampler2D tStars;

    varying vec2 vUv;

    // --------------------------------------------------------
    //    SIMPLIFIED INTERSTELLAR-STYLE LENSING FIELD
    // --------------------------------------------------------
    vec2 lensDistort(vec2 uv, float strength)
    {
      vec2 centered = uv - 0.5;
      float r = length(centered);

      // Einstein ring radius
      float re = 0.23;

      // gravitational distortion
      float d = strength * 0.12 * exp(-abs(r - re) * 20.0);

      vec2 warp = centered * (1.0 - d);
      return warp + 0.5;
    }

    void main()
    {
      // Warp coordinates
      vec2 warped = lensDistort(vUv, uStrength);

      // Sample both buffers
      vec3 sceneCol = texture2D(tScene, vUv).rgb;
      vec3 starCol  = texture2D(tStars, warped).rgb;

      // When star warp is strong → stars dominate  
      // When near center → BH geometry dominates
      float mixAmt = smoothstep(0.20, 0.45, length(vUv - 0.5));

      vec3 col = mix(sceneCol, starCol, mixAmt);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};

// ====================================================================
// 2) MOBILE LENSING (lighter + faster)
// ====================================================================
export const LensingShader_Mobile = {
  uniforms:{
    tStars:{ value:null },
    uTime:{ value:0 },
    uStrength:{ value:1 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=vec4(position,1.0); }
  `,

  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tStars;
    uniform float uStrength;

    void main(){
      vec2 uv = vUv - 0.5;
      float r = length(uv);

      // cheaper falloff
      uv *= 1.0 - uStrength * 0.06 * exp(-r * 3.5);

      vec3 col = texture2D(tStars, uv + 0.5).rgb;
      gl_FragColor = vec4(col,1.0);
    }
  `
};

// ====================================================================
// 3) ACCRETION DISK SHADER — CINEMATIC (Interstellar)
// ====================================================================
export const DiskShader = {
  uniforms:{
    uTime:{ value:0 },
    uIntensity:{ value:1 },
    uSpin:{ value:0.2 }
  },

  vertexShader: `
    varying float vR;
    varying vec3 vPos;

    void main(){
      vPos = position;
      vR = length(position.xz);

      // vertical lift for backside disk
      vec3 pos = position;
      pos.y += pow(vR,1.1) * 0.003;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
    }
  `,

  fragmentShader: `
    varying float vR;
    varying vec3 vPos;

    uniform float uTime;
    uniform float uIntensity;
    uniform float uSpin;

    ${GLSL_NOISE}

    vec3 tone(vec3 c){ return pow(c, vec3(0.85)); }

    void main(){
      float r = vR;

      // warm Interstellar colors
      vec3 c1 = vec3(1.0,0.55,0.15);
      vec3 c2 = vec3(1.0,0.85,0.6);
      vec3 c3 = vec3(1.0);

      float t = smoothstep(24.0, 90.0, r);
      vec3 col = mix(c1,c2,t);
      col = mix(col,c3, t*0.6);

      // turbulence
      float turb = fbm(vec2(r*0.08, uTime*0.4 + vPos.x*0.02));
      col *= 0.8 + 1.5 * turb;

      // Doppler shift (cinematic)
      float dop = clamp(vPos.x * 0.015, -1.0, 1.0);
      col.r += dop * 1.3;
      col.b -= dop * 0.8;

      // fade out inner + outer
      float alpha = 1.0 - smoothstep(90.0,120.0,r);
      alpha *= 1.0 - smoothstep(0.0,24.0,r);

      gl_FragColor = vec4(tone(col), alpha * uIntensity);
    }
  `
};

// ====================================================================
// 4) MOBILE ACCRETION DISK (lighter & faster)
// ====================================================================
export const DiskShader_Mobile = {
  uniforms:{
    uTime:{ value:0 },
    uIntensity:{ value:1 },
    uSpin:{ value:0.2 }
  },

  vertexShader: `
    varying float vR;
    void main(){
      vR = length(position.xz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying float vR;
    uniform float uIntensity;
    void main(){
      float t = smoothstep(20.0,70.0,vR);
      vec3 col = mix(vec3(1.0,0.6,0.2), vec3(1.0), t);
      float alpha = 1.0 - smoothstep(70.0,110.0,vR);
      gl_FragColor = vec4(col, alpha * uIntensity);
    }
  `
};

// ====================================================================
// 5) DIFFRACTION PHOTON RING (beautiful thin glow)
// ====================================================================
export const DiffractionShader = {
  uniforms:{
    uTime:{ value:0 },
    uIntensity:{ value:1 }
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
      float edge = abs(r - 21.0);
      float glow = exp(-edge * 28.0);

      vec3 col = vec3(1.0,0.95,0.8) * glow * uIntensity;

      gl_FragColor = vec4(col, glow);
    }
  `
};

// ====================================================================
// 6) JET SHADER (relativistic plasma jet)
// ====================================================================
export const JetShader = {
  uniforms:{
    uTime:{ value:0 },
    uIntensity:{ value:1 }
  },

  vertexShader: `
    varying float vH;
    varying vec3 vPos;

    void main(){
      vPos = position;
      vH = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,

  fragmentShader: `
    varying float vH;
    varying vec3 vPos;

    uniform float uTime;
    uniform float uIntensity;

    ${GLSL_NOISE}

    void main(){
      float h = abs(vH);
      float core = exp(-pow(h*0.03, 1.4));

      float swirl = fbm(vPos.xz * 0.1 + vec2(0, uTime*0.3));
      vec3 col = vec3(0.8,0.6,1.0) * (core + swirl*0.4);

      float alpha = core * uIntensity * 1.4;
      gl_FragColor = vec4(col, alpha);
    }
  `
};

// ====================================================================
// 7) FOG SHADER (soft halo around BH)
// ====================================================================
export const FogShader = {
  uniforms:{
    uTime:{ value:0 },
    uIntensity:{ value:1 }
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

    ${GLSL_NOISE}

    void main(){
      float r = length(vPos.xz);
      float fog = exp(-pow((r-40.0)*0.04, 2.0));

      fog *= 0.4 + 0.6 * fbm(vPos.xz*0.04 + uTime*0.05);

      gl_FragColor = vec4(vec3(0.5,0.3,0.7) * fog * uIntensity, fog * uIntensity);
    }
  `
};
