import { defineConfig } from "vite";
import { resolve } from "node:path";

const target = (process.env.TARGET ?? "chrome") as "chrome" | "firefox";
const outDir = `dist-${target}`;

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
    minify: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (info) => {
          if (info.name?.endsWith(".html")) return "[name][extname]";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@lib": resolve(__dirname, "src/lib"),
    },
  },
  define: {
    __TARGET__: JSON.stringify(target),
  },
});
