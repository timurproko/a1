# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Ordinary launch follows a newer approved active release and never rolls it back because an older installation was invoked.
- A newer successfully installed release starts each new session while every retained older session continues uninterrupted.
- A concurrent superseded-cohort handoff reselects once without internal terminal output, and repeated churn fails once without looping.
- Successful packaged startup emits neither the SQLite experimental notice nor release-selection chatter, without globally disabling Node warnings.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "make-launch-current-and-quiet",
  "sourcePr": 563,
  "archive": "openspec/changes/archive/2026-09-23-make-launch-current-and-quiet/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-make-launch-current-and-quiet/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "d369a27f6cf837b5dd8b1911c9970f0245f5468d",
  "acceptanceScenarios": [
    "Ordinary launch follows a newer approved active release and never rolls it back because an older installation was invoked.",
    "A newer successfully installed release starts each new session while every retained older session continues uninterrupted.",
    "A concurrent superseded-cohort handoff reselects once without internal terminal output, and repeated churn fails once without looping.",
    "Successful packaged startup emits neither the SQLite experimental notice nor release-selection chatter, without globally disabling Node warnings."
  ],
  "archiveDigest": "b5ee285b4f16eb74a7eba764fb41d205d0045e00c523f34f54a0094e04e2aefa",
  "specDigest": "21455fee4f51493412c0bd4bcec32614ccdd6ab3e17f0ed5b85250b74d8f92e5",
  "tasksDigest": "df57d0b6257f509d384c783a2e5b2403053a24810a0b6bfa5bc7c24ae94a686e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
