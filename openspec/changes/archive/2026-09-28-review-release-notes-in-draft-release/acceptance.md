# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Preparation from clean synchronized `develop` creates or exactly reuses one source-bound draft Release and creates no PR, tag, package, public Release, or publication dispatch.
- `--approve` requires an authenticated human with write-level repository authority; the workflow independently verifies actor, source, stable target, draft database ID/state, normalized body, and SHA-256 before snapshotting one immutable artifact.
- Stable package assembly overlays the snapshot on committed history, enforces 128 KiB per-note and 1 MiB catalog bounds, and proves the packaged stable body equals the approved source without runtime network access.
- npm verification precedes the immutable tag, asset, `master`, and final Release; the Release publication is the last completion mutation and verifies the exact approved body.
- The manually merged reopening PR contains only next-development version declarations plus the exact approved `docs/releases/x.y.z.md` snapshot.
- Current and renamed-from `docs/releases/**` paths are ineligible for documentation auto-merge, reproducing and closing the PR #615 route.
- Disposable-Git release fixtures cover edited draft publication, stale/ambiguous authority, unauthorized/App actors, exact retries, interrupted completion, bot merge refusal, and reopening persistence; all 44 focused cases pass.
- Fast validation, package smoke, build, typecheck, architecture, documentation governance, YAML parsing, and strict OpenSpec validation pass locally.
- Finalized exact-head CI must pass, including Defender-enabled Windows package-startup evidence; no local Defender prerequisite is bypassed.
- After manual merge, the first live `0.2.2` preparation/approval is the production acceptance exercise; it must not be retried from this unmerged candidate.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "review-release-notes-in-draft-release",
  "sourcePr": 617,
  "archive": "openspec/changes/archive/2026-09-28-review-release-notes-in-draft-release/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-28-review-release-notes-in-draft-release/acceptance.md",
  "finalizedDate": "2026-09-28",
  "specBaseSha": "be0668bbfc2b879d6a4aed39d1347d4b0eaa2f53",
  "acceptanceScenarios": [
    "Preparation from clean synchronized `develop` creates or exactly reuses one source-bound draft Release and creates no PR, tag, package, public Release, or publication dispatch.",
    "`--approve` requires an authenticated human with write-level repository authority; the workflow independently verifies actor, source, stable target, draft database ID/state, normalized body, and SHA-256 before snapshotting one immutable artifact.",
    "Stable package assembly overlays the snapshot on committed history, enforces 128 KiB per-note and 1 MiB catalog bounds, and proves the packaged stable body equals the approved source without runtime network access.",
    "npm verification precedes the immutable tag, asset, `master`, and final Release; the Release publication is the last completion mutation and verifies the exact approved body.",
    "The manually merged reopening PR contains only next-development version declarations plus the exact approved `docs/releases/x.y.z.md` snapshot.",
    "Current and renamed-from `docs/releases/**` paths are ineligible for documentation auto-merge, reproducing and closing the PR #615 route.",
    "Disposable-Git release fixtures cover edited draft publication, stale/ambiguous authority, unauthorized/App actors, exact retries, interrupted completion, bot merge refusal, and reopening persistence; all 44 focused cases pass.",
    "Fast validation, package smoke, build, typecheck, architecture, documentation governance, YAML parsing, and strict OpenSpec validation pass locally.",
    "Finalized exact-head CI must pass, including Defender-enabled Windows package-startup evidence; no local Defender prerequisite is bypassed.",
    "After manual merge, the first live `0.2.2` preparation/approval is the production acceptance exercise; it must not be retried from this unmerged candidate."
  ],
  "archiveDigest": "8a81d2bc4c2cc83106166a54a6925891d6505f05d5799c31f639e8c957418ecd",
  "specDigest": "159691c6d7bc2438c54ad51eb54c03689ee5d1c156f270171fb09d7779c1a63a",
  "tasksDigest": "974aa49c461988877bae5fb10f5cd0632062ad57ff679aedbc8d04106456e99d",
  "evidenceDigest": "6a8ed33f9e8a07a2bf65938a50d6a7e6e66303a7e1079a89e5a22f81ec9b44f7",
  "knownGaps": []
}
```
