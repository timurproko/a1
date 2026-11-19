## 1. Shared input prefixes

- [x] 1.1 Add explicit shared prefix configuration, make the main prompt prefix one leading cell plus `❯ `, and verify prompt-input component tests cover width, clipping, caret, and continuation-row geometry.
- [x] 1.2 Route Settings search and Settings-owned per-model search through the marker-free prefix and verify their focused rendering tests contain no `❯` or `>` marker.
- [x] 1.3 Apply marker-free presentation to A1-owned auxiliary Agent search and compact text-entry call sites while leaving extension-owned and `a1 pi` inputs unchanged; verify focused Agent/modal presentation tests.
- [x] 1.4 Update contextual-suggestion geometry for the three-cell main prefix and verify empty, typed, suggested, wrapped, selected, and copied prompt tests preserve semantic text.

## 2. Tab-bar setting

- [x] 2.1 Declare the live A1-owned `tabsPosition` setting with `top`/`bottom`, default `top`, label `Tab bar position`, and verify declaration, section ordering, resolution, persistence, and direct-launch hiding tests.
- [x] 2.2 Generalize the native settings reader to resolve time format, accent hover, and tab position from the bounded shared document; verify missing, valid, invalid, changed, and unchanged file cases.

## 3. Artifact-free resident startup

- [x] 3.1 Hide the cursor synchronously in resident fullscreen entry and restore it explicitly on every exit path; verify exact outer-mode sequence and cleanup tests.
- [x] 3.2 Add optional existing selected-tab metadata to attach admission, initialize the client view from it, and verify protocol fixtures plus server/client tests for explicit target, first ordered existing Agent, and empty-registry behavior.
- [x] 3.3 Verify a reattach topology paints the first existing Agent active immediately while a newly created first tab still waits for its first drawn surface.

## 4. Position-aware resident geometry

- [x] 4.1 Introduce one native tab-bar geometry abstraction for strip row, child origin, child-to-outer rows, and pointer translation; verify top and bottom mappings at minimum and narrow terminal sizes.
- [x] 4.2 Render the strip, clock, hover, menus, notices, drag marker, and hit regions at the configured edge; verify exact top bytes remain stable and bottom controls occupy only the final row.
- [x] 4.3 Compose structured child rows, clearing, suffix erasure, palette updates, overlays, selection, and final cursor through the shared geometry; verify top/bottom complete and differential presentation fixtures.
- [x] 4.4 Route mouse, focus-owned pointer state, resize, and tab-strip interactions through position-aware geometry; verify bottom-strip reports stay host-owned and bottom child rows preserve solo-equivalent coordinates.
- [x] 4.5 Update quit-outro and terminal restoration row accounting for either edge and verify the strip plus every child row is covered once without exposing a cursor early.

## 5. Live movement and fallback presentation

- [x] 5.1 Repaint atomically when the watched tab position changes, invalidating coordinate-dependent baselines without resizing or restarting the child; verify active tab, surface, popup, modes, and cursor move together with no stale former row.
- [x] 5.2 Translate generated legacy fallback row addressing at the attach boundary for bottom positioning, fail closed on malformed fallback bytes, and verify style, links, text, strip restoration, and cursor coordinates for both positions.
- [x] 5.3 Add integration coverage for changing `Tab bar position` from the resident Settings utility while an Agent and host overlay are visible, verifying persistence and live application.

## 6. Seamless tab drag-and-drop

- [x] 6.1 Compare the current native drag state machine and strip rendering with the supplied legacy v2 behavior, preserving movement-or-hold activation, midpoint destinations, no-op suppression, and release-only mutation.
- [x] 6.2 Compose the insertion marker into the strip frame at either configured edge so status, title-animation, hover, and clock repaints cannot erase unchanged drag feedback.
- [x] 6.3 Keep the preview stable while crossing tabs and leaving or re-entering the strip; clear it on release or cancellation without forwarding strip-owned pointer reports to the child.
- [x] 6.4 Send exactly one revision-guarded reorder for a changed release destination and verify source disappearance, stale revision, original-slot release, outside-strip release, and successful durable reorder behavior.

## 7. Delivery completion

- [x] 7.1 Record implementation evidence, focused checks, and any explicit known-gap disposition; run typecheck, touched TypeScript tests, focused native tests where available, and strict OpenSpec validation.
- [x] 7.2 Reconcile current `origin/develop`, prepare the plain acceptance outcomes and final PR body, and pass the delivery-body final check before completing the final implementation outcome.

## Outcome completion map

| PR outcome | Task groups |
| --- | --- |
| Startup shows no stray cursor and reattach highlights the first Agent | 3 |
| Main prompt gains a leading cell and auxiliary inputs lose markers | 1 |
| Tabs expose a live top/bottom position setting | 2, 4, 5 |
| Resident tabs reorder through stable drag-and-drop | 6 |

Whichever implementation outcome finishes last also waits for group 7.
