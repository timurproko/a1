# Independent physical-host evidence schemas

`physical-host-verdict.schema.json` records one capability/platform verdict. It binds exact profile, host-terminal and runtime identity, ordered physical actions, child/visible/host/process observations, nanosecond timing samples, process/standard-handle identity, restoration checks, comparisons, outcome, and first divergence.

`physical-host-artifacts.schema.json` inventories every referenced screenshot, video, child observation, host-state capture, process inventory, native trace, stream, timing log, or diagnostic by relative path, size, SHA-256, producer, and independent source.

Rules:

- Evidence paths are relative to an isolated scenario root; absolute paths and traversal are invalid.
- Every observation, timing sample, restoration result, comparison, and divergence references immutable artifact IDs.
- Evidence producers must declare their independent source and `productTerminalModelUsed: false`.
- A direct verdict has no AddOne artifact identity. Transparent, composed, and raw-relay verdicts bind package version, source commit, integrity, and release ID.
- A passing verdict has no failure classification or first divergence. Every non-pass result has a concise classification.
- The schema describes evidence; it does not encode terminal bytes, reconstruct cells, infer modes, or determine expected child encoding.

## Generic child recorder

`../generic-child-recorder.mjs` is launched directly as the observed child. An independent OS action driver writes action labels to a separate inherited descriptor immediately before physical injection; stdin remains exclusively the terminal input under observation. The recorder logs exact received bytes, UTF-8 decoder observations, signals, resize samples, lifecycle, and configured output/query bytes. It never predicts what bytes an action should produce and does not import AddOne runtime code.
