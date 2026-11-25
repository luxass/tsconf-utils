import { typescriptNextCompilers } from "./compilers";
import { describeConformance } from "./harness";

// `pnpm test:conformance:next`: TypeScript pre-releases. A failure is an early warning, not a blocker.
for (const compiler of typescriptNextCompilers()) describeConformance(compiler);
