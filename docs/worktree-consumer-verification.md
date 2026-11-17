# Worktree consumer verification and XR handoff

Policy remains in [shared delivery rules](delivery-rules.md), especially R06/R12–R16/R19; repository bindings remain in [delivery adapters](delivery-adapters.json). This page describes the shipped interface and diagnostics, not another authority or release procedure.

## Reproduce an isolated candidate package

Use a clean isolated checkout of the exact recorded source SHA. Prerequisites are Node >=22.19, Git, the locked repository development dependencies, and the `npm@11.13.0` tool available locally or in npm's cache. Preparing those prerequisites is separate from the offline verification. Replace the `cd` destination below when reproducing on another machine:

```bash
cd /d/Git/a1/.worktrees/simplify-change-delivery && node scripts/development/verify-worktree-package.mjs
```

The verifier performs a fresh `build:core`, then **offline** `npm pack --ignore-scripts` with the repository's pinned npm. It extracts only regular tar entries into a new owning-checkout `.artifacts/agent/worktree-package-*/consumer/node_modules/@timurproko/a1/`. This is candidate extraction, **not a live/global installation**. There are no dependency installs, registry writes, runtime registration outside disposable fixtures, or release publications. Ignoring package lifecycle scripts here is deliberate: this diagnostic does not replace the unchanged release certification gates.

The generated `report.json` records exact source SHA/clean status, OS/architecture/Node/Git/npm versions, package version/size/SHA-256/SHA-512 integrity, declaration hashes, commands, and consumer result. Keep that report with its tarball, `consumer.log`, `types.log`, `consumer/consumer.mjs`, `consumer/worker.mjs` and `consumer/usage.mts`. Consumer execution uses ordinary `node --test`, with loader/Git/session overrides removed; it imports the extracted package by name, never private source files. Strict external TypeScript checking does not use `skipLibCheck`.

The mandatory serial regression wrapper uses `--regression-installed-npm`: it requires already-installed **npm 11**, records `packingPolicy: regression-installed-npm11` and the actual version, and runs all the same tarball/declaration/process assertions offline. This avoids assuming a hosted runner has the pinned npm package cached; npm 10 is refused because it can run prepare despite `--ignore-scripts`. The ordinary command above remains pinned and requires that explicit prerequisite; the regression mode neither certifies a release nor substitutes for the final recorded pinned candidate.

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

### Windows v2 recovery boundary and safety argument

Newly created gates on **Windows x64, local fixed NTFS**, use transactional v2 authority. Windows PowerShell with full-language `Add-Type`, Windows Job/handle/boot-information APIs and Node's built-in SQLite must be available. Network/removable/unknown volumes or unavailable native evidence refuse before granting new authority. Non-Windows and other architectures retain conservative v1 exclusion: **no recovery support is claimed there**.

Each process establishes a separate native observer **before acquiring any v2 authority**. It assigns the holder to a non-breakaway Job, so subsequently created children and descendants, including detached commands, remain contained. It retains references to the holder's existing Jobs (notably libuv's self-containing kill-on-close Job), preventing holder death from killing that observer or silently changing descendant lifetime. It never terminates processes. A live or suspended member remains live regardless of elapsed time. The observer publishes a flushed, identity-bound completion receipt only after `QueryInformationJobObject` reports **zero processes**, then closes its handles. Job/name absence alone is never sufficient. A missing observer/receipt remains blocked in the same boot; a **different kernel boot GUID**, read through Windows' boot-environment API, proves old local execution cannot resume and provides the supported boundary after observer loss. Sleep, restart of A1, PID reuse/absence, logoff or a user's assertion are not reboot evidence. The reboot branch is a kernel-evidence boundary, not a claim that this diagnostic rebooted the host.

- **Global `mutation.authority.gate`:** recovery requires that complete holder Job stopped, not merely that the parent PID vanished. It changes only that namespace's active authority record and matching pending intents, never claims/sessions. Existing claim files remain protected and normal claim reconciliation resumes under the next acquisition.
- **Target `<Git common>/worktree-claim-gates/<target digest>.gate`:** the same proof includes all contained destructive descendants. Recovery retires only that target's original authority and verified matching intent files; other targets, checkout contents, refs, cleanup journals and original snapshot approval are untouched. A changed HEAD/recreated checkout **still invalidates the old cleanup snapshot after recovery**. Retrying cleanup requires the original controller's independent preservation/publication/approval rules; recovering a gate does not approve deletion or reapprove replacements.

SQLite's Windows byte locks serialize acquire/bind/release/recovery, and crash rollback protects interrupted recovery. Recovery rechecks positive lifetime evidence **inside** that transaction, then compares the inspected storage identity and nonce. A stale approval cannot clear a replacement/successor; an old handle's delayed release also compares its original nonce. Storage is persistent, including when idle: the database and its **tool-created identity anchor** are exactly two names for one file. Unknown extra hardlinks, symlinks/junctions, changed anchors, malformed databases/records/intent files and unverifiable witness directories are refused. Never remove/rename either storage name or SQLite journals. Unpublished initialization drafts contain no execution authority; published state is always a complete transactional database. Recovery interrupted after removing some verified intent metadata can retry: old execution is already proven stopped, and the authority transaction either commits or rolls back.

