# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- With skills discovered and `Skills` at its `collapse` default, typing `/skill` lists one `skills` row and no per-skill row; `/skills framer fix` reaches the engine as `/skill:framer fix`, `/skills review` prints `Unknown skill: review` with no dialog, and bare `/skills` opens the Skills dialog.
- Typing `/sk` then `:` turns the prompt into `/skills:` with the skill rows open and undo restoring `/sk`; submitting `/skills:framer redesign` reaches the engine as `/skill:framer redesign` while Up recalls `/skills:framer redesign`.
- Switching `Skills` to `expand` in `/settings` restores every per-skill row and leaves `/skills:` as ordinary text without `/reload`; the `a1 pi` comparison profile keeps the pinned per-skill list throughout.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "collapse-skills-into-skills-command",
  "sourcePr": 509,
  "archive": "openspec/changes/archive/2026-09-19-collapse-skills-into-skills-command/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-collapse-skills-into-skills-command/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "2ed58dcee863b7a145011fbb522f788489841440",
  "acceptanceScenarios": [
    "With skills discovered and `Skills` at its `collapse` default, typing `/skill` lists one `skills` row and no per-skill row; `/skills framer fix` reaches the engine as `/skill:framer fix`, `/skills review` prints `Unknown skill: review` with no dialog, and bare `/skills` opens the Skills dialog.",
    "Typing `/sk` then `:` turns the prompt into `/skills:` with the skill rows open and undo restoring `/sk`; submitting `/skills:framer redesign` reaches the engine as `/skill:framer redesign` while Up recalls `/skills:framer redesign`.",
    "Switching `Skills` to `expand` in `/settings` restores every per-skill row and leaves `/skills:` as ordinary text without `/reload`; the `a1 pi` comparison profile keeps the pinned per-skill list throughout."
  ],
  "archiveDigest": "31eaebf00fca8aed4a13ccb519f4210d684073cfd14fba29963bd581c4a1ab21",
  "specDigest": "fb4307f24e97afc7cad4d5189ddf897525282d188f18d3b6e376f890dacbf717",
  "tasksDigest": "600f0291097e3bd9d482dba0be8c2898749a31daab95083e86968558bc7a116e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
