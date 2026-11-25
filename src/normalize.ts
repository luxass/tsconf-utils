import { join, resolve } from "node:path";

import { toPosixPath } from "./path";
import type { TSConfigCompilerOptions, TSConfigJSON } from "./types";

const CONFIG_DIR_TEMPLATE = "${configDir}";

// Compiler options that TypeScript resolves relative to the config file that sets them.
const PATH_OPTIONS = [
  "baseUrl",
  "rootDir",
  "outDir",
  "outFile",
  "declarationDir",
  "tsBuildInfoFile",
  "generateCpuProfile",
] as const;

const PATH_LIST_OPTIONS = ["rootDirs", "typeRoots"] as const;

const WATCH_PATH_LIST_OPTIONS = ["excludeDirectories", "excludeFiles"] as const;

const TOP_LEVEL_PATH_LISTS = ["include", "exclude", "files"] as const;

/**
 * Resolves one path value.
 *
 * `${configDir}` at the start always means the folder of the first config that was loaded,
 * even inside an extended config. Other paths resolve from the folder of the config that sets them.
 */
export function resolvePathValue(value: string, ownDir: string, rootConfigDir: string): string {
  if (value.startsWith(CONFIG_DIR_TEMPLATE)) {
    return toPosixPath(join(rootConfigDir, value.slice(CONFIG_DIR_TEMPLATE.length)));
  }
  return toPosixPath(resolve(ownDir, value));
}

function resolvePathList(value: unknown, ownDir: string, rootConfigDir: string): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) =>
    typeof item === "string" ? resolvePathValue(item, ownDir, rootConfigDir) : item,
  );
}

/**
 * Returns a copy of one config file's own content with every path made absolute.
 *
 * `compilerOptions.paths` is not changed here, because its targets depend on the final `baseUrl`.
 * See `resolvePathsTargets`.
 */
export function normalizeOwnPaths(
  config: TSConfigJSON,
  ownDir: string,
  rootConfigDir: string,
): TSConfigJSON {
  const result: TSConfigJSON = { ...config };

  for (const key of TOP_LEVEL_PATH_LISTS) {
    if (result[key] !== undefined) {
      result[key] = resolvePathList(result[key], ownDir, rootConfigDir) as string[];
    }
  }

  if (isRecord(config.compilerOptions)) {
    const options: TSConfigCompilerOptions = { ...config.compilerOptions };
    for (const key of PATH_OPTIONS) {
      const value = options[key];
      if (typeof value === "string") options[key] = resolvePathValue(value, ownDir, rootConfigDir);
    }
    for (const key of PATH_LIST_OPTIONS) {
      if (options[key] !== undefined) {
        options[key] = resolvePathList(options[key], ownDir, rootConfigDir) as string[];
      }
    }
    result.compilerOptions = options;
  }

  if (isRecord(config.watchOptions)) {
    const watchOptions = { ...config.watchOptions };
    for (const key of WATCH_PATH_LIST_OPTIONS) {
      if (watchOptions[key] !== undefined) {
        watchOptions[key] = resolvePathList(watchOptions[key], ownDir, rootConfigDir);
      }
    }
    result.watchOptions = watchOptions;
  }

  return result;
}

/**
 * Makes every `paths` target absolute.
 *
 * TypeScript resolves `paths` targets from `baseUrl` when it is set.
 * Otherwise it resolves them from the folder of the config that sets `paths`.
 */
export function resolvePathsTargets(
  paths: Record<string, string[]>,
  baseDir: string,
  rootConfigDir: string,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [pattern, targets] of Object.entries(paths)) {
    result[pattern] = Array.isArray(targets)
      ? targets.map((target) =>
          typeof target === "string" ? resolvePathValue(target, baseDir, rootConfigDir) : target,
        )
      : targets;
  }
  return result;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
