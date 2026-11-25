import { sep } from "node:path";

/**
 * Converts a path to use `/` as its separator, like `tsc` prints paths.
 *
 * Every path that tsconf-utils returns goes through this, so results are the same on every OS,
 * and `include`/`exclude` patterns work with glob libraries on Windows.
 * Node.js file functions accept `/` on Windows too.
 *
 * Only Windows paths are changed. On other systems `\` is a valid character in a file name.
 */
export function toPosixPath(path: string): string {
  return sep === "\\" ? path.replaceAll("\\", "/") : path;
}
