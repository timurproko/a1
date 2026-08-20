## Why

The package and command are now `a1`, but live code, diagnostics, environment variables, state identifiers, filenames, native artifacts, documentation, and type names still embed `AddOne`/`addone`. This coupling produces inconsistent output such as `AddOne could not resolve npm next` and makes every future identity adjustment a repository-wide refactor.

## What Changes

- Introduce one dependency-light, immutable product-identity authority for display name `A1`, command `a1`, npm package `@timurproko/a1`, environment keys, filesystem slug, and protocol/schema namespace.
- Replace direct identity literals in live production code, scripts, workflows, tests, and current documentation with imports or generated values from that authority where executable code can consume it.
- Rename live `AddOne*`, `addone-*`, and `ADDONE_*` symbols, files, entry points, schemas, native artifacts, diagnostics, and default state directories to `A1*`, `a1-*`, and `A1_*` forms.
- **BREAKING** Do not recognize legacy `ADDONE_*` variables, old control-state paths, old release manifests, or old protocol/schema identifiers; no compatibility aliases or state migration are provided.
- Keep `.a1/agent` and `.a1/sandbox` profile roots unchanged because they already use the selected identity.
- Make `a1 version` obtain channel information from the package's dist-tags as one coherent registry result; an absent `next` tag SHALL display `Next: unavailable` without an error diagnostic, while an actual registry failure remains diagnosable.
- Preserve `AddOne`/`addone` only in archived historical records and explicit obsolete-package rejection/deprecation tests or records.
- Add a repository gate proving current authoritative surfaces do not reintroduce legacy identity literals outside those narrow exceptions.

## Capabilities

### New Capabilities

- `product-identity`: Defines A1's centralized display, command, package, environment, storage, protocol/schema, artifact, and diagnostic identity contract.

### Modified Capabilities

- `a1-shell`: Changes version-channel discovery so a missing npm `next` tag is a normal unavailable channel rather than a branded error.
- `project-structure-governance`: Adds enforceable centralized-identity and legacy-name exclusion requirements for live repository surfaces.

## Impact

This is a cross-codebase hard rename affecting CLI and runtime symbols, process environment contracts, lifecycle paths, release/supervision storage, endpoint naming, protocol and evidence schemas, bin and internal entry filenames, native crate/executable names, scripts, GitHub workflows, tests, current docs, and non-archived OpenSpec changes. Archived evidence remains historical. The change depends on reconciling the completed `@timurproko/a1@0.1.0` publication outcome in `republish-as-a1`; it does not change the package name, command, or existing `.a1` Pi profile locations.
