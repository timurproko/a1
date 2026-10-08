## MODIFIED Requirements

### Requirement: Destructive steps are revalidated and recoverable

Cleanup SHALL hold scoped mutation authority for every exact worktree path and local or remote ref that an operation may change, and SHALL revalidate release state, filesystem/Git identity, HEAD, cleanliness, and live remote gates immediately before each destructive operation. Operations whose candidate paths and refs are disjoint SHALL be permitted to evaluate and mutate concurrently. Operations sharing a candidate path or ref SHALL remain mutually exclusive, including ownership, hand-off, completed cleanup, discard, redundant retirement, empty-directory removal, and branch pruning. Repository state replacement and unavoidable shared Git-ref changes MAY use brief repository-wide critical sections, but those sections SHALL NOT include remote evidence reads, content traversal, retry delays, generated-content purge, or worktree removal and SHALL use bounded acquisition.

Completed-delivery cleanup SHALL remove the central-policy disposable roots from the verified worktree with a bounded retrying recursive removal before journaling removal intent, then remove the worktree using non-force Git worktree removal, verify the result, and only then delete an associated unchanged, non-reserved local topic ref that is not checked out elsewhere. A disposable root that remains locked after the retry budget SHALL block before any journal transition, name the locked path, and leave the worktree, its Git pointer, and its registration intact. Local ref deletion SHALL enforce the expected old SHA atomically.

Closed-unmerged discard SHALL first complete all local preflight checks, then journal intent, reverify the PR remains closed-unmerged and the same-repository remote topic ref remains unprotected and at the expected PR head SHA, compare-and-delete that remote ref, and verify absence. Only after remote absence is durable SHALL it revalidate local identity and cleanliness, use non-force Git worktree removal, and atomically delete the unchanged local topic ref. A remote deletion followed by a local blocker SHALL be reported as partial and SHALL preserve the local worktree for a safe retry; a remote deletion failure or advanced ref SHALL NOT authorize local deletion.

Each state or journal transition SHALL re-read the current repository state inside its brief critical section, verify the candidate's expected identity and prior state, and atomically preserve concurrent updates to other candidates. Each destructive step SHALL be journaled so a retry can distinguish already-absent resources from partial failure or path reuse. When a journaled removal intent finds its path still present, the retry SHALL either revalidate the exact registered worktree and repeat non-force Git removal, or verify residue before removing it: Git SHALL no longer treat the path as a valid worktree, the residue SHALL contain no Git pointer, link, special file, or nested repository, and every remaining regular file SHALL either lie below a declared disposable root or have the exact tracked path and blob identity of the journaled head under the repository's content filters, all within the existing entry allowances and pass deadline. Only residue verified that way MAY be removed with the bounded retrying recursive removal, after which cleanup MAY retire this candidate's own dangling Git registration whose `gitdir` resolves to the removed pointer. Residue with any unknown, changed, or boundary-violating path SHALL be retained and identified by path; residue that still cannot be removed SHALL be retained with its journal for a later pass. Cleanup SHALL NOT recursively delete a directory whose contents it has not verified, SHALL NOT run global Git worktree pruning, and SHALL NOT prune another session's or unavailable worktree's registration.

#### Scenario: Concurrent workers evaluate one candidate
- **WHEN** two local reconcilers overlap on the same worktree path or topic ref
- **THEN** only one SHALL obtain that resource's mutation authority and the other SHALL defer without changing the candidate

#### Scenario: Concurrent workers evaluate unrelated candidates
- **WHEN** separate cleanup processes evaluate worktrees whose paths and topic refs are disjoint
- **THEN** both SHALL be able to continue through remote evidence, content inspection, retries, and candidate mutation without either holding repository-wide authority for the duration

#### Scenario: Concurrent candidates advance their journals
- **WHEN** two disjoint cleanup operations commit candidate state transitions in overlapping time
- **THEN** each transition SHALL be applied to fresh state and both candidates' latest valid transitions SHALL remain recorded

#### Scenario: Remote ref advances before rejected-work deletion
- **WHEN** the remote topic ref no longer equals the expected closed-unmerged PR head at compare-and-delete time
- **THEN** discard SHALL preserve the remote ref, worktree, and local ref and report the identity mismatch

#### Scenario: Remote deletion succeeds but local revalidation blocks
- **WHEN** the exact remote ref was removed but local identity, ownership, or content changes before worktree removal
- **THEN** cleanup SHALL report partial completion and preserve the local worktree and local ref for reviewed retry

#### Scenario: Local ref advances during cleanup
- **WHEN** the worktree has been removed but its local topic ref no longer equals the expected SHA
- **THEN** cleanup SHALL retain the advanced ref and report partial completion

#### Scenario: Disposable root is locked before removal
- **WHEN** a declared disposable root cannot be removed within the retry budget because a process holds a handle inside it
- **THEN** cleanup SHALL report a blocked result naming that root
- **AND** SHALL leave the worktree, its Git pointer, and its journal step unchanged so the next pass starts from the beginning
- **AND** cleanup of a disjoint worktree SHALL remain able to proceed

#### Scenario: Windows file lock prevents complete removal
- **WHEN** non-force Git removal fails after journaled intent and leaves a residual directory
- **THEN** cleanup SHALL report the exact incomplete step and retain the residue for that pass
- **AND** the next pass SHALL verify the residue against the journaled head and the declared disposable roots before removing it and continuing with the remaining steps

#### Scenario: Residue contains unverifiable content
- **WHEN** a residual directory contains a file that is neither below a declared disposable root nor byte-identical to the tracked file at the journaled head, or contains a Git pointer, link, special file, or nested repository
- **THEN** cleanup SHALL retain the residue and identify the offending paths for manual review

