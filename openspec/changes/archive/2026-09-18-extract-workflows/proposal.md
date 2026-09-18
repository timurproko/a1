## Why

`src/integrations/pi/engine/adapter.ts` is 3,137 lines after event delivery left it. Its largest remaining cluster is the slash-command workflow machinery: `executeWorkflow` and its admission budget, the 400-line `#performWorkflow` switch, provider login and logout with default-model selection and the post-login catalog refresh, model cycling, bash and copy workflows, and the fifteen selector contexts and option lists the owned dialogs read (`pinned*Context`, login and logout options, scoped models, project trust, fork, tree). That cluster is 1,360 lines, reaches the adapter's session, runtime, model state, and view publication in a dozen places, and can only be exercised through a full engine adapter today.

## What Changes

- Add `src/integrations/pi/engine/workflow-runner.ts`: `PiWorkflowRunner` owns the pending-workflow set, `executeWorkflow` and its failure wording, `#performWorkflow`, provider authentication completion and the scheduled catalog refresh, `cycleModelWorkflow`, the clipboard writer, bash workflows, and `reloadBlockedResult`, through ports for the session, runtime, generation, interaction host, admission state, running-command accounting, active model and thinking level, view publication, model reconciliation, extension rebinding, pinned-setting application, snapshot, and disposal; `pendingCount` and `cancelPending(except)` replace the adapter's direct set access.
- Add `src/integrations/pi/engine/workflow-contexts.ts`: `PiWorkflowContexts` owns the selector contexts and option lists (model selector, project trust, session selector, scoped models, login and logout options, login method options, ambient authentication, fork, tree) with ports for cwd, session, runtime, disposal, active model, and view publication.
- Add `src/integrations/pi/engine/workflow-support.ts` with the pure helpers moved out of the adapter (result and confirmation builders, session-info presentation, login notifications, model matching, option shaping, the pinned default-model table, the default workflow host); `message-values.ts` gains the five readers both sides share (`stringProperty`, `dynamicObject`, `requireCapability`, `readModel`, `readThinkingLevel`); the selector context types move to `workflows.ts`.
- The adapter constructs both collaborators, keeps its public workflow surface as one-line delegates so `session-shell` is untouched, and drops 1,230 lines.
- Add `test/integrations/pi/engine/workflow-runner.test.ts` covering admission and cancellation, per-command failure wording, clipboard acknowledgment, session workflows, model cycling, login completion, and the contexts reader.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: slash-command workflows and their selector contexts are adapter-owned components with explicit ports, testable without the engine.

## Impact

`adapter.ts` goes from 3,137 to 1,907 lines; the runner is 689, the contexts 343, the support 387. No behavior changes: the engine, session-shell, owned-UI, and composition suites pass unchanged, and the moved code differs only in how it names its collaborators. An unused private `#sessionOptions` helper is dropped with the move. The startup graph baseline moves to the exact new totals (143 files, 1,400,205 bytes) for the three new modules' headers and ports.
