import { join } from "node:path";

import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  findTSConfig,
  findTSConfigEffect,
  findTSConfigSync,
  loadTSConfig,
  loadTSConfigEffect,
  loadTSConfigSync,
  parseTSConfig,
  parseTSConfigEffect,
  parseTSConfigSync,
  TSConfigExtendsCycleError,
  TSConfigExtendsNotFoundError,
  TSConfigParseError,
  TSConfigReadError,
} from "../src";
import { createFixture } from "./utils";

describe("findTSConfig", () => {
  it("finds the closest tsconfig in a parent folder", async () => {
    const root = createFixture({
      "tsconfig.json": {},
      "packages/app/src/.gitkeep": "",
    });
    const cwd = join(root, "packages/app/src");

    expect(findTSConfigSync({ cwd })).toBe(join(root, "tsconfig.json"));
    expect(await findTSConfig({ cwd })).toBe(join(root, "tsconfig.json"));
    expect(Effect.runSync(findTSConfigEffect({ cwd }))).toBe(join(root, "tsconfig.json"));
  });

  it("prefers the closest file", () => {
    const root = createFixture({
      "tsconfig.json": {},
      "app/tsconfig.json": {},
    });

    expect(findTSConfigSync({ cwd: join(root, "app") })).toBe(join(root, "app/tsconfig.json"));
  });

  it("supports a custom file name", () => {
    const root = createFixture({ "tsconfig.build.json": {} });

    expect(findTSConfigSync({ cwd: root, name: "tsconfig.build.json" })).toBe(
      join(root, "tsconfig.build.json"),
    );
  });

  it("ignores folders with the same name", () => {
    const root = createFixture({ "tsconfig.json/.gitkeep": "" });

    expect(findTSConfigSync({ cwd: root, name: "tsconfig.json" })).not.toBe(
      join(root, "tsconfig.json"),
    );
  });

  it("returns undefined when nothing is found", () => {
    const root = createFixture({ ".gitkeep": "" });

    expect(findTSConfigSync({ cwd: root, name: "does-not-exist.json" })).toBeUndefined();
  });

  it("works when cwd is a file", () => {
    const root = createFixture({ "tsconfig.json": {}, "src/index.ts": "" });

    expect(findTSConfigSync({ cwd: join(root, "src/index.ts") })).toBe(join(root, "tsconfig.json"));
  });
});

