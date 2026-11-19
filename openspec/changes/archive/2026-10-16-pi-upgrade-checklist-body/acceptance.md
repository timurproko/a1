# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A new nightly Pi upgrade proposal opens with four unchecked generated implementation outcomes, one generated acceptance outcome, and its version delta, changelog excerpt, and gate report in a sync report comment.
- A later scheduled or refresh run against an open proposal posts another sync report comment without editing the proposal body.
- Checking every generated outcome turns the proposal into an ordinary complete draft that trusted readiness promotes under the unchanged policy.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-checklist-body",
  "sourcePr": 787,
  "archive": "openspec/changes/archive/2026-10-16-pi-upgrade-checklist-body/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-pi-upgrade-checklist-body/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "adcf47913ad728bf16ba70e45391bcc9c3a5bfec",
  "acceptanceScenarios": [
    "A new nightly Pi upgrade proposal opens with four unchecked generated implementation outcomes, one generated acceptance outcome, and its version delta, changelog excerpt, and gate report in a sync report comment.",
    "A later scheduled or refresh run against an open proposal posts another sync report comment without editing the proposal body.",
    "Checking every generated outcome turns the proposal into an ordinary complete draft that trusted readiness promotes under the unchanged policy."
  ],
  "archiveDigest": "680b59781ce667709184c293d93f172e65f36162a3670701951d4d96873f5b76",
  "specDigest": "55e6a74b1bdc7501c21dadcdaa2c489ba0fdb3ba9bfb64f97efc1a6fe2e87549",
  "tasksDigest": "0359c7248e4c982b68e311d04e97225113985cdfe73597ab06dafb307659fbc5",
  "evidenceDigest": "6a9f246e7e812f248e3c549046b622c67ff3c50c37f78b2e1028680952e28c80",
  "knownGaps": []
}
```
