# Acceptance: stabilize-resource-sensitive-validation

## Verdict

**Accepted by the maintainer on 2026-09-11.** After reporting that the development release was published and installed/updated successfully, the maintainer was explicitly asked whether they accepted validation correction PR #290 so this change could be recorded and archived, without accepting the separate UI/visual checks. Their response was: **"yes record and archive it"**.

This acceptance covers the resource-sensitive validation correction and the reported update to `0.1.8-dev.290`. It does not certify the pending image-paste, selection, prompt-suggestion, or streaming visual acceptance requirements in other changes. Acceptance is recorded after the merge and publication; this record does not invent an earlier physical-test verdict.

## Implementation and integration

- Initial implementation: [PR #218](https://github.com/timurproko/a1/pull/218), merge `fd66bdc6fcf2f32415f958af93f05b63abab20fe`.
- Accepted correction: [PR #290](https://github.com/timurproko/a1/pull/290), final head `9a2af73a5c754cf10485dfdc61cc95c1553fd816`, merge `f85df1bc5e51e916b3865bda0d12a0c278e68c8c` on 2026-09-11.
- Final-head [CI run 34571948531](https://github.com/timurproko/a1/actions/runs/34571948531) passed all required checks, including ordinary and serialized resource-sensitive fast partitions. The resource-sensitive partition passed all 55 tests at its unchanged five-second timeout. Windows Node 22/24 startup and Linux/macOS containment also passed.
- The initial-head inventory failure in run `34571406766` is retained in `tasks.md`. Its four stale source locations were corrected in a new commit; the failed commit was not rerun or converted to success.
- Local evidence recorded in the PR includes three fail-fast resource-sensitive executions, with maximum test-body duration 1075.7543 ms, and 36 focused inventory/governance/cohort tests after the inventory correction. No local fast/full/release tier was run.

## First-attempt exact-package publication

`npm run develop` was requested once from authoritative source `f85df1bc5e51e916b3865bda0d12a0c278e68c8c`.

[Release run 34574095821](https://github.com/timurproko/a1/actions/runs/34574095821), **attempt 1**, completed successfully:

| Gate | Result | Job |
| --- | --- | --- |
| Windows Node 22 | Success | [103183142751](https://github.com/timurproko/a1/actions/runs/34574095821/job/103183142751) |
| Windows Node 24 | Success | [103183142757](https://github.com/timurproko/a1/actions/runs/34574095821/job/103183142757) |
| macOS Node 24 | Success | [103183142746](https://github.com/timurproko/a1/actions/runs/34574095821/job/103183142746) |
| Linux Node 24 | Success | [103183142873](https://github.com/timurproko/a1/actions/runs/34574095821/job/103183142873) |
| Publish to npm `next` | Success | [103184500902](https://github.com/timurproko/a1/actions/runs/34574095821/job/103184500902) |
| Publication result | Success | [103184590671](https://github.com/timurproko/a1/actions/runs/34574095821/job/103184590671) |

The earlier failing preview-289 verification remains historical incident evidence. This accepted preview's successful first attempt does not claim all future hosted execution is incapable of failure.

## Registry and byte identity

Verified on 2026-09-11 from npm metadata and by downloading and hashing the registry tarball without installing or rebuilding it:

- Package: `@timurproko/a1@0.1.8-dev.290`
- Tarball: `https://registry.npmjs.org/@timurproko/a1/-/a1-0.1.8-dev.290.tgz`
- Tarball size: `1158186` bytes
- SHA-256: `acaaddaa92e0e006f061001df7fcbf304952574c524fcc327422f5a29d8a059b`
- npm SHA-1: `b353b8eff0c8cc3126e681e23cb13b6d8b318b60`
- npm integrity: `sha512-4IWBk5uKjyMmg1dBIsQQVRgDSpYKAP7oMoEJf+ft8Z6+SULf/2vSX+lfdzeczPSaehQIYmPDsl0qa8G9FvCKzg==`
- The downloaded bytes match registry integrity, and the publication job records that same expected integrity for its validated candidate and post-publication verification.
- Observed dist-tags: `next=0.1.8-dev.290`; stable `latest=0.1.7` remains unchanged.

## Archive prerequisite

Acceptance is complete, but archiving is mechanically blocked: `test/repository-governance/resource-sensitive-validation.test.ts` reads both historical evidence JSON files from the active change directory (lines 142 and 162 at merge `8b06eeec3f613b6f438082019d2a122e004fb179`). Moving the change without adapting that consumer would cause missing-file test failures.

Keep the change and its evidence in place until a separately reviewed code PR makes this consumer archive-safe while preserving every evidence assertion and failing on missing or ambiguous evidence. Do not duplicate evidence under a phantom active change or weaken the test. After that prerequisite merges, synchronize both delta specs and archive in an OpenSpec-only follow-up, then clean up retained worktrees after the archive integrates. This prerequisite does not reopen the accepted validation correction or grant acceptance to another change.
