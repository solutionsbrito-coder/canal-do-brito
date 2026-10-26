import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Build-time version stamp — used for cache-busting and "new version available" detection.
const BUILD_VERSION = `${Date.now()}`;

const SITE_URL = "https://canaldobrito.site";

/**
 * Emits /version.json at build time so the running client can poll it
 * and detect when a new deploy is live (cache-busting trigger).
 */
function versionStampPlugin(): Plugin {
  return {
    name: "version-stamp",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: BUILD_VERSION, builtAt: new Date().toISOString() }),
      });
    },
  };
}

/**
 * Generates /sitemap.xml at build time with all public routes.
 * Dynamic content pages (movies, series, news) are listed generically
 * since the SPA handles routing client-side.
 */
function sitemapPlugin(): Plugin {
  return {
    name: "sitemap",
    apply: "build",
    generateBundle() {
      const staticRoutes = [
        { path: "/", priority: "1.0", changefreq: "hourly" },
        { path: "/programacao", priority: "0.9", changefreq: "hourly" },
        { path: "/filmes-e-series", priority: "0.8", changefreq: "daily" },
        { path: "/assinar", priority: "0.6", changefreq: "monthly" },
        { path: "/login", priority: "0.3", changefreq: "monthly" },
      ];

      const urls = staticRoutes
        .map(
          (r) => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
        )
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: xml,
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    versionStampPlugin(),
    sitemapPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "placeholder.svg"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}"],
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "Canal do Brito",
        short_name: "CanalBrito",
        description: "Esportes ao vivo, filmes e séries",
        start_url: "/",
        display: "standalone",
        background_color: "#07080a",
        theme_color: "#00ff87",
        orientation: "portrait",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
