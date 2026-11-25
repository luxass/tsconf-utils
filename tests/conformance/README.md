# Conformance tests

These tests check that tsconf-utils resolves tsconfig files the same way as TypeScript.

Every case in `cases.ts` has fixture files and a hand-written `expected` result. Two independent checks compare against it:

1. **Ours:** `ours.test.ts` checks that `parseTSConfigSync` returns exactly `expected`.
2. **Compilers:** each compiler must agree with `expected` for the same fixture.

When both pass, tsconf-utils and the compiler agree, and the agreed result is written in `cases.ts` for review.

## Files

| File                      | Contains                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| `cases.ts`                | The fixtures and their `expected` results. Add new cases here.               |
| `compilers.ts`            | Every compiler, in three groups: TypeScript, TypeScript pre-releases, ports. |
| `harness.ts`              | `describeConformance`: runs every case against one compiler.                 |
| `normalize.ts`            | Turns any config output into the `expected` format (fixture-relative paths). |
| `api-show-config.ts`      | Prints a resolved config through a compiler's JavaScript API.                |
| `ours.test.ts`            | Check 1. Runs in `pnpm test`.                                                |
| `typescript.test.ts`      | Check 2 for TypeScript 5.9, 6.0, and 7.0. `pnpm test:conformance`.           |
| `typescript-next.test.ts` | Check 2 for the TypeScript 7.1 beta. `pnpm test:conformance:next`.           |
| `ports.test.ts`           | Check 2 for tsc-ts, tsc-rs, and tsrs. `pnpm test:conformance:ports`.         |

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

Add it to a group in `compilers.ts` with `packageCompiler`. Set `syncApiExport` if it has a TypeScript 7 style sync API, and `supportsShowConfig: false` if it has no `--showConfig`.
