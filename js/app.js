// Bunbloom: a cute routine and to-do garden.
import * as data from './data.js';
import * as art from './art.js';
import * as fx from './fx.js';
import { account, syncNow, syncSoon, startAutoSync } from './sync.js';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const P = art.petalIcon;

const view = { route: 'today', date: data.today(), range: 'week', anchor: data.today(), shopTab: 'head', just: null, hop: false };

// ---------- helpers ----------
const fmtDay = (k, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => data.parseDay(k).toLocaleDateString('en-GB', opts);
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`);
const pct = (x) => `${Math.round(x * 100)}%`;
function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Sweet dreams';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Sweet dreams';
}
const CHEERS = ['You\'re doing amazing 💖', 'One petal at a time 🌸', 'So proud of you!', 'Drink some water, cutie 💧', 'Tiny steps count ✨',
  'You make the garden bloom 🌷', 'Rest is productive too 🍵', 'Boing boing! 🐰', 'You\'ve got this 💪', 'Sending bunny hugs 🤍'];
const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];
const myName = () => data.prefs().name || account.name || 'cutie';
const equipNow = () => data.prefs().equip || {};

function moodFor(d) {
  if (d.perfect) return 'happy';
  if (d.pct >= .5) return 'normal';
  if (new Date().getHours() >= 22) return 'sleepy';
  return 'normal';
}

function dayFlower(d, size = 26, future = false) {
  const p = d.sched ? d.pct : (d.active ? 1 : 0);
  if (future || (!d.sched && !d.active)) return `<svg viewBox="0 0 26 26" width="${size}" height="${size}"><circle cx="13" cy="13" r="4" fill="#f6d5df"/></svg>`;
  const r = 4 + p * 7;
  const col = p >= 1 ? '#ff8fb1' : p >= .5 ? '#ffb3c9' : '#ffd3e1';
  return `<svg viewBox="0 0 26 26" width="${size}" height="${size}">${art.blossom(13, 13, r, col, '#ffe28a')}${p >= 1 ? art.sparkle(22, 5, 3.4, '#ffe28a') : ''}</svg>`;
}

// ---------- rewards: compare before and after, then celebrate what changed ----------
function snapshot() {
  const s = data.stats();
  return { lv: s.level.lv, stickers: new Set(s.stickers), perfect: data.day(data.today()).perfect, petals: s.petals };
}
function celebrate(before) {
  const s = data.stats();
  const after = snapshot();
  if (!before.perfect && after.perfect) {
    setTimeout(() => {
      fx.confetti(); fx.sound('tada');
      fx.sheet(`<div class="celebrate">${art.bunny({ mood: 'happy', equip: equipNow(), cls: 'big hop-loop' })}
        <h2>Perfect day!</h2><p>Every routine done. Your garden is glowing 🌷</p>
        <div class="reward">+${data.PETALS.perfect} ${P}</div><button class="btn" data-close>Yay! 💖</button></div>`, { cls: 'small', onOpen: closeBtn });
    }, 500);
  }
  for (const id of after.stickers) {
    if (!before.stickers.has(id)) {
      const st = data.STICKERS.find((x) => x.id === id);
      setTimeout(() => { fx.toast(`<span class="toast-emoji">${st.emoji}</span><b>New sticker: ${st.name}</b> +${data.PETALS.sticker} ${P}`); fx.sound('coin'); }, 900);
    }
  }
  if (after.lv > before.lv) {
    setTimeout(() => {
      fx.confetti(2000); fx.sound('tada');
      fx.sheet(`<div class="celebrate"><div class="lv-badge">Lv ${after.lv}</div>${art.bunny({ mood: 'wow', equip: equipNow(), cls: 'big hop-loop' })}
        <h2>Level up!</h2><p>${data.levelOf(data.levelNeed(before.lv) - 1).title !== s.level.title ? `You're now a <b>${s.level.title}</b>!` : `Your little ${s.level.title.toLowerCase()} is growing!`} Keep blooming 🌼</p><button class="btn" data-close>Hooray!</button></div>`, { cls: 'small', onOpen: closeBtn });
    }, before.perfect === after.perfect ? 400 : 3200);
  }
}
function closeBtn(el, close) { el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); }); }

// ---------- render ----------
let renderQueued = false;
function render() {
  renderQueued = false;
  if (!account.signedIn) return renderAuth();
  document.body.classList.remove('auth');
  const focusAdd = document.activeElement?.id === 'quick-task';
  const scrollY = window.scrollY;
  const views = { today: renderToday, garden: renderGarden, focus: renderFocus, progress: renderProgress };
  app.innerHTML = (views[view.route] || renderToday)();
  document.querySelectorAll('#nav [data-route]').forEach((b) => b.classList.toggle('on', b.dataset.route === view.route));
  if (focusAdd) $('#quick-task')?.focus();
  window.scrollTo(0, scrollY);
  view.just = null; view.hop = false;
  updateTimerPill();
}
function queueRender() { if (!renderQueued) { renderQueued = true; setTimeout(render, 0); } }

function header(title) {
  const s = data.stats();
  return `<header class="top">
    <button class="avatar" data-act="settings" aria-label="Settings">${art.bunny({ equip: equipNow(), mood: 'normal' })}</button>
    <div class="hello">${title}</div>
    <div class="petals-chip" data-act="go" data-to="garden">${P}<b>${s.petals}</b></div>
  </header>`;
}

// ----- today -----
function renderToday() {
  const k = view.date;
  const t = data.today();
  const d = data.day(k);
  const s = data.stats();
  const lv = s.level;
  const rs = data.routinesOn(k);
  const tasks = data.tasksOn(k);
  const ws = data.startOfWeek(k);
  const isToday = k === t;
  const future = k > t;

  let week = '';
  for (let i = 0; i < 7; i++) {
    const dk = data.addDays(ws, i);
    const dd = data.day(dk);
    week += `<button class="wday ${dk === k ? 'sel' : ''} ${dk === t ? 'today' : ''}" data-act="day" data-k="${dk}">
      <span>${fmtDay(dk, { weekday: 'narrow' })}</span>${dayFlower(dd, 26, dk > t)}<b>${data.parseDay(dk).getDate()}</b></button>`;
  }

  const msg = d.perfect ? 'Perfect day! Your bunny is so happy 💖'
    : future ? 'A day still waiting to bloom 🌱'
    : !d.sched ? (isToday ? 'Add a routine and watch it bloom 🌷' : 'Nothing planned that day')
    : d.done === 0 ? (isToday ? 'Let\'s plant the first petal 🌱' : 'A quiet day 🍃')
    : d.pct < .5 ? 'Nice start, keep blooming 🌸' : d.pct < 1 ? 'Almost a perfect day ✨' : '';

  const parts = data.PARTS.map((p) => {
    const list = rs.filter((r) => (r.part || 'morning') === p.id);
    if (!list.length) return '';
    const done = list.filter((r) => data.isChecked(k, r.key)).length;
    return `<section class="card list ${p.id}">
      <div class="list-head"><span class="part-emoji">${p.emoji}</span><h3>${p.name}</h3><span class="count ${done === list.length ? 'all' : ''}">${done}/${list.length}</span></div>
      ${list.map((r) => {
        const on = data.isChecked(k, r.key);
        return `<div class="item ${on ? 'done' : ''} ${view.just === r.key ? 'just' : ''}">
          <button class="emoji-bubble" data-act="edit-routine" data-id="${r.key}">${esc(r.emoji || '🌸')}</button>
          <button class="item-title" data-act="edit-routine" data-id="${r.key}">${esc(r.title)}</button>
          <button class="check ${on ? 'on' : ''}" data-act="check" data-id="${r.key}" aria-label="Done">${checkSvg}</button>
        </div>`;
      }).join('')}
    </section>`;
  }).join('');

  const empty = !data.routines().length ? `<section class="card empty">
      ${art.bunny({ mood: 'wow', equip: equipNow(), cls: 'mid' })}
      <h3>Let's plant your first routine!</h3><p>Tap one to add it, or make your own.</p>
      <div class="suggest">${SUGGESTIONS.map((x, i) => `<button class="chip" data-act="suggest" data-i="${i}">${x[1]} ${x[0]}</button>`).join('')}</div>
      <button class="btn" data-act="new-routine">${art.ICON.plus} New routine</button>
    </section>` : '';

  const taskList = tasks.map((x) => {
    const late = !x.done && x.date && x.date < t;
    const chip = x.done ? '' : x.date ? `<span class="date-chip ${late ? 'late' : ''}">${late ? 'late · ' : ''}${x.date === t ? 'today' : fmtDay(x.date, { day: 'numeric', month: 'short' })}</span>` : '';
    return `<div class="item task ${x.done ? 'done' : ''} ${view.just === x.key ? 'just' : ''}">
      <button class="check sq ${x.done ? 'on' : ''}" data-act="task" data-id="${x.key}" aria-label="Done">${checkSvg}</button>
      <button class="item-title" data-act="edit-task" data-id="${x.key}">${esc(x.title)}</button>${chip}
    </div>`;
  }).join('');
  const upcoming = isToday ? data.upcomingTasks().slice(0, 4) : [];

  return `${header(`<small>${greeting()},</small><b>${esc(myName())}</b> <span class="wave">🌸</span>`)}
    <div class="week card glass">
      <button class="wk-nav" data-act="week" data-n="-7" aria-label="Previous week">${art.ICON.back}</button>
      <div class="wdays">${week}</div>
      <button class="wk-nav" data-act="week" data-n="7" aria-label="Next week">${art.ICON.next}</button>
    </div>
    ${!isToday ? `<button class="back-today" data-act="day" data-k="${t}">${fmtDay(k, { weekday: 'long', day: 'numeric', month: 'long' })} · back to today</button>` : ''}
    <section class="card bloom">
      <div class="bloom-bunny ${view.hop ? 'hop' : ''}" data-act="pet">${art.bunny({ mood: moodFor(d), equip: equipNow() })}<div class="bubble" id="bubble"></div></div>
      <div class="bloom-info">
        <div class="label">${isToday ? 'Today\'s bloom' : fmtDay(k)}</div>
        <div class="big-num">${d.sched ? `${d.done}<small>/${d.sched}</small>` : '🌷'}</div>
        <div class="bar"><i style="width:${pct(d.pct)}"></i></div>
        <p>${msg}</p>
      </div>
      <div class="lv-row" data-act="go" data-to="garden"><span class="lv">Lv ${lv.lv}</span><span class="lv-title">${lv.title}</span>
        <div class="bar thin"><i style="width:${pct(lv.into / lv.span)}"></i></div>${s.streak > 1 ? `<span class="streak">🔥${s.streak}</span>` : ''}</div>
    </section>
    ${empty}${parts}
    <section class="card list tasks">
      <div class="list-head"><span class="part-emoji">📝</span><h3>To-dos</h3><span class="count">${tasks.filter((x) => x.done).length}/${tasks.length}</span></div>
      ${taskList}
      ${!future || true ? `<form class="quick-add" data-form="task"><input id="quick-task" placeholder="Add a to-do…" maxlength="120" autocomplete="off" enterkeyhint="done"><button aria-label="Add">${art.ICON.plus}</button></form>` : ''}
      ${upcoming.length ? `<div class="upcoming"><small>Coming up</small>${upcoming.map((x) => `<button class="up" data-act="edit-task" data-id="${x.key}"><span>${esc(x.title)}</span><em>${fmtDay(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</em></button>`).join('')}</div>` : ''}
    </section>
    <div class="spacer"></div>`;
}
const checkSvg = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
const SUGGESTIONS = [
  ['Drink water', '💧', 'morning'], ['Skincare', '🧴', 'morning'], ['Stretch', '🧘‍♀️', 'morning'], ['Vitamins', '💊', 'morning'],
  ['Make the bed', '🛏️', 'morning'], ['Pilates', '🤸‍♀️', 'day'], ['Go for a walk', '🌿', 'day'], ['Read 10 pages', '📚', 'night'],
  ['Journal', '📔', 'night'], ['Skincare', '🌙', 'night'], ['No phone in bed', '📵', 'night'], ['Tidy up 10 min', '🧹', 'night'],
];

// ----- garden -----
function renderGarden() {
  const s = data.stats();
  const p = data.prefs();
  const tab = view.shopTab;
  const items = art.SHOP.filter((i) => (tab === 'decor' ? i.slot === 'decor' : i.slot === tab));
  const eq = p.equip || {};
  const decor = p.decor || {};
  const nextLv = s.level.span - s.level.into;
  return `${header('<b>My garden</b>')}
    <section class="card garden-card">
      <div class="garden-scene" data-act="pet-garden">${art.garden({ flowers: s.flowers, decor, equip: eq, level: s.level.lv })}<div class="bubble" id="bubble"></div></div>
      <div class="garden-meta">
        <div><span class="lv">Lv ${s.level.lv}</span> <b>${s.level.title}</b></div>
        <div class="bar"><i style="width:${pct(s.level.into / s.level.span)}"></i></div>
        <small>${nextLv} more petals to Lv ${s.level.lv + 1} · ${s.flowers} flower${s.flowers === 1 ? '' : 's'} planted</small>
      </div>
    </section>
    <section class="card shop">
      <div class="shop-head"><h3>Bunny boutique</h3><div class="petals-chip big">${P}<b>${s.petals}</b></div></div>
      <div class="seg">${[['head', 'Hats'], ['face', 'Face'], ['hold', 'Treats'], ['decor', 'Garden']].map(([id, n]) => `<button class="${tab === id ? 'on' : ''}" data-act="shop-tab" data-tab="${id}">${n}</button>`).join('')}</div>
      <div class="shop-grid">${items.map((i) => {
        const owned = s.owned.includes(i.id);
        const worn = i.slot === 'decor' ? !!decor[i.id] : eq[i.slot] === i.id;
        const btn = owned ? `<button class="btn tiny ${worn ? '' : 'ghost'}" data-act="equip" data-id="${i.id}">${worn ? (i.slot === 'decor' ? 'Placed ✓' : 'Wearing ✓') : (i.slot === 'decor' ? 'Place' : 'Wear')}</button>`
          : `<button class="btn tiny buy ${s.petals < i.price ? 'poor' : ''}" data-act="buy" data-id="${i.id}">${P}${i.price}</button>`;
        return `<div class="shop-item ${owned ? 'owned' : ''} ${worn ? 'worn' : ''}"><div class="prev">${art.shopPreview(i)}</div><div class="nm">${i.name}</div>${btn}</div>`;
      }).join('')}</div>
      <p class="hint">Earn petals: ${data.PETALS.check} per routine, ${data.PETALS.task} per to-do, 1 per 2 focus minutes, ${data.PETALS.perfect} per perfect day, ${data.PETALS.sticker} per sticker.</p>
    </section>
    <div class="spacer"></div>`;
}

// ----- focus -----
const TKEY = () => `bunbloom:timer:${account.id}`;
let timer = { mode: 'idle', min: 25, label: '' };
function loadTimer() { try { timer = JSON.parse(localStorage.getItem(TKEY())) || { mode: 'idle', min: 25, label: '' }; } catch {} }
function saveTimer() { try { localStorage.setItem(TKEY(), JSON.stringify(timer)); } catch {} }
const left = () => (timer.running ? Math.max(0, (timer.endAt - Date.now()) / 1000) : timer.left ?? timer.min * 60);
const clock = (sec) => { sec = Math.ceil(sec); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
const growth = () => (timer.mode === 'focus' ? 1 - left() / timer.total : timer.mode === 'bloomed' ? 1 : 0);

function renderFocus() {
  const s = data.stats();
  const td = data.day(data.today());
  const sessions = data.all('sessions').filter((x) => x.date === data.today()).sort((a, b) => a.at - b.at);
  const m = timer.mode;
  const plantState = m === 'wilted' ? 'wilt' : m === 'focus' && !timer.running ? 'paused' : m === 'bloomed' ? 'bloomed' : m === 'idle' ? 'ghost' : '';
  let controls = '';
  if (m === 'idle') {
    controls = `<div class="presets">${[10, 15, 25, 45, 60].map((n) => `<button class="chip ${timer.min === n ? 'on' : ''}" data-act="preset" data-n="${n}">${n} min</button>`).join('')}</div>
      <div class="stepper"><button data-act="step" data-n="-5" aria-label="Less">−</button><span>${timer.min} min</span><button data-act="step" data-n="5" aria-label="More">+</button></div>
      <input class="focus-label" id="focus-label" placeholder="What are we working on? 🌷" maxlength="60" value="${esc(timer.label)}">
      <button class="btn big" data-act="start">Plant a seed 🌱</button>`;
  } else if (m === 'focus') {
    controls = `<div class="focus-on">${timer.label ? `Growing: <b>${esc(timer.label)}</b>` : 'Stay with it, your tulip is growing'}</div>
      <div class="row-btns">${timer.running ? '<button class="btn ghost" data-act="pause">Pause</button>' : '<button class="btn" data-act="resume">Resume</button>'}
      <button class="btn ghost danger" data-act="giveup">Give up</button></div>`;
  } else if (m === 'break') {
    controls = `<div class="focus-on">Break time. Stretch, sip some water 🍵</div>
      <div class="row-btns"><button class="btn ghost" data-act="skip-break">Skip break</button></div>`;
  } else if (m === 'bloomed') {
    controls = `<div class="focus-on">Your tulip bloomed! <b>+${data.focusPetals(timer.lastMin || 0)}</b> ${P}</div>
      <div class="row-btns"><button class="btn" data-act="break">${(timer.lastMin || 25) >= 45 ? 10 : 5} min break 🍵</button><button class="btn ghost" data-act="again">Grow another</button></div>`;
  } else if (m === 'wilted') {
    controls = `<div class="focus-on">The tulip wilted. That's okay, try again whenever you're ready 🤍</div>
      <button class="btn" data-act="again">Plant a new seed</button>`;
  }
  const breakArt = m === 'break' ? `<div class="break-art">${art.bunny({ mood: 'sleepy', equip: { ...equipNow(), hold: 'teacup' } })}</div>` : '';
  return `${header('<b>Focus garden</b>')}
    <section class="card focus-card ${m}">
      ${breakArt || `<div class="plant-wrap" id="plant">${art.focusPlant(m === 'idle' ? 1 : growth(), plantState)}</div>`}
      <div class="time ${m === 'bloomed' || m === 'wilted' ? 'word' : ''}" id="time">${m === 'bloomed' ? 'Bloomed!' : m === 'wilted' ? 'Wilted' : clock(left())}</div>
      ${m === 'focus' || m === 'break' ? `<div class="bar"><i id="tbar" style="width:${pct(1 - left() / timer.total)}"></i></div>` : ''}
      ${controls}
    </section>
    <section class="card">
      <div class="list-head"><span class="part-emoji">🌷</span><h3>Today's tulips</h3><span class="count">${fmtMin(td.focus)}</span></div>
      <div class="tulip-row">${sessions.length ? sessions.map((x) => `<div class="mini-tulip" title="${esc(x.label)}"><svg viewBox="0 0 30 50">${art.tulip(15, 48, 22, '#ff9dbb', '#ffe3ec', .9)}</svg><small>${x.min}m</small></div>`).join('') : '<p class="muted">No tulips yet today. Plant your first seed above 🌱</p>'}</div>
      <p class="muted small">All time: ${fmtMin(s.focusMin)} across ${s.sessions} session${s.sessions === 1 ? '' : 's'}</p>
    </section>
    <div class="spacer"></div>`;
}

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch {}
}

function startTimer(mode, min) {
  timer = { ...timer, mode, total: min * 60, endAt: Date.now() + min * 60000, running: true, left: null, min: mode === 'focus' ? min : timer.min };
  saveTimer();
  keepAwake(true);
}

function tick() {
  if (!account.signedIn) return;
  if ((timer.mode === 'focus' || timer.mode === 'break') && timer.running && Date.now() >= timer.endAt) finishTimer();
  if (view.route === 'focus') {
    const tEl = $('#time');
    if (tEl && (timer.mode === 'focus' || timer.mode === 'break')) {
      tEl.textContent = clock(left());
      const bar = $('#tbar');
      if (bar) bar.style.width = pct(1 - left() / timer.total);
      const plant = $('#plant');
      const g = Math.round(growth() * 200) / 200;
      if (plant && timer.mode === 'focus' && plant.dataset.g !== String(g)) {
        plant.dataset.g = g;
        plant.innerHTML = art.focusPlant(g, timer.running ? '' : 'paused');
      }
    }
  }
  updateTimerPill();
}

function finishTimer() {
  const wasFocus = timer.mode === 'focus';
  keepAwake(false);
  if (wasFocus) {
    const min = Math.round(timer.total / 60);
    const before = snapshot();
    data.addSession(min, timer.label);
    timer = { ...timer, mode: 'bloomed', running: false, lastMin: min };
    saveTimer();
    fx.sound('chime');
    if (view.route === 'focus' && document.visibilityState === 'visible') { fx.confetti(1800); render(); }
    else fx.toast(`🌷 <b>Your tulip bloomed!</b> +${data.focusPetals(min)} ${P}`);
    celebrate(before);
  } else {
    timer = { ...timer, mode: 'idle', running: false };
    saveTimer();
    fx.sound('chime');
    fx.toast('🌱 <b>Break is over.</b> Ready to bloom again?');
    if (view.route === 'focus') render();
  }
}

function updateTimerPill() {
  const pill = $('#timer-pill');
  const show = (timer.mode === 'focus' || timer.mode === 'break') && view.route !== 'focus' && account.signedIn;
  pill.classList.toggle('show', show);
  if (show) pill.innerHTML = `${timer.mode === 'focus' ? '🌱' : '🍵'} ${clock(left())}${timer.running ? '' : ' ⏸'}`;
}

// ----- progress -----
function renderProgress() {
  const kind = view.range;
  const [from, to] = data.range(kind, view.anchor);
  const sum = data.summaryFor(from, to);
  const s = data.stats();
  const t = data.today();
  const label = kind === 'week' ? `${fmtDay(from, { day: 'numeric', month: 'short' })} – ${fmtDay(to, { day: 'numeric', month: 'short' })}`
    : kind === 'month' ? fmtDay(from, { month: 'long', year: 'numeric' }) : from.slice(0, 4);

  let chart = '';
  if (kind === 'week') {
    let bars = '';
    for (let k = from; k <= to; k = data.addDays(k, 1)) {
      const d = data.day(k);
      const fut = k > t;
      bars += `<div class="bcol ${k === t ? 'today' : ''}"><div class="bwrap"><i style="height:${fut || !d.sched ? 0 : Math.max(4, d.pct * 100)}%"></i>${d.perfect ? '<em>🌸</em>' : ''}</div>
        <small>${fmtDay(k, { weekday: 'narrow' })}</small></div>`;
    }
    chart = `<div class="bars">${bars}</div>`;
  } else if (kind === 'month') {
    const pad = data.weekday(from);
    let cells = '<span></span>'.repeat(pad);
    for (let k = from; k <= to; k = data.addDays(k, 1)) {
      cells += `<button class="cal-day ${k === t ? 'today' : ''}" data-act="open-day" data-k="${k}">${dayFlower(data.day(k), 30, k > t)}<small>${data.parseDay(k).getDate()}</small></button>`;
    }
    chart = `<div class="cal-head">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="cal">${cells}</div>`;
  } else {
    let months = '';
    for (let m = 0; m < 12; m++) {
      const mk = `${from.slice(0, 4)}-${String(m + 1).padStart(2, '0')}-01`;
      const [a, b] = data.range('month', mk);
      const ms = a > t ? null : data.summaryFor(a, b);
      months += `<div class="bcol"><div class="bwrap"><i style="height:${ms ? Math.max(3, ms.pct * 100) : 0}%"></i></div><small>${fmtDay(mk, { month: 'narrow' })}</small></div>`;
    }
    let heat = '';
    const start = data.startOfWeek(from);
    for (let k = start; k <= to; k = data.addDays(k, 1)) {
      if (k < from) { heat += '<i class="h-none"></i>'; continue; }
      const d = data.day(k);
      const lvl = k > t ? 'f' : !d.sched && !d.active ? 0 : d.sched ? Math.ceil(d.pct * 4) : 2;
      heat += `<i class="h${lvl}"></i>`;
    }
    chart = `<div class="bars year">${months}</div><div class="heat">${heat}</div>`;
  }

  let focusBars = '';
  if (kind !== 'year') {
    let max = 30;
    const vals = [];
    for (let k = from; k <= to; k = data.addDays(k, 1)) { const f = data.day(k).focus; vals.push([k, f]); max = Math.max(max, f); }
    focusBars = `<div class="fbars ${kind}">${vals.map(([k, f]) => `<i style="height:${(f / max) * 100}%" title="${fmtMin(f)}"></i>`).join('')}</div>`;
  }

  const pic = data.monthReveal(kind === 'year' ? t : view.anchor);
  const mIndex = (() => { const d = data.parseDay(kind === 'year' ? t : view.anchor); return d.getFullYear() * 12 + d.getMonth(); })();
  const picture = art.monthPicture(mIndex, pic.fraction);
  const per = sum.per.sort((a, b) => b.done / b.sched - a.done / a.sched);

  return `${header('<b>My progress</b>')}
    <div class="seg wide">${['week', 'month', 'year'].map((x) => `<button class="${kind === x ? 'on' : ''}" data-act="range" data-r="${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div>
    <div class="period"><button class="wk-nav" data-act="period" data-n="-1">${art.ICON.back}</button><b>${label}</b><button class="wk-nav" data-act="period" data-n="1">${art.ICON.next}</button></div>
    <div class="stats">
      <div class="stat card"><span>🔥</span><b>${s.streak}</b><small>day streak · best ${s.best}</small></div>
      <div class="stat card"><span>🌸</span><b>${pct(sum.pct)}</b><small>routines done</small></div>
      <div class="stat card"><span>⏳</span><b>${fmtMin(sum.focus)}</b><small>focused</small></div>
      <div class="stat card"><span>💖</span><b>${sum.perfect}</b><small>perfect day${sum.perfect === 1 ? '' : 's'} · ${sum.tasks} to-do${sum.tasks === 1 ? '' : 's'}</small></div>
    </div>
    <section class="card"><div class="list-head"><span class="part-emoji">🌷</span><h3>Blooms</h3><span class="count">${sum.done}/${sum.sched}</span></div>${chart}</section>
    <section class="card reveal">
      <div class="reveal-pic">${picture.svg}</div>
      <div><div class="label">${fmtDay(kind === 'year' ? t : view.anchor, { month: 'long' })} picture</div>
        <h3>${pic.fraction >= 1 ? `${picture.name}! 🎉` : 'Mystery picture'}</h3>
        <div class="bar"><i style="width:${pct(pic.fraction)}"></i></div>
        <small>${pct(pic.fraction)} revealed · every routine, to-do and focus session uncovers a tile</small></div>
    </section>
    ${focusBars ? `<section class="card"><div class="list-head"><span class="part-emoji">⏳</span><h3>Focus time</h3><span class="count">${fmtMin(sum.focus)}</span></div>${focusBars}</section>` : ''}
    ${per.length ? `<section class="card"><div class="list-head"><span class="part-emoji">🔁</span><h3>Routines</h3></div>
      ${per.map((x) => `<div class="per"><span class="emoji-bubble sm">${esc(x.r.emoji || '🌸')}</span><div class="per-main"><div class="per-top"><span>${esc(x.r.title)}</span><b>${x.done}/${x.sched}</b></div>
        <div class="bar thin"><i style="width:${pct(x.done / x.sched)}"></i></div></div></div>`).join('')}</section>` : ''}
    <section class="card"><div class="list-head"><span class="part-emoji">⭐</span><h3>Stickers</h3><span class="count">${s.stickers.length}/${data.STICKERS.length}</span></div>
      <div class="stickers">${data.STICKERS.map((st) => {
        const got = s.stickers.includes(st.id);
        return `<button class="sticker ${got ? 'got' : ''}" data-act="sticker" data-id="${st.id}"><span>${got ? st.emoji : '?'}</span><small>${got ? st.name : '???'}</small></button>`;
      }).join('')}</div></section>
    <div class="spacer"></div>`;
}

// ---------- auth ----------
let authMode = 'register';
function renderAuth() {
  document.body.classList.add('auth');
  document.querySelectorAll('#nav').forEach((n) => n.classList.remove('show'));
  const recover = authMode === 'recover';
  app.innerHTML = `<div class="auth-wrap">
    <div class="auth-hero">${art.bunny({ mood: 'happy', equip: { head: 'flowercrown' }, cls: 'big float' })}</div>
    <h1 class="logo">Bunbloom</h1>
    <p class="tag">Tiny habits, big blooms 🌷</p>
    <section class="card auth-card">
      ${recover ? '<h3>Forgot your password?</h3><p class="muted small">Use the recovery code you saved when you joined.</p>' : `<div class="seg">
        <button class="${authMode === 'register' ? 'on' : ''}" data-act="auth-mode" data-m="register">I'm new</button>
        <button class="${authMode === 'login' ? 'on' : ''}" data-act="auth-mode" data-m="login">Welcome back</button></div>`}
      <form data-form="auth">
        <label>Username<input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_\\-]{3,20}"></label>
        ${recover ? '<label>Recovery code<input name="code" autocapitalize="characters" autocomplete="off" required placeholder="XXXX-XXXX-XXXX-XXXX"></label>' : ''}
        <label>${recover ? 'New password' : 'Password'}<input name="password" type="password" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" required minlength="6" maxlength="72"></label>
        <div class="form-err" id="auth-err"></div>
        <button class="btn big" type="submit">${recover ? 'Set new password' : authMode === 'register' ? 'Plant my garden 🌱' : 'Open my garden 🌷'}</button>
      </form>
      ${recover ? '<button class="link" data-act="auth-mode" data-m="login">Back to sign in</button>' : authMode === 'login' ? '<button class="link" data-act="auth-mode" data-m="recover">Forgot password?</button>' : '<p class="muted small center">Your garden is saved to your account, so it is safe for years and shows up on every device.</p>'}
    </section>
  </div>`;
}

function showRecovery(code, fresh) {
  fx.sheet(`<div class="celebrate">${art.bunny({ mood: 'wow', equip: { head: 'bow' }, cls: 'mid' })}
    <h2>${fresh ? 'Welcome to Bunbloom!' : 'New password set!'}</h2>
    <p>This is your <b>recovery code</b>. If you ever forget your password, it lets you back in. Take a screenshot or write it down. You only see it once.</p>
    <div class="code">${code}</div>
    <button class="btn" data-close>I saved it 💖</button></div>`, { cls: 'small', onOpen: closeBtn });
}

// ---------- sheets for editing ----------
const EMOJIS = ['🌸', '🌷', '💧', '🧴', '🧘‍♀️', '🤸‍♀️', '🏃‍♀️', '📚', '💊', '🦷', '🛏️', '🍵', '🥗', '🍓', '✨', '💖', '🐰', '🧹', '📝', '📔', '💤', '☀️', '🌙', '🎀', '🧺', '🪴', '🌿', '🎧', '💅', '🛁', '📵', '🍎', '🥛', '🐶', '💌', '🎨'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function routineSheet(rid, preset) {
  const r = rid ? data.get('routines', rid) : null;
  const st = { title: r?.title || preset?.[0] || '', emoji: r?.emoji || preset?.[1] || '🌸', part: r?.part || preset?.[2] || partNow(), days: r?.days || [0, 1, 2, 3, 4, 5, 6] };
  const body = () => `<h3 class="sheet-title">${r ? 'Edit routine' : 'New routine'}</h3>
    <input class="field" id="r-title" placeholder="e.g. Morning skincare" maxlength="60" value="${esc(st.title)}">
    ${r ? '' : `<div class="ideas">${SUGGESTIONS.map((x, i) => `<button class="chip" data-idea="${i}">${x[1]} ${x[0]}</button>`).join('')}</div>`}
    <div class="label">Icon</div>
    <div class="emoji-grid">${EMOJIS.map((e) => `<button class="${st.emoji === e ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
    <div class="label">When</div>
    <div class="seg">${data.PARTS.map((p) => `<button class="${st.part === p.id ? 'on' : ''}" data-part="${p.id}">${p.emoji} ${p.name}</button>`).join('')}</div>
    <div class="label">Days <button class="link inline" data-alldays>every day</button></div>
    <div class="days">${DAYS.map((d, i) => `<button class="${st.days.includes(i) ? 'on' : ''}" data-day="${i}">${d}</button>`).join('')}</div>
    <div class="row-btns">${r ? `<button class="btn ghost danger" data-del>${art.ICON.trash} Remove</button>` : ''}<button class="btn" data-save>${r ? 'Save' : 'Plant it 🌱'}</button></div>`;
  fx.sheet(`<div class="sheet-body">${body()}</div>`, {
    onOpen: (el, close) => {
      const inner = $('.sheet-body', el);
      const redraw = () => { st.title = $('#r-title', el).value; inner.innerHTML = body(); };
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.idea) { const [t, em, pt] = SUGGESTIONS[Number(b.dataset.idea)]; $('#r-title', el).value = t; st.emoji = em; st.part = pt; redraw(); }
        else if (b.dataset.e) { st.emoji = b.dataset.e; redraw(); }
        else if (b.dataset.part) { st.part = b.dataset.part; redraw(); }
        else if (b.dataset.day) {
          const i = Number(b.dataset.day);
          st.days = st.days.includes(i) ? st.days.filter((x) => x !== i) : [...st.days, i].sort();
          redraw();
        } else if (b.hasAttribute('data-alldays')) { st.days = [0, 1, 2, 3, 4, 5, 6]; redraw(); }
        else if (b.hasAttribute('data-save')) {
          const title = $('#r-title', el).value.trim();
          if (!title) { $('#r-title', el).classList.add('shake'); setTimeout(() => $('#r-title', el)?.classList.remove('shake'), 500); return; }
          if (!st.days.length) { fx.toast('Pick at least one day 🌼'); return; }
          data.saveRoutine(rid || data.newId(), { title, emoji: st.emoji, part: st.part, days: st.days });
          fx.sound('pop');
          close();
          if (!rid) fx.toast(`${st.emoji} <b>${esc(title)}</b> planted!`);
        } else if (b.hasAttribute('data-del')) {
          close();
          if (await fx.ask('Remove this routine?', 'Your past progress stays in your stats. It just won\'t show up from today on.', 'Remove')) data.removeRoutine(rid);
        }
      });
      if (!r && !preset) setTimeout(() => $('#r-title', el)?.focus(), 350);
    },
  });
}
function partNow() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'day' : 'night'; }

function taskSheet(id) {
  const x = id ? data.get('tasks', id) : null;
  const t = data.today();
  const st = { title: x?.title || '', date: x ? x.date : (view.date > t ? view.date : t) };
  const body = () => `<h3 class="sheet-title">${x ? 'Edit to-do' : 'New to-do'}</h3>
    <input class="field" id="t-title" placeholder="e.g. Book Pilates class" maxlength="120" value="${esc(st.title)}">
    <div class="label">Due</div>
    <div class="seg">${[['Today', t], ['Tomorrow', data.addDays(t, 1)], ['Someday', null]].map(([n, v]) => `<button class="${st.date === v ? 'on' : ''}" data-date="${v ?? ''}">${n}</button>`).join('')}</div>
    <input class="field" type="date" id="t-date" value="${st.date || ''}">
    <div class="row-btns">${x ? `<button class="btn ghost danger" data-del>${art.ICON.trash} Delete</button>` : ''}<button class="btn" data-save>${x ? 'Save' : 'Add to-do'}</button></div>`;
  fx.sheet(`<div class="sheet-body">${body()}</div>`, {
    onOpen: (el, close) => {
      const inner = $('.sheet-body', el);
      el.addEventListener('change', (e) => { if (e.target.id === 't-date') { st.title = $('#t-title', el).value; st.date = e.target.value || null; inner.innerHTML = body(); } });
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.date !== undefined) { st.title = $('#t-title', el).value; st.date = b.dataset.date || null; inner.innerHTML = body(); }
        else if (b.hasAttribute('data-save')) {
          const title = $('#t-title', el).value.trim();
          if (!title) return;
          if (x) data.put('tasks', id, { title, date: st.date });
          else data.put('tasks', data.newId(), { title, date: st.date, done: false, created: Date.now() });
          fx.sound('pop');
          close();
        } else if (b.hasAttribute('data-del')) { data.put('tasks', id, { deleted: true }); close(); }
      });
      if (!x) setTimeout(() => $('#t-title', el)?.focus(), 350);
    },
  });
}

function plusSheet() {
  fx.sheet(`<h3 class="sheet-title">Plant something new</h3>
    <div class="plus-grid">
      <button data-p="routine"><span>🔁</span><b>Routine</b><small>Something you do on repeat</small></button>
      <button data-p="task"><span>📝</span><b>To-do</b><small>A one-time task</small></button>
      <button data-p="focus"><span>⏳</span><b>Focus</b><small>Grow a tulip while you work</small></button>
    </div>`, {
    cls: 'small',
    onOpen: (el, close) => el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-p]')?.dataset.p;
      if (!p) return;
      close();
      setTimeout(() => { if (p === 'routine') routineSheet(); if (p === 'task') taskSheet(); if (p === 'focus') go('focus'); }, 200);
    }),
  });
}

function settingsSheet() {
  const p = data.prefs();
  const st = { syncing: 'Syncing…', ok: 'All saved to your account', pending: 'Saving soon…', offline: 'Offline. Will save when you are back online', error: 'Could not save. Will retry', idle: 'Ready' };
  fx.sheet(`<h3 class="sheet-title">Settings</h3>
    <div class="settings-bunny">${art.bunny({ equip: equipNow(), mood: 'happy' })}<div><b>${esc(account.name)}</b><small>${st[account.status] || ''}</small></div></div>
    <div class="label">What should I call you?</div>
    <input class="field" id="s-name" maxlength="24" placeholder="${esc(account.name)}" value="${esc(p.name || '')}">
    <button class="toggle-row" data-s="sound"><span>🔔 Sounds</span><i class="toggle ${p.sound === false ? '' : 'on'}"></i></button>
    <button class="toggle-row" data-s="sync"><span>☁️ Save to account now</span><i>›</i></button>
    <button class="toggle-row" data-s="export"><span>💾 Download a backup</span><i>›</i></button>
    <button class="toggle-row" data-s="out"><span>👋 Sign out</span><i>›</i></button>
    <p class="muted small center">Bunbloom · made with love 💗</p>`, {
    onOpen: (el, close) => {
      $('#s-name', el).addEventListener('change', (e) => data.setPrefs({ name: e.target.value.trim() }));
      el.addEventListener('click', async (e) => {
        const s = e.target.closest('[data-s]')?.dataset.s;
        if (s === 'sound') {
          const on = data.prefs().sound === false;
          data.setPrefs({ sound: on });
          fx.setSound(on);
          e.target.closest('[data-s]').querySelector('.toggle').classList.toggle('on', on);
        }
        if (s === 'sync') { await syncNow(); fx.toast(account.status === 'ok' ? '☁️ <b>All saved!</b>' : '☁️ Could not reach the server, will retry'); }
        if (s === 'export') {
          const blob = new Blob([JSON.stringify(data.exportAll(), null, 1)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `bunbloom-backup-${data.today()}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }
        if (s === 'out') {
          close();
          if (await fx.ask('Sign out?', 'Your garden is saved to your account. Sign back in any time.', 'Sign out')) {
            await account.signOut();
            render();
          }
        }
      });
    },
  });
}

