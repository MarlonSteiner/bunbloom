// Her data, kept on the device first and synced to the server in the background.
// Every record carries u: the time it was last edited. The newest edit of each record wins.
import { SHOP } from './art.js';

export const COLLS = ['routines', 'tasks', 'checks', 'sessions', 'owned', 'prefs'];
const empty = () => Object.fromEntries(COLLS.map((c) => [c, {}]));

let user = null;
let c = empty();
let seq = 0;
let dirty = new Set();
const listeners = new Set();
let cache = null;

const keyFor = (u) => `bunbloom:data:${u}`;

export function load(userId) {
  user = userId;
  c = empty(); seq = 0; dirty = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(userId)));
    if (saved) {
      for (const coll of COLLS) c[coll] = saved.c?.[coll] || {};
      seq = saved.seq || 0;
      dirty = new Set(saved.dirty || []);
    }
  } catch {}
  changed('load');
}

function save() {
  if (!user) return;
  try { localStorage.setItem(keyFor(user), JSON.stringify({ c, seq, dirty: [...dirty] })); } catch {}
}

function changed(src) { cache = null; listeners.forEach((f) => f(src)); }
export const onChange = (f) => listeners.add(f);

export const get = (coll, key) => c[coll][key];
export const all = (coll) => Object.entries(c[coll]).map(([key, rec]) => ({ key, ...rec }));

export function put(coll, key, fields) {
  const old = c[coll][key];
  const u = Math.max(Date.now(), (old?.u || 0) + 1);
  c[coll][key] = { ...(old || {}), ...fields, u };
  dirty.add(`${coll}/${key}`);
  save();
  changed('local');
  return c[coll][key];
}

// ---------- sync glue ----------
export const syncSeq = () => seq;
export const hasPending = () => dirty.size > 0;
export function pending() {
  const out = {};
  for (const d of dirty) {
    const i = d.indexOf('/');
    const coll = d.slice(0, i), key = d.slice(i + 1);
    const rec = c[coll]?.[key];
    if (rec) (out[coll] ||= {})[key] = { ...rec };
  }
  return out;
}
export function applyRemote(res, sent) {
  for (const [coll, recs] of Object.entries(sent || {})) {
    for (const [key, rec] of Object.entries(recs)) {
      if (c[coll][key]?.u === rec.u) dirty.delete(`${coll}/${key}`);
    }
  }
  const seen = new Set();
  let news = false;
  for (const [coll, recs] of Object.entries(res.changes || {})) {
    if (!c[coll]) continue;
    for (const [key, rec] of Object.entries(recs)) {
      seen.add(`${coll}/${key}`);
      const mine = c[coll][key];
      if (dirty.has(`${coll}/${key}`) && mine && mine.u > rec.u) continue;
      if (!mine || mine.u !== rec.u) news = true; // an echo of our own edit is not news
      c[coll][key] = rec;
      dirty.delete(`${coll}/${key}`);
    }
  }
  // A full answer means the server sent everything it has. Anything it lacks is sent up next time.
  if (res.full) {
    for (const coll of COLLS) for (const key of Object.keys(c[coll])) {
      if (!seen.has(`${coll}/${key}`)) dirty.add(`${coll}/${key}`);
    }
  }
  seq = res.seq;
  save();
  if (news) changed('remote');
}
export function wipeLocal(userId) { try { localStorage.removeItem(keyFor(userId)); } catch {} }
export function exportAll() { return JSON.parse(JSON.stringify({ exported: new Date().toISOString(), user, data: c })); }

// ---------- dates (local calendar days as YYYY-MM-DD) ----------
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dayKey();
export const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
export const weekday = (k) => (parseDay(k).getDay() + 6) % 7; // 0 = Monday
export const startOfWeek = (k) => addDays(k, -weekday(k));
export const diffDays = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- routines, checks, tasks ----------
export const PARTS = [
  { id: 'morning', name: 'Morning', emoji: '☀️' },
  { id: 'day', name: 'Daytime', emoji: '🌤️' },
  { id: 'night', name: 'Evening', emoji: '🌙' },
];

