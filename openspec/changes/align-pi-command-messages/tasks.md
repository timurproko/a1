## Delivery milestones

Implement and review this change through focused code PRs while keeping one cumulative inventory and acceptance contract:

1. **CLI/package milestone:** establish the applicable CLI baseline and complete model-refresh, package operation, syntax/help, and CLI transcript evidence in Sections 1-3 and 6.
2. **Interactive-outcome milestone:** complete the supported command inventory and route-specific outcome semantics in Sections 1, 4, and 6, retaining the documented recoverable-session exception for fatal `/new`, `/resume`, and `/import` outcomes.
3. **Presenter/integration milestone:** complete message geometry, state-transition evidence, integrated invariants, physical review, and final acceptance in Sections 5 and 6.

Task accounting remains cumulative across milestones. A task that spans more than one milestone remains unchecked until all of its criteria are complete, and the OpenSpec change remains active until every required task is complete or explicitly skipped with accepted rationale.

## 1. Establish the command-outcome baseline

- [ ] 1.1 Reconfirm the certified Pi package/source version and inventory every supported CLI and interactive command message branch, including hidden routes and selector-owned states; verify each entry has a pinned source reference, A1 owner, outcome/severity, and acceptance case or declared exception.
- [ ] 1.2 Establish isolated independent pinned and A1 producers with deterministic catalog/auth/filesystem/gh/npm/git fixtures; verify no fixture reads real credentials, accesses another profile, uploads a gist, or performs a real package install, and producer failures/timeouts fail the result.
- [ ] 1.3 Capture existing matching package success/list/progress and interactive normal-success baselines; verify expected transcripts/cells come from the pinned producer rather than A1 formatters and contextual normalization preserves wording, whitespace, and styles.

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
- [x] 4.8 Match share failures and cancellation through owned process/lifecycle handling; verify gh absent, gh unauthenticated, export failure, gist failure, malformed output, cancellation, cleanup, and suppressed late success using deterministic fixtures.
- [ ] 4.9 Close remaining message differences found in the supported-command inventory, including command-owned model refresh and no-message branches; verify every entry is independently evidenced or has a predeclared contextual exception, without adding unsupported commands or rewriting matching structured presenters.

## 5. Correct interactive message geometry

- [ ] 5.1 Replace raw fixed-indentation error/warning rows with coherent owned presenters using pinned text/spacer semantics; verify severity colors, prefixes, wrapping, separately tracked multiline rows, and error padding at zero and one.
- [ ] 5.2 Match new-session vertical padding and route-specific name/debug/informational presentation without generic success styling; verify pinned component-cell snapshots at ordinary and narrow widths with long dynamic values.
- [ ] 5.3 Preserve status coalescing, anchoring, resize, and modal/editor restoration while adopting the presenters; verify consecutive statuses, intervening errors/warnings/content, two-line share output, and resize/open/close transitions.

## 6. Validate the integrated parity contract

- [x] 6.1 Complete the independent CLI transcript matrix across success, errors, diagnostics, help, and color settings; verify stdout/stderr, literal ANSI/newlines, operation exits, and the sole documented numeric syntax-exit exception.
- [ ] 6.2 Complete the independent interactive message-cell matrix across all inventoried outcomes, relevant themes, ordinary/narrow widths, both padding values, and state transitions; verify negative/mutation cases reject wrong punctuation, severity, style, missing rows, wrapping, and overbroad normalization, and label matching fatal-command output separately from the declared process-lifecycle exception.
- [ ] 6.3 Update applicable source provenance and integrate focused coverage with the repository's existing required validation selection; verify architecture/public-boundary checks and required CI evidence for each focused implementation slice without introducing a second runtime or a disconnected parity inventory.
- [ ] 6.4 Verify integration invariants across CLI and interactive routes: isolated A1 package/model profile, no CLI supervisor/UI launch, preserved child output, unchanged A1 self-update/version behavior, declared UI replacements/customizations, and continued A1 session ownership after recoverable fatal-command failures; record required CI results, accepted lifecycle exceptions, and any remaining gaps.
- [ ] 6.5 For each focused implementation slice, provide its exact artifact and applicable focused commands for user-controlled Windows Terminal/Git Bash review; for final integrated acceptance include both model-refresh aliases and representative interactive success/empty/error/multiline states, verify the screenshot has exactly Pi's green summary, and record explicit user acceptance before claiming either slice or overall completion.
