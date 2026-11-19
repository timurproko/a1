# Project structure

Every production module has one named owner. The executable owner map and allowed dependencies live in `scripts/governance/project-structure-policy.mjs`; this document explains the conventions behind it. `npm run check:architecture` rejects production files without an owner, cross-owner private imports, and declared owners whose source root, public entry, or test root is missing.

## Production owners

```text
src/
  product-identity.ts              centralized externally visible product identity
  product-identity.json
  cli/                             public command parsing, capabilities, packages, and version reporting
  composition/                     process-level wiring of neutral contracts to concrete adapters
  app/
    settings/                       shared settings declarations, validation, resolution and persistence
    session-shell/                 the owned session shell: composes features, UI components, and the Pi adapters into the interactive session
  features/
    launch/                        launch profiles, profile paths, and runtime selection
    owned-ui/                      owned screens, settings application, diagnostics, and runtime lifecycle
    integration-api/               versioned external settings and exact-session protocol
    prompt-history/                profile-isolated prompt retention and bounded SQLite worker lifecycle
    prompt-suggestions/            opt-in bounded metadata capture and local diagnostic snapshots
    session-naming/                prompt-driven naming policy, bounded generation, and context-aware regeneration
  contracts/
    agent-engine/                  dependency-free agent settings, package, and worktree-control contracts
    owned-ui/                      dependency-free owned-session and extension UI contracts
    presentation/                  dependency-free component, terminal, and runtime ports
  integrations/
    pi/
      components/                  pinned Pi component and theme adaptation
      engine/                      pinned Pi engine, settings, resource, package, and workflow integration
      session-presenters/          pinned Pi selectors and transcript renderers built from engine objects
      tui-runtime/                 neutral presentation runtime over pinned Pi TUI
  foundation/
    launch-context/                neutral private launch environment contract
    lifecycle/                     paths, session selection, and session worktree claims
    release/                       immutable releases, bootstrap, update, rollback, and age-based cleanup
    session-writer-lock/           one writer per Pi session file through proper-lockfile
    startup/                       startup trace phases and startup budgets
    terminal-cleanup/              bounded terminal reset, exit notice, and fatal-exit diagnostics
  ui/
    apps/                          application registry and host lifecycle
    components/                    vendor-neutral terminal UI primitives
    settings/                      settings-screen section and presentation projection
```

Each directory owner exposes `index.ts`, which lists its named exports; `export *` is rejected there so a public contract is readable in one place. Imports within one owner may use private files. Imports crossing owners must use the provider's public entry and follow the dependency DAG declared by `PROJECT_OWNERS`. Two exceptions exist: `src/composition` is the dependency-injection root and may reach past any public entry, and a module on the eager startup path may import a leaf of a provider whose public entry is a prohibited startup entry (`PROHIBITED_STARTUP_ENTRIES` in `startup-graph-policy.mjs`), because loading that barrel would pull the provider's whole graph into startup. `product-identity` is the sole exception to the directory-entry convention because its public entry is `src/product-identity.ts`.

Three layer boundaries hold regardless of the DAG: `src/contracts/*` import nothing outside their own contract; `src/ui/components` imports only contracts; only `src/integrations/pi/*` and the shipped `bin/` entries import the pinned Pi packages. The session shell under `src/app` is the application layer: it may import the contracts, the UI foundations, and the feature owners, never `src/integrations/pi`, and only composition imports it. Composition hands it one `OwnedUiSessionPresenters` value from `src/integrations/pi/session-presenters`: the theme and terminal runtime (`ShellPresentationPorts`), the component factories (`OwnedUiShellComponents`), and the engine-backed selectors. That owner is the only one besides composition that may import both the engine and the component adapters.

Every exported value under `src/` needs a production consumer: a file under `src/`, `bin/`, or `scripts/` that imports its module and names it. Owner public entries, declared entry modules, the product identity entry, copied upstream sources, and types are exempt. A value only a test reads stays private, and the test goes through the owner's public entry or an observable result.

`src/cli` contains command policy but delegates runtime work. `src/composition` is the concrete dependency-injection boundary: it may know both neutral contracts and Pi implementations, while product features receive vendor-neutral ports. Foundation modules never import product features. Pi package knowledge remains inside the Pi adapter owners. CLI, launch, composition and the Pi engine also consume the existing dependency-free `launch-context` owner for bounded structured invocation payloads shared with release/bootstrap transport; no Pi SDK or UI implementation moves into that contract.

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
  contracts/<name>/
  app/session-shell/
  foundation/<name>/
  integrations/pi/<name>/
  product-identity/
  repository-governance/
  ui/<name>/
```

Use `.test.ts` for deterministic owner-level contracts. Use `.integration.test.ts` when the contract crosses real process, filesystem, registry, package, or release boundaries. A test of a foundation implementation belongs to that foundation owner's test root; a feature test may exercise the same public entry only when it proves feature-level composition.

Prefer the smallest independent boundary that proves the observable result. Do not duplicate a stronger test or preserve historical bug-story names after the cause has a current invariant. Physical desktop automation is not an ordinary integration test; it requires separately authorized certification and isolated disposable infrastructure.

## Repository authority

The repository has one root `package.json`, `package-lock.json`, TypeScript configuration, Vitest configuration, and dependency installation. Nested manifests, lockfiles, `node_modules`, vendored package caches, logs, sessions, browser profiles, generated output, and runtime state are forbidden under production and feature trees.

Build output mirrors the production namespaces directly under ignored `dist/`, without an intermediate `src/` directory; generated release/test evidence and agent-selected scratch files belong in ignored `.artifacts/`; task worktrees and local package outputs belong in ignored `.worktrees/` and `.builds/`. Repository tooling is grouped under `scripts/governance`, `scripts/release`, `scripts/pi`, and `scripts/development`; the few root scripts are standalone maintenance or build commands. Package contents are selected by the root manifest. The repository contains no native code; the published package is pure JavaScript.

## Development worktrees

Task checkouts live inside the primary repository's `.worktrees/<task-id>/`, not beside the repository. Creating, handing off and cleaning up a task checkout follows the shared `change-delivery` skill. The product command contract is documented in [Worktree commands](../features/worktrees.md).

## Documentation and comments

- README explains installation, commands, and current limitations.
- `docs/architecture` explains cross-cutting ownership and irreversible constraints.
- `docs/features` explains maintained user-facing behavior.
- Operational and manual procedures live in focused runbooks under `docs`.
- OpenSpec and Git carry planning and implementation history.
- Source documentation follows the focused [code-documentation policy](code-documentation.md): owner-public class contracts are consistent, retained implementation comments state their intent, and names, types, and decomposition explain ordinary control flow.

## Terminal capability boundary

Both interactive profiles use the owned rendering pipeline. Bare `a1` exposes A1-owned surfaces; `a1 pi` withholds those surfaces while using Pi's ordinary profile root. The retired transparent attachment owner is not part of the production tree or dependency map.

Each launch runs one agent in one directly attached process; there are no tabs, resident sessions, or arbitrary-CLI terminal surfaces. Production code under `src/` may not import `node-pty` or a terminal emulator or spawn a pseudoterminal, and the architecture gate rejects replacement lightweight terminal parsers or renderers. A multi-agent or composed-terminal feature needs its own approved change.