export const prefs = () => c.prefs.main || {};
export const setPrefs = (fields) => put('prefs', 'main', { ...prefs(), ...fields });

export function routineOn(r, k) {
  if (r.deleted) return false;
  if (r.start && k < r.start) return false;
  if (r.end && k >= r.end) return false;
  return (r.days || [0, 1, 2, 3, 4, 5, 6]).includes(weekday(k));
}
const partOrder = (p) => PARTS.findIndex((x) => x.id === p);
export function routines() {
  return all('routines').filter((r) => !r.deleted && !r.end)
    .sort((a, b) => partOrder(a.part) - partOrder(b.part) || (a.order ?? 0) - (b.order ?? 0) || a.u - b.u);
}
export function routinesOn(k) {
  return all('routines').filter((r) => routineOn(r, k))
    .sort((a, b) => partOrder(a.part) - partOrder(b.part) || (a.order ?? 0) - (b.order ?? 0) || (a.created || 0) - (b.created || 0));
}
export const checkKey = (k, rid) => `${k}~${rid}`;
export const isChecked = (k, rid) => !!c.checks[checkKey(k, rid)]?.on;
export function toggleCheck(k, rid) {
  const on = !isChecked(k, rid);
  put('checks', checkKey(k, rid), { on, at: Date.now() });
  return on;
}
export function saveRoutine(rid, fields) {
  const old = get('routines', rid);
  return put('routines', rid, old ? fields : { start: today(), created: Date.now(), order: Date.now(), ...fields });
}
export function removeRoutine(rid) {
  const r = get('routines', rid);
  if (!r) return;
  // Keep its history. If it was only made today, it simply never existed.
  if (r.start >= today()) put('routines', rid, { deleted: true });
  else put('routines', rid, { end: today() });
}

export function tasksOn(k) {
  const t = today();
  return all('tasks').filter((x) => !x.deleted).filter((x) => {
    if (x.done) return x.doneOn === k;
    if (k === t) return !x.date || x.date <= t;
    return x.date === k;
  }).sort((a, b) => (a.done - b.done) || (a.date || '9').localeCompare(b.date || '9') || a.created - b.created);
}
export const upcomingTasks = () => all('tasks').filter((x) => !x.deleted && !x.done && x.date && x.date > today())
  .sort((a, b) => a.date.localeCompare(b.date));
export function toggleTask(id, k = today()) {
  const t = get('tasks', id);
  const done = !t.done;
  put('tasks', id, { done, doneOn: done ? k : null, at: Date.now() });
  return done;
}

export function addSession(min, label) {
  const k = today();
  put('sessions', newId(), { date: k, min, label: label || '', at: Date.now() });
}

// ---------- numbers ----------
export const PETALS = { check: 5, task: 8, perfect: 15, sticker: 25 };
export const focusPetals = (min) => Math.floor(min / 2);

export const LEVELS = [
  [1, 'Seedling'], [3, 'Sprout'], [5, 'Little Bud'], [8, 'Tulip'], [12, 'Blossom'],
  [16, 'Bunny Gardener'], [20, 'Petal Princess'], [25, 'Flower Fairy'], [32, 'Garden Queen'], [40, 'Bloom Legend'],
];
export const levelNeed = (lv) => 25 * lv * (lv + 1); // petals earned to reach level lv+1
export function levelOf(xp) {
  let lv = 1;
  while (xp >= levelNeed(lv)) lv++;
  const from = lv > 1 ? levelNeed(lv - 1) : 0;
  const title = [...LEVELS].reverse().find(([l]) => lv >= l)[1];
  return { lv, title, into: xp - from, span: levelNeed(lv) - from };
}

export function day(k) {
  const s = stats();
  return s.days.get(k) || summarize(k);
}

function summarize(k) {
  const rs = routinesOn(k);
  const done = rs.filter((r) => isChecked(k, r.key)).length;
  return { k, sched: rs.length, done, pct: rs.length ? done / rs.length : 0, tasks: 0, focus: 0, sessions: 0, perfect: rs.length > 0 && done === rs.length };
}

