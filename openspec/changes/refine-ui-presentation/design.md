## Context

The main self-updater and dependency-free installer each render a 40-cell progress bar before a space and percentage. They intentionally live in separate runtime surfaces because the installer cannot depend on the installed application, so presentation parity is maintained through equivalent constants and focused conformance coverage rather than a shared runtime import.

The native strip currently derives an active chip background from each `StripTab` accent. Utility tabs are then overwritten through an `is_utility_tab` branch using the attach client's locally read accent fallback, while Agent tabs retain their bridge-reported accent. That kind-specific path can leave Settings and Changelog on the purple fallback while the resolved owned accent and Agent selected chip are blue. The pending Agent already has a distinct lighter-to-settled fill, but both shades should come from the same strip-level selected color as every other tab.

## Goals / Non-Goals

**Goals:**

- Reduce both visible bar segments to 38 terminal cells.
- Keep progress filling proportional across the new width and keep both renderers byte-equivalent apart from their selected accent input.
- Update row-clearing bounds so the installer removes the complete shorter frame without leaving stale cells.
- Expose one strip-level active-tab color input used by Agent, Settings, and Changelog.
- Keep pending Agent initialization as a lighter shade that fills into the shared settled active-tab color.

**Non-Goals:**

- Changing progress milestones, creep behavior, colors, glyphs, percentage formatting, or success/failure transcripts.
- Introducing a runtime dependency from the bootstrap installer to the main package.
- Dynamically sizing the meter from terminal width or version-string length.
- Changing per-tab working-status glyph colors, title animations, utility routes, or tab activation behavior.
- Adding tab-kind color declarations to the provider.

## Decisions

### Retain bounded local width constants

Set the self-update and installer bar-width constants to 38 in their existing modules. A shared imported constant was considered, but it would add another installer package asset or couple bootstrap execution to application code. Focused tests will bind both renderers to the same observable width instead.

### Preserve the existing percentage suffix

Keep the current single-space `<percentage>%` suffix and change only the bar segment. This produces the requested two-cell reduction without changing number formatting or causing percentage-width padding to appear during progress.

### Derive cleanup width from the compact frame

The installer already clears a bounded maximum frame. Keep that bound derived from the bar width plus the existing maximum percentage suffix so shortening the renderer also shortens cleanup while still erasing a prior `100%` frame.

### Pass the selected-tab color through the strip API

Extend the native strip render boundary with one resolved active accent supplied by attach presentation settings. The chip renderer will use that argument for every active tab regardless of kind. Per-tab accent remains available for working glyphs and title animation, but no longer chooses the selected background.

A provider field per tab kind was rejected because active color is a strip-wide presentation role, not Agent, Settings, or Changelog behavior. Keeping it outside `TabKindProvider` avoids recreating the hardcoded kind distinction at a different layer.

### Resolve the owned default before rendering

Treat the declared owned Accent default as blue when the settings document omits a stored value, matching the TypeScript settings API and utility bridge. Explicit supported colors continue to resolve normally. The render API therefore receives one concrete semantic accent instead of relying on `None` to mean purple in one recipient and blue in another.

### Derive pending and settled shades from one color

The pending Agent chip will mix the shared active accent toward white for its initialization shade. Its fill will transition into the normal selected shade derived from that same accent. Settings, Changelog, and committed Agent tabs use the normal selected shade directly.

## Risks / Trade-offs

- **The summary text can vary with selected versions** → Use the requested fixed compact geometry rather than fragile per-message dynamic sizing.
- **Separate constants could drift later** → Assert the exact 38-cell geometry in both focused suites and retain specification-level parity.
- **A shorter bar has slightly less visual resolution** → Percentage text remains authoritative and 38 cells still gives fine-grained visible movement.
- **Separating selected color from per-tab status accent adds a render argument** → Keep the argument semantic and mandatory at the attach boundary, with convenience wrappers using the owned blue default in isolated tests.
- **A missing setting previously implied purple in native code** → Bind the native default to the owned settings contract and cover omitted, explicit, utility, Agent, and pending-fill cases.

## Migration Plan

No data or configuration migration is required. Ship the presentation changes with the application and installer package. Reverting the two width constants restores the prior progress geometry; reverting the strip-level active-accent argument and default resolution restores the former per-tab selected-color behavior.
