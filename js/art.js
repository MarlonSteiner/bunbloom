// All the drawings: the bunny, her outfits, flowers, the garden and the monthly pixel pictures.
// Everything is plain SVG made in code, so it stays crisp on every screen and weighs almost nothing.

const LINE = '#9b6b78';
const PINK = '#ff8fb1';

// ---------- little helpers ----------
let uid = 0;
const id = (p) => `${p}${++uid}`;

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// A five-petal blossom.
export function blossom(x, y, r, color = '#ffb3c9', center = '#ffe28a', rot = 0) {
  let p = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 + rot) * Math.PI / 180;
    p += `<ellipse cx="${(x + Math.cos(a) * r * .62).toFixed(1)}" cy="${(y + Math.sin(a) * r * .62).toFixed(1)}" rx="${(r * .5).toFixed(1)}" ry="${(r * .5).toFixed(1)}" fill="${color}"/>`;
  }
  return `<g>${p}<circle cx="${x}" cy="${y}" r="${(r * .32).toFixed(1)}" fill="${center}"/></g>`;
}

// A tulip head (cup with three petals) at x,y.
export function tulipHead(x, y, s = 1, c1 = '#ff9dbb', c2 = '#ffe3ec') {
  const g = id('tg');
  return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-11 -6 C-13 6 -7 13 0 13 C7 13 13 6 11 -6 L6 -1 L0 -10 L-6 -1 Z" fill="url(#${g})" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M-6 -1 C-4 6 -2 10 0 13" stroke="${LINE}" stroke-width=".8" fill="none" opacity=".5"/>
    <path d="M-7 -2 Q-8 3 -5 7" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>
  </g>`;
}

export function tulip(x, y, h = 40, c1, c2, s = 1) {
  return `<g class="sway" style="transform-origin:${x}px ${y}px">
    <path d="M${x} ${y} Q${x - 3} ${y - h / 2} ${x} ${y - h}" stroke="#7fc08a" stroke-width="${2.6 * s}" fill="none" stroke-linecap="round"/>
    <path d="M${x} ${y - 4} Q${x - 14 * s} ${y - h * .45} ${x - 6 * s} ${y - h * .7} Q${x - 3} ${y - h * .4} ${x} ${y - 4}" fill="#a9dca0" stroke="#7fc08a" stroke-width=".8"/>
    ${tulipHead(x, y - h - 8 * s, s, c1, c2)}
  </g>`;
}

export function daisy(x, y, h = 26, petal = '#fff', s = 1) {
  return `<g class="sway" style="transform-origin:${x}px ${y}px">
    <path d="M${x} ${y} L${x} ${y - h}" stroke="#7fc08a" stroke-width="${2 * s}" stroke-linecap="round"/>
    ${blossom(x, y - h, 9 * s, petal, '#ffd76e', hash(x + ':' + y) % 72)}
  </g>`;
}

export function lavender(x, y, h = 30, s = 1) {
  let buds = '';
  for (let i = 0; i < 6; i++) buds += `<ellipse cx="${x + (i % 2 ? 2.4 : -2.4) * s}" cy="${y - h + i * 4 * s}" rx="${2.6 * s}" ry="${3.4 * s}" fill="${i % 2 ? '#c9b3ff' : '#b79cf2'}"/>`;
  return `<g class="sway" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y} L${x} ${y - h + 6}" stroke="#7fc08a" stroke-width="${1.8 * s}"/>${buds}</g>`;
}

export function sparkle(x, y, r = 5, color = '#fff') {
  return `<path class="twinkle" style="transform-origin:${x}px ${y}px" d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${color}"/>`;
}

export const heartPath = (x, y, s) =>
  `M${x} ${y + 3 * s} C${x - 7 * s} ${y - 2 * s} ${x - 4 * s} ${y - 8 * s} ${x} ${y - 4 * s} C${x + 4 * s} ${y - 8 * s} ${x + 7 * s} ${y - 2 * s} ${x} ${y + 3 * s}Z`;

