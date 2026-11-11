// The account and the background sync with the server.
import * as data from './data.js';

const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = LOCAL ? `http://${location.hostname}:4191/api/garden` : 'https://bunbloom-garden.vercel.app/api/garden';
const KEY = 'bunbloom:account';

let me = null; // { id, name, token }
try { me = JSON.parse(localStorage.getItem(KEY)); } catch {}
const statusListeners = new Set();
let status = 'idle';

function remember(next) {
  me = next;
  try {
    if (me) localStorage.setItem(KEY, JSON.stringify(me));
    else localStorage.removeItem(KEY);
  } catch {}
}

function setStatus(s) { status = s; statusListeners.forEach((f) => f(s)); }

async function call(action, body = {}) {
  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(me && { Authorization: `Bearer ${me.token}` }) },
      body: JSON.stringify({ action, ...body }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    const e = new Error("Couldn't reach the garden. Check your internet and try again.");
    e.offline = true;
    throw e;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(json.error || 'Something went wrong. Try again.');
    e.status = res.status;
    throw e;
  }
  return json;
}

let syncing = false, again = false, timer = null, onSignedOut = () => {};

export const account = {
  get signedIn() { return !!me; },
  get id() { return me?.id; },
  get name() { return me?.name; },
  get status() { return status; },
  onStatus: (f) => statusListeners.add(f),
  onSignedOut: (f) => { onSignedOut = f; },

  async enter(action, fields) {
    const res = await call(action, fields);
    remember({ id: res.id, name: res.name, token: res.token });
    data.load(res.id);
    await syncNow();
    return res; // register and recover also return a recovery code
  },

  async signOut() {
    try { await syncNow(); await call('signout'); } catch {}
    remember(null);
  },
};

export async function syncNow() {
  if (!me) return;
  if (syncing) { again = true; return; }
  syncing = true;
  setStatus('syncing');
  const sent = data.pending();
  try {
    const res = await call('sync', { since: data.syncSeq(), changes: sent });
    data.applyRemote(res, sent);
    setStatus(data.hasPending() ? 'pending' : 'ok');
  } catch (e) {
    if (e.status === 401) {
      remember(null);
      onSignedOut();
    }
    setStatus(e.offline ? 'offline' : 'error');
  } finally {
    syncing = false;
  }
  if (again) { again = false; syncNow(); }
}

// Changes are sent a moment after she stops tapping, so a burst of ticks is one upload.
export function syncSoon() {
  clearTimeout(timer);
  setStatus('pending');
  timer = setTimeout(syncNow, 2500);
}

export function startAutoSync() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
    else if (data.hasPending()) { clearTimeout(timer); syncNow(); }
  });
  addEventListener('online', syncNow);
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 3 * 60 * 1000);
}
