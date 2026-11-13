# Local worktree cleanup after verified delivery

Read and follow [Shared delivery rules](delivery-rules.md), using this repository's entry in [Delivery adapters](delivery-adapters.json). This runbook supplies command syntax, evidence formats and recovery details; the shared rules own preservation and deletion authority.

Local cleanup completes the delivery order in [the archive runbook](openspec-archive-automation.md). For version 3 that is one authorized manual implementation/acceptance/archive merge, read-only verification, remote topic-ref deletion, then safe local cleanup. Legacy versions still require their applicable acceptance-record and automatic archive merges. GitHub Actions never reaches into a developer machine. Local cleanup never publishes archives or merges PRs; `complete`, `retire-redundant`, preview, and queue/watch do not delete remote refs, while explicitly confirmed closed-unmerged `discard` owns only its exact expected-SHA topic-ref deletion.

The implementation is repository tooling, not part of the installed A1 product. It requires Node, Git, and GitHub read access; the explicit closed-unmerged discard operation additionally requires authenticated permission to delete its exact remote topic ref. No product build, dependency installation, interactive UI, or OS-service provisioning is needed. It supports this repository's `origin` on github.com, via HTTPS or SSH. The repository-local `remote.origin.url` must retain that canonical GitHub spelling; Git may still rewrite the effective transport through `url.*.insteadOf` to select an account-specific SSH host/key. A literal SSH alias remains unsupported because cleanup does not trust external SSH configuration as repository identity.

If the whole repository moves to another canonical path or Windows drive, a carried cleanup journal still names the old absolute paths. Read-only `status` and `preview` report `state-relocation-required` and never rewrite it. The next mutation-locked operation safely rebases the journal only when every recorded entry is completed terminal history, the repository and remote identities still match, and every historical path is beneath the old recorded worktree root. The migration is atomic and changes only repository/path fields; the requested current worktree is then captured afresh and must pass every ordinary cleanup gate. Any owned, released, partially deleting, malformed, escaped, or identity-mismatched entry blocks relocation without changing the journal or local resources.

## Cleanup decisions

Use one clear request for one identified scope; do not ask the maintainer to repeat a decision already supplied. Tool confirmation flags encode that authority and are not a reason for another conversational confirmation.

