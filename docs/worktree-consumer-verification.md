# Worktree consumer verification and XR handoff

Policy remains in [shared delivery rules](delivery-rules.md), especially R06/R12–R16/R19; repository bindings remain in [delivery adapters](delivery-adapters.json). This page describes the shipped interface and diagnostics, not another authority or release procedure.

## Reproduce an isolated candidate package

Use a clean isolated checkout of the exact recorded source SHA. Prerequisites are Node >=22.19, Git, the locked repository development dependencies, and the `npm@11.13.0` tool available locally or in npm's cache. Preparing those prerequisites is separate from the offline verification. Replace the `cd` destination below when reproducing on another machine:

```bash
cd /d/Git/a1/.worktrees/simplify-change-delivery && node scripts/development/verify-worktree-package.mjs
```

The verifier performs a fresh `build:core`, then **offline** `npm pack --ignore-scripts` with the repository's pinned npm. It extracts only regular tar entries into a new owning-checkout `.artifacts/agent/worktree-package-*/consumer/node_modules/@timurproko/a1/`. This is candidate extraction, **not a live/global installation**. There are no dependency installs, registry writes, runtime registration outside disposable fixtures, or release publications. Ignoring package lifecycle scripts here is deliberate: this diagnostic does not replace the unchanged release certification gates.

The generated `report.json` records exact source SHA/clean status, OS/architecture/Node/Git/npm versions, package version/size/SHA-256/SHA-512 integrity, declaration hashes, commands, and consumer result. Keep that report with its tarball, `consumer.log`, `types.log`, `consumer/consumer.mjs`, `consumer/worker.mjs` and `consumer/usage.mts`. Consumer execution uses ordinary `node --test`, with loader/Git/session overrides removed; it imports the extracted package by name, never private source files. Strict external TypeScript checking does not use `skipLibCheck`.

`--allow-dirty` is only for developing the verifier. Such reports explicitly say `sourceClean: false` and cannot establish exact-head evidence. A source/head change during the run fails verification. Rebuild a separately identified tarball after any candidate change; do not reuse an old digest as release or acceptance evidence. Final head/package identities belong in the PR handoff/diagnostic artifact, not a self-referential recording commit.

## Supported consumer interface

The supported imports are:

```js
import { captureWorktreeCleanupSnapshot } from '@timurproko/a1/dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs';
import { executeUnclaimedWorktreeCleanup, withUnclaimedWorktree, executeCleanupCommand } from '@timurproko/a1/dist/foundation/lifecycle/worktree-claim-boundary.mjs';
```

Capture the opaque approval **before preservation preflight/detach**, retain it, and pass that original value through the controller. Never recapture a replacement checkout or changed HEAD as if it were the original approval. Use the same configured `dataDir`/environment namespace as the editing-claim producer. A version string or an old private runtime-file copy is not proof of compatibility.

- `executeUnclaimedWorktreeCleanup(approved, program, args, { dataDir, cwd: primary })` guards a participating repository controller through actual child closure.
- `withUnclaimedWorktree(approved, options, async () => { ... })` wraps the controller's journal/purge/check work in the same target exclusion. Await all destructive work inside the callback.
- Participating controllers/descendants call `executeCleanupCommand(program, args, { cwd: primary, protectTarget: true })` and await closure. This validates the original sealed approval and tracks descendants. Do not wrap an unmodified script that launches untracked destructive children.

The kernel does not supply publication evidence, preservation policy, command trust or user authorization. Those remain the existing repository controller's responsibility. Do not run from the directory being removed. The private `WORKTREE_CLEANUP_RESERVATION` is propagated by the runner, not a user setting; never fabricate, print or persist its value as evidence. The packaged probe also imports shipped SDK claim-producer/compatibility modules for testing; those extra test imports are **not** additional supported XR consumer contracts.

## XR attachment sequencing

Inside A1, prefer the structured `worktree` tool with an explicit absolute target, or the existing shell `enter --repo`/`attach` form. Mutation responses saying `queued`, `requested`, or shell exit zero are **not** attachment success.

1. Issue only the transition in that tool batch. Return/yield its result immediately; do not chain setup/editing, wait synchronously for completion inside the requesting tool, or poll from that still-active batch.
2. Let A1 finish/persist tool results and reach its idle host boundary. A1 resolves target trust, replaces project resources, commits the claim/association and emits the final transition result into the continuing conversation.
3. Continue setup/editing only after that actual runtime result confirms `Session worktree attached:` with the expected canonical root/branch and resource reload. A failure/cancellation is not success, even if the original shell exited zero. Preserve prior work and report the failure.
4. Normal selected repository/ref/head validation remains applicable; no second `list`/inventory approval ritual is required. The next tools use the confirmed project context, not an extension context captured before replacement.

XR must preserve this yield/confirmation boundary in its orchestration. A host that exposes only shell exit status but drops A1's later runtime result is **not a compatible attachment integration**; stop before setup/editing rather than inferring success. The versioned external Integration API does not currently advertise a worktree-completion subscription; do not invent one or import private host files as a workaround. Outside A1, external agents continue using ordinary owned Git worktrees and need no A1 attachment.

