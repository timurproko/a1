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
  "specBaseSha": "9b08e0bb42abde32533793606328c749210b4714",
  "acceptanceScenarios": [
    "With skills discovered and `Skills` at its `collapse` default, typing `/skill` lists one `skills` row and no per-skill row; `/skills framer fix` reaches the engine as `/skill:framer fix`, `/skills review` prints `Unknown skill: review` with no dialog, and bare `/skills` opens the Skills dialog.",
    "Typing `/sk` then `:` turns the prompt into `/skills:` with the skill rows open and undo restoring `/sk`; submitting `/skills:framer redesign` reaches the engine as `/skill:framer redesign` while Up recalls `/skills:framer redesign`.",
    "Switching `Skills` to `expand` in `/settings` restores every per-skill row and leaves `/skills:` as ordinary text without `/reload`; the `a1 pi` comparison profile keeps the pinned per-skill list throughout."
  ],
  "archiveDigest": "f0020872e546c3c37458cfc23f88aa157ab08aa757cc29b937ad0c9296e06ab2",
  "specDigest": "734022aa60360bce6174214d5e8c2c917b87e399abb8e7c9d155a281300952ad",
  "tasksDigest": "34cba6ed4545c8dbf0d28aeca144d19071d6a211f2c087abace49063c021dbc7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
