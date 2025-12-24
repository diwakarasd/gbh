precision highp float;

uniform vec2 iResolution;
uniform float iTime;

void main() {
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  float r = length(uv);

  // Black hole shadow
  float shadow = smoothstep(0.25, 0.24, r);

  // Simple glowing ring
  float ring = smoothstep(0.28, 0.26, r)
             - smoothstep(0.32, 0.30, r);

  vec3 col = vec3(0.0);

  col += ring * vec3(1.0, 0.9, 0.7);
  col *= shadow;

  gl_FragColor = vec4(col, 1.0);
}
