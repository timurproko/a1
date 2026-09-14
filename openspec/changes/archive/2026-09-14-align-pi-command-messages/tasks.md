## Delivery milestones

Implement and review this change through focused code PRs while keeping one cumulative inventory and acceptance contract:

1. **CLI/package milestone:** establish the applicable CLI baseline and complete model-refresh, package operation, syntax/help, and CLI transcript evidence in Sections 1-3 and 6.
2. **Interactive-outcome milestone:** complete the supported command inventory and route-specific outcome semantics in Sections 1, 4, and 6, retaining the documented recoverable-session exception for fatal `/new`, `/resume`, and `/import` outcomes.
3. **Presenter/integration milestone:** complete message geometry, state-transition evidence, integrated invariants, physical review, and final acceptance in Sections 5 and 6.

Task accounting remains cumulative across milestones. A task that spans more than one milestone remains unchecked until all of its criteria are complete, and the OpenSpec change remains active until every required task is complete or explicitly skipped with accepted rationale.

## Missing-GitHub-CLI amendment (2026-09-11)

The maintainer approved retaining A1's accurate missing-`gh` installation guidance after reviewing its difference from vanilla Pi 0.84.2. The published Pi handler reports not logged in for the native ENOENT result; see `design.md` for the reproduced cause and the UI delta spec for the exact two-message contract. Reopen task 4.8 for independent evidence that classifies this one exception honestly and rejects applying it elsewhere. Other completed milestone tasks retain their recorded status; unmerged presenter work is not claimed as integrated by this amendment. This is not final implementation acceptance or archive authorization. Merge this OpenSpec-only amendment before separately authorized implementation resumes in a fresh stream.

## Presenter/integration implementation evidence (2026-09-12)

Resumed in a fresh implementation stream from the merged amendment #305. The preserved presenter corrections are revalidated, and the existing cumulative `pinned-pi-command-workflow-outcomes.json` now links the supported CLI evidence and all 25 interactive routes to pinned source methods, owned controllers/presenters, and executable outcome conditions. Independent processes compare 140 interactive outcomes in dark/light, truecolor/256-color, padding 0/1, and ordinary/narrow widths, including selector content/focus, refresh-before-completion checkpoints, native missing-process diagnostics, recoverable fatal commands, and share cleanup. Separate geometry cases cover resize-back, intervening content and statuses, modal restoration, and negative row/style/wording mutations. Producer failure and deadline tests fail closed. All external effects use synthetic state and isolated temporary profiles; no real provider request, GitHub upload, or credential operation is performed.

The comparisons drove corrections to error/notice geometry, share exit-status/detail handling, export fallback, immediate model-refresh messages, provider-search/ambient setup, tree-copy feedback, configured/extension hotkeys, changelog loading, hidden-command imagery, and failed-reload history. Changelog and image data are attributed owned resources with deterministic ingestion and pinned-byte verification; they are loaded lazily at runtime without dependency-directory reads, and the build/package checks include their emitted files. The architecture gate was preserved rather than bypassed. Source/provenance records are updated, and expensive producer suites are explicitly resource-sensitive in the existing validation selection, with its partition regression updated accordingly.

The focused CLI/package/controller/changelog/inventory/presentation run passed 188 tests. Additional shell, component, frame-parity, provenance, resource, and validation-partition checks passed, including all 126 session-shell tests. The focused packed-surface checks passed after applying the repository's existing native executable-mode normalization to the local debug tarball; a raw Windows npm pack is not claimed as a validated release. Build, typecheck, architecture/source-ledger, changed-file documentation, and strict OpenSpec validation passed. No local fast/full/release tier, live-provider probe, or publication was run. Required current-head CI and physical acceptance are still pending: tasks 6.3-6.5 remain open, and this is not an acceptance or archive record.

## 1. Establish the command-outcome baseline

- [x] 1.1 Reconfirm the certified Pi package/source version and inventory every supported CLI and interactive command message branch, including hidden routes and selector-owned states; verify each entry has a pinned source reference, A1 owner, outcome/severity, and acceptance case or declared exception, with the missing-`gh` wording exception identified only for `/share` executable absence.
- [x] 1.2 Establish isolated independent pinned and A1 producers with deterministic catalog/auth/filesystem/gh/npm/git fixtures; verify no fixture reads real credentials, accesses another profile, uploads a gist, or performs a real package install, and producer failures/timeouts fail the result.
- [x] 1.3 Capture existing matching package success/list/progress and interactive normal-success baselines; verify expected transcripts/cells come from the pinned producer rather than A1 formatters and contextual normalization preserves wording, whitespace, and styles.

## 2. Correct model-refresh and package operation output

- [x] 2.1 Remove the model-refresh rendering exception for both CLI aliases; verify exact green `Model catalogs refreshed` plus one newline, empty stderr, and exit zero in color-enabled and color-disabled transcript cases.
- [x] 2.2 Match pinned refresh timeout, ordered provider-error details, runtime exceptions, and non-Error fallback; verify red stderr, exit one, no success summary, alias equivalence, and preservation of multiline/long details.
- [x] 2.3 Delegate single-package update identity matching and missing-target errors to the public package manager; verify equivalent source spellings, no-match suggestions, and the different remove-versus-update error prefixes against pinned output.
- [x] 2.4 Preserve complete package error messages and pinned non-Error fallback without whitespace normalization or truncation; verify messages containing repeated whitespace, newlines, and more than 600 characters remain exact.
- [x] 2.5 Add typed user-scope settings-diagnostic reporting before operation progress; verify yellow warning/dim secondary-detail order, corresponding operation behavior, unchanged inherited child output, and absence of project-settings/trust access.

