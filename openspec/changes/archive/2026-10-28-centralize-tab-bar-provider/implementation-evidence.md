# Implementation evidence

## Provider contract

- `native/terminal-host/src/core/tab_bar.rs` is the single native declaration for Agent, Settings, and Changelog metadata and policies.
- Attach activation, command-palette entries, plus-menu entries, context-menu renameability, singleton visibility/prewarming, registry validation, Agent-session ownership, singleton reservation, and child route delivery consume provider declarations.
- Singleton visibility state is stored in provider order rather than concrete Settings and Changelog fields.

## Ordering

- `append_live_tab` appends cold-created and promoted standby tabs after the final live record without consulting kind.
- `move_live_tab_last` places a hidden singleton at the final live slot when it joins the strip; already shown tabs bypass it and retain dragged order.
- Focused server regressions cover Agent → Settings → Agent ordering, dragged order, singleton message resolution, and stopped records around live tabs.

## Blank-free Agent startup

- `ViewModel` no longer converts a requested tab's blank first surface into a visible commit after elapsed time. Repeated blank revisions remain parked, preserving the previous coherent frame or complete local Agent startup preview with deferred input still bound to the requested tab.
- The first nonblank surface commits the requested topology normally. A surface explicitly marked `failed` bypasses the blank gate so existing failure and recovery controls remain available, and `Presented` hides the child cursor when that failed surface itself is blank.
- Presentation coverage advances repeated blank revisions far beyond the former two-second wait, verifies no expiry commit, then observes the first nonblank frame commit. It also covers blank failed-surface resolution and hidden failure cursor behavior.
- The resident role fixture delays the new Agent's UI past the former wait, asserts that the complete preview and visual caret remain without a child cursor, and preserves close-before-first-draw ghost prevention.

## Prompt replacement

- `SessionViewportController` leaves editor-owned prompt word and line selection highlighted without producing a copy-on-select snapshot; complete-frame selection still follows the live setting.
- The owned editor's existing asynchronous paste reservation replaces the retained selection from the unchanged clipboard, while explicit `Ctrl+C` still submits the selected editor text and applies its established collapse behavior.
- Shell coverage starts with `replacement` in the clipboard, double-clicks `copy` in `copy this line`, and observes `replacement this line` without an intervening clipboard write.

## Native dialog hints

- `native/terminal-host/src/roles/shortcut_hints.rs` renders reusable `{ key, action }` entries with shared display casing, semantic key/action roles, two-space entry gaps, and grapheme-safe terminal-cell clipping.
- Commands and Plus Menu declare semantic entries and pass them through the shared renderer; their footer no longer owns literal separator strings.
- Truecolor uses distinct quiet-key and lighter-muted action colors, while 256-color fallback uses separate palette roles. Palette coverage asserts the visible text, ANSI role boundaries, fallback colors, and absence of middle-dot separators.
- Component coverage exercises shared casing and spacing plus narrow-width clipping across a wide grapheme without emitting a partial style span.

## Centered Settings configure dialogs

- `renderCenteredDialogOverlay` composes the complete Settings frame under reasserted terminal faint intensity, restores normal intensity inside a centered width-bounded surface, fills every modal row through the shared panel role, and uses ANSI-aware overlay replacement so bold/reset spans cannot brighten the backdrop or clear dimming after the panel.
- Generic structured settings now window their declared rows by available height and render through the shared configure content. Warnings retains descriptions, toggles, undo, and writes while moving from the docked footer to the centered modal; selected rows fill the inner content width while outer padding stays on the panel background.
- Both Thinking Level steps retain model filtering, provider suffix roles, level choices, step transitions, and active-step hints. Their row windows derive from terminal height, including a 48×10 regression that keeps the selected model, search input, and close guidance visible.
- The TypeScript Plus Menu fallback uses the same two-column modal inset and semantic shortcut renderer as other configure workflows; resident Settings continues to delegate to the native centered Plus Menu.

## Shared dialog surface palette

