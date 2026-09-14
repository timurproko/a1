## Why

Development publication run `34022380161` proved that host-independent guardian executability repaired Linux, but the exact package still cannot start on macOS: every packaged session-resume case times out because the detached supervisor never publishes endpoint metadata. The current implementation suppresses the supervisor's pre-listen failure, marks the Darwin guardian artifact `unsupported`, and rejects Darwin process inspection, while preview publication requires the macOS exact-package lane to pass; consequently `npm run develop` cannot publish any new preview.

## What Changes

- Make detached supervisor startup report a bounded, durable, sanitized success or failure result so bootstrap and CI expose the actual pre-listen defect instead of an undifferentiated eight-second timeout.
- Repair the macOS supervisor startup failure identified by that evidence without weakening immutable-release, endpoint-identity, or ownership checks.
- Add certified Darwin launch-instance containment and process start identity to the native guardian contract, including process-group cleanup and terminal foreground restoration equivalent to the supported Linux behavior.
- Mark the Darwin guardian artifact supported only after native and packaged integration evidence proves its identity, containment, parent-loss cleanup, and terminal behavior.
- Gate pull requests and exact-package publication with macOS supervisor-startup and packaged public-chain coverage, then require a fresh `npm run develop` candidate to pass all platform lanes and publish to npm `next`.
- Keep Windows and Linux containment semantics, pack-once publication, package integrity/provenance, release immutability, and the final fail-closed publisher gate unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-supervision`: Require bounded supervisor startup outcomes and certified Darwin launch-instance containment rather than silent startup timeouts or an unsupported platform artifact.
- `continuous-integration`: Require macOS pull-request and exact-package evidence to exercise supervisor startup, native containment, and the packaged public launch chain before publication.

## Impact

- Affected native/runtime areas: `native/process-guardian`, process artifact verification and platform inspection, launch-instance containment, supervisor startup/bootstrap coordination, and bounded diagnostics.
- Affected validation: native guardian integration tests, packaged session-resume tests, validation-tier policy, and release evidence on `macos-15`/Node 24.
- No command syntax, session format, package identity, update channel, npm authority, dependency, or registry behavior changes.
- Preview `0.1.8-dev.254` remains unpublished; acceptance requires a new immutable preview derived from a later merged corrective pull request.
