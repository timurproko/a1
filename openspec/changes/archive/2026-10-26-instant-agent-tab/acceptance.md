# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Requesting an Agent from a tab or landing immediately selects one new chip and paints a plain empty ruled editor and cwd footer, without any loading message or cursor.
- An early registry update never produces two new chips; the complete real Agent screen replaces the provisional UI in one handoff.
- Keys entered during startup reach only the new Agent; refused creation restores the prior view without a ghost tab.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "instant-agent-tab",
  "sourcePr": 837,
  "archive": "openspec/changes/archive/2026-10-26-instant-agent-tab/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-26-instant-agent-tab/acceptance.md",
  "finalizedDate": "2026-10-26",
  "specBaseSha": "9525032c2c6d40dff58f20976ed8009054913c94",
  "acceptanceScenarios": [
    "Requesting an Agent from a tab or landing immediately selects one new chip and paints a plain empty ruled editor and cwd footer, without any loading message or cursor.",
    "An early registry update never produces two new chips; the complete real Agent screen replaces the provisional UI in one handoff.",
    "Keys entered during startup reach only the new Agent; refused creation restores the prior view without a ghost tab."
  ],
  "archiveDigest": "9bb5337ea95f6a653bb526ea90cf83de40ad6d09d561d4d5a07ff62ecb48a111",
  "specDigest": "161dd773d6c1ba95381230c592763d189d60cd81877fe684dbb31e79e729c7e1",
  "tasksDigest": "f6982d68b22bae6db642798d38c4e45b3f293ecc516d0764cc1314cafd529974",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
