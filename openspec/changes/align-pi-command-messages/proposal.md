## Why

A1's successful model refresh prints an unstyled, product-specific sentence instead of pinned Pi's green `Model catalogs refreshed`. A source audit against Pi 0.84.2 also found command-error, help, authentication, empty-state, sharing, and message-layout differences that existing success-only checks do not catch.

## What Changes

- Make both model-refresh CLI aliases reproduce Pi's exact success and failure transcripts, including terminal-aware colors and output streams.
- Preserve Pi's operational error details, package-identity matching and suggestions, progress, and settings diagnostics for equivalent accepted user-scope package operations.
- Match focused package syntax diagnostics and explicit command help, substituting the supported A1 invocation and omitting unsupported operations/options rather than advertising standalone Pi's broader grammar.
- Correct interactive command notifications across success, warning, failure, empty, and cancellation states, including authentication, import, share links, fork/clone empty states, and new-session spacing. Parity covers visible wording, severity, ordering, and presentation; A1 retains its recoverable workflow/session behavior instead of adopting Pi's process-owning shutdown and exit for fatal `/new`, `/resume`, and `/import` outcomes.
- Preserve pinned message wrapping, padding, severity, placement, and consecutive-status behavior through owned presenters rather than raw formatted rows. Treat the fatal-command lifecycle difference as an explicit contextual exception, not as permission to change the visible error message or report false success.
- Establish source-traced command/outcome coverage and independent pinned-versus-A1 transcript and terminal-cell checks; retain already-matching messages as regression cases.
- Keep existing A1-only self-update/version behavior, profile isolation, unsupported-command no-ops, declared UI replacements/customizations, and public integration boundaries. Do not add package-management operations, project-local support, `a1 pi config`, independent Pi updates, or new interactive commands.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Specify exact Pi-compatible model-refresh output for both aliases without changing A1 self-update behavior.
- `extension-packages`: Strengthen operational failure/diagnostic parity and specify focused package help and syntax messages for the supported subset.
- `a1-shell`: Permit explicit supported package-command help and focused usage guidance while retaining quiet unsupported commands and no automatic full-help dumps.
- `owned-pi-ui-foundation`: Specify command-outcome message coverage, concrete divergent states, and style/layout-sensitive evidence within existing declared customization boundaries.

## Impact

Expected implementation areas are `src/cli/{dispatch,packages}.ts`, `src/integrations/pi/engine/{package-integration,adapter,workflows}.ts`, and the owned session-shell controllers and message presenters. CLI/parser tests, package integration tests, workflow tests, independent parity fixtures, and applicable source provenance will require updates in focused CLI and interactive implementation PRs; the overall OpenSpec change remains active until every required outcome and acceptance task is complete. The pinned dependency stays at the repository's certified version; production must not call Pi's process-owning CLI handler or deep-import private interactive code. This PR contains OpenSpec planning artifacts only.
