## Context

Observed on macOS 26 (Darwin 25.6) with Node 26.13.0:

- One boot (since 2026-10-30) left four distinct `bootId` values under `~/.local/share/a1`: `macos-boot:1793386641:831874`, `…642:10483`, `…642:889229`, and the current `…642:833856`. `identity.rs` formats `kern.boottime` as `{tv_sec}:{tv_usec}`. macOS recomputes `boottime` when the wall clock is stepped, so the value drifts within one boot. This violates the existing requirement that boot identity "remains stable within one boot".
- `source_route.rs:166` compares `registry.boot_id != system.boot` exactly, so `workspace-check` exits 2 with `resident source belongs to another boot or login`. `bounded-host-command.ts:31` discards stderr, so `continuity.ts` reports only `Resident control compatibility could not be verified; the prior client remains selected.`. `update.ts:1083` appends a second sentence, which produces a doubled period.
- The same failure on launch (`bootstrap.ts` continuity, then the retained fallback) ended in `server closed attach handshake`, while `a1 tabs host status` on the same host succeeded.
- Hidden Settings, Changelog, and standby holders count as non-idle, so a superseded host never idle-exits. Its blocker therefore never clears.
- The exit watcher runs after its guardian exits, in an orphaned process group. On macOS `tcsetpgrp` then fails with `EIO` after the shell has already reclaimed the terminal. `exit-watcher.ts` throws before `deliverExitNotice`.
- `npm x -- @timurproko/a1-install --develop` runs the `latest` installer (0.2.6), because npm resolves the package before arguments reach it. Bare `a1 update` from `-dev.N` resolves `latest` and installs 0.2.6.

## Goals / Non-Goals

**Goals:** Install, update, and launch work with one command and no process handling. Resident Agents keep running and reconnect to the updated client. Output is silent unless the user must act. A user can remove A1 completely.

**Non-Goals:** Terminating or replacing a running resident host during update (the design keeps live execution behind a stable control API). Changing release publication or dist-tags. Windows boot identity (it uses a different source).

## Decisions

- **Boot identity.** On macOS, new records use `macos-boot-session:<kern.bootsessionuuid>`, which is fixed for the whole boot. Comparison is a function, not string equality: two session identities match on equality; a legacy `macos-boot:<sec>:<usec>` matches the current boot when `|sec - current_boottime_sec| <= 2`. Readers accept both forms so old hosts and new clients interoperate. Linux keeps `/proc/sys/kernel/random/boot_id`, which is already stable.
- **No single-source veto.** Continuity treats a source whose recorded owner process is provably gone as historical, as the spec already requires, and returns per-source verdicts. Only a live source that cannot be controlled blocks activation.
- **Launch never dead-ends.** If continuity fails at launch but a healthy host of the launching release answers a maintain probe, the launch attaches to it. Otherwise it falls back as it does today and reports one actionable line.
- **Deferred activation is success.** A prepared candidate blocked only by continuity exits 0 with the normal result line. The existing activation-only retry commits it later. The installer treats this state as installed.
- **Quiet output.** Each command prints one result line. Failures print `<reason>. <next step>` and, when diagnostics exist, `Details: <log path>`. Native stderr from bounded host commands is captured into the log, never printed raw.
- **Channel stickiness.** The running version's channel (`releaseChannelOf`) selects the target of bare `a1 update`. `--release` selects `latest`; `--develop` selects `next`. The installer maps bare invocation for an existing installation to `a1 update --release`, so `npm x -- @timurproko/a1-install` still means "release".
- **Installer handoff.** Before any runtime check, `--develop` re-executes `npm x -y -- @timurproko/a1-install@next` with the original arguments, inherited stdio, and a handoff environment marker that prevents recursion. Exit status propagates. An installed version at or above the resolved target on the requested channel is success.
- **Exit watcher.** `EIO` or `EPERM` from restoring the foreground group, while the terminal's foreground group already differs from the runtime group, counts as restored. Notice delivery runs in a `finally` path.
- **Uninstall.** `a1 uninstall` without a source stops every A1 resident namespace through each release's own `tabs host-stop`, ends supervisors, removes the npm global package and launchers, and deletes releases, runtime, caches, and dependency layers. Sessions and settings (`~/.a1`, `~/.config/a1`) are removed only after an explicit interactive confirmation or with `--purge`. `a1 uninstall <source>` keeps its package-removal meaning.

## Risks / Trade-offs

- A ±2 s legacy tolerance could mistake a reboot within two seconds of the previous boot time for the same boot. That is practically impossible, and the owner pid and start identity checks still apply.
- Quieter output hides details that maintainers used for triage. Mitigation: the log path appears on every real failure, and `--verbose` stays available.
- Uninstall deletes data. Mitigation: user data needs a separate confirmation or `--purge`, and only A1-owned paths are removed.

## Migration Plan

No data migration. New hosts write session-UUID boot identities. Readers accept legacy values, so hosts that are already running keep working across the update. Until stable 0.2.7 is published, the `latest` installer keeps its old behavior.
