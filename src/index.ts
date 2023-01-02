import { statSync } from "node:fs";
import { stat } from "node:fs/promises";
import {
  dirname,
  join,
  parse as pathParse,
  resolve as pathResolve
} from "node:path";
import { createRequire } from "module";
import { parseFile, parseFileSync } from "jsonc-parse";

const customRequire = createRequire(import.meta.url);

export async function find(dir: string, name: string): Promise<string | null> {
  while (dir) {
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

export function findSync(dir: string, name: string): string | null {
  while (dir) {
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

export interface ResolveResult {
  path: string
  tsconfig: Record<string, any>
  files: string[]
}

export async function resolveConfig(
  cwd: string = process.cwd(),
  name = "tsconfig.json"
): Promise<ResolveResult | null> {
  let path;
  try {
    path = await find(cwd, name);
    
    if (!path) return null;
    const { config, files } = await parseConfig(path);

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

export function resolveConfigSync(
  cwd: string = process.cwd(),
  name = "tsconfig.json"
): ResolveResult | null {
  let path;
  try {
    path = findSync(cwd, name);

    if (!path) return null;
    const { config, files } = parseConfigSync(path);

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

export interface ParseResult {
  config: Record<string, any>
  files: string[]
}

export async function parseConfig(path: string): Promise<ParseResult> {
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
    let extendsPath = config.extends;
    if (config.extends.startsWith(".")) {
      extendsPath = await find(configDir, config.extends);
    } else {
      extendsPath = customRequire.resolve(config.extends, { paths: [configDir] });
    }
    
    const extendsConfig = await parseConfig(extendsPath);
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

export function parseConfigSync(path: string): ParseResult {
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
    let extendsPath = config.extends;
    if (config.extends.startsWith(".")) {
      extendsPath = findSync(configDir, config.extends);
    } else {
      extendsPath = customRequire.resolve(config.extends, { paths: [configDir] });
    }
    
    const extendsConfig = parseConfigSync(extendsPath);
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
