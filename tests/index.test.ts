import path from "node:path";
import { describe, expect, it } from "vitest";
import { find, findSync, parse, parseSync, resolve, resolveSync } from "../src";

describe("tsconf-utils", () => {

  describe("parse", async () => {
    const fwd = path.join(__dirname, "fixtures", "test-2");
    const configPath = await find(fwd, "tsconfig.json");
    
    it("parse - async", async () => {
      const config = await parse(configPath!);
      expect(config).not.toBe(null);
    });

    it("parse - sync", () => {
      const config = parseSync(configPath!);
      expect(config).not.toBe(null);
    });
  });

  describe("resolve", () => {
    const fwd = path.join(__dirname, "fixtures", "test-2");
    it("resolve - async", async () => {
      const config = await resolve(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });

    it("resolve - sync", () => {
      const config = resolveSync(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });
  });

  describe("find", () => {
    const fwd = path.join(__dirname, "fixtures", "test-1");
    it("find - async", async () => {
      const config = await find(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });

    it("find - sync", () => {
      const config = findSync(fwd, "tsconfig.json");
      expect(config).not.toBe(null);
    });
  });

});
