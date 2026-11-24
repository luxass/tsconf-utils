import { dirname, join, resolve } from "node:path";
import process from "node:process";

import { Effect } from "effect";

import type { TSConfigReadError } from "./errors";
import { isFile } from "./fs";
import type { FindTSConfigOptions } from "./types";

/**
 * Searches `cwd` and every parent folder, up to and including the file system root,
 * for a file called `name`.
 *
 * Succeeds with the absolute path of the first match, or `undefined` if there is no match.
 */
export const findTSConfigEffect = Effect.fn("tsconf-utils/findTSConfig")(function* (
  options: FindTSConfigOptions = {},
): Effect.fn.Return<string | undefined, TSConfigReadError> {
  const name = options.name ?? "tsconfig.json";
  let dir = resolve(options.cwd ?? process.cwd());
  yield* Effect.annotateCurrentSpan({ cwd: dir, name });

  while (true) {
    const candidate = join(dir, name);
    if (yield* isFile(candidate)) return candidate;

    const parent = dirname(dir);
    // `dirname` of the root returns the root itself.
    if (parent === dir) return undefined;
    dir = parent;
  }
});
