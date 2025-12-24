precision highp float;

uniform vec2 iResolution;
uniform float iTime;

#define MAX_STEPS 80
#define BH_RADIUS 1.0
#define DISK_RADIUS 6.0

// rotate around Y
mat2 rot(float a){
  float s = sin(a), c = cos(a);
  return mat2(c,-s,s,c);
}

// simple starfield
vec3 stars(vec3 dir){
  float n = fract(sin(dot(dir.xy,vec2(12.9898,78.233)))*43758.5453);
  return vec3(step(0.997,n));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*iResolution.xy) / iResolution.y;

  // camera
  vec3 ro = vec3(0.0, 1.2, 8.0);
  vec3 rd = normalize(vec3(uv, -1.5));

  // tilt disk like Interstellar
  rd.yz *= rot(radians(70.0));

  vec3 col = vec3(0.0);

  float t = 0.0;
  vec3 p;

  for(int i=0;i<MAX_STEPS;i++){
    p = ro + rd * t;
    float r = length(p);

    // BLACK HOLE
    if(r < BH_RADIUS){
      col = vec3(0.0);
      break;
    }

    // GRAVITY BENDING (cheap Schwarzschild approx)
    float bend = 0.015 / (r*r);
    rd = normalize(rd - bend * p);

    // ACCRETION DISK (XZ plane)
    if(abs(p.y) < 0.02 && r < DISK_RADIUS){
      float heat = smoothstep(DISK_RADIUS, 1.5, r);
      vec3 diskColor = mix(
        vec3(1.0,0.4,0.1),
        vec3(1.0,0.9,0.7),
        heat
      );

      // Doppler illusion
      diskColor *= 1.0 + p.x * 0.3;

      col = diskColor * 1.5;
      break;
    }

    t += 0.08;
  }

  // BACKGROUND STARS
  if(col == vec3(0.0)){
    col = stars(rd);
  }

  // PHOTON RING BOOST
  float ring = smoothstep(1.02,1.05,length(p));
  col += ring * vec3(1.2,1.1,1.0);

  gl_FragColor = vec4(col,1.0);
}
