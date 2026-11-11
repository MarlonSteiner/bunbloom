// Accounts and garden sync. The store is passed in, so the same rules run on Vercel and in local tests.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const MAX_SESSIONS = 10;
const MAX_FAILS = 8;
const LOCK_MS = 10 * 60 * 1000;
const NAME = /^[A-Za-z0-9_-]{3,20}$/;
const KEY = /^[A-Za-z0-9_~:.-]{1,64}$/;
const COLLECTIONS = ['routines', 'tasks', 'checks', 'sessions', 'owned', 'prefs'];
const MAX_RECORD = 4000; // bytes of JSON per record
const MAX_CHANGES = 3000; // records per sync
const MAX_DOC = 8 * 1024 * 1024;

const hashSecret = async (secret, salt) => (await promisify(scrypt)(secret, salt, 32)).toString('hex');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const userPath = (id) => `users/${id}.json`;
const dataPath = (id) => `data/${id}.json`;
const sameHash = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

// A code she can write down once. If she forgets her password, it lets her choose a new one.
function newRecoveryCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(16);
  let code = '';
  for (let i = 0; i < 16; i++) code += abc[bytes[i] % abc.length] + (i % 4 === 3 && i < 15 ? '-' : '');
  return code;
}
const cleanCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

class Refusal extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function accounts(store) {
  // Two devices can write at once, so a lost race reads again and retries.
  async function change(path, edit, fallback) {
    for (let i = 0; i < 8; i++) {
      const found = await store.read(path);
      if (!found) {
        if (!fallback) throw new Refusal(404, 'That account no longer exists.');
        const doc = fallback();
        const out = edit(doc);
        if (out === false) return doc;
        if (await store.create(path, doc)) return doc;
        continue;
      }
      const out = edit(found.data);
      if (out === false) return found.data;
      if (await store.update(path, found.data, found.etag)) return found.data;
    }
    throw new Refusal(503, 'The garden is busy. Try again.');
  }

