import { defineConfig } from "vitest/config";

import { compilerIds } from "./tests/conformance/compiler-ids";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/*.test.ts", "tests/conformance/ours.test.ts"],
        },
      },
      // The compiler half of the conformance check (see tests/conformance/README.md): one project
      // per compiler, for example `conformance:tsrs`. They start real compilers, so they are
      // slower and not part of `pnpm test`. CI runs each one as its own matrix job.
      ...compilerIds.map((id) => ({
        test: {
          name: `conformance:${id}`,
          include: ["tests/conformance/compilers.test.ts"],
          provide: { conformanceCompiler: id },
          testTimeout: 30_000,
        },
      })),
    ],
  },
});
