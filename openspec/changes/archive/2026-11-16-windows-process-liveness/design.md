## Context

`inspectLiveProcess` (`src/foundation/lifecycle/process-liveness.ts`) is the single liveness probe behind session-control record acceptance and, since the stale-record pruning change, behind record removal. It calls `process.kill(pid, 0)` and treats `EPERM` as proof of existence. Measured on pc2 after installing the pruning build: 2,132 records, `kill` ok 15, `EPERM` 802 (564 distinct pids), `ESRCH` 1,318, while `tasklist` listed 336 processes and only 9 of the `EPERM` pids. Node's Windows `kill(0)` opens the id with `OpenProcess`; a thread id or a handle-held exited process yields access denied, which Node maps to `EPERM`.

## Goals / Non-Goals

**Goals**
1. A Windows pid that is not a live process is reported dead even when the signal probe is refused.
2. Live processes the caller cannot open (other users, elevated) stay alive.
3. One process-table read serves a whole sweep; an unreadable table degrades to today's conservative answer.

**Non-Goals**
- Changing Unix semantics, the record format, or callers.
- A native addon or WMI dependency.

## Decisions

### D1. Confirm `EPERM` against `tasklist` on win32 only
`tasklist /FO CSV /NH` is present on every supported Windows and lists pids for all users. The second CSV field is parsed; a pid absent from a non-empty table is dead. An empty or failed table returns null and the probe keeps the pid alive, as before.

### D2. Short in-process cache
The table is cached for two seconds inside the process, so a sweep over thousands of records or a lookup over hundreds spawns `tasklist` once. The TTL is short enough that a session started moments earlier is seen by the next call; a start writes its record only after probing its own pid, which never hits the refusal path.

### D3. Injectable seams
`inspectLiveProcess(pid, { platform, kill, listProcessIds })` lets tests exercise the Windows branch on any platform; the public one-argument form is unchanged for callers.

## Risks / Trade-offs
- `tasklist` costs roughly 100–300 ms per cold call; with the cache that is once per sweep or lookup, well inside the lookup deadline.
- A process that exits between the signal probe and the table read is pruned correctly; one that starts in that window and reuses a dead record's pid is kept until the next sweep.

## Migration Plan
Additive. The next session start on an affected machine prunes the previously misjudged records.