- `renderFloatingDialogSurface` owns the native-matching RGB `38,38,38` and ANSI `235` configure-dialog backgrounds beside the existing raised-menu RGB `55,55,55` and ANSI `237` surface renderer.
- Settings composition dynamically loads both component renderers, reads the active Pi color mode for each paint, and contains no raw dialog or menu background sequence.
- `SettingsApp` derives one dialog-local semantic panel role for every structured workflow, so Warnings, both Thinking Level steps, generic structured settings, and fallback Plus Menu share the dark configure surface while ordinary value menus retain their established raised surface.
- Component coverage verifies truecolor and 256-color output, full panel fill, and selected-row panel restoration. Settings integration distinguishes the dialog surface from the ordinary menu surface, and governance coverage checks parity with the native command-palette RGB and ANSI fallback declarations.

## Changelog text selection

- `ReferenceDocumentSelection` keeps Changelog and startup `What's New` selection in document-row coordinates, reuses shared drag, word, and line selection primitives, and paints visible cells through the active theme's selection background without discarding Markdown foreground or hyperlink styling.
- Selection extraction strips ANSI and terminal padding while retaining selected line breaks. Wheel, keyboard, and scrollbar scrolling leave the selection anchored to the same document rows; scrollbar presses retain precedence and compact frames keep the ordinary exact-dimension contract.
- Selection release reads `fullscreenCopyOnSelect` from the shared Pi settings document through a lazily loaded utility-safe policy. Enabled selections submit once through the existing bounded clipboard callback; disabled selections remain painted without a clipboard write.
- An active selection claims `Ctrl+C`, copies explicitly, and clears. With no selection, standalone Changelog retains one-interrupt close and the pinned resident Changelog retains its two-interrupt application-exit chord. Hotkeys and Session Info remain non-selectable.

## Local checks

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed after the blank-first-frame refinement.
- A focused `rustc --test` harness over the checked-in shortcut-hint and command-palette modules passed all 5 component and palette tests.
- `npm run build:core` passed.
- `npm run typecheck` passed after the prompt-selection, centered-dialog, and Changelog-selection refinements.
- `npm run check:architecture` passed with the selection implementation kept outside the startup graph and the reference-screen class within its field threshold.
- `npx vitest run test/features/owned-ui test/composition/settings-route-host.test.ts test/composition/utility-tab.test.ts` passed with 213 tests.
- `npx vitest run test/app/session-shell/session-shell-resident-utility-tabs.test.ts test/app/session-shell/session-shell-workflows.test.ts test/app/session-shell/session-shell-selection.test.ts` passed with 103 tests.
- `npx vitest run test/features/owned-ui/reference-screen-app.test.ts test/composition/settings-route-host.test.ts test/composition/utility-tab.test.ts` passed with 33 focused tests.
- `npx vitest run test/features/owned-ui test/ui/components/dialog-panel.test.ts test/composition/settings-route-host.test.ts` passed with 212 tests before the Changelog-selection refinement.
- `npx vitest run test/app/session-shell/session-shell-workflows.test.ts test/app/session-shell/session-shell-selection.test.ts test/repository-governance/owned-settings-interaction-boundary.test.ts` passed with 104 tests before the Changelog-selection refinement.
- `npx vitest run test/ui/components/dialog-panel.test.ts test/features/owned-ui/settings-app.test.ts test/features/owned-ui/plus-menu-dialog.test.ts test/composition/settings-route-host.test.ts test/repository-governance/owned-settings-interaction-boundary.test.ts` passed with 96 focused tests after the shared dialog-palette refinement.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-selection.test.ts` passed with 151 tests.
- `npx openspec validate centralize-tab-bar-provider --strict` passed.
- `npm run test:fast` could not enter its suites because the candidate build's GitHub artifact lookup hit a network connection failure while resolving the required Windows terminal library; the focused and broader owned-UI suites above completed locally.
- The focused native presentation unit command and the full native unit binary could not link locally because the contracts-only build omits the Ghostty VT symbols and no trusted Windows `terminal-vt` artifact or Zig toolchain was available; exact-head CI remains the native validation authority.
