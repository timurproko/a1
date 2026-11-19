# Proposal

## Why

Bare A1's searchable dialogs do not use one search-field marker: most show a terminal-default white `>`, while the Settings per-model Thinking Level dialog omits the marker entirely. A consistent accent-colored chevron will make every standard searchable dialog immediately recognizable and visually aligned with the command palette.

The Models dialog also exposes transient background catalog work as `(refreshing)` in its title. That label adds visual noise without helping the user act, because model browsing remains available and successful completion intentionally produces no result message.

The Settings per-model Thinking Level selector currently bypasses the shared dialog frame for its search row and uses middle-dot hint separators, leaving its marker one cell left of the title and list even though the component contract already requires aligned semantic rows and whitespace-only hint gaps.

## What Changes

- Render the exact ASCII `> ` marker in the active semantic accent color at the start of every bare-A1 standard dialog search field.
- Apply the shared treatment to Models, model selection/configuration, Skills, Thinking Level, Resume Session, Session Tree, login/logout provider selection, and the Settings per-model Thinking Level search step.
- Keep the full-screen Settings search field marker-free, because it is application chrome rather than a standard dialog, and leave non-search text-entry dialogs unchanged.
- Preserve query editing, focus and IME placement, filtering, pointer geometry, narrow-width clipping, live theme updates, and the pinned `a1 pi` comparison profile.
- Keep Models catalog refresh activity in the background without rendering a transient title or body progress label; retain actionable warning details when refresh fails or times out.
- Route the Settings stepped selector's title, description, search input, rows, and hints through shared dialog-frame geometry, with canonical whitespace-only shortcut spacing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Define a reusable live-themed `> ` presentation for standard dialog search inputs while preserving marker-free non-dialog auxiliary inputs, and enforce shared frame geometry and canonical hint spacing for owned stepped dialogs.
- `owned-pi-ui-foundation`: Require every bare-A1 standard searchable dialog to use the accent search marker without changing comparison-profile behavior, and keep successful Models catalog refresh activity visually silent while retaining actionable failures.
- `owned-ui-settings`: Restore the search marker only for the nested per-model Thinking Level dialog while retaining marker-free full-screen Settings search.

## Impact

Expected implementation affects shared dialog-search presentation, shared modal-frame geometry, Pi selector adapters, the Models refresh-status presentation, the Settings stepped dialog renderer, focused component and dialog regressions, and the corresponding specifications. No catalog refresh execution, filtering semantics, keybinding, persisted setting, engine protocol, dependency, command-palette behavior, or pinned comparison behavior changes.