// ---------- the bunny ----------
const ACCESSORIES = {
  // head
  bow: () => `<g transform="translate(80 60) rotate(18)">
      <path d="M0 0 C-6 -11 -19 -9 -17 2 C-15 11 -4 6 0 0Z" fill="#ff8fb1" stroke="${LINE}" stroke-width="1.6"/>
      <path d="M0 0 C6 -11 19 -9 17 2 C15 11 4 6 0 0Z" fill="#ff8fb1" stroke="${LINE}" stroke-width="1.6"/>
      <path d="M-11 -2 Q-8 -5 -5 -2" stroke="#fff" stroke-width="1.4" fill="none" opacity=".8"/>
      <circle r="4" fill="#ff6f9c" stroke="${LINE}" stroke-width="1.4"/></g>`,
  flowercrown: () => {
    let s = '<path d="M34 66 Q60 50 86 66" stroke="#8fcf8a" stroke-width="3" fill="none" stroke-linecap="round"/>';
    const pts = [[36, 64], [47, 58.5], [60, 56.5], [73, 58.5], [84, 64]];
    const cols = ['#ffb3c9', '#fff', '#ff8fb1', '#fff', '#ffb3c9'];
    pts.forEach(([x, y], i) => { s += blossom(x, y, 7, cols[i], i % 2 ? '#ffb3c9' : '#ffe28a', i * 20); });
    return s + '<ellipse cx="41" cy="62" rx="4" ry="2" fill="#a9dca0" transform="rotate(-30 41 62)"/><ellipse cx="79" cy="62" rx="4" ry="2" fill="#a9dca0" transform="rotate(30 79 62)"/>';
  },
  strawberry: () => `<g>
      <path d="M42 66 C40 42 80 42 78 66 C66 61 54 61 42 66Z" fill="#ff6f8e" stroke="${LINE}" stroke-width="1.6"/>
      ${[[50, 56], [60, 52], [70, 56], [55, 61], [66, 61]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.2" ry="1.8" fill="#ffe9a8"/>`).join('')}
      <path d="M60 46 L52 42 L57 47 L48 49 L58 50 L60 47 L62 50 L72 49 L63 47 L68 42Z" fill="#8fd18a" stroke="#5fa86a" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M60 44 Q61 39 64 37" stroke="#5fa86a" stroke-width="2" fill="none" stroke-linecap="round"/></g>`,
  beeband: () => `<g stroke="${LINE}" stroke-width="1.8" fill="none" stroke-linecap="round">
      <path d="M53 60 Q49 48 46 40"/><path d="M67 60 Q71 48 74 40"/></g>
      <circle cx="46" cy="38" r="5" fill="#ffd76e" stroke="${LINE}" stroke-width="1.4"/><circle cx="74" cy="38" r="5" fill="#ffd76e" stroke="${LINE}" stroke-width="1.4"/>
      <path d="M44 36 h4 M72 36 h4" stroke="#6b4450" stroke-width="1.6"/>`,
  crown: () => `<g><path d="M47 62 L46 45 L54 52 L60 40 L66 52 L74 45 L73 62 Q60 58 47 62Z" fill="#ffd76e" stroke="#d29b3a" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="60" cy="54" r="3" fill="#ff8fb1"/><circle cx="51" cy="57" r="2" fill="#a7d8ff"/><circle cx="69" cy="57" r="2" fill="#a7d8ff"/>
      ${sparkle(77, 42, 4, '#fff6c2')}</g>`,
  sunhat: () => `<g><ellipse cx="60" cy="63" rx="36" ry="8" fill="#f8deb0" stroke="#c9a06a" stroke-width="1.6"/>
      <path d="M44 62 C44 44 76 44 76 62Z" fill="#f8deb0" stroke="#c9a06a" stroke-width="1.6"/>
      <path d="M44.5 58 Q60 61 75.5 58 L76 62 Q60 65 44 62Z" fill="#ff8fb1"/>
      ${blossom(73, 56, 6, '#fff', '#ffb3c9')}</g>`,
  // face
  glasses: () => `<g fill="rgba(255,170,200,.35)" stroke="#ff5c8a" stroke-width="2.2" stroke-linejoin="round">
      <path d="${heartPath(47, 89, 1.45)}"/><path d="${heartPath(73, 89, 1.45)}"/></g>
      <path d="M53 86 Q60 83 67 86" stroke="#ff5c8a" stroke-width="2" fill="none"/>`,
  sparkles: () => `${sparkle(24, 82, 8, '#ffd76e')}${sparkle(96, 80, 8, '#ffd76e')}${sparkle(32, 68, 5, '#ff8fb1')}${sparkle(90, 66, 5, '#ff8fb1')}${sparkle(100, 98, 4, '#c9b3ff')}`,
  heartcheeks: () => `<path d="${heartPath(37, 99, 1.35)}" fill="#ff7fa6" stroke="#fff" stroke-width="1"/><path d="${heartPath(83, 99, 1.35)}" fill="#ff7fa6" stroke="#fff" stroke-width="1"/>`,
  // hold
  tulip: () => `<path d="M76 118 Q86 106 92 92" stroke="#7fc08a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="86" cy="106" rx="6" ry="2.6" fill="#a9dca0" transform="rotate(-50 86 106)"/>${tulipHead(93, 84, .9)}`,
  carrot: () => `<g transform="rotate(-18 60 116)"><path d="M38 113 Q60 110 84 116 Q60 124 38 119Z" fill="#ffa86b" stroke="#d9773f" stroke-width="1.5"/>
      <path d="M50 113 v3 M60 112 v4 M70 113 v4" stroke="#d9773f" stroke-width="1.2"/>
      <path d="M38 115 L28 108 M38 116 L27 116 M38 117 L29 123" stroke="#7fc08a" stroke-width="3" stroke-linecap="round"/></g>`,
  balloon: () => `<path d="M74 116 Q92 90 100 62" stroke="${LINE}" stroke-width="1.2" fill="none"/>
      <g class="bob"><path d="${heartPath(101, 50, 2.4)}" fill="#ff8fb1" stroke="${LINE}" stroke-width="1.4"/>
      <path d="M93 44 Q95 40 99 41" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>`,
  teacup: () => `<g><path d="M48 106 L72 106 L69 121 Q60 125 51 121Z" fill="#fff" stroke="${LINE}" stroke-width="1.6"/>
      <path d="M72 109 Q79 110 77 115 Q75 119 70 117" stroke="${LINE}" stroke-width="1.6" fill="none"/>
      <ellipse cx="60" cy="106" rx="12" ry="2.6" fill="#f2c9a5" stroke="${LINE}" stroke-width="1.2"/>
      <path d="${heartPath(60, 114, .7)}" fill="#ff8fb1"/>
      <path class="steam" d="M56 101 q-3 -4 0 -8 M64 101 q3 -4 0 -8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`,
};

