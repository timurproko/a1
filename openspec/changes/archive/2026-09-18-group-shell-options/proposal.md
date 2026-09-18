## Why

`OwnedUiSessionShellOptions` in `session-shell-root.ts` is one flat interface of sixteen optional and required fields supplied by five different providers: the engine adapter and the composition's routing and layout decisions, the terminal and presentation seams, the prompt history service, the prompt suggestion controller, and the clipboard and diagnostic seams. The shell constructor reads them by name from one bag, every fixture spreads the same conditional fields, and nothing in the type says which composition supplies what. Grouping the options by provider is the last step of the adapter and shell split and ends the phase-3 freeze on session-shell feature work.

## What Changes

- `OwnedUiSessionShellOptions` becomes five groups: `engine` (`backend`, `cwd`, `routeHost`, `sessionLayout`), `presentation` (`terminal`, `startup`, `viewportSettings`, `stream`, `reload`, `quitOutro`, `input`), `history` (the prompt history store, limit, editor, and image sidecar), `suggestions` (generator, enablement, change subscription, diagnostics), and `diagnostics` (`clipboard`, `responseCopy`, `paste`); the group interfaces are exported from `session-ui` for fixtures.
- `OwnedUiSessionShell`'s constructor destructures the groups once at the top and the body is otherwise unchanged; `composition/owned-ui.ts` builds the groups from the same decisions it made before.
- `session-shell-fixture.ts`, the composition tests that observe the options, and the eleven other shell constructions in tests and workers pass the grouped shape.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: the shell's composition options are grouped by the collaborator that provides them.

## Impact

No behavior changes: the session-shell, composition, TUI runtime, and owned-UI feature suites pass unchanged (1,087 cases). The startup graph baseline moves by the added group declarations (152 files, 1,427,745 bytes). This ends the phase-3 freeze: session-shell feature PRs may resume after it merges.
