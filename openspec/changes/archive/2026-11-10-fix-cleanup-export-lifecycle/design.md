# Design

## Approval and delivery

The maintainer approved the preceding cleanup proposal, selected `~/.a1/exports/` as the persistent destination, and requested implementation. Publish this planning-only draft first, then continue the approved implementation in the same branch and PR without another confirmation round.

## Persistent exports

Resolve the user's home-relative product directory from the product identity rather than temporary development data/config overrides. Bare A1 supplies an absolute, exclusively reserved default output path under its `exports` sibling of the existing home-relative Agent profile. Default filenames include time, session identity, and a collision-resistant suffix. Default HTML and format-only JSONL exports share this policy. An explicit output filename/path and the pinned comparison workflow retain existing behavior. Failure removes only the default reservation this invocation created; no export is added to cleanup's disposable policy.

## Development-process diagnostics and remediation

Use a dependency-free repository helper to discover exact checkout-owned Node entry points. Observe PID, parent PID, executable/script association, and process-start identity; distinguish unavailable inspection from an empty result. Exclude the cleanup process and its ancestors, and never infer ownership from a basename or arbitrary command-line substring. Re-observe identity immediately before termination and after bounded shutdown. Use ordinary attached processes and signals, not a supervisor, job object, or process group.

Aggregate this inventory with existing local content checks for eligible candidates. Reports contain paths, process identities, blockers, and remedies, never file contents, credentials, or complete command lines. Existing reason codes remain compatible. Genuine unknown content, active/foreign ownership, Git locks, process uncertainty, or unavailable remote evidence remain blocking.

Only an explicit `complete --stop-dev-processes` operation may stop verified candidate development processes, after candidate/release/remote eligibility checks and only when ordinary content checks pass. Sweep/preview never stop processes. The cleanup caller and ancestors, other checkouts, installed releases, unrelated editors, reused PIDs, and unverifiable processes remain protected. Remediation must finish before ordinary generated-root purge, then repeat the existing identity/content checks.

## Preserve an existing named export

Provide `preserve-export` for one registered released merged candidate, exact relative file, change, PR, and confirmation. Permit a regular untracked `.html` or `.jsonl` file, with real non-link source ancestors and no tracked/staged/modified/nested or additional unknown-content blocker. A filename pattern alone grants no authority. Use the same merged/archive/remote/accepted-head and scoped locking gates as completed cleanup.

The destination is outside the worktree under the persistent user export directory, with exclusive naming and restricted file permissions. Journal the selected source identity, hash, destination, and step without storing content. Flush and verify the destination, recheck source identity/hash and candidate authority, then unlink only that source. A failure retains source data or a verified preserved copy and reports a resumable partial result. Repeating the exact operation resumes from its journal without overwriting a user file or trusting a replaced path. Ordinary cleanup runs separately afterwards.

## Validation

Use hermetic temporary homes, repositories, mock remote evidence, and injected process inspectors/terminators. Cover defaults, explicit paths, format selection, comparison behavior, repeated exports, writer failure, protected/unverifiable/reused process identities, current ancestors, unrelated worktrees, combined blockers, preservation collisions, symlinks, source changes, interruption/resumption, and unchanged cleanup safety gates. Run bounded affected suites, typecheck, architecture/documentation/provenance checks, and strict OpenSpec validation. Required CI remains the post-ready authority.

## Non-goals

No generic force cleanup, automatic movement of arbitrary user files, silent deletion of exports, changes to installed launch topology, global process stopping, or mutation of the other active Pi-upgrade delivery. Routine permission failures or genuinely active/dirty work may still block safely; the change removes avoidable failures rather than pretending every candidate is removable.
