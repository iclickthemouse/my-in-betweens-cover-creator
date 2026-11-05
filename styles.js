// Style registry. Each style is a post-process over the rendered scene.
//
//   id      – valid GLSL identifier; the function must be named style_<id>
//   params  – up to 8 sliders, read in GLSL as P0..P7 (in order)
//   colors  – up to 3 colours, read in GLSL as C0..C2 (in order)
//   glsl    – vec3 style_<id>(Ctx x) { ... }  (see engine/post.js for Ctx and helpers)
//
// To add a style: append an object here. The editor builds its controls automatically.

const r = (key, label, min, max, step, def) => ({ key, label, min, max, step, def });
const c = (key, label, def) => ({ key, label, def });

export const STYLES = [
  {
    id: 'original', name: 'original', params: [], colors: [],
    glsl: `vec3 style_original(Ctx x){ return x.col; }`,
  },

  {
    id: 'sumi', name: 'sumi sketch',
    blurb: 'Red ink wash on washi paper, an ensō brush circle, fine ink wordmark.',
    params: [
      r('wash', 'Ink wash', 0, 1.6, 0.01, 1),
      r('wobble', 'Hand wobble', 0, 3, 0.01, 1),
      r('brush', 'Ensō brush', 0, 1, 0.01, 0.93),
      r('gap', 'Ensō gap', 0, 0.6, 0.01, 0.13),
      r('hatch', 'Pencil hatching', 0, 1, 0.01, 0.28),
      r('seal', 'Seal stamp', 0, 1, 1, 1),
      r('text', 'Wordmark ink', 0, 1, 0.01, 0.9),
      r('weight', 'Brush weight', 0.2, 3, 0.01, 1),
    ],
    colors: [c('ink', 'Wash ink', '#cc241c'), c('paper', 'Paper', '#f5f2ea'), c('sumi', 'Brush ink', '#171414')],
    glsl: `
vec3 style_sumi(Ctx x){
  vec2 p = x.p, q = x.q;
  vec3 pap = paper(p, C1);
  vec2 off = vec2(0.012, -0.008)*P1;
  vec2 wob = (vec2(fbm(p*5.0 + 3.0), fbm(p*5.0 + 11.0)) - 0.5)*0.010*P1;
  vec2 qw = q - off + wob;
  vec4 dw = D((qw + uCenter)*x.PU + 0.5);
  float ang = atan(qw.y, qw.x);
  float dn = length(qw) + (fbm(vec2(cos(ang), sin(ang))*2.5 + 4.0) - 0.5)*0.022*P1;
  float inside = smoothstep(uR + 0.002, uR - 0.006, dn);
  float pool = smoothstep(uR - 0.07, uR - 0.002, dn);
  float light = dw.g > 0.5 ? dw.r : 0.7;
  float dens = 0.20 + 0.50*pool + 0.30*(1.0 - light) + 0.22*(fbm(p*5.0 + 9.0) - 0.5) + 0.10*(fbm(p*28.0) - 0.5);
  dens *= (1.0 - 0.95*smoothstep(0.78, 0.95, light))*P0;
  vec3 col = pap*mix(vec3(1.0), C0, clamp(dens, 0.0, 1.0)*inside);
  float hat = smoothstep(0.6, 0.95, sin((p.x*0.6 + p.y)*480.0 + fbm(p*18.0)*4.0))
            * smoothstep(0.50, 0.15, light)*step(0.42, vn(p*vec2(30.0, 6.0)));
  col = mix(col, C0*0.38, hat*P4*inside);
  float a2 = fract((atan(q.y, q.x) - 2.4)/TAU);
  float press = (0.0010 + 0.0045*pow(sin(a2*PI), 0.7))*P7;
  float dl = length(q) + (vn(vec2(a2*30.0, 2.0)) - 0.5)*0.006;
  float fade = smoothstep(0.0, 0.025, a2)*(1.0 - smoothstep(0.88 - P3, 1.0 - P3, a2));
  float dry = smoothstep(0.45, 0.75, vn(vec2(a2*90.0, (dl - uR)*900.0)))*smoothstep(0.5, 0.95, a2);
  float line = (1.0 - smoothstep(press - x.px, press + x.px, abs(dl - uR*1.012)))*fade*(1.0 - dry);
  col = mix(col, C2, line*P2);
  float lw = sob(x.uv, x.tx*1.5*x.K, vec4(0.0, 0.0, 0.0, 1.0));
  col = mix(col, C2, smoothstep(0.45, 1.1, lw)*P6*x.d.g);
  col = mix(col, C2, smoothstep(0.05, 0.6, x.d.b)*0.85);
  vec2 sq = p - vec2(0.80, -0.82);
  float seal = step(max(abs(sq.x), abs(sq.y)), 0.032 + (vn(p*90.0) - 0.5)*0.004);
  col = mix(col, C0, seal*step(0.28, vn(p*140.0) + 0.3)*0.9*P5);
  return col;
}`,
  },

  {
    id: 'riso', name: 'risograph',
    blurb: 'Two grainy inks, slightly out of register.',
    params: [
      r('grain', 'Grain', 0.01, 0.4, 0.01, 0.12),
      r('misreg', 'Misregistration', 0, 4, 0.01, 1),
      r('inkA', 'Ink 1 coverage', 0, 1, 0.01, 0.95),
      r('inkB', 'Ink 2 coverage', 0, 1, 0.01, 0.85),
      r('shadow', 'Ink 2 reach', 0.2, 1, 0.01, 0.62),
    ],
    colors: [c('inkA', 'Ink 1', '#f03833'), c('inkB', 'Ink 2', '#33458c'), c('paper', 'Paper', '#f4f1e9')],
    glsl: `
vec3 style_riso(Ctx x){
  vec3 pap = paper(x.p, C2);
  vec3 cA = C(x.uv);
  vec3 cB = C(x.uv + vec2(0.0035, -0.0025)*P1);
  float dA = smoothstep(0.04, 0.65, 1.0 - min(cA.r, min(cA.g, cA.b)));
  float dB = 1.0 - smoothstep(0.12, P4, max(cB.r, max(cB.g, cB.b)));
  vec2 g = floor(x.fc/x.K);
  float nA = 0.55*h21(g) + 0.45*vn(x.fc/x.K*0.35);
  float nB = 0.55*h21(g + 7.3) + 0.45*vn(x.fc/x.K*0.35 + 40.0);
  float a = smoothstep(nA - P0, nA + P0, dA);
  float b = smoothstep(nB - P0, nB + P0, dB);
  return pap*mix(vec3(1.0), C0, a*P2)*mix(vec3(1.0), C1, b*P3);
}`,
  },

  {
    id: 'halftone', name: 'halftone',
    blurb: 'Two rotated dot screens on newsprint.',
    params: [
      r('cell', 'Dot spacing', 0.005, 0.05, 0.001, 0.016),
      r('angle', 'Screen angle', 0, 90, 1, 15),
      r('dot', 'Dot size', 0.2, 1, 0.01, 0.64),
      r('key', 'Shadow screen', 0, 1, 0.01, 0.9),
      r('text', 'Wordmark outline', 0, 1, 0.01, 0.7),
    ],
    colors: [c('ink', 'Ink', '#e02621'), c('key', 'Shadow ink', '#291f24'), c('paper', 'Paper', '#f6f4ed')],
    glsl: `
vec3 style_halftone(Ctx x){
  float cell = P0, a1 = radians(P1);
  float aa = x.px/cell*1.2;
  vec2 q1 = rot(a1)*x.p/cell;
  vec3 s1 = C((rot(-a1)*((floor(q1) + 0.5)*cell))*x.PU + 0.5);
  float r1 = sqrt(smoothstep(0.03, 0.95, 1.0 - min(s1.r, min(s1.g, s1.b))))*P2;
  float dot1 = 1.0 - smoothstep(r1 - aa, r1 + aa, length(fract(q1) - 0.5));
  float a2 = a1 + 0.524;
  vec2 q2 = rot(a2)*x.p/cell;
  vec3 s2 = C((rot(-a2)*((floor(q2) + 0.5)*cell))*x.PU + 0.5);
  float r2 = sqrt(1.0 - smoothstep(0.05, 0.50, max(s2.r, max(s2.g, s2.b))))*P2*0.86;
  float dot2 = 1.0 - smoothstep(r2 - aa, r2 + aa, length(fract(q2) - 0.5));
  vec3 col = C2*mix(vec3(1.0), C0, dot1)*mix(vec3(1.0), C1, dot2*P3);
  col = mix(col, C1, smoothstep(0.3, 0.9, sob(x.uv, x.tx*1.5*x.K, vec4(0.0, 0.0, 0.0, 1.0)))*P4*x.d.g);
  return col;
}`,
  },

  {
    id: 'pencil', name: 'coloured pencil',
    blurb: 'Cross-hatching that builds with shadow; graphite outlines.',
    params: [
      r('freq', 'Stroke density', 200, 1400, 10, 650),
      r('pressure', 'Pressure', 0, 1, 0.01, 0.85),
      r('wash', 'Colour fill', 0, 1, 0.01, 0.35),
      r('outline', 'Outline', 0, 1, 0.01, 0.8),
      r('text', 'Wordmark outline', 0, 1, 0.01, 0.8),
    ],
    colors: [c('red', 'Colour pencil', '#cc2b26'), c('graphite', 'Graphite', '#616166'), c('paper', 'Paper', '#f9f7f5')],
    glsl: `
vec3 style_pencil(Ctx x){
  vec2 p = x.p;
  vec3 pap = paper(p, C2);
  float tooth = vn(p*900.0);
  float tone = clamp(1.0 - lum(x.col)*1.05, 0.0, 1.0);
  float n1 = fbm(p*25.0);
  float L1 = smoothstep(0.45, 0.9, sin(dot(p, vec2(0.8, 0.6))*P0 + n1*3.0));
  float L2 = smoothstep(0.45, 0.9, sin(dot(p, vec2(-0.6, 0.8))*P0 + n1*3.0));
  float L3 = smoothstep(0.45, 0.9, sin(dot(p, vec2(0.98, -0.2))*P0*1.23 + n1*2.0));
  float sh = L1*smoothstep(0.06, 0.2, tone) + L2*smoothstep(0.45, 0.6, tone) + L3*smoothstep(0.7, 0.85, tone);
  sh = clamp(sh, 0.0, 1.0)*(0.55 + 0.45*tooth);
  vec3 col = mix(pap, mix(C1, C0, x.d.g), sh*P1);
  col = mix(col, mix(col, C0, P2), x.d.g*(0.5 + 0.5*tooth));
  col = mix(col, C1*0.8, smoothstep(0.3, 1.2, sob(x.uv, x.tx*1.2*x.K, vec4(0.0, 1.0, 0.0, 0.0)))*P3*(0.6 + 0.4*tooth));
  col = mix(col, C0*0.55, smoothstep(0.2, 0.8, sob(x.uv, x.tx*1.5*x.K, vec4(0.0, 0.0, 0.0, 1.0)))*P4*x.d.g);
  col = mix(col, C1, smoothstep(0.05, 0.6, x.d.b)*0.8);
  return col;
}`,
  },

  {
    id: 'dither', name: 'dither',
    blurb: 'Ordered (Bayer) dither in three inks.',
    params: [
      r('pixel', 'Pixel size', 1, 10, 1, 3),
      r('low', 'Dark point', 0, 1, 0.01, 0.12),
      r('mid', 'Mid point', 0, 1, 0.01, 0.33),
      r('high', 'Light point', 0, 1, 0.01, 0.95),
      r('text', 'Wordmark knockout', 0, 1, 0.01, 1),
    ],
    colors: [c('dark', 'Dark', '#5c080d'), c('mid', 'Mid', '#e01f17'), c('light', 'Light', '#ffffff')],
    glsl: `
vec3 style_dither(Ctx x){
  float s = max(1.0, floor(P0*x.K + 0.5));
  vec2 cp = floor(x.fc/s);
  vec2 cuv = (cp + 0.5)*s/uRes;
  float v = lum(C(cuv));
  float xx = v < P2 ? clamp((v - P1)/max(P2 - P1, 1e-3), 0.0, 1.0) : 1.0 + clamp((v - P2)/max(P3 - P2, 1e-3), 0.0, 1.0);
  float idx = floor(xx + bayer8(cp));
  vec3 col = idx < 0.5 ? C0 : (idx < 1.5 ? C1 : C2);
  return mix(col, C2, smoothstep(0.3, 0.45, D(cuv).a)*P4);
}`,
  },

  {
    id: 'pixel', name: 'pixel',
    blurb: 'Low resolution with a six-step palette built from three colours.',
    params: [
      r('res', 'Resolution', 16, 260, 1, 120),
      r('text', 'Wordmark knockout', 0, 1, 0.01, 1),
    ],
    colors: [c('main', 'Main', '#db1a12'), c('light', 'Light', '#ffffff'), c('dark', 'Dark', '#330d0f')],
    glsl: `
vec3 style_pixel(Ctx x){
  float s = uRes.y/P0;
  vec2 cp = floor(x.fc/s);
  vec2 cuv = (cp + 0.5)*s/uRes;
  vec3 c = C(cuv);
  vec3 b = C1;
  b = nearer(c, b, mix(C0, C1, 0.85));
  b = nearer(c, b, mix(C0, C1, 0.5));
  b = nearer(c, b, C0);
  b = nearer(c, b, mix(C0, C2, 0.5));
  b = nearer(c, b, C2);
  return mix(b, C1, step(0.38, D(cuv).a)*P1);
}`,
  },

  {
    id: 'dream', name: 'dream',
    blurb: 'Bloom, halation, colour fringing and grain.',
    params: [
      r('bloom', 'Bloom', 0, 1, 0.01, 0.4),
      r('halation', 'Halation', 0, 1, 0.01, 0.28),
      r('radius', 'Halation radius', 0.02, 0.4, 0.005, 0.13),
      r('fringe', 'Colour fringe', 0, 0.05, 0.001, 0.014),
      r('grain', 'Grain', 0, 0.15, 0.005, 0.03),
      r('vignette', 'Vignette', 0, 0.5, 0.01, 0.07),
    ],
    colors: [c('haze', 'Haze', '#ffedf2')],
    glsl: `
vec3 style_dream(Ctx x){
  vec2 dir = x.uv - 0.5;
  vec3 ca = vec3(C(x.uv + dir*P3).r, C(x.uv).g, C(x.uv - dir*P3).b);
  vec3 b1 = vec3(0.0), b2 = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    float fi = float(i), a = fi*2.39996, rr = sqrt((fi + 0.5)/24.0);
    vec2 o = vec2(cos(a), sin(a))*rr;
    b1 += C(x.uv + o*0.035*x.PU*2.0);
    b2 += C(x.uv + o*P2*x.PU*2.0);
  }
  b1 /= 24.0; b2 /= 24.0;
  vec3 col = mix(ca, b1, P0);
  col = mix(col, b2, P1);
  col = col*0.9 + 0.1*C0;
  col += (h21(x.fc + fract(uT)*91.0) - 0.5)*P4;
  col *= 1.0 - P5*smoothstep(0.5, 1.45, length(x.p));
  return col;
}`,
  },

  {
    id: 'woodblock', name: 'woodblock',
    blurb: 'Flat tones from the sphere colour, black keyline, wood grain and a faded sky.',
    params: [
      r('noise', 'Tone wobble', 0, 0.4, 0.01, 0.1),
      r('keyline', 'Keyline width', 0, 5, 0.1, 1.8),
      r('bokashi', 'Sky gradient', 0, 1, 0.01, 0.6),
      r('grain', 'Wood grain', 0, 0.3, 0.01, 0.07),
      r('text', 'Wordmark keyline', 0, 1, 0.01, 1),
    ],
    colors: [c('paper', 'Paper', '#f0e6d1'), c('sky', 'Sky', '#e6b8a8'), c('ink', 'Keyline', '#1a1412')],
    glsl: `
vec3 style_woodblock(Ctx x){
  vec2 p = x.p;
  float grain = fbm(vec2(p.x*1.5, p.y*28.0) + fbm(p*2.0)*3.0);
  vec3 bg = C0*(1.0 - P3*0.7 + P3*grain);
  bg = mix(bg, C1, smoothstep(0.30, 1.0, p.y)*P2);
  float l = x.d.r + (fbm(p*9.0) - 0.5)*P0;
  vec3 S = uSphereCol;
  vec3 tone = l < 0.36 ? S*0.57 : (l < 0.70 ? S*0.94 : (l < 0.92 ? mix(S, vec3(1.0), 0.42) : C0));
  tone *= 0.93 + 0.09*fbm(p*70.0);
  vec3 col = mix(bg, tone, x.d.g);
  float key = smoothstep(0.35, 1.3, sob(x.uv, x.tx*max(P1, 0.01)*x.K, vec4(0.0, 1.0, 0.0, 0.0)))*step(0.01, P1);
  float kl = smoothstep(0.25, 0.8, sob(x.uv, x.tx*1.5*x.K, vec4(0.0, 0.0, 0.0, 1.0)))*x.d.g*P4;
  return mix(col, C2, max(max(key, kl), smoothstep(0.1, 0.6, x.d.b))*(0.85 + 0.15*vn(p*200.0)));
}`,
  },

  {
    id: 'linocut', name: 'linocut',
    blurb: 'Solid ink with carved lines around the highlight, gouged shadow.',
    params: [
      r('lines', 'Carve frequency', 40, 500, 1, 190),
      r('carve', 'Carve amount', 0, 1, 0.01, 0.85),
      r('specks', 'Ink specks', 0, 0.5, 0.01, 0.14),
      r('shadow', 'Gouged shadow', 0, 1, 0.01, 0.9),
      r('outline', 'Wordmark outline', 0, 1, 0.01, 0),
      r('fill', 'Wordmark carved out', 0, 1, 0.01, 1),
    ],
    colors: [c('ink', 'Ink', '#cc1f1a'), c('paper', 'Paper', '#f2ede0')],
    glsl: `
vec3 style_linocut(Ctx x){
  vec2 p = x.p, q = x.q;
  float inside = 1.0 - smoothstep(uR - 0.0015, uR + 0.0015, length(q) + (fbm(p*30.0) - 0.5)*0.006);
  float light = x.d.g > 0.01 ? x.d.r : 0.5;
  float stripes = 0.5 + 0.5*sin(length(q - vec2(-0.40, 0.45)*uR)*P0 + fbm(p*10.0)*2.0);
  float w = smoothstep(0.30, 0.98, light)*P1;
  float cut = smoothstep(1.0 - w, 1.0 - w + 0.06, stripes);
  float a = inside*(1.0 - cut)*(1.0 - step(1.0 - P2, vn(p*350.0))*0.8);
  a *= 1.0 - smoothstep(0.2, 0.7, sob(x.uv, x.tx*1.6*x.K, vec4(0.0, 0.0, 0.0, 1.0)))*x.d.g*P4;
  a *= 1.0 - smoothstep(0.30, 0.45, x.d.a)*P5;
  vec3 col = mix(C1, C0, a);
  float shadow = clamp((1.0 - lum(x.col)/max(lum(uBgCol), 0.01))*14.0, 0.0, 1.0)*(1.0 - inside)*step(q.y, -uR*0.9);
  float g = smoothstep(0.3, 0.7, sin(p.y*900.0 + fbm(p*20.0)*2.0))*step(0.35, vn(vec2(p.x*20.0, p.y*400.0)));
  col = mix(col, C0, g*shadow*P3);
  return mix(col, C0, smoothstep(0.1, 0.5, x.d.b));
}`,
  },

  {
    id: 'contour', name: 'contour',
    blurb: 'Topographic lines traced from the lighting.',
    params: [
      r('lines', 'Line count', 3, 60, 1, 18),
      r('width', 'Line width', 0.3, 4, 0.05, 1),
      r('textLines', 'Wordmark lines', 0, 10, 1, 3),
      r('rings', 'Shadow rings', 0, 6, 1, 3),
      r('outline', 'Sphere outline', 0, 1, 0.01, 1),
      r('fill', 'Wordmark fill', 0, 1, 0.01, 0),
    ],
    colors: [c('line', 'Lines', '#d91f17'), c('shadow', 'Shadow rings', '#c7c7c7'), c('bg', 'Background', '#ffffff')],
    glsl: `
vec3 style_contour(Ctx x){
  vec2 uv = x.uv, tx = x.tx; float K = x.K;
  vec3 col = C2;
  float gx = D(uv + vec2(tx.x, 0.0)).r - D(uv - vec2(tx.x, 0.0)).r;
  float gy = D(uv + vec2(0.0, tx.y)).r - D(uv - vec2(0.0, tx.y)).r;
  float g = length(vec2(gx, gy))*0.5 + 1e-5;
  float f = fract(x.d.r*P0);
  float iso = 1.0 - smoothstep(0.3*K*P1, 1.3*K*P1, min(f, 1.0 - f)/(g*P0));
  float core = min(min(D(uv + vec2(3.0*tx.x, 0.0)).g, D(uv - vec2(3.0*tx.x, 0.0)).g),
                   min(D(uv + vec2(0.0, 3.0*tx.y)).g, D(uv - vec2(0.0, 3.0*tx.y)).g));
  col = mix(col, C0, iso*step(0.99, core)*0.9);
  if (P2 > 0.5) {
    float ax = D(uv + vec2(tx.x, 0.0)).a - D(uv - vec2(tx.x, 0.0)).a;
    float ay = D(uv + vec2(0.0, tx.y)).a - D(uv - vec2(0.0, tx.y)).a;
    float ga = length(vec2(ax, ay))*0.5 + 1e-5;
    float fa = fract(x.d.a*P2 + 0.5);
    col = mix(col, C0, (1.0 - smoothstep(0.3*K*P1, 1.2*K*P1, min(fa, 1.0 - fa)/(ga*P2)))*step(0.03, x.d.a)*0.9);
  }
  col = mix(col, C0, smoothstep(0.35, 0.5, x.d.a)*P5);
  col = mix(col, C0, smoothstep(0.3, 1.1, sob(uv, tx*K, vec4(0.0, 1.0, 0.0, 0.0)))*P4);
  col = mix(col, C0, smoothstep(0.05, 0.5, x.d.b));
  float sr = length((x.q - vec2(0.0, -uR - uShadowDist))/vec2(uR*0.95, uR*0.11));
  for (int k = 1; k <= 6; k++) {
    if (float(k) > P3) break;
    float e = abs(sr - float(k)*0.55)*uR*0.11;
    col = mix(col, C1, (1.0 - smoothstep(0.0, x.px*1.2*P1, e))*(1.0 - x.d.g));
  }
  return col;
}`,
  },

  {
    id: 'vhs', name: 'vhs',
    blurb: 'Tracking wobble, chroma bleed, scanlines, tape noise.',
    params: [
      r('jitter', 'Tracking wobble', 0, 4, 0.01, 1),
      r('chroma', 'Chroma shift', 0, 0.02, 0.0005, 0.0035),
      r('scan', 'Scanlines', 0, 0.5, 0.01, 0.1),
      r('noise', 'Noise', 0, 0.3, 0.005, 0.08),
      r('vignette', 'Vignette', 0, 0.6, 0.01, 0.18),
      r('sat', 'Saturation', 0, 1.5, 0.01, 0.85),
    ],
    colors: [],
    glsl: `
vec3 style_vhs(Ctx x){
  vec2 fc = x.fc, uv = x.uv; float K = x.K;
  float ph = uT/uLoop;
  float line = floor(fc.y/(2.0*K));
  float band = 1.0 - smoothstep(0.0, 0.03, abs(fract(uv.y - ph) - 0.5));
  float jit = ((vn(vec2(line*0.07, uT*6.0)) - 0.5)*0.0025 + band*(h21(vec2(line, floor(uT*30.0))) - 0.5)*0.02)*P0;
  vec2 u2 = uv + vec2(jit, 0.0);
  vec3 c = vec3(C(u2 + vec2(P1, 0.0)).r, C(u2).g, C(u2 - vec2(P1, 0.0)).b);
  vec3 bl = (C(u2 + vec2(0.002, 0.0)) + C(u2 + vec2(0.004, 0.0)) + C(u2 - vec2(0.002, 0.0)))/3.0;
  c = mix(c, bl, 0.35);
  c = mix(vec3(lum(c)), c, P5)*vec3(1.02, 0.98, 0.95);
  float s = sin(fc.y/K*PI*0.5);
  c *= 1.0 - P2 + P2*s*s;
  c += (h21(floor(fc/K) + floor(uT*24.0)) - 0.5)*P3;
  c += band*0.08*h21(fc*0.3 + uT)*P0;
  c *= 1.0 - P4*smoothstep(0.6, 1.5, length(x.p));
  return c;
}`,
  },
];
