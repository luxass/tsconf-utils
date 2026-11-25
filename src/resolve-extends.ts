import { dirname, isAbsolute, join, resolve } from "node:path";

import { Effect } from "effect";

import {
  TSConfigExtendsNotFoundError,
  type TSConfigParseError,
  type TSConfigReadError,
} from "./errors";
import { isFile, readJsonObject } from "./fs";
import { toPosixPath } from "./path";

// TypeScript resolves package `exports` for `extends` with these conditions. `import` does not match.
const EXPORTS_CONDITIONS = new Set(["node", "require", "types", "default"]);

type ResolveError = TSConfigExtendsNotFoundError | TSConfigReadError | TSConfigParseError;

/**
 * Resolves one `extends` entry to an absolute file path, the same way TypeScript does.
 *
 * - Relative and absolute paths resolve from the folder of the config that contains them.
 *   If the file does not exist and the path does not end in `.json`, `.json` is added.
 * - Anything else is a package, found in `node_modules` folders.
 */
export const resolveExtends = Effect.fn("tsconf-utils/resolveExtends")(function* (
  specifier: string,
  fromConfig: string,
  chain: readonly string[],
): Effect.fn.Return<string, ResolveError> {
  yield* Effect.annotateCurrentSpan({ specifier, from: fromConfig });

  const fromDir = dirname(fromConfig);
  const candidates = isPathSpecifier(specifier)
    ? withJsonExtension(resolve(fromDir, specifier))
    : yield* packageCandidates(specifier, fromDir);

  for (const candidate of candidates) {
    if (yield* isFile(candidate)) {
      const resolved = toPosixPath(candidate);
      yield* Effect.annotateCurrentSpan("resolved", resolved);
      return resolved;
    }
  }

  return yield* new TSConfigExtendsNotFoundError({ specifier, from: fromConfig, chain });
});

function isPathSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith(".\\") ||
    specifier.startsWith("..\\") ||
    isAbsolute(specifier)
  );
}

function withJsonExtension(path: string): string[] {
  return path.endsWith(".json") ? [path] : [path, `${path}.json`];
}

/**
 * Splits `"@scope/name/sub/path"` into `"@scope/name"` and `"./sub/path"`.
 */
function splitPackageSpecifier(specifier: string): { name: string; subpath: string } {
  const parts = specifier.split("/");
  const nameLength = specifier.startsWith("@") ? 2 : 1;
  const name = parts.slice(0, nameLength).join("/");
  const rest = parts.slice(nameLength).join("/");
  return { name, subpath: rest === "" ? "." : `./${rest}` };
}

const packageCandidates = Effect.fn("tsconf-utils/packageCandidates")(function* (
  specifier: string,
  fromDir: string,
): Effect.fn.Return<string[], TSConfigReadError | TSConfigParseError> {
  const { name, subpath } = splitPackageSpecifier(specifier);
  const packageDir = yield* findPackageDir(name, fromDir);
  if (packageDir === undefined) return [];
  yield* Effect.annotateCurrentSpan("packageDir", packageDir);

  const packageJson = yield* readJsonObject(join(packageDir, "package.json"));

  // When a package has `exports`, TypeScript only uses `exports`.
  if (packageJson.exports !== undefined) {
    const target = resolveExports(packageJson.exports, subpath);
    return target === undefined ? [] : [join(packageDir, target)];
  }

  if (subpath === ".") {
    const tsconfigField = packageJson.tsconfig;
    return typeof tsconfigField === "string"
      ? [join(packageDir, tsconfigField), join(packageDir, "tsconfig.json")]
      : [join(packageDir, "tsconfig.json")];
  }

  const file = join(packageDir, subpath);
  return [...withJsonExtension(file), join(file, "tsconfig.json")];
});

/**
 * Finds `node_modules/<name>` in `fromDir` or the closest parent folder.
 */
const findPackageDir = Effect.fn("tsconf-utils/findPackageDir")(function* (
  name: string,
  fromDir: string,
): Effect.fn.Return<string | undefined, TSConfigReadError> {
  yield* Effect.annotateCurrentSpan({ name, fromDir });

  let dir = fromDir;
  while (true) {
    const packageDir = join(dir, "node_modules", name);
    if (yield* isFile(join(packageDir, "package.json"))) return packageDir;

    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
});

/**
 * Resolves `subpath` (for example `"."` or `"./strict"`) against a package.json `exports` value.
 * Returns the target path relative to the package folder, or `undefined` if nothing matches.
 */
export function resolveExports(exports: unknown, subpath: string): string | undefined {
  const subpathMap = isSubpathMap(exports) ? exports : { ".": exports };

  const exact = subpathMap[subpath];
  if (exact !== undefined) return resolveExportsTarget(exact);

  // Find the pattern with the longest prefix before `*`, like Node.js does.
  let bestMatch: { prefixLength: number; target: unknown; wildcard: string } | undefined;
  for (const [key, target] of Object.entries(subpathMap)) {
    const starIndex = key.indexOf("*");
    if (starIndex === -1) continue;

    const prefix = key.slice(0, starIndex);
    const suffix = key.slice(starIndex + 1);
    const matches =
      subpath.startsWith(prefix) &&
      subpath.endsWith(suffix) &&
      subpath.length >= prefix.length + suffix.length;

    if (matches && (bestMatch === undefined || prefix.length > bestMatch.prefixLength)) {
      bestMatch = {
        prefixLength: prefix.length,
        target,
        wildcard: subpath.slice(prefix.length, subpath.length - suffix.length),
      };
    }
  }

  return bestMatch === undefined
    ? undefined
    : resolveExportsTarget(bestMatch.target, bestMatch.wildcard);
}

function isSubpathMap(exports: unknown): exports is Record<string, unknown> {
  if (typeof exports !== "object" || exports === null || Array.isArray(exports)) return false;
  return Object.keys(exports).some((key) => key.startsWith("."));
}

function resolveExportsTarget(target: unknown, wildcard?: string): string | undefined {
  if (typeof target === "string") {
    if (!target.startsWith("./")) return undefined;
    return wildcard === undefined ? target : target.replaceAll("*", wildcard);
  }

  if (Array.isArray(target)) {
    for (const fallback of target) {
      const resolved = resolveExportsTarget(fallback, wildcard);
      if (resolved !== undefined) return resolved;
    }
    return undefined;
  }

  if (typeof target === "object" && target !== null) {
    // Conditions are checked in the order they are written in package.json.
    for (const [condition, value] of Object.entries(target)) {
      if (!EXPORTS_CONDITIONS.has(condition)) continue;
      const resolved = resolveExportsTarget(value, wildcard);
      if (resolved !== undefined) return resolved;
    }
  }

  return undefined;
}
