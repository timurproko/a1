## Why

The Windows resource-sensitive partition failed three attempts in a row on pull request 469, a change that touched only the release workflow and documentation. Attempt one failed `records separate cold/warm clipboard baselines` in `test/integrations/pi/session-ui/session-shell.test.ts` with `expected '' to be 'copy-target'`, and attempts two and three failed `a locked disposable root blocks before any journaled intent and completes after release` in `test/repository-governance/local-cleanup.node.mjs` with `fixture-lock-timeout`. Reproducing the first failure under CPU starvation showed a product defect rather than a slow assertion: when the isolated copy helper reports a complete prepared result and then takes longer than the 250 ms cleanup grace to exit, the transport's cleanup path discards the prepared text but keeps the delivered result, so the injected writer receives an empty string and the user's clipboard is replaced with nothing. The second failure is the hosted runner's first `powershell.exe` launch, whose assembly load and first-run scanning exceeded the fixture's 10 s bound because no earlier step in that job had started the interpreter.

## What Changes

- Reap, rather than cancel, a copy helper that lingers after reporting a complete result: the helper is still terminated within the cleanup grace, but its prepared text is delivered exactly instead of being replaced with an empty payload. An explicit cancellation still discards the text.
- Add a transport regression with a helper fixture that reports a complete prepared result and never exits; it must deliver the exact text once.
- Start one throwaway `powershell.exe` when `local-cleanup.node.mjs` loads on Windows so the interpreter's cold start overlaps the earlier tests, and have the exclusive-handle fixture wait for it before its timed hold and probe. Bounds, assertions, and the release protocol are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: a copy helper's late exit after a complete result no longer alters the delivered text.

## Impact

Implementation affects `src/integrations/pi/session-ui/response-copy-transport.ts`, its transport test and a new lingering-helper fixture under `test/integrations/pi/session-ui/`, the Windows exclusive-handle fixture in `test/repository-governance/local-cleanup.node.mjs`, the two documentation pages describing those behaviors, and the eager startup-graph byte baseline, which moves by the 196 bytes the reap path adds. The coordinator's 5,000 ms admission deadline, the 250 ms cleanup grace, the resource-sensitive partition's hang bound, and the fixture's own 10 s bounds are unchanged.
