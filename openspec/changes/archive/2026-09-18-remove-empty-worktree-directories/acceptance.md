# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- An execution pass removes an unregistered `.worktrees/` directory only when it is a real directory with no Git worktree row, holds only directories at every depth, and is over ten minutes old, reporting `removed (empty-directory)` and naming it in the sweep lines.
- A directory holding any file, link, or `.git` entry, one younger than the grace, or a path Git still lists stays `unmanaged` untouched; preview reports `unmanaged (empty-directory)` and deletes nothing.
- A directory still held open reports `blocked (empty-directory-locked)`, keeps its tree, and is removed by the next pass after release; removal uses only non-recursive `rmdir`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-empty-worktree-directories",
  "sourcePr": 492,
  "archive": "openspec/changes/archive/2026-09-18-remove-empty-worktree-directories/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-remove-empty-worktree-directories/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "9059bbb23d8e28391edc51e11e9bfc08b0643c6f",
  "acceptanceScenarios": [
    "An execution pass removes an unregistered `.worktrees/` directory only when it is a real directory with no Git worktree row, holds only directories at every depth, and is over ten minutes old, reporting `removed (empty-directory)` and naming it in the sweep lines.",
    "A directory holding any file, link, or `.git` entry, one younger than the grace, or a path Git still lists stays `unmanaged` untouched; preview reports `unmanaged (empty-directory)` and deletes nothing.",
    "A directory still held open reports `blocked (empty-directory-locked)`, keeps its tree, and is removed by the next pass after release; removal uses only non-recursive `rmdir`."
  ],
  "archiveDigest": "785a827693916fb7323ac41e54ac7fab1ece9ae794ed738c4df3b28afff7e015",
  "specDigest": "8941f2a3af46675a8c1deb7c8c5d7d0ea48ebd6ea98f338290daad3143205267",
  "tasksDigest": "84353c6ec3135081d37bde567709dd5dafd0999caf898fe222168aaaf296c2d5",
  "evidenceDigest": "bfb22381fc7b0a8c270918c797da21b59eac973cb1cc25d5ac736f6d018015a8",
  "knownGaps": []
}
```
