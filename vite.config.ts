// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  publicDir: "public",        // <-- correct because public is now inside client/
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "client/index.html",
        board: "client/board.html"
      }
    }
  }  
});

