## Context

Ordinary launch intentionally selects the greater of the installed package candidate and the approved active immutable release. This prevents an older package installation from rolling shared state backward, but it means the runtime version can belong to a different publication channel from the package through which the user invoked A1.

The startup release check currently receives only the executing package version. That is correct for automatic update coordination, which acts on the executing immutable release, but it is insufficient for `Notify`: the displayed manual command should correspond to the channel the user launched. A stable package that follows an active development runtime currently checks `next` and can render `a1 update --develop`.

## Goals / Non-Goals

**Goals:**

- Make `Notify` inspect and announce only the invoking installed package's publication channel.
- Preserve stable `a1 update` and development `a1 update --develop` notice commands and stable-only changelog links.
- Keep the selected immutable runtime and ordinary no-downgrade behavior unchanged.
- Preserve automatic update behavior and compatibility for SDK or exceptional launch paths without invocation metadata.

**Non-Goals:**

- Changing ordinary release selection or allowing a stable invocation to downgrade an active development runtime.
- Changing the automatic-update channel, worker, lease, cooldown, or restart-ready status.
- Adding a user-facing channel selector to `a1 solo` or other launch commands.
- Changing the update-check cache schema or notification presentation.

## Decisions

### 1. Carry an invocation update baseline in the neutral launch context

After bootstrap safely reads the installed package version, it carries that version through the current neutral private launch context into the selected guardian and UI process. The value identifies the package that accepted the public launch command, not the immutable release selected for execution.

The field is validated as a publication version before use. It is optional so launch-during-update paths that deliberately avoid reading the mutable package tree, direct SDK composition, and older launch contracts retain their current fallback behavior. It is not an authority for release selection, package mutation, or activation.

### 2. Separate notification baseline from executing runtime version

Startup composition continues to resolve the executing package version. In `Notify` mode it supplies the validated invocation version to release discovery when present; otherwise it uses the executing version. The chosen version determines both the registry dist-tag (`latest` or `next`) and the semver comparison baseline.

This ensures a stable invocation ignores a newer `next` preview even when it executes that retained preview, while a development invocation continues to ignore stable `latest`. Cache behavior remains channel-keyed and therefore needs no format change.

### 3. Leave automatic updates tied to the executing release

`Auto` continues to discover from the executing immutable release version and passes that exact channel and target into the existing automatic-update coordinator. This avoids changing mutation semantics as part of a notification-only correction and keeps restart readiness relative to the code the session actually runs.

### 4. Preserve metadata through resident and direct launches

The invocation version travels in the same reconstructed launch context as profile, mode, and release identity, so direct `a1 solo`, guardian-launched UI, and resident attachment paths receive one coherent value. Reconstructing context continues to remove stale inherited private values before writing the selected launch.

## Risks / Trade-offs

- [Invocation metadata is absent on an exceptional path] → Fall back to the executing version, preserving current safe behavior.
- [A malformed inherited value influences notification routing] → Validate the optional context value and reject conflicting or invalid current private context before UI composition.
- [Notification and automatic modes intentionally use different baselines] → Keep the distinction explicit in composition and cover both modes so future refactors do not merge them accidentally.
- [The executing runtime is newer than the stable launcher] → The notice still reflects the stable launcher channel; release selection and the running session remain unchanged.

## Migration Plan

No stored data migration is required. The new optional current-contract field is supplied by updated launchers and ignored by older releases. Rollback removes the field and restores executing-version notification routing without changing persisted release, update, or cache state.

## Open Questions

_None._
