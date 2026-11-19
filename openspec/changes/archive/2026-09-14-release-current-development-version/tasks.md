## 1. Correct target resolution and command validation

- [x] 1.1 Extract a testable release-target resolver and apply prerelease-aware patch increment to the original validated version; verify table tests for `0.1.8-dev`, `0.1.8-dev.123`, and `0.1.8-rc.1` selecting `0.1.8`, and stable `0.1.8` selecting `0.1.9`.
- [x] 1.2 Retain minor/major core-version arithmetic and exact stable-version selection, and calculate reopening from the selected stable result; verify `0.1.8-dev` with minor/major selects `0.2.0`/`1.0.0`, exact `0.4.0` selects `0.4.0`, and reopening is the following patch with `-dev`.
- [x] 1.3 Keep a target mandatory and reject malformed versions, invalid exact targets, unknown targets, and extra arguments before mutation; verify the public command's usage/error cases invoke no worktree creation, version edit, push, PR creation, or publication, and valid input reports source/target/reopening before mutation.

## 2. Prepare version PRs without automatic merging or caller resets

- [x] 2.1 Isolate each version-preparation phase in an owned detached worktree based on fresh authoritative develop while preserving clean/develop/remote-tip preflight; verify temporary-repository tests keep the caller branch, HEAD, index, and unrelated worktrees unchanged during preparation and edit only this package's manifest and root lockfile version entries.
- [x] 2.2 Remove direct merge and auto-merge enablement for both stable and reopening PRs, replacing them with phase-specific URLs and manual-validation/merge instructions; verify fake GitHub call traces contain no merge, auto-merge, or protection changes and CI success alone does not advance the phase.
- [x] 2.3 Preserve bounded observation of actual PR state and safe handling of matching versus conflicting existing branches/PRs; verify pending, closed-unmerged, timeout, cancellation, and query-failure cases report their identity and incomplete state without overwriting work or proceeding to the next phase.
- [x] 2.4 Preserve work appearing in the caller checkout during waits and limit cleanup to clean owned confirmed-merged phase worktrees; verify staged, unstaged, untracked, changed-HEAD, and local fast-forward cases cannot discard work and unsafe synchronization reports the authoritative remote state instead.

## 3. Preserve publication identity and reopening order

- [x] 3.1 Bind stable dispatch to the verified merged version and exact authoritative source SHA while retaining existing registry/tag guards; verify fake publication tests reject existing stable versions/tags, unverified merges, and source drift without substituting a newer SHA or uploading bytes locally.
- [x] 3.2 Prepare the reopening PR only after confirmed successful stable publication and verify its actual manual merge before reporting develop reopened; verify the ordered `0.1.8-dev -> 0.1.8 -> 0.1.9-dev` trace and equivalent stable-input/exact-target cases without a real publication.
- [x] 3.3 Distinguish failed/uncertain publication from successful publication followed by failed/pending reopening; verify no reopening occurs before success, no immutable release is republished or retagged, and messages identify safe phase-specific inspection/recovery rather than suggesting a misleading patch retry.

## 4. Update maintainer documentation and safe command coverage

- [x] 4.1 Update `README.md`, `docs/ci-release-runbook.md`, command help, and any directly contradictory adjacent release guidance with prerelease-versus-stable patch examples, retained minor/major/exact forms, required targets, both manual PR gates, and publication-before-reopening order; verify documentation examples agree with resolver tests and no self-merging or no-argument release claims remain.
- [x] 4.2 Add an isolated public-command harness using temporary repositories and fake GitHub/registry/publication boundaries, and reconcile existing publication-policy tests with the refactored helper shape; verify successful and failing scenarios preserve exact-source dispatch, root-only version edits, caller safety, and zero real release mutations.

## 5. Validate and hand off the implementation

- [ ] 5.1 Run focused resolver/orchestration/command and documentation-policy checks needed for debugging, then obtain required CI results for the implementation candidate; verify all required checks pass without skipping a failed gate or invoking a live release as validation.
- [x] 5.2 Provide the exact candidate worktree, branch/commit, safe test-harness command, expected patch-promotion results, and known gaps; verify the user can review release behavior without publishing a package or creating production version PRs.
- [ ] 5.3 Record explicit user acceptance of the corrected patch command, manual merge gates, safe checkout behavior, and README/runbook instructions before authorized implementation integration; verify completion/archival does not imply that a real `0.1.8` release has been executed.
