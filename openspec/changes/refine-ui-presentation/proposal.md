## Why

The fresh-install and self-update meters are slightly wider than the status text immediately above them, leaving the percentage visually overhanging the update summary. Their duplicated 40-cell geometry should be shortened together so both installation paths retain one aligned presentation.

## What Changes

- Shorten the visible bar segment in both fresh-install and self-update progress frames from 40 terminal cells to 38.
- Keep both renderers on the same width contract, including their percentage placement and row-clearing behavior.
- Preserve progress calculation, glyphs, colors, timing, terminal cleanup, and non-interactive output.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Self-update uses the shorter shared progress-bar geometry.
- `silent-installer`: Fresh installation matches self-update's shorter progress-bar geometry.

## Impact

- Affects `src/foundation/release/update.ts`, `packages/a1-install/bin/a1-install.js`, and their focused presentation tests.
- Does not change installation or update selection, package mutation, activation, diagnostics, or published package structure.
