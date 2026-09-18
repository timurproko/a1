## 1. Extraction

- [x] 1.1 Add `engine/resource-catalog.ts` (`PiResourceCatalog`), `engine/settings-port.ts` (`PiEngineSettings`), `engine/prompt-suggestions.ts` (`PiPromptSuggestions`), and `engine/usage-view.ts` (`readUsageView`) with the resource, settings, suggestion, and usage code moved verbatim; the summary types move with the catalog and are re-exported from the adapter.
- [x] 1.2 Add `engine/session-runtime.ts` (`PiEngineRuntime`) owning runtime creation, cwd and git branch, the session and both generations, subscription, compaction observation, queued-input delivery, changelog and package-update announcements, `suspend`/`resume`, and disposal; the factory and probe types move with it.
- [x] 1.3 Add `engine/command-dispatch.ts` (`PiCommandDispatch`) owning admission, the pending set, active ids, remembered results, and outcome events, with `perform` as an adapter port.
- [x] 1.4 Add `engine/session-events.ts` (`PiSessionEvents`) owning the run and response sequences and the work-state kind, translating every pinned Pi session event through work-state, queue, thinking-level, transcript, and emit ports.
- [x] 1.5 Add `engine/extension-ui-binding.ts` (`PiExtensionUiBinding`) and `engine/provider-authentication.ts` (`PiProviderAuthentication`, cut from the workflow runner); wire every collaborator in the adapter constructor with closures over adapter state and keep the public surface as delegates.

## 2. Proof

- [x] 2.1 Add `test/integrations/pi/engine/session-runtime.test.ts` (4 cases), `command-dispatch.test.ts` (4), `session-events.test.ts` (3), and `engine-collaborators.test.ts` (6) driving each component with fake sessions, runtimes, and ports.
- [x] 2.2 Re-pin `config/startup-graph-baseline.json` to 152 files and 1,426,508 bytes; run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, and the engine, session-shell, owned-UI, and composition suites; record outcomes: all checks OK, 1,350 passed plus 17 new, `adapter.ts` 1,907 to 790 lines, largest engine module 518.
