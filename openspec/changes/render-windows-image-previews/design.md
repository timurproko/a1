## Context

On fresh `develop`, submitted transcript attachments are resolved by stable retained-asset identity and passed to Pi TUI's public `Image` component. That path works in Windows WezTerm and must remain byte-for-byte behaviorally unchanged. Windows Terminal does not expose a Pi-supported native image protocol, so the same component renders metadata instead of a visual preview.

Earlier work attempted to make both hosts share a custom Sixel lifecycle. Physical testing showed that this unnecessarily replaced the working WezTerm path and coupled image behavior to viewport damage, scrolling, and overlays. This design starts from fresh development and introduces no shared terminal-raster behavior.

## Goals

- Show a recognizable bounded preview for submitted-user images in bare A1 on Windows Terminal.
- Keep Windows WezTerm and every established native image path unchanged.
- Make the preview ordinary terminal rows so scrolling, dialogs, and later output use the existing TUI composition.
- Keep decoding off the main thread and preserve attachment identity and payloads.

## Non-goals

- Add or alter Sixel, Kitty, or iTerm image protocols.
- Change tool images, extension rendering, non-Windows behavior, or `a1 pi`.
- Add settings or change Pi's existing `showImages` and `imageWidthCells` semantics.
- Improve all ANSI-art fidelity beyond the bounded Windows Terminal fallback.

## Decisions

### 1. Select the fallback only at session composition

The session shell identifies Windows Terminal only when running bare A1 on Windows with `WT_SESSION` present and WezTerm host indicators absent. Only then does the retained-image resolver expose an optional preview operation. Without that operation, the existing presenter continues to instantiate Pi's public `Image` component exactly as fresh development does.

This keeps host policy outside the Pi integration and avoids changing tool-image or comparison-profile behavior.

### 2. Render bounded truecolor quadrant cells

The worker decodes through the already pinned Photon package, applies source orientation, preserves aspect ratio, and resizes to two horizontal and two vertical samples per terminal cell. Each cell selects two representative colors and one Unicode quadrant glyph. Rows end with explicit style resets and contain no source base64 or terminal image protocol.

Preview width follows Pi's existing `imageWidthCells` setting. Height, decoded bytes, terminal bytes, and row count are bounded. Unsupported or failed conversion falls back to the existing unavailable presentation without altering the retained attachment.

### 3. Own asynchronous work with the mounted presenter

A Windows Terminal submitted-image presenter starts one worker job for its current asset and effective width. Width changes invalidate derived rows. Replacement, hiding, session replacement, or disposal cancels pending work and ignores stale completion. Successful rows are cached only for the mounted asset/width combination.

The presenter emits ordinary component rows, so no terminal adapter, viewport, damage, scrolling, modal, or foreground-surface changes are needed.

## Risks and mitigations

- **Cell previews are less sharp than native pixels.** Use truecolor 2×2 quadrant sampling and preserve the configured physical cell width; accept this Windows-Terminal-only tradeoff for stable TUI composition.
- **Large screenshots could stall input.** Decode and resize in the existing worker under strict byte, geometry, deadline, and concurrency bounds.
- **Host detection could affect WezTerm.** Exclude `WEZTERM_PANE` and `TERM_PROGRAM=WezTerm`; assert the resolver has no custom preview in those environments.
- **Late work could repaint replaced content.** Tie each job to mount generation and cancellation, and reject stale completion.

## Validation

Focused evidence will verify Windows Terminal selection, WezTerm/native non-selection, bounded ordinary rows, width/aspect behavior, explicit resets, malformed/oversized failure, worker cancellation, stale completion, exact attachment retention, and unchanged tool-image and comparison-profile paths. Physical acceptance remains required in Windows Terminal and Windows WezTerm.
