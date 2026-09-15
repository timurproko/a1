# Recorded implementation acceptance

Verdict: accepted. Archive preparation is not archive-PR integration.

Source PR: https://github.com/timurproko/a1/pull/413
Accepted head: f7eda035b083df3cc59e602101e2f01f792e022a
Implementation merge: f153df795c2ec759a0ed20579b2d14b6d595236c
Validation: https://github.com/timurproko/a1/actions/runs/34958483931
Acceptance: https://github.com/timurproko/a1/pull/414
Author: timurproko
Recorded: 2026-09-15T10:49:44Z

```openspec-acceptance-receipt
{
  "kind": "pull-request",
  "pr": 414,
  "head": "e91dac13b0d7162411d4429f18d31fe5c6320d3b",
  "merge": "f4e70dfacb1a537108a3c2fe92790dd940c940f0",
  "path": "openspec/acceptance/make-acceptance-checklist-authoritative/f7eda035b083df3cc59e602101e2f01f792e022a.json",
  "digest": "06b13f9ae6660f2d459aedbd3424ad09d4221b7bfa57b3b7254f934f7fe63521",
  "author": "timurproko",
  "createdAt": "2026-09-15T10:49:44Z",
  "checklistDigest": "9725dffd414afd7a9e5e58de142e31b86bb4a60fde5b68fa85fff55ab84592ea",
  "checks": [
    "Generated acceptance PRs show the implementation as plain reference text followed by one to three unique behavior checks from its reviewed handoff.",
    "Checking every exact behavior item and manually merging creates the receipt and continues archival without JSON edits despite pending source-task bookkeeping.",
    "Modified, generic, reused, stale, automatically merged, or unauthorized acceptance stays blocked while an exact checked legacy receipt such as PR 412 becomes eligible."
  ]
}
```

Accepted implementation checks:
- Generated acceptance PRs show the implementation as plain reference text followed by one to three unique behavior checks from its reviewed handoff.
- Checking every exact behavior item and manually merging creates the receipt and continues archival without JSON edits despite pending source-task bookkeeping.
- Modified, generic, reused, stale, automatically merged, or unauthorized acceptance stays blocked while an exact checked legacy receipt such as PR 412 becomes eligible.

Original internal source-binding request:

