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

### A clipboard services object owned by composition

```ts
export interface OwnedUiClipboardServices {
  readonly paste: PastePreparationClient;
  readonly copy: OwnedResponseCopyExecutor;
  readonly images: ImagePreparationClient;
  warm(): void;
  dispose(): Promise<void>;
}
```

`composeOwnedUi` creates it once, calls `warm()` where the shell used to warm at `session-shell.ts:746-747`, passes it as `clipboard` in the shell options, and disposes it after the shell in `application.dispose`. The shell's existing optional `responseCopy.execute` and `paste.execute` test seams remain as overrides on the services object so current fixtures keep working.

### Caps live on the services object

`ACTIVE_IMAGE_WORKERS`, the paste `live` set and `conversionQueue`, and the clipboard write serialization become fields of the respective client instances. The process-wide limit is then the services object's limit, documented in one place, and tests construct isolated instances instead of resetting module state.

### One keybindings host in the component adapter

`src/integrations/pi/components` gains `createPiKeybindingsHost()` returning `{ manager, apply(), reload() }`. Composition creates it once; `createPiShellEditor` and every presenter that calls `ensureTheme()` receive the manager through options instead of creating one. `ensureTheme()` keeps its theme responsibilities and loses the keybindings reset. `apply()` calls pi-tui's `setKeybindings` once; the viewport controller's per-key activation becomes `host.ensureActive()` which compares identity and returns early.

## Risks / Trade-offs

- Any presenter constructed before the host applies keybindings would read defaults; composition applies the host before the shell is constructed.
- Some tests reset module-level caps directly; they change to constructing a fresh services object.
- `KeybindingsManager.create()` read the file on every presenter construction, which hid user edits made mid-session; the shared instance reloads only on explicit `reload()`, matching the editor's existing `/reload` path.

## Planned Evidence

`test/app/session-shell` clipboard, paste, prompt-chips, and helper-pool suites; a new test asserting two shells over one services object fork at most one spare per helper kind; `test/integrations/pi/components` editor and footer suites asserting the registry is set once; type check; strict OpenSpec validation.
