# Local worktree cleanup after verified delivery

Local cleanup completes the delivery order in [the archive runbook](openspec-archive-automation.md). For version 3 that is one authorized manual implementation/acceptance/archive merge, read-only verification, remote topic-ref deletion, then safe local cleanup. Legacy versions still require their applicable acceptance-record and automatic archive merges. GitHub Actions never reaches into a developer machine. Local cleanup never publishes archives or merges PRs; `complete`, preview, and queue/watch do not delete remote refs, while explicitly confirmed closed-unmerged `discard` owns only its exact expected-SHA topic-ref deletion.

The implementation is repository tooling, not part of the installed A1 product. It requires Node, Git, and GitHub read access; the explicit closed-unmerged discard operation additionally requires authenticated permission to delete its exact remote topic ref. No product build, dependency installation, interactive UI, or OS-service provisioning is needed. It supports this repository's `origin` on github.com, via HTTPS or SSH.

## Hand-off and sweep: the ordinary agent path

The delivering agent's session usually ends before the maintainer merges, so cleanup is split into two commands that never need the same session. When the validated PR is handed to the maintainer, and again after any repair push, the owning agent parks the worktree from the primary checkout:

```bash
node scripts/governance/local-worktree-cleanup.mjs handoff   --repo D:/Git/a1   --path D:/Git/a1/.worktrees/example-task   --change example-change   --pr 123
```

`handoff` registers the exact worktree if it is not registered yet (or reclaims the existing released entry), records its current HEAD and branch, applies the central disposable policy, and releases it. It evaluates nothing, deletes nothing, and does not enable the queue. That release is the candidate-scoped cleanup authorization for this worktree and its topic ref, exercised only once the merge, archive, validation, and remote-ref gates verify later; it never becomes discard authority for a PR that is later closed unmerged. It is idempotent per worktree: repeating it updates the recorded head instead of adding a second registration. Tracked, staged, unstaged, or untracked content outside the disposable roots blocks with `worktree-content` and the affected paths, because such content means unpushed work; unknown ignored content is judged at removal time, as it is for `complete`. A primary, foreign, replaced, or branch-changed path blocks with a named reason. A worktree that a session registered with the low-level `register` command and still owns is released by `handoff` (or `complete`) when `LOCAL_CLEANUP_OWNER_TOKEN` holds that registration's token; without it both block with `owned-worktree`, and a separate `release` is needed.

Every delivery session then starts, before it creates a worktree, with one bounded sweep from the primary checkout, and runs it again when it verifies or is told of a merge:

```bash
node scripts/governance/local-worktree-cleanup.mjs sweep --repo D:/Git/a1
```

`sweep` evaluates every released registration in one pass under the queue limits (100 registrations, 500 remote requests, a durable round-robin cursor) with a 180-second elapsed budget, since each merged candidate costs three evidence loads, and completes each candidate whose PR is verified merged using exactly the `complete` safeguards. It needs no `enable` and starts no process: its authority is each candidate's release. A candidate whose PR is open, draft, or not yet finalized reports `pending`; a candidate whose PR closed without merge reports `awaiting-discard` and is never touched; blockers report their exact reason. An old stop sentinel does not prevent a sweep, but `disable` run while a sweep is executing stops it before its next destructive step. If another session holds the mutation lock the sweep reports `mutation-busy` and the agent relays it as deferred rather than waiting. The JSON report carries a `lines` array with one relayable line per candidate and pruned branch, for example `#458 close-absent-and-skewed-cleanup: removed [worktree-removed, local-ref-removed]`. Pending or blocked results never delay the new delivery.

### Nothing left to remove

A released entry whose evidence can never verify (for example `delivery-content-drift` after a stale-base merge, or `source-association` for a PR without an `openspec-implementation` fence) would otherwise be re-verified and reported `blocked` on every sweep. When such an entry's worktree path is gone, Git holds no live row for it (its own dangling row is retired), and its local topic ref is absent, the sweep and `complete` ask GitHub only whether the pull request merged into `develop` in this repository and then mark the journal `done` with `retired-nothing-left` and the original evidence reason. Nothing is deleted; a present path, row, or ref keeps the entry blocked, an unmerged PR keeps it `pending` or `awaiting-discard`, a deferred failure such as `remote-budget` is never treated as unverifiable, and preview retires nothing. For an all-absent entry whose PR is not merged, the maintainer runs the explicit form, which reads nothing from GitHub and deletes nothing:

