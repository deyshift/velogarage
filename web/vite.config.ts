/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app is served from GitHub Pages under /velogarage/app/, and built into
// docs/app/ so Pages (which serves /docs on main) picks it up with no extra config.
export default defineConfig({
  plugins: [react()],
  base: "/velogarage/app/",
  build: {
    outDir: "../docs/app",
    emptyOutDir: true,
  },
  // Unit tests cover pure logic (wear thresholds, unit conversions), so the
  // lightweight node environment is enough — no jsdom needed.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
