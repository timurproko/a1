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
  "specBaseSha": "98631e3845d2a2820a6cb95762cb3eac41d61988",
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
  "archiveDigest": "7907fee5bc514af206f147b61d083db24b087950a8575addcc77d93d29cdf3fd",
  "specDigest": "54595150db5c1e639210035e4d1e69b77cf3fceb3acac4b091a20ba820a7c91c",
  "tasksDigest": "8a2316c30f7d247d5439787718788790bb3903bba719220103693ff6baa18505",
  "evidenceDigest": "a41a407c8261296740879c1ca8149679d119b0190f5985d34d52748db3ef9912",
  "knownGaps": []
}
```
