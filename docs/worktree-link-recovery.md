# Worktree-link recovery

A1 coordinates worktree-claim mutations separately from the editing claims themselves. Recovering a mutation gate never grants permission to take another live agent's worktree or to delete worktree contents.

## Automatic recovery

Updated A1 holds a `proper-lockfile` gate, the `mutation.authority.gate` lock directory beside the persistent `session-worktree-claims/mutation.authority` file, for each mutation. The holder refreshes it while working; a gate left by a crashed or stalled process becomes stale after 10 seconds and the next mutation reclaims it. `mutation.lock` is a persistent directory that blocks older file-lock writers; its `owner.json` is only diagnostic metadata.

The next mutation safely recovers abandoned owner/pending metadata after taking the gate. Empty, truncated, NUL-filled, or otherwise malformed metadata does not prevent this recovery. One bounded `recovery.json` records the recovery reason/time, not the original bytes or session contents. A live gate holder remains protected. Acquisition waits at most two seconds by default and honors cancellation.

If startup registration fails temporarily, the running session retries on its 30-second refresh interval. Slow attempts are coalesced rather than queued indefinitely. Once registration succeeds, retry the explicit worktree link in the same session. Switching an agent's session replaces its publication identity, and disposal drains publication before releasing claims.

Inventory remains read-only. It can conservatively show unverifiable status until a mutation has recovered abandoned state; inventory does not perform repair.

## Older lock files and mixed versions

An existing regular-file `mutation.lock` belongs to the old protocol. Updated A1 cannot safely prove that no old writer/reclaimer is using it, even if a PID in the file is dead. It therefore retains the file and reports `worktree-legacy-recovery-required` rather than guessing or endlessly reporting generic busy.

For this one-time legacy case, stop all older A1 processes normally, move only that exact regular lock file to a backup while they are stopped, then start updated A1. Keep sessions, runtime records, associations, editing claims, Git locks, and worktrees. Reinstalling/downgrading alone does not clear persisted legacy state. Never move the new directory or delete `mutation.authority` while A1 is running.

When the old gate is absent, updated A1 initializes its compatibility barrier automatically. Older versions cannot mutate worktree claims after this point: all participating sessions must use the updated version. This intentionally prevents two incompatible mutation protocols from running concurrently.

## Diagnostics

| Code | Meaning / next step |
| --- | --- |
| `worktree-claim-busy` | A mutation still holds the gate. Retry the link shortly; runtime registration retries automatically. |
| `worktree-legacy-recovery-required` | Retained old-format gate. Use the stopped-process legacy procedure above. |
| `worktree-coordination-unavailable` | The installation cannot coordinate worktree claims. Repair/update the A1 installation. |
| `worktree-coordination-io` | Gate/metadata filesystem access failed. Check permissions and storage availability. |
| `worktree-coordination-boundary` | Unexpected file type, link, or entry. Retain it for inspection; do not clear the store. |
| `session-runtime-unavailable` | Runtime registration has not succeeded. Retry after the next refresh and address any specific coordination failure. |
| `session-runtime-unverifiable` | The runtime's recorded process cannot be checked. Retry; no ownership takeover is authorized. |
| `worktree-active-in-another-session` | Another live agent owns the target. Use a different worktree or have that owner release it. |
| `worktree-owner-unverifiable` | The editing claim itself is uncertain. Gate recovery cannot make that claim available. |

Diagnostics do not expose another session's process identity, session file, transcript, or credentials. The mechanism does not repair arbitrary damaged claim records, change tool cwd, or grant Git/cleanup authority.
