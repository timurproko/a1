# Project structure

Every production module has one named owner. The executable owner map and allowed dependencies live in `scripts/project-structure-policy.mjs`; this document explains the conventions behind it.

## Production owners

```text
src/
  cli/                         public command helpers and dispatch
  features/
    launch/                    product launch profiles and profile settings
  foundation/
    lifecycle/                 dependency-free launch/lifecycle contracts and paths
    protocol/                  control framing and client contracts
    release/                   immutable releases, cohorts, update, rollback, cleanup
    storage/                   control-store persistence
    supervision/               endpoint and foreground-lease ownership
    workspace-contracts/       dependency-free workspace, adapter, topology, host, and recovery contracts
    transparent-terminal/      exact command resolution and native attachment
```

Each owner exposes `index.ts`. Imports within one owner may use private files. Imports crossing owners must use the provider's `index.ts` and follow the declared dependency DAG. Foundation modules never import product features.

`src/cli` is a thin public entry layer. Product policy belongs in a named feature. Shared code moves to foundation only when it is product-agnostic, has a precise contract, and has more than one real consumer. Do not create `core`, `common`, `utils`, or `misc` dumping grounds.

## Feature ownership

A feature owns:

- its production behavior under `src/features/<name>`;
- its public contract in `index.ts`;
- its settings schema/defaults and path policy;
- its tests under `test/features/<name>`;
- user-facing feature documentation under `docs/features/<name>.md` when the behavior needs more than README coverage.

Settings files are not mandatory for every feature. Add one only when the feature owns mutable policy. User settings, credentials, sessions, caches, downloaded packages, logs, and generated files never live in source folders.

## Test ownership

Tests mirror their production owner:

```text
test/
  cli/
  features/<name>/
  foundation/<name>/
  repository-governance/
```

Use `.test.ts` for deterministic owner-level contracts. Use `.integration.test.ts` when the contract crosses real process, filesystem, registry, or release boundaries. Prefer the smallest independent boundary that proves the observable result; do not duplicate a stronger test or preserve historical bug-story names after the cause has a current invariant.

Physical desktop automation is not an ordinary integration test. It requires a separately authorized certification change and isolated disposable infrastructure.

## Repository authority

The repository has one root `package.json`, `package-lock.json`, TypeScript configuration, Vitest configuration, and dependency installation. Nested manifests, lockfiles, `node_modules`, vendored package caches, logs, sessions, browser profiles, generated output, and runtime state are forbidden under production and feature trees.

Build output belongs in ignored `dist/`; release/test evidence belongs in ignored `artifacts/`. Package contents are selected by the root manifest.

## Documentation and comments

- README explains installation, commands, and current limitations.
- `docs/architecture` explains cross-cutting ownership and irreversible constraints.
- `docs/features` explains maintained user-facing feature behavior.
- OpenSpec and Git carry planning and implementation history.
- Source comments explain only non-obvious rationale, safety/security invariants, platform constraints, or public semantic contracts. Names, types, and decomposition explain normal control flow.

## Terminal capability boundary

Transparent terminal attachment owns one foreground child and no AddOne surface. It cannot retain inactive terminal state or switch among arbitrary interactive CLIs inside AddOne. Bare-`a1` multi-agent UX may use structured/RPC surfaces without terminal emulation, but arbitrary-CLI tabs require a separate composed-terminal capability with PTY, authoritative terminal state, rendering, input routing, inactive-surface lifecycle, reconnection, and cross-platform certification. That future capability must not silently intercept or replace the transparent path.
