## Why

The trusted documentation auto-merge workflow now fails before classifying any pull request because its dependency-free policy runner imports `semver` without installing repository dependencies. This leaves an unrelated failed check on every pull request and disables documentation and release-reopening reconciliation.

## What Changes

- Remove the external runtime dependency from release-reopening patch-successor validation.
- Retain strict release-reopening eligibility and fail-closed behavior.
- Add regression coverage for dependency-free trusted policy loading.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This repairs the implementation of existing documentation auto-merge and verified release-reopening requirements without changing their behavior.

## Impact

Affected code is limited to trusted repository-governance policy and focused tests. No product API, package dependency, or user-facing behavior changes.
