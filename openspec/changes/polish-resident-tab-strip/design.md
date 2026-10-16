# Design

## Context

See `proposal.md` for motivation and the capability deltas for observable behavior.

The visual result spans two rendering owners. The TypeScript owned UI declares and persists settings and composes submitted prompts inside each resident child. The Rust attach client owns the outer strip, receives forced complete child surfaces from the holder, translates input, and currently paints strip, child bytes, and top-row notices through separate writes. The attach client is launched above the child and cannot subscribe to the child's in-memory settings manager.

The existing shared profile document is atomically replaced, namespaced under `a1`, and bounded to 256 KiB. Bootstrap knows both the effective-home path used by the terminal host and the exact agent-profile directory containing that document. Existing tab shortcuts are configurable, but the native binding table currently retains only key-to-action lookup and cannot produce action labels for a menu.

## Goals / Non-Goals

**Goals:**

- Keep one canonical persisted time-format value while giving the TypeScript child and native attach client coherent local projections.
- Make all strip interaction state explicit and renderable from current state rather than transient text writes.
- Commit tab topology, active selection, and complete child surfaces without exposing contradictory intermediate frames.
- Preserve current resident ownership, controller, recovery, status, shortcut, and server concurrency contracts.

**Non-Goals:**

- Reintroducing v2's configurable strip position, wallpaper, clock visibility, or tab styling.
- Changing server/holder registry authority or allowing multiple simultaneous attachments.
- Adding tab slash commands, close buttons, new notification channels, or a general-purpose native settings framework.
- Changing `a1 pi`, `a1 solo`, or terminal-owned regular-mode rendering.

## Decisions

### 1. Use the existing owned setting vocabulary and a shared pure TypeScript formatter

`timeFormat` will be an owned enum with persisted values `20:00` and `8:00 PM`, defaulting to `8:00 PM`. A small pure formatter will own local 24-hour and 12-hour conversion, including midnight/noon and uppercase suffixes. Settings choice/value presentation and submitted-prompt layout will call this formatter rather than duplicate date rules.

The existing live viewport-settings port will carry `timeFormat` to the custom viewport. This reuses its subscription and repaint lifecycle, so changing the setting invalidates visible prompt rows without introducing a process-global provider. Prompt layout/composition will accept the current format explicitly and sticky rows will continue to derive from the same source rendering.

**Alternatives considered:** a process-global formatter provider, as v2 used, would hide a dependency and make tests/order sensitive; `Intl.DateTimeFormat` can vary spacing and locale tokens, so explicit local-hour/minute formatting is more deterministic.

### 2. Let the attach client read the canonical profile document through an explicit launch path

Bootstrap will pass the exact agent-profile settings-file path to the attach client. The client will use a bounded, fail-safe reader for only `a1.timeFormat`, defaulting to `8:00 PM` when the file, namespace, or value is absent/invalid. It will poll file metadata at a modest fixed cadence and re-read only after a change, then invalidate the strip if the effective format changed. Atomic profile writes ensure the reader sees an old or new complete document.

This keeps persistence and mutation in the TypeScript settings manager while allowing a longer-lived native parent to observe a live child edit. No server wire revision is needed, and time-format state is not incorrectly attached to one tab's status bridge.

**Alternatives considered:** passing only a startup value would violate live application; sending format through every child bridge would create multi-writer authority and fail with no tabs; hard-coding the settings location in Rust would duplicate profile layout knowledge.

### 3. Replace prompt text flags with typed attach-owned overlay state

The attach loop will model context menu, inline rename, busy-close confirmation, overflow selection, and concise failures as host overlays with target identity and current geometry. A context-menu model will retain its target tab, selected/hovered item, clamped anchor, and two actions. The binding table will retain action-to-effective-key data as well as key-to-action lookup so menu hints reflect configured bindings; default labels normalize to `Alt+W` and `F2`.

Right click will open the menu without writing an instruction into the strip. Motion and clicks will be resolved against freshly rendered menu geometry. Action invocation will use the retained target even if another tab is viewed. Escape, outside click, switching away, or target removal will clear the overlay and repaint from the current complete surface. Inline rename remains the shared path used by F2 and the menu.

**Alternatives considered:** retaining the one-line `prompt_notice` is not clickable and destroys strip continuity; terminal-native menus are unavailable and inconsistent across supported hosts.

