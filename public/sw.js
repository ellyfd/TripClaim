const CACHE_NAME = "tripclaim-shell-v2";
const OFFLINE_URL = "/offline";
const UPLOAD_DB = "tripclaim-upload-queue";
const UPLOAD_STORE = "requests";
const APP_SHELL = [
  OFFLINE_URL,
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

const openUploadDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(UPLOAD_DB, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(UPLOAD_STORE, { keyPath: "id" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const uploadStore = async (mode, action) => {
  const db = await openUploadDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(UPLOAD_STORE, mode);
    const result = action(transaction.objectStore(UPLOAD_STORE));
    result.onsuccess = () => resolve(result.result);
    result.onerror = () => reject(result.error);
    transaction.oncomplete = () => db.close();
  });
};

const notifyClients = async (message) => {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
};

const saveUpload = async (request) => {
  const id = crypto.randomUUID(), formData = await request.clone().formData();
  await uploadStore("readwrite", (store) => store.put({ id, url: request.url, formData, createdAt: Date.now() }));
  return id;
};

const removeUpload = (id) => uploadStore("readwrite", (store) => store.delete(id));
const queuedUploads = () => uploadStore("readonly", (store) => store.getAll());

const flushUploads = async () => {
  const uploads = await queuedUploads();
  for (const upload of uploads) {
    try {
      const response = await fetch(upload.url, { method: "POST", body: upload.formData, credentials: "include" });
      if (response.ok || response.status === 409) {
        await removeUpload(upload.id);
        await notifyClients({ type: "tripclaim-upload-synced", id: upload.id });
      }
    } catch {
      break;
    }
  }
};

const handleDocumentUpload = async (request) => {
  const id = await saveUpload(request);
  await notifyClients({ type: "tripclaim-upload-saved", id });
  try {
    const response = await fetch(request.clone());
    if (response.ok || response.status === 409) await removeUpload(id);
    return response;
  } catch {
    if (self.registration.sync) self.registration.sync.register("tripclaim-upload").catch(() => {});
    return Response.json({ status: "review", confidence: 0, warnings: ["已保存在手機，恢復連線後自動辨識"], queued: true }, { status: 202 });
  }
};

self.addEventListener("sync", (event) => {
  if (event.tag === "tripclaim-upload") event.waitUntil(flushUploads());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "tripclaim-flush-uploads") event.waitUntil(flushUploads());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === "POST" && url.origin === self.location.origin && url.pathname === "/api/documents") {
    event.respondWith(handleDocumentUpload(request));
    return;
  }
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.svg" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
      )
    );
  }
});
