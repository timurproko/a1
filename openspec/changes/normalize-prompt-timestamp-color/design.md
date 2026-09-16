## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for the behavior contract. Submitted prompt rows currently paint their natural timestamp with the dim theme role. The session shell then creates a second timestamp variant for pinned hover/quiet presentation, while the viewport applies whole-row foreground and faint wrappers according to sticky state. Those nested transforms produce three visible timestamp treatments even though the timestamp text and geometry are unchanged.

The viewport is intentionally presentation-neutral, and prompt anchors are already responsible for carrying styled source-row variants. The change therefore needs to preserve semantic row composition, background overlays, text selection, and viewport caching while making the timestamp's final foreground and intensity state-independent.

## Goals / Non-Goals

**Goals:**
- Give natural and pinned prompt timestamps one shared selected-state foreground painter.
- Ensure the timestamp explicitly returns to normal intensity inside a quiet/dimmed row without cancelling dimming on visible prompt-body glyphs.
- Cover user prompts and completed compaction anchors at terminal-cell attribute level across normal, hover, quiet, and selection states.

**Non-Goals:**
- Changing prompt-body colors, sticky or selection backgrounds, scrollbar behavior, timestamp formatting, layout thresholds, or timestamp copy semantics.
- Introducing a timestamp-specific concern into the neutral viewport model.
- Changing theme definitions or adding a new public theme token.

## Decisions

### Use the existing selected prompt foreground role

The timestamp painter will use the same semantic foreground already visible on the selected/hover-highlighted prompt (`userMessageText` in the Pi integration), rather than adding a hard-coded color or a new theme token. This keeps custom themes authoritative and directly implements the requested selected-state color.

Alternative considered: retain the `dim` token and only normalize pinned states. That would preserve the current natural timestamp but would not make all states match the selected color.

### Make normal intensity part of the timestamp span

The shared painter will explicitly clear faint intensity at the timestamp span before applying its semantic foreground. Because the timestamp is the final visible span on the first prompt row, the surrounding quiet wrapper can continue dimming every earlier visible body cell while the timestamp remains normal intensity. Existing span replay/reset behavior will continue to contain styling at row boundaries.

Alternative considered: stop dimming the whole quiet row. That would alter prompt-body presentation and violate the non-goal. A viewport-level timestamp callback was also rejected because it would leak Pi prompt semantics into the neutral viewport component.

### Apply the painter at both row construction boundaries

Natural submitted-prompt composition and the pinned-row timestamp overlay will call the same painter. This avoids relying on wrapper order, keeps resumed user prompts and completed compactions consistent, and permits the pinned helper to preserve background/state transformations while owning only the timestamp glyph span.

Alternative considered: infer and repaint a trailing `HH:mm` string after viewport composition. Text-pattern inference could misidentify prompt content and would couple generic viewport painting to timestamp syntax.

### Assert final terminal cell attributes

Focused integration coverage will inspect parsed terminal cells for timestamp foreground mode/value and dim/bold intensity in natural, prominent pinned, hovered pinned, quiet pinned, and text-selected source states. Assertions will separately confirm that state-specific backgrounds and body dimming remain unchanged.

String-level ANSI assertions alone were rejected because equivalent escape ordering can produce different final terminal state, especially with nested faint and foreground wrappers.

## Risks / Trade-offs

- [Theme implementations may encode the selected foreground differently] → Resolve the live semantic theme role at render time and compare final cell attributes instead of fixed escape strings.
- [Clearing faint intensity could leak past the timestamp] → Keep the timestamp as the final visible row span and retain existing row/style reset and replay behavior; add a following-row sentinel assertion.
- [Pinned row variants could drift apart later] → Route both natural construction and pinned overlay through one timestamp painter and test user/compaction parity.
- [Selection coverage could accidentally test only its background] → Assert foreground and intensity before and during selection while independently checking the selection background.

## Migration Plan

No data or configuration migration is required. Ship the rendering and focused test changes together. Rollback consists of restoring the prior timestamp painters and compatibility assertions.
