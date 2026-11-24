// oxlint-disable max-classes-per-file -- Keep all public error classes in one place.
import { Data } from "effect";

/**
 * A tsconfig file exists, but it could not be read (for example, missing permissions),
 * or the path given to `parseTSConfig` does not exist.
 */
export class TSConfigReadError extends Data.TaggedError("TSConfigReadError")<{
  readonly path: string;
  readonly cause: unknown;
}> {
  override get message(): string {
    return `Cannot read tsconfig file ${this.path}`;
  }
}

/**
 * A tsconfig file is not valid JSONC, or its content has the wrong shape
 * (for example, `extends` is a number).
 */
export class TSConfigParseError extends Data.TaggedError("TSConfigParseError")<{
  readonly path: string;
  readonly reason: string;
  readonly cause?: unknown;
}> {
  override get message(): string {
    return `Invalid tsconfig file ${this.path}: ${this.reason}`;
  }
}

/**
 * An `extends` entry points to a file or package that does not exist.
 */
export class TSConfigExtendsNotFoundError extends Data.TaggedError("TSConfigExtendsNotFoundError")<{
  /** The `extends` value as written, for example `"./base.json"` or `"@tsconfig/node22"`. */
  readonly specifier: string;
  /** The tsconfig file that contains the `extends` entry. */
  readonly from: string;
  /** The tsconfig files that lead to `from`, starting with the first file that was loaded. */
  readonly chain: readonly string[];
}> {
  override get message(): string {
    return `Cannot resolve "${this.specifier}" extended from ${this.from}`;
  }
}

/**
 * Two or more tsconfig files extend each other in a loop.
 */
export class TSConfigExtendsCycleError extends Data.TaggedError("TSConfigExtendsCycleError")<{
  /** The tsconfig files in the loop. The last file is the same as an earlier file. */
  readonly chain: readonly string[];
}> {
  override get message(): string {
    return `Circular extends in tsconfig files: ${this.chain.join(" -> ")}`;
  }
}

export type TSConfigError =
  | TSConfigReadError
  | TSConfigParseError
  | TSConfigExtendsNotFoundError
  | TSConfigExtendsCycleError;
