# Native fixture validation

## Normal automatic CI

Development, Full regression and publication run native builds and fixtures directly on their normal GitHub-hosted runners. The agent-added sandbox, restricted OS accounts, network provisioning, fixture receipts, feature/runtime permission checks and additional security gates have been removed.

The existing required suites remain required: terminal-host partitions, release isolation, resident chaos, exact-package published-predecessor continuity, terminal fidelity/latency certificates and bounded decoder fuzzing. Their platform coverage and product assertions are unchanged. Production publication protection is unchanged.

When implementation outcomes are complete, trusted readiness/finalization publishes the exact candidate head and normal PR validation starts automatically. A repair push triggers the same flow for its new head. No fixture approval, deployment review, manual dispatch or workflow restart is required. Failed, missing or cancelled required results block integration; the maintainer chooses when to merge after required checks pass.

## Optional local checks

`npm run check:local` runs typechecking, architecture/identity/naming checks and non-native workflow regression tests. It does not build native artifacts or launch application/fixture processes. It is a convenience command, not an execution permission system or a prerequisite for CI advancement.

The previous Defender report is unresolved historical evidence, not a passing security verdict. This workflow rollback changes no workstation protection setting or quarantined file.

## macOS custody

The macOS predecessor custody repair remains independent of CI provisioning. `getaudit_addr` supplies kernel audit user/session IDs; `audit_session_self()` returns only a process-local Mach port name.

For immutable predecessors using the older metadata, the explicit source route still requires unchanged boot, exact native PID/start identity, source credentials/epoch and a connected kernel `LOCAL_PEERTOKEN` matching PID, real/effective UID and current audit user/session. Incomparable metadata is retained, not treated as proof of login equality or termination. Generic cross-release admission is unchanged.

Static/workflow tests are not native platform execution evidence. Required exact-head native results remain the CI authority.
