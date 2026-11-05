// Every editable setting. The panel is generated from this list, and the renderer pushes any item
// with `u` into the shaders as that uniform.
//   ut: 'c' colour (hex → vec3) · 'deg' degrees → radians · 'b' boolean → 0/1 · default float
//   rebuild: changes the wordmark height map (handled automatically by engine/wordmark.js)

import { STYLES } from './styles.js';

export const FONTS = [
  'Inter Tight', 'Space Grotesk', 'Syne', 'Unbounded', 'Bricolage Grotesque', 'Archivo Black',
  'JetBrains Mono', 'Major Mono Display', 'DM Serif Display', 'Instrument Serif', 'Playfair Display',
  'Cormorant Garamond', 'Fraunces', 'Shippori Mincho', 'Zen Kaku Gothic New', 'Helvetica Neue', 'Georgia',
];

const range = (key, label, min, max, step, def, extra = {}) => ({ key, label, type: 'range', min, max, step, def, ...extra });
const color = (key, label, def, u) => ({ key, label, type: 'color', def, u, ut: 'c' });
const toggle = (key, label, def, u) => ({ key, label, type: 'toggle', def, u, ut: 'b' });

export const SCHEMA = [
  {
    id: 'wordmark', label: 'Wordmark', open: true, items: [
      { key: 'text', label: 'Text (Enter = new line)', type: 'textarea', def: 'my inbetweens' },
      { key: 'font', label: 'Font', type: 'select', options: FONTS, def: 'Inter Tight' },
      { key: 'fontFile', label: 'Upload font', type: 'file', accept: '.ttf,.otf,.woff,.woff2' },
      { key: 'weight', label: 'Weight', type: 'select', options: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], def: '600' },
      { key: 'italic', label: 'Italic', type: 'toggle', def: false },
      { key: 'textCase', label: 'Case', type: 'select', options: ['as typed', 'lowercase', 'uppercase'], def: 'as typed' },
      range('textWidth', 'Width', 10, 220, 1, 84, { unit: '°' }),
      range('textMaxH', 'Max size', 3, 60, 0.5, 12.5, { unit: '°' }),
      range('tracking', 'Letter spacing', -20, 80, 1, 2),
      range('lineHeight', 'Line height', 0.6, 2.5, 0.05, 1.1),
      range('textLon', 'Horizontal', -180, 180, 1, 0, { unit: '°' }),
      range('textLat', 'Vertical', -70, 70, 1, 0, { unit: '°' }),
      range('textRot', 'Rotate', -90, 90, 1, 0, { unit: '°' }),
    ],
  },
  {
    id: 'emboss', label: 'Emboss', open: true, items: [
      range('emboss', 'Depth (negative = pressed in)', -8, 8, 0.1, 2.6, { u: 'uEmboss' }),
      range('embossSoft', 'Softness', 0, 20, 0.5, 5, { unit: 'px' }),
      range('embossCrisp', 'Crisp face', 0, 1, 0.01, 0.55),
      range('embossAO', 'Letter shadow', 0, 0.6, 0.01, 0.1, { u: 'uEmbossAO' }),
      color('tint', 'Letter colour', '#ffffff', 'uTint'),
      range('tintAmt', 'Letter colour amount', 0, 1, 0.01, 0, { u: 'uTintAmt' }),
    ],
  },
  {
    id: 'style', label: 'Style', open: true, slot: true, items: [
      { key: 'style', label: 'Style', type: 'select', options: STYLES.map(s => ({ value: s.id, label: s.name })), def: 'original' },
    ],
  },
  {
    id: 'legibility', label: 'Wordmark legibility (any style)', open: true, items: [
      range('textBoost', 'Strength', 0, 1, 0.01, 0, { u: 'uTextBoost' }),
      { key: 'textMode', label: 'Mode', type: 'select', numeric: true, options: [{ value: 0, label: 'fill' }, { value: 1, label: 'outline' }], def: 0, u: 'uTextMode' },
      color('textColor', 'Colour', '#1c1514', 'uTextColor'),
      range('textThresh', 'Fill thinness', 0.05, 0.9, 0.01, 0.35, { u: 'uTextThresh' }),
      range('textWeight', 'Outline width', 0.5, 4, 0.05, 1.5, { u: 'uTextWeight' }),
    ],
  },
  {
    id: 'sphere', label: 'Sphere', items: [
      range('radius', 'Size', 0.1, 0.8, 0.005, 0.4, { u: 'uRadius' }),
      range('posX', 'Position X', -0.7, 0.7, 0.005, 0),
      range('posY', 'Position Y', -0.7, 0.7, 0.005, 0),
      color('base', 'Colour', '#e0170f', 'uBase'),
      color('shade', 'Shadow colour', '#570306', 'uShade'),
      color('hiCol', 'Lit core colour', '#fc4d38', 'uHiCol'),
      range('hiAmt', 'Lit core amount', 0, 1, 0.01, 0.3, { u: 'uHiAmt' }),
    ],
  },
  {
    id: 'light', label: 'Light & material', items: [
      range('lightAz', 'Light direction', -180, 180, 1, -35, { unit: '°' }),
      range('lightEl', 'Light height', -80, 85, 1, 33, { unit: '°' }),
      range('wrap', 'Soft wrap', 0, 1, 0.01, 0.35, { u: 'uWrap' }),
      range('gloss', 'Gloss', 0, 1.5, 0.01, 0.55, { u: 'uGloss' }),
      range('shine', 'Highlight tightness', 4, 400, 1, 110, { u: 'uShine' }),
      range('sheen', 'Broad sheen', 0, 0.5, 0.01, 0.08, { u: 'uSheen' }),
      color('specCol', 'Highlight colour', '#ffede8', 'uSpecCol'),
      range('rim', 'Rim light', 0, 1, 0.01, 0.32, { u: 'uRim' }),
      color('rimCol', 'Rim colour', '#ffa89e', 'uRimCol'),
      range('bounce', 'Floor bounce', 0, 1.5, 0.01, 0.45, { u: 'uBounce' }),
    ],
  },
  {
    id: 'rotation', label: 'Rotation', items: [
      range('spin', 'Full spins per loop', -3, 3, 1, 0, { u: 'uSpin' }),
      range('sway', 'Sway', 0, 60, 0.5, 11.5, { u: 'uSway', ut: 'deg', unit: '°' }),
      range('swayCycles', 'Sways per loop', 1, 6, 1, 1, { u: 'uSwayCycles' }),
      range('yaw0', 'Turn', -180, 180, 1, 0, { u: 'uYaw0', ut: 'deg', unit: '°' }),
      range('pitch0', 'Tilt', -60, 60, 0.5, -1.7, { u: 'uPitch0', ut: 'deg', unit: '°' }),
      range('pitchWob', 'Tilt wobble', 0, 30, 0.1, 2.9, { u: 'uPitchWob', ut: 'deg', unit: '°' }),
    ],
  },
  {
    id: 'background', label: 'Background', items: [
      color('bg', 'Colour', '#ffffff', 'uBg'),
      range('bgShadow', 'Floor shadow', 0, 0.5, 0.005, 0.075, { u: 'uBgShadow' }),
      range('bgShadowDist', 'Shadow distance', 0, 0.5, 0.005, 0.14, { u: 'uBgShadowDist' }),
      range('glow', 'Glow', 0, 0.6, 0.005, 0.07, { u: 'uGlow' }),
      color('glowCol', 'Glow colour', '#ff9e94', 'uGlowCol'),
      range('grain', 'Grain', 0, 0.1, 0.001, 0.014, { u: 'uGrain' }),
      range('vignette', 'Vignette', 0, 0.6, 0.01, 0, { u: 'uVignette' }),
    ],
  },
  {
    id: 'motion', label: 'Motion', items: [
      range('loop', 'Loop length', 3, 30, 1, 12, { u: 'uLoop', unit: 's' }),
      range('breathe', 'Breathing', 0, 0.12, 0.001, 0.028, { u: 'uBreathe' }),
      range('breatheCycles', 'Breaths per loop', 1, 8, 1, 2, { u: 'uBreatheCycles' }),
    ],
  },
  {
    id: 'orbit', label: 'Orbit & trail', items: [
      toggle('orbit', 'Orbit', true, 'uOrbit'),
      range('orbitR', 'Orbit radius', 0.2, 1.3, 0.005, 0.66, { u: 'uOrbitR' }),
      range('tilt', 'Orbit tilt', -90, 90, 0.5, 17, { u: 'uTilt', ut: 'deg', unit: '°' }),
      range('roll', 'Orbit angle', -90, 90, 0.5, -18, { u: 'uRoll', ut: 'deg', unit: '°' }),
      range('orbitSpeed', 'Laps per loop', -4, 4, 1, -1, { u: 'uOrbitSpeed' }),
      range('orbitPhase', 'Start position', 0, 360, 1, 34, { u: 'uOrbitPhase', ut: 'deg', unit: '°' }),
      range('satSize', 'Satellite size', 0, 0.08, 0.001, 0.021, { u: 'uSatSize' }),
      color('orbitCol', 'Colour', '#db140f', 'uOrbitCol'),
      range('pathOp', 'Orbit path', 0, 1, 0.01, 0.1, { u: 'uPathOp' }),
      toggle('trail', 'Long-exposure trail', true, 'uTrail'),
      range('trailLen', 'Trail length', 5, 355, 1, 165, { u: 'uTrailLen', ut: 'deg', unit: '°' }),
      range('trailW0', 'Trail width (head)', 0.0005, 0.03, 0.0005, 0.0045, { u: 'uTrailW0' }),
      range('trailW1', 'Trail width (tail)', 0, 0.05, 0.0005, 0.01, { u: 'uTrailW1' }),
      range('trailOp', 'Trail opacity', 0, 1, 0.01, 0.85, { u: 'uTrailOp' }),
    ],
  },
  {
    id: 'echo', label: 'Echo rings', items: [
      toggle('echo', 'Echo', false, 'uEcho'),
      range('echoN', 'Rings', 1, 8, 1, 4, { u: 'uEchoN' }),
      range('echoSpread', 'Spread', 0.05, 1, 0.01, 0.46, { u: 'uEchoSpread' }),
      range('echoOp', 'Opacity', 0, 1, 0.01, 0.22, { u: 'uEchoOp' }),
      range('echoRate', 'Pulses per loop', 1, 8, 1, 3, { u: 'uEchoRate' }),
      color('echoCol', 'Colour', '#db140f', 'uEchoCol'),
    ],
  },
];

export function defaults() {
  const d = {};
  for (const g of SCHEMA) for (const it of g.items) if (it.def !== undefined) d[it.key] = it.def;
  return d;
}
