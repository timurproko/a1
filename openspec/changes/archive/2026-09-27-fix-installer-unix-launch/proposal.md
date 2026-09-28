## Why

Development publication run [36324893276](https://github.com/timurproko/a1/actions/runs/36324893276) rejected the first `@timurproko/a1-install` candidate on Linux and macOS while the same exact tarball passed on Windows. npm exposes an installed Unix bin as a symlink, but the installer currently compares the unresolved launcher path with its module URL, decides it was imported instead of executed, and exits successfully without printing its help contract.

## What Changes

- Recognize direct installer execution through npm-generated Unix symlinks as well as direct paths and Windows command shims by comparing canonical filesystem identities.
- Preserve side-effect-free module imports so unit tests and other consumers can import installer helpers without running installation.
- Add focused regression coverage that invokes the executable through package-manager-shaped indirection and proves the exact help bytes, status, and empty stderr contract.
- Keep the existing exact-tarball release validator and native Windows/Linux/macOS publication lanes strict; do not publish or bless the rejected candidate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `silent-installer`: The installed `a1-install` executable starts through npm's platform launcher forms, including a Unix symlink, while ordinary module import remains inert.

## Impact

- Likely implementation surface: `packages/a1-install/bin/a1-install.js` and `test/foundation/release/installer-bootstrap.test.ts`.
- Exact package validation continues through `scripts/release/validate-installer-package.mjs` without weakening its help-output assertion.
- No package name, command syntax, installer transcript, application installation behavior, dependency, release channel, or npm authentication change is planned.
- After implementation is accepted and merged, a new numbered development candidate must pass all native release lanes before any manual bootstrap publication.
