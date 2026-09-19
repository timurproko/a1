## Context

See `proposal.md` for motivation. The planning base is `d0ecb952` on `develop`.

- `src/app/session-shell/session-shell.ts` dispatches slash input in `#slashCommand`: a route the owned `UiRouteHost` claims opens through `#openOwnedRoute`, otherwise a pinned workflow route runs through the workflow runner, otherwise the text reaches Pi as a prompt. `#openOwnedRoute` already does everything a full-screen owned screen needs: it presents the neutral `UiRouteSurface` as a `100%`/`100%`, top-left overlay with `inputCoordination: "owned"`, enables pointer reporting, routes every mouse report to the surface at the pre-input boundary, watches the interrupt chord on raw input, and restores reporting and the dialog slots when the surface closes. Today only `/settings` uses it.
- `src/composition/settings-route-host.ts` builds that host: `createOwnedRouteHost(settings)` claims `settings`, defers the settings module load behind a placeholder surface, then hosts `SettingsApp` in a `UiAppHost` with `closeOnInterrupt: true` and the pinned-theme `UiTheme`. `src/composition/owned-ui.ts` creates it only for bare A1 (`ownedSurfaces` on); the `a1 pi` comparison profile has no route host.
- `src/integrations/pi/engine/workflow-runner.ts` answers `changelog` with `host.readChangelog()` (the complete pinned changelog, newest release first) and `hotkeys` with a text summary; `session-shell-root.ts#appendWorkflowResult` then appends `createPiShellChangelog(markdown)` or `createPiShellHotkeys(bindings, extensionShortcuts, profile)` from `shell-presenters-info.ts` as anchored feed components. Both presenters build a pi-tui `Container` of spacer, dynamic borders, bold accent heading, and a settings-aware `Markdown` component.
- `src/integrations/pi/engine/session-runtime.ts#announceChangelog` runs the pinned startup lifecycle: when the stored last changelog version differs from the pinned version and the session is empty, it reads the entries newer than that version and emits one recoverable `info` diagnostic, code `changelog-expanded` or `changelog-collapsed` depending on `collapseChangelog`, with the Markdown as its message, then stores the current version. `session-shell-root.ts#render` places `changelog-expanded` as the full document and `changelog-collapsed` as the two-line hint after the transcript rows, in every layout.
- `src/ui/apps/host.ts` and `contracts.ts` define `UiApp`, `AppHostServices`, and the neutral `UiRouteHost`/`UiRouteSurface` seam. `src/features/owned-ui/settings-app.ts` is the only app: it owns its `ShortcutRegistry` hint line, `renderStatusLine` footer, `withScrollbarRail` rail with `ScrollbarRails` hover/drag state, `scrollbarGeometry`/`scrollbarPresentation`, and reads `scrollbarAppearance`/`scrollbarStyle`/`scrollbarSpeed` from the owned settings manager.
- `D:/Backups/pi/v2/core/fullscreen/view.ts` and `agent/updates-interceptor.ts` are the behavioral reference: `registerFullscreenView` renders a title, a scrollable content column with a scrollbar rail, and a dim footer hint; `Esc`/`Ctrl+C` close; `↑`/`↓`, `PageUp`/`PageDown`, `Home`/`End`, wheel, thumb drag, and track press scroll; `/changelog` renders `CHANGELOG.md` through the same `Markdown` theme; the startup block is lifted out of the feed and opened as the `What's New` screen once.
- `config/baselines/pi-feature-adoption-matrix.json` rows `command:changelog` and `command:hotkeys` are `owned`; `config/baselines/presenter-ownership-inventory.json` entry `document.changelog-hotkeys` records the pinned in-feed document as a `persistent-document` plane owned by the session shell.

## Goals / Non-Goals

**Goals:**
- Show `/changelog`, `/hotkeys`, and startup release notes in bare A1 as one full-screen reference screen, reusing the owned route, app host, scrollbar, hint, and theme machinery the settings screen already proved.
- Keep the content identical to what the feed showed: the same changelog Markdown source and ordering, the same bare-A1 keybinding tables with extension shortcuts, the same settings-aware Markdown theme.
- Keep the `a1 pi` comparison profile and untouched pinned Pi observably unchanged.