export function bunny({ mood = 'normal', equip = {}, cls = '' } = {}) {
  return `<svg class="bunny ${cls}" viewBox="0 0 120 130" aria-hidden="true">${bunnyInner(mood, equip)}</svg>`;
}

function bunnyInner(mood, equip) {
  const eyes = {
    normal: `<g class="eyes"><ellipse cx="47" cy="88" rx="3.6" ry="4.4" fill="#4b2e39"/><ellipse cx="73" cy="88" rx="3.6" ry="4.4" fill="#4b2e39"/>
      <circle cx="48.4" cy="86.2" r="1.4" fill="#fff"/><circle cx="74.4" cy="86.2" r="1.4" fill="#fff"/></g>`,
    happy: `<g stroke="#4b2e39" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="M42.5 90 q4.5 -6 9 0"/><path d="M68.5 90 q4.5 -6 9 0"/></g>`,
    sleepy: `<g stroke="#4b2e39" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M43 88 q4 3.5 8 0"/><path d="M69 88 q4 3.5 8 0"/></g>`,
    wow: `<g><circle cx="47" cy="88" r="4.6" fill="#4b2e39"/><circle cx="73" cy="88" r="4.6" fill="#4b2e39"/>
      <circle cx="48.6" cy="86" r="1.8" fill="#fff"/><circle cx="74.6" cy="86" r="1.8" fill="#fff"/><circle cx="45.6" cy="90" r=".9" fill="#fff"/><circle cx="71.6" cy="90" r=".9" fill="#fff"/></g>`,
  }[mood] || '';
  const mouth = mood === 'wow'
    ? '<ellipse cx="60" cy="99" rx="2.6" ry="3" fill="#e5788f"/>'
    : `<path d="M55.5 97 q2.2 2.8 4.5 0 q2.2 2.8 4.5 0" stroke="${LINE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const ear = (x, rot, side) => `<g transform="translate(${x} 62) rotate(${rot})"><g class="ear ${side}">
      <path d="M-9.5 2 C-14 -20 -12.5 -46 0 -48 C12.5 -46 14 -20 9.5 2Z" fill="#fffafb" stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M-4.6 -4 C-7.4 -19 -6.2 -38 0 -40 C6.2 -38 7.4 -19 4.6 -4Z" fill="#ffc4d4"/></g></g>`;
  const acc = (slot) => equip[slot] && ACCESSORIES[equip[slot]] ? ACCESSORIES[equip[slot]]() : '';
  return `<g class="bun-body">
    ${ear(45, -12, 'l')}${ear(75, 12, 'r')}
    <ellipse cx="60" cy="123" rx="34" ry="5" fill="#000" opacity=".06"/>
    <path d="M20 94 C20 66 38 56 60 56 C82 56 100 66 100 94 C100 113 84 122 60 122 C36 122 20 113 20 94Z" fill="#fffafb" stroke="${LINE}" stroke-width="2.4"/>
    <path d="M30 80 Q36 66 50 62" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>
    ${acc('head')}
    ${eyes}
    <ellipse class="cheek" cx="37" cy="98" rx="7.5" ry="4.4" fill="#ffb0c4" opacity=".8"/><ellipse class="cheek" cx="83" cy="98" rx="7.5" ry="4.4" fill="#ffb0c4" opacity=".8"/>
    <ellipse cx="60" cy="94" rx="2.4" ry="1.7" fill="#f48fb1"/>
    ${mouth}
    ${acc('face')}
    <ellipse cx="48" cy="118" rx="7.5" ry="5" fill="#fffafb" stroke="${LINE}" stroke-width="2"/><ellipse cx="72" cy="118" rx="7.5" ry="5" fill="#fffafb" stroke="${LINE}" stroke-width="2"/>
    ${acc('hold')}
  </g>`;
}

