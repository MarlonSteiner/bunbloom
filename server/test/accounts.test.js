// node test/accounts.test.js
import assert from 'node:assert/strict';
import { accounts } from '../lib/accounts.js';
import { memoryStore } from './memory-store.js';

const api = accounts(memoryStore());
const call = async (body, token) => (await api(body, token));
const ok = async (body, token) => {
  const r = await call(body, token);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
};

const a = await ok({ action: 'register', username: 'Mimi', password: 'tulips123' });
assert.match(a.token, /^mimi\./);
assert.match(a.recovery, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
assert.equal((await call({ action: 'register', username: 'mimi', password: 'whatever1' })).status, 409);
assert.equal((await call({ action: 'login', username: 'mimi', password: 'nope123' })).status, 401);
const phone = a.token;
const ipad = (await ok({ action: 'login', username: 'MIMI', password: 'tulips123' })).token;

// Empty garden.
let s = await ok({ action: 'sync', since: 0 }, phone);
assert.deepEqual(s, { seq: 0, changes: {}, full: true });

// Phone adds a routine, iPad sees it.
s = await ok({ action: 'sync', since: 0, changes: { routines: { r1: { title: 'Water', u: 10 } } } }, phone);
assert.equal(s.seq, 1);
let p = await ok({ action: 'sync', since: 0 }, ipad);
assert.equal(p.changes.routines.r1.title, 'Water');

// Older edit loses, newer wins.
await ok({ action: 'sync', since: 1, changes: { routines: { r1: { title: 'Old', u: 5 } } } }, ipad);
p = await ok({ action: 'sync', since: 0 }, phone);
assert.equal(p.changes.routines.r1.title, 'Water');
assert.equal(p.seq, 1, 'a losing edit does not bump seq');
p = await ok({ action: 'sync', since: 1, changes: { routines: { r1: { title: 'Water plants', u: 20 } }, checks: { '2026-11-11~r1': { on: true, u: 21 } } } }, ipad);
assert.equal(p.seq, 2);
p = await ok({ action: 'sync', since: 1 }, phone);
assert.equal(p.changes.routines.r1.title, 'Water plants');
assert.ok(p.changes.checks['2026-11-11~r1'].on);
assert.equal(p.full, false);

// Bad data is refused.
assert.equal((await call({ action: 'sync', changes: { hacks: { x: { u: 1 } } } }, phone)).status, 400);
assert.equal((await call({ action: 'sync', changes: { tasks: { x: { title: 'no time' } } } }, phone)).status, 400);
assert.equal((await call({ action: 'sync' }, 'mimi.wrong')).status, 401);

// Recovery code resets the password and signs out the other devices.
const r = await ok({ action: 'recover', username: 'mimi', code: a.recovery.toLowerCase().replace(/-/g, ' '), password: 'newpass99' });
assert.notEqual(r.recovery, a.recovery);
assert.equal((await call({ action: 'sync' }, phone)).status, 401);
assert.equal((await call({ action: 'login', username: 'mimi', password: 'tulips123' })).status, 401);
const fresh = await ok({ action: 'sync', since: 0 }, r.token);
assert.equal(fresh.changes.routines.r1.title, 'Water plants', 'data survives a password reset');
assert.equal((await call({ action: 'recover', username: 'mimi', code: a.recovery, password: 'again1234' })).status, 401, 'old code is spent');

// Sign out ends only that device.
const t2 = (await ok({ action: 'login', username: 'mimi', password: 'newpass99' })).token;
await ok({ action: 'signout' }, t2);
assert.equal((await call({ action: 'me' }, t2)).status, 401);
await ok({ action: 'me' }, r.token);

console.log('all account tests pass');
