## Context

Bare A1 currently paints the primary status-bar thinking-level label with `getThinkingBorderColor(level)`, reusing Pi's independent editor-border scale. The separate `customize-ui-accent` delivery makes the semantic `accent` role selectable at runtime, but this footer call bypasses that role and leaves each level on the old multi-hue scale. The footer already isolates the level span from dim model/provider text and keeps `a1 pi` on the pinned rendering path.

## Goals / Non-Goals

**Goals:**
- Make status-bar level intensity read as one progression from grey to the active accent.
- Guarantee `off` is exactly semantic dim grey and `xhigh` is exactly semantic accent.
- Keep intermediate levels stable, ordered, theme-aware, and available in truecolor and 256-color terminals.
- Repaint from the current semantic accent after a live accent change.

**Non-Goals:**
- Change the available thinking levels, their cycle order, or model-specific support.
- Recolor editor borders, thinking selectors, routed-model details, or `a1 pi`.
- Add stored palette values, literal terminal colors, or another user setting.

## Decisions

### 1. Use one fixed semantic intensity scale

Map the canonical owned levels in this order: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. Their normalized positions are `0`, `0.2`, `0.4`, `0.6`, `0.8`, and `1`. The positions do not compress when a model exposes only a subset, so a named level keeps the same visual intensity across model switches and restored sessions.

The zero endpoint uses the active theme's `dim` foreground exactly, and the one endpoint uses its `accent` foreground exactly. Intermediate colors derive from those two concrete active-theme colors through an evenly stepped perceptual interpolation. Endpoint rendering bypasses interpolation so the highest level is byte-for-byte equivalent to the current semantic accent and the lowest is byte-for-byte equivalent to semantic dim grey after terminal-mode conversion.

Rescaling against each model's available-level list was rejected because the footer view does not need another model-capability contract and the same named level would change color when switching models.

### 2. Keep the gradient behind the owned theme boundary

Expose a narrowly named presentation helper from the owned Pi-theme adapter that accepts an owned thinking level and text, resolves the current active theme at render time, and emits the foreground for the current color mode. It will use semantic theme colors rather than fixed RGB values. This keeps the color derivation testable and lets a live accent projection automatically affect the next footer repaint.

The helper is specific to status-level presentation; it does not replace Pi's `getThinkingBorderColor`, because editor borders and other thinking-level consumers remain intentionally independent.

### 3. Apply only to the primary bare-A1 footer level span

The bare-A1 `SessionFooter` path will replace its current border-color call for the primary active level with the new helper. Model name, provider, bullet separator, usage, route suffix, and extension statuses remain under their existing dim or default styling. The pinned profile continues through its unchanged string rendering and does not call the gradient helper.

The route suffix remains dim because it reports the physical route rather than the session's primary adjustable level and is outside the existing colored-level contract.

### 4. Verify semantic endpoints and live accent behavior

Focused tests will cover all six levels in dark/light themes and truecolor/256-color modes. They will compare `off` directly with semantic `dim`, compare `xhigh` directly with semantic `accent`, establish distinct ordered intermediate derivations, and retain width/truncation and adjacent-cell assertions. After `customize-ui-accent` is available on the target branch, tests will exercise each selectable accent and a live change to prove the highest endpoint follows the active choice while the lowest remains grey. Pinned-profile assertions remain the comparison control.

## Risks / Trade-offs

- **[Intermediate colors collapse in 256-color mode]** → Derive before terminal quantization, retain exact endpoint semantics, and test the supported palette in 256-color mode without claiming every adjacent step must map to a unique terminal index.
- **[A future level is added silently]** → Keep the ordered mapping exhaustive over `OwnedUiThinkingLevel`; contract expansion requires an explicit gradient-position update.
- **[The separate accent change is not yet on the branch]** → Keep this PR planning-only until its implementation base includes that accepted semantic-accent projection, then reconcile `develop` and validate every selectable choice in this PR rather than modifying PR #718.

## Migration Plan

1. Reconcile the branch with `develop` after the separate accent customization is available.
2. Add the owned theme gradient helper and focused derivation tests.
3. Route only the bare-A1 primary footer level span through it and retain pinned-profile controls.
4. Run focused component/theme validation, typechecking, build, strict OpenSpec validation, and build-first interactive review.

Rollback restores the footer's existing per-level thinking-color call; no settings or stored data require migration.
