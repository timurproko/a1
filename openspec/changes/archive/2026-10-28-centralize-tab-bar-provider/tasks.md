# Tasks

## 1. Tab-bar provider and activation

- [x] 1.1 Add one I/O-free tab-kind provider for Agent, Settings, and Changelog with stable metadata and policies for multiplicity, activation, prewarming, renameability, session ownership, route, and launcher marker.
- [x] 1.2 Route shortcuts, the command palette, plus launcher, popup actions, visibility state, and singleton toggles through one kind activation recipient, removing Agent-versus-utility dispatch and per-kind prewarm fields.
- [x] 1.3 Make server kind recognition, singleton reservation, registry validation, rename admission, Agent-session handling, and bridge-route delivery consume the shared provider instead of duplicate tables and utility-id checks.

## 2. Kind-neutral placement

- [x] 2.1 Add shared live-tab append and reveal-last operations that ignore stopped records and contain no tab-kind conditions; use them for cold holder creation, standby promotion, and hidden singleton reveal.
- [x] 2.2 Preserve selection and dragged order for already shown tabs while newly created or newly shown tabs join at the end, including Agent → Settings → Agent and cold-versus-standby creation regressions.
- [x] 2.3 Update the resident-tab architecture record and focused native coverage for provider registration, activation policies, menus, prewarming, session ownership, routes, renameability, and ordering.

## 3. Prompt selection replacement

- [x] 3.1 Stop editor-owned prompt word and line selection from submitting automatic copy work while retaining the selected range, complete-frame copy-on-select, and explicit editor copy and cut behavior.
- [x] 3.2 Add a shell-level regression that starts with external clipboard text, selects a prompt word through pointer input, and proves `Ctrl+V` replaces the selected word without an intervening clipboard write.
- [x] 3.3 Cover explicit `Ctrl+C` after editor-owned prompt selection and complete-frame automatic copy, update the selection specification, and record the focused implementation evidence.

## 4. Native dialog shortcut hints

- [x] 4.1 Add one reusable native semantic shortcut-hint component with display key casing, separate quiet-key and action-text roles, two-space entry gaps, and width-safe grapheme clipping.
- [x] 4.2 Route the Commands and Plus Menu footer entries through the component in truecolor and 256-color modes, removing dialog-specific literal strings and separator glyphs.
- [x] 4.3 Add focused component and palette regressions for visible text, semantic ANSI boundaries, fallback colors, narrow widths, and future shared use; record the implementation evidence.

## 5. Centered Settings configure dialogs

- [x] 5.1 Add one shared component that dims an existing frame and centers a width-bounded floating panel while preserving ANSI styles, exact terminal dimensions, and compact layouts.
- [x] 5.2 Route Warnings, generic structured settings, both Thinking Level steps, and the TypeScript Plus Menu fallback through the centered configure frame without changing their editing, undo, search, or persistence behavior.
- [x] 5.3 Add focused component and Settings regressions for backdrop dimming, panel background and centering, shared shortcut roles, adaptive row windows, narrow terminals, and future structured-setting reuse; record the implementation evidence.

## 6. Changelog text selection

- [x] 6.1 Add Changelog-only reference-screen selection state and semantic painting for drag, word, and line selection while preserving scrolling, scrollbar ownership, resize behavior, and exact frame dimensions.
- [x] 6.2 Route selection release through the live `Copy on select` value, and make `Ctrl+C` explicitly copy and clear an active selection before the existing standalone-close or resident interrupt behavior.
- [x] 6.3 Add focused reference-screen, route-host, and resident utility-tab regressions for automatic and explicit copy, disabled automatic copy, no-selection interrupt behavior, ANSI-safe extraction, and compact/scrolling interaction; record implementation evidence.

## 7. Shared dialog surface palette

- [x] 7.1 Add one component-level floating-dialog surface renderer with the native Plus Menu's truecolor and 256-color background palette.
- [x] 7.2 Remove the Settings route-host panel RGB and route Warnings, both Thinking Level steps, fallback Plus Menu, generic structured settings, and future configure dialogs through the shared semantic panel renderer.
- [x] 7.3 Add component, Settings integration, governance, and native-palette parity regressions for panel fill, selected-row restoration, color-mode fallback, and absence of dialog-specific background literals; record implementation evidence.

## 8. Blank-free Agent startup

- [x] 8.1 Keep a newly requested Agent's blank surfaces parked without a timer-driven commit, preserving the complete local startup preview and hidden child cursor until a nonblank coherent frame arrives.
- [x] 8.2 Preserve explicit create, holder, child, failed-surface, restart, and recovery outcomes, and update the resident-tab architecture record to remove the blank first-draw fallback.
- [x] 8.3 Add focused native presentation regressions for repeated and delayed blank surfaces, the first nonblank commit, and explicit failure resolution; record implementation evidence.

## 9. Changelog copy acknowledgement

- [x] 9.1 Report accepted automatic-selection character counts from Changelog selection without changing clipboard text, retained selection, or explicit-copy behavior.
- [x] 9.2 Render the shared one-second right-aligned accent `copied N chars to clipboard` acknowledgement above the reference footer, replacing and restarting it on newer automatic copies and clearing it on close.
- [x] 9.3 Add focused selection and reference-screen regressions for enabled, disabled, repeated, expired, narrow, scrolling, and non-selectable-route behavior; record implementation evidence.

## 10. Two-row scrollbar thumb minimum

- [x] 10.1 Raise shared overflowing-scrollbar thumb geometry to a two-row minimum whenever the track permits, while bounding the thumb to the track.
- [x] 10.2 Preserve top and bottom clamping, drag conversion, grab offsets, track paging, and proportional heights above the minimum without adding surface-specific branches.
- [x] 10.3 Add focused shared-scrollbar regressions for very long content, one-row and two-row tracks, thumb hit rows, and drag-to-end behavior; record implementation evidence.

## 11. Selection-first prompt copy and cut

- [x] 11.1 Keep pointer drags that begin in the prompt editor-owned through motion and release, including wrapped rows, out-of-bounds clamping, and atomic chips.
- [x] 11.2 Route `Ctrl+C` to copy and `Ctrl+X` to cut active prompt selections, while making the general message-copy action consume active non-editable frame selection before last-agent fallback.
- [x] 11.3 Preserve no-selection last-agent copy and `/copy`, prevent misleading last-agent notices while selection exists, and add focused shell/controller/editor regressions; record implementation evidence.

## 12. Shared text-selection surface

- [x] 12.1 Add one shared component-owned blue text-selection painter and route Agent frame selection, ordinary prompt selection, Settings search selection, Changelog, and `What's New` through it.
- [x] 12.2 Preserve ANSI foregrounds, attributes, hyperlinks, grapheme boundaries, exact frame dimensions, atomic-chip focus, and theme-owned list or menu row highlighting.
- [x] 12.3 Add focused component and recipient regressions that prove uniform selected-text styling and absence of recipient-owned selection RGB; record implementation evidence.
