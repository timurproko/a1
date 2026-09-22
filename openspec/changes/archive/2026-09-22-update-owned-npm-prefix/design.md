## Context

See `proposal.md` for motivation. Today `runSelfUpdate` asks the active `npm` for its default global root, canonicalizes that root and the running package root, and refuses replacement when the latter is outside the former. That correctly rejects checkouts and links, but also rejects a normal package at `<older-prefix>/node_modules/@timurproko/a1` after a Node manager changes npm's default prefix.

The replacement interval is guarded by a durable recovery capsule. Its global root determines the package destination and complete public launcher set, while its npm arguments and npm JavaScript entry are validated before a detached guardian can mutate anything. Any non-default-prefix support must therefore select one root before transaction mutation and carry that same authority through installation, cancellation, restart, and launcher recovery.

The active npm root and the invoked installation root have different roles in the mismatch case: the former locates the package manager being executed, while the latter owns the package and launchers being replaced. Conflating them would either retain the refusal or cause npm to install into a different prefix.

## Goals / Non-Goals

**Goals:**
- Prove that the invoked package occupies npm's exact scoped-package location under either the active default root or a non-default root confirmed by active npm.
- Update the proven invoked installation in place with one explicit, stable prefix across the complete protected transaction.
- Preserve recovery-capsule integrity, launcher availability, and interrupted-update convergence.
- Keep unmanaged checkout/link refusal before ownership release or filesystem mutation.

**Non-Goals:**
- Move A1 automatically into the active Node manager's default prefix or delete duplicate installations.
- Support pnpm, Yarn, linked development packages, arbitrary copied directories, or package roots whose canonical layout is not npm's global layout.
- Resume the postponed stable-launcher/package-split design.
- Change channel resolution, command grammar, release activation, progress output, or user data.

## Decisions

### 1. Resolve an owned installation, not only the active default root

Keep the current active-root lookup as the fast path. When the canonical running package is outside that root, derive a candidate global root only if the canonical path ends exactly in `node_modules/@timurproko/a1`. Derive the platform npm prefix from that root (`<prefix>/node_modules` on Windows and `<prefix>/lib/node_modules` on Unix), then ask active npm for `root --global --prefix <candidate-prefix>`. Accept the fallback only when npm's canonical answer exactly equals the candidate root, the expected scoped package path exactly equals the running package root, and the platform's complete regular launcher set is executable where required and targets `node_modules/@timurproko/a1/bin/cli.js` under that prefix.

The launcher proof distinguishes a prior global installation from an arbitrary local project whose dependency path could otherwise be reinterpreted as a synthetic global prefix. Canonical equality is case-insensitive on Windows. The package root itself must resolve to the exact expected location; mere containment is insufficient. A checkout or npm link resolves outside that shape and remains refused. Failure to derive, query, canonicalize, match, or verify launchers does not fall through to installation.

Alternative: treat any path containing `node_modules` as managed. Rejected because containment does not establish npm ownership and can overwrite a checkout, store link, or nested dependency.

Alternative: install into the active default root. Rejected because it creates a second installation, leaves the invoked launcher stale, depends on PATH precedence, and makes rollback span two prefixes.

### 2. Pin replacement to the selected prefix

Once ownership is proven, use the selected global root and its derived prefix as immutable transaction inputs. Invoke npm with a fixed argument array that includes `--prefix <selected-prefix>` so package destination and launcher ownership cannot drift with environment or Node-manager state. Use the selected root for package containment, launcher enumeration, unlock checks, activation, and recovery postconditions.

Keep the active default root separately as the npm-acquisition root. Resolve the npm JavaScript entry from `npm_execpath` when supplied, otherwise from the active npm root, while installation arguments explicitly target the selected prefix. This permits an active FNM npm to replace an older conventional global installation without pretending the older root contains the active npm implementation.

Alternative: temporarily alter npm configuration or process environment. Rejected because hidden configuration precedence is harder to validate and persist through detached recovery than an explicit argument.

