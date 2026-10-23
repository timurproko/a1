## Context

See `proposal.md` for motivation and the delta specs for observable behavior.

The requested work crosses two presentation owners. TypeScript owns the shared prompt/input chrome and A1 settings declarations. The native attach client owns resident fullscreen entry, initial tab selection, the one-row strip, host overlays, child-to-outer coordinate mapping, pointer routing, and final cursor placement.

Current input composition has one default prefix (`❯ `) used by both the multiline user editor and A1 single-line inputs. Current resident composition assumes the strip is outer row 1 throughout strip rendering, structured child replay, legacy fallback bytes, overlays, mouse normalization, and cursor restoration. Drag state already computes a destination and sends a reorder on release, but its insertion marker is a separate host overlay; ordinary strip repaints can overwrite that unchanged overlay, making feedback flash or disappear while the pointer is still dragging. The attach server already chooses the first durable tab when no explicit target is supplied, but that choice is not returned to the client handshake, so the client's first tab-list frame can have no active identity. Fullscreen entry also leaves the terminal cursor visible until the asynchronous first presentation hides it.

The interpretation used by this plan is that the main user prompt keeps its chevron and gains one leading cell, while auxiliary Agent and Settings text inputs lose their marker. Extension-owned editors and `a1 pi` remain outside this customization.

## Goals / Non-Goals

**Goals:**

- Make prefix selection explicit in the shared input component rather than creating separate renderers.
- Carry one authoritative resident strip position through every native coordinate decision.
- Preserve the child's terminal dimensions and semantic coordinates when the strip moves.
- Make an existing server-selected tab active before the first topology paint without weakening the first-draw gate for a newly created tab.
- Apply tab position live from the shared profile settings document.
- Make drag insertion feedback stable and keep reorder semantics release-only, no-op safe, and durable.

**Non-Goals:**

- Changing active-tab persistence between clients, Agent lifecycle, or session recovery.
- Adding keyboard reorder behavior beyond the existing shortcuts or changing durable order semantics.
- Moving or changing the child's own footer, editor, transcript, or scrollbar geometry.
- Changing pinned Pi, extension-provided custom editors, or nonresident launches.
- Adding more strip positions, sizes, or per-client persisted choices.

## Decisions

### 1. Prefix configuration remains part of one shared input composition

The shared `PromptInput` geometry will accept the complete presentation prefix as data. The main user editor will use ` ❯ ` (one ordinary blank cell, the existing chevron, then the existing separator). Auxiliary A1 line inputs will pass an empty marker and will continue using the same rule, clipping, caret, placeholder, and width implementation.

`PROMPT_PREFIX_WIDTH` and tests will follow the measured default prefix rather than retaining the former hard-coded two-cell width. Semantic editor text remains unchanged because the prefix stays outside the editor body. Suggestion layout will continue to ask the same prompt geometry for its available width.

A second input component was rejected because it would recreate the divergence the shared component contract was introduced to prevent. Removing the main chevron was rejected because item 3 explicitly asks for spacing before that icon; item 4 is therefore scoped to auxiliary Agent and Settings inputs.

### 2. The server reports an existing initial selection additively

The attach admission response will gain an optional selected-tab identifier. The server will populate it only when the requested/default tab already exists in the durable registry. The client will initialize its view model with that identity before rendering the first strip frame.

An empty registry will not report a selected tab. Its subsequently created first tab therefore continues through the existing requested-view and first-draw gate, avoiding a regression to blank active-tab flashes.

Inferring the selection from the first `tab.list` response was rejected because topology can arrive before a surface and cannot distinguish the server's admitted selection from a later registry order. Painting `requested` as active globally was rejected because it would violate the coherent chip/body commit rule during ordinary tab switches.

### 3. Cursor hiding belongs to synchronous fullscreen entry

The native outer-mode entry sequence will hide the cursor before returning from terminal setup. The restore sequence will explicitly show it again, in addition to normal presented cursor updates and quit-outro handling. This closes the interval before the writer thread processes the initial hidden-cursor frame.

Adding another initial writer offer was rejected because the artifact exists precisely before that asynchronous offer is guaranteed to reach the terminal.

### 4. One strip-layout value owns all native coordinate transforms

A native `TabBarPosition` value (`Top` or `Bottom`) will be resolved from the A1 settings namespace and stored by the attach client. A small geometry helper will derive:

- the one-based outer strip row;
- the one-based first outer child row;
- child-row to outer-row mapping;
- outer pointer-row to optional child-row mapping; and
- whether a pointer row belongs to the strip.

Strip rendering will accept its target row instead of embedding row 1. Structured surface replay, row clearing, suffix erasure, final cursor placement, notices, popup/drag placement, selection geometry, and quit-outro row widths will use the same helper. Top mode preserves current bytes and behavior. Bottom mode maps child row zero to outer row one and places the strip at `outer_rows`.

Scattered `if bottom` adjustments were rejected because missed offsets would create exactly the stale rows and incorrect clicks this change is intended to prevent.

### 5. Legacy fallback is translated at the attach presentation boundary

Current-generation clients negotiate structured surfaces, but the retained legacy fallback must not write into the wrong row. The attach presentation boundary will translate the known complete positioned legacy surface from its current top-strip outer coordinates to the selected child origin before composing it. The translation will be bounded to absolute row-addressing sequences emitted by the resident surface encoder and will leave style, link, palette, text, and synchronization controls unchanged. Strip and overlays will still be restored after legacy writes under the existing policy.

