# Conformance tests

These tests check that tsconf-utils resolves tsconfig files the same way as TypeScript.

Every case in `cases.ts` has fixture files and a hand-written `expected` result. Two independent checks compare against it:

1. **Ours:** `ours.test.ts` checks that `parseTSConfigSync` returns exactly `expected`.
2. **Compilers:** each compiler must agree with `expected` for the same fixture.

When both pass, tsconf-utils and the compiler agree, and the agreed result is written in `cases.ts` for review.

## Files

| File                 | Contains                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| `cases.ts`           | The fixtures and their `expected` results. Add new cases here.               |
| `compiler-ids.ts`    | The id of every compiler. One vitest project and one CI job per id.          |
| `compilers.ts`       | How to run each compiler: its package, bin, and API.                         |
| `harness.ts`         | `describeConformance`: runs every case against one compiler.                 |
| `normalize.ts`       | Turns any config output into the `expected` format (fixture-relative paths). |
| `api-show-config.ts` | Prints a resolved config through a compiler's JavaScript API.                |
| `ours.test.ts`       | Check 1. Runs in `pnpm test`.                                                |
| `compilers.test.ts`  | Check 2, for the compiler of the vitest project that runs it.                |

## Running

Each compiler is its own vitest project, `conformance:<id>`, and its own job in the `conformance` CI matrix.

```fish
pnpm test:conformance                              # every compiler
pnpm vitest --run --project conformance:tsrs       # one compiler
pnpm vitest --run --project "conformance:typescript-*"
```

| Id               | Compiler             | Role                               |
| ---------------- | -------------------- | ---------------------------------- |
| `typescript-5.9` | TypeScript 5.9       | reference                          |
| `typescript-6.0` | TypeScript 6.0       | reference                          |
| `typescript-7.0` | TypeScript 7.0       | reference                          |
| `typescript-7.1` | TypeScript 7.1 beta  | pre-release, early warning         |
| `tsc-ts`         | tsc-ts (vercel-labs) | port                               |
| `tsc-rs`         | tsc-rs (pingdotgg)   | port                               |
| `tsrs`           | tsrs (oxc-project)   | port, API only (no `--showConfig`) |

Only the reference jobs should be required status checks.

## How a compiler is checked

| Check          | Used for      | Compares                                                                      |
| -------------- | ------------- | ----------------------------------------------------------------------------- |
| `--showConfig` | success cases | Every key in `expected`, except `paths`, which `--showConfig` prints raw.     |
| API            | success cases | Every key in `expected`, including `paths`. Needs a TypeScript 7 style API.   |
| `--noEmit`     | error cases   | The compiler must fail. Error codes differ between versions, so not compared. |

Compilers print extra keys that they compute, such as `module` or default `exclude` entries. Only the keys in `expected` are compared.

tsrs is allowed through `trustPolicyExclude` in `pnpm-workspace.yaml`, pinned to one version. pnpm flags it as a "possible package takeover", because the npm name had another owner in 2024. Before you update tsrs, check that every `@tsrs/*` platform package of the new version has a provenance attestation from `oxc-project/tsrs`. Then move the exclusions to the new version.

For `7.1.0-beta.tsrs5`, 4 of the 8 platform packages list an attestation URL that returns 404, so it is not used.

## Reading a failure

| What fails          | What it means                                             |
| ------------------- | --------------------------------------------------------- |
| Only `ours.test.ts` | tsconf-utils has a bug. The compilers confirm `expected`. |
| Only compilers      | A compiler changed. Check its release notes.              |
| Both                | The hand-written `expected` value is wrong.               |
| Only one compiler   | That compiler differs from the others. Likely its bug.    |

## Adding a compiler

1. Add its id to `compiler-ids.ts`.
2. Add how to run it to `compilers.ts` with `packageCompiler`. Set `syncApiExport` if it has a TypeScript 7 style sync API, and `supportsShowConfig: false` if it has no `--showConfig`.
3. Add the id to the `conformance` matrix in `.github/workflows/ci.yaml`. `tests/ci-matrix.test.ts` fails until you do.
