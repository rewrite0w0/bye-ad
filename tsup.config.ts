import { defineConfig } from "tsup";

export default defineConfig([
  // ---------------------------------------------------------------------------
  // ESM / CJS
  // ---------------------------------------------------------------------------
  {
    entry: {
      index: "src/index.ts",
    },

    format: ["esm", "cjs"],

    dts: true,

    sourcemap: true,

    clean: true,

    target: "es2018",

    platform: "browser",

    outDir: "dist",
    esbuildOptions(options) {
      options.drop = ["console"];
    },
  },

  // ---------------------------------------------------------------------------
  // Global / IIFE
  // ---------------------------------------------------------------------------
  {
    entry: {
      index: "src/index.ts",
    },

    format: ["iife"],

    globalName: "ByeAd",

    sourcemap: true,

    clean: false,

    target: "es2018",

    platform: "browser",

    outDir: "dist",

    outExtension() {
      return {
        js: ".global.js",
      };
    },
  },

  // ---------------------------------------------------------------------------
  // Network sensor
  // ---------------------------------------------------------------------------
  {
    entry: {
      nativeads: "src/nativeads.ts",
    },

    format: ["iife"],

    sourcemap: true,

    clean: false,

    minify: true,

    target: "es2018",

    platform: "browser",

    outDir: "dist",

    outExtension() {
      return {
        js: ".js",
      };
    },
  },
]);