describe("parseTSConfig: extends", () => {
  it("resolves relative extends from the config's folder, adding .json when needed", () => {
    const root = createFixture({
      "tsconfig.json": { extends: "./configs/base", compilerOptions: { strict: true } },
      "configs/base.json": { compilerOptions: { target: "es2022", strict: false } },
    });

    const result = parseTSConfigSync(join(root, "tsconfig.json"));

    expect(result.config).toEqual({ compilerOptions: { target: "es2022", strict: true } });
    expect(result.configFiles).toEqual([
      join(root, "tsconfig.json"),
      join(root, "configs/base.json"),
    ]);
  });

  it("lets later entries in an extends array win", () => {
    const root = createFixture({
      "tsconfig.json": { extends: ["./one.json", "./two.json"] },
      "one.json": { compilerOptions: { target: "es5", strict: true } },
      "two.json": { compilerOptions: { target: "es2022" } },
    });

    expect(parseTSConfigSync(join(root, "tsconfig.json")).config.compilerOptions).toEqual({
      target: "es2022",
      strict: true,
    });
  });

  it("does not search parent folders for a missing relative extends", () => {
    const root = createFixture({
      "base.json": { compilerOptions: { target: "WRONG" } },
      "app/tsconfig.json": { extends: "./base.json" },
    });
    const path = join(root, "app/tsconfig.json");

    expect(() => parseTSConfigSync(path)).toThrow(TSConfigExtendsNotFoundError);
    expect(() => parseTSConfigSync(path)).toThrow(
      `Cannot resolve "./base.json" extended from ${path}`,
    );
  });

  it("fails on circular extends", () => {
    const root = createFixture({
      "a.json": { extends: "./b.json" },
      "b.json": { extends: "./a.json" },
    });

    let error: unknown;
    try {
      parseTSConfigSync(join(root, "a.json"));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(TSConfigExtendsCycleError);
    expect((error as TSConfigExtendsCycleError).chain).toEqual([
      join(root, "a.json"),
      join(root, "b.json"),
      join(root, "a.json"),
    ]);
  });

  it("allows two parents to extend the same file", () => {
    const root = createFixture({
      "tsconfig.json": { extends: ["./one.json", "./two.json"] },
      "one.json": { extends: "./shared.json" },
      "two.json": { extends: "./shared.json" },
      "shared.json": { compilerOptions: { strict: true } },
    });

    expect(parseTSConfigSync(join(root, "tsconfig.json")).config.compilerOptions).toEqual({
      strict: true,
    });
  });

  it("does not inherit references", () => {
    const root = createFixture({
      "tsconfig.json": { extends: "./base.json" },
      "base.json": { references: [{ path: "./other" }], compileOnSave: true },
    });

    expect(parseTSConfigSync(join(root, "tsconfig.json")).config).toEqual({ compileOnSave: true });
  });

  it("merges watchOptions key by key and replaces include as a whole", () => {
    const root = createFixture({
      "tsconfig.json": {
        extends: "./base.json",
        include: ["src"],
        watchOptions: { watchFile: "useFsEvents" },
      },
      "base.json": { include: ["lib", "test"], watchOptions: { watchDirectory: "useFsEvents" } },
    });

    expect(parseTSConfigSync(join(root, "tsconfig.json")).config).toEqual({
      include: [join(root, "src")],
      watchOptions: { watchFile: "useFsEvents", watchDirectory: "useFsEvents" },
    });
  });
});

function parseWithPackage(specifier: string, files: Record<string, string | object>) {
  const root = createFixture({
    "app/tsconfig.json": { extends: specifier },
    ...files,
  });
  return parseTSConfigSync(join(root, "app/tsconfig.json")).config.compilerOptions;
}

describe("parseTSConfig: package extends", () => {
  it("uses tsconfig.json in the package root", () => {
    expect(
      parseWithPackage("pkg", {
        "node_modules/pkg/package.json": { name: "pkg" },
        "node_modules/pkg/tsconfig.json": { compilerOptions: { target: "es2016" } },
      }),
    ).toEqual({ target: "es2016" });
  });

  it("uses the tsconfig field in package.json", () => {
    expect(
      parseWithPackage("pkg", {
        "node_modules/pkg/package.json": { name: "pkg", tsconfig: "./custom.json" },
        "node_modules/pkg/custom.json": { compilerOptions: { target: "es2015" } },
      }),
    ).toEqual({ target: "es2015" });
  });

  it("resolves scoped packages with a subpath and adds .json", () => {
    expect(
      parseWithPackage("@tsconfig/node22", {
        "node_modules/@tsconfig/node22/package.json": { name: "@tsconfig/node22" },
        "node_modules/@tsconfig/node22/tsconfig.json": { compilerOptions: { target: "es2016" } },
      }),
    ).toEqual({ target: "es2016" });

    expect(
      parseWithPackage("@scope/cfg/node", {
        "node_modules/@scope/cfg/package.json": { name: "@scope/cfg" },
        "node_modules/@scope/cfg/node.json": { compilerOptions: { target: "es2018" } },
      }),
    ).toEqual({ target: "es2018" });
  });

  it("uses tsconfig.json inside a subpath folder", () => {
    expect(
      parseWithPackage("pkg/sub", {
        "node_modules/pkg/package.json": { name: "pkg" },
        "node_modules/pkg/sub/tsconfig.json": { compilerOptions: { target: "es2021" } },
      }),
    ).toEqual({ target: "es2021" });
  });

  it("finds packages in parent node_modules folders", () => {
    expect(
      parseWithPackage("pkg", {
        "app/node_modules/.gitkeep": "",
        "node_modules/pkg/package.json": { name: "pkg" },
        "node_modules/pkg/tsconfig.json": { compilerOptions: { target: "es2016" } },
      }),
    ).toEqual({ target: "es2016" });
  });

  describe("exports", () => {
    const exportsPackage = {
      "node_modules/ex/package.json": {
        name: "ex",
        exports: {
          ".": "./c/root.json",
          "./imp": { import: "./c/imp.json", default: "./c/def.json" },
          "./req": { require: "./c/req.json", import: "./c/imp.json" },
          "./types": { types: "./c/types.json", default: "./c/def.json" },
          "./w/*": "./c/*.json",
        },
      },
      "node_modules/ex/c/root.json": { compilerOptions: { target: "root" } },
      "node_modules/ex/c/imp.json": { compilerOptions: { target: "imp" } },
      "node_modules/ex/c/req.json": { compilerOptions: { target: "req" } },
      "node_modules/ex/c/types.json": { compilerOptions: { target: "types" } },
      "node_modules/ex/c/def.json": { compilerOptions: { target: "def" } },
      "node_modules/ex/c/wild.json": { compilerOptions: { target: "wild" } },
    };

    // Expected values come from `tsc --showConfig` with the same package.
    it.each([
      ["ex", "root"],
      ["ex/imp", "def"],
      ["ex/req", "req"],
      ["ex/types", "types"],
      ["ex/w/wild", "wild"],
    ])("resolves %s", (specifier, target) => {
      expect(parseWithPackage(specifier, exportsPackage)).toEqual({ target });
    });

    it("does not fall back to files outside exports", () => {
      expect(() => parseWithPackage("ex/c/root.json", exportsPackage)).toThrow(
        TSConfigExtendsNotFoundError,
      );
    });
  });

  it("fails for a missing package", () => {
    expect(() => parseWithPackage("does-not-exist", {})).toThrow(TSConfigExtendsNotFoundError);
  });
});

describe("parseTSConfig: paths", () => {
  it("resolves path options from the config that sets them", () => {
    const root = createFixture({
      "app/tsconfig.json": { extends: "../base/tsconfig.json" },
      "base/tsconfig.json": {
        compilerOptions: {
          baseUrl: "./src",
          outDir: "./dist",
          rootDir: "./src",
          typeRoots: ["./types"],
        },
        include: ["src/**/*"],
        exclude: ["dist"],
      },
    });

    expect(parseTSConfigSync(join(root, "app/tsconfig.json")).config).toEqual({
      compilerOptions: {
        baseUrl: join(root, "base/src"),
        outDir: join(root, "base/dist"),
        rootDir: join(root, "base/src"),
        typeRoots: [join(root, "base/types")],
      },
      include: [join(root, "base/src/**/*")],
      exclude: [join(root, "base/dist")],
    });
  });

  it("does not join an inherited baseUrl twice", () => {
    const root = createFixture({
      "a/tsconfig.json": { extends: "../base.json" },
      "base.json": { compilerOptions: { baseUrl: "./src" } },
    });

    expect(parseTSConfigSync(join(root, "a/tsconfig.json")).config.compilerOptions?.baseUrl).toBe(
      join(root, "src"),
    );
  });

  it("replaces ${configDir} with the folder of the first config", () => {
    const root = createFixture({
      "app/tsconfig.json": { extends: "../base.json" },
      "base.json": {
        compilerOptions: { outDir: "${configDir}/dist", paths: { "@/*": ["${configDir}/src/*"] } },
        include: ["${configDir}/src"],
      },
    });

    expect(parseTSConfigSync(join(root, "app/tsconfig.json")).config).toEqual({
      compilerOptions: {
        outDir: join(root, "app/dist"),
        paths: { "@/*": [join(root, "app/src/*")] },
      },
      include: [join(root, "app/src")],
    });
  });

  it("resolves paths targets from the config that sets paths when there is no baseUrl", () => {
    const root = createFixture({
      "app/tsconfig.json": { extends: "../base.json" },
      "base.json": { compilerOptions: { paths: { "@/*": ["./lib/*"] } } },
    });

    expect(
      parseTSConfigSync(join(root, "app/tsconfig.json")).config.compilerOptions?.paths,
    ).toEqual({ "@/*": [join(root, "lib/*")] });
  });

  it("resolves paths targets from baseUrl when it is set", () => {
    const root = createFixture({
      "app/tsconfig.json": { extends: "../base.json", compilerOptions: { baseUrl: "./src" } },
      "base.json": { compilerOptions: { paths: { "@/*": ["lib/*"] } } },
    });

    expect(
      parseTSConfigSync(join(root, "app/tsconfig.json")).config.compilerOptions?.paths,
    ).toEqual({ "@/*": [join(root, "app/src/lib/*")] });
  });
});

describe("parseTSConfig: file content", () => {
  it("accepts comments, trailing commas, and a byte order mark", () => {
    const root = createFixture({
      "tsconfig.json": `\uFEFF{
        // comment
        "compilerOptions": {
          /* block comment */
          "strict": true,
        },
      }`,
    });

    expect(parseTSConfigSync(join(root, "tsconfig.json")).config).toEqual({
      compilerOptions: { strict: true },
    });
  });

  it("treats an empty file as an empty config", () => {
    const root = createFixture({ "tsconfig.json": "" });

    expect(parseTSConfigSync(join(root, "tsconfig.json")).config).toEqual({});
  });

  it.each([
    ["invalid JSON", "{ nope"],
    ["a JSON array", "[]"],
    ["a non-string extends", '{ "extends": 1 }'],
    ["a non-object compilerOptions", '{ "compilerOptions": [] }'],
  ])("fails with TSConfigParseError for %s", (_name, content) => {
    const root = createFixture({ "tsconfig.json": content });

    expect(() => parseTSConfigSync(join(root, "tsconfig.json"))).toThrow(TSConfigParseError);
  });

  it("fails with TSConfigReadError for a missing file", () => {
    const root = createFixture({ ".gitkeep": "" });

    expect(() => parseTSConfigSync(join(root, "tsconfig.json"))).toThrow(TSConfigReadError);
  });
});

describe("loadTSConfig", () => {
  it("finds and parses the closest tsconfig", async () => {
    const root = createFixture({
      "tsconfig.json": { compilerOptions: { strict: true } },
      "src/.gitkeep": "",
    });
    const expected = {
      path: join(root, "tsconfig.json"),
      config: { compilerOptions: { strict: true } },
      configFiles: [join(root, "tsconfig.json")],
    };
    const cwd = join(root, "src");

    expect(loadTSConfigSync({ cwd })).toEqual(expected);
    expect(await loadTSConfig({ cwd })).toEqual(expected);
    expect(Effect.runSync(loadTSConfigEffect({ cwd }))).toEqual(expected);
  });

  it("returns undefined when no tsconfig is found", async () => {
    const root = createFixture({ ".gitkeep": "" });
    const options = { cwd: root, name: "does-not-exist.json" };

    expect(loadTSConfigSync(options)).toBeUndefined();
    expect(await loadTSConfig(options)).toBeUndefined();
  });

  it("throws when the tsconfig that was found is broken", async () => {
    const root = createFixture({ "tsconfig.json": "{ nope" });

    expect(() => loadTSConfigSync({ cwd: root })).toThrow(TSConfigParseError);
    await expect(loadTSConfig({ cwd: root })).rejects.toThrow(TSConfigParseError);
  });
});

describe("errors", () => {
  it("rejects the Promise API with the tagged error", async () => {
    const root = createFixture({ "tsconfig.json": { extends: "./missing.json" } });

    await expect(parseTSConfig(join(root, "tsconfig.json"))).rejects.toMatchObject({
      _tag: "TSConfigExtendsNotFoundError",
      specifier: "./missing.json",
      from: join(root, "tsconfig.json"),
      chain: [join(root, "tsconfig.json")],
    });
  });

  it("exposes typed errors in the Effect API", () => {
    const root = createFixture({ "tsconfig.json": { extends: "./missing.json" } });

    const program = parseTSConfigEffect(join(root, "tsconfig.json")).pipe(
      Effect.map(() => "parsed"),
      Effect.catchTag("TSConfigExtendsNotFoundError", (error) =>
        Effect.succeed(`missing ${error.specifier}`),
      ),
    );

    expect(Effect.runSync(program)).toBe("missing ./missing.json");
  });
});
