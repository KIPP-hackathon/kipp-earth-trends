import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Opt-in local design preview: use the existing public API without local credentials.
const previewOrigin =
  process.env.KIPP_PREVIEW_PRODUCTION_API === "1"
    ? "https://kipp-earth-trends-lab.vercel.app"
    : undefined;

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.KIPP_PREVIEW": JSON.stringify(
      process.env.VERCEL_ENV === "preview",
    ),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/assistant": {
        target: previewOrigin ?? "http://127.0.0.1:8080",
        changeOrigin: Boolean(previewOrigin),
        rewrite: () => (previewOrigin ? "/api/assistant" : "/v1/assistant"),
        headers: previewOrigin
          ? undefined
          : { "x-kipp-agent-client": "0".repeat(64) },
      },
      "/api/earth": {
        target: previewOrigin ?? "http://127.0.0.1:8080",
        changeOrigin: Boolean(previewOrigin),
        rewrite: (path) =>
          previewOrigin ? path : path.replace(/^\/api\/earth/, ""),
      },
    },
  },
  build: { target: "es2022" },
});
