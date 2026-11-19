## Context

See `proposal.md` for motivation. Bare A1 renders submitted user messages through Pi TUI's public `Markdown` component at the content width selected by the submitted-prompt composer. Pi's ANSI-aware wrapper treats literal spaces as line-break opportunities, including the space after a chip icon. The live editor already merges registered chip ranges for visual layout and editing, but that editor-only segmentation does not participate after the message becomes transcript Markdown.

Canonical chip labels have bounded bracketed forms for text pastes, screenshots/images, files, folders, and URLs. The transcript message must remain unchanged because it is also the durable and model-facing value, and submitted-prompt selection/copy must continue to expose ordinary spaces rather than presentation markers.

## Goals / Non-Goals

**Goals:**
- Treat every canonical prompt-chip label as one wrapping unit in bare-A1 submitted prompts when it can fit on a complete content row.
- Preserve display-width correctness, continuation indentation, timestamps, sticky-row derivation, styling, links, and transcript selection/copy.
- Keep chip recognition consistent between the live editor and submitted-prompt presentation.

**Non-Goals:**
- Change chip editing, backing values, attachment semantics, history, submission, or persistence.
- Prevent a chip wider than the complete available row from using safe width-bounded visual fallback.
- Make arbitrary bracketed prose or Markdown links atomic.
- Change assistant Markdown, other transcript blocks, extension renderers, or the pinned `a1 pi` route.

## Decisions

### 1. Share canonical prompt-chip range recognition

Extract the existing canonical chip-label recognition into an A1-owned pure helper that returns source ranges without consulting the process-local chip registry. The editor store will retain its additional rule that an unregistered text-paste-looking marker is editable literal text; submitted presentation may recognize canonical labels from durable user-message text after the live registry is gone.

A shared syntax boundary is preferred over a second presenter-specific regular expression because image, path, URL, and text-paste forms must not drift. Broad matching of every bracketed span was rejected because it would change ordinary prose and Markdown links.

### 2. Protect internal chip spaces only while Markdown wraps

At the bare-A1 submitted-prompt Markdown boundary, apply a reversible, collision-safe presentation transform to literal spaces inside recognized chip ranges. Pi's existing Markdown and ANSI-aware wrapping can then see each fitting chip as one non-whitespace token and move it to the next row as a whole. Restore the original spaces in every rendered row before submitted-prompt composition, timestamp placement, viewport selection, or copying observes the output.

The transformation is presentation-only: `OwnedUiTranscriptBlock.text`, visible-text projection, persisted content, model context, and chip labels remain unchanged. It does not replace Pi's Markdown parser or terminal-width utilities.

Post-processing already-wrapped rows was rejected because a split chip cannot be reconstructed reliably without rerunning layout and style state. Rendering the whole prompt as plain text was rejected because submitted prompts must preserve their existing Markdown and link presentation.

### 3. Retain width-bounded fallback for oversized chips

When a chip's display width exceeds the entire Markdown content width, Pi's long-token fallback may split it across rows at grapheme boundaries. This is the only permitted internal visual split; it keeps every row within the terminal width and preserves complete visible content. A fitting chip that lacks enough remaining space must instead start intact on the next continuation row.

### 4. Limit the behavior to bare-A1 submitted user prompts

Install the transform only in `createPiSubmittedPromptComponent`. The live editor keeps its established atomic segmentation, assistant/other Markdown remains unchanged, and `a1 pi` continues using pinned transcript presentation without the bare-A1 submitted-prompt composer.

Focused tests will cover all canonical chip families, preceding text that forces a wrap, adjacent chips, styled/linked output, wide characters, timestamps, sticky/selection-visible text, oversized fallback, literal bracketed text, and pinned comparison behavior.

## Risks / Trade-offs

- [A presentation sentinel could collide with authored text] → Choose a marker absent from the source for each render and restore only substitutions made inside recognized ranges; include authored private-use characters in tests.
- [Markdown styling or hyperlinks could be damaged] → Transform only source spaces before parsing, restore after Pi renders, and assert ANSI/OSC sequences plus visible labels remain intact.
- [Recognition could diverge from editor chip syntax] → Centralize canonical range detection and keep registry-dependent text-paste atomicity as an editor-specific filter.
- [A very narrow prompt cannot contain a whole chip] → Explicitly retain Pi's grapheme-safe long-token fallback and assert every row stays within its declared width.
- [Comparison parity could drift] → Gate the transform on the existing bare-A1 submitted-prompt component path and cover `a1 pi` separately.

## Migration Plan

1. Centralize canonical prompt-chip range recognition without changing existing editor behavior.
2. Add reversible atomic-wrap protection to the bare-A1 submitted-prompt Markdown renderer.
3. Add focused component and owned-shell regression coverage, including narrow-width fallback and comparison isolation.
4. Build and launch through `./scripts/dev` for physical review. No persisted data or configuration migration is required.
