import { describeConformance } from "./run-conformance";

// Pre-release TypeScript versions. A failure here is an early warning, not a blocker.
describeConformance({ label: "7.1 beta", packageName: "typescript-7.1" });
