## Context

See `proposal.md` for motivation and the delta specs for the behavior contract. The shared `PromptInput` currently owns agent-prompt and single-line ruled-input chrome, but its rule helper writes fixed RGB `154/160/166`. Modal rules instead resolve `piTheme().fg("border", text)` through the live A1 theme projection. Bare A1 injects a live theme callback into `PromptInput`; the `a1 pi` comparison bypasses that shared presentation and retains Pi's editor border path.

The editor can contribute semantic top/bottom rule fragments for history, scrolling, and autocomplete counters. Those fragments and any remaining rule fill must stay one visual role without changing their width or annotations.

## Goals / Non-Goals

**Goals:**
- Make every shared ruled-input bar resolve through the active semantic modal-border role.
- Keep one styling authority for plain rules and annotation-bearing rule fragments.
- Preserve live accent repainting, ANSI-aware width, editor geometry, and comparison isolation.

**Non-Goals:**
- Add pane focus state, inactive-pane colors, or multipane composition.
- Change the primary accent transform or modal border palette.
- Restyle prompt arrows, body text, caret, placeholders, counters, thinking labels, or extension-owned editors.
- Change pinned `a1 pi` border behavior.

## Decisions

### 1. Resolve rules through the shared component's injected theme

Replace the fixed-RGB rule policy with the shared presentation theme's `border` foreground. Both complete rules and annotation-bearing rule fragments will use the same component-owned styling path, so the trailing fill cannot remain grey while a fragment uses the border role.

The default plain test theme remains unstyled, while production bare A1 continues to pass a callback that resolves `piTheme()` at render time. This preserves live accent changes without caching concrete ANSI or coupling generic UI components to Pi. Exported rule helpers will accept or delegate to the same presentation policy rather than remain a second fixed-color authority.

Alternatives rejected:
- Styling only the agent editor call site would leave Settings search and other shared ruled inputs inconsistent.
- Replacing the RGB literal with a new literal would not follow accent changes or modal semantics.
- Using the primary `accent` token would make prompt bars brighter than the modal bars the user selected as the reference.

### 2. Use semantic `border` as the active-input contract

The colored state is defined as the existing modal `border` role, which is already a derived member of each selected accent family. This produces exact semantic alignment with modal bars while retaining the hierarchy between brighter accent titles and darker rules.

This change does not introduce an `active` boolean into `PromptInput`. A future multipane host can select the active presentation or supply a neutral inactive presentation at its own focus boundary; adding an unused focus API now would create behavior without an owner.

Alternative rejected: adding pane activity state to the editor before panes exist. That would couple a reusable input component to speculative workspace state and leave inactive behavior untestable in the current product.

### 3. Preserve profile and mode boundaries

Bare A1's shared input presentation changes, including Settings search and contextual prompt suggestions that reuse it. Pinned `a1 pi` continues through its existing Pi editor presentation and keeps thinking-level/bash border colors. Thinking-level and bash transitions in bare A1 remain semantic editor state changes but do not override the modal-border rule role.

Focused coverage will compare effective cell styles rather than merely searching for ANSI substrings. It will cover shared agent/search/modal equality, live accent switching, annotated rules, narrow widths and geometry, thinking/bash transitions, and an unchanged pinned comparison path.

## Risks / Trade-offs

- **[Annotation fragments and fill receive different colors]** → Route both through one shared rule styler and assert effective styles on each portion.
- **[A live accent change leaves cached prompt rows stale]** → Exercise the existing theme invalidation path with a visible input and compare before/after cell styles.
- **[Generic component tests become coupled to Pi colors]** → Keep the component dependent only on `UiTheme`'s semantic `border` token and use injected test themes.
- **[Pinned editor parity changes through shared helpers]** → Retain the profile boundary and add paired bare-A1/`a1 pi` assertions.
- **[Future inactive panes need a different role]** → Defer that role and focus-state API until the multipane host owns an observable inactive surface.

## Migration Plan

No stored data or settings migration is required. Implement the semantic rule path and focused regressions in the existing draft PR after explicit approval. Rollback restores the prior fixed neutral rule styling without affecting user profiles, sessions, or the accent palette.