// ---------- shop ----------
export const SHOP = [
  { id: 'bow', slot: 'head', name: 'Pink bow', price: 40 },
  { id: 'beeband', slot: 'head', name: 'Bee antennae', price: 90 },
  { id: 'flowercrown', slot: 'head', name: 'Flower crown', price: 120 },
  { id: 'strawberry', slot: 'head', name: 'Strawberry hat', price: 160 },
  { id: 'sunhat', slot: 'head', name: 'Sun hat', price: 220 },
  { id: 'crown', slot: 'head', name: 'Tiny crown', price: 400 },
  { id: 'heartcheeks', slot: 'face', name: 'Heart cheeks', price: 50 },
  { id: 'sparkles', slot: 'face', name: 'Sparkles', price: 60 },
  { id: 'glasses', slot: 'face', name: 'Heart glasses', price: 100 },
  { id: 'carrot', slot: 'hold', name: 'Carrot snack', price: 45 },
  { id: 'tulip', slot: 'hold', name: 'Little tulip', price: 60 },
  { id: 'teacup', slot: 'hold', name: 'Cup of tea', price: 90 },
  { id: 'balloon', slot: 'hold', name: 'Heart balloon', price: 140 },
  { id: 'butterflies', slot: 'decor', name: 'Butterflies', price: 150 },
  { id: 'lights', slot: 'decor', name: 'Fairy lights', price: 200 },
  { id: 'pond', slot: 'decor', name: 'Lily pond', price: 250 },
  { id: 'rainbow', slot: 'decor', name: 'Rainbow', price: 300 },
  { id: 'mushroom', slot: 'decor', name: 'Mushroom house', price: 350 },
  { id: 'sakura', slot: 'decor', name: 'Cherry tree', price: 500 },
];

export function shopPreview(item) {
  if (item.slot === 'decor') return `<svg viewBox="0 0 80 80" aria-hidden="true">${DECOR_ICON[item.id]}</svg>`;
  return bunny({ equip: { [item.slot]: item.id }, mood: 'happy' });
}

const butterfly = (x, y, c = '#ffb3c9', cls = 'flutter') => `<g class="${cls}" style="transform-origin:${x}px ${y}px"><g transform="translate(${x} ${y})">
  <g class="wing"><ellipse cx="-5" cy="-3" rx="6" ry="5" fill="${c}" stroke="${LINE}" stroke-width="1"/><ellipse cx="-4" cy="4" rx="4" ry="3.4" fill="${c}" stroke="${LINE}" stroke-width="1"/></g>
  <g class="wing r"><ellipse cx="5" cy="-3" rx="6" ry="5" fill="${c}" stroke="${LINE}" stroke-width="1"/><ellipse cx="4" cy="4" rx="4" ry="3.4" fill="${c}" stroke="${LINE}" stroke-width="1"/></g>
  <ellipse rx="1.6" ry="6" fill="${LINE}"/></g></g>`;

const mushroomHouse = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M-16 0 L-14 -26 L14 -26 L16 0Z" fill="#fff6ea" stroke="${LINE}" stroke-width="1.6"/>
  <path d="M-5 0 L-5 -12 Q0 -17 5 -12 L5 0Z" fill="#e3a982" stroke="${LINE}" stroke-width="1.4"/>
  <circle cx="9" cy="-16" r="3.4" fill="#bfe6ff" stroke="${LINE}" stroke-width="1.2"/>
  <path d="M-30 -24 C-30 -52 30 -52 30 -24 Q0 -18 -30 -24Z" fill="#ff7f9c" stroke="${LINE}" stroke-width="1.8"/>
  <circle cx="-14" cy="-36" r="4.5" fill="#fff"/><circle cx="6" cy="-42" r="3.5" fill="#fff"/><circle cx="18" cy="-30" r="3" fill="#fff"/><circle cx="-22" cy="-27" r="2.4" fill="#fff"/></g>`;

const pond = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <ellipse rx="40" ry="11" fill="#a8dcf0" stroke="#7fc0dd" stroke-width="1.6"/>
  <path d="M-24 -2 q8 -3 16 0 M6 3 q8 -3 16 0" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/>
  <path d="M10 -3 a7 4 0 1 0 0.1 0 Z" fill="#8fd18a"/>${blossom(12, -4, 4, '#ffb3c9', '#ffe28a')}</g>`;

