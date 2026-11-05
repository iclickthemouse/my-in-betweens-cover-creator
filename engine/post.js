// Builds the style (post-process) shader from the style registry.
// Every style is a GLSL function `vec3 style_<id>(Ctx x)`; this file supplies the shared library
// (uniforms, Ctx, noise, paper, sobel, dither) and the dispatch + wordmark-legibility layer.

const LIB = /* glsl */ `
precision highp float;
uniform sampler2D uCol, uDat;
uniform vec2 uRes, uCenter;
uniform float uT, uLoop, uR, uStyle, uShadowDist;
uniform float uP[8];
uniform vec3 uC0, uC1, uC2, uSphereCol, uBgCol, uTextColor;
uniform float uTextBoost, uTextMode, uTextThresh, uTextWeight;

#define PI 3.14159265
#define TAU 6.2831853
#define P0 uP[0]
#define P1 uP[1]
#define P2 uP[2]
#define P3 uP[3]
#define P4 uP[4]
#define P5 uP[5]
#define P6 uP[6]
#define P7 uP[7]
#define C0 uC0
#define C1 uC1
#define C2 uC2

// fc: pixel coord · uv: 0..1 · p: centred, y up, ±1 vertically · q: p relative to sphere centre
// PU: multiply a p-space offset to get a uv offset · tx: one texel · px: one pixel in p units
// K: resolution scale (1 at 1600px) · col: colour pass · d: data pass (see scene.js)
struct Ctx { vec2 fc; vec2 uv; vec2 p; vec2 q; vec2 PU; vec2 tx; float px; float K; vec3 col; vec4 d; };

float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a*vn(p); p = p*2.03 + 17.1; a *= 0.5; } return s; }
vec3 C(vec2 uv){ return texture2D(uCol, uv).rgb; }
vec4 D(vec2 uv){ return texture2D(uDat, uv); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sob(vec2 uv, vec2 e, vec4 m){
  float tl = dot(D(uv + e*vec2(-1.0, 1.0)), m), t = dot(D(uv + e*vec2(0.0, 1.0)), m), tr = dot(D(uv + e*vec2(1.0, 1.0)), m);
  float l = dot(D(uv + e*vec2(-1.0, 0.0)), m), r = dot(D(uv + e*vec2(1.0, 0.0)), m);
  float bl = dot(D(uv + e*vec2(-1.0, -1.0)), m), b = dot(D(uv + e*vec2(0.0, -1.0)), m), br = dot(D(uv + e*vec2(1.0, -1.0)), m);
  return length(vec2((tr + 2.0*r + br) - (tl + 2.0*l + bl), (tl + 2.0*t + tr) - (bl + 2.0*b + br)));
}
vec3 paper(vec2 p, vec3 base){
  float f = fbm(p*7.0);
  float fib = smoothstep(0.72, 1.0, vn(p*vec2(260.0, 22.0) + fbm(p*3.0)*6.0));
  return base*(1.0 - 0.04*f) - fib*0.025;
}
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y*0.75))); }
float bayer4(vec2 a){ return bayer2(0.5*a)*0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5*a)*0.25 + bayer2(a); }
vec3 nearer(vec3 c, vec3 best, vec3 cand){ return distance(c, cand) < distance(c, best) ? cand : best; }
`;

export function buildPostFS(styles) {
  const dispatch = styles
    .map((s, i) => `${i ? 'else ' : ''}if (uStyle < ${i}.5) col = style_${s.id}(x);`)
    .join('\n  ');
  return `${LIB}
${styles.map(s => `// ── ${s.name}\n${s.glsl}`).join('\n')}

void main(){
  Ctx x;
  x.fc = gl_FragCoord.xy;
  x.uv = x.fc/uRes;
  x.PU = 0.5*vec2(uRes.y/uRes.x, 1.0);
  x.p = (x.fc - 0.5*uRes)/uRes.y*2.0;
  x.q = x.p - uCenter;
  x.px = 2.0/uRes.y;
  x.K = uRes.y/1600.0;
  x.tx = 1.0/uRes;
  x.col = C(x.uv);
  x.d = D(x.uv);
  vec3 col = x.col;
  ${dispatch}

  // wordmark legibility layer (works on top of any style)
  if (uTextBoost > 0.001) {
    float m = uTextMode < 0.5
      ? smoothstep(uTextThresh, uTextThresh + 0.12, x.d.a)
      : smoothstep(0.25, 0.9, sob(x.uv, x.tx*uTextWeight*x.K, vec4(0.0, 0.0, 0.0, 1.0)));
    col = mix(col, uTextColor, m*uTextBoost*step(0.5, x.d.g));
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
}
