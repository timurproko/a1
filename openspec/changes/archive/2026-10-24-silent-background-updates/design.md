## Context

The current startup path checks npm dist-tags after the shell starts and emits an `AvailableRelease`. The engine adapter converts that result into a `release-update` diagnostic, and the shell renders either a large docked banner in bare A1 or a bordered transcript notice in `a1 pi`. Both tell the user to run a command.

The explicit updater already performs protected npm replacement, materializes the installed tree into the immutable release store, certifies and warms it, starts its supervisor, and only then moves the active reference. A session running from a retained immutable release can continue safely while another version becomes active. Manual update remains necessary for selecting a particular preview or investigating an installation that cannot update automatically.

Automatic execution introduces two constraints absent from the current notice: multiple concurrent sessions may discover the same release, and automatic work must never terminate the session that initiated it.

## Goals / Non-Goals

**Goals:**
- Install a newer release in the background without blocking startup or requiring routine command entry.
- Keep all existing replacement, recovery, certification, rollback, and activation guarantees.
- Ensure one package replacement owns the installation across automatic and manual callers.
- In the default `Auto` mode, prompt only after successful activation using one compact restart-ready line; preserve the existing popup in `Notify` mode.
- Keep explicit update commands and opt-outs.

**Non-Goals:**
- Hot-swapping code inside a running session.
- Automatically restarting or closing a session.
- Silently escalating privileges or bypassing npm ownership checks.
- Hiding diagnostics from an explicitly invoked `a1 update` command.
- Automatically updating Pi extension packages or model catalogs.

## Decisions

### D1. Startup discovery follows the selected Update mode

The existing channel selection, 24-hour cache, semver comparison, registry timeout, and early opt-outs remain. Bare A1 resolves the `Update` mode before discovery: `Auto` submits an automatic-update request carrying the exact channel and discovered version, `Notify` emits today's update-available diagnostic and popup without installing, and `No` skips cache and network access. `a1 pi`, which does not expose A1 settings, uses `Auto` when otherwise eligible.

Automatic requests start after the first usable shell frame and are never awaited by startup. A fresh cache may therefore request installation without network access, while a stale cache still performs the current bounded background registry query first. `Notify` mode retains the same cached/fetched notice timing and content as today.

### D2. A detached immutable worker owns automatic execution

The interactive process starts a dependency-light worker from its selected immutable release with ignored stdio and no terminal inheritance. The worker receives the selected release identity, its recorded mutable npm package root, the channel, and the exact discovered target. It validates those inputs before calling the shared updater in automatic mode.

The worker is detached and unreferenced so closing the initiating terminal does not cancel package replacement. It writes only bounded coordinator state and the existing update/recovery journals. It never loads the TUI, agent, project resources, or session state.

*Alternative:* run the update promise inside composition. Rejected because closing the session would terminate routine updates and could strand avoidable work between durable phases.

### D3. All self-updates share one cross-process execution lease

A new update lease under the A1 data directory serializes package replacement for both the detached worker and explicit `a1 update` commands. The lease binds the canonical installation, process identity, target, channel, execution mode, and acquisition time. Ownership is created atomically and is revalidated before mutation. A dead owner can be reclaimed only through verified process identity and the durable transaction state.

An automatic caller that finds a live owner becomes an observer and performs no replacement. An explicit command reports the existing operation without starting a second one. A conflicting target never rewrites or joins the active transaction. This closes the current transaction journal's assumption that only one updater executes at a time.

### D4. Automatic mode is exact-target and non-disruptive

The shared updater gains an internal exact-target input used only by the worker. It validates that the target belongs to the requested running channel and is newer than the running release, then installs that exact package version. Public command parsing and named-preview behavior remain unchanged.

Before automatic mutation, lifecycle preflight requires the live cohort to execute from a verified immutable release. If the owner runs from the mutable npm package tree, automatic mode records a failed attempt and exits without requesting shutdown, terminating processes, renaming the package, or creating a replacement transaction. The explicit command retains its existing consent-backed legacy shutdown behavior.

Once the non-disruptive preflight passes, automatic mode uses the same package ownership checks, prefix pinning, recovery guardian, transaction phases, rollback, target-owned activation, warmup, active-reference commit, and cleanup scheduling as the manual command. Its output sink is silent; failures are recorded for retry policy rather than rendered in the session.

