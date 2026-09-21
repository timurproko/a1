## Context

See `proposal.md` for motivation. Bare A1 already declares `app.thinking.cycle` as `Ctrl+L`, and its editor, startup help, and `/hotkeys` presentation use that owned profile. The `/thinking` route instead constructs Pi's public `ThinkingSelectorComponent`, whose heading is plain text and whose hint reads the process-global Pi keybinding manager. That manager can expose the comparison profile's `Shift+Tab` default while the bare-A1 editor correctly dispatches `Ctrl+L`.

The component's heading and hint are internal children, so correcting them by reflection or rendered-string substitution would violate the owned component boundary. The comparison profile must remain isolated rather than inheriting a bare-A1 label.

## Goals / Non-Goals

**Goals:**

- Give the bare-A1 thinking selector an owned presentation whose hint is sourced from the same resolved binding data as dispatch.
- Match the established bold accent heading treatment and the Models dialog's compact row grammar.
- Place the muted cycle hint directly below the heading, deduplicate level rows, show the configured default as `<level> (default)`, keep descriptions muted and column-aligned on every row, place the active marker directly after the rendered active label, and omit duplicate thinking-level state from the footer while the selector is open.
- Preserve explicit keybinding overrides and keep comparison-profile construction independent.

**Non-Goals:**

- Changing thinking levels, cycle order, model clamping, persistence, or workflow outcomes.
- Editing installed Pi package files or inspecting private component children.
- Changing unrelated selector headings or comparison-profile keybindings.

## Decisions

### 1. Add an owned bare-A1 thinking selector at the component façade

Port the minimum coherent thinking-selector component from the pinned public implementation into the existing owned component area, retaining provenance and its search, list, focus, save, select, and cancel behavior. Change the title styling, source and placement of the cycle-key label, and row presentation: the muted cycle hint sits immediately below the heading, duplicate available levels collapse to one row, the configured default gains an adjacent `(default)` label marker, descriptions remain inline, muted, and aligned after the widest rendered primary label, and the active level receives one adjacent success marker. The shell will choose this owned component for its bare-A1 layout and retain the public Pi component for the comparison layout.

Wrapping the public component with an additional heading was rejected because it would duplicate the original plain heading. Mutating its private child array or replacing rendered ANSI text was rejected because either approach couples A1 to private layout and cannot provide a stable component contract.

### 2. Pass resolved shortcut presentation into the selector explicitly

At selector creation, obtain the effective `app.thinking.cycle` value from the active editor keybinding profile and format it with the same platform-aware key-label grammar used by other shortcut help. Pass that display value into the owned selector instead of consulting process-global keybinding state. Default bare A1 therefore displays `Ctrl+L`, while an explicit override displays its resolved key.

Hardcoding `Ctrl+L` was rejected because it would make customized help diverge from dispatch. Temporarily replacing the global keybinding manager was rejected because modal construction must not alter unrelated active surfaces.

### 3. Use semantic theme roles for the heading and level rows

Render `Thinking Level` through the semantic accent color and bold style, matching `Model Configuration` rather than embedding a terminal color escape. Render the resolved cycle hint in semantic muted grey on the immediately following row. Collapse duplicate available-level values before constructing rows and append `(default)` to the configured default's level label instead of its description. Render only the highlighted level label and arrow in accent, every inline description in muted grey, and the active level's single checkmark immediately after its rendered label in semantic success green. Reserve enough primary width for the widest rendered label-plus-marker and begin every description in the same column one separator later. While this replacement surface is open, omit the footer's thinking-level suffix so the active level appears only in the selector; restore it on close. Tests will inspect title/hint adjacency, default-label placement, plain order, aligned columns, occurrence count, restoration, and semantic ANSI styles so visually similar regressions cannot pass on text alone.

A literal cyan or green escape was rejected because themes own concrete colors and accessibility behavior. Reusing the stock selected-row styling unchanged was rejected because it wraps the description in accent color and keeps the current marker before the title. Hiding the whole footer was rejected because model, usage, context, and extension status remain useful while selecting a level.

## Risks / Trade-offs

- **[Risk] A source-adapted selector can drift from future Pi behavior.** → Keep the port minimal, record provenance, and retain interaction tests for every copied behavior while comparison mode continues using the public component.
- **[Risk] Shortcut formatting can diverge from startup or hotkey help.** → Reuse the resolved keybinding configuration and shared formatting grammar; cover defaults and explicit overrides in one focused test matrix.
- **[Risk] Profile selection can leak the owned component into comparison mode.** → Select the component through the existing bare-versus-comparison layout decision and assert both routes independently.
- **[Risk] Nested row styling or column alignment can regress when selection moves or filtering rebuilds the list.** → Assert default-label placement, selected and unselected description cells, description column equality, marker order, one-occurrence rendering, and footer restoration after close.

## Migration Plan

1. Add the owned selector and façade option without changing route or workflow contracts.
2. Route bare A1 through the owned selector with its editor's effective binding; retain the public selector for comparison mode.
3. Add focused presentation, binding, interaction, and profile-isolation evidence.
4. Roll back by reverting the owned selector routing; no settings or session migration is required.
