import { defineConfig, type UserConfig } from "tsdown";

const sharedConfig = {
  entry: ["./src/index.ts"],
  clean: true,
  dts: true,
  treeshake: true,
  // Keep the published entry points in package.json unchanged by builds.
  exports: false,
} satisfies UserConfig;

export default defineConfig([
  {
    ...sharedConfig,
    format: "cjs",
    // Keep CommonJS working on Node 22 releases before require(esm) was enabled by default.
    deps: {
      neverBundle: true,
      alwaysBundle: ["jsonc-parse", "@luxass/strip-json-comments"],
    },
  },
  {
    ...sharedConfig,
    format: "esm",
    publint: true,
  },
]);
