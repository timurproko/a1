## Context

See `proposal.md` for motivation. Bare A1 renders live status through `createPiShellStatus`: the owned `Working…` indicator is a `StatusIndicator`/Pi TUI `Loader`, and the shell flattens its rendered rows into the bottom-aligned transient viewport tail. The complete-frame selector is supposed to treat visible working-status rows as base-session text. Pi TUI's public mouse contract likewise leaves unhandled primary-button drags available for transcript selection.

The current shell coverage double-clicks `Working` by invoking `handleViewportPreInput` directly. A terminal-routed drag regression confirms that the status component is already passive and the reports reach complete-frame selection: a drag can start on `Working`, and a dock-originated drag crosses it upward. The failure is directional. When a drag originates in scrollable document content and crosses `Working` into the dock, `TranscriptViewport.#visibleSelection` clips the range to `viewportHeight` solely because the anchor is document-qualified, so the dock endpoint is discarded. The implementation must remove that origin-dependent projection boundary without broad mouse suppression or a second selection system.

## Goals / Non-Goals

**Goals:**

- Make ordinary progress-spinner cells transparent to primary-button gesture handling until complete-frame selection owns the sequence.
- Let a drag start on the spinner row and cross it upward or downward with the same endpoints, paint, and copied text as adjacent frame rows.
- Cover both component dispatch and the real fullscreen terminal-input path, including no-button motion reports used during an active drag.
- Preserve one owner for each complete gesture and keep explicit controls and modal surfaces authoritative.

**Non-Goals:**

- Changing spinner text, animation cadence, colors, spacing, lifecycle, or viewport placement.
- Making the spinner a clickable control or giving it keyboard focus.
- Changing wheel scrolling, scrollbar/sticky/jump controls, release-notice controls, overlays, right-click paste, or editor click semantics.
- Changing regular-mode terminal-owned selection, `a1 pi`, clipboard transport, or automatic-copy policy.

## Decisions

### 1. Prove ownership and projection through the terminal route

Focused tests will route primary press, no-button motion, and release reports through the fullscreen terminal fixture. They will assert that ordinary spinner cells do not acquire component ownership, that the reports reach the one complete-frame selection owner, and that the selected range projects through the viewport/dock boundary in both directions.

This supplements rather than replaces direct viewport-controller coverage. A controller-only double-click test was rejected as the regression gate because it proves neither terminal dispatch nor cross-region range projection.

### 2. Project document-originated ranges across the complete visible frame

The viewport will stop choosing its visible selection row count from the anchor alone. Any mixed range with one dock endpoint will project against the complete visible base-frame row set regardless of which endpoint supplied the origin, while document-only ranges remain clipped to the scrollable viewport. Each endpoint retains its existing document, dock, or screen-qualified anchor: a document endpoint that scrolls still follows its source row, a dock endpoint remains pinned, and unsafe source identity still clears the selection.

The progress status remains passive: it introduces no handler, focus request, capture, or status-sized control region. Globally disabling component mouse routing was rejected because it would break explicit viewport controls, overlays, dialogs, editor behavior, links, and comparison profiles. Converting endpoints to screen coordinates was rejected because it would regress retained selection during followed output.

### 3. Distinguish passive status text from explicit controls

Only ordinary progress-spinner cells receive pass-through behavior. Existing controls retain their declared hit regions and complete-gesture ownership, and a frame-selection gesture that began elsewhere may cross those visual rows without activating a control according to the existing frame-selection contract. Wheel events continue through their current scroll owner rather than being reclassified as text selection.

No new status-sized hit region will be introduced. Spinner animation invalidation remains presentation-only and cannot acquire or cancel a pointer gesture.

### 4. Validate starts and crossings in both directions

Shell integration coverage will locate the rendered `Working…` row from the current frame and send SGR reports through the terminal fixture. Separate cases will:

- press on the status text, move into transcript content, and release;
- press above the status, move through it, and release below it;
- perform the reverse crossing from below to above; and
- retain selection while spinner ticks request renders.

Assertions will cover ownership, dark-blue selection paint, normalized copied text, absence of truncation at the status row, and absence of component capture or control activation. Component-level coverage will keep the cause local; terminal-paint/shell coverage will prove the user-visible path.

## Risks / Trade-offs

- **[The fix makes real controls passive]** → Scope pass-through to ordinary status cells and retain existing control hit tests before selection admission.
- **[The direct controller path masks another interception layer]** → Require terminal-adapter and component-dispatch tests, not only `handleViewportPreInput` calls.
- **[Animation replaces selection paint]** → Compose each timer-driven frame from current selection state and assert the highlighted range survives spinner renders.
- **[Release reaches a different owner]** → Keep one latched frame-selection owner for the complete press/motion/release sequence and verify both crossing directions.
- **[Comparison behavior changes]** → Keep the change behind bare A1's complete-frame selection route and retain focused `a1 pi` isolation coverage.

## Migration Plan

No persisted-data migration is required. After explicit approval, add the failing dispatch and shell regressions, make the narrow ownership correction, and validate the focused status/selection suites before broader CI. Rollback restores the previous event-routing behavior without changing sessions, settings, or dependency bytes.
