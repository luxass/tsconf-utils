import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  findTSConfig,
  findTSConfigSync,
  parseTSConfig,
  parseTSConfigSync,
  resolveTSConfig,
  resolveTSConfigSync
} from "../src";

describe("tsconf-utils", () => {
  describe("parse", async () => {
    const fwd = path.join(__dirname, "fixtures", "test-2");
    const configPath = await findTSConfig(fwd, "tsconfig.json");

    it("parse - async", async () => {
      const config = await parseTSConfig(configPath!);
      expect(config).not.toBe(null);
    });

    it("parse - sync", () => {
      const config = parseTSConfigSync(configPath!);
      expect(config).not.toBe(null);
    });
  });

  describe("resolve", () => {
    const fwd = path.join(__dirname, "fixtures", "test-2");
    it("resolve - async", async () => {
      const config = await resolveTSConfig(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });

    it("resolve - sync", () => {
      const config = resolveTSConfigSync(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });
  });

  describe("resolve 3", () => {
    const fwd = path.join(__dirname, "fixtures", "test-3");
    it("resolve - async", async () => {
      const config = await resolveTSConfig(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });

    it("resolve - sync", () => {
      const config = resolveTSConfigSync(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });
  });

  describe("find", () => {
    const fwd = path.join(__dirname, "fixtures", "test-1");
    it("find - async", async () => {
      const config = await findTSConfig(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });

    it("find - sync", () => {
      const config = findTSConfigSync(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });
  });
});
