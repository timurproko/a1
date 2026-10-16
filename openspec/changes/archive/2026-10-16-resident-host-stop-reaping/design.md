# Design

## Context

### Failure evidence

On 2026-10-16, run 38874197809 (PR #777, `Resident tabs chaos (macOS arm64)`, seed `3122702356`) ended with:

- `host-stop` → `{"host":"running","result":{"accepted":false,"forced":[],"remaining":["tab-946d324385d6504e"],"stopped":[three tabs]}}`
- `orphaned resident processes: 20359 (terminal-host --resident-role-child server …)`

The same pair appeared in runs 38877825409 (macOS, `fix/background-agent-rendering`), 38877772898 (Windows, `fix/tab-autonaming-animation`), and 38870700828 (Windows, PR #777). The orphan is the server itself. It stays up because the stop was not accepted, so the second violation follows from the first.

In the macOS report, the last server kill came at 582.5 s of the 600 s run. The holder log for `tab-946d324385d6504e` shows it connecting to that replacement server, then a fresh holder `started` about 12 s later, after the schedule's holder and child kills, and about 5 s before the final `host-stop`. When orphans were checked, no holder or tab child of the run was alive.

### Why the stop is refused

`stop_tabs` in `roles/server.rs` (used by `host.stop`) treats a tab as live while either:

1. `holders` contains it, meaning the server still holds a holder connection entry, or
2. `holders_starting` contains it and its registry record has a `holder_pid`.

After `MAINTENANCE_STOP_GRACE` (15 s), it terminates each live tab's holder through `terminate_verified`, using the connected identity or the recorded one. Only a successful termination adds the tab to `forced` and releases its `holders_starting` entry. `terminate_verified` returns an error when the process no longer matches the identity, which includes a holder that is already gone. In that case nothing releases the tab. It stays live until the connection thread notices EOF (`holder_lost`) or the 30 s `HOLDER_ADMISSION_DEADLINE` expires. Both can come after the 2 s post-force window, so the result is `accepted: false` with an empty `forced`. That matches the report.

Path 2 is reachable directly: a replacement server puts every live recorded holder into `holders_starting` while it waits for readmission, and a holder killed during that window leaves a dead recorded `holder_pid` behind. Path 1 needs a holder connection whose server-side session has outlived its process. The evidence doesn't show which of the two hit, which is why Decision 2 adds a reason for each remaining tab.

## Decisions

### 1. Release a tab whose processes are verified gone

After the grace wait, and again after forced termination, `stop_tabs` classifies each remaining tab with one pure function, `stop_disposition(holder, child)`. Each input is the result of inspecting that identity: `Live`, `Gone` (no process, or a different start identity), `Unknown` (no recorded identity), or `Unverifiable` (the inspection failed).

- A `Live` holder or child keeps the current behavior: verified termination, then the tab is `forced` or stays `remaining`.
- A holder that is `Gone` or `Unknown`, together with a child that is `Gone` or `Unknown`, is **released**. Under the state lock the server removes the tab from `holders`, `holders_starting`, and `holders_terminating`, returns any recovery slot it holds, and counts the tab as stopped. A later `holder_lost` for that tab finds no registry record and changes nothing.
- An `Unverifiable` holder or child is never released. The tab stays `remaining` and the stop is refused, because the process might still exist.

Termination still targets only verified identities. Releasing changes only server bookkeeping and never signals a pid.

Rejected: lengthening the grace or post-force windows. That only shortens the race against the 30 s admission deadline and makes every stop slower.

### 2. Report why a tab remains

The `host.stop` result gains `released`, the tabs from Decision 1, and `remainingReasons`, a map from tab id to `holder-live`, `child-live`, or `unverifiable`. The existing fields don't change. Each release appends the allowlisted diagnostic event `maintenance-stop-released`. The harness's `host stop reported …` violation already embeds the result JSON. Its 800-character cut-off is raised enough to keep `remainingReasons`.

### 3. Proof

- Unit tests for `stop_disposition` cover every combination of holder and child state, and `process_state` is checked against a missing identity, the live test process, and a reused pid.
- Role-integration test `host_stop_releases_a_tab_whose_holder_died_awaiting_readmission`: start a tab, suspend its holder so it can neither replace the server nor reconnect, kill the server, and start a replacement that adopts the suspended holder and waits for it to come back. Then kill the holder and its child and run `host-stop` before the 30 s admission deadline. It must report `host: stopped`, list the tab in `released`, leave `remaining` empty, and the server must exit. Without Decision 1 this is the reported failure: `accepted: false` with the tab remaining.
- A connection entry that outlives its holder (path 1) has no deterministic fixture. It goes through the same release, and the `remainingReasons` from Decision 2 identify it if the chaos lane trips again.

## Risks

- A tab released while its connection thread is still tearing down could race `holder_lost`. `holder_lost` only edits a registry record that still exists and removes set entries that are already gone, so the race is harmless. The release removes the record first.
- Native code can't be built on the maintainer's workstation, so the native tests run only in the terminal-host and resident-chaos CI lanes.
- The Windows-only violation `server was not replaced after it was killed` (run 38870717455) is a different failure and out of scope here.
