## 1. Lazy selector preparation

- [ ] 1.1 Add an idempotent loader for the Thinking Level façade and Session Tree component that starts only after the first input-ready frame, caches fulfilled modules, shares in-flight work, and contains background rejection; verify focused loader tests cover fulfilled, shared, and rejected states.
- [ ] 1.2 Route `/thinking`, `/tree`, and double-Escape Session Tree opening through the prepared modules while preserving all component inputs, footer restoration, focus, cancellation, and profile isolation; verify existing focused selector and shell workflow tests pass.

## 2. Atomic opening and recovery

- [ ] 2.1 Coordinate the pending cold-load transition so the requested selector is the first presented post-submit input surface and the cleared ordinary prompt is never exposed between command submission and selector installation; verify presentation-order tests for Thinking Level and both Session Tree entry paths.
- [ ] 2.2 Release presentation coordination on every fulfilled or rejected load, flush the latest required frame once, and restore usable ordinary input with a visible command failure after rejection; verify controlled pending/failure tests leave no stale surface, blocked input, or unhandled rejection.

## 3. Regression validation and handoff

- [ ] 3.1 Run typechecking, architecture/startup-graph validation, and focused session-shell, thinking-selector, and tree-selector suites; verify eager startup totals remain within their accepted baseline and no selector interaction or nested tree transition regresses.
- [ ] 3.2 Build the candidate and prepare manual checks through `./scripts/dev`: open `/thinking`, open `/tree`, and open Session Tree with double Escape from a fresh launch, confirming each requested modal appears directly without an ordinary-prompt flash; record any known gap before finalization.
