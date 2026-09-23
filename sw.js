/* Brorilla — service worker (6.0).
   Pagina: rete e copia locale in gara, vince chi arriva prima entro 2,5 s (con poco segnale l'app parte dalla copia).
   Illustrazioni e icona: prima la copia locale, poi si aggiornano in background.
   Pulizia: tocca solo le cache di Brorilla (lo stesso dominio ospita Eisenlink e StepTeller). */
const CACHE = 'brorilla-v6.0';
const SHELL = ['./', './index.html', './icon.png', './esercizi.js'];
const WAIT = 2500;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && /^(brorilla|spotter)/i.test(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  const page = req.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
  e.respondWith(page ? race(req, e) : cacheFirst(req, e));
});
function save(req, r) { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }
async function race(req, e) {
  const net = fetch(req).then(r => save(req, r));
  const hit = await caches.match(req, { ignoreSearch: true }) || await caches.match('./index.html');
  if (!hit) return net.catch(() => new Response('Brorilla offline', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
  e.waitUntil(net.catch(() => {}));
  return Promise.race([net.catch(() => hit), new Promise(res => setTimeout(() => res(hit), WAIT))]);
}
async function cacheFirst(req, e) {
  const hit = await caches.match(req, { ignoreSearch: true });
  const net = fetch(req).then(r => save(req, r)).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await net) || new Response('', { status: 504 });
}
