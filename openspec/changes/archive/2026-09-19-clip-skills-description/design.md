## Context

`TruncatedText` calls the pinned `truncateToWidth` with its default `...` ellipsis and offers no way to change it. The ellipsis is appended after the description's ANSI reset, so it renders in the default foreground rather than the muted role.

## Decision

Replace `TruncatedText` with a small A1-owned `ClippedLine` component in `skills-dialog.ts`. It takes the first line of the string, clips it with the facade's `piShellTruncateToWidth` (which passes an empty ellipsis), and pads to the render width, so the row is exactly one line and ends where the viewport ends.

## Risks

- The startup-graph source byte baseline has no headroom; the component adds a few hundred bytes and the baseline is refreshed in the same change.
