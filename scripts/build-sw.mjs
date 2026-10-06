import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/client');
const files = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const name = path.join(folder, entry.name);
    if (entry.isDirectory()) await walk(name);
    else if (!name.includes(`${path.sep}.vite${path.sep}`) && !['_headers', 'sw.js'].includes(entry.name)) files.push(name);
  }
}
await walk(root);
files.sort();
const hash = createHash('sha256');
hash.update('vagon-service-worker-v2');
for (const name of files) hash.update(await readFile(name));
const cacheName = `vagon-shell-${hash.digest('hex').slice(0, 16)}`;
// Cloudflare redirects /index.html to /. Cache the canonical document so its
// Response can be used for an offline navigation without a redirect error.
const assets = files.map(name => {
  const relative = path.relative(root, name).split(path.sep).join('/');
  return relative === 'index.html' ? '/' : '/' + relative;
});
const source = `const CACHE = ${JSON.stringify(cacheName)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vagon-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => (await caches.match('/')) || Response.error()));
    return;
  }
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
`;
await writeFile(path.join(root, 'sw.js'), source);
console.log(`PWA shell generated: ${assets.length} resources, ${cacheName}`);
