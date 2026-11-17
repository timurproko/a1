# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A planner publishing from outside a checkout creates only the selected change artifacts and an unchecked draft; retrying a lost response reuses the same branch and PR, while a stale expected head preserves existing remote work.
- With compatible A1 support, resuming an existing proposal retains its branch history and owned dirty edits; a failed attachment or foreign live owner prevents implementation edits without falling back to primary or running dependency setup.
- An explicitly requested local removal accepts an equal or descendant published remote tip even for an unfinished draft, removes only the named safe checkout, and retains local branch refs and remote resources; dirty, ignored/private, KEEP, nested, linked or newly owned content remains intact.
- Implementation progress can be recorded locally without a push barrier or invented outcomes; delivery-hold pauses controller mutations, and releasing it re-evaluates the current snapshot or archived draft without recreating active artifacts or inferring acceptance.
- Ordinary README documentation retains its independently verified automation route, but authority-changing docs and renamed agent instructions remain ineligible; release-reopening automation continues only through its existing release-specific eligibility checks.
- Changing a finalized candidate head, base, body or acceptance list invalidates previous integration authority; a missing fresh maintainer request or unverifiable human arm produces a blocker without bot fallback, unrelated-arm cancellation, waiting or queued integration.
- A new planning-only publication rejects implementation files and completed implementation tasks before remote mutation; approved auxiliary planning/contract artifacts and retry recovery remain supported.
- A competing A1 attachment cannot acquire a cleanup target during journal/purge/removal, including a holder suspended beyond ten seconds or killed while a destructive child survives; uncertain descendants retain exclusion.
- Both local removal and merged completion retain a recreated checkout or newly published HEAD after pre-detach approval, including changes after command launch; missing snapshot-aware runtime/adapter support retains the attachment instead of substituting another cleanup.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-change-delivery",
  "sourcePr": 923,
  "archive": "openspec/changes/archive/2026-11-14-simplify-change-delivery/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-simplify-change-delivery/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "a8fcf44b5ff573798c386236229de3347c942793",
  "acceptanceScenarios": [
    "A planner publishing from outside a checkout creates only the selected change artifacts and an unchecked draft; retrying a lost response reuses the same branch and PR, while a stale expected head preserves existing remote work.",
    "With compatible A1 support, resuming an existing proposal retains its branch history and owned dirty edits; a failed attachment or foreign live owner prevents implementation edits without falling back to primary or running dependency setup.",
    "An explicitly requested local removal accepts an equal or descendant published remote tip even for an unfinished draft, removes only the named safe checkout, and retains local branch refs and remote resources; dirty, ignored/private, KEEP, nested, linked or newly owned content remains intact.",
    "Implementation progress can be recorded locally without a push barrier or invented outcomes; delivery-hold pauses controller mutations, and releasing it re-evaluates the current snapshot or archived draft without recreating active artifacts or inferring acceptance.",
    "Ordinary README documentation retains its independently verified automation route, but authority-changing docs and renamed agent instructions remain ineligible; release-reopening automation continues only through its existing release-specific eligibility checks.",
    "Changing a finalized candidate head, base, body or acceptance list invalidates previous integration authority; a missing fresh maintainer request or unverifiable human arm produces a blocker without bot fallback, unrelated-arm cancellation, waiting or queued integration.",
    "A new planning-only publication rejects implementation files and completed implementation tasks before remote mutation; approved auxiliary planning/contract artifacts and retry recovery remain supported.",
    "A competing A1 attachment cannot acquire a cleanup target during journal/purge/removal, including a holder suspended beyond ten seconds or killed while a destructive child survives; uncertain descendants retain exclusion.",
    "Both local removal and merged completion retain a recreated checkout or newly published HEAD after pre-detach approval, including changes after command launch; missing snapshot-aware runtime/adapter support retains the attachment instead of substituting another cleanup."
  ],
  "archiveDigest": "04e9981664e07471ce74e8edf91e8897ea24b1a2a80fbd6d828254547f0d6e9e",
  "specDigest": "5648241e0580ade792509303d13aee87cfd7e78cdb042720a042e5a6c25b995b",
  "tasksDigest": "8a2316c30f7d247d5439787718788790bb3903bba719220103693ff6baa18505",
  "evidenceDigest": "490b1be38dfbdc222d6057527a6363772226269efe463d8518071dd8783d655e",
  "knownGaps": []
}
```