**Non-Goals:**
- Changing the changelog source, version filtering, link rewriting, or last-version bookkeeping.
- Replacing the hotkeys content with the v2 declarative shortcut registry tables; bare A1 keeps its keybinding-derived tables.
- A generic multi-screen navigation stack, in-screen search, or link activation.
- Mutating installed Pi packages, their prototypes, or the pinned `InteractiveMode` command handlers.

## Decisions

### 1. One read-only reference screen app, not two screens

Add `ReferenceScreenApp` in `src/features/owned-ui/reference-screen-app.ts` implementing `UiApp`. It is constructed with a title, a `content(width)` provider returning already-styled rows for that content width, and a scroll-settings reader. Its frame is: one bold accent title row, one blank row, the scrolled content rows padded to the body height, and one bottom status line rendered through `renderStatusLine` from the app's `ShortcutRegistry` hint (`↑↓ to scroll`, `PgUp/PgDn to page`, `Esc to close`), or `press ctrl+c again to exit a1` while the interrupt chord is armed, exactly as the settings screen does. The content width is the rectangle width minus `RAIL_COLUMNS` unless `scrollbarAppearance` is `hidden`, and rows longer than it are truncated ANSI-aware rather than wrapped, because the provider already wraps Markdown at that width.

The content provider is called again only when the content width changes; its rows are cached with the width so wheel and drag frames do no Markdown work. A provider may return a pending state (`null`) before its document is available, in which case the screen shows `Loading…` and renders again when the provider signals readiness, the same deferred pattern the settings route already uses.

Scrolling uses `scrollbarGeometry`, `scrollbarPresentation`, `withScrollbarRail`, `ScrollbarRails`, `scrollbarWheelRows`, and `scrollForThumbRow`/`scrollForTrackPage` from `src/ui/components`: `↑`/`↓` move one row, `PageUp`/`PageDown` move one body height, `Home`/`End` jump to the ends, the wheel moves `scrollbarWheelRows(scrollbarSpeed)`, rail hover lights the thumb, thumb drag follows the pointer, and a track press pages toward the pointer. The rail lingers after a scroll for the same `900 ms` the settings and transcript rails use. `Esc` closes through `host.close()`. `Ctrl+C` is not consumed by the app, so the host's interrupt chord applies with `closeOnInterrupt: true`, matching `/settings`.

Two separate apps, or reusing v2's `renderScrollableReferenceScreen`, were rejected: the settings screen already established the rail, hint, and theme idioms A1 screens share, and the only differences between changelog and hotkeys are the title and the document.

### 2. Route surfaces accept an optional caller-supplied document

Extend the neutral seam in `src/ui/apps/contracts.ts` with an optional second parameter: `open(route: string, input?: UiRouteInput)` where `UiRouteInput` carries an optional `document: string`. A route that ignores input behaves exactly as today; `settings` ignores it. The reference routes use it so the startup screen can present the entries newer than the last acknowledged version, which only the shell holds (as the diagnostic message), while `/changelog` without input presents the complete changelog.

Passing the document through the slash argument, or reading the last acknowledged version again from the engine, was rejected: the argument is user text, and the engine has already advanced the stored version by the time the shell sees the diagnostic.

### 3. The owned route host declares both reference routes beside `settings`

Rename nothing; extend `createOwnedRouteHost(settings, references)` so it also claims `changelog` and `hotkeys`. `references` is a neutral object the composition supplies: `changelog(input?)` resolving to the styled rows for a width and `hotkeys()` resolving to the styled rows for a width. Each route opens a `ReferenceScreenApp` in a `UiAppHost` through the same deferred-surface helper the settings route uses, so the app module and the pi-tui Markdown renderer load on first use rather than at startup, and `render`/`handleInput`/`handleMouse`/`isClosed`/`close`/`onRenderRequested`/`onExitRequested` keep their settings-route semantics.

