# In-terminal 2×2 spike evidence

The spike must produce machine-readable evidence with schema `a1-native-host-spike-evidence-v1`. Evidence is valid only when it names the exact artifact, hashes, pinned source commits, isolated worker environment, all mandatory workloads, measurements, paint diagnostics, resources, and physical/manual verdict. The artifact is a console terminal host that runs inside an existing terminal and does not open a desktop window.

## Mandatory workloads

1. `four-concurrent-sessions` — one fullscreen surface, one tab, four independent terminal sessions.
2. `input-routing` — rapid focus and key/text routing with no cross-pane delivery.
3. `unicode-cursor-modes` — Unicode width, cursor, and mode behavior.
4. `alternate-screen` — full-screen and alternate-screen programs.
5. `paste` — bounded bracketed and plain paste behavior.
6. `mouse` — pointer and wheel reporting within pane coordinates.
7. `ime` — composition, preedit, commit, and cancellation where the outer terminal supports it.
8. `live-resize` — active terminal resize and settle repaint.
9. `dpi` — terminal font/content-scale changes represented to the host when supported.
10. `high-rate-output` — simultaneous output in all four panes.
11. `pane-abnormal-exit` — one pane fails while three remain isolated.
12. `host-cleanup` — normal and abnormal host termination clean all owned resources and restore the outer terminal.

## Measurements

Latency summaries require minimum, p50, p95, maximum, and sample count:

- `inputToProcessMs`: outer-terminal input acceptance to child process write.
- `outputToPresentMs`: child output read to presented outer-terminal frame.

Paint diagnostics require requested, presented, coalesced, and missed frame counts plus resize paint-gap count. Resource observations require maximum CPU and resident memory; GPU memory may be null because the console host does not require a GPU renderer.

## Acceptance invariants

- All workloads must pass for `technical: passed`.
- Any failed workload forces `technical: failed`.
- Any missing or `not-run` workload forces `technical: incomplete`.
- `overall: accepted` requires technical acceptance and a physical verdict accepted through `manual` or `isolated-worker` evidence.
- Active-workstation automation makes the evidence invalid.
- Evidence must not contain terminal output, child input streams, rendered cells, cell grids, framebuffers, screen buffers, or raw terminal payloads.
- The evidence validator is `assertNativeSpikeEvidence` in `src/foundation/native-host-protocol/evidence.ts`.

A failed or incomplete proof stops composed-terminal integration and must not be waived to merge.
