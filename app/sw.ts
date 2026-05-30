/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, BackgroundSyncPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: /\/api\/v1\/reader\/progress|\/api\/v1\/users\/me/i,
      handler: new NetworkOnly({
        plugins: [
          new BackgroundSyncPlugin("offline-mutations-sync", {
            maxRetentionTime: 24 * 60, // 24 horas em minutos
          }),
        ],
      }),
    },
    {
      matcher: /^https:\/\/.*\.b-cdn\.net\/.*/i,
      handler: new CacheFirst({
        cacheName: "bunny-cdn-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
