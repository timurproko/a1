## Context

See `proposal.md` for motivation and `specs/*/spec.md` for behavior. The accepted package now launches one Pi process through inherited native terminal handles, and `0.1.5-dev.8` is published under npm `next` with exact-artifact evidence. The current repository is small compared with the removed renderer/PTY design, but still mixes foundation modules at `src/` root, contains obsolete lifecycle/profile contracts and redesign wording, carries deferred physical-host assets/workflow assumptions, and keeps a large foundation change open with unrelated future milestones.

`C:\Users\tprokopiev\Desktop\v2` demonstrates useful feature ownership (`tabs`, `sidebar`, `git`, `agent`, settings per owner and public API barrels), but also demonstrates what this repository must avoid: nested manifests/lockfiles and `node_modules`, generated logs/browser/session data, private Pi host patches, reload-global state, duplicated settings, probes, implementation-coupled tests, and broad `core` infrastructure. The new structure adopts cohesive ownership and explicit public boundaries only.

Pi provides the supported `PI_CODING_AGENT_DIR` configuration-root override. Leaving it unset preserves `~/.pi/agent`; setting it to an AddOne profile root isolates settings, authentication, sessions, packages, extensions, skills, prompts, themes, and trust data using Pi's own path semantics. Transparent launch already forwards ordinary non-`ADDONE_` environment variables unchanged and must remain outside the terminal byte path.

## Goals / Non-Goals

**Goals:**

- Establish a measured clean baseline where every retained artifact has one current owner.
- Make project structure and documentation rules executable rather than aspirational.
- Introduce deterministic normal, vanilla Pi, and sandbox launch profiles without changing terminal attachment.
- Close the terminal-redesign decision and separate physical certification, composed terminal work, and later product features into future changes.
- Preserve release/update/protocol/storage behavior while modules move under clearer owners.

**Non-Goals:**

- Implementing AddOne-managed tabs, panes, overlays, terminal reconnection, or multiple resident arbitrary CLIs.
- Selecting or integrating a composed terminal core.
- Running or completing deferred physical desktop automation.
- Importing implementation from `Desktop\v2` or retaining compatibility with its private Pi host patches.
- Treating `sandbox` as a process, filesystem, credential, network, VM, or container security boundary.
- Adding an `a1 agent` alias or defining wrapper-specific Pi flags as AddOne product commands.
- Automatically migrating, copying, or sharing credentials among Pi profiles.

## Decisions

### 1. Finish the prior foundation change before restructuring

First update the prior change with facts already established:

- task 1.158 passed because registry `next` resolves to `0.1.5-dev.8`, exact integrity/SHA match, and `latest` remains `0.1.4`;
- task 1.159 selects transparent direct attachment as the development baseline with no resident surface/reconnect claim;
- tasks 1.160–1.161 are `not applicable` because no mandatory PTY ownership constraint was found;
- composed tasks 1.162–1.175 and physical certification become separate future changes rather than pending work inside foundation;
- later product milestones are not claimed complete.

Sync the completed foundation deltas that describe current behavior, then archive or otherwise close the oversized change according to OpenSpec validation. If unfinished later milestones prevent direct archival, revise the change so those tasks are explicitly moved to named future changes rather than marking unimplemented behavior complete.

Alternative: leave the foundation change open and add more tasks. Rejected because it currently combines completed history, deferred certification, conditional architecture research, and years of product scope, making completion status meaningless.

### 2. Audit by current ownership, not deletion quotas

Create a machine-readable inventory of production sources, tests, scripts/workflows, docs, dependencies, generated artifacts, and stashed/deferred files. Each item receives one disposition:

- **retain** under current owner;
- **move/consolidate** into a clearer owner;
- **delete** because no current contract exists;
- **future change** with no active implementation retained.

Deletion is based on reachability and contract ownership, not line-count targets. Tests are deduplicated only when they prove the same cause/outcome at the same boundary. Architecture guards against terminal interception remain even though the old files are gone because they protect the accepted design.

Likely removals or rewrites include legacy `TerminalProfileBase`/agent commands that the foreground path does not use, stale `unavailable during redesign` branches, historical regression naming when a current invariant test already exists, deferred recorder/UI-automation assets and the physical-worker workflow from ordinary baseline scope, and stale milestone documentation. The audit must prove each choice before editing.

