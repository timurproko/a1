# Design

## Context

`PiEngineAdapter` composes the runtime, the workflow runner, the workflow contexts, settings, resources, extensions and suggestions behind the owned-UI ports. The previous changes split the shell side. This change splits the three engine collaborators that still carry a second concern.

## Decisions

- **The poller gets the generation as a callback.**
  - `RepositoryMetadataPoller` takes `bindingGeneration()`, `sessionIdentity()` (the session id and file), `fallbackCwd()`, `disposed()` and `changed()`.
  - It keeps the existing guard: a result from an older binding generation, an aborted probe or a disposed engine is dropped.
  - The runtime calls `reset()` when it binds a new session and `start()` after startup and binding, exactly where it calls its private methods today.
- **Dispatch by named handlers, not a table of closures.**
  - Each case passes one `PiWorkflowCall` (request, session, runtime, trimmed argument and selection) to its handler.
  - A handler that needs only the call, plus at most a port or the clipboard writer passed to it, is a module function in `workflow-runner.ts`.
  - Only the handlers that need runner state (model selection, reload, debug) are private methods, which keeps the runner under the 20-method threshold.
  - The switch remains the one place that maps a command name to its handler, which is the readable part of a switch.
  - The work moves out of the cases.
- **Share loads on first use.**
  - `workflow-share.ts` exports `runShareWorkflow(context, request)`.
  - The runner keeps only the dispatch line, which awaits `import("./workflow-share.js")`.
  - The module and its helpers drop out of the startup graph. `isAbortError` and `commandMissing` stay in `workflow-support.ts`, because other workflows use them.
- **The projection is a pure function.** `projectSessionView(source)` takes the adapter's state, engine, projection and command set and returns the view model. The adapter's `view()` becomes one call.
- **Flat session methods stay.**
  - `view`, `flushEvents`, `executeWorkflow`, `start` and `execute` are the adapter's own session behaviour.
  - About 450 test lines call them, so repointing those lines would be churn without a structural gain.
  - Only the two settings forwards that duplicate the settings port go.

## Risks

- **Moving the polling could change when a stale result is dropped.** Mitigation: the guard conditions move verbatim, and the runtime and footer tests that exercise branch and pull-request refresh keep running.
- **Dynamic loading could change share's first-use timing.** Mitigation: the import resolves before any network work starts, and the share outcome tests run through the same dispatch.
