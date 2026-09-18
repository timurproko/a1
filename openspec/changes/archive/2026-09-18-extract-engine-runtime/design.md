# Design

## Services by concern, not one services object

The plan sketched a `PiEngineServices` mirroring pi's `createAgentSessionServices()`. In A1 the runtime integration already assembles Pi's services and hands them over as `runtime.services`; what the adapter added on top were readers and ports over those services (settings, resources, model authority, suggestions), each with a different port surface. Those became separate modules so each port list stays honest and each file stays small. `PiEngineRuntime` is the plan's runtime component as described: it owns the `AgentSession`, both generations, subscription, binding, and disposal order.

## The binding handshake

`PiEngineRuntime.bindSession` runs the sequence the adapter's `#bindSession` ran, split at the seams where adapter state is touched: `sessionReplacing` (cancel commands that belong to the old session, before the generation moves), then the runtime's own bookkeeping (generation, binding generation, session, queued-input integration, compaction observer), then the subscription, then `sessionReplaced` (the adapter discards obsolete delivery, resets command and run state, rereads model and thinking level, rebuilds the transcript, and rebinds the extension UI). Subscribing before the adapter rebuild is the one ordering change: the original subscribed after the rebuild but before the extension rebind, which is asynchronous and the last step of the rebuild, so an extension event emitted during its synchronous prefix now has a listener as it did before. Pi's `subscribe` does not replay, so nothing arrives between the subscription and the rebuild.

## Work states across the seam

`PiSessionEvents` keeps the work-state kind, the run flag, and both sequences, because `endWorkState` and settlement are decided from them. The lifecycle, status message, and progress are view state and stay in the adapter behind `enterWork`, `leaveWork`, and `workProgress`, whose bodies are the original transitions minus the kind bookkeeping. `enterWork` reads `lifecycle === "busy"` in the adapter rather than a mirror in the translator, so a lifecycle written elsewhere (startup, overload, disposal) keeps deciding whether a `busy` transition is emitted.

## Overload recovery

`#reconcileOverload` stays in the adapter because it rebuilds view state. It now asks the runtime to `suspend()` (unsubscribe, drop the compaction observer, advance the generation) and, when recoverable, `resume()`; the command dispatch and workflow runner cancel their own pending sets through `cancelPending`.

## Verbatim move

Method bodies move without edits beyond renaming the collaborators above; `session-runtime.ts` was written from the moved bodies rather than cut mechanically because its methods interleave with adapter state. The package-update probe keeps receiving `runtime.services.settingsManager` as before, with no new guard. `readStringArray` joins the shared readers in `message-values.ts`.
