import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "path";
import manifest from "./manifest.json";

export default defineConfig(({ command, mode }) => {
  const isDevWatchBuild = command === "build" && mode === "development";

  return {
    envDir: "..",
    plugins: [react(), crx({ manifest })],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: false,
      sourcemap: isDevWatchBuild ? "inline" : false,
      minify: isDevWatchBuild ? false : "esbuild",
      rollupOptions: isDevWatchBuild
        ? {
            output: {
              entryFileNames: "assets/[name].js",
              chunkFileNames: "assets/[name].js",
              assetFileNames: "assets/[name].[ext]",
            },
          }
        : undefined,
    },
  };
});
