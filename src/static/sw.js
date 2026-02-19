/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

const CACHE_NAME = "sleep-tracker-v7";

const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
];

sw.addEventListener("install", (event) => {
  // Activate new SW immediately instead of waiting for all tabs to close
  sw.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      // Take control of existing pages so they use the new SW right away
      .then(() => sw.clients.claim())
  );
});

sw.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

sw.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: sw.location.origin,
      id: data.id,
    },
  };

  if (data.id) {
    options.actions = [{ action: "useful", title: "👍 Useful" }];
  }

  event.waitUntil(sw.registration.showNotification(data.title, options));
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationId = event.notification.data?.id;

  // Action button pressed: send feedback directly
  if (notificationId && event.action === "useful") {
    event.waitUntil(
      fetch("/api/notifications/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId, feedback: "useful" }),
      }).catch((err) =>
        console.error("Failed to send notification feedback:", err)
      )
    );
    return;
  }

  // Body tap: open feedback page if notification has an id, otherwise open app
  const url = notificationId
    ? `/notification-feedback?id=${encodeURIComponent(notificationId)}`
    : event.notification.data?.url || "/";

  event.waitUntil(clients.openWindow(url));
});
