# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The resource job's outcome artifact shows one `vitest-fast-resource-sensitive` invocation carrying every selected file with `--testTimeout=30000`, and the build is skipped as `verified-existing-build`.
- The cleanup suite completes in one concurrent `node --test` child well under its 180 s bound, and a resume readiness failure names the startup phases reached.
- No resource-sensitive, cleanup, or resume timeout failure appears on a pull request whose head later passed unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resource-partition-speed",
  "sourcePr": 454,
  "archive": "openspec/changes/archive/2026-09-17-resource-partition-speed/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-resource-partition-speed/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "394066930b6727ad3fc6174dd11ebbe68ddfd552",
  "acceptanceScenarios": [
    "The resource job's outcome artifact shows one `vitest-fast-resource-sensitive` invocation carrying every selected file with `--testTimeout=30000`, and the build is skipped as `verified-existing-build`.",
    "The cleanup suite completes in one concurrent `node --test` child well under its 180 s bound, and a resume readiness failure names the startup phases reached.",
    "No resource-sensitive, cleanup, or resume timeout failure appears on a pull request whose head later passed unchanged."
  ],
  "archiveDigest": "379ed749e64485ba76e63a4335c9c744ce976fa1776c0ad64e53501d22d109d3",
  "specDigest": "5918ac5146d5c7fdf2559dfec210023bd8c4435cdf39c5929a5199ffa37620a1",
  "tasksDigest": "d618326b4852cbfbc7899d6d674001faeca7fa7df87094800c8c2529bcabcbeb",
  "evidenceDigest": "1dda67375ee98e27e69ab3d178de162225e0aacf3fb346259860bd5c5609bc64",
  "knownGaps": []
}
```
