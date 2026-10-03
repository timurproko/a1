## Context

The observed transaction records `0.2.2 -> 0.2.3`, package root `C:\Users\tprokopiev\AppData\Roaming\npm\node_modules\@timurproko\a1`, phase `ownership-released`, and error `could not resolve npm's JavaScript entry for protected package replacement; rolled back`. The active npm command and Node executable are under `C:\Program Files\nodejs`, and npm reports the roaming user prefix as its global root.

`0.2.2` resolves recovery npm from `npm_execpath` or `<active-global-root>/npm/bin/npm-cli.js`. Direct CLI invocation supplies no npm lifecycle `npm_execpath`, and the user global root does not contain npm, so the old updater cannot prepare its recovery capsule. `0.2.3` added bounded discovery beside the selected npm command/current Node installation, but package replacement necessarily runs before `0.2.3` exists locally. The fix is correct for updates *from* `0.2.3`; it cannot make `0.2.2` install itself.

The official dependency-free installer already acquires npm independently and, for a valid existing A1 installation, delegates to that installation's cancellation-safe updater rather than overwriting it. That boundary can safely supply the canonical npm JavaScript entry that the predecessor already accepts. The current release gate does not prove this path or direct protected replacement by a published predecessor: `update-predecessor.integration.test.ts` installs predecessor and candidate packages, then calls only the predecessor's materialization and warmup APIs against the candidate tree.

## Goals / Non-Goals

**Goals:**
- Make npm replacement authority a pre-mutation prerequisite, so discovery failure does not flash progress, stop ownership, create a rollback transaction, or touch launchers.
- Provide a supported one-command bridge for valid affected installations without weakening cancellation-safe package replacement.
- Prove the newest supported published predecessor can perform the destructive replacement interval and activate the exact candidate in the Windows user-prefix/Node-install split.
- Preserve concise diagnostics and make the recovery action explicit when an immutable predecessor is already known to be defective.
- Prevent future publication from claiming an updater fix that its source release cannot reach.

**Non-Goals:**
- Rewriting or republishing `0.2.2`, silently modifying its global launcher, or pretending new target code ran before installation.
- Letting the installer directly overwrite an existing valid A1 installation.
- Trusting arbitrary PATH scripts, shell command text, npm temporary files, or an unverified prefix as recovery authority.
- Changing update channels, version grammar, registry/authentication configuration, user data, immutable release activation, or launcher recovery semantics.
- Guaranteeing recovery from every historical package defect; unsupported or unverifiable installations continue to fail closed.

## Decisions

### 1. Preflight canonical npm authority before entering the update transaction

Separate npm-entry resolution from recovery-capsule creation. After npm ownership identifies the canonical A1 destination and before progress starts, resolve the replacement entry using the bounded current rules: explicit validated npm execution context, the active npm global root, and the platform's fixed Node-bundled npm layout. Canonicalize the selected target and require a regular file. Pass that already validated identity into capsule preparation, which revalidates it when committing recovery authority.

A missing candidate is a preflight failure: no ownership shutdown, package-unlock rename, update transaction, recovery owner, npm installation, launcher mutation, or rollback occurs. The command reports the official installer bridge. This also removes the misleading progress flash for the reported class of failure. Failures after transaction entry retain the existing rollback and diagnostics behavior.

Alternative: leave resolution inside capsule preparation. Rejected because an acquisition/layout failure is fully knowable before any update lifecycle mutation and should not look like a failed destructive update.

Alternative: invoke an arbitrary `npm.cmd` from the detached recovery owner. Rejected because the existing recovery authority deliberately binds the current Node executable plus a canonical JavaScript entry and fixed arguments; this change need not weaken that boundary.

### 2. Use the official installer only as a context bridge for existing installations

When `@timurproko/a1-install` is acquired through npm, resolve the active npm JavaScript entry once using its existing dependency-free runner logic. For every delegated existing-install update, construct the child environment with `npm_execpath` set to that canonical regular `npm-cli.js`; if npm invoked the installer through `npx-cli.js`, normalize only to its fixed sibling `npm-cli.js` and validate it first. Preserve the caller environment otherwise.

The installer still verifies the canonical package, complete launcher set, and command precedence before delegation. The installed updater still owns target resolution confirmation, durable transaction state, detached guardian, cancellation, package replacement, launcher postconditions, activation, and rollback. The installer must not fall back to its fresh direct-install branch when delegated update fails.

This bridge works because affected predecessors already accept a valid `npm_execpath`; it supplies missing execution context rather than changing their code or recovery protocol. It is also bounded: the destination remains the independently verified A1 prefix, and the supplied npm entry grants no authority to another package root.

Alternative: tell users to run `npm install --global` over the existing package. Rejected because it bypasses A1's cancellation-safe replacement and rollback path.

Alternative: add an installer-only force/repair flag that overwrites A1. Rejected because the reported installation is valid and the existing protected updater can complete once given the canonical npm context.

### 3. Distinguish an immutable historical bridge from ordinary update support

The repository cannot make bare `a1 update` in already published `0.2.2` call new code. User-facing recovery for that exact source therefore names the preferred installer command:

```sh
npm x -y -- @timurproko/a1-install
```