## 3. Correct focused syntax and help presentation

- [x] 3.1 Separate recognized package syntax failures from formatting and render pinned red diagnostic/dim guidance lines; verify missing sources, genuinely unknown options, extra arguments, canonical uninstall/remove wording, and retained syntax exit status two.
- [x] 3.2 Implement explicit `-h`/`--help` for supported package verbs using pinned help typography projected onto A1's supported grammar; verify all five verb spellings, help precedence, exit zero, and zero profile preparation or operation dispatch.
- [x] 3.3 Preserve command-surface boundaries; verify unknown commands remain silent, A1-only update selectors and pinned-Pi/profile/local-scope restrictions retain their focused diagnostics, no failure dumps full help, and no unsupported operation or option is advertised.

## 4. Correct interactive outcome semantics

- [x] 4.1 Represent route-specific message severity and multi-message outcomes explicitly through existing owned workflow boundaries; verify warning/status/error selection and partial-success ordering do not depend on parsing message prefixes, and fatal `/new`, `/resume`, and `/import` outcomes return A1's recoverable failed result without false success or terminal shutdown.
- [x] 4.2 Match API-key and OAuth completion labels, actual selected-model clauses, and credential-path messages; verify empty-model and already-selected-model fixtures against pinned sequences without inventing successful selection.
- [x] 4.3 Match authentication selection/synchronization failures and post-login catalog timeout/failure warnings; verify truthful partial success, lifecycle-safe delayed delivery, and no credential values in output/evidence.
- [x] 4.4 Match logout empty state, ordinary success, failure, and credential-removed/local-sync-failed context; verify stored OAuth/API-key cases separately from environment or models.json authentication.
- [x] 4.5 Correct fork/clone empty states to pinned dim statuses and preserve successful/cancelled behavior; verify empty and populated session cases against pinned output.
- [x] 4.6 Preserve import error context through confirmation and missing-cwd recovery; verify usage, success, error, declined confirmation, and extension cancellation messages or silence against pinned behavior, while keeping the owning A1 session active after a fatal import failure as the declared lifecycle exception.
- [x] 4.7 Correct share viewer URL construction and retain two-line success output; verify the default `https://pi.dev/session/#<id>`, `PI_SHARE_VIEWER_URL` override semantics, multiline wrapping, and absence of the obsolete URL.
- [x] 4.8 Verify share failures and cancellation through owned process/lifecycle handling: reproduce Pi 0.84.2's native missing-`gh` result (`status: null` with ENOENT, not an artificial thrown spawn error) and A1's corresponding missing-process rejection; record Pi's exact not-logged-in text and retain A1's exact `Error: GitHub CLI (gh) is not installed. Install it from https://cli.github.com/` as the named exception. Verify both stop before export/gist creation without a success link or session termination. Keep installed-but-unauthenticated, export failure, gist failure, malformed output, cancellation, cleanup, and suppressed late-success outcomes under their existing parity contract; use deterministic fixtures and prove non-missing-process failures cannot use the exception.
- [x] 4.9 Close remaining message differences found in the supported-command inventory, including command-owned model refresh and no-message branches; verify every entry is independently evidenced or has a predeclared contextual exception, without adding unsupported commands or rewriting matching structured presenters.

## 5. Correct interactive message geometry

- [x] 5.1 Replace raw fixed-indentation error/warning rows with coherent owned presenters using pinned text/spacer semantics; verify severity colors, prefixes, wrapping, separately tracked multiline rows, and error padding at zero and one.
- [x] 5.2 Match new-session vertical padding and route-specific name/debug/informational presentation without generic success styling; verify pinned component-cell snapshots at ordinary and narrow widths with long dynamic values.
- [x] 5.3 Preserve status coalescing, anchoring, resize, and modal/editor restoration while adopting the presenters; verify consecutive statuses, intervening errors/warnings/content, two-line share output, and resize/open/close transitions.

## 6. Validate the integrated parity contract

- [x] 6.1 Complete the independent CLI transcript matrix across success, errors, diagnostics, help, and color settings; verify stdout/stderr, literal ANSI/newlines, operation exits, and the sole documented numeric syntax-exit exception.
- [x] 6.2 Complete the independent interactive message-cell matrix across all inventoried outcomes, relevant themes, ordinary/narrow widths, both padding values, and state transitions; verify negative/mutation cases reject wrong punctuation, severity, style, missing rows, wrapping, and overbroad normalization. Label matching fatal-command output separately from its declared process-lifecycle exception, and assert the exact pinned/A1 diagnostic pair only for the named missing-`gh` case; reject an altered installation message or an exception applied to any other outcome.
- [ ] 6.3 Update applicable source provenance and integrate focused coverage with the repository's existing required validation selection; verify architecture/public-boundary checks and required CI evidence for each focused implementation slice without introducing a second runtime or a disconnected parity inventory.
- [ ] 6.4 Verify integration invariants across CLI and interactive routes: isolated A1 package/model profile, no CLI supervisor/UI launch, preserved child output, unchanged A1 self-update/version behavior, declared UI replacements/customizations, and continued A1 session ownership after recoverable fatal-command failures; record required CI results, the declared lifecycle and missing-`gh` wording exceptions, and any remaining gaps.
- [ ] 6.5 For each focused implementation slice, provide its exact artifact and applicable focused commands for user-controlled Windows Terminal/Git Bash review; for final integrated acceptance include both model-refresh aliases and representative interactive success/empty/error/multiline states, verify the screenshot has exactly Pi's green summary, and record explicit user acceptance before claiming either slice or overall completion.
