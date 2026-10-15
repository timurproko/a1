# Design

## Context

A maintainer running several agents in resident tabs on Windows (WezTerm, release `0.2.7-dev.772`) reported that keyboard and mouse input stopped for every tab while the tabs kept rendering. On 2026-10-15 between 19:09 and 19:27 the profile's diagnostics recorded a holder `child-exit` crash and restart every few seconds. The attach client stayed alive, so its 15-second watchdog never fired: its main loop kept running and only its input went nowhere.

### Input path

The attach client (`roles/attach.rs`) reads the outer terminal on one thread and sends every key, paste, mouse, focus, and resize event to the server as a frame on its one connection. On the server, `serve_attach` reads that connection on one thread and handles each frame before reading the next. Output takes a different route: holder surfaces go through each client's writer thread (`writer_loop`), so output keeps flowing when the read loop is stuck.

### Blocking work on the read loop

These `serve_attach` handlers block the read loop:

| Frame | Blocking work | Bound |
| --- | --- | --- |
| `attach.start`, `tab.create` | `start_holder`: `acquire_start_permit`, spacing sleep, process launch, identity inspection, registry commit | **none**: `acquire_start_permit` polls every 10 ms forever |
| `tab.create` | `promote_standby` | registry commit (5 s) |
| `tab.close` | `close_tab` registry commit | 5 s |
| `tab.restart`, `tab.rename`, `tab.reorder` | registry commit | 5 s |

