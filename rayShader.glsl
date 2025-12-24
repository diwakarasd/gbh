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

// sparse starfield (very dark)
vec3 stars(vec3 dir){
  float n = fract(sin(dot(dir.xy, vec2(12.9898,78.233))) * 43758.5453);
  return vec3(0.0);

}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

  // camera
  vec3 ro = vec3(0.0, 1.2, 8.0);
  vec3 rd = normalize(vec3(uv, -1.5));

  // tilt disk
  rd.yz *= rot(radians(70.0));

  vec3 col = vec3(0.0);
  float t = 0.0;
  float lastR = 1000.0;

  for(int i = 0; i < MAX_STEPS; i++){
    vec3 p = ro + rd * t;
    float r = length(p);
    lastR = r;

    // event horizon
    if(r < BH_RADIUS){
      col = vec3(0.0);
      break;
    }

    // gravitational bending
    float bend = 0.012 / (r * r + 0.2);
    rd = normalize(rd - bend * p);

    // accretion disk (XZ plane)
    if(abs(p.y) < 0.02 && r < DISK_RADIUS){
      float heat = smoothstep(DISK_RADIUS, 1.5, r);

      vec3 diskColor = mix(
        vec3(1.0, 0.35, 0.1),
        vec3(1.0, 0.85, 0.6),
        heat
      );

      diskColor *= 1.0 + p.x * 0.3;
      col = diskColor * 1.2;
      break;
    }

    t += 0.08;
  }

  // background
  if(col == vec3(0.0)){
    col = stars(rd);
  }

  // photon ring (ONLY near horizon)
  float ring = smoothstep(1.05, 1.01, lastR);
  col += ring * vec3(0.8, 0.75, 0.7);

  // tone control
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
