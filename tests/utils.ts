import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { onTestFinished } from "vitest";

/**
 * Writes `files` into a new temp folder and returns the folder path.
 * Objects are written as JSON. Strings are written as they are.
 * The folder is removed when the test finishes.
 */
export function createFixture(files: Record<string, string | object>): string {
  // `realpathSync` matters on macOS, where the temp folder is behind a symlink.
  const root = realpathSync(mkdtempSync(join(tmpdir(), "tsconf-utils-")));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));

  for (const [path, content] of Object.entries(files)) {
    const filePath = join(root, path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, typeof content === "string" ? content : JSON.stringify(content));
  }

  return root;
}
