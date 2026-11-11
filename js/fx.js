// Sparkly feedback: petal bursts, flower confetti, floating rewards, toasts and tiny sounds.
const layer = () => document.getElementById('fx');
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const PETAL_COLORS = ['#ff8fb1', '#ffb3c9', '#ffd3e1', '#fff', '#ffe28a', '#c9b3ff'];

function petalEl(color, size) {
  const el = document.createElement('div');
  el.className = 'fx-petal';
  el.style.cssText = `width:${size}px;height:${size * 1.25}px;background:${color}`;
  return el;
}

export function burst(x, y, n = 12) {
  if (calm()) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * .4;
    const d = 38 + Math.random() * 42;
    const el = petalEl(PETAL_COLORS[i % PETAL_COLORS.length], 7 + Math.random() * 6);
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    layer().appendChild(el);
    const rot = Math.random() * 360;
    el.animate([
      { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(.3)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) rotate(${rot + 180}deg) scale(1)`, opacity: 1, offset: .55 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d + 40}px)) rotate(${rot + 300}deg) scale(.8)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => el.remove();
  }
  for (let i = 0; i < 4; i++) {
    const s = document.createElement('div');
    s.className = 'fx-star';
    s.textContent = '✦';
    s.style.left = `${x + (Math.random() - .5) * 70}px`; s.style.top = `${y + (Math.random() - .5) * 50}px`;
    layer().appendChild(s);
    s.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 1, offset: .4 }, { transform: 'scale(0)', opacity: 0 }],
      { duration: 700, delay: i * 80 }).onfinish = () => s.remove();
  }
}

export function floatText(x, y, html) {
  const el = document.createElement('div');
  el.className = 'fx-float';
  el.innerHTML = html;
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  layer().appendChild(el);
  el.animate([
    { transform: 'translate(-50%,0) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-26px) scale(1.1)', opacity: 1, offset: .25 },
    { transform: 'translate(-50%,-70px) scale(1)', opacity: 0 },
  ], { duration: 1300, easing: 'ease-out' }).onfinish = () => el.remove();
}

export function confetti(ms = 2600) {
  if (calm()) return;
  const flowers = ['🌸', '🌷', '💖', '✿', '🌼', '🎀', '✨'];
  const W = innerWidth;
  for (let i = 0; i < 46; i++) {
    const el = document.createElement('div');
    el.className = 'fx-confetti';
    el.textContent = flowers[i % flowers.length];
    el.style.left = `${Math.random() * W}px`;
    el.style.fontSize = `${16 + Math.random() * 18}px`;
    layer().appendChild(el);
    const drift = (Math.random() - .5) * 160;
    el.animate([
      { transform: 'translate(0,-40px) rotate(0)', opacity: 1 },
      { transform: `translate(${drift}px, ${innerHeight + 60}px) rotate(${(Math.random() - .5) * 720}deg)`, opacity: .9 },
    ], { duration: ms + Math.random() * 1400, delay: Math.random() * 700, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'backwards' }).onfinish = () => el.remove();
  }
}

let toastTimer;
export function toast(html) {
  const el = document.getElementById('toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- sounds (made on the fly, no files) ----------
let ctx = null;
let soundOn = true;
export const setSound = (on) => { soundOn = on; };
export function unlockAudio() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
  if (ctx.state === 'suspended') ctx.resume();
}
function tone(freq, start, dur, type = 'sine', vol = .16) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime + start);
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + .015);
  g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + .05);
}
export function sound(name) {
  if (!soundOn || !ctx) return;
  if (name === 'pop') { tone(880, 0, .12, 'sine', .14); tone(1320, .06, .16, 'sine', .1); }
  if (name === 'undo') { tone(520, 0, .12, 'sine', .08); }
  if (name === 'chime') [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .09, .5, 'sine', .11));
  if (name === 'tada') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .08, .7, 'triangle', .1));
  if (name === 'coin') { tone(988, 0, .1, 'square', .05); tone(1319, .08, .3, 'square', .05); }
  if (name === 'wilt') [440, 392, 330].forEach((f, i) => tone(f, i * .15, .35, 'sine', .08));
}

// ---------- sheets and dialogs ----------
export function sheet(html, { onOpen, onClose, cls = '' } = {}) {
  const root = document.getElementById('sheets');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    onClose?.();
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 320);
  };
  wrap.querySelector('.sheet-bg').addEventListener('click', close);
  const el = wrap.querySelector('.sheet');
  onOpen?.(el, close);
  return { el, close };
}

export function ask(title, text, yes = 'Yes', no = 'Cancel') {
  return new Promise((resolve) => {
    sheet(`<h3 class="sheet-title">${title}</h3><p class="sheet-text">${text}</p>
      <div class="row-btns"><button class="btn ghost" data-a="no">${no}</button><button class="btn" data-a="yes">${yes}</button></div>`, {
      cls: 'small',
      onClose: () => resolve(false),
      onOpen: (el, close) => el.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a) { resolve(a === 'yes'); close(); }
      }),
    });
  });
}
