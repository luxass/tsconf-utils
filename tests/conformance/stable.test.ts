import { describeConformance } from "./run-conformance";

// Released TypeScript versions. These must pass.
describeConformance({ label: "5.9", packageName: "typescript-5" });
describeConformance({ label: "6.0", packageName: "typescript-6" });
describeConformance({ label: "7.0", packageName: "typescript" });