### D5. Coordinator state supports sharing, observation, and bounded retries

`<dataDir>/automatic-update.json` is an atomic, size-bounded document recording schema, channel, discovered target, status (`running`, `installed`, or `failed`), attempt timestamps, lease/transaction identity when applicable, installed version when verified, and a bounded failure classification. The update transaction and cohort state remain authoritative for mutation and activation; this document is coordination state, not proof that installation succeeded.

Concurrent sessions that discover the same target observe this state and the active cohort rather than starting another worker. A `running` record whose owner died is eligible for safe lease recovery and transaction resumption. A failed target is not retried during a 24-hour cooldown; discovery of a strictly newer target may attempt immediately. Manual commands ignore the automatic cooldown while still respecting the shared execution lease.

The worker writes `installed` only after the shared updater returns success and cohort state confirms an approved active release at or above the exact target. Malformed, oversized, contradictory, or unverifiable coordinator state fails closed and cannot produce a restart prompt.

### D6. Running sessions observe activation and show only restart readiness

A session in `Auto` mode that requested or observed automatic work watches the bounded coordinator/cohort state until the attempt settles or the session disposes. It announces restart readiness only when an approved active release is newer than the version executing that session. This also lets an old auto-mode session notice a successful explicit update run in another terminal. `Notify` mode retains the existing availability banner and does not start this observer merely because a release is available.

The semantic UI event carries the installed version, not a command or availability link. Bare A1 renders one compact prompt-adjacent status line, right-aligned when space permits: `Update installed · Restart to update`, using success/accent roles. When a working status is present, working remains on the left and restart readiness remains on the right; narrow layouts clip or stack without changing editor geometry or transcript content. The line is not modal, takes no input, and is not dismissible because it describes the process's actual stale runtime.

`a1 pi` uses the same compact status region rather than appending a transcript banner. Restarting naturally removes the line because the new process runs the activated version. Automatic paths render no update-available or update-failure popup.

### D7. `Update` adds Auto without removing notification or disabled behavior

The persisted key remains `updateCheck`, but its value becomes the string enum `auto | notify | no` and its visible label becomes `Update`. `Auto` is the new default and installs verified channel updates silently before prompting for restart. `Notify` preserves today's behavior exactly: check at startup and show the update-available popup with the manual command. `No` skips cache reads, registry access, worker startup, and automatic observation so updates are entirely user-driven.

A settings-version migration maps stored boolean `true` to `notify` and `false` to `no`; an absent value resolves to the new `auto` default. This preserves deliberate existing enabled/disabled choices while making automatic installation the default for new or unspecified profiles.

`PI_OFFLINE`, `A1_SKIP_VERSION_CHECK`, `CI`, noninteractive output, and unpublished source builds retain their existing skip behavior for both `Auto` and `Notify`. `a1 pi` continues to use environment/profile eligibility rather than A1 settings and follows `Auto`. README documentation continues to advertise explicit update commands for manual or version-specific use.

## Risks / Trade-offs

- [Global npm replacement may require permission] → automatic failure remains silent and cools down; `a1 update` remains available with actionable diagnostics.
- [A session stays on old code after activation] → intentional immutable-release behavior; the compact status explicitly asks for restart and no code is hot-swapped.
- [Concurrent automatic and manual callers] → one shared lease serializes all package replacement and fails conflicting targets closed.
- [Initiating terminal exits] → the detached worker and durable transaction continue; later sessions can observe or resume.
- [Legacy mutable cohort would be disrupted] → automatic mode refuses before shutdown or mutation; manual update remains the explicit recovery route.
- [Background npm work competes for resources] → it starts only after first usable frame, runs one worker per installation, and uses the existing bounded child/output behavior with terminal output suppressed.

## Migration Plan

The first release containing this change advances the settings version and converts stored `updateCheck: true` to `notify` and `updateCheck: false` to `no`; profiles without the key resolve `auto`. A cached newer target can immediately start the background flow in `Auto` mode or render the existing popup in `Notify` mode. Malformed stale coordinator files are ignored/fail closed. Rolling back leaves the extra coordinator file unused; the old release continues to understand the existing cache but may reject the new string setting and fall back to its boolean default.

## Open Questions

_None._