```bash
node scripts/governance/local-worktree-cleanup.mjs forget --repo D:/Git/a1 --id REGISTRATION_ID --confirm-nothing-left
```

`forget` refuses without the flag, for an owned or deleting entry, and while the path, a live Git row, or the ref still exists (`something-remains`). `status` shows both notes under `completion`.

### Keep the base current before merge

The `develop` ruleset requires the pull request head to be up to date with `develop`. When another delivery merges first, the PR shows `BEHIND`: merge `origin/develop` into the branch (or use "Update branch"), push, let the `OpenSpec finalization` workflow re-finalize with digests of the merged bytes, wait for validation, and hand off again. Merging a stale finalized head is what produced `delivery-content-drift` for #461; with the strict policy GitHub refuses that merge.

### Accepted ancestry

Since the `OpenSpec finalization` workflow pushes its commit onto the PR branch after the agent's last push, the registered head is normally one commit behind the merged head. Cleanup therefore accepts a registered head, live worktree HEAD, or local topic-ref tip that equals the merged PR head or is one of its ancestors on GitHub, verified with the compare API: every commit reachable from such a tip is reachable from a head the maintainer accepted, so nothing is lost. A tip that holds a commit outside the merged head, or a commit GitHub does not know, still blocks with `candidate-head-association`, `worktree-identity-changed`, or `local-ref-advanced`, and the branch attachment must still be the registered one. Ref deletion reads the tip immediately before deleting, requires it to be accepted, and uses it as the compare-and-delete expectation. Ancestry of `develop` is never used, because the repository squash-merges.

### Merged branch pruning

The sweep also prunes local topic branches that have no live registration, such as the branch left behind when a worktree was deleted by hand. A branch is deleted only when all of these hold: its name follows `type/short-description` and is not `develop` or another protected or reserved name; no worktree has it checked out; the same-repository pull-request lookup by that head ref name returns at least one PR merged into `develop` and no open PR; the tip equals or is an ancestor of the most recent such merged PR's head; and `origin` no longer has the ref. Deletion is compare-and-delete against the tip reread immediately before. Everything else is reported and kept with `branch-no-pull-request`, `branch-open-pull-request`, `branch-closed-pull-request`, `branch-unmerged-commits`, `branch-checked-out`, or `branch-remote-present`. Branch pruning never deletes remote refs, worktrees, or registrations, and a preview never prunes.

## Standard completed-delivery command

The exact-candidate form remains for a session that is still alive at merge time or wants to finish one candidate by name. After authorized merge, accepted/archive verification, and remote topic-ref removal, the owning agent runs one command from the primary checkout:

```bash
node scripts/governance/local-worktree-cleanup.mjs complete \
  --repo D:/Git/a1 \
  --path D:/Git/a1/.worktrees/example-task \
  --change example-change \
  --pr 123
```

`complete` is explicit cleanup authorization for that exact candidate. It creates and releases an exact registration when needed, applies the repository-owned generated-path policy, verifies live merge/archive/CI/ref evidence, evaluates only that candidate, uses journaled non-force Git removal, deletes only the unchanged local topic ref, and leaves persistent watcher authority unchanged. Repeating it reports the completed candidate as already absent. Existing conflicting ownership, identity drift, unavailable evidence, or unknown content remains blocking.

The central disposable policy is `node_modules`, `dist`, `.builds`, `.artifacts`, `native/process-guardian/target`, and `native/terminal-host/target`. The `.artifacts` root is the repository's ignored generated-artifact root (finalization and validation reports, packed candidates, agent-written logs and diffs); the two native roots contain repository-generated Cargo output. Registrations that still name `.artifacts/openspec-archive` or `.artifacts/validation` stay valid and are widened to the root on the next `complete`. Each encountered path must be ignored and stay inside the exact worktree with no link, special file, or nested repository boundary. Authority is component-exact: near matches such as `.artifacts-user` or `artifacts`, arbitrary `target` directories, and sibling native projects remain blocking. Tracked/staged/unstaged/untracked content and every unknown ignored path still block. A tracked regular `.gitmodules` file alone is ordinary content; actual nested `.git` metadata, gitlinks, configured submodules, and submodule changes block. Ordinary content and these approved generated roots are traversed under separate finite entry allowances, so a normal dependency installation does not consume the ordinary source-tree allowance; both allowances retain the same deadline and content-boundary checks. Once those checks pass, cleanup deletes the declared disposable roots itself with a bounded retry for transient Windows sharing violations before handing the worktree to Git, so non-force Git removal only has to delete tracked content. A root that stays locked after the retry budget reports `blocked` with `disposable-path-locked` and the root's path; the worktree, its `.git` pointer, and its journal are untouched, so stop the process holding the handle and rerun the same command.

