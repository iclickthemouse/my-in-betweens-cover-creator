// The 3D scene: sphere with embossed wordmark, orbit, trail, echoes, background.
// Rendered twice per frame: a colour pass (uData = 0) and a data pass (uData = 1)
// that styles use for clean edges:
//   R = lighting on the sphere (1 elsewhere) · G = sphere mask · B = orbit/trail/satellite · A = wordmark height

export const SCENE_FS = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uT, uLoop, uData;
uniform sampler2D uTex;

uniform vec2 uCenter;
uniform float uRadius, uBreathe, uBreatheCycles;
uniform float uSway, uSwayCycles, uSpin, uYaw0, uPitch0, uPitchWob;

uniform float uEmboss, uEmbossAO, uTintAmt;
uniform vec3 uTint;

uniform vec3 uBase, uShade, uHiCol, uSpecCol, uRimCol, uLight;
uniform float uHiAmt, uWrap, uGloss, uShine, uSheen, uRim, uBounce;

uniform vec3 uBg, uGlowCol;
uniform float uBgShadow, uBgShadowDist, uGlow, uGrain, uVignette;

uniform float uOrbit, uOrbitR, uTilt, uRoll, uOrbitSpeed, uOrbitPhase, uSatSize, uPathOp;
uniform vec3 uOrbitCol;
uniform float uTrail, uTrailLen, uTrailW0, uTrailW1, uTrailOp;

uniform float uEcho, uEchoN, uEchoSpread, uEchoOp, uEchoRate;
uniform vec3 uEchoCol;

#define PI 3.14159265
#define TAU 6.2831853
float gLight = 1.0;