### 4. Give strip controls one hover identity and remove close geometry

Strip rendering will expose hit regions only for complete tab chips, overflow, and plus. A single hover enum will represent those targets. The render cache key will include hover identity, but registry/status/clock/surface updates will preserve it while current geometry still contains the pointer target. Removing `×` also removes `StripHit::Close`, close-width reservation, and the mouse-only close route; shortcut and context-menu close share the existing close flow.

The zero-tab renderer will clear the former child area and render only the plus chip. It will not create clock, hint, wallpaper text, or invisible hit regions.

### 5. Compose current strip, complete child surface, overlays, and cursor restoration as one presentation

The attach client will retain the latest forced complete surface for the committed viewed tab. One compositor will produce a logical frame in this order: synchronized-update begin, required clear/positioning, strip, complete child surface, save cursor, host overlays, restore cursor, synchronized-update end. It will emit that frame through one locked output write and flush. Small strip-only damage such as a stable hover or clock tick may remain row-bounded, but it will use the same state-derived strip and will never issue a separately visible clear.

View changes will have requested and committed phases. A switch/create/close successor is requested first; the active chip and body commit only when the target's complete surface arrives. Registry snapshots needed for that transition are staged and committed with the target surface. If a target disappears, the state machine resolves another valid target rather than presenting stale target state. Repeated equivalent lists are ignored, preventing periodic snapshots from repainting or resetting hover.

This uses the holder's existing forced complete `frame_at` output and does not invent patch reconstruction in the attach client.

**Alternatives considered:** repainting strip then surface preserves the current flash window; clearing before each component makes non-synchronized terminals worse; caching arbitrary PTY byte patches would duplicate the terminal emulator and be incorrect.

### 6. Capture close fallback from pre-close strip order

Before issuing close for the active tab, the client records the immediate left neighbor, or the immediate right neighbor when closing index zero. Once the registry confirms removal, it requests that survivor and commits it with its complete surface. Closing a background tab does not alter the committed view. If concurrent topology changes remove the recorded candidate, the nearest surviving neighbor in the staged order is chosen deterministically.

**Alternatives considered:** selecting list index zero is surprising; asking the server to own a per-client predecessor would move client-local view policy into shared registry state.

### 7. Test state and terminal output at their ownership boundaries

TypeScript tests will cover declaration/default/migration, current-example labels, formatter boundaries, prompt width/layout in both formats, and live settings propagation. Rust unit tests will cover close-free chip geometry, all hover targets, clock right inset/formats, context-menu geometry/actions, zero-tab output, predecessor selection, equivalent-list suppression, and composed-write ordering/cursor restoration. Focused role integration will exercise create/switch/close staging where existing harness seams make the complete-surface boundary observable.

## Risks / Trade-offs

- **[Native and TypeScript formatters can drift]** → Use the same two-value contract and mirrored table-driven boundary fixtures; keep formatting deliberately limited to hour/minute.
- **[Settings polling adds filesystem work]** → Poll metadata at a bounded cadence, parse only on change, cap input size, and stop with the attach lifecycle.
- **[Waiting for a complete target surface can make a switch appear slightly later]** → Request the view immediately and retain the coherent old frame during the short handoff; correctness is preferred to showing a new chip over stale content.
- **[One write cannot force every terminal to paint atomically]** → Also use synchronized-update markers where supported and avoid clear-only/component-only writes so unsupported terminals receive the smallest coherent byte sequence.
- **[Overlay composition can disturb the child cursor]** → Save/restore cursor around every host overlay and verify final terminal cells/cursor in deterministic tests.
- **[Concurrent close/reorder can invalidate the preferred predecessor]** → Resolve against the confirmed staged registry and choose the nearest deterministic survivor.

## Migration Plan

1. Add the owned declaration and compatibility version step; profiles without the key resolve the 12-hour default and do not require an eager rewrite.
2. Thread the explicit format through owned viewport composition and prompt rendering.
3. Pass the canonical settings-file path at native attach launch and add fail-safe observation there.
4. Introduce typed strip/overlay/presentation state, then remove legacy close-hit, empty hint, and prompt-notice rendering.
5. Existing profiles, resident registries, sessions, and keybinding files remain compatible. Rolling back ignores the unknown `timeFormat` property while preserving it under existing forward-compatibility rules.
