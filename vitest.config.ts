import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/*.test.ts"],
        },
      },
      {
        // Compares our output with `tsc --showConfig`. Slower, so it is not part of `pnpm test`.
        test: {
          name: "conformance",
          include: ["tests/conformance/stable.test.ts"],
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: "conformance-next",
          include: ["tests/conformance/next.test.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
