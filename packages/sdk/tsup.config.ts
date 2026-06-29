import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    minify: true,
    clean: true,
    outDir: "dist",
    outExtension({ format }) {
      return { js: format === "esm" ? ".esm.js" : ".cjs.js" };
    }
  },
  {
    entry: { monitor: "src/index.ts" },
    format: ["iife"],
    globalName: "CodexMonitor",
    sourcemap: true,
    minify: true,
    clean: false,
    outDir: "dist",
    outExtension() {
      return { js: ".iife.min.js" };
    }
  }
]);