Alternative: delete every file associated with old work. Rejected because lifecycle/update/protocol guards and independent schemas can remain valid even when their original motivating bug is historical.

### 3. Use a feature/foundation layout with one dependency authority

Target shape (exact leaf names may follow the audit, but layer rules are fixed):

```text
src/
  cli/
    index.ts
    dispatch.ts
  features/
    launch/
      index.ts
      profiles.ts
      profile-paths.ts
      initialize-profile.ts
  foundation/
    lifecycle/
    protocol/
    release/
    storage/
    supervision/
    transparent-terminal/

test/
  features/launch/
  foundation/<matching-owner>/

docs/
  architecture/
  features/launch-profiles.md
```

Rules:

- one root `package.json`, `package-lock.json`, TypeScript config, and dependency tree;
- `features/<name>/index.ts` is the only normal cross-feature import surface;
- private feature modules may depend on named foundation contracts;
- foundation never imports features;
- no `core`, `common`, `utils`, or `misc` folder without a precise domain owner;
- a shared helper is promoted only after two real consumers and remains named for its contract;
- tests mirror the owning area rather than collecting everything in a broad `unit` directory;
- feature documentation/settings ownership is colocated conceptually, but mutable user settings are never tracked in source.

A single package is preferred over the v2 nested-package model because AddOne ships one executable, already has one dependency policy, and does not need independently versioned feature artifacts yet.

Alternative: preserve flat `src/` and enforce naming only. Rejected because future features would again interleave product and foundation files at one level.

### 4. Keep comments local and rationale external

Adopt a small source-comment policy:

- comments explain non-obvious **why**, safety proof, platform constraint, or public semantic contract;
- types, function names, and decomposition explain **what/how**;
- architecture docs explain cross-cutting ownership and terminal invariants;
- short decision records explain choices that future contributors may otherwise reopen;
- Git/OpenSpec explain history;
- issue/change tasks hold future TODO work.

Architecture checks can detect stale marker vocabulary and commented-out code, but cannot judge prose quality completely. Review uses a checklist rather than a numeric comment target. Existing valuable ownership/signal/process-cleanup rationale is rewritten concisely, not removed mechanically.

Alternative: enforce a maximum comment count. Rejected because it rewards deleting necessary safety rationale and adding opaque code.

### 5. Resolve launch intent before bootstrap and use one profile descriptor

CLI dispatch parses only AddOne-owned first-position subcommands:

```text
(no subcommand) -> profile addone
pi              -> profile pi
sandbox         -> profile sandbox
version         -> maintenance
update          -> maintenance
update:next     -> maintenance
other           -> usage error
```

Both binaries use the same dispatcher. The selected interactive profile becomes a typed descriptor passed through bootstrap to the immutable release foreground entry. It contains profile identity and child environment changes, not terminal behavior. The release/supervisor handshake stays profile-agnostic except where launch identity is required for diagnostics.

No shell command string is constructed. The existing generic executable resolution continues to resolve the exact `pi` executable/npm shim safely. Interactive launch remains one foreground lease.

Alternative: encode profile selection only through ad hoc environment variables in `bin/addone.js`. Rejected because mutable bootstrap, immutable release, tests, and future profile diagnostics need one validated intent contract.

### 6. Use Pi's native configuration-root contract

Profile mapping:

| AddOne launch | Pi configuration root behavior |
|---|---|
| bare `a1` / `addone` | set `PI_CODING_AGENT_DIR=<home>/.a1/agent` |
| `a1 pi` / `addone pi` | remove/leave `PI_CODING_AGENT_DIR` unset |
| `a1 sandbox` / `addone sandbox` | set `PI_CODING_AGENT_DIR=<home>/.a1/sandbox` |

For AddOne-owned profiles, initialize only the root and conventional empty resource directories needed for discoverability. Do not generate settings/auth files or copy defaults. Pi creates/manages its own files thereafter. Profile initialization uses ownership-safe directory creation, rejects non-directory/symlink surprises where they could redirect mutation, and never traverses into another profile.

Vanilla mode deliberately ignores an inherited `PI_CODING_AGENT_DIR` from the AddOne wrapper so that `a1 pi` is a reliable baseline for the ordinary user profile. Provider credential environment variables continue to flow because Pi natively supports them; profile files do not flow.