  function checkName(username) {
    if (typeof username !== 'string' || !NAME.test(username)) {
      throw new Refusal(400, 'Usernames have 3 to 20 letters or numbers.');
    }
  }
  function checkPassword(password) {
    if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
      throw new Refusal(400, 'Passwords need at least 6 characters.');
    }
  }

  function newSession(user, id) {
    const secret = randomBytes(24).toString('hex');
    user.sessions = [...user.sessions, sha(secret)].slice(-MAX_SESSIONS);
    return `${id}.${secret}`;
  }

  const profile = (user, extra) => ({ id: user.name.toLowerCase(), name: user.name, ...extra });

  async function register({ username, password }) {
    checkName(username);
    checkPassword(password);
    const id = username.toLowerCase();
    const salt = randomBytes(16).toString('hex');
    const recovery = newRecoveryCode();
    const user = {
      name: username, salt, hash: await hashSecret(password, salt),
      recovery: await hashSecret(cleanCode(recovery), salt),
      sessions: [], fails: 0, lockedUntil: 0, created: Date.now(),
    };
    const token = newSession(user, id);
    if (!await store.create(userPath(id), user)) throw new Refusal(409, 'That username is taken.');
    return profile(user, { token, recovery });
  }

  async function guarded(username, check) {
    const id = username.toLowerCase();
    const found = await store.read(userPath(id));
    const wrong = new Refusal(401, 'Wrong username or password.');
    if (!found) throw wrong;
    if (found.data.lockedUntil > Date.now()) throw new Refusal(429, 'Too many tries. Wait a few minutes.');
    if (!await check(found.data)) {
      await change(userPath(id), (u) => {
        u.fails++;
        if (u.fails >= MAX_FAILS) { u.fails = 0; u.lockedUntil = Date.now() + LOCK_MS; }
      });
      throw wrong;
    }
    return id;
  }

  async function login({ username, password }) {
    checkName(username);
    checkPassword(password);
    const id = await guarded(username, async (u) => sameHash(await hashSecret(password, u.salt), u.hash));
    let token;
    const user = await change(userPath(id), (u) => { u.fails = 0; token = newSession(u, id); });
    return profile(user, { token });
  }

  // Forgot password: the recovery code sets a new one, signs out every device and hands out a fresh code.
  async function recover({ username, code, password }) {
    checkName(username);
    checkPassword(password);
    const id = await guarded(username, async (u) => sameHash(await hashSecret(cleanCode(code), u.salt), u.recovery));
    const salt = randomBytes(16).toString('hex');
    const recovery = newRecoveryCode();
    const hash = await hashSecret(password, salt);
    const recoveryHash = await hashSecret(cleanCode(recovery), salt);
    let token;
    const user = await change(userPath(id), (u) => {
      Object.assign(u, { salt, hash, recovery: recoveryHash, sessions: [], fails: 0, lockedUntil: 0 });
      token = newSession(u, id);
    });
    return profile(user, { token, recovery });
  }

  async function signedIn(token) {
    const [id, secret] = String(token).split('.');
    const found = id && secret && NAME.test(id) ? await store.read(userPath(id)) : null;
    if (!found || !found.data.sessions.includes(sha(secret))) throw new Refusal(401, 'Please sign in again.');
    return { id, user: found.data };
  }

  async function signOut(_, token) {
    const { id } = await signedIn(token);
    const secret = sha(String(token).split('.')[1]);
    await change(userPath(id), (u) => { u.sessions = u.sessions.filter((s) => s !== secret); });
    return { ok: true };
  }

  function checkChanges(changes) {
    if (!changes || typeof changes !== 'object') return [];
    const list = [];
    for (const [coll, records] of Object.entries(changes)) {
      if (!COLLECTIONS.includes(coll) || !records || typeof records !== 'object') throw new Refusal(400, 'Unknown data.');
      for (const [key, rec] of Object.entries(records)) {
        if (!KEY.test(key) || !rec || typeof rec !== 'object' || Array.isArray(rec)) throw new Refusal(400, 'Unknown data.');
        if (!Number.isFinite(rec.u)) throw new Refusal(400, 'Unknown data.');
        if (JSON.stringify(rec).length > MAX_RECORD) throw new Refusal(400, 'Something is too long.');
        list.push([coll, key, rec]);
      }
    }
    if (list.length > MAX_CHANGES) throw new Refusal(400, 'Too many changes at once.');
    return list;
  }

  // Each record keeps the time it was last edited (u). The newest edit wins, record by record,
  // so a phone and an iPad can both work offline and meet up later without losing anything.
  // The server numbers every accepted edit (s), and a device asks for everything after the last number it saw.
  async function sync({ since, changes }, token) {
    const { id } = await signedIn(token);
    const list = checkChanges(changes);
    const empty = () => ({ seq: 0, c: Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) });
    let doc;
    if (!list.length) {
      doc = (await store.read(dataPath(id)))?.data || empty();
    } else {
      doc = await change(dataPath(id), (d) => {
        const seq = d.seq + 1;
        let changed = false;
        for (const [coll, key, rec] of list) {
          const old = d.c[coll][key];
          if (!old || rec.u > old.u || (rec.u === old.u && JSON.stringify({ ...rec, s: 0 }) > JSON.stringify({ ...old, s: 0 }))) {
            d.c[coll][key] = { ...rec, s: seq };
            changed = true;
          }
        }
        if (!changed) return false;
        d.seq = seq;
        if (JSON.stringify(d).length > MAX_DOC) throw new Refusal(413, 'The garden is full. Please tell Marlon.');
      }, empty);
    }
    const from = Number.isInteger(since) && since >= 0 && since <= doc.seq ? since : 0;
    const out = {};
    for (const coll of COLLECTIONS) {
      for (const [key, rec] of Object.entries(doc.c[coll])) {
        if (rec.s > from) (out[coll] ||= {})[key] = rec;
      }
    }
    return { seq: doc.seq, changes: out, full: from === 0 };
  }

  const actions = {
    register: (body) => register(body),
    login: (body) => login(body),
    recover: (body) => recover(body),
    me: async (_, token) => profile((await signedIn(token)).user),
    signout: signOut,
    sync,
  };

  return async function handle(body, token) {
    const run = actions[body?.action];
    if (!run) return { status: 400, json: { error: 'Unknown request.' } };
    try {
      return { status: 200, json: await run(body, token) };
    } catch (e) {
      if (e instanceof Refusal) return { status: e.status, json: { error: e.message } };
      console.error(e);
      return { status: 500, json: { error: 'Something went wrong. Try again.' } };
    }
  };
}
