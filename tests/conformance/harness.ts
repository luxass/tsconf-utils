import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { createFixture } from "../utils";
import {
  type ConformanceCase,
  conformanceCases,
  type ExpectedConfig,
  isErrorCase,
  type SuccessCase,
} from "./cases";
import type { Compiler } from "./compilers";
import { pickKeys, toExpectedFormat, withoutPaths } from "./normalize";

const API_SHOW_CONFIG_SCRIPT = join(import.meta.dirname, "api-show-config.ts");

const successCases = conformanceCases.filter(
  (testCase): testCase is SuccessCase => !isErrorCase(testCase),
);
const errorCases = conformanceCases.filter((testCase) => isErrorCase(testCase));

/** Writes a case's files to a new temp folder. */
export function setUpCase(testCase: ConformanceCase): { root: string; entry: string } {
  const root = createFixture(testCase.files);
  return { root, entry: join(root, testCase.entry ?? "tsconfig.json") };
}

function run(command: readonly string[], cwd: string) {
  const [executable, ...args] = command;
  const result = spawnSync(executable!, args, { cwd, encoding: "utf8" });
  return { exitCode: result.status, output: `${result.stdout}${result.stderr}` };
}

/** Parses a compiler's JSON output and checks it against the keys in `expected`. */
function expectOutputToMatch(
  output: string,
  expected: ExpectedConfig,
  root: string,
  entry: string,
) {
  const actual = toExpectedFormat(JSON.parse(output) as Record<string, unknown>, {
    baseDir: dirname(entry),
    root,
  });
  expect(pickKeys(actual, expected)).toEqual(expected);
}

/**
 * Checks that a compiler agrees with the hand-written `expected` result of every case.
 * `ours.test.ts` checks that tsconf-utils agrees with the same `expected` results.
 */
export function describeConformance(compiler: Compiler): void {
  describe(compiler.label, () => {
    // `--showConfig` in TypeScript 7 does not report extends errors, so run a real check.
    it.each(errorCases)("$name (error, --noEmit)", (testCase) => {
      const { root, entry } = setUpCase(testCase);
      const result = run([...compiler.command, "--noEmit", "-p", entry], root);
      expect(result.exitCode, result.output).not.toBe(0);
      expect(result.output).toMatch(/error TS\d+/u);
    });

    if (compiler.supportsShowConfig) {
      it.each(successCases)("$name (--showConfig)", (testCase) => {
        const { root, entry } = setUpCase(testCase);
        const result = run([...compiler.command, "--showConfig", "-p", entry], root);
        expect(result.exitCode, result.output).toBe(0);
        // `--showConfig` prints `paths` unresolved, so they are not compared here.
        expectOutputToMatch(result.output, withoutPaths(testCase.expected), root, entry);
      });
    }

    const { syncApiModule } = compiler;
    if (syncApiModule !== undefined) {
      it.each(successCases)("$name (API)", (testCase) => {
        const { root, entry } = setUpCase(testCase);
        const result = run([process.execPath, API_SHOW_CONFIG_SCRIPT, syncApiModule, entry], root);
        expect(result.exitCode, result.output).toBe(0);
        expectOutputToMatch(result.output, testCase.expected, root, entry);
      });
    }
  });
}
