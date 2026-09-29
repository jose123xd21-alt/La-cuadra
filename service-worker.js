const CACHE_NAME = "la-granja-de-la-abuela-v13-salud";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./maskable-512.png"
];

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDtauQRMU2vWS8RI_9TiDr-mZewvkQpxR4",
  authDomain: "la-granja-de-la-abuela.firebaseapp.com",
  projectId: "la-granja-de-la-abuela",
  storageBucket: "la-granja-de-la-abuela.firebasestorage.app",
  messagingSenderId: "191036578892",
  appId: "1:191036578892:web:cec8275b54cc52572e28e9"
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || "./?view=healthView";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(target) : undefined;
    })
  );
});

// Firebase Cloud Messaging para avisos cuando la PWA está cerrada.
// Si aún no se ha configurado Web Push, este bloque no afecta al resto de la app.
try {
  importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || "La Granja de la Abuela";
    const options = {
      body: data.body || "Tienes un aviso pendiente.",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: data.tag || "la-granja-aviso",
      data: { url: data.url || "./?view=healthView" }
    };
    self.registration.showNotification(title, options);
  });
} catch (error) {
  console.warn("Firebase Messaging no disponible todavía:", error);
}
