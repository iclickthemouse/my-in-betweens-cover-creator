// Small WebGL1 helpers: context, programs (with uniform lookup), render targets, colour parsing.

const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

export function createGL(canvas) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL is not available in this browser.');
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  return gl;
}

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    console.error(log + '\n' + src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}  ${l}`).join('\n'));
    throw new Error('Shader compile error:\n' + log);
  }
  return s;
}

// Returns { pr, u } where u maps uniform name → location (arrays keyed without "[0]").
export function program(gl, fsSource) {
  const pr = gl.createProgram();
  gl.attachShader(pr, shader(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(pr, shader(gl, gl.FRAGMENT_SHADER, fsSource));
  gl.bindAttribLocation(pr, 0, 'a');
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('Program link error:\n' + gl.getProgramInfoLog(pr));
  const u = {};
  const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(pr, i).name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(pr, name);
  }
  return { pr, u };
}

export function target(gl, w, h) {
  gl.activeTexture(gl.TEXTURE3);
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { t, f };
}

export function freeTarget(gl, tg) {
  gl.deleteTexture(tg.t);
  gl.deleteFramebuffer(tg.f);
}

export function hex(h) {
  const n = parseInt(String(h || '#ffffff').slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
