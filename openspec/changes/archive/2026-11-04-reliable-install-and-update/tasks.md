# Tasks

## 1. Drift-free resident identity

- [x] 1.1 Report a kernel per-boot identifier on Windows, Linux, and macOS (macOS moves to `kern.bootsessionuuid`), and add one cross-platform boot-identity matching function that accepts legacy clock-derived records within a two-second tolerance.
- [x] 1.2 Replace every exact boot-identity string comparison in source routing, workspace persistence, attach, and the TypeScript continuity layer with that function on all platforms.
- [x] 1.3 Return per-source continuity verdicts so a provably dead or historical source never vetoes activation.
- [x] 1.4 Add native and TypeScript tests that run on Windows, Linux, and macOS for clock drift within one boot, legacy-record tolerance, a real reboot, and a new client attaching to a host started by an older release.

## 2. Launch and exit reliability

- [x] 2.1 Attach a launch to a healthy host of its own release when the continuity check fails, instead of ending in a closed handshake.
- [x] 2.2 Treat an already-restored foreground group as success in the exit watcher and always deliver the armed exit notice.
- [x] 2.3 Add tests for the launch fallback and for exit-watcher restoration from an orphaned process group.

## 3. Quiet, truthful outcomes

- [x] 3.1 Capture bounded host-command stderr into an update diagnostics log and remove the duplicated blocked-activation sentence.
- [x] 3.2 Report a continuity-deferred activation as a successful update and let the existing activation-only retry commit it.
- [x] 3.3 Print only a result line for routine install and update outcomes, and one reason, one next step, and a log path for actionable failures.
- [x] 3.4 Add tests for deferred activation status, quiet success output, and failure output.

## 4. Channels and installer

- [x] 4.1 Make bare `a1 update` follow the running channel and add `a1 update --release`.
- [x] 4.2 Hand installer `--develop` off to the `next` installer with a recursion guard, and map the bare installer to `a1 update --release` for existing installations.
- [x] 4.3 Treat an installation at or above the selected release as installer success.
- [x] 4.4 Add dispatch, update, and installer tests for channel stickiness, `--release`, handoff, and the at-or-above case.

## 5. Uninstall

- [x] 5.1 Implement `a1 uninstall` without a source to stop all resident namespaces and remove the package, launchers, releases, runtime, and caches.
- [x] 5.2 Remove sessions and settings only after interactive confirmation or `--purge`, and keep `a1 uninstall <source>` as package removal.
- [x] 5.3 Add uninstall tests for complete removal, kept user data, `--purge`, and package-source compatibility.
