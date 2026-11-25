import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: "esm",
  clean: true,
  dts: true,
  treeshake: true,
  publint: true,
  // Keep the published entry points in package.json unchanged by builds.
  exports: false,
});
