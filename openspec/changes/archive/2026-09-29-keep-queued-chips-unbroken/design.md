## Context

See `proposal.md` for motivation. Bare A1 renders queued steering messages through the shared queued-input presenter as themed `Text`, then inserts those rows into the custom viewport's transient tail. Submitted prompts use a reversible canonical-chip transform before Markdown wrapping. The transform protects spaces inside a chip and separates adjacent chips, but a chip directly touching a long prose token can still be absorbed into that token and split by the wrapper's oversized-word fallback.

Both surfaces must remain width-bounded and expose exact authored text after rendering. The queued presenter also serves the pinned comparison route, which must not change.

## Goals / Non-Goals

**Goals:**
- Reuse canonical chip recognition and reversible wrap protection for bare-A1 queued steering rows.
- Make the shared protection isolate fitting chips from directly adjacent non-whitespace on both sides.
- Restore exact visible text before queued or submitted rows enter viewport composition.
- Preserve queue updates, ANSI/Markdown styling, indentation, and dequeue guidance while keeping every chip on one row.

**Non-Goals:**
- Change queue storage, dispatch, dequeue, attachment, or history behavior.
- Change live-editor wrapping or submitted-prompt behavior outside chip token boundaries.
- Make arbitrary bracketed text atomic.
- Change the pinned `a1 pi` queue presentation.

## Decisions

### 1. Protect canonical chips at the queued-input presentation boundary

For custom-viewport presentation, run the shared canonical prompt-chip wrapping transform over the generated queue text before `Text` performs width wrapping, then restore each rendered row before returning it. Extend that shared transform to insert collision-safe temporary break opportunities before and after a chip whenever authored non-whitespace touches it. This keeps source submissions and externally observed queued and submitted rows byte-for-byte unchanged while ensuring each fitting chip is a separate wrapping token.

Reimplementing the chip grammar in the queue presenter was rejected because it could drift from editor and submitted-prompt syntax. Repairing rows after wrapping was rejected because the split has already affected layout and cannot be reconstructed reliably without wrapping again.

### 2. Keep the transform scoped to custom viewport output

The pinned route will continue to pass its generated text directly to `Text`. Scoping by the existing presentation mode preserves comparison parity rather than changing all queue surfaces as a side effect.

### 3. Truncate an oversized chip as one presentation token

A Pi-owned presentation helper will use the renderer's grapheme-aware width and truncation utilities to replace only a chip wider than the complete content width with a one-row label ending in `…`. At widths that can retain delimiters, the helper keeps the closing bracket; extremely narrow widths show only the ellipsis. The shared contract transform still owns recognition and reversible break sentinels, while source queue/transcript/model text remains complete.

Allowing the existing long-token fallback was rejected because it visibly splits the chip. Horizontal overflow was rejected because the custom viewport requires every row to remain terminal-width bounded.

### 4. Update protection whenever queue presentation changes

The queued component's refresh path will regenerate both the displayed text and its matching restoration transform whenever submissions or keybindings change. Tests will exercise initial render, updates, custom-viewport geometry, all chip families, chips touching overlong prefix/suffix text, adjacent chips, ordinary bracketed text, oversized fallback, submitted-content promotion, and pinned isolation.

## Risks / Trade-offs

- [Protection and restoration state could diverge after a queue update] → Refresh them together before replacing the `Text` source and cover updates at changed widths.
- [ANSI styling could obscure chip matching or restoration] → Apply the existing source-text transform at the presenter boundary and assert exact stripped labels plus width bounds.
- [An authored sentinel could collide with the reversible transform] → Reuse the helper's collision-avoidance behavior rather than introducing queue-specific markers.
- [Oversized labels no longer show every source character] → Limit ellipsis to chips wider than a complete row and retain the full queue, transcript, and model source.
- [Comparison output could drift] → Gate protection on `custom-viewport` and retain pinned component assertions.
- [The eager presenter has no startup headroom] → Isolate shared Pi truncation in one reviewed helper and re-pin the exact measured graph at 158 files / 1,525,486 source bytes while keeping Pi artifact limits unchanged.

## Migration Plan

1. Adapt the queued-input component to maintain reversible wrap protection for custom-viewport text.
2. Isolate canonical chips from touching prose within the shared reversible transform used by queued and submitted content.
3. Add focused component and owned-shell regressions for the reported steering and promoted-content screenshot cases.
4. Build and launch through `./scripts/dev` for physical review. No persisted data or configuration migration is required; rollback removes the presentation transforms without changing queue or transcript data.