// ---------- actions ----------
function go(route) {
  view.route = route;
  if (location.hash !== `#${route}`) history.replaceState(null, '', `#${route}`);
  window.scrollTo(0, 0);
  render();
  app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
}

function sayBubble(text) {
  const b = $('#bubble');
  if (!b) return;
  b.textContent = text;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

const actions = {
  go: (b) => go(b.dataset.to),
  settings: settingsSheet,
  day: (b) => { view.date = b.dataset.k; render(); },
  week: (b) => { view.date = data.addDays(view.date, Number(b.dataset.n)); render(); },
  check: (b, e) => {
    const k = view.date;
    if (k > data.today()) { fx.toast('🌱 That day hasn\'t bloomed yet'); return; }
    const before = snapshot();
    const on = data.toggleCheck(k, b.dataset.id);
    const rect = b.getBoundingClientRect();
    if (on) {
      fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
      fx.floatText(rect.left + rect.width / 2, rect.top - 6, `+${data.PETALS.check} ${P}`);
      fx.sound('pop');
      view.just = b.dataset.id; view.hop = true;
    } else fx.sound('undo');
    render();
    if (on) { celebrate(before); if (Math.random() < .35) setTimeout(() => sayBubble(cheer()), 250); }
  },
  task: (b) => {
    const before = snapshot();
    const done = data.toggleTask(b.dataset.id, view.date > data.today() ? data.today() : view.date);
    const rect = b.getBoundingClientRect();
    if (done) {
      fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
      fx.floatText(rect.left + rect.width / 2, rect.top - 6, `+${data.PETALS.task} ${P}`);
      fx.sound('pop');
      view.just = b.dataset.id; view.hop = true;
    } else fx.sound('undo');
    render();
    if (done) celebrate(before);
  },
  'edit-routine': (b) => routineSheet(b.dataset.id),
  'edit-task': (b) => taskSheet(b.dataset.id),
  'new-routine': () => routineSheet(),
  suggest: (b) => routineSheet(null, SUGGESTIONS[Number(b.dataset.i)]),
  pet: (b) => {
    const svg = b.querySelector('.bunny');
    svg.classList.remove('hop'); void svg.getBoundingClientRect(); svg.classList.add('hop');
    sayBubble(cheer());
    fx.sound('pop');
    const r = b.getBoundingClientRect();
    fx.floatText(r.left + r.width / 2, r.top + 10, '💗');
  },
  'pet-garden': (b, e) => {
    const g = b.querySelector('.garden-bunny');
    if (!e.target.closest('.garden-bunny')) return;
    g.classList.remove('hop'); void g.getBoundingClientRect(); g.classList.add('hop');
    sayBubble(cheer());
    fx.sound('pop');
  },
  'shop-tab': (b) => { view.shopTab = b.dataset.tab; render(); },
  buy: async (b) => {
    const item = art.SHOP.find((i) => i.id === b.dataset.id);
    const s = data.stats();
    if (s.petals < item.price) {
      fx.toast(`${P} <b>${item.price - s.petals} more petals</b> needed. Keep blooming!`);
      b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 500);
      return;
    }
    if (!await fx.ask(`Buy ${item.name}?`, `<span class="ask-prev">${art.shopPreview(item)}</span>It costs ${item.price} petals.`, `Buy for ${item.price} 🌸`)) return;
    const before = snapshot();
    if (data.buy(item.id)) {
      data.equip(item);
      fx.sound('coin');
      fx.confetti(1400);
      render();
      fx.toast(`🛍️ <b>${item.name}</b> is yours!`);
      celebrate(before);
    }
  },
  equip: (b) => { data.equip(art.SHOP.find((i) => i.id === b.dataset.id)); fx.sound('pop'); },
  preset: (b) => { timer.min = Number(b.dataset.n); saveTimer(); render(); },
  step: (b) => { timer.min = Math.max(5, Math.min(120, timer.min + Number(b.dataset.n))); saveTimer(); render(); },
  start: () => { timer.label = $('#focus-label')?.value.trim() || ''; startTimer('focus', timer.min); fx.sound('pop'); render(); },
  pause: () => { timer.left = left(); timer.running = false; saveTimer(); keepAwake(false); render(); },
  resume: () => { timer.endAt = Date.now() + timer.left * 1000; timer.running = true; timer.left = null; saveTimer(); keepAwake(true); render(); },
  giveup: async () => {
    if (!await fx.ask('Give up this tulip?', 'It will wilt and won\'t count. You can always plant a new one.', 'Give up', 'Keep going')) return;
    timer = { ...timer, mode: 'wilted', running: false };
    saveTimer(); keepAwake(false); fx.sound('wilt'); render();
  },
  break: () => { startTimer('break', (timer.lastMin || 25) >= 45 ? 10 : 5); render(); },
  'skip-break': () => { timer = { ...timer, mode: 'idle', running: false }; saveTimer(); keepAwake(false); render(); },
  again: () => { timer = { ...timer, mode: 'idle', running: false }; saveTimer(); render(); },
  range: (b) => { view.range = b.dataset.r; view.anchor = data.today(); render(); },
  period: (b) => {
    const n = Number(b.dataset.n);
    const d = data.parseDay(view.anchor);
    if (view.range === 'week') view.anchor = data.addDays(view.anchor, 7 * n);
    else if (view.range === 'month') view.anchor = data.dayKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
    else view.anchor = `${d.getFullYear() + n}-01-01`;
    render();
  },
  'open-day': (b) => { if (b.dataset.k > data.today()) return; view.date = b.dataset.k; go('today'); },
  sticker: (b) => {
    const st = data.STICKERS.find((x) => x.id === b.dataset.id);
    const got = data.stats().stickers.includes(st.id);
    fx.toast(`<span class="toast-emoji">${got ? st.emoji : '🔒'}</span><b>${got ? st.name : 'Secret sticker'}</b> ${esc(st.desc)}`);
  },
  'auth-mode': (b) => { authMode = b.dataset.m; renderAuth(); },
};