// Everything that needs the whole history, computed once per change.
export function stats() {
  if (cache) return cache;
  const t = today();
  const days = new Map();
  const ensure = (k) => { if (!days.has(k)) days.set(k, { k, sched: 0, done: 0, pct: 0, tasks: 0, focus: 0, sessions: 0, perfect: false }); return days.get(k); };

  let first = t;
  const rs = all('routines').filter((r) => !r.deleted);
  for (const r of rs) if (r.start && r.start < first) first = r.start;
  let checks = 0, early = false;
  for (const [key, ch] of Object.entries(c.checks)) {
    if (!ch.on) continue;
    const [k, rid] = key.split('~');
    const r = c.routines[rid];
    if (!r || r.deleted) continue;
    checks++;
    if (k < first) first = k;
    if (r.part === 'morning' && ch.at && new Date(ch.at).getHours() < 8 && dayKey(new Date(ch.at)) === k) early = true;
  }
  let tasksDone = 0;
  for (const x of Object.values(c.tasks)) {
    if (x.deleted || !x.done || !x.doneOn) continue;
    tasksDone++;
    ensure(x.doneOn).tasks++;
    if (x.doneOn < first) first = x.doneOn;
  }
  let focusMin = 0, sessions = 0, night = false;
  for (const s of Object.values(c.sessions)) {
    focusMin += s.min; sessions++;
    const d = ensure(s.date); d.focus += s.min; d.sessions++;
    if (s.date < first) first = s.date;
    if (s.at && new Date(s.at).getHours() >= 22) night = true;
  }

  let perfectDays = 0, best = 0, run = 0, perfectRun = 0, bestPerfectRun = 0;
  for (let k = first; k <= t; k = addDays(k, 1)) {
    const d = ensure(k);
    const on = rs.filter((r) => routineOn(r, k));
    d.sched = on.length;
    d.done = on.filter((r) => c.checks[checkKey(k, r.key)]?.on).length;
    d.pct = d.sched ? d.done / d.sched : 0;
    d.perfect = d.sched > 0 && d.done === d.sched;
    d.active = d.done > 0 || d.tasks > 0 || d.sessions > 0;
    if (d.perfect) { perfectDays++; perfectRun++; bestPerfectRun = Math.max(bestPerfectRun, perfectRun); } else if (k !== t) perfectRun = 0;
    if (d.active) { run++; best = Math.max(best, run); } else if (k !== t) run = 0;
  }
  const streak = run;

  const owned = Object.keys(c.owned).filter((k) => c.owned[k] && !c.owned[k].gone);
  const spent = owned.reduce((sum, k) => sum + (SHOP.find((i) => i.id === k)?.price || 0), 0);

  const base = { checks, tasksDone, focusMin, sessions, perfectDays, best, streak, bestPerfectRun, early, night, ownedCount: owned.length };
  const stickers = STICKERS.filter((s) => s.test(base)).map((s) => s.id);
  const earned = checks * PETALS.check + tasksDone * PETALS.task + focusPetals(focusMin) + perfectDays * PETALS.perfect + stickers.length * PETALS.sticker;
  const level = levelOf(earned);
  const flowers = checks + tasksDone + sessions;

  cache = { ...base, days, first, stickers, earned, spent, petals: Math.max(0, earned - spent), level, flowers, owned };
  return cache;
}

