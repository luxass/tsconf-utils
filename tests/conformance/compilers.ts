import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import process from "node:process";

import type { CompilerId } from "./compiler-ids";

const require = createRequire(import.meta.url);

export interface Compiler {
  label: string;
  /** The executable and its leading arguments, for example `["node", "/path/to/bin/tsc"]`. */
  command: readonly [string, ...string[]];
  /** Whether the compiler supports `--showConfig`. tsrs does not. */
  supportsShowConfig: boolean;
  /**
   * Absolute path of the compiler's sync JavaScript API module (the TypeScript 7 style `API` class).
   * When set, every case also runs through `parseConfigFile`, which also checks `paths`.
   */
  syncApiModule?: string;
}

interface PackageCompilerOptions {
  label: string;
  /** The package folder. */
  packageDir: string;
  /** The `bin` entry to run, for example `"tsc"`. */
  bin: string;
  /** The `exports` key of the sync API, for example `"./unstable/sync"`. */
  syncApiExport?: string;
  supportsShowConfig?: boolean;
}

/** The folder of an installed package, for example `packageDirOf("typescript-5")`. */
function packageDirOf(packageName: string): string {
  return dirname(require.resolve(`${packageName}/package.json`));
}

/** Builds a `Compiler` from an npm package folder. */
function packageCompiler(options: PackageCompilerOptions): Compiler {
  const packageJson = JSON.parse(
    readFileSync(join(options.packageDir, "package.json"), "utf8"),
  ) as {
    bin: Record<string, string>;
    exports?: Record<string, string | { default: string }>;
  };

  const binPath = packageJson.bin[options.bin];
  if (binPath === undefined) {
    throw new Error(`${options.packageDir} has no bin entry "${options.bin}"`);
  }

  let syncApiModule: string | undefined;
  if (options.syncApiExport !== undefined) {
    const target = packageJson.exports?.[options.syncApiExport];
    if (target === undefined) {
      throw new Error(`${options.packageDir} has no export "${options.syncApiExport}"`);
    }
    syncApiModule = join(options.packageDir, typeof target === "string" ? target : target.default);
  }

  return {
    label: options.label,
    command: [process.execPath, join(options.packageDir, binPath)],
    supportsShowConfig: options.supportsShowConfig ?? true,
    syncApiModule,
  };
}

// How to run each compiler in compiler-ids.ts. Each entry is a function,
// so a run only resolves the package of the compiler it tests.
const compilerFactories: Record<CompilerId, () => Compiler> = {
  "typescript-5.9": () =>
    packageCompiler({
      label: "TypeScript 5.9",
      packageDir: packageDirOf("typescript-5"),
      bin: "tsc",
    }),
  "typescript-6.0": () =>
    packageCompiler({
      label: "TypeScript 6.0",
      packageDir: packageDirOf("typescript-6"),
      bin: "tsc",
    }),
  // No API check: the 7.0 API returns only `options` and `fileNames`, without errors or `raw`.
  "typescript-7.0": () =>
    packageCompiler({
      label: "TypeScript 7.0",
      packageDir: packageDirOf("typescript"),
      bin: "tsc",
    }),
  "typescript-7.1": () =>
    packageCompiler({
      label: "TypeScript 7.1 beta",
      packageDir: packageDirOf("typescript-7.1"),
      bin: "tsc",
      syncApiExport: "./sync",
    }),
  "tsc-ts": () =>
    packageCompiler({
      label: "tsc-ts (vercel-labs)",
      packageDir: packageDirOf("tsc-ts"),
      bin: "tsc-ts",
    }),
  "tsc-rs": () =>
    packageCompiler({
      label: "tsc-rs (pingdotgg)",
      packageDir: packageDirOf("tsc-rs"),
      bin: "tsc-rs",
      syncApiExport: "./unstable/sync",
    }),
  // Allowed through trustPolicyExclude in pnpm-workspace.yaml. See the comment there.
  tsrs: () =>
    packageCompiler({
      label: "tsrs (oxc-project)",
      packageDir: packageDirOf("tsrs"),
      bin: "tsrs",
      syncApiExport: "./sync",
      // tsrs has no `--showConfig`, so it only runs through its API.
      supportsShowConfig: false,
    }),
};

/** Builds the compiler with this id. */
export function getCompiler(id: CompilerId): Compiler {
  return compilerFactories[id]();
}