## Crash gates and supported recovery limits

Do not confuse editing records, diagnostic metadata, the legacy barrier, and modern authority gates:

| State | Scope and supported behavior |
| --- | --- |
| Dead editing claim, no held/orphaned gate | Existing SDK liveness/ownership validation can retire the dead claim under the normal mutation gate. It does not infer cleanup or acceptance authority. |
| `mutation.lock/owner.json` diagnostic remnants, **no** `mutation.authority.gate` | The normal global mutation acquisition can clean these diagnostics after obtaining exclusive authority. Diagnostic metadata is not ownership. |
| Regular **legacy** `session-worktree-claims/mutation.lock` | Existing compatibility diagnostic requires a fully quiescent stop of **all** old/new claim writers and related cleanup descendants. Preserve a backup of only that verified regular legacy file while no writer can restart, then start the compatible runtime. Never move a link, unknown state, claim/session files or modern gate using this procedure. The package fixture tests this with one controlled legacy writer and no descendants; it does not prove quiescence of a real installation. |
| Modern global `<configured claim store>/mutation.authority.gate` | An orphan blocks claim mutations/consistent snapshots across targets in that data-directory namespace. **No supported in-place crash recovery/reclaimer exists.** Restart and old mtime/PID death do not clear it. Keep it and the claim store; bounded retries do not repair the orphan. |
| Modern target `<Git common>/worktree-claim-gates/<target digest>.gate` and `.children/` intents | An orphan blocks that exact target, even when a parent dies, its tracked descendants subsequently exit, or the path is recreated. Other target gates can remain usable. **No supported in-place crash recovery/reclaimer exists.** Retain gate and child intents; do not recursively clean or rename them away. |

A global gate is not itself an editing claim; safe standalone inspection/execution still has its own claim/target checks. A fresh disposable namespace/target succeeding is **not recovery of the original gate**. The fixture verifies this distinction. No age threshold, parent-PID absence, `owner.json`, clean status or version string proves that destructive descendants have stopped. A reboot alone does not remove persistent authority files either. Modern orphan recovery remains an explicit operational blocker requiring a separately supported, generation/descendant-safe procedure; this PR does not claim seamless recovery or supply an unsafe manual deletion recipe.

## Windows diagnostic reproduction

The previously disclosed failures were reproduced with the original wrapper budgets. Moving only disposable TEMP/TMP storage from the profile/system temp location to the owning checkout's volume made the same suites pass. This demonstrates environment/temp-locality sensitivity; it does **not** identify a particular antivirus/scanner or justify disabling it. A trial of parallel Git reads did not close the budgets and was discarded rather than changing cleanup semantics.

The Git fixture builder reuses only synthetic immutable base objects within one test worker; every case still gets a fresh real Git repository with separate administrative identity, refs/config, remote and worktree. It never caches publication/preservation results or shares user/private dependencies or work. This removes repeated init/add/commit process costs without removing any hazard or assertion.

The three Git-fixture child wrappers now use unique `.artifacts/test/` TEMP/TMP/TMPDIR roots, without changing the parent environment, cases, assertions, or 30/240-second child and 35/250-second wrapper limits. Failed fixture evidence is retained instead of recursively deleting a possibly still-active child fixture. Use the supported wrappers, not a manually relaxed Node timeout:

```bash
cd /d/Git/a1/.worktrees/simplify-change-delivery && VALIDATION_TESTS_JSON='["test/repository-governance/delivery-local-removal.test.ts","test/repository-governance/delivery-planning.test.ts","test/repository-governance/portable-delivery-cases.test.ts","test/composition/session-worktree-recovery.test.ts","test/integrations/pi/engine/repository-metadata.test.ts"]' node scripts/release/run-validation-tier.mjs pr-selected-resource --result .artifacts/agent/windows-worktree-verification.json
```

Do not globally relocate all tests' TEMP into the checkout: a test intentionally starting outside Git would then legitimately discover the enclosing checkout. The fixture environment helper is scoped to controlled Git workers only. Genuine non-Git startup cases retain their original environment. The current footer/context case passed at its existing wait; separately, a deterministic regression proved explicit refreshes accumulated five poll timers instead of one. Shared cancellation fixes that defect without enlarging any wait or startup-graph budget. Slow/unavailable/uncertain repository context still fails closed.

## Stop / upgrade / restart prerequisites

For a real downstream adoption, first stop accepting new context/cleanup requests; let issuing batches and already tracked destructive descendants finish. Separately identify and gracefully stop **all incompatible older writers and repository cleanup controllers**, including suspended processes and descendants, and prevent auto-restart during the change. Do not treat stopping only the parent as quiescence. Retain unknown/live/orphaned state and user data.

Only after that independently verified stop deploy the **same compatible released** attachment/cleanup implementation and snapshot-aware declarations. Restart the compatible writers in the same intended claim namespace and rerun the consumer's actual probes. Modern orphan gates remain blockers through restart; do not bypass them by silently choosing an empty data directory for the same live resources. Candidate tarball verification here performs none of these deployment steps and does not certify a release or authorize process termination/cleanup.
