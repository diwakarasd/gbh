// shaders.js
// ======================================================
//  INTERSTELLAR-STYLE GARGANTUA SHADERS (OPTION A)
// ======================================================

export const LensingShader = {
  uniforms: {
    uTime: { value: 0 },
    uStrength: { value: 1.0 },
    tScene: { value: null },
    tStars: { value: null }
  },

  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = vec4(position,1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tScene;
    uniform sampler2D tStars;
    uniform float uStrength;
    varying vec2 vUv;

    vec2 lens(vec2 uv){
      vec2 c = uv - 0.5;
      float r = length(c);
      
      float bend = uStrength * 0.12 / (r*r + 0.08);
      bend *= smoothstep(0.0, 0.35, r);

      return c * (1.0 - bend) + 0.5;
    }

    void main(){
      vec2 warped = lens(vUv);

      vec3 bh = texture2D(tScene, warped).rgb;
      vec3 stars = texture2D(tStars, warped).rgb;

      float mixF = smoothstep(0.18, 0.45, length(vUv - 0.5));
      vec3 col = mix(bh, stars, mixF);

      gl_FragColor = vec4(col,1.0);
    }
  `
};

// ------------------------------------------------------

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

    vec3 spectrum(float t){
      return mix(vec3(1.0,0.4,0.1), vec3(1.0,1.0,1.0), t);
    }

    void main(){
      float r = length(vPos.xz);
      float speed = sqrt(1.0 / r);
      float doppler = clamp(speed*1.2,0.0,1.0);

      float brightness = exp(-abs(r-30.0)*0.08) * uIntensity;
      vec3 col = spectrum(doppler) * brightness;

      gl_FragColor = vec4(col, brightness);
    }
  `
};

// ------------------------------------------------------

export const DiffractionShader = {
  uniforms:{ uTime:{value:0} },

  vertexShader:`varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,

  fragmentShader:`varying vec2 vUv;
    void main(){
      float r = abs(length(vUv-0.5)-0.23);
      float glow = exp(-r*120.0);
      gl_FragColor = vec4(vec3(glow), glow);
    }
  `
};

// ------------------------------------------------------

export const JetShader = {
  uniforms:{ uTime:{value:0} },

  vertexShader:`varying vec3 vPos;
    void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,

  fragmentShader:`varying vec3 vPos;
    void main(){
      float a = exp(-length(vPos.xy)*0.05);
      gl_FragColor = vec4(0.8,0.5,1.0,a);
    }
  `
};

// ------------------------------------------------------

export const FogShader = {
  uniforms:{ uTime:{value:0} },

  vertexShader:`varying vec3 vPos;
    void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,

  fragmentShader:`varying vec3 vPos;
    void main(){
      float d = length(vPos.xz);
      float a = exp(-d*0.01)*0.3;
      gl_FragColor = vec4(0.3,0.2,0.1,a);
    }
  `
};
