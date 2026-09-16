# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Each publication lane prepares one verified exact-package installation for startup and package contracts while retaining isolated consumer state and outcomes.
- Startup runs before package contracts without inherited mutable or compile-cache state and keeps existing budgets and no-retry behavior.
- Compatible downloaded candidate receipts bypass repacking; contradictory identity or installed-byte mutation blocks publication.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "reduce-develop-publication-latency",
  "sourcePr": 442,
  "archive": "openspec/changes/archive/2026-09-16-reduce-develop-publication-latency/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-reduce-develop-publication-latency/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "a05c4bec0c691d7d9cd7713e915889bc9da39e61",
  "acceptanceScenarios": [
    "Each publication lane prepares one verified exact-package installation for startup and package contracts while retaining isolated consumer state and outcomes.",
    "Startup runs before package contracts without inherited mutable or compile-cache state and keeps existing budgets and no-retry behavior.",
    "Compatible downloaded candidate receipts bypass repacking; contradictory identity or installed-byte mutation blocks publication."
  ],
  "archiveDigest": "24b4ed820bdcee2cfd1cc16ab7ff4632934e1e8b785e2ad2610a2fd5b4da3cc7",
  "specDigest": "7fa513dbf5f31f6abd35f2bdc16a761c2d082d601c07f5013541e96f98b94b1f",
  "tasksDigest": "bfb0a6e33ec6998a9951fcfabdb4cc239829f170dc48ec61c62436ae9d4e7319",
  "evidenceDigest": "e5d095e016b008e6d5516b491940c5cb2a222d89a036791c08b292f05b5b04d1",
  "knownGaps": []
}
```
