import { join } from "node:path";

import { Effect, Exit, Option, Tracer } from "effect";
import { describe, expect, it } from "vitest";

import { parseTSConfigEffect } from "../src";
import { createFixture } from "./utils";

/** A tracer that keeps every span it creates. */
function createRecordingTracer() {
  const spans: Tracer.NativeSpan[] = [];
  const tracer = Tracer.make({
    span(options) {
      const span = new Tracer.NativeSpan(options);
      spans.push(span);
      return span;
    },
  });
  return { spans, tracer };
}

function parentName(span: Tracer.NativeSpan): string | undefined {
  const parent = Option.getOrUndefined(span.parent);
  // Every span in these tests comes from the recording tracer, so parents are NativeSpans.
  return parent instanceof Tracer.NativeSpan ? parent.name : undefined;
}

describe("tracing", () => {
  it("creates a span for each step, nested like the extends tree", () => {
    const root = createFixture({
      "tsconfig.json": { extends: ["./base.json", "pkg"] },
      "base.json": { compilerOptions: { strict: true } },
      "node_modules/pkg/package.json": { name: "pkg" },
      "node_modules/pkg/tsconfig.json": { compilerOptions: { declaration: true } },
    });
    const { spans, tracer } = createRecordingTracer();

    Effect.runSync(
      parseTSConfigEffect(join(root, "tsconfig.json")).pipe(Effect.withTracer(tracer)),
    );

    expect(spans.map((span) => [span.name, parentName(span)])).toEqual([
      ["tsconf-utils/parseTSConfig", undefined],
      ["tsconf-utils/parseFile", "tsconf-utils/parseTSConfig"],
      ["tsconf-utils/readJsonObject", "tsconf-utils/parseFile"],
      ["tsconf-utils/resolveExtends", "tsconf-utils/parseFile"],
      ["tsconf-utils/parseFile", "tsconf-utils/parseFile"],
      ["tsconf-utils/readJsonObject", "tsconf-utils/parseFile"],
      ["tsconf-utils/resolveExtends", "tsconf-utils/parseFile"],
      ["tsconf-utils/packageCandidates", "tsconf-utils/resolveExtends"],
      ["tsconf-utils/findPackageDir", "tsconf-utils/packageCandidates"],
      ["tsconf-utils/readJsonObject", "tsconf-utils/packageCandidates"],
      ["tsconf-utils/parseFile", "tsconf-utils/parseFile"],
      ["tsconf-utils/readJsonObject", "tsconf-utils/parseFile"],
    ]);

    const packageResolve = spans.find(
      (span) =>
        span.name === "tsconf-utils/resolveExtends" && span.attributes.get("specifier") === "pkg",
    );
    expect(packageResolve?.attributes.get("resolved")).toBe(
      join(root, "node_modules/pkg/tsconfig.json"),
    );
  });

  it("marks the failing spans when extends cannot be resolved", () => {
    const root = createFixture({ "tsconfig.json": { extends: "./missing.json" } });
    const { spans, tracer } = createRecordingTracer();

    Effect.runSyncExit(
      parseTSConfigEffect(join(root, "tsconfig.json")).pipe(Effect.withTracer(tracer)),
    );

    const failedSpanNames = spans
      .filter((span) => "exit" in span.status && Exit.isFailure(span.status.exit))
      .map((span) => span.name);
    // In the order the spans were started.
    expect(failedSpanNames).toEqual([
      "tsconf-utils/parseTSConfig",
      "tsconf-utils/parseFile",
      "tsconf-utils/resolveExtends",
    ]);

    const resolveSpan = spans.find((span) => span.name === "tsconf-utils/resolveExtends");
    expect(resolveSpan?.attributes.get("specifier")).toBe("./missing.json");
  });
});