This is a one-time bridge, not evidence that `0.2.2` direct update was repaired retroactively. The installed target and later releases must pass ordinary direct-update evidence. Product diagnostics added now help any future preflight failure; release notes and support text explain the immutable-predecessor exception without asking for data deletion or exposing internal paths by default.

### 4. Test the destructive predecessor boundary, not only post-install activation

Extend published-predecessor evidence with a private-prefix replacement fixture. It installs the exact predecessor, materializes a verified prior release, places a fake active npm implementation outside the A1 global root on Windows, and drives the predecessor's own protected replacement/recovery code against the exact candidate payload. The fake npm process performs the package/launcher mutations that npm owns; the predecessor must establish its normal capsule, guardian result, launcher postcondition, and activation handoff.

Evidence has two explicit cases:

1. **Ordinary current predecessor:** direct invocation omits lifecycle-only `npm_execpath` and must still replace and activate the candidate in the split-root layout.
2. **Known affected predecessor:** the official installer supplies its canonical npm entry and delegates to the predecessor; replacement must complete through that predecessor's normal safety path. A direct `0.2.2` failure may remain recorded as the historical reproduction but cannot be mislabeled as passing direct support.

Deterministic tests cover preflight ordering, canonical-file rejection, installer environment normalization, delegation failure without overwrite fallback, progress absence, and bounded recovery wording. Exact-package/release coverage uses shipped predecessor and candidate bytes. Stable publication requires the direct immediate-predecessor case and any declared bridge case relevant to the supported release interval; candidate-only unit success cannot substitute.

The existing materialization/warmup assertions remain because they cover activation compatibility after replacement. They cease to be described as complete predecessor update evidence.

## Risks / Trade-offs

- **[The immutable `0.2.2` command still fails when run directly]** -> State this limitation precisely and provide the official installer bridge; do not claim retroactive repair.
- **[Installer context points at npx rather than npm]** -> Normalize only the fixed sibling entry, canonicalize it, require a regular file, and fail before invoking A1 when validation fails.
- **[Supplying npm context redirects installation]** -> Keep destination ownership, explicit prefix arguments, package identity, launcher set, and capsule validation independent from npm acquisition.
- **[A delegated updater fails after mutation starts]** -> Preserve its detached recovery owner and rollback; installer never retries by direct overwrite.
- **[A hermetic fake npm diverges from npm behavior]** -> Limit it to filesystem mutations and exit outcomes already owned by package-install fixtures, and retain exact published-package smoke evidence on Windows.
- **[Exhaustive predecessor validation grows]** -> Reuse one exact candidate preparation and bound the destructive scenario to the immediate supported predecessor plus explicitly declared bridge releases; keep broad materialization/warmup history at its existing exhaustive cadence.

## Implementation Evidence

- Protected update preflight now resolves npm authority before the first progress frame or transaction/lifecycle mutation, passes the canonical entry into capsule preparation, and revalidates it before durable recovery authority is committed. A deterministic failure case proves no transaction begin/finish, lifecycle call, replacement callback, carriage-return frame, rollback claim, or diagnostics path occurs and names the official installer bridge.
- The dependency-free installer canonicalizes its npm entry, normalizes only a fixed `npx-cli.js` sibling, and supplies that value only to verified existing-install delegation. Focused cases prove malformed authority is rejected and a delegated failure performs no direct install fallback.
- Focused update, recovery, and installer validation passed 97 tests with three platform-gated skips; transaction, transition, process-settlement, and update-launch validation added 27 passing tests. Six exact-package installation/recovery tests passed, including cancellation and updater-loss launcher recovery. The exact dependency-free installer package also passed payload, install, executable, and help validation. Build, source/bin typechecking, architecture, product identity, changed-documentation governance, and strict OpenSpec validation passed.
- A locally packed exact `0.2.4-dev` candidate passed the Windows published-predecessor owner with `UPDATE_PREDECESSOR_COUNT=1`: published `0.2.4-dev.663` completed direct split-root protected replacement without `npm_execpath`, and published `0.2.2` completed the canonical-context bridge. Both established target launchers, materialized and warmed the candidate, and executed its packaged command entry successfully. The retained materialization/warmup predecessor case also passed.
- A non-mutating probe removed every case-equivalent `npm_execpath`, used the reported roaming global root, and resolved `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` through the current preflight resolver.

## Known Gaps

None. A public-registry update of the reporter's real user-prefix installation requires published candidate bytes and remains post-publication verification, not an unperformed implementation behavior or permission to mutate user state during development.

## Migration Plan

1. Refactor npm-entry resolution into a preflight result accepted and revalidated by recovery-capsule preparation; retain legacy capsule reads unchanged.
2. Normalize and inject canonical npm execution context only for installer delegation to a verified existing installation.
3. Add deterministic ordering/delegation fixtures and the exact published-predecessor protected-replacement scenario; update validation ownership so stable publication cannot omit it.
4. Publish the installer/application pair through the normal release process and verify the exact affected `0.2.2` installation reaches the selected stable release through the official installer bridge.
5. Verify the newly installed release performs a later ordinary direct `a1 update` in the same split-root environment.

Rollback removes the new preflight handoff and installer context injection together. Existing capsules remain readable because their schema and bound executable/argument fields do not change. No migration or deletion of user data, release state, or transaction history is authorized.