const rainbow = (x, y, r = 60) => {
  const cols = ['#ffb3c9', '#ffd3a8', '#fff0a8', '#c8f0b8', '#bfe3ff', '#d9c8ff'];
  return `<g opacity=".85">${cols.map((c, i) => `<path d="M${x - r + i * 6} ${y} A${r - i * 6} ${r - i * 6} 0 0 1 ${x + r - i * 6} ${y}" stroke="${c}" stroke-width="6" fill="none"/>`).join('')}
  <g fill="#fff"><circle cx="${x - r + 15}" cy="${y}" r="10"/><circle cx="${x - r + 2}" cy="${y + 2}" r="8"/><circle cx="${x + r - 15}" cy="${y}" r="10"/><circle cx="${x + r - 2}" cy="${y + 2}" r="8"/></g></g>`;
};

const sakura = (x, y, s = 1) => {
  const r = rng(7);
  let blooms = '';
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = r() * 30;
    blooms += blossom(Math.cos(a) * d * 1.3, -62 + Math.sin(a) * d * .8, 5 + r() * 3, r() > .5 ? '#ffc4d6' : '#ffe0ea', '#ff8fb1', r() * 72);
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M-6 0 Q-4 -30 -2 -50 L4 -50 Q6 -30 7 0Z" fill="#c99a86" stroke="${LINE}" stroke-width="1.4"/>
  <path d="M0 -40 L-16 -56 M2 -44 L18 -58" stroke="#c99a86" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="0" cy="-64" rx="44" ry="28" fill="#ffd3e1"/>${blooms}</g>`;
};

const lights = (w) => {
  let bulbs = '';
  const cols = ['#ffe28a', '#ffb3c9', '#bfe3ff', '#c8f0b8'];
  for (let i = 0; i < 12; i++) {
    const x = 10 + i * (w - 20) / 11;
    const y = 14 + Math.sin(i / 11 * Math.PI) * 18;
    bulbs += `<circle class="glow" style="animation-delay:${(i % 4) * .4}s" cx="${x}" cy="${y + 4}" r="3.6" fill="${cols[i % 4]}"/>`;
  }
  return `<path d="M0 10 Q${w / 2} 50 ${w} 10" stroke="#9b6b78" stroke-width="1.2" fill="none"/>${bulbs}`;
};

const DECOR_ICON = {
  butterflies: butterfly(28, 34, '#ffb3c9') + butterfly(54, 50, '#c9b3ff'),
  lights: `<g transform="translate(0 16) scale(.22 1)">${lights(360)}</g>`,
  pond: pond(40, 50, .8),
  rainbow: rainbow(40, 58, 34),
  mushroom: mushroomHouse(40, 72, .95),
  sakura: sakura(40, 78, .62),
};

// ---------- the garden ----------
// Flowers appear as she finishes things; decorations come from the shop.
export function garden({ flowers = 0, decor = {}, equip = {}, level = 1 }) {
  const W = 360, H = 250;
  const r = rng(42);
  const spots = [];
  while (spots.length < 70) {
    const x = 14 + r() * (W - 28);
    const y = 168 + r() * 74;
    const kind = r(), hue = r(), h = 16 + r() * 14;
    if (x > 126 && x < 236 && y < 236) continue; // leave room around the bunny
    spots.push({ x, y, kind, hue, h });
  }
  const shown = spots.slice(0, Math.min(flowers, spots.length)).sort((a, b) => a.y - b.y);
  const kinds = level >= 8 ? 4 : level >= 4 ? 3 : 2;
  const f = shown.map((p) => {
    const k = Math.floor(p.kind * kinds);
    const s = .55 + (p.y - 168) / 74 * .35;
    if (k === 0) return tulip(p.x, p.y, p.h * s, p.hue > .5 ? '#ff9dbb' : '#ffc2d4', '#fff1f5', s);
    if (k === 1) return daisy(p.x, p.y, p.h * .8 * s, p.hue > .6 ? '#fff' : '#ffd6e2', s);
    if (k === 2) return lavender(p.x, p.y, p.h * s, s);
    return tulip(p.x, p.y, p.h * s, '#ffe08a', '#fff8dc', s);
  }).join('');
  const on = (k) => decor[k];
  return `<svg class="garden-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaff"/><stop offset=".7" stop-color="#fff2f6"/></linearGradient>
      <linearGradient id="ghill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8ebbf"/><stop offset="1" stop-color="#a9dca0"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#gsky)"/>
    ${on('rainbow') ? rainbow(110, 150, 90) : ''}
    <g class="sun"><circle cx="304" cy="46" r="22" fill="#fff0a8"/><circle cx="304" cy="46" r="30" fill="#fff0a8" opacity=".35"/>
      <circle cx="297" cy="44" r="2" fill="#6b4450"/><circle cx="311" cy="44" r="2" fill="#6b4450"/><path d="M300 50 q4 4 8 0" stroke="#6b4450" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="293" cy="51" rx="3.5" ry="2" fill="#ffb0c4"/><ellipse cx="315" cy="51" rx="3.5" ry="2" fill="#ffb0c4"/></g>
    <g class="cloud c1" fill="#fff"><ellipse cx="60" cy="50" rx="26" ry="11"/><ellipse cx="74" cy="42" rx="15" ry="12"/><ellipse cx="50" cy="44" rx="12" ry="10"/></g>
    <g class="cloud c2" fill="#fff" opacity=".9"><ellipse cx="200" cy="30" rx="20" ry="8"/><ellipse cx="210" cy="24" rx="11" ry="9"/></g>
    ${on('lights') ? lights(W) : ''}
    <path d="M0 150 Q90 118 190 146 T360 136 V250 H0Z" fill="#dff3d6"/>
    <path d="M0 172 Q110 146 220 168 T360 160 V250 H0Z" fill="url(#ghill)"/>
    ${on('sakura') ? sakura(40, 176, .9) : ''}
    ${on('mushroom') ? mushroomHouse(320, 182, .8) : ''}
    ${on('pond') ? pond(278, 226, .9) : ''}
    ${f}
    <g class="garden-bunny" transform="translate(140 150) scale(.68)">${bunnyInner('normal', equip)}</g>
    ${on('butterflies') ? butterfly(90, 120, '#ffb3c9') + butterfly(250, 100, '#c9b3ff', 'flutter f2') + butterfly(300, 150, '#ffe28a', 'flutter f3') : ''}
    ${sparkle(30, 90, 4)}${sparkle(240, 60, 3)}${sparkle(330, 110, 4)}
  </svg>`;
}

// ---------- focus tulip in a pot ----------
// g goes from 0 (seed) to 1 (full bloom).
export function focusPlant(g, state = '') {
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const stem = clamp(g / .55);
  const leaf = clamp((g - .2) / .3);
  const bud = clamp((g - .45) / .25);
  const open = clamp((g - .75) / .25);
  const top = 172 - 96 * stem;
  const petal = (rot, c) => `<path transform="rotate(${rot} 100 ${top})" d="M100 ${top} C${88} ${top - 6} ${86} ${top - 30} ${100} ${top - 40} C${114} ${top - 30} ${112} ${top - 6} 100 ${top}Z" fill="${c}" stroke="${LINE}" stroke-width="1.4"/>`;
  return `<svg class="plant ${state}" viewBox="0 0 200 240" aria-hidden="true">
    <defs><linearGradient id="potg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc2d4"/><stop offset="1" stop-color="#ff9dbb"/></linearGradient>
    <radialGradient id="pg" cx=".5" cy=".9" r=".9"><stop offset="0" stop-color="#fff3f7"/><stop offset="1" stop-color="#ff8fb1"/></radialGradient></defs>
    <g class="stem-group" style="transform-origin:100px 172px">
      ${stem > 0 ? `<path d="M100 174 Q96 ${(174 + top) / 2} 100 ${top}" stroke="#7fc08a" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}
      ${leaf > 0 ? `<g style="transform:scale(${leaf});transform-origin:100px 160px"><path d="M100 164 Q70 150 66 118 Q90 128 100 158Z" fill="#a9dca0" stroke="#7fc08a" stroke-width="1.6"/>
        <path d="M100 160 Q132 140 134 110 Q110 124 100 154Z" fill="#a9dca0" stroke="#7fc08a" stroke-width="1.6"/></g>` : ''}
      ${bud > 0 ? `<g style="transform:scale(${bud});transform-origin:100px ${top}px">
        ${petal(-34 * open, 'url(#pg)')}${petal(34 * open, 'url(#pg)')}${petal(0, 'url(#pg)')}
        ${open > .5 ? `<circle cx="100" cy="${top - 14}" r="${4 * open}" fill="#ffe28a"/>` : ''}
      </g>` : ''}
      ${g <= 0.02 ? '<ellipse cx="100" cy="170" rx="6" ry="4" fill="#c99a86" stroke="#9b6b78" stroke-width="1.2"/>' : ''}
    </g>
    <path d="M58 172 L142 172 L132 226 Q100 234 68 226Z" fill="url(#potg)" stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round"/>
    <rect x="52" y="164" width="96" height="16" rx="8" fill="#ffb3c9" stroke="${LINE}" stroke-width="2.4"/>
    <g class="pot-face">${state === 'wilt'
      ? `<path d="M84 200 q4 -3 8 0 M108 200 q4 -3 8 0" stroke="#6b4450" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M96 212 q4 -3 8 0" stroke="#6b4450" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : g >= 1 && state !== 'ghost' ? `<path d="M83 201 q5 -6 10 0 M107 201 q5 -6 10 0" stroke="#6b4450" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M95 208 q5 6 10 0" stroke="#6b4450" stroke-width="2.2" fill="#e5788f" stroke-linecap="round"/>`
      : `<path d="M84 199 q4 3 8 0 M108 199 q4 3 8 0" stroke="#6b4450" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M97 207 q3 2.4 6 0" stroke="#6b4450" stroke-width="2" fill="none" stroke-linecap="round"/>`}
      <ellipse cx="78" cy="206" rx="6" ry="3.4" fill="#ff7fa6" opacity=".55"/><ellipse cx="122" cy="206" rx="6" ry="3.4" fill="#ff7fa6" opacity=".55"/></g>
    ${g >= 1 && state !== 'wilt' && state !== 'ghost' ? sparkle(60, 70, 7, '#fff6c2') + sparkle(144, 54, 6, '#fff') + sparkle(150, 110, 5, '#ffe28a') + sparkle(48, 120, 4, '#fff') : ''}
  </svg>`;
}

// ---------- monthly pixel picture ----------
const PICTURES = [
  { name: 'Bunny', pal: { b: '#ffe3ec', o: '#9b6b78', w: '#fffafb', p: '#ffb3c9', k: '#4b2e39', c: '#ff9dbb', n: '#f48fb1' }, rows: [
    'bbbbbbbbbbbbbbbb', 'bbbooobbbbooobbb', 'bbowpwobbowpwobb', 'bbowpwobbowpwobb', 'bbowpwobbowpwobb', 'bbbowwoooowwobbb',
    'bbowwwwwwwwwwobb', 'bowwwwwwwwwwwwob', 'bowwkwwwwwwkwwob', 'bowwkwwwwwwkwwob', 'bowccwwnnwwccwob', 'bowwwwwwwwwwwwob',
    'bbowwwwwwwwwwobb', 'bbbowwwwwwwwobbb', 'bbbboooooooobbbb', 'bbbbbbbbbbbbbbbb'] },
  { name: 'Strawberry', pal: { m: '#dff5e6', g: '#7fc08a', r: '#ff6f8e', y: '#ffe9a8', k: '#4b2e39' }, rows: [
    'mmmmmmmmmmmmmmmm', 'mmmmmmmgmmmmmmmm', 'mmmmmggggggmmmmm', 'mmmmgggrrgggmmmm', 'mmmrrrgrrgrrrmmm', 'mmrrrrrrrrrrrrmm',
    'mrrryrrrrrryrrrm', 'mrrrrrryrrrrrrrm', 'mrrrrkrrrrkrrrrm', 'mmrryrrkkrrryrmm', 'mmrryrrrrryrrrmm', 'mmmrrrrrrrrrrmmm',
    'mmmmrrryrrrrmmmm', 'mmmmmrrrrrrmmmmm', 'mmmmmmrrrrmmmmmm', 'mmmmmmmmmmmmmmmm'] },
  { name: 'Tulip', pal: { s: '#d9efff', p: '#ff8fb1', q: '#ffd3e1', g: '#5fa86a', l: '#a9dca0', e: '#c8ebbf' }, rows: [
    'ssssssssssssssss', 'sssspssppsspssss', 'sssspqppppqpssss', 'sssspqqpppppssss', 'sssspqqpppppssss', 'ssssppqpppppssss',
    'sssssppppppsssss', 'ssssssppppssssss', 'sssssssggsssssss', 'sslllssggsslllss', 'ssslllsggslllsss', 'sssslllgglllssss',
    'sssssllggllsssss', 'sssssssggsssssss', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee'] },
  { name: 'Cupcake', pal: { v: '#ece4ff', r: '#ff5c7a', w: '#fff1f5', p: '#ff8fb1', y: '#ffe28a', b: '#a7d8ff', c: '#ffb3c9', d: '#ff8fb1' }, rows: [
    'vvvvvvvvvvvvvvvv', 'vvvvvvvrrvvvvvvv', 'vvvvvvvrrvvvvvvv', 'vvvvvwwwwwwvvvvv', 'vvvvwwwpwwwwvvvv', 'vvvwwywwwwbwwvvv',
    'vvwwwwwwpwwwwwvv', 'vvwbwwwwwwwywwvv', 'vvwwwwwwwwwwwwvv', 'vvvcdcdcdcdcdvvv', 'vvvcdcdcdcdcdvvv', 'vvvvcdcdcdcdvvvv',
    'vvvvcdcdcdcdvvvv', 'vvvvvcdcdcdvvvvv', 'vvvvvvvvvvvvvvvv', 'vvvvvvvvvvvvvvvv'] },
  { name: 'Mushroom', pal: { y: '#fff6d6', r: '#ff7f9c', w: '#fff', c: '#fff1e0', k: '#4b2e39', p: '#ffb3c9', e: '#c8ebbf' }, rows: [
    'yyyyyyyyyyyyyyyy', 'yyyyyyyyyyyyyyyy', 'yyyyyrrrrrryyyyy', 'yyyrrwwrrrrrryyy', 'yyrrrwwrrrwwrryy', 'yrrrrrrrrrwwrrry',
    'yrwwrrrrrrrrrrry', 'yrwwrrrwwrrrrrry', 'yyrrrrrwwrrrrryy', 'yyyyyccccccyyyyy', 'yyyyyckcckcyyyyy', 'yyyyypccccpyyyyy',
    'yyyyyccccccyyyyy', 'yyyyccccccccyyyy', 'eeeeeeeeeeeeeeee', 'eeeeeeeeeeeeeeee'] },
  { name: 'Teacup', pal: { b: '#ffe3ec', s: '#fff', w: '#fffafb', t: '#e9b48a', p: '#ff8fb1', o: '#ffc2d4' }, rows: [
    'bbbbbbbbbbbbbbbb', 'bbbbbsbbsbbbbbbb', 'bbbbsbbsbbbbbbbb', 'bbbbbsbbsbbbbbbb', 'bbbbbbbbbbbbbbbb', 'bbwwwwwwwwwwbbbb',
    'bbwttttttttwbbbb', 'bbwwwwwwwwwwwwbb', 'bbwwpwwwwpwwbwbb', 'bbwpppwwpppwbwbb', 'bbwwpwwwwpwwwwbb', 'bbbwwwwwwwwbbbbb',
    'bbbbwwwwwwbbbbbb', 'boooooooooooobbb', 'bboooooooooobbbb', 'bbbbbbbbbbbbbbbb'] },
];

export function monthPicture(monthIndex, fraction) {
  const pic = PICTURES[((monthIndex % PICTURES.length) + PICTURES.length) % PICTURES.length];
  const order = [...Array(256).keys()];
  const r = rng(monthIndex * 977 + 13);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const shown = new Set(order.slice(0, Math.round(Math.max(0, Math.min(1, fraction)) * 256)));
  const fog = ['#f6d5df', '#f9dfe7', '#f3cbd8'];
  let cells = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = y * 16 + x;
      const ch = (pic.rows[y] || '')[x] || Object.keys(pic.pal)[0];
      const color = shown.has(i) ? pic.pal[ch] : fog[hash(`${monthIndex}:${i}`) % 3];
      cells += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${color}"/>`;
    }
  }
  return { name: pic.name, svg: `<svg class="pixel" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${cells}</svg>` };
}

