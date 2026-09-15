# Local worktree cleanup after automatic archival

Local cleanup completes the delivery order in [the archive runbook](openspec-archive-automation.md): implementation merge, verified manual acceptance-record **merge**, automatic OpenSpec archive **merge**, remote topic-ref deletion, then safe local cleanup. GitHub Actions never reaches into a developer machine. This command neither publishes archives nor merges PRs or deletes remote refs.

The implementation is repository tooling, not part of the installed A1 product. It requires Node, Git, and GitHub read access. No product build, dependency installation, interactive UI, or OS-service provisioning is needed. It supports this repository's `origin` on github.com, via HTTPS or SSH.

## Preview first

From a checkout containing the reviewed tooling:

```bash
node scripts/governance/local-worktree-cleanup.mjs preview --repo D:/Git/a1
node scripts/governance/local-worktree-cleanup.mjs status --repo D:/Git/a1
```

`--repo` is the **primary** worktree, not a task worktree. Preview reads live evidence but changes no worktrees, refs, ownership state, or retry checkpoints. Status is local-only. Existing folders are reported `unmanaged` and are never adopted by their name, missing upstream, or ancestry. Neither command enables cleanup.

Remote reads use `GH_TOKEN`/`GITHUB_TOKEN`, otherwise existing `gh auth token --hostname github.com` authentication. Do not put tokens in command arguments, source files, reports, or PR comments. Missing/expired private-repository authentication blocks evidence checks.

## Explicit local enablement

Only after the maintainer authorizes activation, use the reviewed tool in the primary/stable checkout outside `.worktrees/`:

```bash
node scripts/governance/local-worktree-cleanup.mjs enable --repo D:/Git/a1
node scripts/governance/local-worktree-cleanup.mjs once --repo D:/Git/a1
```

`enable` only records permission; it does not start a process or remove anything. `once` evaluates at most one bounded pass. Mutation commands `once` and `watch` refuse tooling loaded from inside the target repository's removable root. For pre-merge isolated tests, the test repository is a separate disposable temporary repository, not the working repository itself.

For eventual cleanup after asynchronous archive integration, run watch mode in a separate terminal or an explicitly managed local process:

```bash
node scripts/governance/local-worktree-cleanup.mjs watch --repo D:/Git/a1
```

It runs one immediate pass and retries at five-minute intervals, with rate-limit backoff and no overlapping mutations. Each pass is bounded to 100 registration evaluations, 500 remote requests, and 60 seconds; individual subprocess/remote calls have a 10-second deadline. Local content traversal is additionally bounded to 20,000 entries; insufficient inspection never grants deletion authority. Reports identify incomplete coverage. A durable round-robin cursor lets later pending candidates run on subsequent passes.

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

- `implementation`: exact merged implementation PR head; candidate PR equals source PR.
- `acceptance`: exact verified implementation merge commit; candidate PR equals source PR.
- `archive`: exact merged generated archive PR head; candidate PR is the archive PR and source PR is the implementation PR.

A CI/base/older-ancestor checkout does not qualify automatically. No local archive checkout is required when the archive was generated entirely on GitHub. Legacy version-1 implementation linkage remains supported, but individually reviewing and registering a legacy checkout is explicit adoption, not a bulk sweep.

The disposable ignored-path allowlist defaults to **empty**. Only append flags such as `--disposable node_modules --disposable dist` when those exact generated directories may be discarded. This is not permission to discard tracked, staged, or untracked changes. Unknown ignored data, nested repositories/submodules, links, and special files remain blockers. Declaring a generated directory does not bypass safety or traversal bounds.

Before handing a completed checkout to cleanup, stop its development processes, leave its directory, and release it using the returned ID and current generation:

```bash
node scripts/governance/local-worktree-cleanup.mjs release --repo D:/Git/a1 --id REGISTRATION_ID --generation CURRENT_GENERATION
```

Release verifies ownership and the original directory, records the owner's current final HEAD/ref, and returns a new generation. It does not declare acceptance or archival. The worker still verifies the actual merged implementation, exact legacy-comment or human-manually-merged acceptance receipt, automatic archive markers/merge/CI, current `develop` archive contents, and live absence of implementation, acceptance, and archive topic refs. An acceptance merge alone remains ineligible. A bot/automatic/merge-queue acceptance, stale record, missing acceptance-head CI, or unmatched archived receipt blocks cleanup. It will not remove an open or closed-unmerged PR's worktree.

After release, request a pass from the stable checkout if cleanup is enabled. A running watcher will also pick it up. Never release another session's worktree or use a clean status/dead PID as a substitute for ownership.

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

Recovery never releases or deletes. The generation must still match. A Git worktree lock remains a veto. A leftover `mutation.lock` from a crashed cleanup process also remains a veto: stop all cleanup/claim processes, inspect the lock and `state.json`, and obtain explicit approval before manually removing that identified lock. There is no automatic stale-lock eviction or PID-based deletion.

## Outcomes and interruption handling

State, journals, stop controls, and execution reports live in `<git-common-dir>/local-worktree-cleanup/`, outside removable checkouts. `status` omits owner-token hashes. Reports contain identities, local blockers, performed steps, and coverage, never file contents or credentials. Completed reports are retained for 30 days subject to a 10 MiB cap; unresolved queue/journal records are not evicted.

- `eligible`: preview passed the gates; nothing was removed.
- `pending`: archive/ref prerequisites have not finished.
- `blocked`: ownership, content, path, provenance, authentication, or identity needs attention.
- `unmanaged`: no local registration; no automatic adoption.
- `removed`: worktree and eligible local-ref operations were verified.
- `already-absent`: a completed journal's path/ref are still absent.
- `partial`: a destructive step began but all cleanup could not be verified.
- `deferred`: a bounded pass or concurrent mutation owner prevented evaluation.

Non-force Git removal is the only worktree deletion operation. Local topic-ref deletion then compares the exact old SHA and refuses refs checked out elsewhere. `develop`, primary/current directories, changed heads, and active sessions are protected. Normal removal retires its own Git worktree registration; unrelated stale/missing registrations are never globally pruned.

Windows file locks can leave a directory after Git removes part of a worktree. `partial` retains that residue and its journal; there is no `rm -rf`, force discard, or automatic directory-repair fallback. Stop the locking process and review the exact residual data before separately authorized manual repair. A recreated path is not the old checkout. If a prior run fully removed the worktree and only ref cleanup remains, a subsequent enabled pass rechecks evidence and safely resumes the branch-only step.

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
