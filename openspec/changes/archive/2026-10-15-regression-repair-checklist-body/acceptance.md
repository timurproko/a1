# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A new nightly repair candidate opens with two unchecked generated implementation outcomes, one generated acceptance outcome, the triage key in its automation block, and its run evidence in a triage comment.
- A later nightly with the same failed scope set posts another triage comment and appends the design and provenance records without editing the candidate body.
- Checking both generated outcomes turns the repair into an ordinary complete draft that trusted readiness promotes under the unchanged policy.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "regression-repair-checklist-body",
  "sourcePr": 769,
  "archive": "openspec/changes/archive/2026-10-15-regression-repair-checklist-body/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-regression-repair-checklist-body/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "ff11eab6c7a9c24766375e4625e5300c92708866",
  "acceptanceScenarios": [
    "A new nightly repair candidate opens with two unchecked generated implementation outcomes, one generated acceptance outcome, the triage key in its automation block, and its run evidence in a triage comment.",
    "A later nightly with the same failed scope set posts another triage comment and appends the design and provenance records without editing the candidate body.",
    "Checking both generated outcomes turns the repair into an ordinary complete draft that trusted readiness promotes under the unchanged policy."
  ],
  "archiveDigest": "d56bfaac635ee5cb1f7433ee523b8209acd56d7902e65906ccf460c9f33c23a7",
  "specDigest": "3f992e460c896b33277e932743ae980470cb0dd290d6d12bde9a6f000ee44738",
  "tasksDigest": "9b090cdf8fd8f74410652c88e184ca0391587e5ff6e5a267dbf9955bd7abc7d7",
  "evidenceDigest": "61a0a0fdb3e1300f5cefea306a5624f9c712da703351b0891002f36e07036c6b",
  "knownGaps": []
}
```
