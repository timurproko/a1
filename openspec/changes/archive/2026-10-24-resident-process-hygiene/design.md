# Design

## Context

The resident terminal host runs a detached server per profile, one detached holder per tab, and a prewarmed standby holder. `roles/holder.rs::reconnect_holder` loops forever: it runs `launch::command(["server", "--detach", "--resident-parent-holder", ...])`, waits for the outcome, tries `connect_holder`, and sleeps with a backoff capped at two seconds. `connect_holder` reports a non-`welcome` answer as "server refused holder handshake" and a closed socket as "server closed holder handshake"; the server today closes the socket on refusal, so the holder cannot tell "no record" from "server still starting". `roles/server/standby.rs::discard_standby` only offers a `shutdown` frame to a connected standby holder and never terminates a holder that is not connected. `launch::command` builds a `std::process::Command` without Windows creation flags, so a child of a console-less role gets a new visible console.

`scripts/development/stop-checkout-processes.mjs` lists processes once and kills each matching PID once. The resident roles restart each other, so a single pass does not converge, and `start-local.mjs` stops nothing when the launch ends.

## Goals / Non-Goals

**Goals:**

- A holder without a record ends; a standby ends with its server.
- No role process can show a console window on Windows.
- Stopping a checkout's processes always converges, quietly.
- A development launch leaves no resident process behind.

**Non-Goals:**

- Changing how installed resident tabs survive a detached `a1`.
- Changing the wire generation, registry document, or credentials.
- A general process manager for installed releases beyond `a1 tabs host stop`.

## Decisions

### 1. The server names its refusal, and the holder decides from the name

`serve_peer` keeps every admission check, but on an admission error it sends `wire::frame("refused", request_id, ResultBody::refused(reason))` before returning the error, for every role. `connect_holder` reads a `refused` answer and returns `Err(format!("server refused holder: {reason}"))`. `reconnect_holder` classifies the error with one pure function, `refusal_is_definitive(&str) -> bool`, that matches the exact server reasons already named in `peer_refusal_event`: no registry or standby record, rejected credential, newer epoch, incarnation, holder identity, child identity, role. A definitive refusal returns `Err` from `reconnect_holder`, which the holder main loop already propagates with `?`, so the holder exits and its Windows job (`ChildContainment`, kill-on-close) or Unix process group ends the child. Everything else (connect failure, closed handshake, timeout, inspection timeout, not-live) stays transient and keeps the loop, with the backoff cap raised from two to fifteen seconds so a server that is genuinely down is not asked for a replacement thirty times a minute.

**Alternative considered:** a retry budget for every refusal. Rejected because a registered holder whose server is down must keep asking (spec: "Server killed with no client attached"), and a budget would either be too short for that or too long for an orphan.

### 2. A standby holder never replaces its server

`HolderLaunchConfig.standby` is already carried to the holder. When `config.standby` is set, a `Disconnected` command ends the holder with `Err("standby holder lost its server")` instead of spawning the reconnect thread, and a failed first `connect_holder` does the same. A standby is in-memory state of the server that prewarmed it; no replacement server can have a record for it, and the replacement prewarms its own.

### 3. The server owns the standby holder's identity

`StandbyTab` gains `holder: Option<ProcessIdentity>`. `launch_standby` stores the verified `observation.process` identity after the identity check that already runs. `discard_standby` offers `shutdown` to a connected holder as today, then terminates the recorded identity with `identity::terminate_verified(identity, 2 s graceful, 2 s forced)` off the caller's lock. The idle and shutdown exit paths already call `discard_standby`, so a server exit now leaves no standby behind.

### 4. Windows creation flags live in one place

`launch::command` sets `CREATE_NO_WINDOW` (`0x0800_0000`) through `CommandExt::creation_flags` under `#[cfg(windows)]`. Detached resident launches keep `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_BREAKAWAY_FROM_JOB`, which already gives those roles no console, and the WMI path keeps `ShowWindow=0` with `CreateFlags=0x208`. The two flag sets are documented beside each other so neither is weakened later.

### 5. Development stop converges and is silent on success

`stopCheckoutProcesses` takes injectable `list` and `terminate` functions and loops: list, select this checkout's processes, terminate each, wait briefly, list again; it stops when a pass finds nothing or after eight passes (about four seconds), and returns `{ stopped, survivors }`. Callers print only when survivors remain, naming their PIDs, because a successful stop is not news. `start-local.mjs` runs the same stop after the launched child closes (skipped under `A1_DEV_KEEP_PROCESSES=1` so probes that share an instance keep working). The selection stays checkout-scoped: other checkouts' and installed releases' processes are never touched.

## Risks

- **A registered holder is refused for a reason that is only transiently wrong.** The definitive set contains only reasons the server derives from durable records or credentials; inspection timeouts and liveness failures stay transient. A wrongly ended holder's tab is recorded as ended and the next `a1` starts a new one, which is the existing contract for a lost holder.
- **Terminating the standby by identity races a promotion.** `discard_standby` only runs when the standby is being dropped (idle exit, shutdown, retarget) and takes the record out of `locked.standby` first, so a concurrent promotion no longer finds it.
- **Native tests run only in CI.** Unit tests cover the classification function, the standby disconnect decision, and the refused-frame round trip; the role integration suite stays as regression evidence.

## Sequencing

1. Holder: refusal classification, `refused` reading, standby disconnect; server: `refused` frame.
2. Server: standby identity and termination on discard.
3. `launch::command` creation flags.
4. Development stop convergence, launch-exit stop, quiet reporting, vitest coverage.