Alternative: pass explicit `--no-*` and `-e` flags for every resource. Rejected because it duplicates Pi resource discovery and would drift from the selected profile's settings.

Alternative: symlink `.a1` authentication to `.pi`. Rejected because it violates isolation and creates unsafe cross-profile mutation.

### 7. Treat project-local resources separately from user-profile isolation

`PI_CODING_AGENT_DIR` isolates user-level resources but Pi may still discover trusted project-local `.pi` resources from the current working directory. The normal AddOne profile should preserve Pi's documented project-trust behavior. Sandbox should default to ignoring project-local executable settings/resources so that experiments come from `.a1/sandbox`, while context files may still load normally. Use Pi's supported one-run trust controls rather than patching discovery internals. Document this distinction and test it hermetically.

Alternative: sandbox automatically trusts project files. Rejected because it weakens the expected isolation between the selected sandbox profile and a repository's executable resources.

### 8. Keep transparent mode frozen and create future changes only from feature need

Transparent mode remains:

```text
AddOne lifecycle/lease -> one foreground child -> inherited physical terminal
```

It can launch arbitrary commands but cannot retain multiple internal terminal surfaces. A future AddOne multi-agent UI should prefer structured/RPC agents where possible. If product scope requires multiple arbitrary interactive CLI tabs, create a dedicated composed-terminal proposal covering PTY ownership, authoritative state, input routing, inactive surfaces, and cross-platform certification. Do not start candidate evaluation during this consolidation.

This prevents cleanup/profile work from reopening the architecture that the user has accepted while keeping the true multi-agent requirement visible.

## Risks / Trade-offs

- **[Risk] Cleanup removes a subtle release/update regression guard.** → Require an ownership/disposition record, focused tests before/after each deletion, and the complete clean baseline gate after each coherent phase.
- **[Risk] Large file moves create noisy diffs and hide behavior changes.** → Separate mechanical moves from semantic cleanup commits; use Git rename detection and run owner-focused tests after each move.
- **[Risk] `.a1` profile users expect existing Pi login to carry over.** → Document independent authentication and rely on Pi's normal `/login`; never silently copy credentials.
- **[Risk] Sandbox is interpreted as secure execution.** → Use `isolated profile` in diagnostics/docs and explicitly disclaim OS isolation in help and feature documentation.
- **[Risk] Project-local `.pi` resources leak into sandbox expectations.** → Invoke Pi with its supported no-approve/trust behavior for sandbox and add an integration fixture proving project extensions are ignored while sandbox extensions load.
- **[Risk] Reorganizing foundation modules destabilizes immutable release/update paths.** → Keep public behavior and package file inventory stable through moves, rerun update-transition and exact-package gates, and avoid changing storage schema unless the audit proves dead fields can be migrated safely.
- **[Risk] Removing physical-host files loses future work.** → Preserve decisions/evidence in Git and create a future physical-certification proposal when infrastructure exists; do not keep half-implemented workstation automation active.
- **[Risk] Rules become ceremony.** → Enforce only objective boundaries and current ownership; do not require per-feature manifests, settings files, or docs until a feature actually owns them.

## Migration Plan

1. Record terminal baseline/publication decisions in the prior change and separate all unfinished physical/composed/product scope.
2. Create the baseline inventory and run the current complete gate as before-state evidence.
3. Delete/consolidate obsolete artifacts and rewrite current architecture documentation without moving code yet.
4. Move retained modules/tests mechanically into feature/foundation ownership and update import/architecture checks.
5. Add profile descriptors, `.a1` path resolution/initialization, CLI grammar, and Pi environment selection.
6. Pass focused CLI/profile tests, hermetic profile-resource integration tests, architecture/type/dependency/unit/integration/update/package/release gates, and strict OpenSpec validation.
7. Provide manual commands for the user to launch bare AddOne, vanilla Pi, and sandbox without agent-driven desktop interaction; correct findings and repeat applicable gates.
8. Publish a new immutable `next` preview only after explicit acceptance.

Rollback is commit-granular. Before publication, revert the affected phase. After preview publication, retain stable `latest`, restore the prior `next` tag if necessary, and issue a new immutable preview rather than replacing published bytes.
