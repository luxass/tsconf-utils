import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, it } from "vitest";

import { compilerIds } from "./conformance/compiler-ids";

// CI runs one conformance job per compiler. A compiler added to compiler-ids.ts but not to the
// CI matrix would never run in CI, so this test keeps the two lists equal.
it("runs every conformance compiler in the CI matrix", () => {
  // Git on Windows may check the file out with CRLF line endings.
  const workflow = readFileSync(
    join(import.meta.dirname, "../.github/workflows/ci.yaml"),
    "utf8",
  ).replaceAll("\r\n", "\n");

  // The `compiler:` list under `conformance:` → `strategy:` → `matrix:`.
  const matrix = /\n  conformance:\n(?:.*\n)*?        compiler:\n((?: {10}- .+\n)+)/u.exec(
    workflow,
  );
  expect(matrix, "conformance matrix not found in ci.yaml").not.toBeNull();

  const ciCompilers = matrix![1]!
    .trim()
    .split("\n")
    .map((line) => line.trim().replace(/^- /u, ""));
  expect(ciCompilers).toEqual([...compilerIds]);
});
