import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/*.test.ts", "tests/conformance/ours.test.ts"],
        },
      },
      // The compiler half of the conformance check (see tests/conformance/README.md).
      // These start real compilers, so they are slower and not part of `pnpm test`.
      {
        test: {
          name: "conformance",
          include: ["tests/conformance/typescript.test.ts"],
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: "conformance-next",
          include: ["tests/conformance/typescript-next.test.ts"],
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: "conformance-ports",
          include: ["tests/conformance/ports.test.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