#### Scenario: Residue is still locked
- **WHEN** verified residue cannot be removed within the retry budget
- **THEN** cleanup SHALL report partial completion, keep the journal at removal intent, and retry on a later pass

#### Scenario: Git removal aborted before dismantling the worktree
- **WHEN** a journaled removal intent finds the exact registered worktree still valid
- **THEN** the next pass SHALL revalidate its content and repeat non-force Git removal

#### Scenario: Retry after interruption
- **WHEN** a prior run completed one or more verified destructive steps but stopped before finishing the remaining discard or completed-delivery steps
- **THEN** the next invocation of the same exact operation SHALL verify its journal and current identities before completing only the remaining safe steps

#### Scenario: Path is reused after removal
- **WHEN** a new directory or worktree occupies a previously removed path, or a valid worktree with a different identity occupies a path whose removal was journaled
- **THEN** a retry SHALL preserve the replacement and require a new explicit registration

### Requirement: Released merged deliveries are swept without per-candidate commands
The repository SHALL provide one explicit sweep operation, invoked from the primary checkout, that evaluates every released registration bound to this repository in one bounded pass and completes each candidate whose implementation pull request is verified merged, using exactly the completed-delivery evidence, remote-ref, identity, content, ownership, journaling, non-force removal, and compare-and-delete safeguards of the exact-candidate operation. The sweep SHALL NOT require queue enablement, SHALL NOT start a persistent process, SHALL NOT adopt unregistered worktrees, SHALL NOT discard closed-unmerged candidates, and SHALL leave no broad authority enabled after it exits. A disabled queue SHALL NOT prevent a sweep, but a stop sentinel written while a sweep runs SHALL stop it before its next destructive step.

Candidates whose pull request is open or whose evidence is still pending SHALL be reported `pending` and left untouched; candidates whose pull request closed without merge SHALL be reported `awaiting-discard` and left untouched; blocked candidates SHALL report their exact reason. The sweep SHALL apply the same candidate, remote-request, and subprocess limits as a queue pass and a fixed elapsed-time limit, report incomplete coverage, resume from a durable cursor on the next invocation, and acquire mutation authority separately for each candidate. A candidate already held by another cleanup process SHALL be reported as scoped `deferred` while the sweep continues evaluating disjoint registrations; brief shared-state contention SHALL use bounded acquisition rather than extending candidate authority repository-wide. Its report SHALL give one line per candidate suitable for relaying to the maintainer.

#### Scenario: New session starts after merges
- **WHEN** an agent session invokes the sweep before creating its worktree and handed-off candidates have since merged with verified archives and absent remote refs
- **THEN** the sweep SHALL remove each such worktree and its topic ref through the journaled non-force procedure and report `removed` or `already-absent` per candidate

#### Scenario: Handed-off pull request is still open
- **WHEN** a released candidate's pull request is open or its archive, validation, or remote-ref evidence is pending
- **THEN** the sweep SHALL report `pending` and SHALL NOT touch the worktree, branch, ownership record, or remote

#### Scenario: Handed-off pull request was rejected
- **WHEN** a released candidate's pull request is closed without merge
- **THEN** the sweep SHALL report `awaiting-discard` and SHALL NOT delete any local or remote ref or worktree

#### Scenario: Sweep coverage is exhausted
- **WHEN** a sweep reaches its candidate, request, or time limit before evaluating every released registration
- **THEN** it SHALL report deferred coverage and the next sweep SHALL resume from the durable cursor

#### Scenario: Another session is cleaning up
- **WHEN** another cleanup process holds the exact path or ref authority for one registration while a sweep runs
- **THEN** the sweep SHALL report that candidate as deferred, preserve it, and continue with registrations that do not share the held resource

#### Scenario: Stop sentinel appears during a sweep
- **WHEN** the queue is disabled or a stop sentinel is written while a sweep runs
- **THEN** a prior disabled state SHALL NOT prevent the sweep from starting, but a sentinel present before a destructive step SHALL stop it there

### Requirement: A dead holder's mutation lock is evicted only on proof
Every repository-state or scoped cleanup lock that may survive process termination SHALL record its holder's process identity and a heartbeat that the holder refreshes while it runs. A later operation that needs that same scope SHALL evict the lock only when the heartbeat (or, for a legacy lock without one, the file's modification time) is older than a fixed silence threshold of at least two minutes and the recorded process no longer exists; a process that exists, cannot be probed, or is the caller itself SHALL keep the lock. Eviction SHALL be journaled beside the state with the evicted record and the evicting process, SHALL happen at most once per acquisition attempt, and SHALL NOT release ownership, advance any journal step, or delete anything else. A lock that is fresh, unreadable but fresh, or held by a live process SHALL still report a named busy/deferred result for that scope, but SHALL NOT block operations that need only disjoint scoped resources.

#### Scenario: Holder was killed before releasing the lock
- **WHEN** a cleanup process is terminated without reaching its release and no heartbeat has been written for longer than the threshold
- **THEN** the next operation needing that scope SHALL journal and evict the lock, acquire its own, and proceed under the ordinary safeguards

#### Scenario: Holder is slow but alive
- **WHEN** the recorded process still exists, however old the heartbeat
- **THEN** the lock SHALL be kept and an operation needing that scope SHALL defer while disjoint cleanup remains permitted

#### Scenario: Lock is fresh or unreadable
- **WHEN** the heartbeat or modification time is within the threshold, or the record cannot be parsed but the file is fresh
- **THEN** the lock SHALL be kept and an operation needing that scope SHALL report a named busy/deferred result

#### Scenario: Legacy repository lock is already held during upgrade
- **WHEN** a cleanup process from the prior repository-wide protocol still holds `mutation.lock`
- **THEN** new state transactions SHALL honor that lock until it is released or provably stale rather than starting a conflicting mutation protocol
