import { typescriptCompilers } from "./compilers";
import { describeConformance } from "./harness";

// `pnpm test:conformance`: released TypeScript versions. These must pass.
for (const compiler of typescriptCompilers()) describeConformance(compiler);
