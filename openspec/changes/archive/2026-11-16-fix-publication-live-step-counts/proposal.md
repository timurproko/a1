## Why

Publication jobs currently show no step counter while running and reveal only the final total after completion. The step parser rejects the entire list if any future step uses GitHub's `pending` status, so ordinary live payloads lose their counters.

## What Changes

- Recognize pending workflow steps as not yet started, alongside queued steps, without suppressing otherwise usable live counters.
- Preserve counter refreshes as running jobs advance, independent job rows, append-only fallback, and final outcome reporting.
- Add realistic pending-step payload regressions for live progress and terminal rendering.

## Capabilities

### Modified Capabilities

- `continuous-integration`: show live publication counters when future workflow steps are pending.

## Impact

Limited to the publication observer, focused publication-client tests, and the workflow-step progress specification. No polling, workflows, validation gates, registry writes, or stable watcher changes.