### Supported inspection and recovery commands

Use a trusted compatible checkout/package, **not an older copied private module**, and explicitly select the existing scope. The source commands below are reproducible from this task checkout; a packaged consumer uses the same entry point at `<compatible-package>/dist/foundation/lifecycle/claim-gate-recovery.mjs`. No runtime session/profile initialization, hosting, cleanup or namespace migration is performed. In actual use substitute the real existing namespace or common directory/target; **these examples do not authorize recovery of production gates**.

Inspect one configured global namespace and save its exact generation approval (the output file must not already exist):

```bash
cd /d/Git/a1/.worktrees/simplify-change-delivery && node src/foundation/lifecycle/claim-gate-recovery.mjs inspect --scope global --data-dir /d/isolated-fixture/data --output .artifacts/agent/global-recovery-approval.json
```

Or inspect one target, even if its checkout has already disappeared. Supply its canonical original path and the repository's verified Git common directory; this does not capture/replace a cleanup snapshot:

```bash
cd /d/Git/a1/.worktrees/simplify-change-delivery && node src/foundation/lifecycle/claim-gate-recovery.mjs inspect --scope target --common-dir /d/isolated-fixture/primary/.git --worktree /d/isolated-fixture/task --output .artifacts/agent/target-recovery-approval.json
```

Only an inspection reporting `recoverable` can be used. Recover that exact saved approval; for a target use its target approval file instead:

```bash
cd /d/Git/a1/.worktrees/simplify-change-delivery && node src/foundation/lifecycle/claim-gate-recovery.mjs recover --approval .artifacts/agent/global-recovery-approval.json
```

| Result | Meaning / next action |
| --- | --- |
| `live` | Holder Job still includes the holder. Suspension is live; wait for its normal release/termination. No takeover. |
| `surviving-descendant` | Holder is gone but its Job still contains descendants. Let the separately controlled work finish; recovery cannot stop it. |
| `contended` | Another kernel-serialized transaction is in progress. Retry inspection later; this is not orphan evidence. |
| `recoverable` | Positive completion receipt or verified changed boot; recovery will revalidate both proof and exact generation. |
| `recovered` | Exact authority retired. Retry the original operation, which repeats all normal claim/snapshot/preservation checks. |
| `idle` / `absent` | No active authority/no published storage; no recovery necessary. Idle database/anchor files remain deliberately. |
| `unverifiable` / `refused` | Incompatible format/platform, lost same-boot observer, invalid proof/storage, changed identity/generation or malformed intent. Retain everything. Missing observer receipt may be transient; if lost, a verified reboot is the supported v2 execution-stop boundary. Malformed/legacy state is **not** made recoverable by reboot. |

Busy/unverifiable inspection and refused recovery exit nonzero; JSON reports the reason. No `force`, PID/age takeover, manual gate deletion or silent namespace/target recreation escape exists. Approvals are evidence for one generation, not reusable blanket authority. Protect approval files as local coordination metadata; never print/persist `WORKTREE_CLEANUP_RESERVATION`.

### Historical compatibility and rollout

The supported four cleanup APIs and opaque snapshot version stay unchanged, but persistent **v2 gate storage is intentionally incompatible with older writers**. Their exclusive-create acquisition cannot enter it, including idle storage. Old JSON wx `.gate` generations have **no reliable lifetime witness and cannot be upgraded/recovered automatically, even after reboot**. Inspection refuses them without alteration. Do not copy a v2 completion receipt onto historical state or delete a v1 gate to claim migration. Existing historical orphan namespaces/targets need a separately justified migration mechanism; this correction does not claim all old orphans recoverable. A regular historical `mutation.lock` barrier remains a different compatibility case with the already documented fully quiescent backup boundary, never a procedure for `.gate` files.

Before first v2 acquisition, stop all incompatible writers/controllers and descendants and prevent restart; deploy attachment and cleanup from the **same compatible released package** in the existing namespace. Do not roll back an old writer against initialized v2 storage. Observer/Job/handle inspection requires Windows API access; hardened hosts that prohibit it fail closed and need their environment made compatible, not an exemption. Do not erase observer directories while retained gates may refer to them; absence on the same boot remains blocking. A fresh namespace/target succeeding is not original-gate recovery. Candidate extraction and fixtures perform no real upgrade/restart, reboot or production recovery.

Dead editing claims remain subject to normal ownership validation; diagnostic `mutation.lock/owner.json` remnants can still reconcile only after obtaining authority. Neither diagnostic files nor clean Git status prove lifetime or approve cleanup.

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

Only after that independently verified stop deploy the **same compatible released** attachment/cleanup implementation and snapshot-aware declarations. Restart the compatible writers in the same intended claim namespace and rerun the consumer's actual probes. Old unwitnessed orphan gates remain blockers; v2 orphans use the explicit generation-bound recovery procedure above after positive lifetime evidence. Restart alone is not that evidence; do not bypass either format by silently choosing an empty data directory for the same live resources. Candidate tarball verification here performs none of these deployment steps and does not certify a release or authorize process termination/cleanup.
