## 1. Lock the Progress-Status Contract with Failing Evidence

- [ ] 1.1 Add component tests for semantic text, a Unicode ellipsis, one or many ASCII periods, and an already canonical suffix; verify each spinner-backed result ends in exactly `...` with no duplicate marker.
- [ ] 1.2 Add shell-status tests for `Working...`, `Retrying...`, `Compacting...`, an extension message with no suffix, and legacy extension messages with either suffix; verify non-spinner diagnostics and notices remain byte-for-byte unchanged.
- [ ] 1.3 Update engine transition tests to expect semantic `Working`, `Retrying`, and `Compacting` labels while proving retry/compaction restoration and run-settlement lifecycle behavior remain unchanged.
- [ ] 1.4 Add or extend boundary evidence that source-synchronized status indicators, installed Pi packages, the regular `a1 pi` comparison path, spinner ANSI roles, row geometry, and disposal behavior are not modified.

## 2. Centralize Spinner-Backed Message Presentation

- [ ] 2.1 Add an A1-owned neutral progress-status component utility and public barrel export; verify its formatter replaces only a terminal `…` or terminal period run and is idempotent for `...`.
- [ ] 2.2 Remove progress punctuation from built-in engine work-state producer labels; verify no working/retry/compaction event branch chooses between `...` and `…`.
- [ ] 2.3 Apply the formatter once after the bare-A1 shell resolves its default, engine, or extension working message and before it constructs the existing spinner component; verify every spinner-backed source inherits the same punctuation without per-state branches.
- [ ] 2.4 Preserve the existing loader, animation cadence, colors, placement, invalidation, replacement, lifecycle, cancellation, and teardown paths; verify the focused status and session-shell suites detect any non-textual frame change.

## 3. Record the Owned Presentation Difference

- [ ] 3.1 Update UI reference provenance to declare the bare-A1 three-period progress marker and its component-level ownership while identifying synchronized Pi status components as untouched; verify provenance governance passes.
- [ ] 3.2 Add repository evidence that progress punctuation is owned at the shared component boundary rather than repeated in built-in lifecycle producers; verify a producer-level Unicode ellipsis or period suffix fails the focused guard.

## 4. Automated Validation and Pull Request

- [ ] 4.1 Run the focused component, engine, shell, extension, parity, provenance, and architecture tests; verify every selected suite passes without running unrestricted local fast/full/release tiers.
- [ ] 4.2 Run `npm run build`, `npm run typecheck`, `npm run check:code-documentation`, `npm run check:architecture`, `openspec validate standardize-progress-status-presentation --strict`, and `git diff --check`; verify every command succeeds.
- [ ] 4.3 Push the implementation branch and open a code pull request citing the accepted OpenSpec change; verify required CI succeeds and auto-merge remains disabled.

## 5. Exact-Artifact Windows Terminal Acceptance

- [ ] 5.1 After CI succeeds, provide the exact worktree, branch/commit, `npm run build && ./scripts/dev` command, expected status text, comparison command, and known gaps; verify the handoff points to the pushed candidate artifact.
- [ ] 5.2 In Windows Terminal, reproduce ordinary work and compaction from the candidate and verify the spinner rows show `Working...` and `Compacting...` with exactly three ASCII periods, matching spinner style, color, placement, and cadence.
- [ ] 5.3 Exercise retry and extension working-message evidence where available, and run `npm run build && ./scripts/dev pi`; verify bare A1 canonicalizes spinner-backed text while the regular Pi route remains unchanged.
- [ ] 5.4 Record the user's visual acceptance and explicit merge authorization, then merge manually; verify the code pull request is merged only after both are present.
