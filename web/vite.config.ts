import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // xrpl-connect imports "xrpl" but declares no dependency on it, and the
      // only copy lives here (not in the hoisted xrpl-connect's resolution
      // chain). Pin both to this single copy so Rollup resolves + dedupes it.
      xrpl: path.resolve(__dirname, "./node_modules/xrpl"),
      // xrpl-connect's bundle has a dead Node-only `require("ws")` branch;
      // browsers use native WebSocket. Stub `ws` so bundlers can resolve it.
      ws: path.resolve(__dirname, "./src/lib/ws-browser-stub.ts"),
    },
    dedupe: ["xrpl"],
  },
  preview: {
    port: 8080,
  },
  build: {
    outDir: "dist",
  },
}));