Agents do not manually remove generated content, call `git worktree remove`, or delete the local branch after delivery. The JSON result is authoritative: report success only for `removed` or verified `already-absent`; otherwise retain the worktree and report the exact blocker. A handed-off entry whose worktree was deleted by hand completes through its journal, and its branch is deleted under the accepted-ancestry rule. Legacy roles can supply separate `--source-pr`, `--candidate-pr`, and `--role` values.

## Explicit closed-unmerged discard

Closing a PR does not itself authorize deletion. After the maintainer explicitly rejects one exact PR and separately confirms remote deletion, run the candidate-scoped command from the primary checkout:

```bash
node scripts/governance/local-worktree-cleanup.mjs discard \
  --repo D:/Git/a1 \
  --path D:/Git/a1/.worktrees/rejected-task \
  --change rejected-change \
  --pr 123 \
  --confirm-closed-unmerged
```

`discard` requires the named PR to remain closed without merge, target `develop`, belong to this repository, and identify the exact registered worktree HEAD and branch. It first applies the same clean-content and generated-root inspection used by `complete`. It then verifies the remote topic branch is unprotected, non-reserved, and still equals the PR head; deletes only that ref with an expected-SHA lease; verifies remote absence; rechecks the local candidate; removes the worktree non-forcibly; and atomically deletes only the unchanged local branch.

An open, merged, reopened, forked, protected, reserved, advanced, dirty, active, linked, nested, replaced, current, or unverifiable candidate remains blocking. Remote deletion followed by a Windows lock or later local blocker is reported as `partial`; the journal preserves the remaining worktree/local ref for the same exact confirmed command to inspect and resume. The command never scans by age or name, adopts another session's checkout, enables queue/watch, or turns PR close events into automatic discard authority.

## Preview first

From a checkout containing the reviewed tooling:

```bash
node scripts/governance/local-worktree-cleanup.mjs preview --repo D:/Git/a1
node scripts/governance/local-worktree-cleanup.mjs status --repo D:/Git/a1
```

`--repo` is the **primary** worktree, not a task worktree. Preview reads live evidence but changes no worktrees, refs, ownership state, or retry checkpoints. Status is local-only. Existing folders are reported `unmanaged` and are never adopted by their name, missing upstream, or ancestry. Neither command enables cleanup.

Remote reads use `GH_TOKEN`/`GITHUB_TOKEN`, otherwise existing `gh auth token --hostname github.com` authentication. Do not put tokens in command arguments, source files, reports, or PR comments. Missing/expired private-repository authentication blocks evidence checks.

## Explicit queue/watch enablement

Neither `handoff`, `sweep`, nor the exact-candidate `complete` command enables the persistent queue; `sweep` scans released registrations under its own authority, while `once`/`watch` remain the separately enabled background route. Only after the maintainer separately authorizes queue/watch activation, use the reviewed tool in the primary/stable checkout outside `.worktrees/`:

```bash
node scripts/governance/local-worktree-cleanup.mjs enable --repo D:/Git/a1
node scripts/governance/local-worktree-cleanup.mjs once --repo D:/Git/a1
```

`enable` only records permission; it does not start a process or remove anything. `once` evaluates at most one bounded pass. Mutation commands `once` and `watch` refuse tooling loaded from inside the target repository's removable root. For pre-merge isolated tests, the test repository is a separate disposable temporary repository, not the working repository itself.

For eventual cleanup after asynchronous archive integration, run watch mode in a separate terminal or an explicitly managed local process:

```bash
node scripts/governance/local-worktree-cleanup.mjs watch --repo D:/Git/a1
```

It runs one immediate pass and retries at five-minute intervals, with rate-limit backoff and no overlapping mutations. Each pass is bounded to 100 registration evaluations, 500 remote requests, and 60 seconds; individual subprocess/remote calls have a 10-second deadline. Local content traversal is additionally bounded to 20,000 ordinary entries plus 100,000 entries beneath exact approved generated roots; exhausting either allowance never grants deletion authority. Reports identify incomplete coverage. A durable round-robin cursor lets later pending candidates run on subsequent passes.

When the process is stopped or the machine is offline, GitHub cannot remove local folders. The next enabled invocation rechecks the queue and live evidence. No implicit service, scheduled task, or A1/Pi startup hook is installed.

## Register and release only work you own

Keep an owner token private for the delivery session. For example, in Git Bash:

