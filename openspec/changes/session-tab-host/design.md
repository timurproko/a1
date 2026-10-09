## Context

Seventh of eight preparatory changes for multi-agent tabs and the largest; depends on `narrow-owned-ui-backend-port`, `extract-pi-session-presenters`, `session-shell-lifecycle-ordering`, `share-helper-pools-and-keybindings`, and `pi-engine-host`. Evidence from `develop` at `337ad3e7`:

- The shell constructs `PiTuiRuntimeAdapter` (`session-shell.ts:412`), which defaults to a new `ProcessTerminal` (`tui-runtime/adapter.ts:185`); `#root` and `#layoutRoot` are `readonly` and mounted once (`:183-187`, `:666-671`).
- `DamageAwareTerminalAdapter` keeps one row cache and `#lastConsumedFrameId` (`damage-aware-terminal.ts:98-110`); invalidation is reachable only through resize or `clearScreen` (`:160-168`, `:246-248`). The root arms it through `viewportFrameDescriptor()` (`session-shell-root.ts:885`) and `replacementSurfaceActive` (`session-shell.ts:290`).
- `#scrollViews` is keyed by the literal `"transcript"` (`session-shell-root.ts:1098`) and throws on duplicates (`:709`).
- Owned routes install raw-input and pre-input listeners on the runtime (`session-shell.ts:1990`, `:2037`) and duplicate the interrupt chord that `UiAppHost` already implements (`ui/apps/host.ts:36-37`, `:131-145`).
- Pointer reporting (`:1740-1747`), quit outro and dispose (`:1763-1856`), and the pre-input listener (`:482-530`) are terminal concerns living in the session class.
- `UiRouteSurface` (`ui/apps/contracts.ts:67-80`) already has the `render`/`handleInput` shape a presenter needs. In the bare profile the root renders the whole screen in `root.render()` (`session-shell-root.ts:773-800`), which makes delegation straightforward.
- Every root calls `handlers.requestRender` directly, and the document is rebuilt on any transcript revision (`:1160-1190`), so an inactive presenter would still trigger paints.

## Goals / Non-Goals

**Goals:** one `OwnedUiTerminalHost` per process owning the terminal; `OwnedUiSessionPresenter` owning one session and nothing terminal-wide; a presenter can be swapped without a stale-frame fallback; a non-active presenter stays live but never paints; identical behavior for the single-session product.

**Non-Goals:** tab UI, tab key chords, creating more than one presenter in production, per-tab settings, hidden-tab resource budgets, transcript pruning. Those belong to the tabs feature.

## Decisions

### Host and presenter contracts

```ts
export interface OwnedUiSessionPresenter {
  readonly backend: OwnedUiSessionBackend;
  render(width: number): readonly string[];
  handleInput(data: string): void;
  setFocused(focused: boolean): void;
  frameDescriptor(): OwnedUiFrameDescriptor | null;
  start(): void;
  dispose(): Promise<void>;
}
export interface OwnedUiTerminalHost {
  attach(presenter: OwnedUiSessionPresenter): void;   // becomes active; invalidates presentation
  active(): OwnedUiSessionPresenter | null;
  requestRender(from: OwnedUiSessionPresenter): void; // no-op unless from === active
  openRoute(route: OwnedUiRouteRequest): OwnedUiRouteHandle;
  start(): void;
  waitUntilStopped(): Promise<void>;
  dispose(): Promise<void>;
}
```

The host is the runtime's single root component and delegates `render`, `handleInput`, and focus to the active presenter. Presenters never see the runtime; they receive a `OwnedUiPresenterHost` handle (`requestRender`, `viewport`, `beginPresentationHold`, `openRoute`) which the `OwnedUiDialogHost` from `extract-pi-session-presenters` extends.

### Explicit presentation invalidation

`DamageAwareTerminalAdapter` gains `invalidatePresentation()` and a frame epoch included in every frame descriptor. `attach()` bumps the epoch, so the first frame of a newly active presenter is a full paint and later frames use incremental damage. Frame ids are compared only within an epoch.

### Routes through `UiAppHost`

`openRoute` constructs a `UiAppHost` for the route surface and installs it as the runtime's overlay, so the interrupt chord, raw-input capture, and close handling exist in one place. The shell's `#openOwnedRoute` body (`session-shell.ts:1953-2060`) is deleted.

### Scroll-view keys and render gating

The root takes a presenter id and namespaces its scroll-view keys with it. The root's `handlers.requestRender` is bound to `host.requestRender(presenter)`, which drops requests from inactive presenters; an inactive presenter still applies transcript blocks to its root so its state is current when reattached.

### Composition

`composeOwnedUi` creates the host, one presenter over `host.create()` from the engine host, attaches it, and returns the same `OwnedUiApplicationPort`. The session-shell test fixture builds a host with the fake terminal and one presenter; existing tests keep their assertions.

## Risks / Trade-offs

- This is the largest diff of the series; land it as the last preparatory change so it absorbs no concurrent edits to the shell.
- The reference-screen tests pin exact frames; the epoch must not change frame bytes for a single presenter. Verify by diffing recorded screens before and after.
- The `#customViewport` branches remain in the presenter; this change does not remove the comparison-profile branches.

## Planned Evidence

All `test/app/session-shell` suites, including reference screens unchanged; a new host test that attaching a second presenter over the fake terminal produces one full paint and that `requestRender` from the inactive presenter paints nothing; `test/integrations/pi/tui-runtime` damage suites for the epoch; composition tests; strict OpenSpec validation.
