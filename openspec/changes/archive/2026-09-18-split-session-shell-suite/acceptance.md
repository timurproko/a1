# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The ten suites report 301 passing cases, the same count the monolith ran, and each case body is unchanged.
- A change to the prompt-suggestion fixture selects only the selection and suggestions suites through the import graph.
- The paste suite runs in the serial resource-sensitive partition and the other nine run in the ordinary remainder.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "split-session-shell-suite",
  "sourcePr": 481,
  "archive": "openspec/changes/archive/2026-09-18-split-session-shell-suite/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-split-session-shell-suite/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "ce903c174dc2f93159adf59cc92ef567729baa7c",
  "acceptanceScenarios": [
    "The ten suites report 301 passing cases, the same count the monolith ran, and each case body is unchanged.",
    "A change to the prompt-suggestion fixture selects only the selection and suggestions suites through the import graph.",
    "The paste suite runs in the serial resource-sensitive partition and the other nine run in the ordinary remainder."
  ],
  "archiveDigest": "52eb24d35ed7495cb8fd4a1646fd5cae15ac1ab1c5df5a94d129ddf14d908b53",
  "specDigest": "7f908ffe65fa48ede2b7722ab539a82368732eb40f1af0c196f906b7111a2719",
  "tasksDigest": "ea7debb0bb224cd19513c27a7d5b35d91eb62110dfc7b4314d4665a41de2c370",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