app.addEventListener('click', (e) => {
  fx.unlockAudio();
  const b = e.target.closest('[data-act]');
  if (b && actions[b.dataset.act]) actions[b.dataset.act](b, e);
});
document.addEventListener('pointerdown', fx.unlockAudio, { once: false, passive: true });

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.dataset.form === 'task') {
    const input = $('#quick-task');
    const title = input.value.trim();
    if (!title) return;
    const t = data.today();
    data.put('tasks', data.newId(), { title, date: view.date > t ? view.date : null, done: false, created: Date.now() });
    fx.sound('pop');
    input.value = '';
  }
  if (f.dataset.form === 'auth') {
    const fd = Object.fromEntries(new FormData(f));
    const btn = f.querySelector('button[type=submit]');
    const err = $('#auth-err');
    err.textContent = '';
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      const res = await account.enter(authMode, fd);
      fx.confetti(2000);
      fx.sound('tada');
      view.route = 'today'; view.date = data.today();
      loadTimer();
      fx.setSound(data.prefs().sound !== false);
      $('#nav').classList.add('show');
      render();
      if (res.recovery) showRecovery(res.recovery, authMode === 'register');
      authMode = 'login';
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }
});

// ---------- boot ----------
function nav() {
  const n = $('#nav');
  n.innerHTML = `<button data-route="today">${art.ICON.home}<span>Today</span></button>
    <button data-route="garden">${art.ICON.garden}<span>Garden</span></button>
    <button class="plus" data-plus aria-label="Add">${art.ICON.plus}</button>
    <button data-route="focus">${art.ICON.focus}<span>Focus</span></button>
    <button data-route="progress">${art.ICON.progress}<span>Progress</span></button>`;
  n.addEventListener('click', (e) => {
    fx.unlockAudio();
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-plus')) { fx.sound('pop'); plusSheet(); return; }
    if (b.dataset.route === 'today' && view.route === 'today') view.date = data.today();
    go(b.dataset.route);
  });
  $('#timer-pill').addEventListener('click', () => go('focus'));
}

