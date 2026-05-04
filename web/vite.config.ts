/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.spec.ts"],
  },
});
