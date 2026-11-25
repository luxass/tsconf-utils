import { portCompilers } from "./compilers";
import { describeConformance } from "./harness";

// `pnpm test:conformance:ports`: ports of the TypeScript compiler.
for (const compiler of portCompilers()) describeConformance(compiler);
