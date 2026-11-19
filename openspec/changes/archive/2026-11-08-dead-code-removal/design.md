# Design

## Context

The export-consumer rule (`inspectExportConsumers`) proves that every exported value has a production importer. Class members and scripts fall outside it, so a member or script that only a test reaches survives indefinitely. This change removes the current cases and closes the script gap. Members stay a review concern, because proving that a method has no production caller needs type information the gate does not have.

## Decisions

- **Delete rather than privatise.** Every listed member has no production caller, so it goes entirely. A test that only exercised a deleted member is removed. A test that used one to reach real behaviour is rewritten through the production entry: for example, wheel and scroll parity drive wheel input through the runtime and read the rendered rows, instead of calling `scrollToTop`.
- **Keep `deliveryDiagnostics`.** It is test-only, but it is the one way the resource-bound suites observe delivery memory and overload counters. Removing it would weaken those suites, which this change must not do.
- **Neutral names in the TUI adapter.** The adapter imports `Terminal*` types from `src/contracts/presentation` directly. Pi-specific types such as `PiTuiRuntimeError` and the damage types keep their names, because they are not aliases.
- **A script reference is a mention of its repository path.** The path counts when it appears in `package.json`, `.github/**`, `docs/**`, `openspec/specs/**`, `AGENTS.md`, `README.md`, another script, `bin/`, `src/`, or `test/`. Archived OpenSpec changes do not count, because they are history. Modules imported by other scripts count through the import itself.

## Risks

- Rewriting the wheel-parity test could weaken it. Mitigation: it keeps comparing the adapter with upstream Pi on the same wheel input, and only the setup step changes.
- A script that is run only by hand and was never documented would now fail the gate. That is intended: either document it or delete it.