| Request | Action |
| --- | --- |
| Ordinary cleanup of completed work | Use `sweep` for released candidates or exact `complete`; retain every reported blocker. |
| Delete one identified export | Follow [export decisions](#export-decisions); preservation is not mandatory. |
| Preserve one identified export | Use optional [named-export preservation](#explicit-named-export-preservation). |
| Discard a rejected change and its remote branch | Use exact confirmed `discard` only when both rejection and remote deletion are authorized. One explicit request can supply both. |
| Stop development processes, remove a disposable link, retire a redundant checkout, or enable background cleanup | Use the corresponding exact authorized operation below; generic cleanup does not imply these extra permissions. |
| Ambiguous file, conflicting owner, dirty work, unavailable evidence, or a lock | Retain the affected scope and report the actionable blocker. Ask only for a missing decision; do not repeat an unchanged attempt without a reason. |

Automatic cleanup remains conservative. Explicit file decisions do not weaken worktree/branch eligibility, ownership, content, link, process, or compare-and-delete safeguards. Use integrated tooling from primary, not unmerged task tooling against live worktrees. Detailed journals, races, and recovery belong in tooling and the sections below; user-facing reports should state the result or blocker concisely.

## Hand-off and sweep: the ordinary agent path

Cleanup enrollment is the separately explicit local operation described in [R12](delivery-rules.md#r12---portable-handoff). To enroll an owned candidate from primary, use:

```bash
node scripts/governance/local-worktree-cleanup.mjs handoff   --repo D:/Git/a1   --path D:/Git/a1/.worktrees/example-task   --change example-change   --pr 123
```

`handoff` registers the exact worktree if it is not registered yet (or reclaims the existing released entry), records its current HEAD and branch, applies the central disposable policy, and releases it. It evaluates nothing, deletes nothing, and does not enable the queue. That release is the candidate-scoped cleanup authorization for this worktree and its topic ref, exercised only once the merge, archive, validation, and remote-ref gates verify later; it never becomes discard authority for a PR that is later closed unmerged. It is idempotent per worktree: repeating it updates the recorded head instead of adding a second registration. Tracked, staged, unstaged, or untracked content outside the disposable roots blocks with `worktree-content` and the affected paths, because such content means unpushed work; unknown ignored content is judged at removal time, as it is for `complete`. A primary, foreign, replaced, or branch-changed path blocks with a named reason. A worktree that a session registered with the low-level `register` command and still owns is released by `handoff` (or `complete`) when `LOCAL_CLEANUP_OWNER_TOKEN` holds that registration's token; without it both block with `owned-worktree`, and a separate `release` is needed.

For a separately scoped bounded sweep of released registrations from primary ([R15](delivery-rules.md#r15---runtime-and-cleanup-boundaries)), use:

```bash
node scripts/governance/local-worktree-cleanup.mjs sweep --repo D:/Git/a1
```

`sweep` evaluates every released registration in one pass under the queue limits (100 registrations, 500 remote requests, a durable round-robin cursor) with a 180-second elapsed budget, since each merged candidate costs three evidence loads, and completes each candidate whose PR is verified merged using exactly the `complete` safeguards. It needs no `enable` and starts no process: its authority is each candidate's release. A candidate whose PR is open, draft, or not yet finalized reports `pending`; a candidate whose PR closed without merge reports `awaiting-discard` and is never touched; blockers report their exact reason. An old stop sentinel does not prevent a sweep, but `disable` run while a sweep is executing stops it before its next destructive step. If another session is cleaning the same path or ref, sweep reports that candidate `deferred (resource-busy)` and continues with disjoint registrations. The JSON report carries a `lines` array with one relayable line per candidate and pruned branch, for example `#458 close-absent-and-skewed-cleanup: removed [worktree-removed, local-ref-removed]`. Pending, deferred, or blocked results never delay another candidate or the new delivery.

### Concurrent cleanup scopes

Independent `complete`, `discard`, `retire-redundant`, sweep, and enabled queue operations may run at the same time when their canonical worktree paths and topic refs are disjoint. Long remote evidence reads, content traversal, Windows retry waits, generated-content purge, and non-force removal hold only the exact path/ref resource locks. The same candidate remains exclusive across ownership, hand-off, cleanup, empty-directory recovery, and branch pruning; a competing command receives `resource-busy` rather than racing the journal.

The existing `mutation.lock` now protects only brief atomic `state.json` transactions and remains at the same path so an older cleanup process already running during an upgrade is still honored. State-lock overlap is retried for a bounded interval. Fetches that update `refs/remotes/origin/develop` and exact local-ref changes coordinate only that shared ref operation; they do not serialize the surrounding candidate work. Every destructive boundary still repeats its existing evidence, identity, content, and compare-and-delete checks.

### Standalone documentation evidence

A PR without an `openspec-implementation` fence does not require corrective implementation association when its complete changed-file list is standalone documentation under the repository's existing documentation lifecycle policy. This includes ordinary documentation, the root `README.md`, canonical specification revisions, and revisions to existing active-change or archived-change documentation. Cleanup reuses the same path allowlist and immutable lifecycle checks as documentation auto-merge rather than maintaining a broader cleanup-only definition.

The PR must be non-draft, same-repository, merged into `develop`, and bound to the registered PR, head, and branch. Cleanup additionally requires successful required CI for that exact head, the merge commit to remain an ancestor of current `develop`, and the remote topic ref to be absent. Introduced active changes, implementation/code or mixed paths, release notes, acceptance records, malformed lifecycle metadata, incomplete changed-file evidence, and invalid rename shapes do not qualify. Those cases remain on their existing implementation-association or fail-closed paths.

Qualifying documentation uses the ordinary cleanup path without weakening it: exact worktree and local-ref identity, ownership, clean content, generated-content inspection, journaling, non-force Git removal, residue handling, and compare-and-delete local-ref behavior remain required. A blocker at any gate retains the worktree; agents never substitute manual deletion.

### Nothing left to remove

A released entry whose evidence can never verify (for example `delivery-content-drift` after a stale-base merge, or `source-association` for an unassociated implementation PR) would otherwise be re-verified and reported `blocked` on every sweep. One narrow exception repairs an integrated unassociated delivery without rewriting its merged body: current `develop` must contain exactly one archived `association-repair.json` for the registered change, naming the exact original PR/head/merge and successful validation run, and its named corrective version-3 PR must itself have authorized manual merge, current exact-head CI, synchronized specs, a valid archive, and absent original/corrective remote refs. Only then does cleanup continue through all ordinary worktree identity, ownership, cleanliness, disposable-content, non-force removal, journaling, and local-ref safeguards. A mismatch remains blocked and generic merge/archive evidence never substitutes.

When no valid corrective association exists and such an entry's worktree path is gone, Git holds no live row for it (its own dangling row is retired), and its local topic ref is absent, the sweep and `complete` ask GitHub only whether the pull request merged into `develop` in this repository and then mark the journal `done` with `retired-nothing-left` and the original evidence reason. Nothing is deleted; a present path, row, or ref keeps the entry blocked, an unmerged PR keeps it `pending` or `awaiting-discard`, a deferred failure such as `remote-budget` is never treated as unverifiable, and preview retires nothing. For an all-absent entry whose PR is not merged, the maintainer runs the explicit form, which reads nothing from GitHub and deletes nothing:

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

The central disposable policy is `node_modules`, `dist`, `.builds`, `.artifacts`, `native/process-guardian/target`, `native/terminal-host/target`, and the exact generated file `src/integrations/pi/engine/pi-settings-metadata.json`. The `.artifacts` root is the repository's ignored generated-artifact root (finalization and validation reports, packed candidates, agent-written logs and diffs); the two native roots contain repository-generated Cargo output; Vitest writes the metadata file for source-side settings tests and leaves it shared for overlapping test processes until worktree cleanup. Agents select the owning worktree's `.artifacts/` root for their own transient delivery files rather than OS temp or another checkout, but its disposable status never makes scratch authoritative or permits secrets to be stored there. Registrations that still name `.artifacts/openspec-archive` or `.artifacts/validation` stay valid and are widened to the current policy on the next `complete`.

Each approved root must be an ignored regular file, directory, symbolic link, or Windows junction at that exact path inside the exact worktree. An exact-root link may target an external generated-content directory; cleanup records its link classification, filesystem identity, and canonical target, revalidates all three immediately before deletion, and removes only the link entry through a non-recursive primitive. It never traverses, removes, or mutates the external target. A descendant link remains stricter: its canonical target must stay inside that same exact disposable root. Escapes by descendant links, drift, replacements, unresolved/cyclic targets, special files, and nested repository boundaries remain blocking. Authority is component-exact: near matches such as `.artifacts-user`, `artifacts`, or `pi-settings-metadata-user.json`, arbitrary `target` directories, and sibling native projects remain blocking. Tracked/staged/unstaged/untracked content and every unknown ignored path still block. A tracked regular `.gitmodules` file alone is ordinary content; actual nested `.git` metadata, gitlinks, configured submodules, and submodule changes block. Ordinary content and these approved generated paths are traversed under separate finite entry allowances, so a normal dependency installation does not consume the ordinary source-tree allowance; both allowances retain the same deadline and content-boundary checks. Once those checks pass, cleanup deletes the declared disposable roots or files itself with a bounded retry for transient Windows sharing violations before handing the worktree to Git, so non-force Git removal only has to delete tracked content. A disposable path that stays locked after the retry budget reports `blocked` with `disposable-path-locked` (or `disposable-link-locked` for a link entry) and the path; the worktree, its `.git` pointer, and its journal are untouched, so stop the process holding the handle and rerun the same command.

Eligible candidates now receive a combined local preflight before purge. JSON reports retain the primary `reason` and add `blockers` plus `developmentProcesses`, so an export and a running development instance are reported together. Only paths, PIDs, parent/start identities, and script paths are reported; file contents and full command lines are never included. Process-inspection failure is a named blocker, not an empty inventory.

An exact `complete` invocation may additionally use `--stop-dev-processes`. This is explicit candidate-scoped authority, available only after merged/released eligibility and clean-content checks. It rechecks exact checkout code and process-start identity before stopping, protects the caller and its ancestors, bounds settlement, and repeats ordinary cleanup checks. Other worktrees, installed releases, unverifiable processes, and genuine local changes remain protected. Ordinary sweeps and previews never stop processes. Example:

```bash
cd /d/Git/a1 && node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/example-task --change example-change --pr 123 --stop-dev-processes
```

Inside an A1 session attached to the candidate, do not run this command yourself: run `a1 worktree complete --change example-change --pr 123`, which returns the session to primary and then runs this same command as declared in the repository's `.a1/worktree.json` (see [worktree commands](features/worktrees.md#completing-a-merged-task)). `complete`, sweep, and the queue report `blocked` with `attached-session` while a running A1 session still has the checkout attached, and `attached-session-unverifiable` when that checkout's claim record cannot be read; the check reads A1's claim record only, changes nothing, and needs no A1 installation. Explicit `discard` and `retire-redundant` do not yet apply it.

Agents do not manually remove generated content, call `git worktree remove`, or delete the local branch after delivery. The JSON result is authoritative: report success only for `removed` or verified `already-absent`; otherwise retain the worktree and report the exact blocker. A handed-off entry whose worktree was deleted by hand completes through its journal, and its branch is deleted under the accepted-ancestry rule. Legacy roles can supply separate `--source-pr`, `--candidate-pr`, and `--role` values.

## Explicit closed-unmerged discard

Closing a PR does not itself authorize deletion. Require explicit rejection of the exact PR and authority to delete its remote branch; one clear request may supply both. Then run the candidate-scoped command from the primary checkout:

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

### Closed-unmerged branch without a checkout

Use the same explicitly confirmed `discard` operation with `--branch` instead of `--path` when the checkout is already gone and no live cleanup registration owns the ref. The selectors are mutually exclusive:

```bash
cd /d/Git/a1 && node scripts/governance/local-worktree-cleanup.mjs discard --repo D:/Git/a1 --branch feature/rejected-example --change rejected-example --pr 123 --confirm-closed-unmerged
```

Branch mode verifies the named same-repository PR is still closed-unmerged into `develop`, its implementation association matches the requested change, no other open PR uses the branch, no Git worktree has it checked out, and no nonterminal registration owns the ref. Protected/reserved refs, advanced local or remote tips, malformed evidence, conflicting journals, and scoped lock contention block. It never creates a checkout, invents a filesystem identity, deletes a directory, or adopts a worktree.

A branch-scoped `branch-discard-<ref-digest>.json` journal beside the ordinary cleanup state pins the repository, exact ref, change, PR, expected head, and deletion step without changing existing worktree records. After local preflight, the command journals intent, revalidates live evidence, expected-head deletes only the remote ref, verifies remote absence, and compare-and-deletes the unchanged local ref. Absent refs support resumption. Repeated completed requests report `already-discarded` only while both refs remain absent; a recreated ref is retained as `discard-ref-recreated`. Command reports, not the worktree-only registration list, describe this branch-scoped state. Sweep and queue never invoke branch-only discard.

## Export decisions

Default bare-A1 exports live in `~/.a1/exports/`; see [session exports](features/session-exports.md). An existing worktree export is user data, not an automatic cleanup disposable.

- **Delete:** an explicit request to delete one identified export is sufficient. Its exact path or an unambiguous previously reported blocker in the same interaction identifies the file; do not demand a copy or another preservation confirmation. Verify the candidate and ownership, regular-file identity, untracked HTML/JSONL status, and real non-link ancestors within that worktree. Recheck identity immediately before non-recursively unlinking only that file. Do not follow links, delete directories, remove tracked content, or resolve another owner's blocker by deleting their files.
- **Preserve:** when chosen, use the optional confirmed operation below. Its verified-copy and journal safeguards remain unchanged.
- **Unspecified:** a generic cleanup request does not authorize deleting unknown exports. Report the file and ask only whether to retain, preserve, or delete it. Do not add a blanket filename pattern to ignored/disposable content.

Either file decision leaves subsequent worktree and branch removal to integrated cleanup tooling with every ordinary safeguard intact. A deletion request does not authorize overriding another blocker.

## Explicit named-export preservation

This optional operation is for a maintainer who wants to keep a named legacy export. It is not a prerequisite when deletion was explicitly requested. Run it from primary:

```bash
cd /d/Git/a1 && node scripts/governance/local-worktree-cleanup.mjs preserve-export --repo D:/Git/a1 --path D:/Git/a1/.worktrees/example-task --change example-change --pr 123 --file session.html --confirm-preserve-export
```

The exact candidate must already be registered and released, with verified merged/archive/CI evidence and absent remote topic refs. The selected path must be a regular untracked HTML/JSONL file with real non-link ancestors. Tracked/staged/modified selected content, another unknown-content blocker, active/foreign ownership, links, path escapes, or unverifiable evidence retain the worktree and source.

The operation exclusively creates a private destination in `~/.a1/exports/`, flushes and verifies its bytes, journals identities and hashes outside the worktree, revalidates the source/candidate/destination, then removes only the selected original pathname. It does not remove the worktree, delete refs, stop processes, enable automation, or widen ordinary cleanup authority. Reports contain metadata only. An interrupted verified copy or source-unlink step resumes through the same exact command and journal; changed or unverifiable source/destination paths remain protected. A partial or conflicting unverified copy is retained for inspection, never overwritten.

After `preserved`, run ordinary `complete` or a sweep again. Only those commands can remove the checkout, and they repeat all normal safeguards. Do not run an unmerged worktree's new cleanup tooling against live worktrees; use integrated policy from primary.

## Explicit disposable-link remediation

Ordinary completion and sweep still refuse external descendant links. For one released, eligible merged candidate, a separately confirmed `unlink-disposable-link` operation can remove one explicitly named ignored descendant link beneath a central disposable root without admitting its external target into purge:

```bash
cd /d/Git/a1 && node scripts/governance/local-worktree-cleanup.mjs unlink-disposable-link --repo D:/Git/a1 --path D:/Git/a1/.worktrees/example-task --change example-task --pr 123 --link .artifacts/agent/shared-node-modules --confirm-link-only
```

The command requires the existing released registration, exact candidate/change/PR, accepted HEAD ancestry, eligible merged/archive evidence, absent remote topic ref, and clean local content except for that one named link. Invoke it from primary, with no known conflicting editor, using integrated repository policy. Owned, current, replaced, dirty, ineligible, unregistered, or resource-busy candidates remain blocked. Other unsafe links remain blockers; no wildcard or bulk-link option exists.

Only a relative slash-separated path strictly below a central disposable root is accepted. The path must be ignored and untracked, its parents must be real non-link directories inside the canonical worktree, and its final entry must be a resolvable symlink or junction with a target outside that worktree. Internally targeted links remain on the ordinary generated-content path and are rejected by this no-target-enumeration operation. Escapes, root substitutions, ordinary files/directories, cycles, Git-metadata targets, identity/target/parent drift, and locked links block. The command revalidates candidate authority, full local content, ancestor identities, link fingerprint, and target before every bounded non-recursive unlink attempt, including Windows junction fallback. It never enumerates, traverses, modifies, or removes the target.

An `unlinked` report records the candidate and removed link identity without target contents. The worktree and its released registration remain intact; a later ordinary `complete` or sweep must independently repeat every normal gate. The operation enables nothing, deletes no ref, does not grant ongoing link-removal authority, and cannot repair locked leftover directories. A missing selected link reports a named blocker rather than fabricating prior success.

## Explicit redundant no-PR retirement

A non-empty unregistered checkout is never adopted by sweep, preview, queue/watch, branch pruning, age, or ancestry. After the maintainer explicitly authorizes one exact redundant checkout, use the repository-owned operation from the primary checkout:

```bash
node scripts/governance/local-worktree-cleanup.mjs retire-redundant \
  --repo D:/Git/a1 \
  --path D:/Git/a1/.worktrees/redundant-task \
  --confirm-redundant
```

The command requires an exact canonical, unlocked, non-current Git worktree on a normal topic branch; no cleanup registration; no pull request in any state for that branch; no remote topic ref; no unique commit beyond freshly fetched `origin/develop`; and no staged, unstaged, untracked, hidden-index, unknown ignored, nested-repository, submodule, or other protected content. Central-policy generated content is inspected and purged normally. Under its exact path/ref resource locks, with brief atomic state transactions, the command revalidates every gate, journals the captured filesystem/HEAD/ref identity, removes the checkout non-forcibly, and compare-and-deletes only the unchanged local ref. It never removes a remote ref or enables broad cleanup authority.

A repeated exact confirmed invocation resumes a partial journal or reports `already-retired`. A branch with any pull request remains owned by `complete`/sweep or explicit closed-unmerged `discard`; an open, dirty, remote-backed, locally advanced, registered, locked, detached, protected, replaced, or ambiguous checkout remains retained. Agents never substitute manual deletion when this command blocks.

## Preview first

From a checkout containing the reviewed tooling:

```bash
node scripts/governance/local-worktree-cleanup.mjs preview --repo D:/Git/a1
node scripts/governance/local-worktree-cleanup.mjs status --repo D:/Git/a1
```

`--repo` is the **primary** worktree, not a task worktree. Preview reads live evidence but changes no worktrees, refs, ownership state, or retry checkpoints. Status is local-only. Existing folders are reported `unmanaged` and are never adopted by preview or sweep from their name, missing upstream, or ancestry; only a separate exact `retire-redundant --confirm-redundant` invocation can evaluate the narrowly defined no-PR shape above. Preview reports a folder that an execution pass would remove as an empty leftover with `empty-directory` (see below) but deletes nothing. Neither command enables cleanup.

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

- `implementation`: exact merged implementation PR head, or exact merged standalone-documentation PR head under the policy above; candidate PR equals source PR. This is the only version-3 role because the same PR contains implementation, acceptance manifest, synchronized specs, and archive.
- `acceptance`: legacy exact verified implementation merge commit; candidate PR equals source PR.
- `archive`: legacy exact merged generated archive PR head; candidate PR is the archive PR and source PR is the implementation PR.

A CI/base/older-ancestor checkout does not qualify automatically. Version 3 has no local acceptance/archive checkout to register. No local archive checkout is required when a legacy archive was generated entirely on GitHub. Legacy version-1/version-2 linkage remains supported, but individually reviewing and registering a legacy checkout is explicit adoption, not a bulk sweep.

Low-level `register` keeps an explicit disposable allowlist for legacy and diagnostic use. The standard `complete` command supplies the central repository policy automatically; agents do not choose flags for normal completed-delivery cleanup. Neither route permits discarding tracked, staged, unstaged, untracked, unknown ignored, unapproved linked, special, or actual nested repository/submodule content. Automatic purge admits only the guarded exact-root or contained descendant behavior above. Separately confirmed named-link remediation removes only its exact link entry and never widens purge authority. Declaring or centrally recognizing a generated directory does not bypass ignored-path, identity, type, or traversal checks.

Before handing a completed checkout to cleanup, stop its development processes, leave its directory, and release it using the returned ID and current generation:

```bash
node scripts/governance/local-worktree-cleanup.mjs release --repo D:/Git/a1 --id REGISTRATION_ID --generation CURRENT_GENERATION
```

Release verifies ownership and the original directory, records the owner's current final HEAD/ref, and returns a new generation. It does not declare acceptance or archival. For version 3 the worker verifies the exact authorized human manual source merge, required CI, conditional manifest, synchronized specs/archive on current `develop`, and absence of the source topic ref. For legacy versions it still verifies the exact comment or human-manually-merged acceptance receipt, generated archive marker/merge/CI, archive contents, and all applicable topic refs. A bot/automatic/merge-queue acceptance, stale record, missing required CI, unmatched archive, or open/closed-unmerged PR blocks cleanup.

After a low-level release, request a pass from the stable checkout if queue cleanup is enabled. A running watcher will also pick it up. Normal completed delivery instead uses `complete`. Never release another session's worktree or use a clean status/dead PID as a substitute for ownership.

## Resume or recover ownership

This protocol works for external agents without an A1 installation, runtime, or session link. First verify the exact delivery branch, change, and PR plus continuing editing ownership or explicit handoff under the [worktree protocol](architecture/project-structure.md#development-worktrees). Inspect Git locks and this tool's `status` from the primary checkout. A familiar path, clean status, or missing A1 runtime is not evidence of another editor's absence. Known live editing claims, foreign cleanup ownership, Git locks, and unverifiable handoffs block reuse.

For a worktree with no cleanup registration, this tool supplies no ownership claim: a fresh checkout created by this session or verified continuing ownership/explicit handoff establishes editing provenance. Do not register with fabricated PR identities or create a cleanup claim solely to simulate an A1 link. For a released registration, the atomic claim below is mandatory before editing; an already-owned registration requires matching owner authority. A failed claim never authorizes recovery or takeover. A successful cleanup claim prevents cleanup but does not prove exclusive editing ownership, and an A1 runtime link does not claim the cleanup journal. Both remain cooperative, independent safeguards.

Before resuming a released worktree, acquire it:

```bash
node scripts/governance/local-worktree-cleanup.mjs claim --repo D:/Git/a1 --id REGISTRATION_ID --generation CURRENT_GENERATION
```

Use a private token for the new session. Claim, release, hand-off, and cleanup share the candidate's exact path/ref resource locks and commit their state changes through brief repository-state transactions. A successful claim prevents deletion until the new owner releases it. A deleting or completed candidate cannot be claimed. A path reused after completed cleanup requires a new explicit `register` operation.

A session crash does not release ownership. After separately confirming that the owner and all related processes have stopped, an explicit recovery claims it for review:

```bash
node scripts/governance/local-worktree-cleanup.mjs recover --repo D:/Git/a1 --id REGISTRATION_ID --generation CURRENT_GENERATION --confirm-stopped
```

Recovery never releases or deletes. The generation must still match. A Git worktree lock remains a veto. A leftover repository-state or scoped resource lock from a killed cleanup process is evicted only on proof: the holder writes its PID and refreshes a heartbeat in the lock every five seconds, and a later operation needing that scope evicts the lock only when that heartbeat (or, for an old lock without one, the file's modification time) is more than two minutes old and the PID no longer exists. A live, unprobeable, or own PID keeps the lock, as does a fresh or unreadable-but-fresh file, and the affected operation reports `mutation-busy` for legacy/state contention or `resource-busy` for a candidate/ref scope. Each eviction is journaled as `lock-evicted-<time>-<id>.json` beside `state.json` with the evicted record; it releases no ownership and advances no journal step. A live scoped holder delays only commands needing that same path or ref.

## Outcomes and interruption handling

State, journals, stop controls, and execution reports live in `<git-common-dir>/local-worktree-cleanup/`, outside removable checkouts. `status` omits owner-token hashes. Reports contain identities, local blockers, performed steps, and coverage, never file contents or credentials. Completed reports are retained for 30 days subject to a 10 MiB cap; unresolved queue/journal records are not evicted.

- `eligible`: preview passed the gates; nothing was removed.
- `pending`: archive/ref prerequisites have not finished, or the handed-off PR is still open.
- `awaiting-discard`: the handed-off PR closed without merge; only the explicit `discard` command may act.
- `blocked`: ownership, content, path, provenance, authentication, or identity needs attention.
- `unmanaged`: no local registration; no automatic adoption. Reason `empty-directory-recent` marks an all-empty folder still inside its ten-minute grace, and in preview `empty-directory` marks one an execution pass would remove.
- `removed`: worktree and eligible local-ref operations were verified.
- `unlinked`: only the explicitly named disposable link entry was removed; its target, worktree, and released registration were preserved.
- `already-absent`: a completed journal's path/ref are still absent.
- `retired`: either evidence was unverifiable but nothing remained to delete and the merged PR registration completed with `retired-nothing-left`, or an exact confirmed `retire-redundant` operation safely removed its no-PR checkout and local ref.
- `forgotten`: the maintainer explicitly closed an all-absent entry with `forget`.
- `partial`: a destructive step began but all cleanup could not be verified; the same command resumes it.
- `deferred`: a bounded pass or concurrent mutation owner prevented evaluation.

Empty leftovers under `.worktrees/` are the one unregistered shape a pass removes. Git's own `worktree remove` deletes the checkout's files and then its administrative directory even when the final directory removal failed because a shell, editor, or indexer still held the folder open, so an empty top-level folder with no Git row, branch, or registration can outlive its worktree. Every execution pass (`sweep`, `complete`, `discard`, `once`, `watch`) scans the root and removes such a folder only when it is a real directory rather than a link, Git lists no worktree row for its path, its whole subtree holds nothing but directories (no file, link, special entry, or `.git` at any depth), and its modification time is at least ten minutes old so an in-progress `git worktree add` or removal is never raced. Removal is bottom-up with the non-recursive directory primitive only, which cannot delete a file that appeared after verification; it is reported `removed (empty-directory)` with step `empty-directory-removed` and named in the sweep lines. A folder still held open reports `blocked (empty-directory-locked)` and is retried on the next pass; anything containing content stays `unmanaged` and is never touched.

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

Disable writes a stop sentinel without waiting for a busy state or resource lock. The worker checks it before each destructive step; an already executing Git operation cannot be undone. No later deletion starts while disabled. State and partial journals remain available for review and future explicit enablement.

Dependency-free focused fixtures (temporary repositories only, no live PR mutation or watcher activation):

```bash
node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs test/repository-governance/local-cleanup-attachment.node.mjs
```

The Vitest bridge includes these fixtures in ordinary fast CI, whose runner is Windows. On Windows the suite exercises an actual exclusive file handle and a junction; a non-Windows run explicitly skips the Windows-only handle case rather than claiming it passed. The handle fixture starts one throwaway `powershell.exe` when the file loads so the hosted runner's interpreter cold start overlaps the earlier tests instead of the fixture's timed hold; its bounds and release protocol are unchanged. Required current-head CI and a separately authorized live archive lifecycle remain necessary before acceptance; fixtures and preview do not replace those gates.
