// Prints the resolved config of a tsconfig file, using a TypeScript 7 style JavaScript API.
// This replaces `--showConfig` for compilers that do not have it (tsrs), and it is the only
// way to check `compilerOptions.paths`, because `--showConfig` prints `paths` unresolved.
//
// Usage: node api-show-config.ts <path to the API module, for example .../dist/api/sync/api.js> <tsconfig path>
//
// It runs in its own process, so a crash in a compiler does not take down the test runner.
// Output: JSON with `compilerOptions`, `include`, `exclude`, and `files`, with absolute paths.

import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

interface ParsedCommandLine {
  options: Record<string, unknown>;
  raw?: Record<string, unknown>;
  // Optional: older APIs (TypeScript 7.0) do not return errors.
  errors?: { code?: number; text?: string }[];
}

interface SyncApi {
  parseConfigFile(file: string): ParsedCommandLine;
  close?(): void;
}

const [apiModulePath, configPath] = process.argv.slice(2);
if (apiModulePath === undefined || configPath === undefined) {
  throw new Error("Usage: node api-show-config.ts <api module> <tsconfig path>");
}

const CONFIG_DIR_TEMPLATE = "${configDir}";
const configDir = dirname(configPath);

// `raw` keeps `${configDir}` and paths relative to the entry config, like `--showConfig`.
function toAbsolute(path: string, baseDir: string): string {
  if (path.startsWith(CONFIG_DIR_TEMPLATE)) {
    return join(configDir, path.slice(CONFIG_DIR_TEMPLATE.length));
  }
  return isAbsolute(path) ? path : resolve(baseDir, path);
}

const apiModule = (await import(pathToFileURL(apiModulePath).href)) as {
  API: new (options: { cwd: string }) => SyncApi;
};
const api = new apiModule.API({ cwd: configDir });

try {
  const parsed = api.parseConfigFile(configPath);
  if (parsed.errors !== undefined && parsed.errors.length > 0) {
    process.stdout.write(JSON.stringify({ errors: parsed.errors }));
    process.exitCode = 1;
  } else {
    // These two are bookkeeping, not options from the config file.
    const { configFilePath: _configFilePath, pathsBasePath, ...compilerOptions } = parsed.options;

    // TypeScript resolves `paths` targets from `baseUrl`, or else from `pathsBasePath`:
    // the folder of the config that set `paths`.
    if (typeof compilerOptions.paths === "object" && compilerOptions.paths !== null) {
      const pathsBase = String(compilerOptions.baseUrl ?? pathsBasePath ?? configDir);
      compilerOptions.paths = Object.fromEntries(
        Object.entries(compilerOptions.paths as Record<string, string[]>).map(
          ([pattern, targets]) => [pattern, targets.map((target) => toAbsolute(target, pathsBase))],
        ),
      );
    }

    const result: Record<string, unknown> = { compilerOptions };
    for (const key of ["include", "exclude", "files"] as const) {
      const value = parsed.raw?.[key];
      if (Array.isArray(value)) {
        result[key] = value.map((path: string) => toAbsolute(path, configDir));
      }
    }
    process.stdout.write(JSON.stringify(result));
  }
} finally {
  api.close?.();
}
