## Status

**Postponed on 2026-09-06.** The maintainer chose to retain the simpler cancellation shielding and detached recovery guardian from `preserve-launcher-on-update-cancel`. Draft implementation PR #274 was closed without merge; no stable-launcher implementation is present on `develop`. Resume this change only if reboot-safe launcher availability or isolation from arbitrary global-package corruption becomes a firm requirement.

## Why

The current `a1` command is generated from the same globally installed package that self-update replaces, so npm can remove the user's only recovery entry point during package mutation. The recovery guardian makes ordinary cancellation safe, but a separately stable launcher is required for the stronger UX guarantee that `a1` remains callable across core-package corruption, process loss, and reboot.

## What Changes

- Turn the public `@timurproko/a1` package into a small, dependency-light launcher that exclusively owns `a1`, `a1.cmd`, and `a1.ps1` and changes only through an explicit launcher-upgrade transaction.
- Publish application/runtime payloads under a private-to-the-product runtime package identity, initially `@timurproko/a1-runtime`, with no public executable.
- Make the stable launcher select, validate, start, update, recover, and roll back immutable runtime releases without replacing its own package during an ordinary A1 update.
- Preserve the existing user commands, profiles, sessions, version presentation, stable/development channels, and npm installation command for the public launcher.
- Add a one-time migration from the current combined package, using the accepted cancellation-safe updater so existing users retain a callable command throughout migration.
- Define independent compatibility and update policy for the launcher, including explicit diagnostics when the launcher is too old for a selected runtime.
- Add exact-package install, migration, update, cancellation, corruption, reboot-equivalent, rollback, uninstall, and publication gates across Windows, Linux, and macOS.
- **BREAKING**: Internal publication and package identity split into a public launcher package and a non-command runtime package; internal tooling and registry automation must consume both artifacts.

## Capabilities

### New Capabilities

- `stable-launcher`: Defines ownership, compatibility, recovery, migration, and lifecycle behavior for the permanent public A1 launcher.

### Modified Capabilities

- `a1-shell`: Require every public invocation to enter through the stable launcher while preserving the existing command surface and version UX.
- `cli-self-update`: Change ordinary self-update from replacement of the public command package to replacement and activation of the independently versioned runtime package.
- `agent-supervision`: Bind immutable release and supervisor selection to launcher/runtime protocol compatibility without weakening cohort isolation or rollback.
- `isolated-regression-testing`: Require two-package exact-package, migration, launcher-continuity, and reboot-equivalent recovery evidence on supported platforms.

## Impact

- Introduces a second npm artifact and corresponding package metadata, provenance, registry tags, publishing permissions, and release evidence.
- Affects the public CLI bootstrap, update transaction, immutable release store, supervisor startup, package identity governance, installation/uninstallation behavior, CI release workflows, and documentation.
- Keeps `npm install --global @timurproko/a1` and the `a1` command stable for users; the runtime package is an implementation detail and exposes no bin.
- Requires coordinated migration and rollback support for combined-package releases until every supported rollback cohort can be launched by the stable launcher.