```bash
export LOCAL_CLEANUP_OWNER_TOKEN="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
```

Register after the draft PR number is known, using actual PR numbers and canonical paths. The following example deliberately requires replacing `123` and `example-task`:

```bash
node scripts/governance/local-worktree-cleanup.mjs register --repo D:/Git/a1 --path D:/Git/a1/.worktrees/example-task --change example-change --source-pr 123 --candidate-pr 123 --role implementation
```

Registration binds the repository, exact directory/filesystem identity, candidate PR, HEAD/ref, role, and generation. It returns an ID and generation, not the owner token. The worktree stays `owned`: registration alone never authorizes removal. Supported roles:

- `implementation`: exact merged implementation PR head; candidate PR equals source PR. This is the only version-3 role because the same PR contains implementation, acceptance manifest, synchronized specs, and archive.
- `acceptance`: legacy exact verified implementation merge commit; candidate PR equals source PR.
- `archive`: legacy exact merged generated archive PR head; candidate PR is the archive PR and source PR is the implementation PR.

A CI/base/older-ancestor checkout does not qualify automatically. Version 3 has no local acceptance/archive checkout to register. No local archive checkout is required when a legacy archive was generated entirely on GitHub. Legacy version-1/version-2 linkage remains supported, but individually reviewing and registering a legacy checkout is explicit adoption, not a bulk sweep.

Low-level `register` keeps an explicit disposable allowlist for legacy and diagnostic use. The standard `complete` command supplies the central repository policy automatically; agents do not choose flags for normal completed-delivery cleanup. Neither route permits discarding tracked, staged, unstaged, untracked, unknown ignored, linked, special, or actual nested repository/submodule content. Declaring or centrally recognizing a generated directory does not bypass ignored-path, identity, type, or traversal checks.

Before handing a completed checkout to cleanup, stop its development processes, leave its directory, and release it using the returned ID and current generation:

```bash
node scripts/governance/local-worktree-cleanup.mjs release --repo D:/Git/a1 --id REGISTRATION_ID --generation CURRENT_GENERATION
```

Release verifies ownership and the original directory, records the owner's current final HEAD/ref, and returns a new generation. It does not declare acceptance or archival. For version 3 the worker verifies the exact authorized human manual source merge, required CI, conditional manifest, synchronized specs/archive on current `develop`, and absence of the source topic ref. For legacy versions it still verifies the exact comment or human-manually-merged acceptance receipt, generated archive marker/merge/CI, archive contents, and all applicable topic refs. A bot/automatic/merge-queue acceptance, stale record, missing required CI, unmatched archive, or open/closed-unmerged PR blocks cleanup.

After a low-level release, request a pass from the stable checkout if queue cleanup is enabled. A running watcher will also pick it up. Normal completed delivery instead uses `complete`. Never release another session's worktree or use a clean status/dead PID as a substitute for ownership.

## Resume or recover ownership

Before resuming a released worktree, acquire it:

```bash
node scripts/governance/local-worktree-cleanup.mjs claim --repo D:/Git/a1 --id REGISTRATION_ID --generation CURRENT_GENERATION
```

Use a private token for the new session. Claim, release, and cleanup share a per-repository lock. A successful claim prevents deletion until the new owner releases it. A deleting or completed candidate cannot be claimed. A path reused after completed cleanup requires a new explicit `register` operation.

A session crash does not release ownership. After separately confirming that the owner and all related processes have stopped, an explicit recovery claims it for review:

```bash
node scripts/governance/local-worktree-cleanup.mjs recover --repo D:/Git/a1 --id REGISTRATION_ID --generation CURRENT_GENERATION --confirm-stopped
```

