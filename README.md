# tsconf-utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Find, parse, and resolve `tsconfig.json` files with the same rules as TypeScript.

- Resolves `extends`: relative paths, arrays, and packages (with `exports` and the `tsconfig` field).
- Merges configs in TypeScript's order. Later `extends` entries win, and `references` are not inherited.
- Makes all paths absolute, including `paths` targets and `${configDir}`.
- Reads JSONC: comments, trailing commas, and a byte order mark.
- Typed errors for broken configs, missing `extends`, and circular `extends`.
- Every function has a sync, a Promise, and an [Effect](https://effect.website) version.

## Install

Requires Node.js 22.12 or later. The package is ESM only. On Node.js 22.12 and later, `require()` also works.

```bash
npm install tsconf-utils
```

## Usage

```ts
import { loadTSConfig } from "tsconf-utils";

// Finds the closest tsconfig.json, starting in process.cwd(), and parses it.
const result = await loadTSConfig();

if (result) {
  result.path; // "/repo/tsconfig.json"
  result.config; // the merged config, with absolute paths
  result.configFiles; // every tsconfig file that was read, starting with result.path
}
```

### Functions

| Sync                      | Promise               | Effect                      | Does                                                        |
| ------------------------- | --------------------- | --------------------------- | ----------------------------------------------------------- |
| `findTSConfigSync(opts?)` | `findTSConfig(opts?)` | `findTSConfigEffect(opts?)` | Returns the path of the closest tsconfig, or `undefined`.   |
| `parseTSConfigSync(path)` | `parseTSConfig(path)` | `parseTSConfigEffect(path)` | Reads one tsconfig file and resolves all `extends` entries. |
| `loadTSConfigSync(opts?)` | `loadTSConfig(opts?)` | `loadTSConfigEffect(opts?)` | `find` and then `parse`. Returns `undefined` if none found. |

`opts` is `{ cwd?: string; name?: string }`. The defaults are `process.cwd()` and `"tsconfig.json"`.
The search goes from `cwd` up to the file system root.

### Errors

"No tsconfig found" is not an error. `findTSConfig` and `loadTSConfig` return `undefined`.
A broken config throws (sync), rejects (Promise), or fails (Effect) with one of these errors:

| Error                          | When                                                      | Fields                       |
| ------------------------------ | --------------------------------------------------------- | ---------------------------- |
| `TSConfigReadError`            | A file cannot be read.                                    | `path`, `cause`              |
| `TSConfigParseError`           | A file is not valid JSONC, or has the wrong shape.        | `path`, `reason`, `cause`    |
| `TSConfigExtendsNotFoundError` | An `extends` entry does not point to a file or a package. | `specifier`, `from`, `chain` |
| `TSConfigExtendsCycleError`    | `extends` entries form a loop.                            | `chain`                      |

Every error has a `_tag` with its class name.

```ts
import { parseTSConfigSync, TSConfigExtendsNotFoundError } from "tsconf-utils";

try {
  parseTSConfigSync("./tsconfig.json");
} catch (error) {
  if (error instanceof TSConfigExtendsNotFoundError) {
    console.error(`${error.from} extends "${error.specifier}", which does not exist`);
  }
}
```

### Effect

```ts
import { Effect } from "effect";
import { loadTSConfigEffect } from "tsconf-utils";

const program = loadTSConfigEffect({ cwd: "./packages/app" }).pipe(
  Effect.catchTag("TSConfigExtendsNotFoundError", (error) =>
    Effect.die(`Install the package for "${error.specifier}"`),
  ),
);
```

## Migrating from v2

- `resolveTSConfig(cwd, name)` is now `loadTSConfig({ cwd, name })`. The same change applies to the sync version.
- `findTSConfig(dir, name)` is now `findTSConfig({ cwd, name })`. Both arguments are optional.
- The result fields are now `path`, `config`, and `configFiles` (before: `path`, `tsconfig`, and `files`).
- Functions return `undefined` and not `null`.
- Broken configs throw a typed error. Before, `resolveTSConfig` returned `null` and sometimes wrote to the console.
- All path options, `include`, `exclude`, `files`, and `paths` targets are absolute paths. Before, only `baseUrl` was changed.
- The package is ESM only and requires Node.js 22.12 or later.

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/tsconf-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/tsconf-utils
[npm-downloads-src]: https://img.shields.io/npm/dm/tsconf-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/tsconf-utils