`max_concurrent_starts` defaults to 2. `acquire_recovery_slot` takes a start slot for each crash restart and holds it until the replacement holder connects or 30 s pass (`RECOVERY_SLOT_BOUND`). In a crash loop, recoveries take the freed slots again as fast as they are released, and both `acquire_start_gate` and `acquire_start_permit` poll, so neither side has priority. A `tab.create` (Alt+A, the strip's `+`, or the overflow) sent while two tabs are recovering parks the read loop until a poll wins a slot. In a sustained crash loop that may never happen. Until then no key, paste, mouse event, focus claim, or tab switch from that terminal is read.

A registry commit failure in any of these handlers returns `Err` from `serve_attach` through `?` and closes the connection, so one failed rename ends the attach session.

### Attach-side input loss

- `failed` is one boolean for the whole client. A `failure.status` frame or a `surface` frame with status `failed` sets it. Only the next `surface` clears it, and the server sends one only when the newly viewed tab has a retained surface and produces output. While it is set, every key except `r`, `f`, and `Alt+W` is dropped, along with paste and focus events. After a switch to an idle or newly starting tab, that tab can stay locked.
- `pending_close` (the busy-tab "Stop this agent?" prompt) swallows every key except Enter and Esc. `overflow_index` swallows every key except arrows, Enter, and Esc. Their notice is drawn once with `render_notice`, which paints row 1, the tab strip's row. The strip is repainted on every `tab.list` reply (polled every 500 ms), every status change, and every 80 ms during a title animation, so the notice disappears within half a second while the prompt keeps capturing keys. The user sees an ordinary strip and a tab that ignores typing. Neither prompt is cancelled when the viewed tab changes or the target tab disappears.
- The client ignores `tab.create-failed` and `tab.create-refused`, so a refused or failed new tab gives no feedback.

## Decisions

### 1. A per-connection lifecycle worker

`serve_attach` keeps handling `input`, `paste.start`, `resize`, `tab.claimInput`, `tab.view`, `tab.list`, and `detach` on the read loop. Each takes the state lock briefly and only offers frames to bounded lanes, so none blocks.

`attach.start`, `tab.create`, `tab.close`, `tab.restart`, `tab.rename`, and `tab.reorder` go to a lifecycle worker thread owned by the connection, through a bounded channel of 32 requests. The worker handles them one at a time in arrival order, so lifecycle requests from one terminal keep their order relative to each other. Input may now overtake a lifecycle request, which is the point. The existing frames already make the client reconcile: `tab.created` makes the client send `tab.view`, and every lifecycle reply is followed by a `tab.list`.

When the channel is full, the read loop answers the request at once with its failure reply (`tab.create-failed`, `tab.closed`, `tab.restarted`, `tab.rename-refused`, or `tab.reordered`, each with `accepted: false`, message `busy`) instead of waiting. A handler error no longer closes the connection. `attach.start` replies with the existing `error` frame, which the client already reports when it exits. A failed `tab.create` passes its reason through, and every other request replies with the message `Tab change could not be completed`, because registry errors can name paths. The registry commit diagnostic event is still logged. When the read loop ends, it drops the channel and the worker exits after its current request. A request still running finishes against shared state, as before.

Rejected: an async runtime or one server-wide lifecycle queue. A per-connection thread keeps today's threading model, and one stuck terminal cannot delay another terminal's lifecycle requests.

### 2. Bounded, interactive-first start slots

`acquire_start_permit` takes a deadline of 60 s, longer than `RECOVERY_SLOT_BOUND` so an ordinary wait behind recoveries succeeds. A missed deadline returns the typed error `tab-start-busy`, which reaches the client as `tab.create-failed` with that reason. `RuntimeState` counts `interactive_start_waiters`, and `acquire_start_gate` (used by recovery and standby) takes no slot while a waiter is present, so the next free slot goes to the user's tab. `max_concurrent_starts`, start spacing, and the recovery slot bound are unchanged, so the concurrent-start requirement still holds.

### 3. Attach input rules scoped to the viewed tab

- `failed: bool` becomes `failed_tab: Option<String>`. A surface sets or clears it for its own `tab_id`, and `failure.status` sets it for the tab viewed when the frame arrives. Input rules apply only when `failed_tab` equals the viewed tab.
- `pending_close`, `overflow_index`, `rename`, and `context_tab` are cancelled whenever the viewed tab changes or a `tab.list` no longer contains their tab. One `prompt_notice()` derives the open prompt's notice in the order prompts capture keys, and every strip repaint inside the loop goes through `paint_strip!`, which repaints the notice after the strip. Surfaces repaint it too, and every key a prompt handles, swallowed or not, repaints the strip and the notice.
- `tab.create-failed` and `tab.create-refused` show a notice: `Could not open a tab: <reason>`, with `tab-limit`, `tab-start-busy`, and `busy` mapped to plain text. A refused rename, restart, or close shows its message.

### 4. Lifecycle liveness in host status

`RuntimeState` tracks each client's queued lifecycle requests and the start time of the request running. Host status adds `starts: { active, interactiveWaiting, recoverySlots }` and `lifecycle: { pending, oldestMs }`. `a1 tabs host status` prints both lines and appends `(stalled)` when `oldestMs` exceeds 10 000. The doctor bundle already includes host status verbatim. A lifecycle request that runs longer than 5 s appends the allowlisted diagnostic event `attach-lifecycle-slow`. It records only the request type, never its content.

### 5. Proof with a start-delay fault

A new fault knob, `A1_TABS_FAULT_DELAY_TAB_START_MS`, delays `start_holder` after it takes its permit. With `--max-concurrent-starts 1`, a role-integration test keeps one tab start blocked. It then sends a second `tab.create` and checks that input written to an existing tab is echoed in that tab's surface within one second, and that `tab.view` and `tab.list` still answer. A second test holds the gate past the deadline and expects `tab.create-failed` with `tab-start-busy` and a live connection. The worker split, the waiter priority, and the attach prompt rules get unit tests.

## Risks

- A lifecycle request now runs concurrently with the same connection's input. Every handler already takes the shared state lock per step, and the read loop's handlers change nothing a lifecycle handler depends on, apart from `viewed_tab`. `tab.restart` checks authorization against `viewed_tab` when it runs, as before.
- Interactive priority can delay a crash restart by up to one tab start. Recovery's own 40 s gate timeout still bounds it.
- The native host cannot be built on the maintainer's workstation, so the native tests are proven in the terminal-host CI lanes only.
