# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Selected nightly-repair and publishing-impact PRs expose complete regression as native PR checks.
- Planning-only drafts stay lightweight while selected implementation drafts receive full feedback without integration authority.
- Windows Node 22 and 24, Linux Node 24, and macOS Node 24 remain required with exact-head lane evidence.
- Failed, cancelled, missing, stale, mismatched, or unexpectedly skipped selected evidence blocks the protected aggregate.
- Scheduled and manual Full regression retain their named non-publishing entry point and compatible triage behavior.
- The additive `ci:full-regression` policy cannot exempt automatic selection or grant publication and merge authority.
- Final-head Actions evidence replaces a separate mandatory dispatch without requiring a self-invalidating run-ID commit.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "run-full-regression-in-repair-prs",
  "sourcePr": 543,
  "archive": "openspec/changes/archive/2026-09-22-run-full-regression-in-repair-prs/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-run-full-regression-in-repair-prs/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "d24718c100d0839f0fca96a00301da17e468c012",
  "acceptanceScenarios": [
    "Selected nightly-repair and publishing-impact PRs expose complete regression as native PR checks.",
    "Planning-only drafts stay lightweight while selected implementation drafts receive full feedback without integration authority.",
    "Windows Node 22 and 24, Linux Node 24, and macOS Node 24 remain required with exact-head lane evidence.",
    "Failed, cancelled, missing, stale, mismatched, or unexpectedly skipped selected evidence blocks the protected aggregate.",
    "Scheduled and manual Full regression retain their named non-publishing entry point and compatible triage behavior.",
    "The additive `ci:full-regression` policy cannot exempt automatic selection or grant publication and merge authority.",
    "Final-head Actions evidence replaces a separate mandatory dispatch without requiring a self-invalidating run-ID commit."
  ],
  "archiveDigest": "6cf7ea23e2a48fc003aa5e6082d9480e6e5c0dd4c239161ffc6d0329da8e6440",
  "specDigest": "45a5a0716230e7db7b21dfbb7aec1ba50eaef34720d2eac83d885f066b6fc044",
  "tasksDigest": "a34c82d2009e40861cbbe6dd852d8c73ad70b2da999642eab72e827d81590628",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
