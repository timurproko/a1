# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Typing `////` or `/sk/rev` in bare A1 with the slash-command menu open and pressing Escape closes the menu and leaves an empty prompt without calling the interrupt handler.
- Escape on an argument, path, resource, or extension-provider menu, on a search containing whitespace, or in the `a1 pi` comparison profile still only closes the menu and keeps the typed text.
- The pinned Pi source ledger records the widened owned-editor deviation and its current hash so architecture governance passes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "clear-nested-slash-search-on-escape",
  "sourcePr": 462,
  "archive": "openspec/changes/archive/2026-09-17-clear-nested-slash-search-on-escape/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-clear-nested-slash-search-on-escape/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "cfe8cf3b4f12b8dc82b20641cc56d04edcdda934",
  "acceptanceScenarios": [
    "Typing `////` or `/sk/rev` in bare A1 with the slash-command menu open and pressing Escape closes the menu and leaves an empty prompt without calling the interrupt handler.",
    "Escape on an argument, path, resource, or extension-provider menu, on a search containing whitespace, or in the `a1 pi` comparison profile still only closes the menu and keeps the typed text.",
    "The pinned Pi source ledger records the widened owned-editor deviation and its current hash so architecture governance passes."
  ],
  "archiveDigest": "31842641286bae9d1194c4d9bb18bf3176e2e02b6fdc0916b83cd20433486f47",
  "specDigest": "9269463d5027a3b464517a6cfd68a0d1f25d2bd5e15fa7dc270eae30ebbfc97e",
  "tasksDigest": "f9695b851790b1d5181118b70ba8df19552a7b24eed4757478f6663e32679b26",
  "evidenceDigest": "4b51c5fae180335dff799e35b52d294672ff96f37bb00b49763fd07964031745",
  "knownGaps": []
}
```
