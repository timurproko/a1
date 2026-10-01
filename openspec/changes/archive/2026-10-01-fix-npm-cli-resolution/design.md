## Context

Protected package replacement cannot invoke the `npm` shell launcher after npm begins replacing a global package, because the launcher may disappear with that package tree and a detached recovery owner needs one stable executable contract. A1 therefore records npm's JavaScript entry in the durable recovery capsule and launches it with the capsule's bound Node executable and fixed arguments.

The resolver currently checks `npm_execpath` and `<active-global-root>/npm/bin/npm-cli.js`. The first exists when A1 runs as an npm lifecycle child, not when a user invokes `a1 update` directly. The second works when npm itself is installed inside npm's configured global root, but not for the standard Windows split layout: `npm root --global` can report `%APPDATA%/npm/node_modules` while the `npm.cmd` selected from `PATH` and its JavaScript entry are under `C:/Program Files/nodejs`. This produced `could not resolve npm's JavaScript entry for protected package replacement` against a confirmed package under the roaming prefix. The transaction remained `rolled-back` and the prior 0.2.2 installation remained callable.

## Goals / Non-Goals

**Goals:**
- Resolve the npm JavaScript entry used for protected replacement when direct invocation omits `npm_execpath` and npm is bundled with Node outside the configured global prefix.
- Bind only a canonical regular JavaScript file into recovery authority.
- Preserve exact destination-prefix pinning, capsule validation, detached recovery, launcher postconditions, and rollback.
- Fail before package or launcher mutation when no trusted candidate exists.

**Non-Goals:**
- Discover or support another package manager.
- Change npm registry, authentication, proxy, prefix, or other configuration.
- Infer package ownership from the npm executable location.
- Move A1 between prefixes, repair arbitrary Node installations, or weaken checkout/link refusal.
- Change the recovery schema or accept arbitrary command strings, shell wrappers, or npm temporary paths as recovery authority.

## Decisions

### 1. Keep npm acquisition and package destination independent

The selected A1 installation remains the sole authority for `globalRoot`, package root, launcher paths, and the explicit `--prefix` replacement argument. npm-entry discovery remains acquisition-only. A bundled npm entry outside the selected prefix does not authorize any additional destination and cannot redirect replacement because the recovery capsule still validates the fixed target and prefix arguments.

Alternative: use the selected user prefix to locate npm. Rejected because that is the current defect: a valid global package prefix need not contain the npm implementation that manages it.

### 2. Add a bounded Node-bundled npm fallback

Retain the current candidates in precedence order: a supplied `npm_execpath`, then `npm/bin/npm-cli.js` under the independently resolved active npm global root. When those are absent, consider the standard bundled entry `node_modules/npm/bin/npm-cli.js` adjacent to the current Node installation. On Windows, also derive the same bounded candidate from the first `npm` command selected by the supplied `PATH`, so command acquisition and recovery use the same installation when PATH and the current Node executable are not colocated.

PATH resolution is lexical and platform-aware: it examines fixed `npm` executable/shim names only and derives one fixed sibling path; it never executes, parses, or records a shell command as recovery authority. The current Node candidate covers the ordinary official layout even when direct-launch environment normalization prevents command discovery. Unix keeps its established active-global-root and canonical `npm_execpath` behavior; no unrelated layout is broadened.

Alternative: require users to set `npm_execpath`. Rejected because it is an npm lifecycle implementation detail absent from normal direct CLI invocation.

Alternative: invoke `npm.cmd` from the detached guardian. Rejected because recovery authority is intentionally a Node executable plus a validated JavaScript file, not a mutable shell wrapper.

Alternative: search all parent directories or every PATH entry for any `npm-cli.js`. Rejected because broad discovery would make the recovery executable ambiguous and increase authority without need.

### 3. Preserve canonical regular-file validation and failure timing

Every candidate is canonicalized, then accepted only when the canonical target is a regular file. The capsule continues to record that canonical path, and the existing capsule reader revalidates it before worker execution. If all candidates are absent or invalid, capsule preparation fails before the recovery owner or npm replacement starts; the outer transaction follows its existing rollback path.

A lexical symlink may resolve to the real npm entry, matching established Unix npm packaging, but a directory or missing target is rejected. No retry, timeout, or fallback to an unvalidated npm command is added.

## Risks / Trade-offs

- **[PATH and current Node identify different installations]** → Prefer explicit npm execution context and active-root candidates, then derive only the fixed npm sibling from the resolved command/current Node; destination remains separately pinned.
- **[A crafted PATH contains an npm-looking wrapper]** → Never trust wrapper contents or execute it as recovery authority; require the fixed sibling JavaScript entry to exist as a canonical regular file.
- **[Node is distributed without bundled npm]** → Preserve fail-closed behavior when no established candidate exists.
- **[Windows environment key casing varies]** → Read PATH and PATHEXT case-insensitively while leaving the caller's environment unchanged.
- **[Recovery safety regresses]** → Keep capsule schema, Node binding, exact npm arguments, launcher proof, guardian execution, and rollback code unchanged; exercise capsule creation and rejection in focused tests.

## Implementation Evidence

- Deterministic recovery coverage creates a quoted Windows PATH entry under `Program Files`, omits `npm_execpath`, separates the roaming-style active global root from Node's bundled npm tree, and proves the capsule records the canonical bundled `npm-cli.js` while retaining the selected package prefix. A complementary fixture supplies malformed PATHEXT and a directory at the bundled-entry path and verifies fail-closed rejection.
- Focused self-update, transaction, transition, process-settlement, live-cohort, and recovery validation passed with 85 tests and one platform-gated skip. Cancellation, npm failure, concurrent ownership, stale-owner replacement, updater loss, complete launcher restoration, target retention, and rollback behavior remained green.
- The exact packed Windows candidate passed all six package-install tests. Its cancellation-safe replacement fixture removed `npm_execpath`, discovered the separate fake active npm implementation through PATH, and retained launcher recovery. Backlog setup completed in 1.819 seconds and the exact worker in 0.834 seconds.
- Fast validation passed 315 tests; build, source/bin typecheck, architecture boundaries, product identity, naming audit, strict OpenSpec validation, and diff checks passed. The aggregate local package scope stopped at its unrelated Defender-enabled prerequisite because the workstation reported protection disabled; the relevant exact package-install test was then run directly against the generated candidate and passed.
- A non-mutating probe using the built resolver, the reported roaming global root, and an environment with `npm_execpath` removed resolved `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`.
- Publication acceptance remains pending: a development package must complete a real direct `a1 update --develop` without an injected `npm_execpath`.

## Migration Plan

1. Add bounded candidate construction and canonical regular-file selection without changing the capsule schema.
2. Add deterministic tests for Windows user-prefix/Node-bundled npm separation, candidate precedence, and fail-closed behavior.
3. Validate protected replacement, rollback/recovery, self-update, architecture, and exact-package behavior.
4. Publish a development candidate and retry the reported direct update with no environment workaround.
5. Roll back by removing the additional discovery candidates; capsules already written remain valid because they contain an ordinary canonical npm JavaScript path under the unchanged schema.
