## 1. Update Orchestration

- [x] 1.1 Add exact, non-deprecated `cross-spawn`, `semver`, and type dependencies, then implement an updater that reads the running package version, resolves and compares npm's `latest` version, verifies the canonical global npm package root, skips an already-current installation, and globally installs an exact newer target using Pi's cross-platform process strategy.
- [x] 1.2 Handle global-install mismatch, lookup, malformed-version, spawn, and installation failures with streamed npm diagnostics, an exact manual fallback command, actionable AddOne messages, and unsuccessful exit status.

## 2. CLI Dispatch and Isolation

- [x] 2.1 Dispatch the exact `update` subcommand from the shared `addone`/`a1` entry point before importing or starting supervisor, UI, PTY, or agent runtime code.
- [x] 2.2 Add hermetic unit and CLI-level tests for both aliases, managed and unmanaged installs, older/current/newer versions, exact npm arguments, all failure classes, and proof that update does not load native runtime modules, start the interactive runtime, or contact the real registry.

## 3. Documentation and Release Validation

- [x] 3.1 Document `addone update` and `a1 update`, global npm semantics, network and permission requirements, running-supervisor behavior, and explicit-version rollback.
- [x] 3.2 Bump the patch release and run typecheck, architecture, deprecation, audit, package, publish-dry-run, and walking-skeleton validation.
