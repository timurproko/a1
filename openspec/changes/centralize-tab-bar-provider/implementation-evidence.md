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

- `ReferenceDocumentSelection` keeps Changelog and startup `What's New` selection in document-row coordinates, reuses shared drag, word, and line selection primitives, and paints visible cells through the shared blue text-selection component without discarding Markdown foreground or hyperlink styling.
- Selection extraction strips ANSI and terminal padding while retaining selected line breaks. Wheel, keyboard, and scrollbar scrolling leave the selection anchored to the same document rows; scrollbar presses retain precedence and compact frames keep the ordinary exact-dimension contract.
- Selection release reads `fullscreenCopyOnSelect` from the shared Pi settings document through a lazily loaded utility-safe policy. Enabled selections submit once through the existing bounded clipboard callback; disabled selections remain painted without a clipboard write.
- An active selection claims `Ctrl+C`, copies explicitly, and clears. With no selection, standalone Changelog retains one-interrupt close and the pinned resident Changelog retains its two-interrupt application-exit chord. Hotkeys and Session Info remain non-selectable.

## Changelog copy acknowledgement

- Automatic Changelog and startup `What's New` selection copy now treats the bounded clipboard callback's `false` result as refusal and returns an accepted UTF-16 character count without changing the retained selection or copied text. Resident and standalone clipboard adapters return that acceptance result while existing void callbacks remain compatible.
- The selection-owned acknowledgement paints `copied N chars to clipboard` through the accent role on the final document row before the scrollbar columns. It uses the same shared text formatter and one-second duration as the session-frame acknowledgement, remains outside document extraction, and clips ANSI-safely on narrow screens.
- A newer accepted automatic copy replaces the visible count and restarts the timer. Expiry requests a repaint, screen close cancels the timer, disabled copy-on-select and refused submissions remain silent, and explicit `Ctrl+C` keeps its existing copy-and-clear presentation behavior.

## Two-row scrollbar thumb minimum

- `scrollbarGeometry` now clamps the proportional rounded thumb height to at least two rows and then to the available track height. Tracks of two or more rows therefore keep a two-row minimum, while a one-row track remains valid and bounded.
- Existing consumers continue using the same geometry for painting, hit testing, grab offsets, drag conversion, and track paging; no session, Settings, Changelog, or other surface owns a separate minimum.
- Shared component coverage verifies very long content, one-row and two-row tracks, both thumb hit rows, proportional larger thumbs, top and bottom clamping, and drag-to-end conversion.

## Selection-first prompt copy and cut

- `SessionViewportController` now promotes the pending prompt press into an editor pointer gesture on first motion and keeps that owner through release, so wrapped rows and out-of-bounds motion retain the editor's clamped selection instead of becoming a complete-frame selection.
- Explicit shortcut precedence is editor prompt selection first, non-editable frame selection second, and last-agent-message copy only when neither selection exists. `Ctrl+C` copies prompt text without editing it, while `Ctrl+X` copies and removes the selected prompt range; a retained frame selection is copied rather than invoking the last-message workflow.
- Prompt copy-on-select remains disabled. URL and image chips snap to their complete atomic ranges, expand through the established clipboard presentation, cut without leaking image storage paths, and do not display last-agent success or empty-message notices.
- Controller, shell, paste, and editor regressions cover drag ownership, autocomplete, wrapped and out-of-bounds rows, explicit copy and cut, frame-selection precedence, no-selection fallback, and atomic URL and image chips.

## Shared text-selection surface

- `paintTextSelection` owns the product blue selected-text background and ANSI-safe span composition in `src/ui/components/text-selection.ts`; recipient modules contain no copy of the selection RGB.
- Agent frame selection, ordinary prompt selection, Settings search selection, Changelog, startup `What's New`, and the transcript viewport default all delegate to the shared painter. Atomic prompt chips retain their distinct reverse-video focus, and list/menu row highlighting remains theme-owned.
- Component coverage verifies nested ANSI attributes, OSC hyperlinks, wide graphemes, and inverse clearing. Reference-screen coverage proves Changelog ignores a conflicting theme highlight, while governance coverage requires every recipient to consume the shared painter and forbids recipient-owned copies of its RGB.

## Focus-aware thresholded resize curtain

- `native/terminal-host/src/roles/attach.rs` arms a focused resize curtain for 120 ms without interrupting immediate wire geometry forwarding. A matching latest-generation child surface cancels the pending curtain and repaints at full intensity; sustained resize shows the centered curtain, then retains the existing settle/recovery and whole-frame fade.
- Repeated geometry changes preserve the initial curtain deadline, but retarget the latest geometry and settle/recovery gates. Focus loss cancels pending or shown feedback and repaints; background terminal-tab resizes never arm it, and focus return repaints a complete cached frame.
- Native unit coverage tests delay, fast coherent completion, prolonged resize, latest-generation retarget, recovery, and focus suppression. The earlier exact-head CI failures were independently repaired: the changed-file documentation gate now accepts prefixed implementation comments in `session-viewport-controller.ts`, and Linux native integration compilation no longer borrows a temporary output string. The method size ratchet was lowered from 317 to 316 after consolidating those comments.

