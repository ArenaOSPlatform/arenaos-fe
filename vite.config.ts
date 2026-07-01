import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (
            id.includes("@react-three/fiber") ||
            id.includes("three/")
          ) {
            return "three-vendor";
          }

          if (
            id.includes("react/") ||
            id.includes("react-dom/") ||
            id.includes("react-router-dom/")
          ) {
            return "react-vendor";
          }

          if (id.includes("framer-motion")) {
            return "motion-vendor";
          }

          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }

          return "vendor";
        },
      },
    },
  },
});
