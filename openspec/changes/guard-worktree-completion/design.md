# Design

## Evidence

- `SessionRuntimeRegistry.toolReaderFor` resolves each built-in tool's working directory through `readActiveSessionRepositoryContext`, which revalidates the recorded checkout. When the checkout is gone the validation error propagates, so read, bash, edit, write, grep, find, and ls all fail before execution. `a1 worktree detach` is only reachable through the bash tool, so it fails too. Restarting does not help: activation releases the claim but leaves the association record, and the next read fails the same way.
- Pi starts its shell tool through `Git\bin\bash.exe` with the attached checkout as the process working directory. Measured on Windows 11: a process started that way blocks `rmdir` of that directory with `EBUSY` for its whole life, even after the script runs `cd` elsewhere or starts a child that changes directory. `Git\usr\bin\bash.exe` does not. A1 itself never changes its process working directory. The #914 `residual-locked` result is therefore reproducible from the issuing shell alone; other holders (editors, indexers, dev servers) were not identified and are not assumed.

## Invalid-attachment recovery

Validation distinguishes a definitive result from an uncertain one. Definitive means the startup checkout still verifies and the recorded checkout path is missing, is not a Git repository, is not a worktree root, or resolves to a different Git directory or repository than the record. Everything else (timeouts, cancellation, I/O errors, coordination contention, an unverifiable startup checkout, a detached branch) stays uncertain and keeps today's fail-closed behavior.

On a definitive result the session's own association record and its own editing claim are removed under the existing mutation gate, and the triggering call fails with `worktree-attachment-invalid`, naming the released path and the startup root now in use. The failure is deliberate: a write the agent addressed to the task checkout is never silently applied to primary. The next call resolves to the startup root. Activation at startup applies the same rule, so a resumed session recovers without a manual step. No file, branch, or other owner's claim is touched.

`a1 worktree detach` already clears the association without validating the checkout; a test pins that. If the startup checkout itself is gone, no automatic choice is made; Pi's existing missing-session-directory prompt remains the recovery surface.

## Completion

`a1 worktree complete` runs in the issuing shell and does only non-destructive work:

1. Require the live runtime and a valid attachment owned by this session.
2. Block, staying attached, when Git has locked the checkout or `git status --porcelain` reports tracked, staged, or untracked content.
3. Under the mutation gate, remove the association and claim and write one pending-completion record (session, runtime, primary root, checkout root, Git directory, branch, optional change and PR) in A1's data directory.

Delivery evidence (merge, archive, CI, remote ref) stays with the repository adapter and is therefore checked after detach, not before. An unmerged task that runs completion ends detached with its files intact and the adapter's eligibility blocker; it can attach again. Checking evidence first would need a second, read-only adapter contract and is left out.

The shell tool wrapper then settles the record in the A1 process once the shell has exited, so nothing A1 started still holds the directory. Settling re-verifies that the primary checkout is the session's startup repository, that no live claim exists for the checkout, and that the record is recent (five minutes); it then runs the adapter and appends the outcome to the tool result. Results are `completed`, `cleanup-blocked` with the adapter's bounded output, `cleanup-unavailable`, or `cleanup-skipped` with a reason. In every case the session is already on primary and stays there; a blocked cleanup is retried with the repository's own tooling from primary.

## Cleanup adapter

`git config --local a1.worktreeCleanup` in the primary repository holds an argument template, for example `node scripts/governance/local-worktree-cleanup.mjs complete --repo {primary} --path {worktree} --change {change} --pr {pr}`. It is split on whitespace, placeholders are substituted per argument, and it runs with `execFile` (no shell) from the primary root with a bounded timeout and output. A template that needs `{change}` or `{pr}` when none was supplied yields `cleanup-unavailable`.

Local Git configuration is set by the machine owner, is not part of any checkout, and already carries `a1.worktreeBase`; it has the same trust as Git aliases and hooks. Tracked files of a task checkout never select the command. The adapter keeps all eligibility, evidence, content, and compare-and-delete checks; A1 adds none of its own deletion.

## Cleanup guard

`local-worktree-cleanup.mjs` reads A1's claim records for the candidate path before destructive work and blocks with `attached-session` when the recorded process is alive. It needs no A1 installation: an absent store means no claim. This protects agents that still call cleanup directly.

## Guidance

`AGENTS.md`, `docs/features/worktrees.md`, the worktree protocol, the cleanup runbook, the delivery runbook's cleanup section, and the bash tool guideline state one lifecycle: stay attached through implementation and review; after a verified merge run `a1 worktree complete`; never clean the attached checkout directly; plain detach keeps files. XR Build gets the same block in its own repository and delivery.

## Authorization

The maintainer reviewed the recovered handoff plan for this work and asked for it to be implemented. Integration remains a separate maintainer decision.
