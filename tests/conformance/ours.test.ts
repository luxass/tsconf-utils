import { dirname } from "node:path";

import { describe, expect, it } from "vitest";

import { parseTSConfigSync } from "../../src";
import { conformanceCases, isErrorCase } from "./cases";
import { setUpCase } from "./harness";
import { toExpectedFormat } from "./normalize";

// Our half of the conformance check: tsconf-utils must return exactly `expected`.
// The compiler test files check that each compiler agrees with the same `expected` results.
// This half is fast, so it runs in `pnpm test`.
describe("tsconf-utils returns exactly expected", () => {
  it.each(conformanceCases)("$name", (testCase) => {
    const { root, entry } = setUpCase(testCase);

    if (isErrorCase(testCase)) {
      expect(() => parseTSConfigSync(entry)).toThrow(
        expect.objectContaining({ _tag: testCase.expectedError }),
      );
      return;
    }

    const { config } = parseTSConfigSync(entry);

    // `toExpectedFormat` drops other top-level keys, so make sure we return none.
    const otherKeys = Object.keys(config).filter(
      (key) => !["compilerOptions", "include", "exclude", "files"].includes(key),
    );
    expect(otherKeys).toEqual([]);

    expect(toExpectedFormat(config, { baseDir: dirname(entry), root })).toEqual(testCase.expected);
  });
});
