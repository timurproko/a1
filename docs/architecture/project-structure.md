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
    session-shell/                 the owned session shell: composes features, UI components, and the Pi adapters into the interactive session
  features/
    launch/                        launch profiles, profile paths, and runtime selection
    owned-ui/                      owned screens, settings application, diagnostics, and runtime lifecycle
    prompt-history/                profile-isolated prompt retention and bounded SQLite worker lifecycle
    prompt-suggestions/            opt-in bounded metadata capture and local diagnostic snapshots
    session-naming/                prompt-driven naming policy, bounded generation, and context-aware regeneration
  contracts/
    agent-engine/                  dependency-free agent settings and package contracts
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
    settings/                      owned settings declarations, resolution, and persistence
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

Task checkouts live inside the primary repository's `.worktrees/<task-id>/`, not beside the repository. Follow the shared Worktrees guidance in `AGENTS.md`. The product command contract is documented in [Worktree commands](../features/worktrees.md).

### Common Git workflow

Keep primary on `develop` and run the delivery skill's bounded cleanup sweep. In A1, enter or attach once; success is authoritative and informational inventory is not a second approval gate. Outside A1, use ordinary Git without installing A1 or inventing runtime identities.

For a new delivery, create a unique absent task path and a new topic branch from freshly fetched `origin/develop`, unless the maintainer selected another base. For example, with primary at `D:/Git/a1` and unused task/branch names:

```bash
cd /d/Git/a1 && git fetch origin develop && git worktree add -b feature/example-task .worktrees/example-task origin/develop && git -C .worktrees/example-task rev-parse --show-toplevel --git-common-dir && git -C .worktrees/example-task status --short --branch
```

For external agents, successful creation establishes provenance for a fresh checkout; verify the canonical root, common repository, branch, and local work before using it. Never force a collision or fall back to task edits in primary. A1 performs its own exact-context and editing-claim checks internally.

### Resume and ownership

Continue the same task's branch, change, and PR. A1 owns cooperative editing claims and preserves existing edits when resuming; external agents establish continuing ownership or an explicit handoff themselves. Cleanup registration remains a separate repository concern: follow [cleanup ownership](../local-worktree-cleanup.md#resume-or-recover-ownership) when resuming a released cleanup candidate. Neither attachment nor cleanup registration authorizes merge or deletion.

Do not replace a delivery's history or PR to evade a real ownership conflict. Handoffs name the absolute worktree, branch, change, PR, and editing handoff. Runtime coordination is cooperative, not exclusion against arbitrary external editors.

### Environment-specific adapters

A1 owns creation/attachment, bounded retries, and ordinary recovery behind its worktree commands. Successful attachment returns the canonical path and branch; no follow-up inventory check is required. The old session link/unlink commands remain compatible aliases. Rare installation/legacy coordination failures have an operator [recovery reference](../worktree-link-recovery.md), not an agent preflight procedure.

Claude Code uses its established `EnterWorktree` tool by task name. The tracked `.claude/settings.json` wires `scripts/governance/claude-worktree-create.mjs` to create `.worktrees/<task-id>` detached at fresh `origin/develop`, or return an already registered path. The agent must still establish ownership before reusing that path and create the topic branch in a new detached worktree before editing. Passing an absolute `path` to `EnterWorktree` is reserved for a worktree created by hand, from primary before any shell command in that session. The matching `WorktreeRemove` hook declines removal: leave with `ExitWorktree` `keep` and use only the guarded cleanup tool for removal. Other agents do not need these tools or hooks.

A1 attachment updates footer repository/PR discovery and subsequent built-in tool working directories without changing process-global cwd. Detach/disposal releases the runtime's claim and preserves Git data. After a verified merge, `a1 worktree complete` detaches first and then runs the repository's configured cleanup from the startup checkout; an attachment whose checkout is gone is released automatically. An existing PR is not required. Explicit absolute paths retain their meaning; custom extensions and independent terminals keep their own cwd. Attachment never creates a Git lock, changes cleanup registration, or grants acceptance, finalization, merge, or deletion authority.

An agent that directly chooses a transient file path for a PR/comment body, command payload, captured output, temporary patch/diff, or ad hoc log must place it beneath the verified task worktree's exact `.artifacts/` root, never the primary checkout, another worktree, OS temp, home/desktop, or a sibling path. Such scratch remains ignored, unstaged, uncommitted, disposable, non-authoritative, and secret-free. This repository path rule does not relocate storage internally selected by tools, product runtime code, or hermetic tests.

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
