## Why

The fresh-install and self-update meters are slightly wider than the status text immediately above them, leaving the percentage visually overhanging the update summary. Resident Settings and Changelog tabs also derive their active-chip color through utility-specific fallback behavior instead of the same selected-tab presentation used by Agent tabs, so equivalent tabs can show different active colors. A newly requested Agent is currently inserted before visible utility tabs while pending, then moves to the registry's appended position when initialization completes. Pending prompt borders and the landing logo can also use provisional or different color roles before the real Agent frame arrives, creating another unnecessary color change outside the selected tab chip.

## What Changes

- Shorten the visible bar segment in both fresh-install and self-update progress frames from 40 terminal cells to 38.
- Keep both renderers on the same width contract, including their percentage placement and row-clearing behavior.
- Preserve progress calculation, glyphs, colors, timing, terminal cleanup, and non-interactive output.
- Give the tab strip one resolved active-tab color for Agent, Settings, and Changelog rather than deriving selected backgrounds from tab-kind-specific or per-tab fallback branches.
- Keep the pending Agent chip's lighter initialization shade and fill animation, deriving both its starting and settled colors from the shared active-tab color API.
- Append every newly added Agent chip after the currently shown tabs through a kind-neutral tab-bar ordering API, keeping the same slot from pending initialization through committed activation.
- Paint pending prompt borders directly in their final destination color and render the landing logo in that same color, leaving the lighter-to-settled transition exclusive to the selected Agent tab chip.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Self-update uses the shorter shared progress-bar geometry.
- `silent-installer`: Fresh installation matches self-update's shorter progress-bar geometry.
- `multi-agent-tabs`: Every tab kind uses one shared resolved active-chip color while pending Agent initialization still fills into that color.

## Impact

- Affects `src/foundation/release/update.ts`, `packages/a1-install/bin/a1-install.js`, the native resident tab-strip presentation and ordering APIs, and focused presentation tests.
- Does not change installation or update selection, package mutation, activation, diagnostics, published package structure, tab behavior, tab status colors, or utility-screen content.
