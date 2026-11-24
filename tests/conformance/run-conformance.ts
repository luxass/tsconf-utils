import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { parseTSConfigSync, type TSConfigResult } from "../../src";
import { createFixture } from "../utils";
import { conformanceCases } from "./cases";

const require = createRequire(import.meta.url);

export interface TypeScriptVersion {
  label: string;
  /** The package name in devDependencies, for example `"typescript-5"`. */
  packageName: string;
}

// Compiler options with a path value, plus top-level path lists.
const PATH_KEYS = new Set([
  "baseUrl",
  "rootDir",
  "outDir",
  "outFile",
  "declarationDir",
  "tsBuildInfoFile",
  "generateCpuProfile",
  "typeRoots",
  "rootDirs",
  "include",
  "exclude",
  "files",
]);

const toPosix = (path: string) => path.replaceAll("\\", "/");

function runTsc(version: TypeScriptVersion, root: string, args: string[]) {
  const tscPath = join(dirname(require.resolve(`${version.packageName}/package.json`)), "bin/tsc");
  const result = spawnSync(process.execPath, [tscPath, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  return { exitCode: result.status, output: `${result.stdout}${result.stderr}` };
}

/** `tsc` prints paths relative to the entry config's folder. Make them absolute, like ours. */
function normalizeValue(key: string, value: unknown, entryDir: string): unknown {
  if (!PATH_KEYS.has(key)) return value;
  const normalizePath = (path: string) =>
    toPosix(isAbsolute(path) ? path : resolve(entryDir, path));
  if (typeof value === "string") return normalizePath(value);
  if (Array.isArray(value)) return value.map((item) => normalizePath(String(item)));
  return value;
}

/**
 * Builds the comparable view of a config.
 *
 * Only keys that we return are compared. `tsc --showConfig` adds options that it computes
 * (like `module`), and adds `files` or `exclude` defaults, so its extra keys are ignored.
 */
function comparable(
  source: Record<string, unknown>,
  ours: TSConfigResult["config"],
  entryDir: string,
) {
  const sourceOptions = (source.compilerOptions ?? {}) as Record<string, unknown>;
  const compilerOptions: Record<string, unknown> = {};
  for (const key of Object.keys(ours.compilerOptions ?? {})) {
    if (key === "paths") continue;
    compilerOptions[key] = normalizeValue(key, sourceOptions[key], entryDir);
  }

  const topLevel: Record<string, unknown> = {};
  for (const key of ["include", "exclude", "files"] as const) {
    if (ours[key] !== undefined) topLevel[key] = normalizeValue(key, source[key], entryDir);
  }

  return { compilerOptions, ...topLevel };
}

export function describeConformance(version: TypeScriptVersion): void {
  describe(`TypeScript ${version.label}`, () => {
    it.each(conformanceCases)("$name", (testCase) => {
      const root = createFixture(testCase.files);
      const entry = join(root, testCase.entry ?? "tsconfig.json");
      const entryDir = dirname(entry);

      if (testCase.expectedError !== undefined) {
        // `--showConfig` in TypeScript 7 does not report extends errors, so run a real check.
        const tsc = runTsc(version, root, ["--noEmit", "-p", entry]);
        expect(tsc.exitCode, tsc.output).not.toBe(0);
        expect(tsc.output).toMatch(/error TS\d+/u);
        expect(() => parseTSConfigSync(entry)).toThrow(
          expect.objectContaining({ _tag: testCase.expectedError }),
        );
        return;
      }

      const tsc = runTsc(version, root, ["--showConfig", "-p", entry]);
      expect(tsc.exitCode, tsc.output).toBe(0);
      const tscConfig = JSON.parse(tsc.output) as Record<string, unknown>;
      const ours = parseTSConfigSync(entry).config;

      // Both sides go through `comparable`, so path separators and the compared keys match.
      expect(comparable(tscConfig, ours, entryDir)).toEqual(comparable(ours, ours, entryDir));
    });
  });
}