export const STICKERS = [
  { id: 'first', emoji: '🌱', name: 'First Bloom', desc: 'Finish your very first routine', test: (s) => s.checks >= 1 },
  { id: 'streak3', emoji: '🔥', name: 'Warming Up', desc: '3 days in a row', test: (s) => s.best >= 3 },
  { id: 'streak7', emoji: '🌷', name: 'Tulip Week', desc: '7 days in a row', test: (s) => s.best >= 7 },
  { id: 'streak30', emoji: '🌸', name: 'Blooming Month', desc: '30 days in a row', test: (s) => s.best >= 30 },
  { id: 'streak100', emoji: '👑', name: 'Garden Royalty', desc: '100 days in a row', test: (s) => s.best >= 100 },
  { id: 'perfect1', emoji: '💖', name: 'Perfect Day', desc: 'Finish every routine in a day', test: (s) => s.perfectDays >= 1 },
  { id: 'perfect7', emoji: '🎀', name: 'Perfect Week', desc: '7 perfect days in a row', test: (s) => s.bestPerfectRun >= 7 },
  { id: 'tasks10', emoji: '📝', name: 'Busy Bunny', desc: 'Finish 10 to-dos', test: (s) => s.tasksDone >= 10 },
  { id: 'tasks100', emoji: '🧺', name: 'Basket Full', desc: 'Finish 100 to-dos', test: (s) => s.tasksDone >= 100 },
  { id: 'focus1', emoji: '⏳', name: 'Deep Breath', desc: 'Focus for 1 hour in total', test: (s) => s.focusMin >= 60 },
  { id: 'focus10', emoji: '🍵', name: 'Calm Mind', desc: 'Focus for 10 hours in total', test: (s) => s.focusMin >= 600 },
  { id: 'focus100', emoji: '🧘‍♀️', name: 'Zen Garden', desc: 'Focus for 100 hours in total', test: (s) => s.focusMin >= 6000 },
  { id: 'early', emoji: '🐣', name: 'Early Bird', desc: 'Tick a morning routine before 8 am', test: (s) => s.early },
  { id: 'night', emoji: '🦉', name: 'Night Owl', desc: 'Finish a focus session after 10 pm', test: (s) => s.night },
  { id: 'shop1', emoji: '🛍️', name: 'Treat Yourself', desc: 'Buy something in the shop', test: (s) => s.ownedCount >= 1 },
  { id: 'shop10', emoji: '💎', name: 'Collector', desc: 'Own 10 shop items', test: (s) => s.ownedCount >= 10 },
  { id: 'checks500', emoji: '🌻', name: 'Green Thumb', desc: 'Tick 500 routines', test: (s) => s.checks >= 500 },
];

export function buy(itemId) {
  const item = SHOP.find((i) => i.id === itemId);
  const s = stats();
  if (!item || s.owned.includes(itemId) || s.petals < item.price) return false;
  put('owned', itemId, { at: Date.now() });
  return true;
}
export function equip(item) {
  const p = prefs();
  if (item.slot === 'decor') {
    const decor = { ...(p.decor || {}) };
    decor[item.id] = !decor[item.id];
    setPrefs({ decor });
  } else {
    const eq = { ...(p.equip || {}) };
    eq[item.slot] = eq[item.slot] === item.id ? null : item.id;
    setPrefs({ equip: eq });
  }
}

// Ranges for the progress page.
export function range(kind, anchor = today()) {
  if (kind === 'week') { const s = startOfWeek(anchor); return [s, addDays(s, 6)]; }
  if (kind === 'month') {
    const d = parseDay(anchor);
    return [dayKey(new Date(d.getFullYear(), d.getMonth(), 1)), dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
  }
  const y = parseDay(anchor).getFullYear();
  return [`${y}-01-01`, `${y}-12-31`];
}
export function summaryFor(from, to) {
  const t = today();
  let sched = 0, done = 0, tasks = 0, focus = 0, perfect = 0, active = 0;
  const per = new Map();
  for (let k = from; k <= to && k <= t; k = addDays(k, 1)) {
    const d = day(k);
    sched += d.sched; done += d.done; tasks += d.tasks; focus += d.focus;
    if (d.perfect) perfect++;
    if (d.active) active++;
    for (const r of routinesOn(k)) {
      const p = per.get(r.key) || { r, sched: 0, done: 0 };
      p.sched++; if (isChecked(k, r.key)) p.done++;
      per.set(r.key, p);
    }
  }
  return { sched, done, pct: sched ? done / sched : 0, tasks, focus, perfect, active, per: [...per.values()] };
}

// The monthly picture fills in as she finishes things: one tile for every routine, to-do or focus session.
export function monthReveal(anchor = today()) {
  const [from, to] = range('month', anchor);
  let target = 0, got = 0;
  for (let k = from; k <= to; k = addDays(k, 1)) {
    target += routinesOn(k).length;
    if (k <= today()) { const d = day(k); got += d.done + d.tasks + d.sessions; }
  }
  target = Math.max(30, target);
  return { fraction: Math.min(1, got / target), got, target };
}
