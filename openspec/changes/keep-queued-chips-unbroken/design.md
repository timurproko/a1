## Context

See `proposal.md` for motivation. Bare A1 renders queued steering messages through the shared queued-input presenter as themed `Text`, then inserts those rows into the custom viewport's transient tail. That wrapping path does not use the reversible canonical-chip protection already applied to submitted-prompt Markdown, so a space inside a fitting chip remains a line-break opportunity.

The transient rows must remain width-bounded and non-persistent, and the same presenter also serves the pinned comparison route whose output must not change.

## Goals / Non-Goals

**Goals:**
- Reuse canonical chip recognition and reversible wrap protection for bare-A1 queued steering rows.
- Restore exact visible labels before transient rows enter viewport composition.
- Preserve queue updates, ANSI styling, indentation, dequeue guidance, and safe narrow-width fallback.

**Non-Goals:**
- Change queue storage, dispatch, dequeue, attachment, or history behavior.
- Change submitted-prompt or live-editor wrapping.
- Make arbitrary bracketed text atomic.
- Change the pinned `a1 pi` queue presentation.

## Decisions

### 1. Protect canonical chips at the queued-input presentation boundary

For custom-viewport presentation, run the already shared canonical prompt-chip wrapping transform over the generated queue text before `Text` performs width wrapping, then restore each rendered row before returning it. This keeps the source submissions and externally observed rows unchanged while removing internal chip spaces as temporary break opportunities.

Reimplementing the chip grammar in the queue presenter was rejected because it could drift from editor and submitted-prompt syntax. Repairing rows after wrapping was rejected because the split has already affected layout and cannot be reconstructed reliably without wrapping again.

### 2. Keep the transform scoped to custom viewport output

The pinned route will continue to pass its generated text directly to `Text`. Scoping by the existing presentation mode preserves comparison parity rather than changing all queue surfaces as a side effect.

### 3. Retain the existing oversized-token fallback

The protection will not add horizontal overflow or a special truncation path. When a protected chip exceeds the entire available row, `Text` may continue its display-width-safe long-token fallback; only fitting chips gain all-or-next-row behavior.

### 4. Update protection whenever queue presentation changes

The queued component's refresh path will regenerate both the displayed text and its matching restoration transform whenever submissions or keybindings change. Tests will exercise initial render, updates, custom-viewport geometry, all chip families, adjacent chips, ordinary bracketed text, oversized fallback, and pinned isolation.

## Risks / Trade-offs

- [Protection and restoration state could diverge after a queue update] → Refresh them together before replacing the `Text` source and cover updates at changed widths.
- [ANSI styling could obscure chip matching or restoration] → Apply the existing source-text transform at the presenter boundary and assert exact stripped labels plus width bounds.
- [An authored sentinel could collide with the reversible transform] → Reuse the helper's collision-avoidance behavior rather than introducing queue-specific markers.
- [Comparison output could drift] → Gate protection on `custom-viewport` and retain pinned component assertions.
- [The eager presenter has no startup-byte headroom] → Re-pin only the exact measured source-byte increase while keeping the reachable file count and Pi artifact limits unchanged.

## Migration Plan

1. Adapt the queued-input component to maintain reversible wrap protection for custom-viewport text.
2. Add focused component and owned-shell regressions for the screenshot case and related chip families.
3. Build and launch through `./scripts/dev` for physical review. No persisted data or configuration migration is required; rollback removes the presentation transform without changing queue data.
