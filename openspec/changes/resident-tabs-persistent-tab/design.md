# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 2 builds and how it is proven. Decision numbers below refer to that file.

## Context

After milestone 1, `native/terminal-host` has a `platform` layer (process and boot identity, owner-only endpoints, fixed-role detached launch, the session-writer lock, durable atomic replacement), a frozen protocol generation 1, and a sans-IO `core` with the controller-transfer barrier. Its only runnable product is still the 2×2 proof (`--run`, `src/main.rs`, `src/workspace.rs`), which runs inside the user's terminal and dies with it.

On the Node side, `bin/cli.js` calls `runBootstrap()` in `src/foundation/release/bootstrap.ts`. The bootstrap calls `ensureSupervisor()`, then spawns `bin/guardian.js`, which runs `runLaunchGuardian()` (`src/foundation/launch-guardian/main.ts`). The guardian spawns `bin/ui.js` inside native process-guardian containment. The bootstrap is also the surviving owner that restores the terminal after an abnormal UI exit (`restoreAfterOwnedExit()` in `src/foundation/terminal-cleanup/terminal-reset.ts`, #667). `bin/ui.js` already sets a fresh `A1_SESSION_RUNTIME_ID` for every `a1`-profile process.

## Goals / Non-Goals

**Goals:**

- One full A1 text UI runs as a resident tab on Windows x64, macOS, and Linux, survives terminal and client closure, keeps absorbing output while detached, and reattaches from its retained surface.
- Node never touches tab terminal bytes (Decision 1, Decision 2).
- The opt-in is explicit, and every unverifiable case falls back to today's direct path with one notice (Decision 4, Decision 15).
- A killed attach client never leaves the parent shell in raw mode or with enhanced reporting enabled.

**Non-Goals:**

- More than one tab, server replacement while attached, holder or child hang detection, slow-client and blocked-writer evidence, epoch fencing tests, and wiring the session-writer lock into every launch mode (milestone 3).
- Crash restart, the prompt journal, drafts, registry history and quarantine, and last-screen recovery (milestone 4).
- The full strip, shortcuts other than double `Ctrl+C`, mouse on the strip, tab commands, naming, needs-input and done-unseen status, two attached clients, prewarm, and idle suspension (milestone 5).
- Packaging the terminal host in releases, release retention, maintenance commands, resource caps, and certification (milestone 6).
- `a1 pi` and `a1 --session` are unchanged in this milestone.

## Decisions

### 1. One binary, three roles, one tab

`a1-terminal-host` gains three subcommands, each a thin I/O shell around milestone 1's `core`:

- `server --detach --profile <canonical-root>`: owns the endpoint, the registry, the single tab record, the attach session, and fan-out (Decision 2). It holds no PTY and runs no A1 code.
- `holder --tab <tabId> --incarnation <n>`: started by the server through the fixed-role launch. It owns one PTY (ConPTY on Windows), the tab child, one `GhosttyTerminal` model with bounded scrollback, input encoding, and damage tracking.
- `attach`: runs in the launch instance and owns the outer terminal.

New modules: `src/roles/server.rs`, `src/roles/holder.rs`, `src/roles/attach.rs`, and `src/roles/registry.rs`. `ghostty.rs` and the damage-aware composer from `workspace.rs` move under the holder and attach roles. `--run`, `--probe-2x2`, `--topology-2x2`, and the fixed-layout code in `workspace.rs` are removed. `--probe`, `--probe-scroll`, `--probe-selection`, and `--probe-input` stay as non-interactive tests of the retained model and encoders. The historical spike evidence is not edited; `docs/architecture/terminal-host-proof-gate.md` gains a note that the 2×2 gate applies to split panes, and that the single-pane resident path is certified by this roadmap instead.

Keeping the 2×2 mode as a second interactive entry point was rejected: it would keep a second terminal surface that no product path uses and that CI would still have to build.

### 2. Server start and discovery

`ensureTerminalHost()` (new, `src/foundation/resident-tabs/ensure-terminal-host.ts`) runs in the bootstrap after `ensureSupervisor()` and before the guardian, only for bare `a1` with no session selection, `residentTabs` on, and a supported platform. It:

1. resolves the artifact as `dist/native/<platform>-<arch>/a1-terminal-host[.exe]` under the release root, or the hermetic override `A1_TERMINAL_HOST_PATH`, and verifies it as `resolveProcessGuardianPath()` does for the process-guardian;
2. probes the endpoint (Decision 3 naming, `A1_TABS_ENDPOINT` override) with a real generation-1 handshake;
3. if nothing answers, runs `a1-terminal-host server --detach`, which uses milestone 1's fixed-role launch, and waits up to 8 s for a handshake that reports a verified detachment mode.

A starting server acquires the registry-writer lease before it binds the endpoint. If the lease is free, it increments the durable epoch and serves. If another live server answers the probe, the starter exits as `already-running` and the caller attaches to the winner. If the endpoint does not answer but the lease is held, milestone 2 does not terminate the recorded owner; it reports `blocked`, and the bootstrap falls back. Verified termination of a live unresponsive owner is milestone 3.

The server exits 10 minutes after it has no running tab and no attached client (Decision 12).

### 3. Launch routing and fallback

`runBootstrap()` reads `residentTabs` from the profile-local A1 settings document with a pure reader added to `src/ui/settings/resolution.ts`, so no UI module loads before routing. Outcomes:

- **resident-ready**: the guardian is told to run the attach client. `runLaunchGuardian()` gains a root-command option, so `containment.spawn()` starts the attach executable with `attach --endpoint <e> --cwd <launch cwd>` instead of `process.execPath bin/ui.js`. The attach client is the launch instance's root; ordinary containment applies.
- **fallback**: the reason (artifact missing, unsupported platform, launch not verified, recovery blocked, incompatible generation, registry unreadable) is passed to `bin/ui.js` through a new launch-context value. The direct owned UI shows it once as a prompt-adjacent startup notice: `Resident tabs unavailable (<reason>); running a single agent.` Existing resident records are left intact.
- **setting off**: today's path, with no probe and no host start.

Failing the launch when the host cannot start was rejected (Decision 15).

### 4. Detached start per platform

All resident starts go through milestone 1's `launch_resident(role, profile)`; this milestone adds no new escape path. Holders are started by the server through the same routine. Before reporting readiness, the server reports the observed mode:

- Windows: detached, console-free creation outside the caller's job; WMI `Win32_Process.Create` when the caller's job denies breakaway (Windows OpenSSH, some IDE terminals). Each holder places its tab child in its own kill-on-close job, so the tab tree ends with the holder.
- macOS: `setsid`, no controlling terminal, `/dev/null` streams, and the caller's per-user bootstrap namespace.
- Linux: `setsid`, no controlling terminal, `/dev/null` streams. Each holder starts its child in a new process group. Logout under `KillUserProcesses` ends tabs; that is documented, not a failure.

### 5. Holder data path and bounded I/O

The holder reads its PTY on a dedicated thread at all times and feeds the model, whether or not a client views the tab, so the child never blocks on output (Decision 5). Child queries (DA, CPR, DSR) are answered by the holder's model. Input goes through a dedicated writer thread with a bounded queue of 4 MiB. A paste is admitted only if the whole paste fits; otherwise it is rejected with a visible notice in the strip and no prefix is delivered. After admission, bytes are written in order and never dropped silently. Frame and input caps are milestone 1's (2 MiB per frame, 1 MiB per input message); a larger paste is split into ordered input messages after admission.

The server forwards surface patches from the holder to the attached client through a single-slot render lane: a newer patch set replaces an unsent one, and the client receives a full surface once it drains. The server never blocks the holder on the client. Milestone 3 proves this under a suspended client; milestone 2 relies on it only so that a slow client cannot stall the tab.

### 6. Tab mode in the A1 child

The holder starts `node <releaseRoot>/bin/ui.js --tab` with the client's launch cwd and an environment taken from the client's `tab.create`. The server removes launch-instance values from that environment before passing it to the holder: the guardian and instance identifiers, exit-notice and ready paths, the startup trace, and `A1_SESSION_RUNTIME_ID`. `bin/ui.js` then sets a fresh `A1_SESSION_RUNTIME_ID` as it already does, so every tab process, and every later incarnation, has its own launch runtime id and its own worktree claims (#736).

In `bin/ui.js`, `--tab` is parsed before any A1 or Pi module that can load extensions. The entry reads `A1_TAB_ID`, `A1_TAB_TOKEN`, and `A1_TAB_ENDPOINT` into a private object, deletes them from `process.env`, and passes the object to the composition. The bridge client never writes them back. These names are added to `src/product-identity.json`.

Tab mode then changes three things only (Decision 1):

- the bridge client starts (Decision 7 below);
- the quit outro (`src/app/session-shell/quit-outro.ts`) and the outer startup intro are not shown, because the attach client owns the outer surface;
- `SessionShell.shutdown()` routes `/quit`, the clear/exit chord, and empty-editor `Ctrl+D` to a bridge detach request and does not stop the session.

A tab child that is told the bridge is unavailable shows `Press Ctrl+C twice to leave; this agent keeps running.` and keeps running.

### 7. Minimal bridge

The bridge client (new, `src/foundation/resident-tabs/bridge-client.ts`) connects with `net.connect` to the server endpoint and speaks the generation-1 bridge messages using a small TypeScript codec checked against milestone 1's frozen fixtures. It carries metadata only, never terminal bytes, prompt text, or input:

- `hello` with the derived bridge credential, pid, and native start identity;
- `bridge.status{seq, state}` with `starting`, `working`, or `idle`, from `agent_start`, `turn_start`, tool execution, compaction, and settled idle in `src/composition/owned-ui.ts`;
- `bridge.session{file, name}` whenever the session file or name changes;
- `bridge.request{action: "detach", clientId, controllerRevision}`.

In milestone 2 there is one attached client at a time, so the controller revision is the server's attachment revision, sent to the child whenever a client attaches or detaches. The child captures the revision when a quit command is admitted, not when it executes. The server honors the request only if that client is still attached under that revision. If generation 1 lacks a server-to-child attachment notice, it is added as an optional message, which the generation rules allow. Needs-input, visibility, rename, prompt metadata, and the input-ordering barrier are milestone 5.

The server reports readiness to the attach client when both `holder.ready` and the bridge's first `bridge.session` have arrived, or after 10 s with `holder.ready` alone; a tab whose bridge never connects shows process-level status only.

### 8. Minimal registry and credentials

The registry is `<dataDir>/tabs/<profile-token>/registry.json` (Decision 8). Milestone 2 writes these fields: `tabId`, `kind` (`a1`), `createdAt`, `displayName` (`agent`), `nameSource` (`default`), `order`, `cwd`, `sessionFile`, `sessionDir`, `desired`, `lifecycle`, `incarnation`, `holderPid`, `holderStartIdentity`, `release`, `lastExit`, `registryRevision`, `epoch`, and `bootId`. Every mutation rechecks the writer lease and epoch, then commits with milestone 1's durable atomic replacement before it is acknowledged.

As an interim, unspecified safety behavior, a server that cannot read the registry refuses to start and leaves the file untouched, and bare `a1` falls back with reason `registry unreadable`. The specified corruption behavior (quarantine, history generations, blocked recovery) and its scenarios are milestone 4; this milestone's registry requirement covers only the lease, the epoch, and the atomic commit.

Credentials (Decision 3):

- the client token is 32 random bytes in an owner-only file beside the registry;
- the profile secret is 32 random bytes in a separate owner-only file;
- holder and bridge credentials are `HMAC-SHA256(secret, role ‖ tabId ‖ incarnation)`, independent of the epoch, so a later server reproduces them without storing them.

At server start, a recorded holder is adopted only if its pid and native start identity verify, it presents the derived credential, and its boot identity matches. Anything else is treated as a dead holder and is never signalled. A changed boot identity moves the tab record to `lifecycle: ended`, and the next launch creates a fresh tab (Decision 9).

### 9. Tab end in this milestone

There is no crash restart yet. When the child exits, the holder reports `holder.exit{code, signal}`, keeps the last screen frozen for the attached client, and exits. The server records `lifecycle: ended`. An attached client shows `agent exited` in the strip, waits for a key, restores the terminal, and exits with the ordinary resume hint. The next bare `a1` creates a new tab in its launch cwd. The ended session stays resumable through the normal picker.

### 10. Attach client and the outer terminal

At start, the attach client saves the outer terminal state, then enables raw mode, the alternate screen, bracketed paste, focus events, SGR mouse, and synchronized output. It enables the kitty keyboard protocol only when a bounded query (200 ms) confirms support. It records exactly what it enabled.

- **Strip.** Row 0 shows one chip: the status glyph (`starting` dim progress, `working` progress frames, `idle` none, `ended` `✗`) and the name `agent`. The tab PTY is `cols × (rows − 1)`, and mouse rows are offset by one. The full strip is milestone 5.
- **Detach.** The client forwards the first `Ctrl+C` to the tab encoded for the child's modes. A second `Ctrl+C` within 500 ms (the clear/exit interval in `src/app/session-shell/session-shell.ts`, extracted to a shared constant and passed to the attach client at launch) is consumed as a detach request and not forwarded. Detection covers legacy `0x03`, kitty-encoded `Ctrl+C`, and Windows console key events.
- **Restoration.** On detach or a handled error, the client resets every mode it enabled, leaves the alternate screen, and prints a dim `1 tab still running · run a1 to return`.
- **Second terminal.** While one client is attached, the server refuses another attach with `a1 is attached in another terminal`. The refused launch exits without starting a direct session. Two clients are milestone 5.

### 11. Surviving-owner restoration for a killed attach client

An attach client killed with `SIGKILL` or `TerminateProcess` cannot run its own cleanup. The bootstrap already restores the terminal after an abnormal UI exit (#667). This milestone makes that path apply when the root is the attach client: `restoreAfterOwnedExit()` runs after the guardian reports the root's exit, writes `EMERGENCY_TERMINAL_RESET` (which already resets kitty flags, mouse, bracketed paste, synchronized output, and the alternate screen), and restores cooked input through the bootstrap's own TTY handle on macOS and Linux and the console input mode on Windows. The guardians gain no terminal-byte relay. The tab keeps running, because the server sees only an EOF.

## Risks / Trade-offs

- **[No user-facing way to stop the resident tab]** → Milestone 2 has no `/quit-all`, `/close`, or `a1 tabs stop`. Setting `residentTabs` back to `false` stops starting the host but leaves a running tab. Document this in the setting's description, and have milestones 5 and 6 add the commands. The preview stays off by default.
- **[Direct `a1 --session` can open the resident tab's session]** → The session-writer lock is wired into every launch mode in milestone 3. Until then, document the gap; the preview is off by default.
- **[Release garbage collection can remove the tab's release]** → Retention is milestone 6. Until then, a tab child may lose its release directory after an update; it then fails like any child exit (Decision 9 above).
- **[Adopting a surviving holder at server start overlaps milestone 3]** → Milestone 2 implements only cold start over an existing registry with verified adoption. Live replacement, termination of an unresponsive owner, epoch fencing, holder-triggered recovery, and the restart budget are milestone 3.
- **[Kitty keyboard or synchronized output support is misdetected]** → Enable them only after a positive bounded query reply; otherwise use legacy encodings. Restoration resets them unconditionally.
- **[The terminal host is not in installed releases yet]** → The opt-in falls back with `terminal host not installed` until milestone 6 packages it. Evidence uses CI artifacts and isolated workers through `A1_TERMINAL_HOST_PATH`.
- **[Physical close and SSH loss cannot be tested hermetically]** → CI kills the launching tree and sends `SIGHUP`; physical terminal close and SSH loss are recorded manually or on an isolated worker per platform, never automated on an active workstation.
