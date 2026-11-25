import { Effect } from "effect";

import { findTSConfigEffect } from "./find";
import { loadTSConfigEffect, parseTSConfigEffect } from "./parse";
import type {
  FindTSConfigOptions,
  LoadTSConfigOptions,
  ParseTSConfigOptions,
  TSConfigResult,
} from "./types";

export {
  TSConfigExtendsCycleError,
  TSConfigExtendsNotFoundError,
  TSConfigParseError,
  TSConfigReadError,
  type TSConfigError,
} from "./errors";
export { findTSConfigEffect } from "./find";
export { loadTSConfigEffect, parseTSConfigEffect } from "./parse";
export type {
  FindTSConfigOptions,
  LoadTSConfigOptions,
  ParseTSConfigOptions,
  ResolvedTSConfig,
  TSConfigCompilerOptions,
  TSConfigJSON,
  TSConfigResult,
} from "./types";

// Each function exists in three forms. They all run the same Effect.
// `Effect.runSync` and `Effect.runPromise` throw the original tagged error, so callers can use `instanceof`.

/**
 * Finds the closest tsconfig file, starting in `cwd` and going up to the file system root.
 * Returns `undefined` if no file is found.
 *
 * @throws {TSConfigReadError} if a file exists but cannot be checked.
 */
export function findTSConfigSync(options?: FindTSConfigOptions): string | undefined {
  return Effect.runSync(findTSConfigEffect(options));
}

/** Promise version of {@link findTSConfigSync}. */
export function findTSConfig(options?: FindTSConfigOptions): Promise<string | undefined> {
  return Effect.runPromise(findTSConfigEffect(options));
}

/**
 * Reads a tsconfig file, merges every `extends` entry into it, and makes all paths absolute.
 *
 * @throws {TSConfigError} if a file cannot be read or parsed,
 *   an `extends` entry cannot be resolved, or `extends` entries form a loop.
 */
export function parseTSConfigSync(path: string, options?: ParseTSConfigOptions): TSConfigResult {
  return Effect.runSync(parseTSConfigEffect(path, options));
}

/** Promise version of {@link parseTSConfigSync}. */
export function parseTSConfig(
  path: string,
  options?: ParseTSConfigOptions,
): Promise<TSConfigResult> {
  return Effect.runPromise(parseTSConfigEffect(path, options));
}

/**
 * Finds the closest tsconfig file and parses it.
 * Returns `undefined` if no tsconfig file is found.
 *
 * @throws {TSConfigError} if the tsconfig file that was found is broken.
 */
export function loadTSConfigSync(options?: LoadTSConfigOptions): TSConfigResult | undefined {
  return Effect.runSync(loadTSConfigEffect(options));
}

/** Promise version of {@link loadTSConfigSync}. */
export function loadTSConfig(options?: LoadTSConfigOptions): Promise<TSConfigResult | undefined> {
  return Effect.runPromise(loadTSConfigEffect(options));
}
