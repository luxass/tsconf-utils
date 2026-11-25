/**
 * Fixtures with a hand-written expected result.
 *
 * Two checks use every case:
 * - `ours.test.ts` checks that `parseTSConfigSync` returns exactly `expected`.
 * - `typescript.test.ts`, `typescript-next.test.ts`, and `ports.test.ts` check that each compiler
 *   agrees with `expected`, through `--showConfig`, its JavaScript API, or `--noEmit`.
 * If both pass, we and the compiler agree, and the agreed result is written here for review.
 * See README.md in this folder.
 *
 * How `expected` is written:
 * - Every path is relative to the fixture root, uses `/`, and has no leading `./`.
 *   For example `"base/dist"`, not `"/tmp/x/base/dist"` or `"../base/dist"`.
 * - It lists every key we return, nothing more.
 *   `tsc --showConfig` prints extra keys that it computes (like `module`), and those are ignored.
 * - `compilerOptions.paths` is checked against us and the API checks only.
 *   `tsc --showConfig` prints `paths` unresolved.
 *
 * Rules for writing fixtures:
 * - Every fixture needs at least one `.ts` file that the config includes.
 *   TypeScript 5 and 6 fail with TS18003 when there are no input files.
 * - Use booleans and paths as option values. `tsc` rewrites some enum values
 *   (for example `es2015` becomes `es6`), which makes comparisons noisy.
 */
export interface ExpectedConfig {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  files?: string[];
}

interface BaseCase {
  name: string;
  files: Record<string, string | object>;
  /** The config to parse, relative to the fixture root. Default: `"tsconfig.json"`. */
  entry?: string;
}

export interface SuccessCase extends BaseCase {
  expected: ExpectedConfig;
}

export interface ErrorCase extends BaseCase {
  /**
   * Both the compiler and we must fail, and we must fail with this error `_tag`.
   * The compiler's error code is not compared, because it differs between versions
   * (for example TS5083 in 5.9 and TS6053 in 7.0 for a missing file).
   */
  expectedError: "TSConfigExtendsNotFoundError" | "TSConfigExtendsCycleError";
}

export type ConformanceCase = SuccessCase | ErrorCase;

export function isErrorCase(testCase: ConformanceCase): testCase is ErrorCase {
  return "expectedError" in testCase;
}

// A package with an `exports` map. Each target sets a different `outDir`,
// so a wrong match shows up as a wrong `outDir`.
const exportsPackageFiles = {
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
    ["root", "import", "require", "types", "default", "wild"].map((target) => [
      `node_modules/pkg/c/${target}.json`,
      { compilerOptions: { outDir: `./out-${target}` } },
    ]),
  ),
};

const exportsCases: SuccessCase[] = [
  // [extends specifier, the exports target TypeScript picks, why]
  ["pkg", "root", "the `.` entry"],
  ["pkg/imp", "default", "`import` is not a condition for extends"],
  ["pkg/req", "require", "`require` comes first and matches"],
  ["pkg/types", "types", "`types` comes first and matches"],
  ["pkg/w/wild", "wild", "a `*` pattern"],
].map(([specifier, target, reason]) => ({
  name: `package exports: ${specifier} uses ${target} (${reason})`,
  files: {
    "tsconfig.json": { extends: specifier },
    ...exportsPackageFiles,
    "index.ts": "",
  },
  expected: { compilerOptions: { outDir: `node_modules/pkg/c/out-${target}` } },
}));

