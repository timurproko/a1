# Worktree commands

A1 owns worktree creation, attachment, cooperative editing claims, and ordinary recovery. Repository instructions only guide agents to these commands; they do not implement a second verification or lock-management procedure.

## Command contract

Run these commands through an active A1 session's shell tool:

| Command | Result |
| --- | --- |
| `a1 worktree enter <type/short-description> [--base <branch>]` | Create or resume the matching task checkout and attach it. |
| `a1 worktree attach <absolute-path>` | Attach an existing registered task checkout in this session's repository. |
| `a1 worktree detach` | Release this session's attachment without deleting files or branches. |
| `a1 worktree complete [--change <id>] [--pr <number>]` | After a verified merge: return this session to the startup checkout, then run the repository's configured cleanup. |
| `a1 worktree list` | Informational same-repository inventory; never required after success. |

Successful enter/attach returns the canonical root and branch after acquiring the editing claim. It is the complete attachment result: agents do not run a second inventory approval gate or implement their own retry loop. Temporary registration/coordination contention is retried within an operation budget. Actual ownership conflicts and uncertain records produce actionable failures rather than unsafe takeovers. A failed switch preserves the prior attachment. No command removes worktrees, branches, user files, or private workspace data itself; `complete` only runs the cleanup command the repository declares.

Enter uses `.worktrees/<short-description>` under the primary checkout. An existing matching checkout is attached without rewriting its edits. Otherwise it fetches an existing origin task branch and starts a missing local branch at that observed proposal head. An unoccupied local branch retains its exact tip, including unpublished commits; divergent local/remote histories block entry. If neither task branch exists, it fetches the selected base before creating the branch. Base selection is explicit `--base`, local Git configuration `a1.worktreeBase`, then the origin default branch; local-only repositories fall back to the primary branch. Path collisions, primary checkouts, foreign repositories, and Git-locked worktrees remain protected. Setup commands, dependency installation, private-clone provisioning, and repository hooks are not executed by A1.

`a1 session link-worktree`, `unlink-worktree`, and `worktrees` remain compatible aliases for attach, detach, and list. They use the same authoritative results and internal retries.

## Working directories

After successful attachment, subsequent built-in read, bash, edit, write, grep, find, and ls calls resolve relative paths from the verified attached root. Detach returns those tools to the session's startup directory. The already-running shell that issued the attachment finishes in its original cwd; A1 does not rewrite shell commands or call process-global chdir. Explicit absolute paths retain their ordinary meaning. Project resources, settings, custom extensions, and independent terminals keep their own discovery/cwd behavior; use the returned explicit root for those integrations.

Background footer polling activates persisted claims once per session binding, then observes without rewriting healthy runtime registrations or claims. Informational listing waits for a consistent coordination snapshot rather than marking all owners unverifiable because an unrelated mutation happens to be running. Runtime shutdown releases its own claims. Crash recovery preserves durable attachment state and checks recorded process liveness before another runtime can acquire a claim.

Attachment and portable handoff policy is [R12](../delivery-rules.md#r12---portable-handoff). Repository cleanup handoff is independent and does not require runtime detach.

## Completing a merged task

Never run repository cleanup against the checkout a session is attached to. The shell A1 starts for an attached session has that checkout as its working directory, and on Windows that pins the directory until the shell exits even after `cd`, so cleanup issued from it removes part of the checkout and then fails on the directory itself.

`a1 worktree complete` sequences the two steps. In the issuing shell it only checks and detaches: the attachment must be valid and owned by this session, the checkout must not be locked in Git, and `git status` must show no tracked, staged, or untracked content. A blocker leaves the session attached and changes nothing. Otherwise the session returns to its startup checkout. Once that shell has exited, the A1 process runs the configured cleanup from the startup checkout and appends the outcome to the same command's result:

| Outcome | Meaning |
| --- | --- |
| `cleanup-finished` | The cleanup command ran. Its report follows and is authoritative; A1 does not claim a removal itself. |
| `cleanup-failed` | The command exited with an error. The checkout may remain; retry with the repository's cleanup from primary. |
| `cleanup-unavailable` | The repository declares no command, or it needs `--change`/`--pr` that was not given. The checkout is retained. |
| `cleanup-skipped` | Another live session attached the checkout, its claim is unverifiable, or the request was not settled within five minutes. |

In every case the session is already on the startup checkout and its tools keep working. Do not attach a partially removed checkout again.

The cleanup command is declared once in the repository, in a committed `.a1/worktree.json`, so no machine needs any setup:

```json
{ "cleanup": ["node", "scripts/governance/local-worktree-cleanup.mjs", "complete", "--repo", "{primary}", "--path", "{worktree}", "--change", "{change}", "--pr", "{pr}"] }
```

A1 reads the file from the primary checkout the session started in, never from the task checkout being left, so a task branch cannot change what runs until it is merged. The list is run without a shell from the primary checkout, with `{primary}`, `{worktree}`, `{branch}`, `{change}`, and `{pr}` substituted in each element; the first element must be a real executable such as `node`, not a `.cmd` shim. A repository without the file needs nothing: completion detaches, keeps the checkout, and reports `cleanup-unavailable`, and the repository's ordinary cleanup still applies. The command keeps every eligibility and deletion safeguard; A1 adds no deletion of its own. Delivery evidence is the command's to judge, so completing an unmerged task ends detached with the files intact and the command's blocker.

## Invalid attachments

If the attached checkout disappears, loses its Git pointer, or is replaced by a different worktree while the startup checkout still verifies, A1 releases this session's own association and editing claim. The built-in tool call that discovers it fails once with `worktree-attachment-invalid`, naming the released path and the startup checkout now in use, so work addressed to the lost checkout is never silently applied elsewhere. The next call runs from the startup checkout, and a resumed session recovers the same way. Uncertain results such as a timeout or an unverifiable startup checkout release nothing. `a1 worktree detach` works without validating the attached checkout. No file, branch, or other session's claim is removed.

Claims coordinate participating A1 sessions. They are not a sandbox against arbitrary external editors, an editing lock in Git, repository cleanup ownership, or permission to merge/delete anything. Delivery and protected cleanup remain independent.

## Shared repository guidance

Read and follow [Shared delivery rules](../delivery-rules.md), using this repository's entry in [Delivery adapters](../delivery-adapters.json). R17 gives the exact repository routing paragraph; this operational reference does not define a second workflow policy.

Install an A1 release exposing this interface before integrating a repository's instruction migration. Older installations only expose the session-context aliases; unknown commands in those older releases may return quietly without performing an operation. A migration PR is not evidence that a compatible installed release is active.