Alternative: invoke an npm binary found under the old prefix. Rejected because the old installation need not contain npm and could select an obsolete or unrelated package manager.

### 3. Keep recovery authority narrow and backward-readable

Derive the explicit prefix deterministically from the capsule's canonical global root and require newly created capsule arguments to name that prefix and exact target. Keep binding the capsule to the exact package root and complete launcher set. The detached worker performs the same validation before spawning npm.

Readers accept the existing valid unprefixed argument form only for already-created recovery capsules and continue validating all existing root, package, target, launcher, executable, and digest bindings. New capsules always write the explicit-prefix form. This avoids stranding an interrupted current-version update while preventing a capsule from choosing an arbitrary prefix.

Alternative: revise the recovery schema and reject all prior capsules. Rejected because an update intended to improve recovery must not invalidate safely resumable in-flight authority without a security reason.

### 4. Preserve fail-closed user behavior outside the recognized mismatch

A confirmed non-default prefix follows the ordinary update transcript; no warning or migration prompt is emitted. An unconfirmed path still exits before shutdown, transaction creation, package replacement, or launcher mutation. Its diagnostic identifies that A1 cannot verify npm ownership without suggesting that arbitrary paths can be repaired automatically.

Tests distinguish registry/root-query failure from ownership refusal and prove no install invocation on every rejected path.

Alternative: automatically retry `npm install -g` against the active root after refusal. Rejected because successful installation elsewhere does not update the invoked command and can leave ambiguous launchers.

## Risks / Trade-offs

- **[npm prefix layouts differ by platform]** → Recognize only the established Windows and Unix global layouts and require npm to echo the inferred root before mutation.
- **[A crafted directory resembles a global installation]** → Require exact canonical package placement, active npm confirmation, and the complete npm launcher set targeting A1; never accept broad containment or a linked canonical target.
- **[Node-manager symlinks change lexical paths]** → Compare canonical roots and package paths, with platform-aware path equality, before deriving transaction authority.
- **[The active npm CLI and selected install root differ]** → Track acquisition and destination roots separately and pin destination with `--prefix` in both foreground and detached execution.
- **[An interrupted older update has unprefixed capsule arguments]** → Read the one exact legacy argument form but emit only explicit-prefix capsules going forward.
- **[The user has duplicate A1 installations]** → Update only the package whose CLI was invoked; automatic migration and deletion remain out of scope.

## Implementation Evidence

- The focused self-update, recovery, process-settlement, and transition suites pass with 73 tests on Windows; the one Unix executable-bit case is platform-gated and remains selected on Unix CI.
- The build, source/bin typecheck, architecture boundaries, product identity governance, pinned Pi ledger, terminal-host provenance, strict OpenSpec validation, and diff checks pass locally.
- A non-mutating probe against the reported installation resolved `AppData/Roaming/npm/node_modules/@timurproko/a1` as the selected package/global root while independently retaining the active FNM Node installation's `node_modules` as `npmCliRoot`; the injected replacement completed without writing either installation.
- Exact-package fixtures now place the active npm implementation under a prefix different from the package/launcher prefix for cancellation and updater-loss cases. Their packaged execution remains part of required CI rather than a workstation release-gate run.
- No known implementation gap remains. Exact-head CI and the maintainer's real update from the reported installation remain validation and acceptance steps, not deferred product behavior.

## Migration Plan

1. Add ownership resolution and deterministic prefix derivation while retaining the active-root fast path and unmanaged refusal.
2. Thread selected-prefix and active-npm-root authority through protected replacement and both recovery validators.
3. Add unit, recovery, transition, and exact-package fixtures for active and non-default roots on Windows and Unix layouts.
4. Ship without stored user-data migration. Existing valid recovery capsules remain readable; newly started updates record explicit-prefix arguments.
5. Roll back by restoring active-root-only ownership and unprefixed replacement for new transactions while retaining the backward reader long enough to settle capsules produced by this version.
