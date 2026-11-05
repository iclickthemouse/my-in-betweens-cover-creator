// Tiny dependency-free control kit. Controls are generated from schema items.

let uid = 0;

export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

const decimals = step => {
  const s = String(step ?? 0.01);
  return s.includes('.') ? s.split('.')[1].length : 0;
};

// Returns { row, set(value), addOption?(opt) }
export function makeControl(it, value, onInput) {
  const id = `c${++uid}`;
  const lab = el('label', { for: id, title: it.def !== undefined ? 'Double-click to reset' : null }, it.label);
  let set = () => {};
  let row, addOption;
  const reset = () => { if (it.def !== undefined) { set(it.def); onInput(it.def); } };
  lab.addEventListener('dblclick', reset);

  switch (it.type) {
    case 'range': {
      const dp = decimals(it.step);
      const r = el('input', { type: 'range', id, min: it.min, max: it.max, step: it.step ?? 0.01 });
      const n = el('input', { type: 'number', class: 'num', min: it.min, max: it.max, step: it.step ?? 0.01 });
      set = v => { r.value = v; n.value = (+v).toFixed(dp); };
      r.addEventListener('input', () => { n.value = (+r.value).toFixed(dp); onInput(+r.value); });
      n.addEventListener('change', () => { const v = +n.value; if (Number.isFinite(v)) { r.value = v; onInput(v); } });
      row = el('div', { class: 'row range' },
        el('div', { class: 'rhead' }, lab, el('span', { class: 'numwrap' }, n, it.unit ? el('span', { class: 'unit' }, it.unit) : null)),
        r);
      break;
    }
    case 'color': {
      const c = el('input', { type: 'color', id });
      const tx = el('input', { type: 'text', class: 'hex', maxlength: 7, spellcheck: 'false' });
      set = v => { c.value = v; tx.value = v; };
      c.addEventListener('input', () => { tx.value = c.value; onInput(c.value); });
      tx.addEventListener('change', () => {
        const v = tx.value.trim().startsWith('#') ? tx.value.trim() : '#' + tx.value.trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) { c.value = v; tx.value = v; onInput(v.toLowerCase()); }
      });
      row = el('div', { class: 'row inline' }, lab, el('span', { class: 'colorwrap' }, tx, c));
      break;
    }
    case 'toggle': {
      const cb = el('input', { type: 'checkbox', id, class: 'switch' });
      set = v => { cb.checked = !!v; };
      cb.addEventListener('change', () => onInput(cb.checked));
      row = el('div', { class: 'row inline' }, lab, cb);
      break;
    }
    case 'select': {
      const s = el('select', { id });
      addOption = o => {
        const [v, l] = typeof o === 'object' ? [o.value, o.label] : [o, o];
        if ([...s.options].some(x => x.value === String(v))) return;
        s.append(el('option', { value: v }, l));
      };
      it.options.forEach(addOption);
      set = v => { if (![...s.options].some(x => x.value === String(v))) addOption(v); s.value = String(v); };
      s.addEventListener('change', () => onInput(it.numeric ? +s.value : s.value));
      row = el('div', { class: 'row inline' }, lab, s);
      break;
    }
    case 'textarea': {
      const ta = el('textarea', { id, rows: 2, spellcheck: 'false' });
      set = v => { if (ta.value !== v) ta.value = v; };
      ta.addEventListener('input', () => onInput(ta.value));
      row = el('div', { class: 'row' }, lab, ta);
      break;
    }
    case 'file': {
      const f = el('input', { type: 'file', id, accept: it.accept });
      f.addEventListener('change', () => { if (f.files[0]) onInput(f.files[0]); f.value = ''; });
      row = el('div', { class: 'row inline' }, lab, el('label', { class: 'filebtn', for: id }, 'choose…'), f);
      f.hidden = true;
      break;
    }
    default:
      row = el('div', { class: 'row' }, lab);
  }
  if (it.type !== 'file') set(value ?? it.def);
  return { row, set, addOption };
}

// Builds collapsible groups from the schema. Groups with `slot: true` get an extra
// container (data-slot=<id>) for controls added later (e.g. the active style's settings).
export function buildPanel(root, groups, getState, onChange) {
  const ctrls = new Map();
  for (const g of groups) {
    const body = el('div', { class: 'gbody' });
    for (const it of g.items) {
      const c = makeControl(it, getState()[it.key], v => onChange(it.key, v));
      ctrls.set(it.key, c);
      body.append(c.row);
    }
    if (g.slot) body.append(el('div', { class: 'slot', 'data-slot': g.id }));
    root.append(el('details', { class: 'group', open: !!g.open }, el('summary', {}, g.label), body));
  }
  return {
    refresh() { const s = getState(); for (const [k, c] of ctrls) if (k in s) c.set(s[k]); },
    get: k => ctrls.get(k),
  };
}
