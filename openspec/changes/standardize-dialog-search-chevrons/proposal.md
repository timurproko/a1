# Proposal

## Why

Bare A1's searchable dialogs do not use one search-field marker: most show a terminal-default white `>`, while the Settings per-model Thinking Level dialog omits the marker entirely. A consistent accent-colored chevron will make every standard searchable dialog immediately recognizable and visually aligned with the command palette.

## What Changes

- Render the exact ASCII `> ` marker in the active semantic accent color at the start of every bare-A1 standard dialog search field.
- Apply the shared treatment to Models, model selection/configuration, Skills, Thinking Level, Resume Session, Session Tree, login/logout provider selection, and the Settings per-model Thinking Level search step.
- Keep the full-screen Settings search field marker-free, because it is application chrome rather than a standard dialog, and leave non-search text-entry dialogs unchanged.
- Preserve query editing, focus and IME placement, filtering, pointer geometry, narrow-width clipping, live theme updates, and the pinned `a1 pi` comparison profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Define a reusable live-themed `> ` presentation for standard dialog search inputs while preserving marker-free non-dialog auxiliary inputs.
- `owned-pi-ui-foundation`: Require every bare-A1 standard searchable dialog to use the accent search marker without changing comparison-profile behavior.
- `owned-ui-settings`: Restore the search marker only for the nested per-model Thinking Level dialog while retaining marker-free full-screen Settings search.

## Impact

Expected implementation affects shared dialog-search presentation, Pi selector adapters, the Settings stepped dialog renderer, focused component and dialog regressions, and the corresponding specifications. No filtering semantics, keybinding, persisted setting, engine protocol, dependency, command-palette behavior, or pinned comparison behavior changes.
