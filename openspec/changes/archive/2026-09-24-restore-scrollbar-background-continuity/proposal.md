## Why

The dedicated transcript scrollbar gutter fixed hidden and truncated right-edge content, but its forced neutral background now cuts a contrasting vertical stripe through tool and message blocks. The rail should again appear over a continuation of each row's content background without returning source text, links, or selection semantics to the rail column.

## What Changes

- Continue each scrollable row's background surface through the reserved scrollbar gutter in `auto` and `always` modes.
- Draw the visible track or thumb over that continued background, and leave the same background visible when an automatic rail is idle.
- Keep the gutter reserved and non-semantic so source glyphs, hyperlinks, emphasis, selection membership, and copied text still end at the content boundary established by the scrollbar correctness fix.
- Preserve content wrapping, appearance-mode reflow, scrollbar gestures, dock/modal geometry, and the pinned `a1 pi` comparison route.
- Add decoded terminal-cell regressions for ordinary, block-background, selected, linked, cached, and rail-transition rows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Restore visual background continuity beneath the reserved transcript scrollbar while retaining the dedicated gutter's semantic and layout boundaries.

## Impact

Expected implementation is limited to transcript viewport gutter composition and focused viewport/shell terminal-paint coverage. No settings, persistence, dependencies, public APIs, scrollbar geometry, or comparison-profile behavior changes.
