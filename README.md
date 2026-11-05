# my in-betweens · cover creator

A WebGL editor for the animated orb cover. No build step and no dependencies.

**Live:** https://iclickthemose.github.io/my-in-betweens-cover-creator/
**Original single-file prototype:** https://iclickthemose.github.io/my-in-betweens-cover-creator/prototype/

## Run it locally

The page uses ES modules, so it has to be served over http (opening the file directly won't work):

```bash
python -m http.server 8765
```

Then open http://localhost:8765.

## How it fits together

```
index.html          layout, fonts
main.js             state, panel wiring, presets, undo/redo, export, keyboard
schema.js           every editable setting → generates the panel and feeds the shaders
styles.js           style registry (GLSL + its own sliders/colours)
presets.js          starting points
engine/
  renderer.js       frame pipeline
  scene.js          sphere / emboss / orbit / trail / echo shader
  post.js           shared GLSL library for styles + legibility layer
  wordmark.js       draws the text into the height map that wraps the sphere
  gl.js             WebGL helpers
ui/panel.js         dependency-free controls
ui/editor.css
```

Each frame renders the scene twice into textures:

- **colour pass**: the finished realistic render
- **data pass**: R = lighting, G = sphere mask, B = orbit/trail, A = wordmark height

The style shader reads both, so a style can trace clean outlines, find the letters, or follow the lighting without guessing from colour.

## Add a setting

Add an item to `schema.js`. If it drives a shader, give it `u: 'uName'` (plus `ut: 'deg' | 'c' | 'b'` when needed) and declare `uniform float uName;` (or `vec3` for colours) in `scene.js` or `post.js`. The panel control appears automatically.

## Add a style

Append to `STYLES` in `styles.js`:

```js
{
  id: 'mystyle', name: 'my style', blurb: 'One line about it.',
  params: [ { key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.01, def: 0.5 } ], // P0..P7
  colors: [ { key: 'ink', label: 'Ink', def: '#cc2222' } ],                               // C0..C2
  glsl: `
vec3 style_mystyle(Ctx x){
  float letters = smoothstep(0.3, 0.45, x.d.a);   // wordmark mask
  return mix(x.col, C0, letters*P0);
}`,
}
```

What's available inside a style:

- **`x`**: `col`, `d`, `uv`, `p` (centred, ±1), `q` (relative to the sphere), `px`, `K`, `tx`, `PU`
- **Uniforms**: `uR` (sphere radius), `uCenter`, `uSphereCol`, `uBgCol`, `uT`, `uLoop`
- **Helpers**: `C(uv)`, `D(uv)`, `fbm`, `vn`, `h21`, `paper`, `sob`, `bayer8`, `rot`, `lum`, `nearer`

## Looping

Everything is driven by `t / loop`, and every "per loop" count is a whole number, so recordings loop seamlessly.
