## Context

See `proposal.md` for motivation and the delta spec for behavior. A1 mounts Pi's public built-in read renderer through its owned `ToolExecutionComponent` fallback. That renderer currently requests `warning` only for the call header's optional line-range suffix, while read-result truncation notices independently request the same token. A1's central bare-mode theme projection already maps `mdHeading` to the accent-derived secondary color used by Settings group headers; comparison mode deliberately installs the unmodified Pi theme.

## Goals / Non-Goals

**Goals:**
- Change only the semantic role used by the built-in read call's range suffix in bare A1.
- Reuse the central live accent projection and existing transcript invalidation path.
- Keep built-in result warnings, extension renderers, and comparison mode isolated.

**Non-Goals:**
- Change range calculation, read execution, result truncation, call geometry, or the accent transform.
- Restyle other warning-colored content or other tool arguments.
- Fork, patch, or modify the installed Pi package.

## Decisions

### 1. Adapt the built-in read call at the owned renderer boundary

Wrap only the built-in read fallback's `renderCall` at `ToolExecutionComponent` construction. In bare A1, the wrapper supplies a transparent theme view that redirects the renderer's call-time `warning` request to `mdHeading`; all other theme operations delegate unchanged. The built-in `renderResult` continues to receive the ordinary theme, so truncation and size notices remain warnings.

This preserves the public renderer's path formatting, compact resource classification, range arithmetic, expansion hints, and future compatible layout behavior. Editing `node_modules`, duplicating the complete read formatter, and replacing ANSI sequences after rendering were rejected because they respectively violate dependency ownership, create avoidable source drift, or infer semantics from rendered bytes.

### 2. Use the central product-mode theme boundary as the gate

Expose a read-only query for whether A1's semantic accent projection is enabled and consult it when invoking the built-in read-call renderer. Bare A1 enables that projection before shell presentation; `a1 pi` disables it and therefore receives the original renderer and theme unchanged. The query reports presentation mode only and does not introduce another accent value or cache.

Passing a second product-mode flag through every transcript factory was rejected because the process already has one central theme-mode authority and duplicating it would permit contradictory renderer state.

### 3. Preserve renderer ownership and live repaint behavior

Apply the adapter only to the built-in fallback. If an extension provides `renderCall` for `read`, the existing merge policy keeps that renderer and its unmodified theme. Existing theme-change invalidation reconstructs or repaints mounted transcript components, so the range follows live accent changes without a range-specific subscription.

Focused tests will compare effective ANSI cell styles for `:95-264` against `mdHeading` across representative accents, verify result warnings remain on `warning`, verify an extension renderer remains untouched, and verify projection-disabled output stays byte-identical to the pinned renderer.

## Risks / Trade-offs

- **[A future Pi read-call renderer uses `warning` for additional call-header content]** → Keep a focused compatibility fixture for the complete built-in call header and review the wrapper during pinned Pi upgrades.
- **[The mode gate leaks into comparison rendering]** → Assert exact owned-versus-pinned bytes with accent projection disabled and keep the gate in the central theme boundary.
- **[Result warnings are accidentally recolored]** → Scope the theme view to `renderCall` and assert truncation output still uses `warning`.
- **[Extension presentation is overridden]** → Apply the adapter after built-in creation but before the existing renderer merge, whose extension-provided call renderer remains authoritative.

## Migration Plan

No stored data or dependency migration is required. Implement the scoped adapter and focused regressions in the existing draft PR after explicit approval. Rollback removes the adapter and mode query, restoring the pinned warning-colored range without affecting profiles or sessions.
