import { inject } from "vitest";

import type { CompilerId } from "./compiler-ids";
import { getCompiler } from "./compilers";
import { describeConformance } from "./harness";

declare module "vitest" {
  export interface ProvidedContext {
    /** Set by each `conformance:<id>` project in vitest.config.ts. */
    conformanceCompiler: CompilerId;
  }
}

// The compiler half of the conformance check, for the compiler of this vitest project.
describeConformance(getCompiler(inject("conformanceCompiler")));
