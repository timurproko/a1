## Why

On 2026-10-24 the installed A1 flashed a console window every few seconds for hours. Two standby holders of the resident terminal host had outlived the server that prewarmed them. Every reconnect attempt asked for a replacement server by spawning `host-entry.js server --detach --resident-parent-holder`, the new server refused the hello with "holder has no registry or standby record" (437 refusals in `terminal-host-server.log`), and the holder treated that as a transient failure and asked again two seconds later, forever. Because a holder is a detached, console-less process and the request child is spawned without `CREATE_NO_WINDOW`, Windows allocated a visible console for each request.

The same session showed that resident processes are never cleaned up when they should be: nine development instances from abandoned `./scripts/dev` runs were still alive with 91 Node processes and about 7 GB of memory, each with its own supervisor, server, holders, and `ui.js` tabs polling `git` and `gh`. `npm run build` reports "Stopped N running A1 process(es)" but kills one snapshot of PIDs, so holders restart the server and the server restarts holders faster than the snapshot is drained, and a dev launch that ends leaves its whole instance behind.

## What Changes

- A holder ends when the server refuses its hello for a definitive reason (no registry or standby record, rejected credential, newer epoch, identity or incarnation mismatch): the server sends the reason in a `refused` frame before closing, and the holder exits instead of requesting a replacement server. A standby holder never requests a replacement server at all; it exits when its server disconnects. Transient failures keep the existing bounded reconnect, with a slower backoff cap.
- The server records the verified process identity of the standby holder it launched and, when it discards the standby or exits, terminates that holder by identity after the graceful shutdown offer, so no standby survives its server.
- On Windows, every child the native host spawns from a role process (replacement-server requests, bounded probes, maintenance children) is created with `CREATE_NO_WINDOW`, so a console-less role can never show a console window.
- `stop-checkout-processes.mjs` stops a checkout's processes to convergence: it repeats list-and-terminate passes until no matching process remains or the bound is reached, prints nothing when the stop succeeds, and names the survivors when it does not. `./scripts/dev` also stops its checkout's remaining processes when the development launch exits, unless `A1_DEV_KEEP_PROCESSES=1`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `resident-terminal-host`: holders end on definitive refusal; a standby never outlives or replaces its server; role-spawned children show no console window on Windows.
- `launch-instance-lifecycle`: a development launch's checkout processes are stopped to convergence when the launch ends or the checkout rebuilds.

## Impact

- **Native host:** `native/terminal-host/src/roles/holder.rs` (refusal classification, standby disconnect), `roles/server/mod.rs` (refused frame), `roles/server/standby.rs` and `roles/server/mod.rs` (standby identity and termination), `launch.rs` (Windows creation flags). The wire protocol gains one `refused` hello reply; its generation does not change, and an older holder that ignores it behaves as today.
- **Development tooling:** `scripts/development/stop-checkout-processes.mjs`, `scripts/development/start-local.mjs`, `scripts/clean.mjs`; a new vitest file covers the convergence loop.
- **Behavior:** installed resident tabs still survive a detached `a1` as the spec requires; what changes is that nothing survives without a record or a server, and development instances end with their launch.
