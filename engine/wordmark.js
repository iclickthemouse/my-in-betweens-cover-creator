// Draws the wordmark into an equirectangular height map (2048×1024) that wraps the sphere.
// White = raised. Longitude 0 (texture centre) faces the viewer.

const W = 2048, H = 1024;
const KEYS = ['text', 'font', 'weight', 'italic', 'textCase', 'textWidth', 'textMaxH', 'tracking',
  'lineHeight', 'textLon', 'textLat', 'textRot', 'embossSoft', 'embossCrisp'];

export class Wordmark {
  constructor(gl) {
    this.gl = gl;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.tex = gl.createTexture();
    this.key = '';
    this.ctx.fillRect(0, 0, W, H);
    this.upload();
  }

  // Cheap to call every frame: only redraws when a text-related setting changed.
  update(s) {
    const key = JSON.stringify(KEYS.map(k => s[k]));
    if (key === this.key) return;
    this.key = key;
    this.draw(s); // draw now with whatever is loaded, redraw once the font arrives
    const spec = `${s.italic ? 'italic ' : ''}${s.weight} 80px "${s.font}"`;
    document.fonts.load(spec, s.text || 'a').then(() => { if (this.key === key) this.draw(s); }).catch(() => {});
  }

  draw(s) {
    const x = this.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.filter = 'none'; x.globalAlpha = 1;
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);

    let text = s.text || '';
    if (s.textCase === 'lowercase') text = text.toLowerCase();
    if (s.textCase === 'uppercase') text = text.toUpperCase();
    const lines = text.split('\n');
    const fam = `"${s.font}", "Helvetica Neue", Arial, sans-serif`;
    const ital = s.italic ? 'italic ' : '';
    const spacing = 'letterSpacing' in x;

    x.font = `${ital}${s.weight} 100px ${fam}`;
    if (spacing) x.letterSpacing = `${(s.tracking * 100) / 72}px`;
    const maxW = Math.max(1, ...lines.map(l => x.measureText(l).width));
    const fs = Math.max(4, Math.min((s.textMaxH / 180) * H, (100 * ((s.textWidth / 360) * W)) / maxW));
    x.font = `${ital}${s.weight} ${fs}px ${fam}`;
    if (spacing) x.letterSpacing = `${(s.tracking * fs) / 72}px`;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';

    const cx = W / 2 + (s.textLon / 360) * W, cy = H / 2 - (s.textLat / 180) * H;
    const lh = fs * s.lineHeight, y0 = (-(lines.length - 1) * lh) / 2;
    const pass = (blur, alpha) => {
      x.filter = blur > 0 ? `blur(${blur}px)` : 'none';
      x.globalAlpha = alpha;
      for (const dx of [-W, 0, W]) {           // draw wrapped copies so text can cross the seam
        x.setTransform(1, 0, 0, 1, cx + dx, cy);
        x.rotate((s.textRot * Math.PI) / 180);
        lines.forEach((l, i) => x.fillText(l, 0, y0 + i * lh + fs * 0.04));
      }
    };
    pass(s.embossSoft, 1);
    if (s.embossCrisp > 0) pass(s.embossSoft * 0.4, s.embossCrisp);
    x.setTransform(1, 0, 0, 1, 0, 0); x.filter = 'none'; x.globalAlpha = 1;
    this.upload();
  }

  upload() {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}
