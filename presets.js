// Starting points. Each preset is applied on top of the defaults, so list only what differs.
// styleParams: { <styleId>: { <paramKey>: value } }

export const PRESETS = {
  'Default': {},
  'Pressed in (debossed)': { emboss: -3.2, embossAO: 0.22 },
  'Slow spin': { spin: 1, sway: 0, textWidth: 70 },
  'Serif italic': { font: 'Instrument Serif', weight: '400', italic: true, textWidth: 76, textMaxH: 18, tracking: 0, emboss: 3.4 },
  'Stacked': { text: 'my\ninbetweens', textWidth: 64, textMaxH: 22, lineHeight: 1.0, emboss: 3 },
  'Sumi sketch (readable)': {
    style: 'sumi', textBoost: 0.85, textMode: 1, textColor: '#1c1514', textWeight: 1.6,
  },
  'Linocut': { style: 'linocut', font: 'Archivo Black', weight: '400', textWidth: 92, emboss: 3.4 },
  'Woodblock': { style: 'woodblock', font: 'Shippori Mincho', weight: '800', textWidth: 86, emboss: 3.6 },
  'Risograph (readable)': { style: 'riso', textBoost: 0.9, textMode: 0, textColor: '#33458c', textThresh: 0.4 },
  'Contour': { style: 'contour', styleParams: { contour: { fill: 1, textLines: 0 } } },
  'Echo pulse': { echo: true, orbit: false, breathe: 0.04 },
  'Pixel': { style: 'pixel', styleParams: { pixel: { res: 140 } }, font: 'Archivo Black', weight: '400', textWidth: 100 },
};
