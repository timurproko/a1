# Explain hosted-runner allocation failures

## Why

Development publication run 44121478298 passed Windows and Linux validation, but GitHub cancelled the macOS job without running any steps because it could not acquire a hosted runner. The local summary incorrectly recommended fixing a failure instead of retrying an infrastructure allocation failure.

## What Changes

- Recognize GitHub's explicit hosted-runner acquisition failure only when the affected producer job has an explicitly empty step list and no conflicting failure annotations.
- Explain that those jobs never started and recommend a manual retry rather than a code fix when all primary failures have that cause.
- Retain existing fix-and-inspect guidance for actual, mixed, unknown, unreadable, or incompletely inspected failures, together with all diagnostic bounds, staging-state warnings and nonzero outcomes.

## Capabilities

### Modified Capabilities
- `continuous-integration`: publication failure summaries distinguish confirmed runner-allocation infrastructure failures from validation failures.

## Impact

Only the shared publication-client error formatter and focused repository-governance tests change. Workflows, runner selection, required validation, dispatch, publication and promotion authority remain unchanged. No automatic retry or real publication is part of this delivery.
