# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The engine, session-shell, owned-UI, and composition suites pass unchanged (1,342 cases): ordering, coalescing, generation invalidation, overload recovery, and flush failures behave as before through the adapter.
- Driving `PiEventDelivery` directly delivers stamped events in order one per event-loop turn, coalesces a live block, invalidates a replaced generation, reserves pending outcomes through one overload for the reconciliation port in arrival order, and reports a throwing listener.
- `adapter.ts` no longer holds delivery state; every emit, subscription, flush, seal, and overload guard goes through the class.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "extract-event-delivery",
  "sourcePr": 483,
  "archive": "openspec/changes/archive/2026-09-18-extract-event-delivery/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-extract-event-delivery/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "080197705ff542248b5eec33984e268c3ab0ee32",
  "acceptanceScenarios": [
    "The engine, session-shell, owned-UI, and composition suites pass unchanged (1,342 cases): ordering, coalescing, generation invalidation, overload recovery, and flush failures behave as before through the adapter.",
    "Driving `PiEventDelivery` directly delivers stamped events in order one per event-loop turn, coalesces a live block, invalidates a replaced generation, reserves pending outcomes through one overload for the reconciliation port in arrival order, and reports a throwing listener.",
    "`adapter.ts` no longer holds delivery state; every emit, subscription, flush, seal, and overload guard goes through the class."
  ],
  "archiveDigest": "404a67b8dafc86b44146f04459abdcde59ef9137cd60172477fdc1b34f2ea3e4",
  "specDigest": "e87d5fa8dce9868c70249bd89942039a801af9e19187cc13d182a896174252f6",
  "tasksDigest": "5acb6d85f69834aab29816036b85e7bc61816a58a80eb9c44e1d452f2d1fa73d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
