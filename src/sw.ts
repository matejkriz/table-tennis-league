/// <reference lib="webworker" />

import { BackgroundSyncPlugin } from "workbox-background-sync";
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";

import { getDefaultPushPayload, parsePushPayload } from "./lib/push/sw";

declare let self: ServiceWorkerGlobalScope;
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

const notifyQueue = new BackgroundSyncPlugin("push-notify-match-queue", {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ request, url }) =>
    request.method === "POST" && url.pathname === "/api/push/notify-match",
  new NetworkOnly({ plugins: [notifyQueue] }),
  "POST",
);

self.addEventListener("push", (event) => {
  const defaultPayload = getDefaultPushPayload();

  const payload = (() => {
    try {
      return parsePushPayload(event.data?.json());
    } catch {
      return defaultPayload;
    }
  })();

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.data.eventId,
      data: payload.data,
      badge: "/icons/icon-192.png",
      icon: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = String(event.notification.data?.url ?? "/");

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const windowClient of windowClients) {
          if ("focus" in windowClient) {
            void windowClient.navigate(url);
            return windowClient.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }

        return Promise.resolve(undefined);
      }),
  );
});
