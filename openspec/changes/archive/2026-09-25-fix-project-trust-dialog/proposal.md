## Why

Project trust currently appears global even with the default `ask` policy. A1 returns an undecided directory as trusted without prompting whenever it cannot already see a trust-requiring project resource, so launching from another folder can look and behave trusted after only one visible decision. The startup selector also takes over an otherwise empty full-screen surface and places a loose block at the top-left, unlike the compact model and thinking dialogs users interact with at the bottom of A1.

## What Changes

- Resolve project trust for every launch working directory under the configured saved/default policy, rather than silently granting trust to an undecided directory because no project resource is currently visible.
- Keep saved decisions canonical and path-scoped: an exact or explicitly trusted ancestor may cover a directory, while an unrelated directory under `ask` requires its own decision.
- Replace the top-left startup page with a vertically compact, bottom-anchored trust dialog whose blue rules span the terminal width and whose title, option list, selected row, and shortcut hints follow the established presentation.
- Keep the preflight isolated from project settings, themes, extensions, packages, prompts, and skills, and preserve fail-closed cancellation plus complete terminal restoration.
- Add focused coverage for unrelated and descendant paths, resource-free directories, default decisions, dialog geometry, narrow terminals, key handling, and cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-settings-runtime`: Make `ask` a real per-path launch decision even before trust-requiring resources are discovered, while retaining saved ancestor and configured default semantics.
- `owned-pi-ui-foundation`: Present the pre-resource trust selector as an isolated bottom dialog with full-width blue rules rather than a top-left full-screen page.

## Impact

The change affects project-trust preflight resolution, the fixed startup trust renderer, and their focused engine/UI tests. It does not change the trust-store format, project-resource loading order, in-session `/trust` restart-only workflow, installed Pi package bytes, or the `a1 pi` comparison profile.
