import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const root = path.resolve(import.meta.dirname, "client");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root,
  publicDir: path.join(root, "public"),
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  envDir: import.meta.dirname,
  envPrefix: "VITE_",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});
