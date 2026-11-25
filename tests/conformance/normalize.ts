import { isAbsolute, relative, resolve } from "node:path";

import type { ExpectedConfig } from "./cases";

// Compiler options with a path value or a list of paths.
const PATH_OPTIONS = new Set([
  "baseUrl",
  "rootDir",
  "outDir",
  "outFile",
  "declarationDir",
  "tsBuildInfoFile",
  "generateCpuProfile",
  "typeRoots",
  "rootDirs",
]);

const TOP_LEVEL_PATH_LISTS = ["include", "exclude", "files"] as const;

/**
 * Turns one path into the format used in `expected`: relative to the fixture root, with `/`.
 * Relative paths resolve from `baseDir` first, because `tsc --showConfig` prints them
 * relative to the entry config's folder.
 */
function toFixturePath(path: string, baseDir: string, root: string): string {
  const absolute = isAbsolute(path) ? path : resolve(baseDir, path);
  return relative(root, absolute).replaceAll("\\", "/") || ".";
}

function toFixturePaths(value: unknown, baseDir: string, root: string): unknown {
  if (typeof value === "string") return toFixturePath(value, baseDir, root);
  if (Array.isArray(value)) return value.map((item) => toFixturePath(String(item), baseDir, root));
  return value;
}

/**
 * Converts a config (ours, `tsc --showConfig` output, or API output) into the `expected` format:
 * `compilerOptions`, `include`, `exclude`, and `files`, with fixture-relative paths.
 * Other top-level keys are dropped.
 */
export function toExpectedFormat(
  config: Record<string, unknown>,
  location: { baseDir: string; root: string },
): ExpectedConfig {
  const { baseDir, root } = location;
  const result: ExpectedConfig = {};

  if (typeof config.compilerOptions === "object" && config.compilerOptions !== null) {
    const compilerOptions: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(config.compilerOptions)) {
      if (name === "paths" && typeof value === "object" && value !== null) {
        compilerOptions.paths = Object.fromEntries(
          Object.entries(value).map(([pattern, targets]) => [
            pattern,
            toFixturePaths(targets, baseDir, root),
          ]),
        );
      } else {
        compilerOptions[name] = PATH_OPTIONS.has(name)
          ? toFixturePaths(value, baseDir, root)
          : value;
      }
    }
    result.compilerOptions = compilerOptions;
  }

  for (const key of TOP_LEVEL_PATH_LISTS) {
    if (config[key] !== undefined)
      result[key] = toFixturePaths(config[key], baseDir, root) as string[];
  }

  return result;
}

/**
 * Keeps only the keys that `expected` has.
 * Compilers print extra keys that they compute (like `module`, or default `exclude` entries),
 * and those are not part of the comparison.
 */
export function pickKeys(actual: ExpectedConfig, expected: ExpectedConfig): ExpectedConfig {
  const result: ExpectedConfig = {};
  if (expected.compilerOptions !== undefined) {
    const actualOptions = actual.compilerOptions ?? {};
    result.compilerOptions = Object.fromEntries(
      Object.keys(expected.compilerOptions).map((name) => [name, actualOptions[name]]),
    );
  }
  for (const key of TOP_LEVEL_PATH_LISTS) {
    if (expected[key] !== undefined) result[key] = actual[key];
  }
  return result;
}

/** `expected` without `compilerOptions.paths`, for comparing with `tsc --showConfig`. */
export function withoutPaths(expected: ExpectedConfig): ExpectedConfig {
  if (expected.compilerOptions?.paths === undefined) return expected;
  const { paths: _paths, ...compilerOptions } = expected.compilerOptions;
  const { compilerOptions: _compilerOptions, ...rest } = expected;
  // Drop `compilerOptions` when `paths` was its only key, so no empty object is expected.
  return Object.keys(compilerOptions).length === 0 ? rest : { ...rest, compilerOptions };
}