The composition builds the providers on the existing integration presenters: `src/integrations/pi/components/shell-presenters-info.ts` gains `renderPiShellChangelogLines(markdown, width)` and `renderPiShellHotkeysLines(bindings, extensionShortcuts, profile, width)`, which render the same settings-aware `Markdown` component the feed presenters use, without the spacer, borders, or heading rows, so the row content of the screen equals the row content of the former feed document minus its chrome. The changelog provider reads `readPinnedCommandChangelog()` (complete, newest release first) when no document is supplied, otherwise renders the supplied document. The hotkeys provider asks the shell for its current editor keybinding configuration and extension shortcut descriptions at open time, through a small `OwnedUiSessionShell` accessor, so a `/reload` or keybinding change is reflected the next time the screen opens; the composition closes over the shell instance it constructs immediately afterwards, and the route cannot be opened before the shell exists.

Putting the hotkeys route inside the session shell was rejected: the shell already treats claimed routes uniformly and must not grow a second route table. Rendering Markdown inside `src/ui` or `src/features/owned-ui` was rejected because those layers stay free of the pi-tui boundary; the providers hand them finished rows.

### 4. The startup screen opens once from the existing diagnostic

Bare A1 keeps the engine's `changelog-expanded`/`changelog-collapsed` diagnostics unchanged. In the custom viewport, `session-shell-root.ts#render` renders the two-line hint (`What's New` / `Run /changelog to view the full release notes.`) for both codes, so the feed never carries the full document. When the shell applies a view whose diagnostics contain a `changelog-expanded` diagnostic it has not yet acted on (tracked by diagnostic sequence, once per shell instance), it opens the `changelog` route with `{ document: diagnostic.message }`, provided the route host exists, the runtime is active, and no dialog, selector, or owned route is currently presented. If a modal is presented at that moment, the screen is not opened later: the hint remains and `/changelog` shows the complete changelog. The pinned layout keeps rendering the expanded document in the feed and opens nothing.

Lifting the rendered block out of the feed the way v2's `takeStartupUpdates` does was rejected: A1 owns the diagnostic and the root, so it presents the hint and the screen directly instead of scraping components. Deferring the screen behind a startup modal was rejected for this change as a queueing mechanism without a demonstrated need; the trade-off is recorded below.

### 5. Bare-A1 commands bypass the workflow path; the comparison profile keeps it

Because the route host claims `changelog` and `hotkeys` before `isWorkflowRoute`, bare A1 never runs the pinned `changelog`/`hotkeys` workflows, appends no `createPiShellChangelog`/`createPiShellHotkeys` feed component, and records no workflow status for them. The workflow table, the runner cases, the feed presenters, and the autocomplete entries (`changelog`: `Show changelog entries`, `hotkeys`: `Show all keyboard shortcuts`) stay as they are for `a1 pi`, which has no route host. Existing shell tests that assert `What's New` and `Keyboard Shortcuts` in the feed are split by layout: the pinned layout keeps them; the custom-viewport layout asserts the route opens and the feed is unchanged.

### 6. Declared replacements, comparison profile untouched

`command:changelog` and `command:hotkeys` in the feature-adoption matrix move to `diverged` with this change as the approved deviation, and the presenter-ownership inventory entry `document.changelog-hotkeys` records the bare-A1 destination as the reference screen with the pinned in-feed document retained for the comparison profile. Parity evidence classifies the screens as expected deviations and keeps comparing the `a1 pi` surfaces against pinned Pi.

## Risks / Trade-offs

- A startup modal (project trust, session fork, a backend dialog) that is presented when the diagnostic arrives suppresses the automatic `What's New` screen for that launch. Mitigation: the feed hint always remains, `/changelog` shows the full log, and the acknowledged version is stored by the engine regardless, exactly as pinned Pi does when the block scrolls away.
- The screen truncates rows wider than the content width. Mitigation: the providers wrap Markdown at that width, so only pre-formatted code or table rows wider than the terminal are cut, which the feed also clips at the viewport edge.
- Hotkeys content is captured when the screen opens, not live. Mitigation: it is re-rendered on every open, and a keybinding change during the seconds the screen is up is not a supported flow.
- Extending `UiRouteHost.open` with an optional parameter touches the neutral seam and its re-export from the Pi integration entry. Mitigation: the parameter is optional and ignored by `settings`, so existing callers and tests compile unchanged.

## Migration Plan

No stored settings, session files, or history entries change shape. Bare A1 users see the two commands and the startup notes as screens on the next launch; `a1 pi` users see no change. Rolling back restores the in-feed documents without data migration.
