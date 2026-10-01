# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Direct Windows invocation without `npm_execpath` binds the canonical Node-bundled npm entry.
- Package replacement remains pinned to the confirmed user-scoped package prefix and complete launcher set.
- Missing or non-regular bounded npm candidates fail before recovery ownership or package mutation.
- Cancellation, updater loss, rollback, and launcher restoration retain their protected behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-npm-cli-resolution",
  "sourcePr": 657,
  "archive": "openspec/changes/archive/2026-10-01-fix-npm-cli-resolution/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-01-fix-npm-cli-resolution/acceptance.md",
  "finalizedDate": "2026-10-01",
  "specBaseSha": "74265748fca0efcad0eaaf1c5c60c46a1fe542d3",
  "acceptanceScenarios": [
    "Direct Windows invocation without `npm_execpath` binds the canonical Node-bundled npm entry.",
    "Package replacement remains pinned to the confirmed user-scoped package prefix and complete launcher set.",
    "Missing or non-regular bounded npm candidates fail before recovery ownership or package mutation.",
    "Cancellation, updater loss, rollback, and launcher restoration retain their protected behavior."
  ],
  "archiveDigest": "b681a439c79b5dfe505d961930b4f721c3eb193f179fd1847d95ea80cc546866",
  "specDigest": "805a54ebffe3fdb355e882cc9fc321fe866cad01a000ac4b5e78fd11a5bfb089",
  "tasksDigest": "476e2085624e24feb3724ffdce6e6b5c04e2a2f02c188538f4ceb9777f60f254",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
