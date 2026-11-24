/**
 * Fixtures that we run through both `tsc --showConfig` and `parseTSConfigSync`.
 *
 * Rules for writing cases:
 * - Every case needs at least one `.ts` file that the config includes.
 *   TypeScript 5 and 6 fail with TS18003 when there are no input files.
 * - Use booleans and paths as option values. `tsc` rewrites some enum values
 *   (for example `es2015` becomes `es6`), which makes comparisons noisy.
 * - `paths` targets are not compared. `tsc --showConfig` prints them unresolved.
 *   The unit tests cover them.
 */
export interface ConformanceCase {
  name: string;
  files: Record<string, string | object>;
  /** The config to parse, relative to the fixture root. Default: `"tsconfig.json"`. */
  entry?: string;
  /**
   * If set, both `tsc` and we must fail, and we must fail with this error `_tag`.
   * The `tsc` error code is not compared, because it differs between versions
   * (for example TS5083 in 5.9 and TS6053 in 7.0 for a missing file).
   */
  expectedError?: "TSConfigExtendsNotFoundError" | "TSConfigExtendsCycleError";
}

export const conformanceCases: ConformanceCase[] = [
  {
    name: "relative extends without .json",
    files: {
      "tsconfig.json": { extends: "./configs/base", compilerOptions: { strict: true } },
      "configs/base.json": { compilerOptions: { strict: false, declaration: true } },
      "index.ts": "",
    },
  },
  {
    name: "later extends array entries win",
    files: {
      "tsconfig.json": { extends: ["./one.json", "./two.json"] },
      "one.json": { compilerOptions: { strict: true, declaration: true } },
      "two.json": { compilerOptions: { strict: false } },
      "index.ts": "",
    },
  },
  {
    name: "nested extends chain",
    files: {
      "tsconfig.json": { extends: "./a.json", compilerOptions: { noEmit: true } },
      "a.json": { extends: "./b.json", compilerOptions: { declaration: true } },
      "b.json": { compilerOptions: { declaration: false, strict: true } },
      "index.ts": "",
    },
  },
  {
    name: "path options resolve from the config that sets them",
    entry: "app/tsconfig.json",
    files: {
      "app/tsconfig.json": { extends: "../base/tsconfig.json" },
      "base/tsconfig.json": {
        compilerOptions: {
          baseUrl: "./src",
          outDir: "./dist",
          rootDir: "./src",
          declarationDir: "./types",
          tsBuildInfoFile: "./build/info.tsbuildinfo",
          typeRoots: ["./typings"],
          rootDirs: ["./src", "./generated"],
          composite: true,
        },
        include: ["src/**/*"],
        exclude: ["src/**/*.test.ts"],
      },
      "base/src/index.ts": "",
    },
  },
  {
    name: "${configDir} means the first config's folder",
    entry: "app/tsconfig.json",
    files: {
      "app/tsconfig.json": { extends: "../base.json" },
      "base.json": {
        compilerOptions: { outDir: "${configDir}/dist", declarationDir: "${configDir}/types" },
        include: ["${configDir}/src"],
      },
      "app/src/index.ts": "",
    },
  },
  {
    name: "include from the child replaces include from the parent",
    files: {
      "tsconfig.json": { extends: "./base.json", include: ["src"] },
      "base.json": { include: ["lib"] },
      "src/index.ts": "",
    },
  },
  {
    // No `include` here: with `include`, `tsc --showConfig` prints the expanded file list as `files`.
    name: "files are inherited from the parent",
    entry: "app/tsconfig.json",
    files: {
      "app/tsconfig.json": { extends: "../base.json" },
      "base.json": { files: ["./lib/extra.ts"] },
      "lib/extra.ts": "",
    },
  },
  {
    name: "package root with tsconfig.json",
    files: {
      "tsconfig.json": { extends: "pkg" },
      "node_modules/pkg/package.json": { name: "pkg" },
      "node_modules/pkg/tsconfig.json": { compilerOptions: { strict: true } },
      "index.ts": "",
    },
  },
  {
    name: "package tsconfig field",
    files: {
      "tsconfig.json": { extends: "pkg" },
      "node_modules/pkg/package.json": { name: "pkg", tsconfig: "./custom.json" },
      "node_modules/pkg/custom.json": { compilerOptions: { declaration: true } },
      "index.ts": "",
    },
  },
  {
    name: "scoped package subpath without .json",
    files: {
      "tsconfig.json": { extends: "@scope/cfg/node" },
      "node_modules/@scope/cfg/package.json": { name: "@scope/cfg" },
      "node_modules/@scope/cfg/node.json": { compilerOptions: { strict: true } },
      "index.ts": "",
    },
  },
  {
    name: "package subpath folder with tsconfig.json",
    files: {
      "tsconfig.json": { extends: "pkg/sub" },
      "node_modules/pkg/package.json": { name: "pkg" },
      "node_modules/pkg/sub/tsconfig.json": { compilerOptions: { declaration: true } },
      "index.ts": "",
    },
  },
  // Each exports target sets a different outDir, so a wrong match shows up as a wrong outDir.
  ...["pkg", "pkg/imp", "pkg/req", "pkg/types", "pkg/w/wild"].map((specifier): ConformanceCase => ({
    name: `package exports: ${specifier}`,
    files: {
      "tsconfig.json": { extends: specifier },
      "node_modules/pkg/package.json": {
        name: "pkg",
        exports: {
          ".": "./c/root.json",
          "./imp": { import: "./c/import.json", default: "./c/default.json" },
          "./req": { require: "./c/require.json", import: "./c/import.json" },
          "./types": { types: "./c/types.json", default: "./c/default.json" },
          "./w/*": "./c/*.json",
        },
      },
      ...Object.fromEntries(
        ["root", "import", "require", "types", "default", "wild"].map((name) => [
          `node_modules/pkg/c/${name}.json`,
          { compilerOptions: { outDir: `./out-${name}` } },
        ]),
      ),
      "index.ts": "",
    },
  })),
  {
    name: "package exports do not fall back to other files",
    expectedError: "TSConfigExtendsNotFoundError",
    files: {
      "tsconfig.json": { extends: "pkg/c/root.json" },
      "node_modules/pkg/package.json": { name: "pkg", exports: { ".": "./c/root.json" } },
      "node_modules/pkg/c/root.json": { compilerOptions: { strict: true } },
      "index.ts": "",
    },
  },
  {
    name: "circular extends",
    expectedError: "TSConfigExtendsCycleError",
    files: {
      "tsconfig.json": { extends: "./other.json" },
      "other.json": { extends: "./tsconfig.json" },
      "index.ts": "",
    },
  },
  {
    name: "missing relative extends",
    expectedError: "TSConfigExtendsNotFoundError",
    files: {
      "tsconfig.json": { extends: "./missing.json" },
      "index.ts": "",
    },
  },
  {
    name: "missing package extends",
    expectedError: "TSConfigExtendsNotFoundError",
    files: {
      "tsconfig.json": { extends: "does-not-exist" },
      "index.ts": "",
    },
  },
];
