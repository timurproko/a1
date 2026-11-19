## Context

Fifth of eight preparatory changes for multi-agent tabs. Should follow `session-shell-lifecycle-ordering` to avoid conflicts in `session-shell.ts`. Evidence from `develop` at `337ad3e7`:

- `PromptChipStore` (`session-shell-root.ts:410`) creates a `PastePreparationClient`, which creates a helper pool with one forked spare (`paste-preparation-client.ts:39`, `paste-executor.ts:46-47`); the shell warms it at `session-shell.ts:746`. `prompt-chips.ts:84` creates an `ImagePreparationClient` per store.
- `createResponseCopyExecutor` runs per shell (`session-shell.ts:245`) and forks a second helper pool (`response-copy-transport.ts:55`), warmed at `:747`. Spares idle for five minutes (`helper-pool.ts:4`).
- Module-level state: `ACTIVE_IMAGE_WORKERS` with a hard cap of eight (`image-preparation-client.ts:90,98`); `live`, `conversionQueue`, and a single `converting` slot (`paste-executor.ts:11-13,53`); `pendingClipboardWrite` and `nativeClipboardPromise` (`system-clipboard.ts:17-18`).
- `ensureTheme()` calls `setKeybindings(KeybindingsManager.create())` (`shell-shared-facade.ts:363`) and is invoked from the footer, status, header, and info presenters (`shell-footer-status.ts:45,75,113,174`; `shell-presenters-info.ts:41,56,116,154`). Each editor sets the registry at construction (`shell-editor-autocomplete.ts:100`) and the viewport controller re-activates before every key (`session-viewport-controller.ts:303-304`). `KeybindingsManager.create*` re-reads `~/.a1/keybindings.json` on every call (`keybindings.ts:466-470`).

## Goals / Non-Goals

**Goals:** exactly one paste pool, one copy pool, and one image client per process regardless of presenter count; one keybindings manager per process, applied once; no behavior change with a single session.

**Non-Goals:** changing helper protocols or worker code; per-tab keybinding profiles; changing the five-minute spare idle policy; the tab host itself.

## Decisions

### Share the helper pools, not the clients

```ts
export interface OwnedUiClipboardServices {
  readonly paste: HelperPool;
  readonly copy: HelperPool;
  dispose(): void;
}
```

The forked spares are the only process-wide cost, so they are what composition shares. `PastePreparationClient`, `ImagePreparationClient`, and the response-copy executor stay per shell: the paste client's `reset()` cancels every in-flight paste and its `onEvent` is the session's diagnostics, the prompt-chip store replaces its image client on every reset, and the copy executor closes over the shell's own terminal and runtime. Sharing those would let one tab cancel another tab's paste or write a copy to the wrong terminal. `PastePreparationClient` and `createResponseCopyExecutor` accept an optional `pool`; a borrowed pool is warmed but never disposed by its borrower.

`composeOwnedUi` creates the services once for the bare-A1 layout, passes them as `shared.clipboard`, and disposes them in `application.dispose`'s `finally`, after the shell. Each shell keeps warming after its first frame (`OwnedUiSessionShell.start()`); `HelperPool.warm()` is idempotent, so N shells still hold one spare per helper kind and startup never waits on a fork. A shell built without shared services (tests, embedders) keeps private pools exactly as before.

### Module-level caps stay process-wide

`ACTIVE_IMAGE_WORKERS`, the paste executor's `live` set and conversion queue, and the clipboard write serialization are already process-wide, which is the limit N sessions need. Moving them onto instances only changes anything if two instances exist, and then the cap becomes per instance. They stay where they are; that task from the plan is dropped.

### One keybindings host in the component adapter

`shell-shared-facade.ts` gains `createPiKeybindingsHost({ profile, agentDir })` returning `{ manager, ensureActive(), reload() }`, exported from the component owner index. Composition creates it once, before the shell, with the owned-input profile for bare A1 and Pi's for comparison profiles, and passes it as `shared.keybindings`; the root hands it to `createPiShellEditor`. `ensureActive()` compares identity and returns early, so the viewport controller's per-key `activateKeybindings()` is now a guard. `reloadKeybindings()` goes through `host.reload()`. The extension UI bridge keeps passing Pi's manager to extension components explicitly but no longer writes the registry.

`ensureTheme()` keeps its theme work and stops resetting the registry. It installs Pi's default manager only when no A1 `KeybindingsManager` is active (a presenter built outside composition); once a host has applied its manager, presenter construction never changes it.

## Risks / Trade-offs

- Any presenter constructed before the host applies keybindings would read defaults; composition applies the host before the shell is constructed.
- In bare A1, dialogs now see the owned-input manager instead of Pi's defaults while they are focused. The only `tui.*` differences are the extra Ctrl+Backspace/Ctrl+Delete word-deletion and Ctrl+Z undo aliases; no dialog reads the `app.*` actions the owned profile remaps.
- `KeybindingsManager.create()` read the file on every presenter construction, which hid user edits made mid-session; the shared instance reloads only on explicit `reload()`, matching the editor's existing `/reload` path.

## Planned Evidence

`test/app/session-shell` clipboard, paste, prompt-chips, and helper-pool suites; a new test asserting two shells over one services object fork one spare per helper kind and keep them until the services are disposed; `test/integrations/pi/components` tests asserting presenter construction keeps the host's manager and reload re-reads into it; type check; strict OpenSpec validation.
