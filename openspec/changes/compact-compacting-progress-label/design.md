## Context

The engine publishes `Compacting` as the semantic working message and the measured percentage separately. Bare A1's custom-viewport status composer currently joins them with a space as `Compacting (n%)`; the shared spinner component then appends the canonical `...` marker. The pinned comparison route does not compose the percentage.

## Goals / Non-Goals

**Goals:**
- Display measured bare-A1 compaction progress as `Compacting(n%)...`.
- Preserve percentage values, spinner punctuation, placement, and lifecycle.
- Preserve the no-percentage fallback and the pinned comparison route.

**Non-Goals:**
- Changing compaction progress estimation, clamping, or event handling.
- Changing generic working messages, spinner styling, or punctuation.
- Modifying Pi dependencies or the `a1 pi` presentation.

## Decisions

### 1. Change only custom-viewport progress composition

Update the existing composition boundary to concatenate the semantic message directly with `(${progress}%)`. This keeps the engine's semantic message and numeric status data separate and avoids special-casing compaction producers.

### 2. Retain focused component coverage

Update the existing shell-status assertions for zero and intermediate percentages and add or retain boundary coverage proving the compact form. Keep assertions for absent progress and the pinned presentation so the spacing change cannot leak into fallback or comparison behavior.

## Risks / Trade-offs

- [The formatting change affects another measured working message] -> The current measured progress is compaction-specific, and focused tests will bind the intended compact composition at the status boundary.
- [Spinner punctuation is accidentally altered] -> Continue using the shared working-status component and assert the complete visible `Compacting(n%)...` text.
- [The pinned route changes] -> Keep composition limited to `custom-viewport` and retain comparison-route coverage.

## Migration Plan

No data or settings migration is required. Reverting the status-composition and matching test expectation restores the prior spacing.
