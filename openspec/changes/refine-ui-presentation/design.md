## Context

The main self-updater and dependency-free installer each render a 40-cell progress bar before a space and percentage. They intentionally live in separate runtime surfaces because the installer cannot depend on the installed application, so presentation parity is maintained through equivalent constants and focused conformance coverage rather than a shared runtime import.

## Goals / Non-Goals

**Goals:**

- Reduce both visible bar segments to 38 terminal cells.
- Keep progress filling proportional across the new width and keep both renderers byte-equivalent apart from their selected accent input.
- Update row-clearing bounds so the installer removes the complete shorter frame without leaving stale cells.

**Non-Goals:**

- Changing progress milestones, creep behavior, colors, glyphs, percentage formatting, or success/failure transcripts.
- Introducing a runtime dependency from the bootstrap installer to the main package.
- Dynamically sizing the meter from terminal width or version-string length.

## Decisions

### Retain bounded local width constants

Set the self-update and installer bar-width constants to 38 in their existing modules. A shared imported constant was considered, but it would add another installer package asset or couple bootstrap execution to application code. Focused tests will bind both renderers to the same observable width instead.

### Preserve the existing percentage suffix

Keep the current single-space `<percentage>%` suffix and change only the bar segment. This produces the requested two-cell reduction without changing number formatting or causing percentage-width padding to appear during progress.

### Derive cleanup width from the compact frame

The installer already clears a bounded maximum frame. Keep that bound derived from the bar width plus the existing maximum percentage suffix so shortening the renderer also shortens cleanup while still erasing a prior `100%` frame.

## Risks / Trade-offs

- **The summary text can vary with selected versions** → Use the requested fixed compact geometry rather than fragile per-message dynamic sizing.
- **Separate constants could drift later** → Assert the exact 38-cell geometry in both focused suites and retain specification-level parity.
- **A shorter bar has slightly less visual resolution** → Percentage text remains authoritative and 38 cells still gives fine-grained visible movement.

## Migration Plan

No data or configuration migration is required. Ship the presentation change with the application and installer package; reverting the two width constants and focused expectations restores the prior 40-cell geometry.
