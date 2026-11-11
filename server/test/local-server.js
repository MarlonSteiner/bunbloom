// Local copy of the API for testing the app without touching the real accounts.
// node test/local-server.js  ->  http://localhost:4191/api/garden
import { createServer } from 'node:http';
import { accounts } from '../lib/accounts.js';
import { memoryStore } from './memory-store.js';

const handle = accounts(memoryStore(process.env.STORE_FILE));
const port = Number(process.env.PORT || 4191);

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body = {};
  try { body = JSON.parse(raw); } catch {}
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const { status, json } = await handle(body, token);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(json));
}).listen(port, () => console.log(`Bunbloom test API on http://localhost:${port}/api/garden`));
