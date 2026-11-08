# Tasks

## 1. Shell presenter and root

- [x] 1.1 Delete `onView` and `#listeners`, plus `retry`, `compact`, `newSession`, `resumeSession`, `setModel` and the now-unused `#simple` members from `OwnedUiSessionPresenter`, and `canPreparePromptSuggestion` from `OwnedUiSessionShellRoot`; shrink the ratchet entry.

## 2. Pi TUI runtime and engine adapters

- [x] 2.1 Delete the test-only `PiTuiRuntimeAdapter` members (`scrollState`, `scrollBy`, `scrollToTop`, `scrollToBottom`, `setFocus`, `presentationFrozen`, `getHardwareCursor`, `getClearOnShrink`, `showFlash`) and any helper only they use; rewrite the adapter and wheel-parity tests through the runtime port and rendered rows; shrink the ratchet entry.
- [x] 2.2 Remove `tui-runtime/contracts.ts` and use the neutral `Terminal*` contract types directly in the TUI runtime and its tests.
- [x] 2.3 Delete `abortBashWorkflow` from `PiEngineAdapter` and `PiWorkflowRunner` and the tests that only called it.

## 3. Owned-UI validation exports

- [x] 3.1 Export only the validators production calls from `validation.ts` and the contracts entry; make the others private or delete them; move their test cases onto the exported validators.

## 4. Scripts

- [ ] 4.1 Delete the four unreferenced scripts and add an architecture-gate rule, with a fixture test, that fails on any `scripts/**/*.mjs` nothing references.
