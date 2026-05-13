import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactClickToComponent } from "vite-plugin-react-click-to-component";
import path from "path";

export default defineConfig(({ command }) => ({
  envDir: "..",
  plugins: [react(), command === "serve" && reactClickToComponent()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
