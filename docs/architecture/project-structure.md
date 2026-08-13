# Project structure

Every production module has one named owner. The executable owner map and allowed dependencies live in `scripts/project-structure-policy.mjs`; this document explains the conventions behind it.

## Production owners

```text
src/
  cli/                         public command helpers and dispatch
  features/
    launch/                    product launch profiles and profile settings
    workspace/                 multi-agent workspace presentation, reducer state, and persistence orchestration
  foundation/
    lifecycle/                 dependency-free launch/lifecycle contracts and paths
    protocol/                  control framing and client contracts
    release/                   immutable releases, cohorts, update, rollback, cleanup
    storage/                   control-store persistence
    structured-agent-runtime/  structured/RPC handshake, event, command, and recovery semantics
    native-host-protocol/      planned native-host identity, topology, lifecycle, and recovery protocol
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
- `docs/architecture/resource-and-data-policy.md` defines bounded queues, data classes, redaction, terminal-content non-persistence, and proof acceptance rules.
- `docs/features` explains maintained user-facing feature behavior.
- OpenSpec and Git carry planning and implementation history.
- Source comments explain only non-obvious rationale, safety/security invariants, platform constraints, or public semantic contracts. Names, types, and decomposition explain normal control flow.

## Terminal capability boundary

Transparent terminal attachment owns one foreground child and no AddOne surface. It cannot retain inactive terminal state or switch among arbitrary interactive CLIs inside AddOne. Bare-`a1` multi-agent UX may use structured/RPC surfaces without terminal emulation, but arbitrary-CLI tabs require a separate composed-terminal capability with PTY, authoritative terminal state, rendering, input routing, inactive-surface lifecycle, reconnection, and cross-platform certification. That future capability must not silently intercept or replace the transparent path. Explicit launch profiles and transparent fallback must not import, initialize, launch, or connect to composed native-host infrastructure.

Composed terminals use a separate native terminal host built from pinned mature terminal implementations. The native host owns pseudoterminal bytes, retained terminal state, native keyboard/text/mouse/IME encoding, GPU rendering, frame scheduling, and presentation. AddOne's JavaScript control plane may exchange typed identity, topology revision, capability, lifecycle, status, and recovery messages only; it must not relay terminal output, per-event child input, or rendered cells.

A tab owns a revisioned split tree. Each leaf pane references one PTY-backed terminal session. Structured/RPC agents remain semantically separate and may not derive state from ANSI text, terminal timing, or screen content. Native source ownership lives outside `src/` when introduced; packaged host selection is governed by release/package owners. Existing architecture tests reject native-host hot-path bytes in JavaScript protocol code, terminal inference in structured runtime code, composed imports from explicit launch modes, and replacement lightweight terminal parsers/renderers.
