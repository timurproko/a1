## Why

A1 stops with "A1 stopped after an unexpected error" whenever one rendered row measures wider than the terminal under the pinned Pi renderer's width rules. The Pi TUI runtime adapter deliberately throws a `RangeError` for such a row, and nothing catches it, so a one-cell layout disagreement ends the whole session. Four sessions died this way on 2026-11-14 (release 0.2.7-dev.1298), each within about 100 ms of transcript content containing characters such as a lone regional indicator `🇺`.

The trigger is that A1's shared width helper and the pinned renderer are independent implementations. A sweep of U+0020..U+3FFFF finds thousands of code points the helper measures narrower than the renderer: lone regional indicators, wide ranges absent from the helper's table, and spacing combining marks. Any of them in a model reply, tool argument, file preview, or paste can produce an over-width row, and every Pi upgrade can move the renderer's tables again. Width agreement therefore cannot be the only protection against a fatal exit.

## What Changes

- Contain an over-width component row at the Pi TUI runtime boundary: clip it to the available width with the renderer's own measurement and keep the session running, instead of throwing.
- Keep clipping ANSI-safe: complete graphemes only, no leaked style or hyperlink state, Kitty image payloads preserved while ordinary cells around them are still bounded.
- Count contained rows on the runtime so tests and evidence can still detect a layout that overflows; rows that fit are returned unchanged.
- Replace the adapter tests that assert a throw with containment tests, and add a regression that renders the crash-triggering characters through the real shared geometry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: an over-width component row is clipped at the terminal boundary rather than ending the session.

## Impact

`src/integrations/pi/tui-runtime/adapter.ts` and its tests. No change to shared text geometry in `src/ui/components/text.ts`: #932 (`fix-transcript-cell-alignment`) owns that file and its requirement, so closing the remaining under-measured classes belongs there or in a follow-up, not in a competing edit. No Pi patch, engine change, or fatal-diagnostic format change.
