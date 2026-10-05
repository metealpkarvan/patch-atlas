const CACHE = "patch-atlas-1.0.0";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.bundle.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("patch-atlas-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (
    e.request.method !== "GET" ||
    u.origin !== location.origin ||
    !u.pathname.startsWith(new URL("./", location.href).pathname)
  )
    return;
  e.respondWith(
    fetch(e.request).catch(() =>
      caches
        .match(e.request)
        .then(
          (hit) =>
            hit ||
            (e.request.mode === "navigate"
              ? caches.match("./index.html")
              : Response.error()),
        ),
    ),
  );
});
