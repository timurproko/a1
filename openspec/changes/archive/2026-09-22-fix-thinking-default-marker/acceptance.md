# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 renders the configured thinking default as a muted bracketed marker after the optional green active checkmark and before the aligned description, without the former prose suffix.
- Coincident active/default state places the active checkmark immediately before the configured-default marker, while differing states retain only their respective markers and stay aligned through filtering and narrow widths.
- Thinking selection, default persistence, cancellation, footer restoration, and the `a1 pi` comparison selector retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-thinking-default-marker",
  "sourcePr": 547,
  "archive": "openspec/changes/archive/2026-09-22-fix-thinking-default-marker/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-fix-thinking-default-marker/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "9fa1e231a33ab9aad337850d843739cfcedc88b4",
  "acceptanceScenarios": [
    "Bare A1 renders the configured thinking default as a muted bracketed marker after the optional green active checkmark and before the aligned description, without the former prose suffix.",
    "Coincident active/default state places the active checkmark immediately before the configured-default marker, while differing states retain only their respective markers and stay aligned through filtering and narrow widths.",
    "Thinking selection, default persistence, cancellation, footer restoration, and the `a1 pi` comparison selector retain their existing behavior."
  ],
  "archiveDigest": "ed8a690d5a7b32b330da042fc12a0f30d03b068bd68fe384f0f87533a9f6acaa",
  "specDigest": "6344cf02eab28c52327b55c27fcb42229191cf2e6dfc0f34d7cd5ff8259e3e8b",
  "tasksDigest": "104c431ba20d90beb50d3f04a91cd069b42a5434dbd3b46d2204d35371c09567",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
