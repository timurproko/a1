# Design

## Context

Two signals feed the tab chip today. The session shell's `ResidentTabCoordinator.observeProgress` arms a 300-second timer per working turn, reports `stalled` through the tab bridge, and appends a workflow status line. The resident server separately measures child heartbeat silence; after 30 seconds it emits `child-unresponsive`, which sets the presented surface status to `unresponsive`, and after 120 seconds it terminates and restarts the child. When heartbeats resume it emits `child-responsive`, which forces the surface status to `idle`. The attach client maps either status to a yellow `!`, a notice row, and a bare `R` restart key.

## Decisions

### 1. Stall detection is deleted, not hidden

`observeProgress` keeps only lifecycle tracking: it reports `idle` when the session lifecycle leaves `busy` and no longer arms a timer. `stallNoticeSeconds` leaves the resident options, the launch settings, and the composition root. `stalled` leaves `ResidentTabStatus`, the server's accepted bridge states (an old child reporting it maps to `idle` like any unknown state), `Lifecycle`, the counters, the strip glyph and colour tables, and the simulator's status set. The settings migration that already deletes the retired `tabsStallNoticeSeconds` key stays.

### 2. Unresponsive stays a server lifecycle, not a presented status

The server keeps the heartbeat measurement, the registry `unresponsive` lifecycle, the `UnresponsiveTransition` and hang-recovery counters, and the automatic termination and restart. The `child-unresponsive` and `child-responsive` notices update only the registry record and counters; they no longer rewrite the surface status or push a surface to viewers. The chip therefore keeps whatever the bridge last reported (usually the working spinner), and when heartbeats resume it is not forced to `idle`.

The strip drops `unresponsive` and `stalled` from its `!` glyph and amber colour; `degraded` keeps them.

### 3. The attach client has no stall affordance

The `Agent stalled · R restart · Alt+W close` notice row and the stalled/unresponsive `r`/`R` arm of `forward_key` are removed, along with `KeyForward::Restart` if nothing else produces it. `Request::Restart` stays for the failed-tab path and explicit restart commands. The failed-tab banner and keys are unchanged.

## Risks

- A frozen child now looks like a working tab for up to 120 seconds; typed input queues in the holder's bounded writer and is rejected visibly when full, as before. The automatic restart remains the recovery.
- Removing a counter field changes `a1 tabs host status` output; the field is diagnostic and volatile.