export const conformanceCases: ConformanceCase[] = [
  {
    name: "relative extends without .json",
    files: {
      "tsconfig.json": { extends: "./configs/base", compilerOptions: { strict: true } },
      "configs/base.json": { compilerOptions: { strict: false, declaration: true } },
      "index.ts": "",
    },
    expected: { compilerOptions: { strict: true, declaration: true } },
  },
  {
    name: "later extends array entries win",
    files: {
      "tsconfig.json": { extends: ["./one.json", "./two.json"] },
      "one.json": { compilerOptions: { strict: true, declaration: true } },
      "two.json": { compilerOptions: { strict: false } },
      "index.ts": "",
    },
    expected: { compilerOptions: { strict: false, declaration: true } },
  },
  {
    name: "nested extends chain",
    files: {
      "tsconfig.json": { extends: "./a.json", compilerOptions: { noEmit: true } },
      "a.json": { extends: "./b.json", compilerOptions: { declaration: true } },
      "b.json": { compilerOptions: { declaration: false, strict: true } },
      "index.ts": "",
    },
    expected: { compilerOptions: { noEmit: true, declaration: true, strict: true } },
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
    expected: {
      compilerOptions: {
        baseUrl: "base/src",
        outDir: "base/dist",
        rootDir: "base/src",
        declarationDir: "base/types",
        tsBuildInfoFile: "base/build/info.tsbuildinfo",
        typeRoots: ["base/typings"],
        rootDirs: ["base/src", "base/generated"],
        composite: true,
      },
      include: ["base/src/**/*"],
      exclude: ["base/src/**/*.test.ts"],
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
    expected: {
      compilerOptions: { outDir: "app/dist", declarationDir: "app/types" },
      include: ["app/src"],
    },
  },
  {
    name: "paths without baseUrl resolve from the config that sets them",
    entry: "app/tsconfig.json",
    files: {
      "app/tsconfig.json": { extends: "../base.json" },
      "base.json": { compilerOptions: { paths: { "@/*": ["./lib/*"] } } },
      "app/index.ts": "",
    },
    expected: { compilerOptions: { paths: { "@/*": ["lib/*"] } } },
  },
  {
    name: "paths resolve from baseUrl, even when baseUrl is set in another config",
    entry: "app/tsconfig.json",
    files: {
      "app/tsconfig.json": { extends: "../base.json", compilerOptions: { baseUrl: "./src" } },
      "base.json": { compilerOptions: { paths: { "@/*": ["lib/*"] } } },
      "app/index.ts": "",
    },
    expected: {
      compilerOptions: { baseUrl: "app/src", paths: { "@/*": ["app/src/lib/*"] } },
    },
  },
  {
    name: "${configDir} in paths means the first config's folder",
    entry: "app/tsconfig.json",
    files: {
      "app/tsconfig.json": { extends: "../base.json" },
      "base.json": { compilerOptions: { paths: { "@/*": ["${configDir}/src/*"] } } },
      "app/index.ts": "",
    },
    expected: { compilerOptions: { paths: { "@/*": ["app/src/*"] } } },
  },
  {
    name: "include from the child replaces include from the parent",
    files: {
      "tsconfig.json": { extends: "./base.json", include: ["src"] },
      "base.json": { include: ["lib"] },
      "src/index.ts": "",
    },
    expected: { include: ["src"] },
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
    expected: { files: ["lib/extra.ts"] },
  },
  {
    name: "package root with tsconfig.json",
    files: {
      "tsconfig.json": { extends: "pkg" },
      "node_modules/pkg/package.json": { name: "pkg" },
      "node_modules/pkg/tsconfig.json": { compilerOptions: { strict: true } },
      "index.ts": "",
    },
    expected: { compilerOptions: { strict: true } },
  },
  {
    name: "package tsconfig field",
    files: {
      "tsconfig.json": { extends: "pkg" },
      "node_modules/pkg/package.json": { name: "pkg", tsconfig: "./custom.json" },
      "node_modules/pkg/custom.json": { compilerOptions: { declaration: true } },
      "index.ts": "",
    },
    expected: { compilerOptions: { declaration: true } },
  },
  {
    name: "scoped package subpath without .json",
    files: {
      "tsconfig.json": { extends: "@scope/cfg/node" },
      "node_modules/@scope/cfg/package.json": { name: "@scope/cfg" },
      "node_modules/@scope/cfg/node.json": { compilerOptions: { strict: true } },
      "index.ts": "",
    },
    expected: { compilerOptions: { strict: true } },
  },
  {
    name: "package subpath folder with tsconfig.json",
    files: {
      "tsconfig.json": { extends: "pkg/sub" },
      "node_modules/pkg/package.json": { name: "pkg" },
      "node_modules/pkg/sub/tsconfig.json": { compilerOptions: { declaration: true } },
      "index.ts": "",
    },
    expected: { compilerOptions: { declaration: true } },
  },
  ...exportsCases,
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
