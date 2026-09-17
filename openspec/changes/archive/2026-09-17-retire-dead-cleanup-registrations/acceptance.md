# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A released registration whose evidence cannot verify but whose worktree, Git row, and local ref are gone is retired by the next sweep as `retired-nothing-left` once its PR is merged and never evaluated again; a present ref or an unmerged PR keeps it blocked with nothing deleted.
- `forget --id --confirm-nothing-left` records an all-absent released entry as `forgotten` without reading GitHub, and refuses while a path, live Git row, or ref remains or the entry is owned.
- The develop ruleset definition requires an up-to-date base, so after the maintainer applies it a PR whose base advanced shows `BEHIND` and must be updated, re-finalized, and revalidated before merge.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "retire-dead-cleanup-registrations",
  "sourcePr": 464,
  "archive": "openspec/changes/archive/2026-09-17-retire-dead-cleanup-registrations/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-retire-dead-cleanup-registrations/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "fb1dd7ba8ad0b6c03321a412d3be6a5406a3175a",
  "acceptanceScenarios": [
    "A released registration whose evidence cannot verify but whose worktree, Git row, and local ref are gone is retired by the next sweep as `retired-nothing-left` once its PR is merged and never evaluated again; a present ref or an unmerged PR keeps it blocked with nothing deleted.",
    "`forget --id --confirm-nothing-left` records an all-absent released entry as `forgotten` without reading GitHub, and refuses while a path, live Git row, or ref remains or the entry is owned.",
    "The develop ruleset definition requires an up-to-date base, so after the maintainer applies it a PR whose base advanced shows `BEHIND` and must be updated, re-finalized, and revalidated before merge."
  ],
  "archiveDigest": "2f5a0669b724316ac2cab1420a5f3d113909d4de8ef11c3a1ea55f034736467b",
  "specDigest": "18ceff9bdb2389a64405375a72b1b101a507984f506bf4e5c317fb4c9015da35",
  "tasksDigest": "4cb2dc2a560782bef68cc2a92eef2aad64ca1cc6415b3d6249a7c7d1a89ab72b",
  "evidenceDigest": "92bc357134a9b2f2b082017259d8705cd0c8ef67668bfd5fb5498c7c2e8f7af4",
  "knownGaps": []
}
```
