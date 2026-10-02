// 로컬 테스트 서버: 정적 파일 + 실제 api/sync.mjs (Vercel Blob은 메모리로 대체)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const store = new Map(); let clock = Date.now();
const blobMock = {
  async put(p, data) { clock = Math.max(clock + 1, Date.now()); store.set(p, { data: String(data), t: clock }); return { pathname: p }; },
  async list({ prefix = '' } = {}) { return { blobs: [...store].filter(([p]) => p.startsWith(prefix)).map(([p, v]) => ({ pathname: p, size: Buffer.byteLength(v.data), uploadedAt: new Date(v.t) })), hasMore: false }; },
  async get(p) { const v = store.get(p); if (!v) return null; return { stream: new Blob([v.data]).stream() }; },
  async head(p) { const v = store.get(p); if (!v) throw new Error('not found'); return { uploadedAt: new Date(v.t), size: v.data.length, pathname: p }; },
};
globalThis.__blobMock = blobMock;
const src = fs.readFileSync(path.join(ROOT, 'api/sync.mjs'), 'utf8').replace(/import \{[^}]+\} from '\.\/_lib\/blob\.mjs';/, 'const { put, list, get, head } = globalThis.__blobMock;');
const tmp = path.join(ROOT, 'tests/sync/.handler.mjs'); fs.writeFileSync(tmp, src);
const { default: handler } = await import(pathToFileURL(tmp).href);
process.env.BLOB_READ_WRITE_TOKEN = 'test';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
let apiDown = false;
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__store') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify([...store.keys()])); }
  if (u.pathname === '/__down') { apiDown = u.searchParams.get('v') === '1'; return res.end('ok'); }
  if (u.pathname === '/api/sync') {
    if (apiDown) { res.statusCode = 503; return res.end('{"ok":false}'); }
    let body = ''; for await (const c of req) body += c;
    const r = { method: req.method, query: Object.fromEntries(u.searchParams), body: body ? JSON.parse(body) : undefined };
    const out = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { res.writeHead(this.statusCode, { 'content-type': 'application/json', ...this.headers }); res.end(JSON.stringify(o)); return this; } };
    return handler(r, out);
  }
  const f = path.join(ROOT, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(8124, '127.0.0.1', () => console.log('listening 8124'));
