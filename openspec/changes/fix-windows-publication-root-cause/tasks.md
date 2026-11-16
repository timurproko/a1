## 1. Hosted published-pair diagnosis

- [x] Add an explicit diagnostic-only workflow route for an existing immutable published pair, with no npm writes or publication credentials.
- [x] Retain worker stderr, exception, and exit information while leaving predecessor and candidate package bytes unchanged.
- [x] Add focused contracts for diagnostic routing, capture, and redaction.

## 2. Root-cause repair

- [x] Recognize only the authenticated legacy heartbeat crash and settle all fixture writers before explicit installer recovery; keep unrelated update failures blocking promotion.
- [x] Retain failed direct-update evidence separately from successful installer recovery and check the recovered exact candidate without deleting settings or data.
- [x] Reconcile a verified installer-activated target's abandoned journal only after both recorded recovery owners are dead, without restarting the old capsule.
- [x] Add native regression coverage for heartbeat sharing failures and focused contracts for recognition, settlement, and failed recovery.
- [x] Print smoke phases and bound a stalled update to five minutes while retaining safe failure settlement.
- [x] Document the regression introduction, failure mechanism, earlier repairs, observed outcomes, and explicit remaining gaps.
