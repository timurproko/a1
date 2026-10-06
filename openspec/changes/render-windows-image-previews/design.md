## Context

On fresh `develop`, submitted transcript attachments are resolved by stable retained-asset identity and passed to Pi TUI's public `Image` component. Windows Terminal does not expose a Pi-supported native image protocol, so the component renders metadata instead of a visual preview. Windows WezTerm uses retained Kitty placements, but physical review found that a partially scrolled image disappears once its anchor leaves the viewport and retained pixels can paint above fullscreen dialogs.

Earlier work attempted to make both hosts share a custom Sixel lifecycle. Physical testing showed that coupling retained terminal rasters to viewport damage, scrolling, and overlays is brittle. This design instead uses ordinary terminal rows for submitted-image previews on supported Windows hosts and introduces no terminal-raster lifecycle.

## Goals

- Show a recognizable bounded preview for submitted-user images in bare A1 on Windows Terminal and Windows WezTerm.
- Keep established native image paths unchanged outside those Windows submitted-user previews.
- Make the preview ordinary terminal rows so scrolling, dialogs, and later output use the existing TUI composition.
- Keep decoding off the main thread and preserve attachment identity and payloads.

## Non-goals

- Add or alter Sixel, Kitty, or iTerm image protocols.
- Change tool images, extension rendering, non-Windows behavior, or `a1 pi`.
- Add settings or change Pi's existing `showImages` and `imageWidthCells` semantics.
- Improve all ANSI-art fidelity beyond the bounded Windows-host fallback.

## Decisions

### 1. Select the fallback only at session composition

The session shell identifies Windows Terminal or WezTerm only when running bare A1 on Windows with `WT_SESSION`, `WEZTERM_PANE`, or `TERM_PROGRAM=WezTerm`. Only then does the retained-image resolver expose an optional preview operation. Without that operation, the existing presenter continues to instantiate Pi's public `Image` component exactly as fresh development does.

This keeps host policy outside the Pi integration and avoids changing tool-image or comparison-profile behavior.

### 2. Render bounded truecolor quadrant cells

The worker decodes through the already pinned Photon package, applies source orientation, preserves aspect ratio, and resizes to two horizontal and two vertical samples per terminal cell. Each cell selects two representative colors and one Unicode quadrant glyph. Rows end with explicit style resets and contain no source base64 or terminal image protocol.

Preview width follows Pi's existing `imageWidthCells` setting. Bare A1 requests the standard terminal cell-size report on supported Windows hosts because Pi otherwise skips that query when no native image protocol is available. A valid reply invalidates the mounted component and rekeys the preview by the reported cell width and height, keeping physical proportions consistent across Windows Terminal and WezTerm. Height, decoded bytes, terminal bytes, and row count are bounded. Unsupported or failed conversion falls back to the existing unavailable presentation without altering the retained attachment.

### 3. Own asynchronous work with the mounted presenter

A Windows-host submitted-image presenter starts one worker job for its current asset and effective width. Width changes invalidate derived rows. Replacement, hiding, session replacement, or disposal cancels pending work and ignores stale completion. Successful rows are cached only for the mounted asset/width combination.

The presenter emits ordinary component rows, so no terminal adapter, viewport, damage, scrolling, modal, or foreground-surface changes are needed.

## Risks and mitigations

- **Cell previews are less sharp than native pixels.** Use truecolor 2×2 quadrant sampling and preserve the configured physical cell width; accept this Windows-host tradeoff for stable clipping and dialog composition.
- **Large screenshots could stall input.** Decode and resize in the existing worker under strict byte, geometry, deadline, and concurrency bounds.
- **Host detection could affect unrelated terminals.** Require Windows plus a Windows Terminal or WezTerm indicator and assert unknown/non-Windows hosts keep their native path.
- **A terminal may not answer the cell-size query.** Keep Pi's bounded default metrics as fallback; accept only Pi's validated positive cell-size response and regenerate when it changes.
- **Late work could repaint replaced content.** Tie each job to mount generation and cancellation, and reject stale completion.

## Validation

Focused evidence will verify Windows Terminal and Windows WezTerm selection, cell-size querying and regeneration, bounded ordinary rows that survive partial scrolling and dialog composition, physical width/aspect behavior, explicit resets, malformed/oversized failure, worker cancellation, stale completion, exact attachment retention, and unchanged tool-image and comparison-profile paths. Physical acceptance remains required in Windows Terminal and Windows WezTerm.
