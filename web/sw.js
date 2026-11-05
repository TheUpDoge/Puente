// Puente service worker: the whole app and its word lists are cached so it works with no signal.
// Bump VERSION whenever a file below changes, so phones pick up the new copy.

const VERSION = "puente-tx-v2";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/puente.css",
  "./js/app.js",
  "./js/course.js",
  "./js/dialects.js",
  "./js/map-data.js",
  "./js/ear.js",
  "./js/lexicon.js",
  "./js/normalize.js",
  "./js/tejano.js",
  "./js/translate.js",
  "./js/voice.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./content/index.json",
  "./content/phrasebook/tx-tejano.json",
  "./content/phrasebook/tx-chicano-calo.json",
  "./content/phrasebook/tx-se-texas.json",
  "./content/phrasebook/es-mx-slang.json",
  "./content/phrasebook/es-cu-slang.json",
  "./content/phrasebook/work-sheet-metal.json",
  "./content/courses/tejano-101.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fonts: cache as they come, fall back to the system font when offline.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(`${VERSION}-fonts`).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          cache.put(req, res.clone());
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // App files: network first so edits show up, cache when there is no signal.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit ?? caches.match("./index.html"))),
  );
});
