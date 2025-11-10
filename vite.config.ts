import { defineConfig } from "vite";

export default defineConfig({
  root: ".", // project root
  resolve: {
    alias: {
      "@": "/client"
    }
  }
});
