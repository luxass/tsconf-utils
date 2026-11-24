import { dirname, resolve } from "node:path";

import { Effect } from "effect";

import { TSConfigExtendsCycleError, type TSConfigError, TSConfigParseError } from "./errors";
import { findTSConfigEffect } from "./find";
import { readJsonObject } from "./fs";
import { isRecord, normalizeOwnPaths, resolvePathsTargets } from "./normalize";
import { resolveExtends } from "./resolve-extends";
import type { FindTSConfigOptions, TSConfigJSON, TSConfigResult } from "./types";

// These objects merge key by key. Every other top-level key is replaced as a whole.
const MERGED_OBJECT_KEYS = ["compilerOptions", "watchOptions", "typeAcquisition"] as const;

interface ParsedFile {
  config: TSConfigJSON;
  configFiles: string[];
  /** The folder of the config that set the `paths` value that won the merge. */
  pathsBaseDir: string | undefined;
}

/**
 * Merges `own` on top of `base`, using the same rules as TypeScript.
 */
function mergeConfigs(base: TSConfigJSON, own: TSConfigJSON): TSConfigJSON {
  const result: TSConfigJSON = { ...base, ...own };
  for (const key of MERGED_OBJECT_KEYS) {
    if (isRecord(base[key]) || isRecord(own[key])) {
      result[key] = { ...base[key], ...own[key] };
    }
  }
  return result;
}

function readExtends(raw: Record<string, unknown>, path: string) {
  const value = raw.extends;
  if (value === undefined) return Effect.succeed([]);
  if (typeof value === "string") return Effect.succeed([value]);
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return Effect.succeed(value as string[]);
  }
  return Effect.fail(
    new TSConfigParseError({ path, reason: '"extends" must be a string or an array of strings' }),
  );
}

function parseFile(
  path: string,
  rootConfigDir: string,
  chain: readonly string[],
): Effect.Effect<ParsedFile, TSConfigError> {
  return Effect.gen(function* () {
    if (chain.includes(path)) {
      return yield* new TSConfigExtendsCycleError({ chain: [...chain, path] });
    }

    const raw = yield* readJsonObject(path);
    const extendsSpecifiers = yield* readExtends(raw, path);
    if (raw.compilerOptions !== undefined && !isRecord(raw.compilerOptions)) {
      return yield* new TSConfigParseError({ path, reason: '"compilerOptions" must be an object' });
    }

    const ownDir = dirname(path);
    const nextChain = [...chain, path];
    const configFiles = [path];
    let inherited: TSConfigJSON = {};
    let pathsBaseDir: string | undefined;

    // Later `extends` entries win over earlier ones.
    for (const specifier of extendsSpecifiers) {
      const parentPath = yield* resolveExtends(specifier, path, nextChain);
      const parent = yield* parseFile(parentPath, rootConfigDir, nextChain);

      // TypeScript never inherits `references`.
      const { references: _references, ...parentConfig } = parent.config;
      inherited = mergeConfigs(inherited, parentConfig);
      if (parentConfig.compilerOptions?.paths !== undefined) pathsBaseDir = parent.pathsBaseDir;
      configFiles.push(...parent.configFiles);
    }

    const own = normalizeOwnPaths(raw as TSConfigJSON, ownDir, rootConfigDir);
    if (own.compilerOptions?.paths !== undefined) pathsBaseDir = ownDir;

    const { extends: _extends, ...config } = mergeConfigs(inherited, own);
    return { config, configFiles, pathsBaseDir };
  });
}

/**
 * Reads a tsconfig file, merges every `extends` entry into it, and makes all paths absolute.
 *
 * Fails with a `TSConfigError` if a file cannot be read or parsed,
 * an `extends` entry cannot be resolved, or `extends` entries form a loop.
 */
export const parseTSConfigEffect = Effect.fn("parseTSConfig")(function* (
  path: string,
): Effect.fn.Return<TSConfigResult, TSConfigError> {
  const absolutePath = resolve(path);
  const rootConfigDir = dirname(absolutePath);
  const parsed = yield* parseFile(absolutePath, rootConfigDir, []);

  const options = parsed.config.compilerOptions;
  if (options !== undefined && isRecord(options.paths)) {
    const baseDir = options.baseUrl ?? parsed.pathsBaseDir ?? rootConfigDir;
    parsed.config.compilerOptions = {
      ...options,
      paths: resolvePathsTargets(options.paths, baseDir, rootConfigDir),
    };
  }

  return { path: absolutePath, config: parsed.config, configFiles: parsed.configFiles };
});

/**
 * Finds the closest tsconfig file and parses it.
 *
 * Succeeds with `undefined` if no tsconfig file is found.
 */
export const loadTSConfigEffect = Effect.fn("loadTSConfig")(function* (
  options: FindTSConfigOptions = {},
): Effect.fn.Return<TSConfigResult | undefined, TSConfigError> {
  const path = yield* findTSConfigEffect(options);
  if (path === undefined) return undefined;
  return yield* parseTSConfigEffect(path);
});