## Local checks

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed after the resize and prior-CI repairs.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts` passed with 72 tests after the comment-only repair.
- `npm run typecheck`, `npm run check:architecture`, `npm run check:docs-governance`, and `npx openspec validate centralize-tab-bar-provider --strict` passed for the threshold refinement.

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed after the blank-first-frame refinement.
- A focused `rustc --test` harness over the checked-in shortcut-hint and command-palette modules passed all 5 component and palette tests.
- `npm run build:core` passed.
- `npm run typecheck` passed after the prompt-selection, centered-dialog, Changelog-selection, and automatic-copy acknowledgement refinements.
- `npm run check:architecture` passed with the acknowledgement state kept inside the selection component, the reference-screen class within its size threshold, and the startup graph within its byte budget.
- `npx vitest run test/ui/components/text-selection.test.ts test/features/owned-ui/reference-screen-app.test.ts test/repository-governance/text-selection-style-boundary.test.ts test/features/owned-ui/settings-app.test.ts` passed with 122 shared-painter and recipient tests.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts test/app/session-shell/session-shell-paste.test.ts` passed with 167 Agent selection, clipboard, and atomic-chip tests after routing through the shared painter.
- `npx vitest run test/features/owned-ui test/composition/settings-route-host.test.ts test/composition/utility-tab.test.ts` passed with 213 tests.
- `npx vitest run test/app/session-shell/session-shell-resident-utility-tabs.test.ts test/app/session-shell/session-shell-workflows.test.ts test/app/session-shell/session-shell-selection.test.ts` passed with 103 tests.
- `npx vitest run test/ui/components/scrollbar.test.ts test/ui/components/selection-scrollbar-edge.test.ts` passed with 41 shared geometry, interaction, and gutter-selection tests.
- `npx vitest run test/ui/components/transcript-viewport.test.ts test/features/owned-ui/reference-screen-app.test.ts` passed with 88 transcript and reference-screen tests.
- `npx vitest run test/features/owned-ui/settings-app.test.ts` passed with 76 Settings tests.
- `npx vitest run test/features/owned-ui/reference-screen-app.test.ts` passed with 26 focused selection and acknowledgement tests before the scrollbar refinement.
- `npx vitest run test/composition/settings-route-host.test.ts test/composition/utility-tab.test.ts test/app/session-shell/session-shell-resident-utility-tabs.test.ts` passed with 13 route and resident-tab tests.
- `npx vitest run test/app/session-shell/dock-chrome.test.ts test/app/session-shell/session-shell-selection.test.ts test/ui/components/selection-copy.test.ts` passed with 98 shared acknowledgement and copy tests.
- `npx vitest run test/features/owned-ui/reference-screen-app.test.ts test/composition/settings-route-host.test.ts test/composition/utility-tab.test.ts` passed with 33 focused tests before the automatic-copy acknowledgement refinement.
- `npx vitest run test/features/owned-ui test/ui/components/dialog-panel.test.ts test/composition/settings-route-host.test.ts` passed with 212 tests before the Changelog-selection refinement.
- `npx vitest run test/app/session-shell/session-shell-workflows.test.ts test/app/session-shell/session-shell-selection.test.ts test/repository-governance/owned-settings-interaction-boundary.test.ts` passed with 104 tests before the Changelog-selection refinement.
- `npx vitest run test/ui/components/dialog-panel.test.ts test/features/owned-ui/settings-app.test.ts test/features/owned-ui/plus-menu-dialog.test.ts test/composition/settings-route-host.test.ts test/repository-governance/owned-settings-interaction-boundary.test.ts` passed with 96 focused tests after the shared dialog-palette refinement.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-selection.test.ts` passed with 151 tests.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts` passed with 82 selection and shortcut-precedence tests after the selection-first refinement.
- `npx vitest run test/app/session-shell/session-shell-paste.test.ts` passed with 85 clipboard and atomic-chip tests after the selection-first refinement.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts test/integrations/pi/components/prompt-input-ux.test.ts` passed with 104 controller and editor tests after the selection-first refinement.
- `npm run check:docs-governance` passed.
- `npx openspec validate centralize-tab-bar-provider --strict` passed.
- `npm run test:fast` could not enter its suites because the candidate build's GitHub artifact lookup hit a network connection failure while resolving the required Windows terminal library; the focused and broader owned-UI suites above completed locally.
- The focused native presentation unit command and the full native unit binary could not link locally because the contracts-only build omits the Ghostty VT symbols and no trusted Windows `terminal-vt` artifact or Zig toolchain was available; exact-head CI remains the native validation authority.