Changing the holder's legacy encoding globally was rejected because one holder can serve clients with different live settings and because it would silently reinterpret same-generation bytes for older clients.

### 6. Tab-bar position is an A1-owned live setting

The declaration table will add `tabsPosition` (presented as `Tab bar position`) under Tabs, default `top`, allowed values `top` and `bottom`, application `live`. Direct launch context filtering already removes the complete Tabs section, so the setting remains resident-only in presentation.

The native settings watcher will be generalized from time-format-only state to strip presentation settings. On a file-signature change it will reread time format, accent hover, and position. A changed position invalidates the presentation baseline and requests one coherent repaint at the new geometry; it does not resize or restart the child because its row count is unchanged.

A restart-bound setting was rejected because the native client already watches the same settings file and live movement can be made atomic within the existing presentation model.

### 7. Position changes invalidate coordinate-dependent presentation state

When the effective edge changes, the composer will force replacement of both the former strip row and every child row at the new origin. Host hover/drag/menu state may remain semantically open, but its bytes and hit regions will be recomputed against the new strip row. The current child surface, overlay, modes, and cursor will be presented together under the new mapping.

Incrementally moving only the strip was rejected because the old child origin, cursor, or overlay could remain visible for one frame on terminals that expose ordered writes.

### 8. Drag feedback is composed into the strip frame

The drag state machine will continue to begin from a left press, become visible after pointer movement or the established hold threshold, compute insertion by tab midpoints, and send one reorder only on left-button release over a changed strip destination. The renderer will compose the insertion line into the same strip frame as chips, hover, overflow, add control, and clock instead of publishing it as a separate overlay.

This follows the proven legacy v2 behavior supplied by the maintainer: the marker is stable through strip repaints, the tab order remains unchanged during preview, current-slot previews are suppressed, and release commits exactly one move. Leaving the strip, releasing at the original slot, losing the tab, or receiving stale reorder state cancels without mutating order.

Keeping the marker as an independent overlay was rejected because an unchanged overlay is not automatically replayed when only the strip bytes change. Reordering continuously during pointer motion was rejected because it makes hit geometry move under the pointer and produces jitter instead of a predictable insertion preview.

### 9. Tests compare semantic geometry and exact terminal bytes

TypeScript tests will cover default prompt prefix width, marker-free auxiliary rows, suggestion wrapping, and setting declaration/resolution/persistence. Native tests will cover immediate cursor hiding/restoration, optional initial selected-tab metadata, first topology highlighting, top and bottom row mapping, live position changes, strip hits, child mouse coordinates, overlays, final cursor coordinates, structured plus legacy presentation, stable drag preview, no-op suppression, release-only reorder, cancellation, and stale revision refusal.

The tests will retain top-position exact-byte fixtures where possible and add bottom-position fixtures rather than weakening existing assertions.

## Risks / Trade-offs

- **[A missed hard-coded row offset leaves stale cells or misroutes input]** → Centralize every transform in one geometry helper and search for all direct `+ 1`, `+ 2`, row-1, and row-2 strip assumptions during implementation.
- **[Live movement exposes an intermediate frame]** → Invalidate the complete coordinate-dependent presentation and emit strip, child, overlay, modes, and cursor in one synchronized presentation.
- **[Legacy ANSI translation handles an unexpected sequence]** → Translate only the bounded absolute cursor-position sequences emitted by the resident encoder, fail closed instead of emitting malformed fallback bytes, and cover generated legacy frames rather than arbitrary child streams.
- **[Handshake field affects same-generation compatibility]** → Make the field optional with a default; older peers ignore it and newer clients retain the existing surface-adoption path when absent.
- **[Drag preview flickers or reorders against moving geometry]** → Paint the marker inside the strip frame and defer the single durable reorder until release against the original registry revision.
- **[The phrase “all inputs in agent” includes an extension-owned editor]** → Keep the implementation to A1-owned auxiliary Agent inputs as specified; extension-owned custom editors and pinned Pi are explicitly unchanged.

## Migration Plan

No destructive data or protocol migration is required. Existing profiles omit `tabsPosition` and resolve to `top`. Setting persistence stores only a non-default `bottom` value and removes it when returned to `top`. The attach handshake addition is optional. Rolling back the release leaves an unknown A1 settings property preserved by forward-compatible settings writes, while older behavior continues to place the strip at the top.

## Implementation Evidence

- Shared prompt, dialog, Settings search, autocomplete, history, shell, settings declaration, persistence, direct-launch hiding, and session-selection coverage exercises the new prefix and tab-position behavior.
- Native contract tests compile with the optional attach selection, synchronous cursor modes, top/bottom geometry, structured and legacy presentation, popup/notice/cursor/outro placement, stable strip-integrated drag markers, cancellation, release-only reorder, and revision-guarded durable order cases.
- `npm run typecheck`, the focused Settings application suite, `npm run test:fast`, contracts-only `cargo check --tests`, architecture governance, formatting, and strict OpenSpec validation passed locally.
- Full native test execution remains environment-gated because the local checkout has no linkable Ghostty VT artifact or Zig toolchain; contracts-only compilation covers the test code and normal CI owns executable native validation.
- Known gaps: none.
