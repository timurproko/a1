## 1. Channel discovery

- [ ] 1.1 Implement bounded, independently cached `latest` and `next` discovery with safe migration from the old single-channel cache and bounded cross-process stale refresh.
- [ ] 1.2 Schedule Auto rechecks after first paint and on later cache expiry while the interactive process remains alive; cancel all scheduled and in-flight observation on disposal, and leave Notify/No and every skip condition unchanged.
- [ ] 1.3 Cover stable, preview, already-current, cache-boundary, publication-after-cache, concurrent-session, failed fetch, opt-out, and source-checkout cases in focused tests.

## 2. Reliable automatic installation

- [ ] 2.1 Reconcile dead or missing worker ownership and stale running coordinator state without claiming installation or overriding a foreign transaction; keep same-target cooldown and newer-target retry safe.
- [ ] 2.2 Ensure early and late automatic-worker failure records bounded truthful state and a later eligible attempt can recover through the existing lease/transaction lifecycle.
- [ ] 2.3 Cover both channels, single-owner concurrency, restart-ready only after approved activation, a long-lived session, and published-predecessor-to-candidate update reachability in focused tests.

## 3. Presentation and delivery

- [ ] 3.1 Keep retained sessions and resident hosts running during background installation; new launches select the certified active release, and only an older process shows restart readiness.
- [ ] 3.2 Update setting and user documentation to distinguish the new Auto discovery cadence from Notify, No, and explicit update commands.
- [ ] 3.3 Run targeted typecheck and tests, inspect applicable architecture and documentation checks, and disposition any concrete gaps before finalization.
