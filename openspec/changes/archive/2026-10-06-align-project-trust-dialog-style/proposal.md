## Why

The two bare-A1 project-trust surfaces still look like exceptions to the standard dialog family. The startup selector uses an older green/bright-blue fixed palette and prose-like shortcut row, while the in-session trust dialog leaves an extra row below its hints, renders decision values as muted text, and reserves marker padding that makes an unmarked selected row look like it has multiple spaces after the arrow.

## What Changes

- Give the startup and in-session project-trust dialogs the standard bare-A1 visual hierarchy: accent title and active selection, standard border-colored rules, and the shared semantic shortcut-hint treatment.
- Keep the pre-resource startup selector isolated from project-derived themes while making its fixed ANSI colors match the standard dark dialog roles.
- Render the in-session saved-decision and current-session values with the normal text color while retaining muted labels and path context.
- Remove the in-session dialog's blank row between shortcut hints and the bottom rule.
- Render every trust option as a plain menu choice with no saved-decision checkmark, using exactly one space between the active arrow and label; keep saved state in the status lines and initial selection.
- Preserve trust choices, persistence, navigation, exit/cancel behavior, startup terminal restoration, responsive fallback, and the explicit `a1 pi` comparison profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require both bare-A1 project-trust dialogs to follow the standard dialog palette, text hierarchy, selection spacing, shortcut presentation, and compact footer geometry without weakening startup isolation.

## Impact

Implementation will affect the startup-safe trust renderer, the owned in-session trust-selector component, and their focused rendering tests. Trust policy, saved records, available outcomes, key dispatch, terminal ownership, installed Pi package code, and `a1 pi` output remain unchanged.