vec3 ry(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z); }
vec3 rx(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(v.x, c*v.y - s*v.z, s*v.y + c*v.z); }
vec3 rz(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(c*v.x - s*v.y, s*v.x + c*v.y, v.z); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

vec3 orb(float th){
  vec3 q = vec3(uOrbitR*cos(th), 0.0, uOrbitR*sin(th));
  return rz(rx(q, uTilt), uRoll);
}

vec3 sphereShade(vec2 qs, float R, float yaw, float pitch, out float hOut){
  vec2 q = qs / R;
  vec3 n = vec3(q, sqrt(max(1.0 - dot(q,q), 0.0)));
  vec3 no = ry(rx(n, -pitch), -yaw);
  float lon = atan(no.x, no.z);
  float lat = asin(clamp(no.y, -1.0, 1.0));
  vec2 uv = vec2(lon/TAU + 0.5, 0.5 - lat/PI);
  vec2 e = vec2(1.6/2048.0, 1.6/1024.0);
  float h  = texture2D(uTex, uv).r;
  float hu = texture2D(uTex, uv + vec2(e.x,0.0)).r - texture2D(uTex, uv - vec2(e.x,0.0)).r;
  float hv = texture2D(uTex, uv - vec2(0.0,e.y)).r - texture2D(uTex, uv + vec2(0.0,e.y)).r;
  vec3 To = vec3(cos(lon), 0.0, -sin(lon));
  vec3 Bo = vec3(-sin(lat)*sin(lon), cos(lat), -sin(lat)*cos(lon));
  vec3 T = rx(ry(To, yaw), pitch);
  vec3 B = rx(ry(Bo, yaw), pitch);
  vec3 nn = normalize(n - uEmboss*(hu*T + hv*B));
  hOut = h;

  vec3 L = uLight;
  float ndl = dot(nn, L);
  float diff = clamp((ndl + uWrap)/(1.0 + uWrap), 0.0, 1.0);
  vec3 alb = mix(uBase, uTint, smoothstep(0.3, 0.7, h)*uTintAmt);
  vec3 c = mix(uShade, alb, smoothstep(0.0, 1.0, diff));
  c = mix(c, uHiCol, pow(max(ndl, 0.0), 4.0)*uHiAmt);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = clamp(dot(nn, H), 0.0, 1.0);
  c += uSpecCol*(pow(nh, uShine)*uGloss + pow(nh, 14.0)*uSheen);
  float fr = clamp(1.0 - nn.z, 0.0, 1.0);
  c = mix(c, uRimCol, fr*fr*fr*uRim);
  c += uBase*0.35*max(-nn.y, 0.0)*uBounce;
  c *= 1.0 - uEmbossAO*smoothstep(0.02, 0.35, h)*(1.0 - smoothstep(0.45, 0.95, h));
  gLight = clamp(diff*0.85 + pow(nh, 60.0)*0.4, 0.0, 1.0);
  return c;
}

vec3 headShade(vec2 p, vec2 c0, float r){
  vec2 q = (p - c0)/r;
  if (dot(q,q) > 1.5) q = normalize(q);
  vec3 n = normalize(vec3(q, sqrt(max(1.0 - dot(q,q), 0.0))));
  float d = clamp((dot(n, uLight) + 0.35)/1.35, 0.0, 1.0);
  vec3 c = mix(uOrbitCol*0.45, uOrbitCol, d);
  c += pow(max(dot(n, normalize(uLight + vec3(0.0,0.0,1.0))), 0.0), 40.0)*0.6;
  return c;
}

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/uRes.y*2.0;
  vec2 q = p - uCenter;
  float px = 2.0/uRes.y;
  float w = TAU*uT/uLoop;

  float b = 1.0 + uBreathe*sin(uBreatheCycles*w);
  float R = uRadius*b;
  float yaw = uYaw0 + uSway*sin(uSwayCycles*w) + uSpin*w;
  float pitch = uPitch0 + uPitchWob*cos(w);
  float d = length(q);

  vec3 col = uBg;
  vec2 sp = (q - vec2(0.0, -R - uBgShadowDist))/vec2(R*0.95, R*0.11);
  col *= 1.0 - (uBgShadow/b)*exp(-dot(sp,sp)*1.4);
  col = mix(col, uGlowCol, uGlow*exp(-max(d - R, 0.0)*11.0));

  if (uEcho > 0.5) {
    for (int k = 0; k < 8; k++) {
      if (float(k) >= uEchoN) break;
      float ph = fract(uT/uLoop*uEchoRate + float(k)/uEchoN);
      float wdt = 0.0015 + ph*0.012;
      float rq = (d - (R + ph*uEchoSpread))/wdt;
      col = mix(col, uEchoCol, exp(-rq*rq)*(1.0 - ph)*(1.0 - ph)*uEchoOp);
    }
  }

  float trailF = 0.0, trailB = 0.0, pathF = 0.0, pathB = 0.0;
  float th = uOrbitSpeed*w + uOrbitPhase;
  if (uOrbit > 0.5) {
    if (uPathOp > 0.001) {
      vec3 prev = orb(0.0);
      for (int i = 1; i <= 96; i++) {
        vec3 cur = orb(float(i)*TAU/96.0);
        vec2 a = prev.xy, ba = cur.xy - a, pa = q - a;
        float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
        float v = smoothstep(px*1.2, 0.0, length(pa - ba*h));
        if (mix(prev.z, cur.z, h) < 0.0) pathB = max(pathB, v); else pathF = max(pathF, v);
        prev = cur;
      }
    }
    if (uTrail > 0.5) {
      float dirS = uOrbitSpeed > 0.0 ? -1.0 : 1.0;
      float stp = uTrailLen/80.0;
      vec3 prev = orb(th);
      for (int i = 1; i <= 80; i++) {
        vec3 cur = orb(th + dirS*float(i)*stp);
        vec2 a = prev.xy, ba = cur.xy - a, pa = q - a;
        float h = clamp(dot(pa,ba)/max(dot(ba,ba), 1e-9), 0.0, 1.0);
        float dist = length(pa - ba*h);
        float f = 1.0 - (float(i) - 1.0 + h)/80.0;
        float wdt = max(uTrailW0*f + uTrailW1*(1.0 - f), px);
        float dq = dist/wdt;
        float v = pow(max(f, 0.0), 1.6)*exp(-dq*dq)*mix(0.35, 1.0, f);
        if (mix(prev.z, cur.z, h) < 0.0) trailB = max(trailB, v); else trailF = max(trailF, v);
        prev = cur;
      }
    }
  }

  vec3 hp = orb(th);
  float hr = uSatSize*b;
  float hA = smoothstep(hr + px, hr - px, length(q - hp.xy))*uOrbit*step(0.0005, uSatSize);

  col = mix(col, uOrbitCol, pathB*uPathOp);
  col = mix(col, uOrbitCol, trailB*uTrailOp);
  if (hp.z < 0.0) col = mix(col, headShade(q, hp.xy, hr), hA);

  float sA = smoothstep(R + px, R - px, d);
  float hh = 0.0;
  if (sA > 0.0) col = mix(col, sphereShade(q, R, yaw, pitch, hh), sA);

  vec3 lite = mix(uOrbitCol, mix(uOrbitCol, vec3(1.0), 0.75), sA);
  col = mix(col, lite, pathF*uPathOp*mix(1.0, 1.8, sA));
  col = mix(col, lite, trailF*uTrailOp);
  if (hp.z >= 0.0) col = mix(col, headShade(q, hp.xy, hr), hA);

  if (uData > 0.5) {
    float behind = 1.0 - sA;
    float pathW = uPathOp > 0.01 ? 0.5 : 0.0;
    float cover = max(max(trailF*uTrail, pathF*pathW), max(trailB*uTrail, pathB*pathW)*behind);
    float head = hA*(hp.z >= 0.0 ? 1.0 : behind);
    gl_FragColor = vec4(sA > 0.0 ? mix(1.0, gLight, sA) : 1.0, sA, max(cover, head), hh*sA);
    return;
  }

  col *= 1.0 - uVignette*smoothstep(0.5, 1.6, length(p));
  col += (hash(gl_FragCoord.xy + fract(uT*7.0)*311.0) - 0.5)*uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
