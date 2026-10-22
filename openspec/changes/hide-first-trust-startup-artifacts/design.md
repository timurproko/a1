## Context

See `proposal.md` for motivation. The pre-resource trust prompt is rendered by the child before the owned shell exists. On successful selection it clears its startup surface and hands the alternate screen to the later shell. The resident holder publishes that complete blank surface. Because the trust dialog already counted as the tab's first drawn frame, the attach client's initial first-draw gate no longer protects this later clear. The attach client can therefore render a lifecycle glyph from the still-starting tab and a cursor from the blank child surface.

The holder and server must continue carrying truthful lifecycle and terminal state. This is a presentation-only transition and must not introduce a trust-specific protocol message or let the child load post-trust code earlier.

## Goals / Non-Goals

**Goals:**

- Recognize the drawn-trust-dialog to blank-starting-surface transition from state the attach client already owns.
- Keep that blank handoff cursorless and omit only its provisional starting glyph.
- Resume ordinary child cursor and tab-status presentation on the next drawn frame.

**Non-Goals:**

- Changing the project-trust choices, persistence, security boundary, or direct `a1 solo` / `a1 pi` prompt.
- Removing progress, attention, settlement, recovery, or failure indicators from ordinary tab states.
- Adding a protocol field, setting, timeout, or loading screen.

## Decisions

### 1. Classify the handoff in the attach presentation boundary

The attach client will classify a quiet startup handoff when the viewed tab is still effectively starting, it has already presented drawn child content, and its newest complete surface is blank. The classification remains latched across consecutive blank revisions and ends when a drawn surface arrives or the tab leaves the starting lifecycle.

This reuses the existing ANSI/structured-surface blank detector and the attach client's committed presentation state. It avoids adding a trust-specific bridge event before the bridge exists, and it does not infer trust from screen text. Treating every blank surface as a handoff was rejected because a running terminal application may intentionally expose a blank cursor-bearing screen.

### 2. Suppress artifacts without changing authoritative status

While the classification is active, the final outer cursor will be forced hidden and the viewed strip projection will omit the starting glyph. Any held or debounced starting glyph state for that chip will be cleared so the existing glyph-swap hold cannot leak one more animated frame. The registry/bridge status remains unchanged.

Changing the tab status to idle at the server or holder was rejected because it would make lifecycle state false for every client and could affect recovery behavior. Changing the project-trust prompt to know about resident tabs was rejected because the startup-safe prompt is shared with direct launch modes and must remain independent of post-trust resident infrastructure.

### 3. Restore normal presentation from the next drawn frame

A nonblank surface clears the handoff classification and installs its reported cursor and ordinary status projection in the same attach presentation path. Focus, input routing, and surface revisions continue unchanged.

Focused native tests will model a drawn trust frame, one or more blank starting frames, and a drawn shell frame. They will assert no lifecycle glyph or visible cursor during the blank interval and ordinary cursor/status behavior afterward, including protection against the glyph hold timer.

## Risks / Trade-offs

- **[A starting child intentionally clears after drawing unrelated startup content]** → The suppression is limited to blank surfaces while the effective lifecycle is still starting and ends on the next drawn frame; input and authoritative state remain unchanged.
- **[A prior starting glyph survives through the glyph-swap hold]** → Clear the viewed tab's held/debounce bookkeeping when entering the quiet handoff and cover the transition in the native test.
- **[Blank detection differs between structured and legacy surfaces]** → Reuse the existing bounded detector already used by first-draw gating, with fixtures for both representations where practical.

## Migration Plan

No state or protocol migration is required. The change is local to attach presentation and can be rolled back without changing resident registries, sessions, or trust decisions.
