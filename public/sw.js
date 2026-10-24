/* =========================================================================
   ANIMAL — Service worker (app instalable)
   · Logos, íconos e imágenes de /assets: desde la caché (no cambian).
   · Páginas, estilos y scripts: primero la red (siempre la última versión);
     si no hay conexión, la última copia guardada.
   · /api: nunca se guarda (los datos clínicos no quedan en el teléfono).
   Nota: los navegadores sólo activan el service worker en HTTPS o localhost.
   ========================================================================= */

const VERSION = "animal-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

const SIN_CONEXION = () => new Response(
  "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>" +
  "<body style='font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#1638B8;color:#fff;text-align:center'>" +
  "<div><h2>Sin conexión</h2><p>ANIMAL necesita conexión con el servidor de la veterinaria.</p></div>",
  { headers: { "Content-Type": "text/html; charset=utf-8" } });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (url.pathname.startsWith("/assets/")) {
      const guardado = await cache.match(req);
      if (guardado) return guardado;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req)) || (req.mode === "navigate" ? SIN_CONEXION() : Response.error());
    }
  })());
});
