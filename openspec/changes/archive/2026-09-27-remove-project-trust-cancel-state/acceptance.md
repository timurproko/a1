# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The trust selector presents Trust, Trust parent folder, Trust for this session only, Do not trust, and Do not trust for this session only, with arrow/Tab navigation and Enter selection.
- Current-folder trust or denial persists that decision; parent-folder trust persists the ancestor and clears a narrower current-folder entry; session-only outcomes affect only the current launch without changing the trust store.
- Escape preserves the restored parent-screen cursor and every prior row, emits no parent-buffer content, and lets the shell paint a new empty prompt.
- Escape exits successfully without saving trust, constructing project resources, starting the owned shell, reporting a crash, or flashing an intermediate restricted session.
- Ctrl+C does not dismiss the bare selector, while unavailable or failed interaction remains fail-closed and shows one warning above the bare-A1 prompt without entering transcript semantics.
- `a1 pi` offers the same trust outcomes while retaining its pinned top-left presentation, Escape/Ctrl+C cancellation, and startup-diagnostic placement.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-project-trust-cancel-state",
  "sourcePr": 593,
  "archive": "openspec/changes/archive/2026-09-27-remove-project-trust-cancel-state/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-remove-project-trust-cancel-state/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "fee508512099cc722167cf0744e231ab9c342501",
  "acceptanceScenarios": [
    "The trust selector presents Trust, Trust parent folder, Trust for this session only, Do not trust, and Do not trust for this session only, with arrow/Tab navigation and Enter selection.",
    "Current-folder trust or denial persists that decision; parent-folder trust persists the ancestor and clears a narrower current-folder entry; session-only outcomes affect only the current launch without changing the trust store.",
    "Escape preserves the restored parent-screen cursor and every prior row, emits no parent-buffer content, and lets the shell paint a new empty prompt.",
    "Escape exits successfully without saving trust, constructing project resources, starting the owned shell, reporting a crash, or flashing an intermediate restricted session.",
    "Ctrl+C does not dismiss the bare selector, while unavailable or failed interaction remains fail-closed and shows one warning above the bare-A1 prompt without entering transcript semantics.",
    "`a1 pi` offers the same trust outcomes while retaining its pinned top-left presentation, Escape/Ctrl+C cancellation, and startup-diagnostic placement."
  ],
  "archiveDigest": "2c9a3caf1b6a9fdc24dfb5d37e8d1af1987f6231cafd9bd056b7fd72b064c574",
  "specDigest": "a6547c7672a5dc8d0b51d3342f9cec337b842f58ef3e7627cd55c5b286bbd6ea",
  "tasksDigest": "47412243afb93f34960b755673bb5f8a63f83d21a5d792128c492fb03e5e2ebe",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
