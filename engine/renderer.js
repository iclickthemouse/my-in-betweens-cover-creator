// Renderer: scene colour pass + data pass into textures, then the style pass to the canvas.
// Every schema item with a `u` is pushed to whichever program declares that uniform.

import * as G from './gl.js';
import { SCENE_FS } from './scene.js';
import { buildPostFS } from './post.js';
import { Wordmark } from './wordmark.js';
import { STYLES } from '../styles.js';
import { SCHEMA } from '../schema.js';

const D2R = Math.PI / 180;

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    const gl = (this.gl = G.createGL(canvas));
    this.scene = G.program(gl, SCENE_FS);
    this.post = G.program(gl, buildPostFS(STYLES));
    this.word = new Wordmark(gl);
    this.items = SCHEMA.flatMap(g => g.items).filter(i => i.u);
    this.targets = null;
  }

  resize(n) { this.cv.width = this.cv.height = n; }

  ensureTargets() {
    const { gl, cv } = this;
    if (this.targets && this.targets.w === cv.width && this.targets.h === cv.height) return;
    if (this.targets) { G.freeTarget(gl, this.targets.col); G.freeTarget(gl, this.targets.dat); }
    this.targets = { w: cv.width, h: cv.height, col: G.target(gl, cv.width, cv.height), dat: G.target(gl, cv.width, cv.height) };
  }

  common(prog, S, t) {
    const gl = this.gl, U = prog.u;
    const f = (n, v) => { if (U[n]) gl.uniform1f(U[n], v); };
    const v3 = (n, v) => { if (U[n]) gl.uniform3fv(U[n], v); };
    for (const it of this.items) {
      const val = S[it.key];
      if (it.ut === 'c') v3(it.u, G.hex(val));
      else if (it.ut === 'deg') f(it.u, val * D2R);
      else if (it.ut === 'b') f(it.u, val ? 1 : 0);
      else f(it.u, +val);
    }
    if (U.uRes) gl.uniform2f(U.uRes, this.cv.width, this.cv.height);
    if (U.uCenter) gl.uniform2f(U.uCenter, S.posX, S.posY);
    f('uT', t);
    return { f, v3 };
  }

  render(S, t) {
    const gl = this.gl;
    this.word.update(S);
    this.ensureTargets();
    gl.viewport(0, 0, this.cv.width, this.cv.height);

    // scene → colour + data
    gl.useProgram(this.scene.pr);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.word.tex);
    if (this.scene.u.uTex) gl.uniform1i(this.scene.u.uTex, 0);
    const s = this.common(this.scene, S, t);
    const az = S.lightAz * D2R, el = S.lightEl * D2R;
    s.v3('uLight', [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets.col.f); s.f('uData', 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets.dat.f); s.f('uData', 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // style pass → canvas
    gl.useProgram(this.post.pr);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.targets.col.t);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.targets.dat.t);
    const U = this.post.u;
    if (U.uCol) gl.uniform1i(U.uCol, 1);
    if (U.uDat) gl.uniform1i(U.uDat, 2);
    const p = this.common(this.post, S, t);
    const si = Math.max(0, STYLES.findIndex(x => x.id === S.style));
    const sd = STYLES[si], sv = (S.styleParams || {})[sd.id] || {};
    const P = new Float32Array(8);
    sd.params.forEach((q, i) => { P[i] = sv[q.key] ?? q.def; });
    if (U.uP) gl.uniform1fv(U.uP, P);
    ['uC0', 'uC1', 'uC2'].forEach((n, i) => {
      const c = sd.colors[i];
      p.v3(n, G.hex(c ? sv[c.key] ?? c.def : '#ffffff'));
    });
    p.f('uStyle', si);
    const w = (2 * Math.PI * t) / S.loop;
    p.f('uR', S.radius * (1 + S.breathe * Math.sin(S.breatheCycles * w)));
    p.f('uShadowDist', S.bgShadowDist);
    p.v3('uSphereCol', G.hex(S.base));
    p.v3('uBgCol', G.hex(S.bg));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
