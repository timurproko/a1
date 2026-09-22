# Implementation evidence

## Reproduction and repair

At planning head `8cd0e535`, a production-path regression opened slash autocomplete over the visible `run the tests` suggestion, then dispatched the configured delete-to-line-start byte (`Ctrl+U`). The editor text became empty, but `promptSuggestionPresentationBlockReason()` returned `autocomplete`, so the retained suggestion did not repaint. Direct one-character Backspace tests had not exercised this stale completion state.

The repaired adapter synchronizes every bare-A1 nonempty-to-empty input transition through Pi's public empty-text boundary. That cancels visible and debounced autocomplete without emitting a duplicate semantic change, leaves the delivered suggestion and its single diagnostic outcome intact, and lets the coordinated frame repaint it. The pinned comparison path is unchanged.

Regression coverage proves ordinary Backspace and the clear shortcut through terminal input coordination, visible slash completion followed by whole-draft deletion, a debounced extension-style trigger canceled before request start, emitted frame output, persistent-history parity, one generator call, one `displayed` diagnostic, and subsequent Tab acceptance. Existing coverage proves submission and lifecycle invalidation do not revive the old suggestion.

## Validation

- `npx vitest run test/app/session-shell/prompt-suggestion-controller.test.ts test/app/session-shell/session-shell-suggestions.test.ts test/integrations/pi/components/shell-components.test.ts` — passed: 3 files, 100 tests.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed after reconciling current `origin/develop` and repinning the reviewed startup source-byte total from the target's 1,441,851 to the combined 1,442,425; file count, optional-module exclusions, and Pi artifact limits are unchanged.
- `npm run check:code-documentation` — passed.
- `npm run check:code-documentation:changed` — passed.
- `npm run build` — passed.
- `npx openspec validate restore-prompt-suggestion-after-delete --strict --no-interactive` — passed.
- `git diff --check` — passed.

The focused tests and all listed gates were rerun successfully after merging current `origin/develop`. No broad local test tier was run. Required exact-head CI remains the integration gate.

## Known gaps

None. Interactive terminal confirmation remains the maintainer acceptance step.
