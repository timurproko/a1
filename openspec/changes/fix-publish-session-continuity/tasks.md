## 1. Large authoritative snapshot delivery

- [ ] 1.1 Implement bounded authoritative snapshot representation/accounting without charging already-owned history as repeated pending payload or retaining unbounded obsolete state.
- [ ] 1.2 Preserve FIFO semantic boundaries, emitted revisions, per-turn yielding, generation isolation, and asset lease release across admission, consumption, rejection, and disposal.
- [ ] 1.3 Add focused queue, delivery, and adapter regressions for snapshots larger than 8 MiB, repeated notices, ordered distinct snapshots, genuine protected saturation, and image lifetimes.

## 2. Publish and restore continuity

- [ ] 2.1 Add isolated adapter and composition/update-observation regression coverage proving installed-update notices leave large-session work and executing-release identity unchanged and permit subsequent commands, including an admitted still-running prompt that must not become failed or disable submission.
- [ ] 2.2 Add same-pin large persisted-session public-entry exit/resume coverage with uncompacted and supported compacted histories, independent conversation markers, identity/context parity, and unchanged source bytes.
- [ ] 2.3 Complete focused checks and reconcile all discovered gaps before final delivery bookkeeping; keep broader execution with CI and do not claim the personal session has been repaired before a fixed binary is available.
