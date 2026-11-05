import { Renderer } from './engine/renderer.js';
import { SCHEMA, defaults } from './schema.js';
import { STYLES } from './styles.js';
import { PRESETS } from './presets.js';
import { buildPanel, makeControl, el } from './ui/panel.js';

const STORE = 'orb-cover-engine-v1';
const $ = id => document.getElementById(id);
const canvas = $('c');

let renderer;
try { renderer = new Renderer(canvas); }
catch (e) { document.body.append(el('pre', { class: 'error' }, String(e.message || e))); throw e; }

// ── state ──────────────────────────────────────────────────────────────
const fresh = () => ({ ...defaults(), styleParams: {} });
const clone = o => JSON.parse(JSON.stringify(o));
let state = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(STORE));
  if (saved) state = { ...fresh(), ...saved };
} catch {}

const styleDef = () => STYLES.find(s => s.id === state.style) || STYLES[0];
function styleVals(id) {
  const sd = STYLES.find(s => s.id === id);
  const v = (state.styleParams[id] ||= {});
  for (const p of [...sd.params, ...sd.colors]) if (v[p.key] === undefined) v[p.key] = p.def;
  return v;
}

// ── history + persistence ──────────────────────────────────────────────
let hist = [JSON.stringify(state)], hi = 0, histTimer;
function commit() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  clearTimeout(histTimer);
  histTimer = setTimeout(() => {
    const s = JSON.stringify(state);
    if (s === hist[hi]) return;
    hist = hist.slice(0, hi + 1); hist.push(s);
    if (hist.length > 300) hist.shift();
    hi = hist.length - 1;
  }, 250);
}
function applyState(s) {
  state = { ...fresh(), ...clone(s) };
  panel.refresh(); renderStyleParams();
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
}
function undo() { if (hi > 0) { hi--; applyState(JSON.parse(hist[hi])); } }
function redo() { if (hi < hist.length - 1) { hi++; applyState(JSON.parse(hist[hi])); } }

// ── panel ──────────────────────────────────────────────────────────────
const panel = buildPanel($('panel'), SCHEMA, () => state, onChange);
const slot = document.querySelector('[data-slot="style"]');

function onChange(key, v) {
  if (key === 'fontFile') { loadFontFile(v); return; }
  state[key] = v;
  if (key === 'style') renderStyleParams();
  commit();
}

function renderStyleParams() {
  const sd = styleDef();
  const vals = styleVals(sd.id);
  slot.replaceChildren();
  if (sd.blurb) slot.append(el('p', { class: 'blurb' }, sd.blurb));
  for (const p of sd.params) slot.append(makeControl({ type: 'range', ...p }, vals[p.key], v => { vals[p.key] = v; commit(); }).row);
  for (const c of sd.colors) slot.append(makeControl({ type: 'color', ...c }, vals[c.key], v => { vals[c.key] = v; commit(); }).row);
  if (sd.params.length || sd.colors.length) {
    slot.append(el('button', { class: 'mini', onclick: () => { delete state.styleParams[sd.id]; renderStyleParams(); commit(); } }, 'reset this style'));
  }
}
renderStyleParams();

function stepStyle(dir) {
  const i = STYLES.findIndex(s => s.id === state.style);
  state.style = STYLES[(i + dir + STYLES.length) % STYLES.length].id;
  panel.get('style').set(state.style);
  renderStyleParams(); commit();
  toast(styleDef().name);
}

async function loadFontFile(file) {
  try {
    const name = file.name.replace(/\.[^.]+$/, '');
    const face = new FontFace(name, await file.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    panel.get('font').addOption(name);
    state.font = name;
    panel.refresh(); commit();
    toast(`Loaded ${name} (re-upload after reloading the page)`);
  } catch (e) { toast('Could not read that font file'); }
}

// ── presets ────────────────────────────────────────────────────────────
const presetSel = $('preset');
presetSel.append(el('option', { value: '' }, 'Presets…'));
for (const name of Object.keys(PRESETS)) presetSel.append(el('option', { value: name }, name));
presetSel.addEventListener('change', () => {
  const p = PRESETS[presetSel.value];
  if (p) { applyState({ ...fresh(), ...clone(p) }); commit(); toast(presetSel.value); }
  presetSel.value = '';
});

// ── transport ──────────────────────────────────────────────────────────
let playing = true, t = 0, last = performance.now(), busy = false;
const playBtn = $('play'), scrub = $('scrub'), timeEl = $('time');
function setPlaying(v) { playing = v; playBtn.textContent = v ? '❚❚' : '▶'; }
playBtn.onclick = () => setPlaying(!playing);
scrub.addEventListener('input', () => { setPlaying(false); t = +scrub.value * state.loop; });
$('prevStyle').onclick = () => stepStyle(-1);
$('nextStyle').onclick = () => stepStyle(1);
$('undo').onclick = undo;
$('redo').onclick = redo;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!busy) {
    if (playing) t = (t + dt) % state.loop;
    if (t >= state.loop) t %= state.loop;
    renderer.render(state, t);
    scrub.value = t / state.loop;
    timeEl.textContent = `${t.toFixed(2)} / ${state.loop}s`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ── export ─────────────────────────────────────────────────────────────
const slug = () => `my-inbetweens-${styleDef().id}`;
function download(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

$('png').onclick = () => {
  const size = +$('size').value;
  busy = true;
  renderer.resize(size);
  renderer.render(state, t);
  canvas.toBlob(b => {
    download(b, `${slug()}-${size}.png`);
    renderer.resize(1600); busy = false;
  }, 'image/png');
};

$('rec').onclick = () => {
  const btn = $('rec');
  const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'];
  const mimeType = types.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mimeType) { toast('Video recording is not supported in this browser'); return; }
  btn.disabled = true;
  t = 0; setPlaying(true);
  const rec = new MediaRecorder(canvas.captureStream(60), { mimeType, videoBitsPerSecond: 20e6 });
  const chunks = [];
  rec.ondataavailable = e => chunks.push(e.data);
  rec.onstop = () => {
    download(new Blob(chunks, { type: mimeType }), `${slug()}-loop.${mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'}`);
    btn.disabled = false; btn.textContent = 'Record loop';
  };
  rec.start();
  const end = performance.now() + state.loop * 1000;
  const tick = () => {
    const left = Math.max(0, (end - performance.now()) / 1000);
    btn.textContent = `Recording… ${left.toFixed(1)}s`;
    if (left > 0) requestAnimationFrame(tick); else rec.stop();
  };
  tick();
};

$('saveJson').onclick = () => download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), `${slug()}-settings.json`);
$('loadJson').onclick = () => $('jsonFile').click();
$('jsonFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { applyState(JSON.parse(await f.text())); commit(); toast('Settings loaded'); }
  catch { toast('That file is not valid settings JSON'); }
});
$('copyJson').onclick = async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(state, null, 2)); toast('Settings copied'); }
  catch { toast('Clipboard not available'); }
};
$('reset').onclick = () => { applyState(fresh()); commit(); toast('Reset to defaults'); };

// ── keyboard ───────────────────────────────────────────────────────────
addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && document.activeElement.type !== 'range';
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { if (typing) return; e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { if (typing) return; e.preventDefault(); redo(); return; }
  if (typing) return;
  if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
  if (e.key === 'ArrowRight') { e.preventDefault(); stepStyle(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); stepStyle(-1); }
});

let toastTimer;
function toast(msg) {
  const tEl = $('toast');
  tEl.textContent = msg; tEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => tEl.classList.remove('show'), 1600);
}

// handy for debugging / scripting from the console
window.engine = { get state() { return state; }, applyState, renderer, STYLES };
