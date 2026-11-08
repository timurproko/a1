# Design

## Context

Self-update already has the right production shape: preflight before anything changes, an approved recovery release before npm touches the package, protected replacement with a recovery capsule, activation, maintenance, and rollback on failure. Its test seams grew one option at a time, and each new option was also used as a signal for which path to take. This change keeps the shape and makes the seams honest.

## Decisions

- **The installer is a port of whole steps.**
  - `UpdateInstaller` has `preflight`, `protectPriorRelease`, `replacePackage`, `rollback` and `maintenance`.
  - `createProtectedUpdateInstaller(paths, environment)` builds the production steps from the existing functions: `resolveNpmCli`, recovery-release materialization and approval, `runProtectedPackageReplacement`, `rollbackPriorRelease` and `scheduleReleaseCleanup`.
  - A test that needs one step different overrides that step on a fake; it never changes which steps run.
- **`protectPriorRelease` returns the prior release it protects.** The update passes that record to `replacePackage`. The invented zero-digest record moves into the test fake.
- **`runner` and `lifecycle` keep their roles.** `runner` answers the registry and `npm root -g` queries, and `lifecycle` verifies ownership and activates. Neither changes the install path, the maintenance step or the rollback.
- **The fake installer reproduces today's test evidence.**
  - Its `replacePackage` runs `npm install` with the update's arguments through the harness runner and maps the exit code to the replacement outcome.
  - So existing assertions on npm invocations and exit codes keep their meaning.
- **The split follows the transaction.**
  - Before the lease: running version, target, managed installation.
  - Inside the lease: the transaction steps up to package installation, then activation and completion, then failure handling.

## Risks

- **A production step could change order.** Mitigation: the production installer calls the existing functions in the existing order, and the protected-replacement and recovery tests run against it.
- **Tests could lose coverage of a failure mode.** Mitigation: every test that injected `packageReplacement`, `npmCliResolver` or `maintenance` keeps its scenario through the matching installer step.
