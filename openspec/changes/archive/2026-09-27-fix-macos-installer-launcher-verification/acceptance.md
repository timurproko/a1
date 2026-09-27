# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A Unix npm launcher reached through a lexical prefix alias verifies by canonical identity and installation completes.
- A launcher resolving to a foreign entry remains rejected before update or success.
- Windows shims and package, version, activation, launcher-completeness, and command-precedence guards remain strict.
- Published-pair jobs identify their selected platform and Node runtime while retaining the full native matrix and aggregate gate.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-macos-installer-launcher-verification",
  "sourcePr": 603,
  "archive": "openspec/changes/archive/2026-09-27-fix-macos-installer-launcher-verification/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-fix-macos-installer-launcher-verification/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "329522874ace9cb90b7949ecf25b9c3d89ab8a26",
  "acceptanceScenarios": [
    "A Unix npm launcher reached through a lexical prefix alias verifies by canonical identity and installation completes.",
    "A launcher resolving to a foreign entry remains rejected before update or success.",
    "Windows shims and package, version, activation, launcher-completeness, and command-precedence guards remain strict.",
    "Published-pair jobs identify their selected platform and Node runtime while retaining the full native matrix and aggregate gate."
  ],
  "archiveDigest": "454739fc41883c9732273e0403ac36decaa01dc8ee38740c1926fec0ed884aac",
  "specDigest": "25e503c3a2de92539629d8b673a46360c420a046d475a027dcd1a1fea42a7b26",
  "tasksDigest": "44c75bbbb31d176da6509841bf999069eccc1c2e1515e5b198fcab7b7f2f60c5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
