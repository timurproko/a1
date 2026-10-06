## Context

See `proposal.md` for motivation. The lazy bare-A1 session-reference formatter builds all identity rows and then passes them through Pi TUI's `Text` component with a one-cell horizontal inset. `Text` performs word wrapping. Because a Windows session path is one unbroken token and is wider than the content width, the wrapper flushes the already-rendered `File:` label before splitting the path, producing the stranded label shown in the report.

The shared reference screen accepts rows that are already width-aware and truncates any row that still exceeds its content width. The pinned comparison presenter is separate and must retain its current behavior.

## Goals / Non-Goals

**Goals:**
- Fill the first File identity row from directly after the label through the remaining content width.
- Continue the full path at display-column-safe boundaries while retaining the existing one-cell inset, label style, and identity order.
- Keep ordinary identity rows and the pinned comparison presenter unchanged.

**Non-Goals:**
- Change generic Pi TUI word wrapping or the shared reference-screen row contract.
- Shorten, normalize, elide, or otherwise rewrite session paths.
- Add hanging indentation to continuation rows or change wrapping for Name, ID, or report sections.

## Decisions

### 1. Pre-wrap only the File identity value in the lazy session formatter

The formatter will reserve the visible columns occupied by `File: ` on the first content row, split the plain path value across that remainder and subsequent full-width content rows, then pass those explicit rows through the existing inset renderer. The split will use Pi TUI visible-width and ANSI-safe wrapping utilities so wide characters and terminal styling do not produce an over-width row.

This is preferred to changing `Text`, whose word-boundary behavior is shared across pinned and unrelated surfaces. Inserting break characters into the path was rejected because such characters risk becoming observable in copied or tested text. Changing the shared reference screen was rejected because the condition is semantic to this one identity field.

### 2. Preserve the existing comparison boundary

Only `renderPiShellSessionInfoReferenceDocument()` will opt into the specialized File-row layout. `createPiShellSessionInfo()` will continue to construct the pinned in-feed document exactly as it does today.

This keeps the user-requested adjustment on the bare-A1 full-screen route and avoids silently altering the retained `a1 pi` baseline.

### 3. Prove both fit and overflow behavior at the formatter seam

Focused presenter tests will cover a fitting path and an unbroken Windows path that exceeds the available width. The overflow assertion will verify that the first path characters share the `File:` row, every path character remains present in order across continuation rows, each rendered row fits the requested visible width, and ID remains immediately after the final continuation row.

Testing at this seam is preferred to a broad screen snapshot because it directly exercises the width supplied by the shared screen while keeping section chrome and scrolling concerns out of the wrapping contract.

## Risks / Trade-offs

- **[A wide Unicode path crosses a display-column boundary]** → Use Pi TUI's visible-width-aware wrapping rather than JavaScript string length or manual code-unit slicing.
- **[Specialized rows are wrapped a second time by `Text`]** → Size each explicit row against the same effective inset content width and assert every produced row stays within the requested width.
- **[The fix changes pinned parity]** → Keep the in-feed presenter untouched and retain its focused comparison assertion.

## Migration Plan

No stored data or configuration changes. Shipping changes only future bare-A1 Session Info rendering; rollback restores the prior formatter and generic wrapping behavior.

## Implementation Evidence

- The focused Pi shell component suite passed all 44 tests, including fitting and overflowing Windows paths, path reconstruction across continuation rows, width bounds, identity ordering, and the retained pinned presenter.
- The production build and source/bin typechecks passed.
- Strict OpenSpec validation, changed code-documentation governance, owned-UI customization prerequisites, architecture boundaries, product identity checks, pinned-Pi source-ledger provenance, and terminal-host provenance passed.
- The formatter now consumes the File row's remaining visible columns, including paths containing spaces, before continuing the complete value on full-width rows ahead of ID.
- No known implementation or environment gaps remain. The handoff uses the built `./scripts/dev` interactive route.
