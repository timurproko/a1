# Design

## Scope and existing behavior

PR #900 assigned Ctrl+P to Apps, assigned Ctrl+M to model selection, and moved the unified Models component from the input dock to a floating modal. This follow-up restores the requested model interactions without undoing the application separation, modal contrast improvements, or semantic quiet-success policy.

## Decisions

### Separate cycling from selection

Assign bare A1's `app.model.cycleForward` default to `ctrl+m` and remove the default from `app.model.select`. Keep the existing engine cycle workflow, effective binding resolution, and user overrides. Do not invent a replacement selection chord or alter backward cycling. Help must derive Ctrl+M as cycling, Ctrl+P as Launcher, and `/models` as the unbound selector's command fallback.

Historical verification against `8c5a4d03` (the parent of PR #900) confirms that Ctrl+P dispatched `onModelCycle` to `cycleModelWorkflow("forward")`, which delegated to `session.cycleModel`. The pinned AgentSession chooses all available models when its session scope is empty; otherwise it uses only scoped entries present in the available-model snapshot, preserving scope order. Ctrl+M must use this same delegation, wraparound, per-model thinking behavior, and zero/one-eligible-model no-op rather than construct a new pool or fall back outside a nonempty scope. Add explicit regression cases for both pools, including clearing a scope back to all available models.

The existing keybinding boundary must continue treating raw carriage return as Enter. Distinguishable Ctrl+M encodings cycle exactly once without opening Models; an ambiguous legacy encoding submits or accepts as Enter. Do not alter the comparison profile.

### Restore the pre-Apps Models dock integration

Keep the unified Models controller and its deferred loading, but mount it through the existing replacement input surface rather than the floating-overlay coordinator. Compare its layout and styling against the parent of PR #900. Both `/models` and an explicit effective selection binding must use the same dock presentation. Close and accept must restore the existing prompt draft and ordinary input ownership.

Retain the selector's search, all/scoped filter, scope editing and saving, ordering, keyboard actions, compact layouts, and transcript scroll/copy behavior. Restore the original non-floating styling only for the in-place Models surface; Launcher and nested Settings floating selectors must retain the raised shared palette and deterministic backdrop.

### Rename presentation, not identity

Use `Launcher` for the modal title and omit its description/subtitle entirely, without reserving a blank description row. Align user-facing shortcut help, loading/unavailable messages, and close guidance. Keep stable internal application IDs, the existing neutral routes, and internal action identifiers where renaming would be gratuitous. Ctrl+P remains available from Agent, Settings, and Changelog.

## Non-goals

- No additional applications, process launching, or new default selection/backward-cycle chords.
- No changes to Agent session identity, draft/attachments/queue/work preservation, startup What's New, or removed built-in Settings/Changelog commands.
- No changes to model scope semantics, model-cycle ordering, quiet-success metadata, diagnostic visibility, comparison defaults, footer PR links, or shared floating-dialog colors.

## Validation approach

Add focused declarations/help/input-dispatch tests for direct cycling and legacy Enter, in-place selector tests for prompt and transcript ownership, and Launcher presentation/switching tests. Run bounded affected tests, typecheck, strict OpenSpec validation, and relevant architecture/provenance/documentation checks before pushing implementation. Required exact-head CI remains authoritative after trusted readiness and finalization.

## Risks

Ctrl+M and Enter cannot be separated in legacy terminal input; preserving Enter is mandatory, and existing explicit user cycle bindings remain available. Restoring a dock component must not accidentally keep floating modal geometry, stale input ownership, lost drafts, or a startup import of the optional Models controller.
