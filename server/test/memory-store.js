// Stand-in for the Blob store: same read/create/update rules, kept in memory (or a JSON file).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function memoryStore(file) {
  let files = file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  let n = 0;
  const persist = () => file && writeFileSync(file, JSON.stringify(files));
  return {
    async read(path) {
      const f = files[path];
      return f ? { data: JSON.parse(f.body), etag: f.etag } : null;
    },
    async create(path, data) {
      if (files[path]) return false;
      files[path] = { body: JSON.stringify(data), etag: `e${++n}` };
      persist();
      return true;
    },
    async update(path, data, etag) {
      if (!files[path] || files[path].etag !== etag) return false;
      files[path] = { body: JSON.stringify(data), etag: `e${++n}` };
      persist();
      return true;
    },
  };
}