// ---------- icons ----------
export const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1Z"/></svg>',
  garden: '<svg viewBox="0 0 24 24"><path d="M12 21v-9M12 16c-3 0-5-2-5-4 3 0 5 2 5 4Zm0 0c3 0 5-2 5-4-3 0-5 2-5 4ZM7 4c0 5 2 8 5 8s5-3 5-8l-2.6 2.4L12 3 9.6 6.4Z"/></svg>',
  focus: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M18.5 6l1.5-1.5"/></svg>',
  progress: '<svg viewBox="0 0 24 24"><path d="M5 20v-7M12 20V5M19 20v-10"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 10.5 3.8 3.8 0 0 0 7 18Z"/></svg>',
};

export const petalIcon = '<svg class="petal-ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18 C3 13 3 5 10 2 C17 5 17 13 10 18Z" fill="#ff8fb1"/><path d="M10 15 C7 12 7 7 10 4" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7" stroke-linecap="round"/></svg>';

// A soft tulip border for the bottom of the screen.
export function meadow() {
  const r = rng(99);
  let s = '';
  for (let i = 0; i < 16; i++) {
    const x = 6 + i * 26 + r() * 10;
    const h = 26 + r() * 30;
    s += r() > .3 ? tulip(x, 120, h, r() > .5 ? '#ffb3c9' : '#ffd3e1', '#fff6f8', .9) : daisy(x, 120, h * .7, '#fff', .8);
  }
  return `<svg viewBox="0 0 420 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${s}</svg>`;
}

export { PINK, LINE };
