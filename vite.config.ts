// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  publicDir: "public",        // <-- correct because public is now inside client/
  build: {
    outDir: "../dist",        // output goes to dist at project root
    emptyOutDir: true
  }
});

