## Context

See `proposal.md` for motivation. Most framed bare-A1 modal components currently compose a top `DynamicBorder`, a one-row `Spacer`, and then a title. That sequence appears in owned Models and Skills dialogs and in source-synchronized Thinking, scoped-model, session, tree, trust, and extension dialog families. Other modal routes delegate to public pinned components or use nested states, so changing only the visibly reported dialog would leave the same gap elsewhere and invite it to return.

The recently established modal inventory already identifies every built-in and extension-hosted modal node and its presentation owner. Bare A1 may intentionally customize these surfaces, while the explicit `a1 pi` profile remains the untouched pinned comparison route.

## Goals / Non-Goals

**Goals:**
- Render a titled framed modal with its title immediately after the top rule.
- Give every A1-authored modal content row the same one-cell global left inset used by full-screen A1 surfaces while keeping frame rules full width.
- Encode vertical and horizontal geometry once in a reusable modal component boundary used by every applicable bare-A1 modal family.
- Preserve relative indentation inside list, form, description, and shortcut content.
- Prove inventory-wide adoption and stable narrow-width, resize, focus, and transition behavior.

**Non-Goals:**
- Remove blank rows below titles or elsewhere in modal bodies.
- Change border styling, title text or styling, semantic shortcut presentation, list markers, editing behavior, or bottom padding.
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

### 3. Make horizontal padding a frame-owned content property

The shared frame renders top, bottom, and explicitly declared separator rules at full width. It renders every semantic content component — title, search/input, selectable rows, descriptions, status, and shortcuts — within a one-cell left inset and one-column-smaller content width. Existing row-authored spaces remain relative indentation inside that content area. Callers do not add a separate outer title or hint indent, preventing double padding and preserving heading/shortcut alignment.

A terminal-output heuristic that prefixes rows based on visible text was rejected because it cannot distinguish a rule from content reliably and would make ANSI output determine semantics. The frame instead receives semantic rule and content components and owns their composition.

### 4. Preserve vertical body geometry and interaction

The change removes exactly one top-title gap from each applicable modal and adds no vertical rows. Existing spacing after the title, relative content indentation, list selection markers, bottom rule spacing, clipping, and wrapping remain intact within the one-cell-smaller content rectangle. Search and editor components receive the reduced width so their caret, clipping, and pointer geometry agree with their visible position. Modal height naturally decreases by one row, and overlay centering may move by the compositor's normal response to that smaller height.

### 5. Use inventory-backed component evidence

Extend modal presentation coverage so every inventoried node has one of three dispositions: it uses the shared compact padded frame, it is intentionally unframed, or it is an extension-owned custom surface whose geometry is not authored by A1. Representative render tests will assert that the top rule is followed immediately by the title, every A1-authored content row has the global inset, rules remain full width, only one vertical row is removed, and relative row indentation/styles remain coherent. Interaction tests retain authority for navigation, completion, cancellation, nesting, focus restoration, resize, and disposal.

## Risks / Trade-offs

- **[A public pinned modal cannot accept the shared frame]** → Adapt it only behind the bare-A1 factory or source-synchronize the minimum coherent component, retaining provenance and leaving comparison constructors untouched.
- **[A broad spacer removal compacts body sections]** → Give the shared frame explicit rule/title/body slots and assert representative complete frames, not a generic blank-row filter.
- **[Padding already authored into a row is doubled]** → Move only the global inset into the frame; retain local spaces solely where they express relative list, field, or description indentation.
- **[Reduced content width desynchronizes input or pointer geometry]** → Render child components at the reduced width and add focused narrow-width, caret, and interaction evidence.
- **[A shorter modal shifts centered overlay bounds]** → Treat the one-row height reduction and resulting normal centering as intentional; assert pointer ownership and computed bounds still match rendered rows.
- **[Unframed extension surfaces are changed accidentally]** → Require an inventory disposition and do not infer content or rules from rendered strings.
- **[New modal code bypasses the policy]** → Add source/inventory governance that rejects applicable bare-A1 modal producers not routed through the shared frame boundary.

## Migration Plan

No persisted-data migration is required. Land the shared padded frame, all bare-A1 adaptations, and coverage atomically. Rollback restores the former per-row horizontal placement and one-row top gap without affecting sessions, settings, or installed dependencies.
