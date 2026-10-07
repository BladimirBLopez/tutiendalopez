self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// Sin caché a propósito: los datos de ventas e inventario siempre vienen frescos
self.addEventListener("fetch", () => {});
