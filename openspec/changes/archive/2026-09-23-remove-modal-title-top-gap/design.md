## Context

See `proposal.md` for motivation. Most framed bare-A1 modal components currently compose a top `DynamicBorder`, a one-row `Spacer`, and then a title. That sequence appears in owned Models and Skills dialogs and in source-synchronized Thinking, scoped-model, session, tree, trust, and extension dialog families. Other modal routes delegate to public pinned components or use nested states, so changing only the visibly reported dialog would leave the same gap elsewhere and invite it to return.

The recently established modal inventory already identifies every built-in and extension-hosted modal node and its presentation owner. Bare A1 may intentionally customize these surfaces, while the explicit `a1 pi` profile remains the untouched pinned comparison route.

## Goals / Non-Goals

**Goals:**
- Render a titled framed modal with its title immediately after the top rule.
- Encode that geometry once in a reusable modal component boundary used by every applicable bare-A1 modal family.
- Keep title and shortcut left-edge alignment and every content-row inset intact.
- Prove inventory-wide adoption and stable narrow-width, resize, focus, and transition behavior.

**Non-Goals:**
- Remove blank rows below titles or elsewhere in modal bodies.
- Change border styling, title text or styling, shortcut presentation, list markers, search/editor geometry, or bottom padding.
- Compact transcript cards, startup notices, full-screen documents, or other ruled content that is not a modal.
- Change modal actions, state, controller lifecycles, or installed Pi package bytes.
- Alter `a1 pi` pinned-comparison output.

## Decisions

### 1. Make top-title adjacency a modal-frame invariant

Introduce a shared bare-A1 modal frame component or component adapter that owns the top rule and title slot. When a framed modal has a title, the title is emitted as the row immediately following the top rule; the API does not expose an optional top-title spacer. Body composition begins after the title and may retain its existing intentional spacer.

Deleting `Spacer(1)` independently in every constructor was rejected because it leaves no reusable invariant, misses public-component adapter paths, and allows new dialogs to restore the gap by copying an older layout.

### 2. Adapt modal producers at their existing ownership boundary

Route owned and source-synchronized titled modal families through the shared frame boundary. Where a pinned public component hardcodes its frame and cannot accept shared chrome, adapt or minimally source-synchronize it behind the existing bare-A1 factory rather than patching installed dependencies. The modal inventory will classify genuinely untitled/custom surfaces explicitly instead of forcing a title onto them.

The explicit `a1 pi` factories continue to construct pinned components directly. A global terminal-row rewrite was rejected because rendered ANSI rows do not reliably identify semantic titles and could compact unrelated ruled content.

### 3. Preserve body geometry below the removed row

The change removes exactly one top-title gap from each applicable modal. Existing spacing after the title, title horizontal inset, content indentation, search and editor widths, list selection markers, shortcut alignment, bottom rule spacing, clipping, and wrapping remain the component's responsibility and stay unchanged. Modal height naturally decreases by one row, and overlay centering may move by the compositor's normal response to that smaller height.

### 4. Use inventory-backed component evidence

Extend modal presentation coverage so every inventoried node has one of three dispositions: it uses the shared compact frame, it is intentionally untitled, or it is an extension-owned custom surface whose geometry is not authored by A1. Representative render tests will assert that the top rule is followed immediately by the title, that only one row is removed, and that title/body/hint columns and styles do not change. Interaction tests retain authority for navigation, completion, cancellation, nesting, focus restoration, resize, and disposal.

## Risks / Trade-offs

- **[A public pinned modal cannot accept the shared frame]** → Adapt it only behind the bare-A1 factory or source-synchronize the minimum coherent component, retaining provenance and leaving comparison constructors untouched.
- **[A broad spacer removal compacts body sections]** → Give the shared frame explicit top-rule/title/body slots and assert representative complete frames, not a generic blank-row filter.
- **[A shorter modal shifts centered overlay bounds]** → Treat the one-row height reduction and resulting normal centering as intentional; assert pointer ownership and computed bounds still match rendered rows.
- **[Untitled extension surfaces are changed accidentally]** → Require an inventory disposition and do not infer titles from rendered strings.
- **[New modal code bypasses the policy]** → Add source/inventory governance that rejects applicable bare-A1 modal producers not routed through the shared frame boundary.

## Migration Plan

No persisted-data migration is required. Land the shared frame, all bare-A1 adaptations, and coverage atomically. Rollback restores the former frame component and its one-row top gap without affecting sessions, settings, or installed dependencies.
