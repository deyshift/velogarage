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
});
