## 1. Standalone documentation evidence

- [x] 1.1 Add a cleanup evidence path that loads the complete changed-file list for an unlinked merged PR and reuses the existing documentation allowlist and immutable lifecycle classifier; verify eligible canonical-spec, ordinary docs, and root README revisions are recognized without an implementation association.
- [x] 1.2 Bind eligibility to a merged non-draft same-repository PR into `develop`, the exact registered PR/head/ref, successful current-head required validation, current `develop` ancestry, and absent remote topic ref; verify each missing, stale, mismatched, present, or unavailable fact blocks or remains pending.
- [x] 1.3 Preserve the existing corrective-association path for genuinely unassociated implementations; verify mixed/code paths, introduced active changes, acceptance records, release notes, malformed lifecycle metadata, incomplete diffs, and invalid renames cannot enter documentation cleanup.

## 2. Existing local safeguards

- [x] 2.1 Return standalone-documentation evidence through the existing completed-candidate removal path; verify ownership, branch/HEAD identity, clean content, generated-content policy, journaling, non-force worktree removal, residue handling, and compare-and-delete local-ref behavior remain authoritative.
- [x] 2.2 Add focused end-to-end cleanup fixtures for an eligible merged documentation worktree plus wrong-head, changed-ref, dirty-worktree, live-remote-ref, failed-validation, and non-ancestral-target controls; verify no fixture requires force removal or manual filesystem deletion.

## 3. Guidance and validation

- [x] 3.1 Update `docs/local-worktree-cleanup.md` to explain standalone documentation evidence, its exclusions, and its unchanged local safeguards; verify guidance no longer directs such a candidate toward corrective implementation association.
- [x] 3.2 Run focused cleanup evidence/node fixtures, relevant repository-governance checks, changed documentation checks, typechecking required by the selected scope, strict OpenSpec validation, and diff checks; record implementation evidence and disposition every known gap without running prohibited local full suites.

Implementation evidence:

- Cleanup evidence fixtures: 18 passed; complete-path cleanup fixtures: 84 passed after integration with current `develop`.
- Documentation governance and changed code-documentation checks passed.
- Source typechecking with `tsgo -p tsconfig.json --noEmit` passed. The broader `npm run typecheck` bin phase requires generated `dist/` modules that are intentionally absent before a build; full build-dependent validation remains assigned to CI.
- Strict OpenSpec validation: 35 passed, 0 failed; `git diff --check` passed.
- Read-only live evidence verification classified merged PR #714 as eligible standalone documentation with its exact head, current `develop` ancestry, successful required validation, and absent topic ref.

## Post-merge operational follow-through

PR #714 cleanup is intentionally a post-merge operation, not a pre-finalization implementation task. After this change is accepted and integrated, rerun exact cleanup from the primary checkout using only the corrected command on current `develop`. Report `removed` or `already-absent`; if any live gate blocks, retain the worktree and report that new blocker rather than bypassing the command.
