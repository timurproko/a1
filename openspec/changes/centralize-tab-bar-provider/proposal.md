## Why

Resident tab behavior is split between an Agent-only path, an attach-side `UtilityKind` table, a separate server utility table, and kind-specific ordering helpers. That split makes equivalent tab-bar actions behave differently: after opening Settings, creating another Agent inserts it before Settings instead of appending it to the strip, and adding another tab kind requires updating several unrelated conditionals.

Prompt selection has a separate clipboard conflict. With `Copy on select` enabled, double-clicking a word in the prompt immediately replaces the system clipboard with that word. A following paste therefore reinserts the selected word instead of replacing it with the text the reader copied before selecting the target.

The native Commands and Plus Menu dialogs also build their shortcut footers as one literal muted string with middle-dot separators. Other owned dialogs use semantic key-and-action entries, painting shortcut keys in quiet gray and action descriptions in a distinct lighter gray. Keeping native tab dialogs outside that component contract makes their footer inconsistent and invites future dialogs to repeat the mismatch.

Settings has a related configure-surface mismatch. Plus Menu opens as a centered floating modal over a dimmed Settings screen, while Warnings, both Thinking Level steps, and generic structured settings replace the footer with a full-width docked panel. Configure actions should share one centered modal frame so current and future structured settings read as the same interaction.

The owned Changelog and startup `What's New` reference screens are read-only but currently consume document pointer input without offering text selection. Readers should be able to select release-note text with the same automatic-copy setting and explicit `Ctrl+C` fallback as the owned session frame, without weakening the resident tab's interrupt chord when no selection exists.

The centered Settings configure dialogs also use a lighter hardcoded gray surface than the native Plus Menu reference. Warnings and both Thinking Level steps therefore share geometry but not the intended dialog palette. The surface color should belong to the reusable dialog component, not the Settings route host or individual dialogs.

A newly started Agent can also outlast the bounded first-draw wait while its child surface is still blank. The attach view then commits that blank surface and exposes only the child cursor, replacing the complete local Agent startup preview before any usable UI exists. A blank surface is not a coherent Agent presentation and should never become visible merely because a timer elapsed.

## What Changes

- Introduce one native tab-bar provider contract that declares every tab kind and its label, shortcut action, multiplicity, activation behavior, prewarming, renameability, session ownership, route, and menu marker.
- Route Agent, Settings, Changelog, and future registered kinds through the same activation API. Multi-instance kinds create a new tab; singleton-toggle kinds create or reveal their one tab, activate an already shown tab, and hide the viewed tab according to the shared toggle rule.
- Make the tab bar own placement independently of tab kind: a newly created tab or a hidden tab joining the strip is appended after the existing visible tabs, selecting an already shown tab retains its slot, and drag order remains durable.
- Remove duplicated kind tables and type-specific ordering branches from attach and server behavior while retaining the established Agent and utility-tab outcomes.
- Treat editor-owned prompt word and line selection like an editable text field: retain the selected range without automatic clipboard submission, let paste replace it from the existing clipboard, and keep explicit `Ctrl+C` and cut behavior unchanged. Complete-frame transcript, prompt-row, application-message, and status selections continue to honor `Copy on select`.
- Add one reusable native shortcut-hint component for semantic key-and-action entries. Commands, Plus Menu, and future native tab dialogs use its display casing, separate gray roles, two-space entry gaps, separator-free text, and width-safe clipping.
- Add one shared centered configure-modal frame for owned Settings. Warnings, both Thinking Level steps, fallback Plus Menu, generic structured settings, and future object-valued settings render in that frame over a dimmed Settings backdrop while preserving their existing controls and state.
- Add owned text selection to the Changelog and `What's New` reference screens. Mouse selection paints through the shared semantic selection role, `Copy on select` controls automatic clipboard submission on release, and `Ctrl+C` explicitly copies and clears an active selection before existing close or interrupt behavior applies.
- Move the canonical floating-dialog surface palette into the shared component theme boundary. Warnings, both Thinking Level steps, fallback Plus Menu, and future Settings configure dialogs use the native Plus Menu's dark surface in truecolor and 256-color modes without route- or dialog-specific RGB styling.
- Keep a newly started Agent on its complete local startup preview while the child publishes only blank surfaces, with the cursor hidden. The first nonblank coherent frame replaces the preview; explicit launch, holder, or child failure continues through the existing failure and recovery presentation instead of revealing an empty terminal.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: tab-kind registration, activation, toggle behavior, kind-neutral append ordering, and blank-free Agent startup presentation.
- `session-frame-selection`: distinguish editor-owned prompt selection from complete-frame copy-on-select so prompt replacement does not overwrite its paste source.
- `owned-ui-settings`: present every configure workflow through the centered modal interaction used by Plus Menu.
- `ui-components`: replace the docked structured-value panel with a reusable centered modal overlay and dimmed backdrop.
- `ui-apps`: make Changelog reference documents selectable while preserving their scrolling and screen lifecycle.
- `pi-settings-runtime`: apply the live fullscreen copy-on-select value to Changelog selection as another owned fullscreen selection surface.

## Impact

- **Native attach core:** tab-kind provider declarations, activation dispatch, plus-menu and palette entries, visibility/prewarm state, context-menu capabilities, blank-first-frame gating, shared dialog shortcut-hint presentation, and tests.
- **Native server:** kind recognition, singleton reservation, registry validation, session ownership, bridge routes, creation/reveal ordering, and tests.
- **Owned session shell:** prompt pointer-selection release, clipboard routing, and focused replacement-paste tests.
- **Owned Settings and UI components:** centered structured-dialog geometry, canonical native-matching panel palette, dimmed backdrop composition, compact/narrow clipping, and Warnings, Thinking Level, and fallback Plus Menu regressions.
- **Owned reference screens:** Changelog selection state, semantic painting, clipboard callbacks, live copy-on-select reads, explicit-copy precedence, and resident utility-tab coverage.
- **Architecture:** the resident-tab design records the tab bar as the single owner of tab-kind behavior.
- **Protocols and dependencies:** existing wire messages remain compatible; no dependency is added.
