## 1. Add session lifecycle snapshot and graceful-exit operations to the integration protocol

- [x] 1.1 Extend `protocol.ts` with `session.lifecycle` and `session.exit`: session-target-only parsing, exact-field rejection, `lifecycle: true` in capabilities, and response assertions for the snapshot shape, `status: "admitted"`, and the stable blocker error codes.
- [x] 1.2 Route both operations through `service.ts` and the `a1 api` process boundary unchanged in shape, with help text and error-code lists updated.
- [x] 1.3 Write protocol/service/CLI tests for parsing, rejection of extra fields and profile scope, capability additivity, and response validation of success and each refusal code.

## 2. Admit graceful exit in the owning runtime through the ordinary quit path

- [x] 2.1 Add `OwnedUiSessionLifecyclePort` (readiness snapshot and exit admission with named blockers) to the owned-UI contracts and `queuedWorkflowCount()` to the workflow port, implemented by the Pi engine adapter without altering `clearQueuedWorkflows()`.
- [x] 2.2 Implement the port in `SessionShell` from lifecycle, editor text, waiting submissions, queued input and overlays; admission marks the shell, schedules `shutdown()` on the next macrotask through the shell scheduler, and later requests report `session-stopping`.
- [x] 2.3 Bind a late-bound lifecycle provider into `startIntegrationControl` and `createRuntimeApis`, handling the lifecycle operations inside the serialized handler with no await between readiness and admission, and `session-unavailable` before the shell exists or after disposal.
- [x] 2.4 Write shell, composition and session-control fixture tests for each blocker, atomic admission under concurrent requests, acknowledgement written before teardown, single admission, disposed/absent shell, and unchanged settings operations.

## 3. Document the exit contract for supervisors

- [x] 3.1 Update `docs/features/integration-api.md` and README with the two operations, snapshot fields, blocker codes, admitted-not-exited acknowledgement semantics, lost-acknowledgement guidance and the Core-label consumer flow.
- [x] 3.2 Reconcile the design's open questions and any explicit implementation gaps in the maintained documentation.
