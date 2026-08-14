# Windows 2×2 native-host spike evidence

The spike must produce machine-readable evidence with schema `addone-native-host-spike-evidence-v1`. Evidence is valid only when it names the exact artifact, hashes, pinned source commits, isolated Windows worker environment, all mandatory workloads, measurements, paint diagnostics, resources, and physical/manual verdict.

## Mandatory workloads

1. `four-concurrent-sessions` — one window, one tab, four independent terminal sessions.
2. `input-routing` — rapid focus and key/text routing with no cross-pane delivery.
3. `unicode-cursor-modes` — Unicode width, cursor, and mode behavior.
4. `alternate-screen` — full-screen and alternate-screen programs.
5. `paste` — bounded bracketed and plain paste behavior.
6. `mouse` — pointer and wheel reporting within pane coordinates.
7. `ime` — composition, preedit, commit, and cancellation.
8. `live-resize` — active drag resize and settle repaint.
9. `dpi` — per-monitor scale changes and content-scale updates.
10. `high-rate-output` — simultaneous output in all four panes.
11. `pane-abnormal-exit` — one pane fails while three remain isolated.
12. `host-cleanup` — normal and abnormal host termination clean all owned resources.

## Measurements

Latency summaries require minimum, p50, p95, maximum, and sample count:

- `inputToProcessMs`: native input acceptance to child process write.
- `outputToPresentMs`: child output read to presented frame.

Paint diagnostics require requested, presented, coalesced, and missed frame counts plus resize paint-gap count. Resource observations require maximum CPU, resident memory, and GPU memory when available.

## Acceptance invariants

- All workloads must pass for `technical: passed`.
- Any failed workload forces `technical: failed`.
- Any missing or `not-run` workload forces `technical: incomplete`.
- `overall: accepted` requires technical acceptance and a physical verdict accepted through `manual` or `isolated-worker` evidence.
- Active-workstation automation makes the evidence invalid.
- Evidence must not contain terminal output, child input streams, rendered cells, cell grids, framebuffers, screen buffers, or raw terminal payloads.
- The evidence validator is `assertNativeSpikeEvidence` in `src/foundation/native-host-protocol/evidence.ts`.

A failed or incomplete proof stops composed-terminal integration and must not be waived to merge.
