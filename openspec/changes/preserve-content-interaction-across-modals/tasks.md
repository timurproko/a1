## Implementation verification note

The user clarified and explicitly authorized preserving normal A1 behavior: the same scrolling, selection, clipboard behavior, and speed with every modal open, not correcting pre-existing selection boundaries or speed values. Selection and auto-scroll verification below therefore compares modal behavior against normal A1 directly, including minimum-distance forward/reverse drags, rather than imposing the older numeric assumptions on the shared algorithms. No selection-boundary or speed-policy implementation is changed. The implementation evidence and host-family mapping are in `docs/features/modal-content-interaction.md`. Implementation PR: #346, citing accepted specification PR #345. Local verification: 313 focused tests, TypeScript checking, build, code documentation governance, and strict OpenSpec validation passed. CI initially stopped at three architecture import-boundary violations before its test suite ran. The session UI now consumes the pointer-surface type and equality helper through the runtime's public entry. Architecture governance, typechecking, build, documentation governance, strict OpenSpec validation, and 96 focused controller/runtime tests passed after that correction. Required CI and the user's physical-terminal acceptance remain pending; the code PR has no auto-merge.

## 1. Establish universal surface ownership

- [x] 1.1 After specification merge and explicit implementation authorization, fetch `origin/develop` and create a new detached implementation worktree and branch stream; verify its base and cite this accepted change in the code PR.
- [x] 1.2 Inventory built-in and extension modal entry points and map selectors, settings/nested dialogs, confirmations/permission/authentication flows, replacement inputs/editors, and floating overlays to shared hosts; verify every reachable family has a coverage case and read applicable pinned API documentation completely before runtime/API changes.
- [x] 1.3 Add shared current-frame viewport and modal/overlay geometry with stacking and ownership revisions at the owned composition/runtime boundary; verify docked, partial, overlapping, full-cover, narrow, and resized surfaces expose exactly their visible hit regions without private Pi state.

## 2. Keep transcript interaction active without stealing modal input

- [x] 2.1 Replace the modal-wide pre-input bypass with shared region-aware pointer/wheel routing and separate ordinary-editor hooks from transcript handling; verify exposed content scrolls while modal-local wheel, menu buttons, numeric controls, paste, and keyboard navigation remain unchanged, including mixed/chunked terminal input.
- [x] 2.2 Preserve transcript and modal gesture ownership through cross-region motion and release; verify scrollbar dragging, selection auto-scroll, no-button motion continuation, and modal-origin drags cannot activate or select the other surface.
- [x] 2.3 Keep the existing A1 transcript selection and copy path active while modals own focus; verify forward/reverse one-grapheme and multiline ranges, double/triple clicks, source styling, exactly one clipboard write, no modal/dock padding in copied text, no vanilla copy notification, and no modal cancellation on transcript copy.
- [x] 2.4 Preserve existing scrollbar settings and exposed navigation controls under modal composition; verify `auto` hover/linger, `always` overflow, `hidden` noninteraction, both styles, all speeds, track paging, sticky prompt, and jump-to-bottom with no modal focus change.

## 3. Make lifecycle and rendering safe

- [x] 3.1 Reconcile geometry and navigation on open, nesting, resize, close, cancel, and session replacement; verify valid detached position and follow-end behavior, safe gesture termination/report draining, stopped timers, and absence of stale hit targets or selection paint.
- [x] 3.2 Preserve layer ordering and bounded latest-state rendering during streaming and modal navigation; verify transcript selection never paints over modal cells, full-cover surfaces accept no background input, and pointer updates remain responsive without stale frames.
- [x] 3.3 Add parameterized shared-host integration coverage plus real Model Configuration, settings/nested, replacement-input, and extension-overlay cases, including an unlisted extension surface; verify the modal inventory has no uncovered host route and `a1 pi` plus installed dependencies remain unchanged.

## 4. Validate and hand off

- [ ] 4.1 Run strict OpenSpec validation and use required CI as the automated gate, with only optional focused local debugging tests unless broader runs are requested; verify and report required check results after pushing without foreground CI watching.
- [ ] 4.2 Provide the exact implementation worktree, branch/commit, build plus `./scripts/dev` command, and modal-family reproduction steps; verify the exact built candidate in Windows Terminal retains scrolling, scrollbar, custom selection/copy, modal controls, and restoration, recording terminal geometry/settings and the user's result.
- [ ] 4.3 Leave the code PR open without auto-merge until user acceptance and explicit merge authorization; verify those approvals and the merged state before recording acceptance and archiving in a separate specification-only follow-up.
