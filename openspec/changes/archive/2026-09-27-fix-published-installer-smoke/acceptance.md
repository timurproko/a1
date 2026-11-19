# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Every release checkout uses the established resolvable immutable action commit, allowing each selected published-pair job to reach its installation steps.
- Activation output containing more than 8 KiB of complete JSON events is delivered intact and the installer completes with one silent success result.
- Split activation events are reassembled while oversized unterminated output remains bounded and malformed evidence still fails installation.
- A newly numbered development pair publishes through OIDC and passes registry verification plus Windows, Linux, and macOS isolated installation smoke.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-published-installer-smoke",
  "sourcePr": 602,
  "archive": "openspec/changes/archive/2026-09-27-fix-published-installer-smoke/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-fix-published-installer-smoke/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "8769bba4e8e90183d0a93606b39ad57b043d6697",
  "acceptanceScenarios": [
    "Every release checkout uses the established resolvable immutable action commit, allowing each selected published-pair job to reach its installation steps.",
    "Activation output containing more than 8 KiB of complete JSON events is delivered intact and the installer completes with one silent success result.",
    "Split activation events are reassembled while oversized unterminated output remains bounded and malformed evidence still fails installation.",
    "A newly numbered development pair publishes through OIDC and passes registry verification plus Windows, Linux, and macOS isolated installation smoke."
  ],
  "archiveDigest": "c769f367e138d8e828866005e588e4fcf8d59ec943df1ff92e58e24aa8cf3097",
  "specDigest": "441eae6084f1af635d476e81b9e9e580d8dee04ac1bc61da021413b6558cda03",
  "tasksDigest": "b4f5747f55c25b98f5ccdd150f78eb74b2262d5f5e369b2f4219a06ceca76b28",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
