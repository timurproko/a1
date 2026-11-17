# Bootstrap publication-command dependencies

## Why

A checkout with missing or incomplete dependencies cannot start `npm run develop` or `npm run release`: their static import chains load `semver` before any prerequisite check can run. Pulling the same Git source on another machine does not synchronize its installed dependency tree. These explicitly invoked maintainer commands should repair checkout dependencies automatically rather than fail with an unhandled module-resolution stack trace.

## What Changes

- Add a Node-builtins-only dependency inspection/repair boundary that works before `node_modules` exists and uses the repository manifest and lockfile as the sole dependency authority.
- Reuse or extract the existing dependency inspection used by the environment doctor instead of maintaining conflicting readiness rules. Include launch-critical entry resolution and dependency-tree checks so existing-but-incomplete installations do not count as ready merely because a package directory exists.
- When repair is needed, explain the cause, run the locked `npm ci` installation in the owning checkout, recheck readiness, and continue the original command once. Healthy installations do not reinstall.
- Serialize automatic repairs within a checkout, preserve arguments, cancellation and exit behavior, and stop before publication on any setup failure.
- Put the bootstrap before dependency-bearing imports in both public commands, preserving their publication authority, stable-release target parsing, existing injectable test boundaries and human approval gates.

## Capabilities

### Modified Capabilities
- `continuous-integration`: develop/release command startup repairs missing or incomplete local dependencies before entering publication logic.

## Impact

Development prerequisite helpers, the develop/release entry boundaries, focused repository-governance fixtures and maintainer documentation may change. Package-script wiring changes only if needed to keep a clean public entry; package versions, dependency declarations and lockfile pins do not change.

This change does not auto-install system tools, alter Node/npm versions, change authentication, modify application runtime dependencies outside the selected checkout, relax CI/publication rules or authorize a real publication during testing. This is a planning-only draft until approved implementation is requested.
