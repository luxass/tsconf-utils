import { statSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  dirname,
  join,
  parse as pathParse,
  resolve as pathResolve
} from "node:path";

import { parseFile, parseFileSync } from "jsonc-parse";

const _require = createRequire(import.meta.url);

export async function findTSConfig(
  dir: string,
  name: string
): Promise<string | null> {
  const root = pathParse(dir).root;
  while (dir !== root) {
    const file = pathResolve(dir, name);
    try {
      const stats = await stat(file);
      if (stats.isFile()) return file;
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
    dir = pathParse(dir).dir;
  }
  return null;
}

export function findTSConfigSync(dir: string, name: string): string | null {
  const root = pathParse(dir).root;
  while (dir !== root) {
    const file = pathResolve(dir, name);
    try {
      const stats = statSync(file);
      if (stats.isFile()) return file;
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
    dir = pathParse(dir).dir;
  }

  return null;
}

export type ResolveResult = {
  path: string
  tsconfig: Record<string, any>
  files: string[]
};

export async function resolveTSConfig(
  cwd: string = process.cwd(),
  name = "tsconfig.json"
): Promise<ResolveResult | null> {
  let path;
  try {
    path = await findTSConfig(cwd, name);

    if (!path) return null;
    const { config, files } = await parseTSConfig(path);

    if (typeof config !== "object") {
      throw new SyntaxError(`Invalid JSON in ${path}`);
    }

    return {
      path,
      tsconfig: config,
      files
    };
  } catch (e) {
    if (e.code === "EISDIR") {
      console.error(`${path} is a directory.`);
    }

    return null;
  }
}

export function resolveTSConfigSync(
  cwd: string = process.cwd(),
  name = "tsconfig.json"
): ResolveResult | null {
  let path;
  try {
    path = findTSConfigSync(cwd, name);

    if (!path) return null;
    const { config, files } = parseTSConfigSync(path);

    if (typeof config !== "object") {
      throw new SyntaxError(`Invalid JSON in ${path}`);
    }

    return {
      path,
      tsconfig: config,
      files
    };
  } catch (e) {
    if (e.code === "EISDIR") {
      console.error(`${path} is a directory.`);
    }

    return null;
  }
}

export type ParseResult = {
  config: Record<string, any>
  files: string[]
};

export async function parseTSConfig(path: string): Promise<ParseResult> {
  const config = await parseFile(path);
  if (!config) {
    return {
      config: {},
      files: []
    };
  }

  const configDir = dirname(path);
  let files: string[] = [];

  if (config.extends) {
    const _extends = Array.isArray(config.extends) ?
      config.extends :
        [config.extends];
    for (let extendsPath of _extends) {
      if (extendsPath.startsWith(".")) {
        extendsPath = await findTSConfig(configDir, extendsPath);
      } else {
        extendsPath = _require.resolve(extendsPath, {
          paths: [configDir]
        });
      }

      const extendsConfig = await parseTSConfig(extendsPath);
      files = files.concat(extendsConfig.files);

      if (extendsConfig) {
        Object.assign(config, {
          ...extendsConfig.config,
          ...config,
          compilerOptions: {
            ...extendsConfig.config.compilerOptions,
            ...config.compilerOptions
          }
        });
      }
    }
  }

  if (config.compilerOptions?.baseUrl) {
    config.compilerOptions.baseUrl = join(
      configDir,
      config.compilerOptions.baseUrl
    );
  }

  delete config.extends;
  files.unshift(path);

  return {
    config,
    files
  };
}

export function parseTSConfigSync(path: string): ParseResult {
  const config = parseFileSync(path);
  if (!config) {
    return {
      config: {},
      files: []
    };
  }

  const configDir = dirname(path);
  let files: string[] = [];

  if (config.extends) {
    const _extends = Array.isArray(config.extends) ?
      config.extends :
        [config.extends];
    for (let extendsPath of _extends) {
      if (extendsPath.startsWith(".")) {
        extendsPath = findTSConfigSync(configDir, extendsPath);
      } else {
        extendsPath = _require.resolve(extendsPath, {
          paths: [configDir]
        });
      }

      const extendsConfig = parseTSConfigSync(extendsPath);
      files = files.concat(extendsConfig.files);

      if (extendsConfig) {
        Object.assign(config, {
          ...extendsConfig.config,
          ...config,
          compilerOptions: {
            ...extendsConfig.config.compilerOptions,
            ...config.compilerOptions
          }
        });
      }
    }
  }

  if (config.compilerOptions?.baseUrl) {
    config.compilerOptions.baseUrl = join(
      configDir,
      config.compilerOptions.baseUrl
    );
  }

  delete config.extends;
  files.unshift(path);

  return {
    config,
    files
  };
}
