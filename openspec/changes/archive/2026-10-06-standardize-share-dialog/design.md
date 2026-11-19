## Context

The share command currently creates the same adapted `BorderedLoader` used for pinned operation parity. That component owns cancellation and animation, but its anonymous frame, slash-combined hint, and trailing spacer predate the shared titled-modal and semantic-shortcut conventions now used by bare-A1 dialogs. On completion, the shell creates explicit OSC 8 links for both returned URLs, but the custom viewport's dock-notice rendering does not pass those rows through the native link presentation that already gives transcript web links the `mdLink` foreground and terminal-owned idle/hover decoration.

The custom viewport is an accepted bare-A1 customization. `a1 pi` remains the untouched comparison path, so the presentation change must be selected by profile rather than changing the shared pinned loader globally. The workflow runner remains authoritative for authentication, export, gist creation, URL values, and cancellation outcomes.

## Goals / Non-Goals

**Goals:**
- Compose bare A1's in-progress share operation from the same frame, title, inset, and semantic shortcut conventions as its other standard dialogs.
- Preserve one abort signal from the visible operation surface through the existing workflow request.
- Apply the established native web-link presentation to successful prompt-adjacent share URLs without restyling surrounding labels or non-link statuses.
- Keep modal and URL behavior width-safe and profile-isolated.

**Non-Goals:**
- Changing gist creation, visibility, authentication checks, exported bytes, viewer URL derivation, or result wording.
- Turning the success result into a persistent result dialog or adding copy/open buttons.
- Emulating terminal hover or browser launching in application code; supported terminals retain authority for OSC 8 hover and Ctrl+click activation.
- Restyling the pinned `a1 pi` loader or its status output.

## Decisions

### 1. Add an owned share-operation surface rather than mutating the pinned loader

Bare A1 will select a dedicated share surface assembled from public TUI components and the shared `PiModalFrame`. It will render a bold accent `Share` title immediately below the full-width top rule, retain the animated progress row and abort controller, and render cancellation keys through `renderPiModalShortcutHints`. The shortcut row will follow the frame's one-cell inset and sit immediately above the full-width bottom rule.

This avoids structural mutation of the upstream `BorderedLoader` and prevents A1 presentation changes from leaking into `a1 pi`. Reusing the upstream loader and editing its child indexes was considered, but it would couple the owned dialog to undocumented child ordering and preserve the wrong hint composition.

### 2. Keep workflow state and completion ownership in the shell controller

The operation surface exposes only the component contract and its `AbortSignal`. The existing workflow call continues to receive that signal, clear the surface in `finally`, and append the existing success, failure, or cancellation result. This keeps the visual replacement independent of gist process ownership and preserves late-result suppression and focus restoration.

Keeping the success URL inside the modal was considered, but it would change the accepted prompt-adjacent result lifetime and add a new close state that the request did not require.

### 3. Decorate successful dock-notice links at the custom-viewport presentation boundary

The bare-A1 dock notice will pass status rows through the existing native hyperlink decorator with the existing web-link color role. Explicit URL targets remain bounded OSC 8 regions; labels stay in their current muted status style. The terminal therefore owns dashed idle decoration, solid hover decoration, and Ctrl+click opening exactly as it does for transcript links.

Hardcoded blue and underline escape sequences were rejected because they would bypass theme roles and prevent the terminal from changing native hover decoration. Direct pointer-driven URL launching was also rejected because it would duplicate terminal hyperlink behavior and interfere with modal/selection pointer ownership.

### 4. Prove profile isolation and rendered semantics, not one terminal's pixels

Focused component tests will assert frame row order, title/hint alignment, no blank row before the bottom rule, styling roles, width bounds, and cancellation. Session-shell tests will assert both successful URLs retain exact OSC 8 targets and blue link styling in bare A1 while the comparison profile retains its pinned presentation. Manual review will confirm the supported terminal's dashed idle underline, solid hover underline, and Ctrl+click activation.

Automated tests will not encode one terminal emulator's hover pixels because native hover is outside the application's renderer.

## Risks / Trade-offs

- [The owned progress surface drifts from cancellation semantics] → Keep a single surface-owned abort controller, route both displayed cancel shortcuts through it, and retain controller-level cancellation tests.
- [Dock-wide decoration changes ordinary statuses] → Run native decoration only over rendered status rows; the decorator changes only explicit or detected URL spans and preserves surrounding status styling.
- [A terminal does not support native OSC 8 hover or Ctrl+click] → Preserve the visible URL text and exact target; document and manually validate the requested interaction on the supported terminal rather than adding a competing launcher.
- [A narrow viewport clips title or shortcut content] → Render every child at the frame-reduced width and verify no row exceeds its assigned display width.
- [Owned styling leaks into the comparison profile] → Select the owned surface and dock decoration only for the custom viewport and retain explicit `a1 pi` regression assertions.
