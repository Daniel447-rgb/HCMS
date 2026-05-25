import { defineConfig }  from "vite";
import react             from "@vitejs/plugin-react";
import tailwindcss       from "@tailwindcss/vite";
import { VitePWA }       from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      devOptions: {
        enabled: false,
      },

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],

      manifest: {
        name:             "HostelDesk — Crawford University",
        short_name:       "HostelDesk",
        description:      "Hostel Complaint Management System for Crawford University students and staff",
        theme_color:      "#1447A3",
        background_color: "#f8fafc",
        display:          "standalone",
        orientation:      "portrait",
        scope:            "/",
        start_url:        "/",
        icons: [
          {
            src:   "pwa-192x192.png",
            sizes: "192x192",
            type:  "image/png",
          },
          {
            src:   "pwa-512x512.png",
            sizes: "512x512",
            type:  "image/png",
          },
          {
            src:     "pwa-512x512.png",
            sizes:   "512x512",
            type:    "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler:    "CacheFirst",
            options: {
              cacheName:        "google-fonts-cache",
              expiration: {
                maxEntries:    10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler:    "CacheFirst",
            options: {
              cacheName:        "gstatic-fonts-cache",
              expiration: {
                maxEntries:    10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler:    "NetworkFirst",
            options: {
              cacheName:        "firestore-cache",
              expiration: {
                maxEntries:    200,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});