function backdrop() {
  $('#meadow').innerHTML = art.meadow();
  const petals = $('#petals');
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDelay = `${-Math.random() * 16}s`;
    p.style.animationDuration = `${12 + Math.random() * 10}s`;
    p.style.setProperty('--s', (.6 + Math.random() * .8).toFixed(2));
    petals.appendChild(p);
  }
}

data.onChange((src) => {
  if (src === 'local') syncSoon();
  if (account.signedIn) queueRender();
});
account.onSignedOut(() => { fx.toast('Please sign in again 🌷'); render(); });
account.onStatus(() => { const el = $('.settings-bunny small'); if (el) el.textContent = { syncing: 'Syncing…', ok: 'All saved to your account', pending: 'Saving soon…', offline: 'Offline. Will save when you are back online', error: 'Could not save. Will retry' }[account.status] || ''; });

addEventListener('hashchange', () => { const r = location.hash.slice(1); if (r && r !== view.route) go(r); });
// A new day while the app sits open.
let lastDay = data.today();
setInterval(() => { const t = data.today(); if (t !== lastDay) { if (view.date === lastDay) view.date = t; lastDay = t; render(); } tick(); }, 500);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && timer.running && timer.mode === 'focus') keepAwake(true);
});

backdrop();
nav();
const initial = location.hash.slice(1);
if (['today', 'garden', 'focus', 'progress'].includes(initial)) view.route = initial;
if (account.signedIn) {
  data.load(account.id);
  loadTimer();
  fx.setSound(data.prefs().sound !== false);
  $('#nav').classList.add('show');
  syncNow();
}
startAutoSync();
render();
if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) navigator.serviceWorker.register('sw.js');
