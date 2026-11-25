/**
 * The `compilerOptions` object of a tsconfig file.
 *
 * Only the options that this library changes are typed. All other options pass through unchanged.
 */
export interface TSConfigCompilerOptions {
  baseUrl?: string;
  paths?: Record<string, string[]>;
  rootDir?: string;
  rootDirs?: string[];
  outDir?: string;
  outFile?: string;
  declarationDir?: string;
  tsBuildInfoFile?: string;
  generateCpuProfile?: string;
  typeRoots?: string[];
  [option: string]: unknown;
}

/**
 * A tsconfig after all `extends` entries are merged in.
 *
 * All path options, `include`, `exclude`, `files`, and `paths` targets are absolute paths.
 */
// This is an interface and not `Omit<TSConfigJSON, "extends">`,
// because `Omit` on a type with an index signature drops every named key.
export interface ResolvedTSConfig {
  compilerOptions?: TSConfigCompilerOptions;
  include?: string[];
  exclude?: string[];
  files?: string[];
  references?: { path: string; prepend?: boolean }[];
  watchOptions?: Record<string, unknown>;
  typeAcquisition?: Record<string, unknown>;
  compileOnSave?: boolean;
  [key: string]: unknown;
}

/**
 * The content of a tsconfig file.
 */
export interface TSConfigJSON extends ResolvedTSConfig {
  extends?: string | string[];
}

export interface TSConfigResult {
  /** Absolute path of the tsconfig file that was parsed. All returned paths use `/`. */
  path: string;
  /** The merged config. */
  config: ResolvedTSConfig;
  /** Absolute paths of every tsconfig file that was read, starting with `path`. */
  configFiles: string[];
}

export interface FindTSConfigOptions {
  /** The folder to start the search in. Default: `process.cwd()`. */
  cwd?: string;
  /** The file name to look for. Default: `"tsconfig.json"`. */
  name?: string;
}

export interface ParseTSConfigOptions {
  /**
   * What to do with top-level keys that TypeScript does not know, such as `"ts-node"` or
   * `"vueCompilerOptions"`.
   *
   * - `"keep"`: return them. A config inherits them through `extends`, and a child's value
   *   replaces the parent's value as a whole. Tools like ts-node read their own keys this way.
   * - `"drop"`: return only the keys that TypeScript knows, like `tsc --showConfig`.
   *
   * Default: `"keep"`.
   */
  unknownKeys?: "keep" | "drop";
}

export interface LoadTSConfigOptions extends FindTSConfigOptions, ParseTSConfigOptions {}
