## Why

`src/integrations/pi/engine/adapter.ts` is 1,907 lines after the workflow runner left it, and what remains is still several concerns in one class: runtime creation and session binding with their generations and subscriptions, the translation of pinned Pi session events into work states and semantic owned events, command admission and settlement, the settings port, resource discovery, prompt suggestions, the extension UI binding, and the usage summary. Each reaches the others through private fields, so none can be tested without a full engine adapter, and the plan's exit for the adapter split (a facade under 800 lines with no engine module over 600) is not met.

## What Changes

- Add `engine/session-runtime.ts`: `PiEngineRuntime` owns the runtime factory call, the working directory and git branch, the bound `AgentSession`, the session generation and binding generation, the event subscription, compaction progress observation, the queued-input integration, the changelog and package-update announcements, and disposal order; ports `started`, `rebindBlocked`, `sessionReplacing`, `sessionReplaced`, `rebound`, `event`, `compactionProgress`, `diagnostic`, `emitView`, `disposed`. `suspend`/`resume` serve overload recovery.
- Add `engine/session-events.ts`: `PiSessionEvents` owns the run and response sequences and the work-state kind, and translates every pinned Pi session event into projection updates, work-state ports (`enterWork`, `leaveWork`, `workProgress`), queue and thinking-level ports, and the `agent-run-started`, `assistant-message-completed`, and `agent-run-settled` events.
- Add `engine/command-dispatch.ts`: `PiCommandDispatch` owns admission, the pending set with its cancellation slot, active ids, remembered results, and the outcome events; `perform` stays an adapter port.
- Add `engine/settings-port.ts` (`PiEngineSettings`), `engine/resource-catalog.ts` (`PiResourceCatalog`), `engine/prompt-suggestions.ts` (`PiPromptSuggestions`), `engine/extension-ui-binding.ts` (`PiExtensionUiBinding`), `engine/usage-view.ts` (`readUsageView`), and `engine/provider-authentication.ts` (`PiProviderAuthentication`, cut from the workflow runner so it drops under 600 lines).
- The adapter constructs the collaborators with closures over its state, keeps its public surface as delegates, and owns only the view model, editor, status, lifecycle, terminal, model state, `#perform`, and overload reconciliation.
- Add unit suites for the runtime, command dispatch, session events, and the smaller collaborators.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: the engine adapter is a facade over adapter-owned components with explicit ports, each testable without an engine.

## Impact

`adapter.ts` goes from 1,907 to 790 lines; the largest engine module is the workflow runner at 518. No behavior changes: the engine, session-shell, owned-UI, and composition suites pass unchanged, and the moved code differs only in how it names its collaborators. The runtime subscribes to a new session before the adapter rebuilds its state (the rebuild ends with the asynchronous extension rebind, which the original subscribed ahead of); startup sets the terminal's hardware-cursor flag through the `started` port at the same point as before. The startup graph baseline moves to the exact new totals (152 files, 1,426,508 bytes) for the nine new modules.
