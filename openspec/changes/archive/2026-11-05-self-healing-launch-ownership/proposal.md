## Why

After an agent asked the user to terminate Node processes for filesystem operations, an ordinary `a1` launch failed with an internal uncertain-ownership message. Abruptly terminating processes must not leave routine startup dependent on user PID discovery, state deletion, or machine restart. Recovery must preserve surviving sessions and unrelated processes rather than merely remove the safety check.

## What Changes

- Record and inspect native supervisor process-generation identity, distinguish a dead or replaced owner from an unresponsive live one, and reconcile stale endpoint metadata safely, including supported legacy records.
- Give ordinary bootstrap and retained-release startup one bounded recovery path: retry transient identity probes, retire proven-stale records, converge on one verified replacement supervisor, and continue the original launch silently.
- Preserve surviving instances, session data, release certification, and exact ownership boundaries; genuine unresolved failures receive a short actionable message while technical evidence stays in bounded diagnostics.
- Add isolated regressions for killed supervisors, guardians, resident roles, all fixture-owned Node processes, PID reuse, transient probes, concurrent recovery, legacy metadata, and unsafe recovery refusal. Never kill machine-wide Node processes in tests.

## Capabilities

### Modified Capabilities
- `agent-supervision`: native-generation-aware endpoint reconciliation and bounded automatic recovery after forced termination.
- `launch-instance-lifecycle`: a later launch remains usable after process loss without user-managed control-state repair.

## Impact

- Release endpoint observation, bootstrap/ensure-supervisor paths, cleanup identity checks, and supervisor metadata publication.
- Native process inspection adapters and lifecycle reconciliation where needed by the recovery contract.
- Focused release, supervision, and isolated lifecycle tests; no installer changes, session-format changes, blanket process termination, or manual-recovery command as the normal solution.
