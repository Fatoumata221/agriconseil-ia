import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Application installable ; le service worker garde l'interface et la dernière météo en cache.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "AgriConseil IA",
        short_name: "AgriConseil",
        description: "Assistant agricole : conseils, diagnostic photo des plantes et météo pour le Sénégal.",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#fafaf9",
        theme_color: "#15803d",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/api/weather",
            handler: "NetworkFirst",
            options: {
              cacheName: "meteo",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 5, maxAgeSeconds: 7 * 24 * 3600 },
            },
          },
          {
            // Police Plus Jakarta Sans, gardée pour l'affichage hors connexion.
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: { cacheName: "polices", expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.pathname === "/api/status",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "status" },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Accessible depuis un téléphone sur le même Wi-Fi (http://<ip-du-pc>:5173).
    host: true,
    // Les clés restent côté serveur : le navigateur passe par /api.
    proxy: { "/api": "http://localhost:3001" },
  },
});
