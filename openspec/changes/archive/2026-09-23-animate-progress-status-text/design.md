## Context

See `proposal.md` for motivation and the capability deltas for observable behavior. The engine already emits semantic work labels (`Working`, `Retrying`, and `Compacting`), and the session shell injects a neutral progress formatter into the Pi status factory. The factory resolves built-in and extension labels before constructing the existing spinner-backed indicator. Bare A1 and the pinned `a1 pi` comparison profile share this composition path but identify themselves through the existing `custom-viewport` versus `pinned` progress-presentation mode.

The current neutral formatter canonicalizes terminal punctuation to three ASCII periods. The source-synchronized Pi status indicator delegates each spinner tick to Pi TUI's `Loader`; that loader updates the spinner and message together on one 80 ms timer. Source-synchronized components, installed dependencies, comparison behavior, theme schemas, and the repository's dependency direction must remain unchanged.

## Goals / Non-Goals

**Goals:**

- Replace the bare-A1 terminal progress marker with one Unicode ellipsis across built-in, measured-progress, and extension labels.
- Add a quiet Claude-like shimmer: a small cyan/accent band crossing a muted label more slowly than the spinner, followed by a pause.
- Derive styling phases from the spinner's existing updates so animation adds no timer or render cadence.
- Keep every phase grapheme-safe, width-stable, theme-aware, deterministic, and independently testable.
- Preserve byte-equivalent pinned-profile status rendering.

**Non-Goals:**

- Changing engine lifecycle events, extension APIs, work-state wording, spinner glyphs, status placement, or compaction percentages.
- Animating the ellipsis, notices, diagnostics, completed results, or ordinary non-spinner statuses.
- Adding a user setting, terminal capability negotiation, a new theme role, or literal RGB styling.
- Modifying Pi TUI's loader or the source-synchronized Pi status-indicator implementation.

## Decisions

### 1. Keep semantic punctuation normalization in the neutral component layer

Replace the formatter's canonical ASCII suffix with `…`, while retaining normalization of either a terminal Unicode ellipsis or any terminal ASCII-period run. The formatter continues to preserve all non-terminal punctuation and is idempotent for its canonical result.

The neutral progress module will also expose a grapheme-aware frame presenter. It accepts already-normalized text, an integer phase, and caller-supplied muted/accent styling functions. It does not import the Pi theme or emit literal colours, preserving the component-to-adapter dependency direction.

Changing producer literals was rejected because it would restore per-producer presentation ownership and would not cover extension overrides. Styling raw code units was rejected because it can split combining marks, wide characters, and emoji sequences.

### 2. Use a compact accent sweep over muted text

The semantic label remains in the existing muted role except for a two-grapheme band rendered with the spinner's accent role. The band advances by one grapheme every third spinner update. After leaving the label, the presenter emits one label-length pause with the entire label muted before wrapping. The terminal ellipsis is always muted and never participates in the sweep.

This gives the default theme a cyan motion cue coherent with the spinner while avoiding a whole-word blink or rapid rainbow effect. A full-label pulse was rejected as more distracting, and punctuation animation was rejected because it changes visible content and width. The theme's existing accent and muted roles are used so custom themes and 256-colour conversion continue to work.

### 3. Add an A1-owned indicator around the public status boundary

Introduce an A1-owned working indicator in the Pi component adapter that composes the existing public/source-ported `StatusIndicator` boundary with the injected neutral presenter. Its spinner-colour callback records the current update count before the loader invokes the message-colour callback, allowing one existing loader update to drive both spinner and text. It owns no interval; disposal remains the status indicator's existing `stop()` path.

The status factory selects this indicator only in `custom-viewport` presentation mode. In `pinned` mode it keeps the existing `WorkingStatusIndicator` and pinned three-period message, preserving `a1 pi` fixtures and comparison authority. Changing progress mode rebuilds the component through the existing signature/disposal path, so a pinned indicator cannot leave a timer behind when bare-A1 presentation is selected.

Modifying Pi TUI's `Loader` or adding animation state to the source-synchronized `WorkingStatusIndicator` was rejected because either approach would broaden an A1-only presentation difference into pinned behavior and provenance-controlled code.

### 4. Preserve one composition-owned policy

The session shell root will inject a small presentation policy rather than only an ASCII formatter. The policy distinguishes owned and pinned punctuation and supplies the neutral frame presenter; the lower Pi adapter remains unable to import `src/ui/components`. The status factory applies the policy only after resolving built-in, measured-progress, or extension text, ensuring all live spinner sources inherit it once.

Non-live dock statuses bypass this policy exactly as they do now. Engine labels remain punctuation-free, and no extension migration is needed because legacy `...`, `.`, and `…` suffixes normalize at the shared boundary.

### 5. Test stable text, moving style, cadence, and isolation

Focused evidence will use deterministic single-frame indicators or fake timers to inspect successive ANSI frames. Tests will assert canonical plain text, changing accent position only every third spinner update, the muted pause, stable display width, grapheme integrity, and timer disposal. Shell tests will cover working, retry, compaction percentage, and extension override paths in custom mode, plus unchanged pinned frames and untouched non-spinner text. Governance evidence will continue to reject producer punctuation and forbidden lower-layer imports while recording the revised A1-owned difference.

Physical acceptance will inspect the exact candidate in the default Windows Terminal theme, confirming that the motion is visible but quiet, the accent matches the spinner, and `a1 pi` remains unchanged.

## Risks / Trade-offs

- **[Risk] Eighty-millisecond spinner updates make text movement too busy.** → Advance the band only every third update and include a full muted pause between passes; require physical review of the exact build.
- **[Risk] Long extension messages create a slow pass.** → Keep one-grapheme movement and bounded per-frame work; truncation remains owned by the existing status component and no text is copied or rearranged.
- **[Risk] Message updates add phase steps outside ordinary timer ticks.** → Treat every loader display update as the authoritative presentation phase; assertions target cadence ratios and invariants rather than wall-clock assumptions.
- **[Risk] ANSI styling changes display width or splits user text.** → Segment by grapheme, style complete segments only, and verify every stripped frame and visible width against the canonical message.
- **[Risk] Shared composition accidentally changes `a1 pi`.** → Select the owned indicator only from the existing custom-viewport mode and retain exact pinned-profile fixture comparisons.
- **[Risk] Animation survives status replacement.** → Reuse the current indicator disposal/rebuild path and test settlement, mode changes, overrides, and shell disposal with fake timers.

## Migration Plan

1. Add the Unicode normalizer and deterministic grapheme-aware frame presentation with focused tests.
2. Introduce the A1-owned spinner/text composition and select it only for custom-viewport progress.
3. Refresh bare-A1 fixtures, shell evidence, governance guards, and provenance documentation while retaining pinned fixtures.
4. Validate focused behavior and inspect the exact candidate interactively before finalization.

Rollback is a normal commit revert. No data, settings, protocol, dependency, or migration state changes.
