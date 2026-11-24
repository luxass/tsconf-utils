import { readFileSync, statSync } from "node:fs";

import { Effect } from "effect";
import { parse } from "jsonc-parse";

import { TSConfigParseError, TSConfigReadError } from "./errors";

// All file system access is synchronous on purpose.
// This lets the same Effect run with `Effect.runSync` and `Effect.runPromise`.

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return undefined;
}

/**
 * Returns `true` if `path` is a file.
 * A missing path, or a path that goes through a file (ENOTDIR), returns `false`.
 */
export function isFile(path: string): Effect.Effect<boolean, TSConfigReadError> {
  return Effect.try({
    try: () => {
      try {
        return statSync(path).isFile();
      } catch (error) {
        const code = errorCode(error);
        if (code === "ENOENT" || code === "ENOTDIR") return false;
        throw error;
      }
    },
    catch: (cause) => new TSConfigReadError({ path, cause }),
  });
}

/**
 * Reads a JSONC file and returns its content as a plain object.
 */
export function readJsonObject(
  path: string,
): Effect.Effect<Record<string, unknown>, TSConfigReadError | TSConfigParseError> {
  return Effect.gen(function* () {
    const text = yield* Effect.try({
      try: () => readFileSync(path, "utf8"),
      catch: (cause) => new TSConfigReadError({ path, cause }),
    });

    // Strip a UTF-8 byte order mark. Some Windows editors add one, and JSON.parse rejects it.
    const content = text.startsWith("\uFEFF") ? text.slice(1) : text;

    // TypeScript treats an empty tsconfig file as `{}`.
    if (content.trim() === "") return {};

    const value: unknown = yield* Effect.try({
      try: () => parse(content),
      catch: (cause) => new TSConfigParseError({ path, reason: "invalid JSON", cause }),
    });

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return yield* new TSConfigParseError({ path, reason: "the file must contain a JSON object" });
    }

    return value as Record<string, unknown>;
  });
}
