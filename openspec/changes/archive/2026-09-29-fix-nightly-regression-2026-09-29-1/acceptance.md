# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The queued chip wrapping test asserts a one-row dequeue hint on macOS, Linux, and Windows while platform key labels stay covered by the live-binding test.
- Selection edge auto-scroll compares normal, fast, and high distances by timer ticks, and its fast gesture can no longer become a double-click.
- A same-day nightly triage candidate records a calendar date in its OpenSpec change metadata.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-29-1",
  "sourcePr": 628,
  "archive": "openspec/changes/archive/2026-09-29-fix-nightly-regression-2026-09-29-1/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-fix-nightly-regression-2026-09-29-1/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "6600cb425e5d2008c9e15ff34bf68024a72b7d8b",
  "acceptanceScenarios": [
    "The queued chip wrapping test asserts a one-row dequeue hint on macOS, Linux, and Windows while platform key labels stay covered by the live-binding test.",
    "Selection edge auto-scroll compares normal, fast, and high distances by timer ticks, and its fast gesture can no longer become a double-click.",
    "A same-day nightly triage candidate records a calendar date in its OpenSpec change metadata."
  ],
  "archiveDigest": "6af478a2a46cddfd0db6aa75dcb20873a675d7d1fe13f6a00456b94e3860eeb3",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