Recovery never releases or deletes. The generation must still match. A Git worktree lock remains a veto. A leftover `mutation.lock` from a killed cleanup process is evicted only on proof: the holder writes its PID and refreshes a heartbeat in the lock every five seconds, and a later `handoff`, `sweep`, `complete`, `discard`, claim, or queue pass evicts the lock only when that heartbeat (or, for an old lock without one, the file's modification time) is more than two minutes old and the PID no longer exists. A live, unprobeable, or own PID keeps the lock, as does a fresh or unreadable-but-fresh file, and the operation reports `mutation-busy`. Each eviction is journaled as `lock-evicted-<time>-<id>.json` beside `state.json` with the evicted record; it releases no ownership and advances no journal step. A lock that stays `mutation-busy` therefore has a live holder: wait for it or stop that process first.

## Outcomes and interruption handling

State, journals, stop controls, and execution reports live in `<git-common-dir>/local-worktree-cleanup/`, outside removable checkouts. `status` omits owner-token hashes. Reports contain identities, local blockers, performed steps, and coverage, never file contents or credentials. Completed reports are retained for 30 days subject to a 10 MiB cap; unresolved queue/journal records are not evicted.

- `eligible`: preview passed the gates; nothing was removed.
- `pending`: archive/ref prerequisites have not finished, or the handed-off PR is still open.
- `awaiting-discard`: the handed-off PR closed without merge; only the explicit `discard` command may act.
- `blocked`: ownership, content, path, provenance, authentication, or identity needs attention.
- `unmanaged`: no local registration; no automatic adoption.
- `removed`: worktree and eligible local-ref operations were verified.
- `already-absent`: a completed journal's path/ref are still absent.
- `retired`: evidence was unverifiable but nothing remained to delete and the PR is merged; the journal is complete with `retired-nothing-left`.
- `forgotten`: the maintainer explicitly closed an all-absent entry with `forget`.
- `partial`: a destructive step began but all cleanup could not be verified; the same command resumes it.
- `deferred`: a bounded pass or concurrent mutation owner prevented evaluation.

Non-force Git removal is the only operation that deletes tracked content from an intact worktree. Local topic-ref deletion then compares the tip read immediately before, which must be the journaled head or an accepted ancestor of the merged head, and refuses refs checked out elsewhere. `develop`, primary/current directories, changed heads, and active sessions are protected. Normal removal retires its own Git worktree registration; unrelated stale/missing registrations are never globally pruned.

A released worktree whose directory was deleted by hand before cleanup ran is finished through its journal rather than failing on the missing directory: the same merge/archive evidence is verified, Git may hold no registration for the path or only this candidate's own dangling one, that registration is retired, the step is recorded as `worktree-already-absent`, and the unchanged local topic ref is deleted under the usual compare-and-delete rule. A `complete` invocation for an absent path that was never registered blocks with `worktree-absent-unregistered`, because there is no journaled head to compare the ref against.

Post-merge provenance accepts a `merged` timeline event whose time is within five seconds of the pull request's `merged_at`; GitHub stamps the two from different services and has reported them one second apart. The single-event, human-actor, no-App, and same-commit checks are unchanged.

Windows file locks can interrupt Git after it has already unlinked the `.git` pointer and part of the tree. That pass reports `partial` with `git-operation-failed` and keeps the journal at `remove-intent`; rerunning the same command resumes it. If the exact registered worktree is still intact, the retry re-inspects it and repeats non-force Git removal. Otherwise the retry verifies the residue: Git must no longer list the path as a valid worktree, the residue may contain no `.git` entry, link, special file, or nested repository, and every remaining regular file must either sit below a declared disposable root or match the exact tracked path and blob hash of the journaled head (`git hash-object` with the repository's filters). Only residue verified that way is removed, with the same bounded retry, after which this candidate's own dangling Git registration is retired and ref cleanup continues. A residue with any unknown, changed, or boundary-violating path reports `residual-content` and lists the offending paths for manual review; a residue that is still locked reports `residual-locked` and is retried on a later pass. `git worktree prune` is never run. A recreated or foreign worktree at the path reports `residual-or-reused-path` and needs a new registration. If a prior run fully removed the worktree and only ref cleanup remains, a subsequent pass rechecks evidence and safely resumes the branch-only step.

Ownership is cooperative: managed sessions must claim before use. It cannot police arbitrary external editors. Remote ref checks and local deletion also are not one distributed transaction; refs are read immediately before destructive steps, and uncertain identities always block.

## Disable and test

Stop watch with Ctrl+C, or request immediate stop authority from another terminal:

```bash
node scripts/governance/local-worktree-cleanup.mjs disable --repo D:/Git/a1
```

Disable writes a stop sentinel without waiting for a busy mutation lock. The worker checks it before each destructive step; an already executing Git operation cannot be undone. No later deletion starts while disabled. State and partial journals remain available for review and future explicit enablement.

Dependency-free focused fixtures (temporary repositories only, no live PR mutation or watcher activation):

```bash
node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs
```

The Vitest bridge includes these fixtures in ordinary fast CI, whose runner is Windows. On Windows the suite exercises an actual exclusive file handle and a junction; a non-Windows run explicitly skips the Windows-only handle case rather than claiming it passed. Required current-head CI and a separately authorized live archive lifecycle remain necessary before acceptance; fixtures and preview do not replace those gates.
