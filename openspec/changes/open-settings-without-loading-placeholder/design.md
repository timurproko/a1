## Context

See `proposal.md` for motivation. At planning base `1d3f1bd6` the `/settings` route is served by `deferredSettingsSurface` in `src/composition/settings-route-host.ts`: it returns a surface at once, dynamically imports the settings application, host, and registry, and until that import resolves renders `Loading settings…` on the first row (or `Could not load settings: …` after a failure). The import takes long enough for one frame to be painted, so the message flashes. `SettingsApp` itself also renders `Loading settings…` through `renderEmptyState` when it has no rows while its session is still loading, although its owned sections are available synchronously, so that path is reached only when no declaration exists.

## Goals / Non-Goals

**Goals:**

- Open the settings screen with no intermediate text: the frame stays blank until the rows render.
- Keep the load-failure message so a broken module is still reported.
- Keep `No settings found.` for a loaded session without entries.

**Non-Goals:**

- Loading the settings module eagerly; it stays off the startup graph.
- Changing the settings rows, sections, search, or any other presentation.

## Decisions

### 1. The deferred surface renders blank while loading

`deferredSettingsSurface` renders `height` empty rows while the delegate is absent and no failure was recorded; a failure still renders its message on the first row. The input and mouse deferral is unchanged, so keys pressed during the load still reach the application.

Keeping a placeholder with a delay before it appears is rejected: the load completes within a frame or two, so a timed placeholder would never be seen and would add state for nothing.

### 2. The application's empty state is blank only while loading

`SettingsApp.render` pushes empty rows instead of the `Loading settings…` empty state while `#loading` is true and there are no rows; once loaded, an empty row set still renders `No settings found.`.

### 3. Verify both paths deterministically

A route-host test renders the surface before the import settles and asserts every row is empty, then waits for the rows and asserts they render. A settings-application test with no declarations asserts a blank body before `load` resolves and `No settings found.` after.

## Risks / Trade-offs

- **[Trade-off] A slow module load shows a blank screen rather than a message.** → The module is small and local; the blank frame lasts as long as the placeholder did, and a failure is still reported.

## Migration Plan

No stored data changes. Rollback is the ordinary code revert.
