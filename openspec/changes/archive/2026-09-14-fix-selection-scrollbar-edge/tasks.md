## 1. Establish the implementation baseline

- [x] 1.1 After specification merge and an explicit implementation request, fetch current `origin/develop` and create a fresh detached implementation worktree/branch; verify the accepted `fix-selection-scrollbar-edge` artifacts are present and cite their planning PR in the implementation PR.
- [x] 1.2 Reproduce right-edge endpoint truncation and hover background inheritance independently with focused failing tests; verify both semantic copy output and decoded final-cell backgrounds distinguish selected versus deliberately excluded final characters.

## 2. Correct right-edge selection and rail composition

- [x] 2.1 Separate active selection reach from control width reservation so full-width source endpoints are reachable; verify forward/reverse multiline and full-row selections include the last grapheme and partial endpoints still exclude it when intended.
- [x] 2.2 Preserve active-selection ownership when dragging into the rail while keeping rail-origin presses as scrollbar gestures; verify controller/shell mouse-report tests and unchanged prompt gutter/control hit regions.
- [x] 2.3 Compose the rail with the replaced cell's actual selected or source background, processing boundary transitions before the glyph without source hyperlink/emphasis leakage; verify production-theme ANSI-cell tests for selected and unselected final cells and any affected shared span behavior.
- [x] 2.4 Preserve row-cache correctness through rail reveal, normal/hover style changes, and hide; verify the first transition frame and repeated cached frames restore the source glyph correctly without changing selection revision or copied text on hover alone.

## 3. Prove integrated behavior

- [x] 3.1 Add focused coverage across auto/always/hidden appearances, thin/thick rails, source backgrounds, links, wide/combining graphemes, narrow widths, and 192-column geometry; verify no partial grapheme, padding, or rail glyph is copied and existing word/line-selection rules remain intact.
- [x] 3.2 Add terminal-paint regression evidence for complete and partial multiline selections followed by repeated released-selection hover/reveal/hide cycles; verify decoded final cells match semantic membership without stale false highlights and unaffected visible-row work remains bounded.
- [x] 3.3 Run strict OpenSpec validation and obtain required CI results for the implementation PR; verify checks pass without weakening assertions or running prohibited local broad suites, and leave code auto-merge disabled.

## 4. Manual acceptance and integration

- [x] 4.1 Hand off the exact worktree, branch/commit, build plus `./scripts/dev` command, and focused full-line/partial-line hover checks in Windows Terminal; verify the handoff states expected copy/highlight behavior and any known gaps.
- [ ] 4.2 Record the user's exact-candidate acceptance, terminal/version, geometry, and scrollbar settings for both included and excluded final characters; verify the code PR remains open until acceptance and explicit merge authorization are both present.
- [ ] 4.3 After authorized code integration, record acceptance and archive/synchronize this completed change in an OpenSpec-only follow-up; verify PR merge states and clean task worktrees before removing only this stream's retained worktrees under the repository cleanup rules.

## Archive disposition

The maintainer accepted candidate `09a2c0e6` with "tested approve", reported its merge, and explicitly requested "just archive" after being told that terminal/version, geometry, and scrollbar settings were unrecorded. Task 4.2 remains unchecked rather than claiming those details were collected; this is an authorized archival exception, not a reopened functional finding. Task 4.3 remains unchecked until this archive follow-up integrates and retained worktrees are safely cleaned. See `acceptance.md` for acceptance, CI, and merge evidence. The separate `stabilize-event-frame-capture` change is not completed or archived here.
