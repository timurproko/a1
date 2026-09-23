## Why

The startup changelog banner is rendered as persistent transcript content, so it moves with the conversation and competes with the work the user is reading. The update cue should instead use the same low-distraction, non-transcript presentation as model-change information.

## What Changes

- Replace bare A1's bordered two-line startup changelog banner with one transient dock notice containing exactly `Run /changelog to view the full release notes.`
- Stop automatically opening the `What's New` reference screen when new changelog entries are detected; users can open the complete release notes explicitly with `/changelog`.
- Give the notice the existing informational-status lifetime: it stays outside transcript content, can be replaced by a newer notice, and is dismissed by the user's next prompt or shell command.
- Preserve changelog detection, collapsed/expanded settings, acknowledged-version storage, the on-demand `/changelog` reference screen, and the pinned `a1 pi` comparison presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Change bare A1's startup release-note presentation from a persistent two-line feed hint plus optional automatic screen to a one-line transient dock notice.

## Impact

The change affects startup diagnostic presentation in the owned session shell, its custom-viewport rendering and reference-screen tests, and presenter-governance descriptions that currently classify startup notes as feed/reference-screen content. It does not change the engine's changelog reader, settings or version bookkeeping, the `/changelog` document, dependency versions, or installed Pi packages.