```json
{
  "version": 2,
  "repository": "timurproko/a1",
  "change": "make-acceptance-checklist-authoritative",
  "sourcePr": 413,
  "sourceHead": "f7eda035b083df3cc59e602101e2f01f792e022a",
  "sourceMerge": "f153df795c2ec759a0ed20579b2d14b6d595236c",
  "sourceBodyDigest": "b7ee65434998c126b5d0bbf97f71f7718a81951cffb2037deaf2efdbd3ce7b4a",
  "artifactDigest": "3762ed10c0cd95c83c18c459f54841b2c0f11d34ca4450738a4ac4dccfa2036a",
  "specBaseSha": "c96ee9b3dd091e1cb863a86bbcf4876db016af4c",
  "acceptanceChecks": [
    "Generated acceptance PRs show the implementation as plain reference text followed by one to three unique behavior checks from its reviewed handoff.",
    "Checking every exact behavior item and manually merging creates the receipt and continues archival without JSON edits despite pending source-task bookkeeping.",
    "Modified, generic, reused, stale, automatically merged, or unauthorized acceptance stays blocked while an exact checked legacy receipt such as PR 412 becomes eligible."
  ],
  "validation": {
    "runId": 34958483931,
    "headSha": "f7eda035b083df3cc59e602101e2f01f792e022a",
    "checkedSha": "f7eda035b083df3cc59e602101e2f01f792e022a",
    "attempt": 1
  },
  "tasks": [
    {
      "id": "1.1",
      "done": true,
      "text": "Add a reviewed implementation-PR `Acceptance checks` contract limited to one through three concise behavior-and-result scenarios; verify missing, oversized, duplicate, generic, and unrelated exactly reused checks fail closed.",
      "digest": "99db9ec95702e75a823b0ef405655f322720b64dd738366c5a1a0e89f9b0d737",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "1.2",
      "done": true,
      "text": "Render the implementation PR as plain reference text followed only by those unchecked scenarios; verify no reference, CI, generic gap, approval, archive, source-task, or automated-test checkbox is generated.",
      "digest": "2b8482602594ecf7c30e10e9b7c52915ee3aa307dd075ce1b47cc31ef95171fe",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "1.3",
      "done": true,
      "text": "Add strict unchecked/all-checked body parsing and verify missing, extra, reordered, renamed, duplicated, replaced, partially checked, and extra-prose bodies fail closed.",
      "digest": "a3c9b28373a0fcd7d94690ef6dd943c5d680e7d4ea9da108b55440a3c987afe4",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.1",
      "done": true,
      "text": "Make the exact all-checked implementation scenarios plus authorized human manual merge the human acceptance evidence; verify bot, automatic, merge-queue, unauthorized, unmerged, and unchecked paths remain rejected.",
      "digest": "a258979d1d6fc6f5438a595fc102e7103432bdf79bb34658aa6dd712518a9bda",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.2",
      "done": true,
      "text": "Keep source and acceptance CI, implementation/head/merge identity, diff scope, ancestry, and machine record binding independently enforced; verify checkmarks cannot override objective failures or stale identities.",
      "digest": "9c48340d5d893be73d4d483053831fa9fdc9cb31030d7089d44cbbb0942a1091",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.3",
      "done": true,
      "text": "Bind final checklist digest and scenario text with merge provenance into retained acceptance receipts; verify archive validation, already-archived checks, and local cleanup consume the same evidence without maintainer JSON edits.",
      "digest": "52468d3da5b3e5e3bd57d29dd291b6b8e3c0f6a02b51f51bb8a19e87d6f5c6ae",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.1",
      "done": true,
      "text": "Reconcile remaining non-mechanical source tasks in the staged archived copy from a verified scenario receipt while preserving original task/record provenance; verify archive-preparation tasks remain operation-bound.",
      "digest": "9b5c2d330505e310c6145b4b5aabe6419da0b6479b35132eee6ed423922be7b7",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.2",
      "done": true,
      "text": "Select acceptance records by exact implementation head and preserve other historical heads; verify same-head duplicates/conflicts block while a #412-shaped checked merged record becomes eligible after deployment.",
      "digest": "f4fa035c8d55cff1cab2035c6bd173c32bef43b69df0d677657e9526503c8a96",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.3",
      "done": true,
      "text": "Verify an exact checked manual acceptance merge automatically enters conservative spec synchronization and archive publication without another acceptance action or archive command.",
      "digest": "1a98f9404c99decc7b1482906a0b801813b7d1c8de9b286e30d7290559f1ac8b",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.1",
      "done": true,
      "text": "Update delivery guidance and the archive runbook to require one to three implementation-specific checks, a plain implementation reference, and manual merge as approval; verify they prohibit generic repetitive lists and maintainer JSON work.",
      "digest": "e637f7332ed018a5e251fc4520e073ee1984a8af1b768384200c9996a426fc02",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.2",
      "done": true,
      "text": "Add focused adversarial policy, publication, receipt, archive-staging, workflow, and cleanup fixtures for curated checklist authority, anti-repetition, and historical-record behavior.",
      "digest": "e313c5c23ba41c737b8448157f4bbc8af9e129a74ea537030d1064e72329616a",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.3",
      "done": true,
      "text": "Run typecheck, applicable governance checks, focused tests, strict OpenSpec validation, and whitespace checks; record actual outcomes without claiming a full local fast/full/release run.",
      "digest": "a9778c989a133fddb744631e784891b487ae856bd338326112e852398a4fe2eb",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.4",
      "done": true,
      "text": "Push the completed implementation ready for normal current-head PR CI, report its exact result, and hand off the implementation-specific behavior for maintainer review without enabling auto-merge.",
      "digest": "d1dd5fee7dc758b94881d33a86d46c916a8c54e2e3a33945e0983c8c528d55e6",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "5.1",
      "done": false,
      "text": "Record verified implementation acceptance and merge evidence for archive preparation.",
      "digest": "a6ee63f6facd731565bb635f06286020e929c9876c2046aee0bcd96aa6220f6b",
      "completion": "archive-preparation",
      "evidence": []
    },
    {
      "id": "5.2",
      "done": false,
      "text": "Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.",
      "digest": "d9dd71d3697e9cc99b093ba65f0d6ef331d4cb192d55322886b702f40ef8ebc0",
      "completion": "archive-preparation",
      "evidence": []
    }
  ],
  "review": {
    "decision": "accept-on-manual-merge",
    "evidence": [
      {
        "url": "https://github.com/timurproko/a1/blob/f7eda035b083df3cc59e602101e2f01f792e022a/openspec/changes/make-acceptance-checklist-authoritative/implementation-evidence.md",
        "outcome": "Recorded source evidence; review its actual outcomes and limitations before accepting."
      }
    ],
    "gaps": []
  }
}

```
