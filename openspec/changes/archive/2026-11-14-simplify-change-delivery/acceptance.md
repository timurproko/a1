# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A planner publishing from outside a checkout creates only the selected change artifacts and an unchecked draft; retrying a lost response reuses the same branch and PR, while a stale expected head preserves existing remote work.
- With compatible A1 support, resuming an existing proposal retains its branch history and owned dirty edits; a failed attachment or foreign live owner prevents implementation edits without falling back to primary or running dependency setup.
- An explicitly requested local removal accepts an equal or descendant published remote tip even for an unfinished draft, removes only the named safe checkout, and retains local branch refs and remote resources; dirty, ignored/private, KEEP, nested, linked or newly owned content remains intact.
- Implementation progress can be recorded locally without a push barrier or invented outcomes; delivery-hold pauses controller mutations, and releasing it re-evaluates the current snapshot or archived draft without recreating active artifacts or inferring acceptance.
- Ordinary README documentation retains its independently verified automation route, but authority-changing docs and renamed agent instructions remain ineligible; release-reopening automation continues only through its existing release-specific eligibility checks.
- Changing a finalized candidate head, base, body or acceptance list invalidates previous integration authority; a missing fresh maintainer request or unverifiable human arm produces a blocker without bot fallback, unrelated-arm cancellation, waiting or queued integration.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-change-delivery",
  "sourcePr": 923,
  "archive": "openspec/changes/archive/2026-11-14-simplify-change-delivery/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-simplify-change-delivery/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "82d030bf4ca4ec5f92785ade04f5317bc9815658",
  "acceptanceScenarios": [
    "A planner publishing from outside a checkout creates only the selected change artifacts and an unchecked draft; retrying a lost response reuses the same branch and PR, while a stale expected head preserves existing remote work.",
    "With compatible A1 support, resuming an existing proposal retains its branch history and owned dirty edits; a failed attachment or foreign live owner prevents implementation edits without falling back to primary or running dependency setup.",
    "An explicitly requested local removal accepts an equal or descendant published remote tip even for an unfinished draft, removes only the named safe checkout, and retains local branch refs and remote resources; dirty, ignored/private, KEEP, nested, linked or newly owned content remains intact.",
    "Implementation progress can be recorded locally without a push barrier or invented outcomes; delivery-hold pauses controller mutations, and releasing it re-evaluates the current snapshot or archived draft without recreating active artifacts or inferring acceptance.",
    "Ordinary README documentation retains its independently verified automation route, but authority-changing docs and renamed agent instructions remain ineligible; release-reopening automation continues only through its existing release-specific eligibility checks.",
    "Changing a finalized candidate head, base, body or acceptance list invalidates previous integration authority; a missing fresh maintainer request or unverifiable human arm produces a blocker without bot fallback, unrelated-arm cancellation, waiting or queued integration."
  ],
  "archiveDigest": "47b881bc5d511f2973f12f790c5477366bd7690af33a6c454bab2914368ecef8",
  "specDigest": "54595150db5c1e639210035e4d1e69b77cf3fceb3acac4b091a20ba820a7c91c",
  "tasksDigest": "8a2316c30f7d247d5439787718788790bb3903bba719220103693ff6baa18505",
  "evidenceDigest": "2d6f5cbdeb34aaa00155edfae900999bd4abe14678b2e12cf57f3a747c949464",
  "knownGaps": []
}
```
