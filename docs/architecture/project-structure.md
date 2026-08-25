# Project structure

Every production module has one named owner. The executable owner map and allowed dependencies live in `scripts/project-structure-policy.mjs`; this document explains the conventions behind it. `npm run check:architecture` rejects production files without an owner, cross-owner private imports, and declared owners whose source root, public entry, or test root is missing.

## Production owners

```text
src/
  product-identity.ts              centralized externally visible product identity
  product-identity.json
  cli/                             public command parsing, capabilities, packages, and version reporting
  composition/                     process-level wiring of neutral contracts to concrete adapters
  features/
    launch/                        launch profiles, profile paths, and runtime selection
    owned-ui/                      owned screens, settings application, diagnostics, and runtime lifecycle
    workspace/                     multi-agent presentation, reducer state, routing, and persistence orchestration
  foundation/
    agent-engine-contracts/        dependency-free agent engine, session, package, and capability ports
    launch-guardian/               authenticated launch-instance coordination
    lifecycle/                     dependency-free launch, process identity, and path contracts
    native-host-protocol/          bounded terminal-host identity, topology, lifecycle, and proof protocol
    owned-ui-contracts/            dependency-free owned-session and extension UI contracts
    owned-ui-settings/             owned settings declarations, resolution, migration, and persistence
    pi-component-adapter/          pinned Pi component and theme adaptation
    pi-engine-adapter/             pinned Pi engine, settings, resource, package, and workflow integration
    pi-owned-ui-integration/       Pi-backed owned session shell and route host
    pi-tui-runtime-adapter/        neutral presentation runtime over pinned Pi TUI
    presentation-contracts/        dependency-free component, terminal, and runtime ports
    process-containment/           verified native containment and process inspection
    protocol/                      authenticated control framing and client contracts
    release/                       immutable releases, update, rollback, cohorts, and cleanup
    storage/                       control-store persistence
    structured-agent-runtime/      structured handshake, event, command, backpressure, and recovery semantics
    supervision/                   endpoint, launch-instance, and release-cohort ownership
    ui-apps/                       application registry and host lifecycle
    ui-components/                 vendor-neutral terminal UI primitives
    workspace-contracts/           dependency-free workspace, topology, host, and recovery contracts
```

Each directory owner exposes `index.ts`. Imports within one owner may use private files. Imports crossing owners must use the provider's public entry and follow the dependency DAG declared by `PROJECT_OWNERS`. `product-identity` is the sole current exception to the directory-entry convention because its public entry is `src/product-identity.ts`.

`src/cli` contains command policy but delegates runtime work. `src/composition` is the concrete dependency-injection boundary: it may know both neutral contracts and Pi implementations, while product features receive vendor-neutral ports. Foundation modules never import product features. Pi package knowledge remains inside the Pi adapter owners.

Shared code moves to foundation only when it is product-agnostic, has a precise contract, and has more than one real consumer. Do not create `core`, `common`, `utils`, or `misc` dumping grounds.

## Feature ownership

A feature owns:

- its production behavior under `src/features/<name>`;
- its public contract in `index.ts`;
- its settings schema, defaults, and path policy when applicable;
- its tests under `test/features/<name>`;
- user-facing documentation under `docs/features/<name>.md` when README coverage is insufficient.

Settings files are not mandatory for every feature. User settings, credentials, sessions, caches, downloaded packages, logs, and generated files never live in source folders.

## Test ownership

Tests mirror their production owner:

```text
test/
  cli/
  composition/
  features/<name>/
  foundation/<name>/
  product-identity/
  repository-governance/
```

Use `.test.ts` for deterministic owner-level contracts. Use `.integration.test.ts` when the contract crosses real process, filesystem, registry, package, or release boundaries. A test of a foundation implementation belongs to that foundation owner's test root; a feature test may exercise the same public entry only when it proves feature-level composition.

Prefer the smallest independent boundary that proves the observable result. Do not duplicate a stronger test or preserve historical bug-story names after the cause has a current invariant. Physical desktop automation is not an ordinary integration test; it requires separately authorized certification and isolated disposable infrastructure.

## Repository authority

The repository has one root `package.json`, `package-lock.json`, TypeScript configuration, Vitest configuration, and dependency installation. Nested manifests, lockfiles, `node_modules`, vendored package caches, logs, sessions, browser profiles, generated output, and runtime state are forbidden under production and feature trees.

Build output belongs in ignored `dist/`; release and test evidence belongs in ignored `.artifacts/`; temporary agent work belongs in ignored `.worktrees/` and `.builds/`. Package contents are selected by the root manifest. The Rust process guardian and console terminal-host proof live under `native/`; Cargo output is ignored. Third-party terminal parser sources are isolated under `native/terminal-host/vendor/` and are not owned application modules.

## Documentation and comments

- README explains installation, commands, and current limitations.
- `docs/architecture` explains cross-cutting ownership and irreversible constraints.
- `docs/features` explains maintained user-facing behavior.
- Operational and manual procedures live in focused runbooks under `docs`.
- OpenSpec and Git carry planning and implementation history.
- Source comments explain only non-obvious rationale, safety/security invariants, platform constraints, or public semantic contracts. Names, types, and decomposition explain normal control flow.

## Terminal capability boundary

All interactive profiles use the owned rendering pipeline. Bare `a1` exposes A1-owned surfaces; `a1 pi` and `a1 sandbox` withhold those surfaces while using their respective Pi profile roots. The retired transparent attachment owner is not part of the production tree or dependency map.

The current JavaScript control plane does not provide arbitrary-CLI tabs. Such tabs require the separately bounded console terminal host to own PTYs, authoritative terminal state, rendering, input routing, inactive-surface lifecycle, and reconnection. JavaScript may exchange typed identity, topology revision, capability, lifecycle, status, and recovery messages only; it must not relay terminal output, per-event child input, or rendered cells.

Structured agents remain semantically separate and use typed events, commands, snapshots, cancellation, and recovery evidence. They must not derive state from ANSI text, terminal timing, or screen content. Native source ownership remains outside `src/`; packaged host selection is governed by release/package owners. Architecture tests reject terminal-host hot-path bytes in JavaScript protocols, terminal inference in structured runtimes, and replacement lightweight terminal parsers or renderers.
