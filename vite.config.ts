import { defineConfig } from "vite";

export default defineConfig({
  root: ".",                 // Project root (where index.html lives)
  publicDir: "public",       // Static files
  build: {
    outDir: "dist",          // Final output folder
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "/client": "/client"
    }
  }
});
