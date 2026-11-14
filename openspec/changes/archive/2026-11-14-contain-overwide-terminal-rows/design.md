## Context

`ComponentBridge.render` in `src/integrations/pi/tui-runtime/adapter.ts` wraps every A1 component handed to Pi TUI, including the root shell surface. It measures each returned row with the renderer's `visibleWidth` (Kitty APC payloads removed first) and throws `RangeError("Pi TUI component row N exceeds available width W")` on the first overflow. The throw surfaces from the render tick as an uncaught exception, so the fatal path restores the terminal and exits.

The guard was added in `1b8eabca` so that an A1 layout bug would fail loudly rather than be rewritten silently. That is sound for A1-authored chrome, but the rows also carry arbitrary session content measured by `src/ui/components/text.ts`, which cannot import Pi and so cannot share the renderer's tables.

Observed on 2026-11-14: four fatal diagnostics with the identical stack `adapter.js:66 ← tui.js:142 ← tui-alt-screen.js:87 ← layout.js ← tui-alt-screen.js:1459`, each immediately after an agent wrote width-test fixtures such as `🇺` into a tool call. `🇺` measures 1 in the helper and 2 in the renderer.

## Goals / Non-Goals

**Goals:**

- No row width, whatever its content, can end a session.
- A contained row stays valid terminal output.
- Overflow remains observable to tests and evidence.

**Non-Goals:**

- Making the shared helper agree with the renderer for all Unicode. That is geometry work owned by #932 and remains worth doing, because a clipped row still loses its trailing cells.
- Changing fatal-diagnostic content or adding a user-visible notice.

## Decisions

**Clip at the bridge instead of throwing.** The bridge is the single point every component row passes through and already performs the measurement, so containment there covers the root surface, mounted components, and overlays alike. Alternatives: catching the error around the render tick would drop the whole frame and repeat on the next tick; wrapping the row would change row counts and break layout, scroll, and pointer geometry that were computed for the original height.

**Use the renderer's truncation.** Clip with Pi TUI's `truncateToWidth(row, width, "")` so the result is bounded by the same rules that judge it, with no ellipsis because the adapter cannot know the row's semantics. A row carrying a Kitty image payload keeps the payload and clips only its ordinary cells. If the clipped row somehow still measures over width, fall back to its plain-text clip so the invariant "returned rows fit" holds unconditionally.

**Count rather than report.** Export a process-wide contained-row counter from the runtime module rather than a member on the adapter class, whose recorded size may only shrink under the architecture ratchet. Layout tests assert it does not grow for A1-authored chrome, which preserves the intent of the original guard without a fatal exit. No notice is shown: the user can do nothing about it and the row is still readable.

## Risks / Trade-offs

- A layout bug in A1 chrome now degrades to a clipped row instead of failing loudly → mitigated by the counter and by existing per-component width assertions.
- Clipping hides trailing cells of an affected row (typically one or two) → accepted; preferable to losing the session, and removed for a given character once shared geometry agrees.
- Extra truncation cost → only on rows that already overflow; fitting rows take the existing measurement path unchanged.
