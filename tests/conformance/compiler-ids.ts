/**
 * Every compiler that the conformance cases run against.
 *
 * Each id becomes one vitest project (`conformance:<id>`, see vitest.config.ts) and one entry in
 * the `conformance` CI matrix (.github/workflows/ci.yaml). `ci-matrix.test.ts` checks that the
 * CI matrix lists exactly these ids. This file has no imports, so vitest.config.ts can load it.
 */
export const compilerIds = [
  // Released TypeScript versions: the reference.
  "typescript-5.9",
  "typescript-6.0",
  "typescript-7.0",
  // TypeScript pre-releases: an early warning.
  "typescript-7.1",
  // Ports of the TypeScript compiler: not the reference, but they should agree with it.
  "tsc-ts",
  "tsc-rs",
  "tsrs",
] as const;

export type CompilerId = (typeof compilerIds)[number];
