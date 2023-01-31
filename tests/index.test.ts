import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  findTSConfig,
  findTSConfigSync,
  parseTSConfig,
  parseTSConfigSync,
  resolveTSConfig,
  resolveTSConfigSync
} from "../src";

describe("parse", async () => {
  const fwd = path.join(__dirname, "fixtures", "test-2");
  const configPath = await findTSConfig(fwd, "tsconfig.json");

  test("parse - async", async () => {
    const config = await parseTSConfig(configPath!);
    expect(config).not.toBe(null);
  });

  test("parse - sync", () => {
    const config = parseTSConfigSync(configPath!);
    expect(config).not.toBe(null);
  });
});

describe("resolve", () => {
  const fwd = path.join(__dirname, "fixtures", "test-2");
  test("resolve - async", async () => {
    const config = await resolveTSConfig(fwd, "tsconfig.json");
    expect(config).not.toBe(null);
  });

  test("resolve - sync", () => {
    const config = resolveTSConfigSync(fwd, "tsconfig.json");
    expect(config).not.toBe(null);
  });
});

describe("resolve `extends` array", () => {
  const fwd = path.join(__dirname, "fixtures", "extends-array");
  test("resolve - async", async () => {
    const config = await resolveTSConfig(fwd, "tsconfig.json");
    expect(config).not.toBe(null);
  });

  test("resolve - sync", () => {
    const config = resolveTSConfigSync(fwd, "tsconfig.json");
    expect(config).not.toBe(null);
  });
});

describe("find", () => {
  const fwd = path.join(__dirname, "fixtures", "test-1");
  test("find - async", async () => {
    const config = await findTSConfig(fwd, "tsconfig.json");
    expect(config).not.toBe(null);
  });

  test("find - sync", () => {
    const config = findTSConfigSync(fwd, "tsconfig.json");
    expect(config).not.toBe(null);
  });
});
