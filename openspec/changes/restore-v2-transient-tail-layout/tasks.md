## 1. Planning Reconciliation

- [x] 1.1 Update the active `stabilize-streaming-rendering` proposal, design, custom-viewport delta, and tasks in a separate OpenSpec-only change so pending steering has transient viewport ownership and fitting working status uses bottom alignment; verify both changes pass `openspec validate --strict` with no contradictory queue, dock, or fit-boundary clauses.

## 2. Transient Viewport Composition

- [ ] 2.1 Separate semantic transcript, pending steering, live working, and pinned dock rows in the owned shell; verify focused component and shell tests preserve steering wording/order and `Alt+Up`, non-working status/widget/input/footer order, and unchanged pinned `a1 pi` rows.
- [ ] 2.2 Add fitting status alignment that inserts only the unused viewport rows before a live status and removes that gap at overflow; verify component tests prove Working remains immediately above the input, short transcript rows do not move as content consumes the gap, and the first real overflow advances normally without duplicate or missing status rows.
- [ ] 2.3 Include pending steering before the alignment gap and working status in transient viewport extent while keeping semantic prompt anchors, persistence, completed-message accounting, and selectable row count bounded to real transcript rows; verify queue appearance, edit, removal, status replacement, and completion create no synthetic transcript content.
- [ ] 2.4 Preserve follow and detached positions across transcript growth, queue updates, status animation/height/removal, fit-overflow crossings, resize, and tiny terminals; verify Home/End, prompt navigation, scrollbar geometry, jump-to-bottom placement, valid detached positions, and required clamping all target the complete current transient tail.

## 3. Interaction, Reuse, and Paint Safety

- [ ] 3.1 Generalize transient hit metadata and pointer-sequence suppression to visible steering, alignment, and working rows while retaining control hit-test priority and wheel scrolling; verify presses and drags cannot create transcript/fullscreen selection and copied/highlighted text stops at the semantic boundary.
- [ ] 3.2 Add queue identity, status identity, alignment-gap height, and transient geometry to viewport snapshots and reuse decisions; verify same-height editor input still uses bounded dock-only reuse while queue changes and status-height changes conservatively recompose only affected viewport geometry.
- [ ] 3.3 Update frame descriptors and damage classification so fitting gap shrink is not reported as follow movement and overflowing growth is shiftable only when proven safe; verify deterministic descriptor tests cover appearance, fitting growth, boundary crossing, detached updates, completion, resize, and reset.
- [ ] 3.4 Recalibrate transient-tail rendering evidence and the fit-overflow workload without weakening stable-row or full-clear budgets; verify terminal replay shows no short-content status jump, no intermediate queue/status duplication, no stale cleared cells, and unchanged editor/footer rows with synchronized updates honored and ignored.

## 4. Regression Coverage

- [ ] 4.1 Replace immediate-tail fitting and docked-queue assertions with exact v2-visible layout tests; verify Working stays on the last row above input while fitting, steering remains after semantic content, and both scroll out only through user detachment once overflow exists.
- [ ] 4.2 Add shell lifecycle coverage for Working, Retrying, Compacting, extension-working replacements, multiple steering rows, queue edit/removal, completion, reset, and session replacement; verify transient spacing and rows disappear cleanly and never reappear stale.
- [ ] 4.3 Add pointer, editor-coordinate, replacement-input, selection, copy, right-click paste, and `Alt+Up` regressions at fitting and overflowing geometries; verify moving steering out of the dock changes no focused input behavior.
- [ ] 4.4 Run the focused component, viewport, session-shell, rendering-evidence, typechecking, architecture, and strict OpenSpec checks needed for debugging, then push the implementation branch and use required CI as the automated gate.

## 5. Exact-Artifact Acceptance

- [ ] 5.1 Provide the exact implementation worktree, branch/commit, build command, and color-preserving `./scripts/dev` handoff; verify the instructions ask the user to observe a stationary fitting Working row, natural overflow, scroll-out of Working and Steering, return-to-tail behavior, and clean completion.
- [ ] 5.2 Obtain user-controlled Windows Terminal acceptance on the exact built candidate and record terminal geometry/version plus the result; verify the code pull request remains unmerged until CI passes, physical behavior matches v2, and the user explicitly authorizes merge.
