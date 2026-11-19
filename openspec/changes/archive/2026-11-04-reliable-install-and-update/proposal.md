## Why

Installing, updating, and launching A1 currently fails in ways a user cannot reasonably fix. On macOS the resident host records `kern.boottime` seconds and microseconds as its boot identity, but the kernel adjusts that value within one boot when the clock is corrected, so a long-running host soon looks like it "belongs to another boot or login". From then on every update stays blocked with `Resident control compatibility could not be verified`, and every launch fails with `server closed attach handshake`. Neither clears on its own. The native reason is discarded, so the user sees only a generic line. The only workarounds are killing processes by hand, picking an installer dist-tag, or understanding release channels. A plain `a1 update` from a development build silently downgrades to stable, the bare installer cannot run on Node 26 until a stable release ships, and there is no way to remove A1 from a machine.

## What Changes

- Require every platform (Windows, Linux, macOS) to use a kernel per-boot identifier, never a clock value, and compare boot identities everywhere through one shared matching rule. macOS moves from `kern.boottime` to `kern.bootsessionuuid`. A legacy clock-derived record matches the current boot when its seconds lie within a small tolerance of the current boot time, so hosts that are already running reconnect after an update without a restart.
- Remove the other exact-match identity comparisons that can drift during the continuity and workspace checks. A single unreadable source that is provably not running a live Agent no longer blocks the whole check.
- When the continuity check fails, a launch still attaches to a healthy resident host of its own release instead of ending in a closed handshake.
- An update whose activation must wait for a live source succeeds quietly and activates automatically once that source can be controlled. It is not reported as a failure.
- Routine install, update, and deferred-activation outcomes print only their result. Diagnostics are shown only for failures the user must act on, as one reason and one next step; full native and child diagnostics go to a log file whose path is printed only then.
- Make the launch exit watcher treat an already-restored terminal foreground group as success and always deliver the armed exit notice.
- Make `a1 update` stay on the running channel. Add `a1 update --release` to move to stable explicitly; `--develop` keeps moving to development.
- Make the installer hand `--develop` off to the development installer, map the bare installer onto `--release` for an existing installation, and treat an installation already at or above the selected release as success.
- Add `a1 uninstall` without a source: it stops A1's resident processes, removes the global package, launchers, releases, runtime, and caches, and removes sessions and settings only after separate confirmation or with `--purge`.

## Capabilities

### New Capabilities

- `cli-uninstall`: one command that removes A1 from the machine.

### Modified Capabilities

- `resident-terminal-host`: drift-free boot identity on all platforms through one shared matching rule, with tolerance for legacy records.
- `cli-self-update`: channel-sticky `a1 update`, `--release`, quiet routine outcomes, and deferred activation reported as success.
- `silent-installer`: development installer handoff, bare installer mapped to the stable channel, at-or-above treated as success, and quiet failures with a log path.
- `extension-packages`: `a1 uninstall` without a source no longer reports a missing package source.
- `launch-instance-lifecycle`: the exit watcher tolerates a restored foreground group and still delivers its notice. Launch falls back to attaching to its own release's host.

## Impact

- Native: `native/terminal-host/src/identity.rs`, `roles/source_route.rs`, `workspace.rs`, and `native/process-guardian/src/{darwin,linux}.rs`.
- TypeScript: `src/foundation/resident-tabs/{continuity,bounded-host-command}.ts`, `src/foundation/release/{update,update-activation,bootstrap,automatic-update}.ts`, `src/foundation/launch-guardian/exit-watcher.ts`, `src/cli/dispatch.ts`, and a new uninstall module.
- Installer: `packages/a1-install/bin/a1-install.js`.
- Tests under `test/foundation/release`, `test/foundation/resident-tabs`, native host tests, and CLI dispatch tests.
- Publishing a stable 0.2.7 so `latest` carries the Node fix is a release operation outside this change.
