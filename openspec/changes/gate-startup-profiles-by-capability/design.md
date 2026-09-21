## Context

Stable publication of `0.1.8` was dispatched on `2226c9d0` and failed on both Windows lanes. The failure is not a regression from any recent merge: the identical commit had published to the develop channel 17 minutes earlier with all six startup measurements passing, and the earlier stable attempt on `7d26554`, three days and several merges before, failed identically.

## Decisions

- **The product is correct and the gate is wrong.** `src/cli/capabilities.ts` documents the rule in one line — "The Pi comparison launch is a prerelease development instrument, not product" — and implements it as `developmentComparison: isPrereleaseVersion(version)`. `src/cli/dispatch.ts:133` answers `{ kind: "noop" }` for `pi` when the capability is absent, under a comment that reserved command spaces are "deliberately quiet". `bin/cli.js` derives capabilities from the packed `package.json` version precisely so "a released a1 cannot be argued into offering the development profiles". `a1-shell/spec.md` says "prerelease `a1 pi`" in its launch requirements. A stable candidate therefore exits `a1 pi` immediately, silently, and by design.
- **Why the failure was unreadable.** The gate reports `exact ${profileId} launch exited before first render: ${stderr}`, and the quiet no-op writes nothing to stderr, so the message ended at a bare colon. The measured evidence made the shape clear: `launch-observation-pi-post-update` failed after 125 ms, while every `a1` launch in the same test run passed its budget (post-update 1523 ms, no-live-supervisor 1095 ms, warm 906 ms).
- **Why the develop channel never caught it.** A develop publication packs a prerelease version, which advertises the comparison profile, so all six launches run and pass. Only a stable version reaches the contradiction, and stable publication had been attempted exactly twice.
- **Fix: select profiles by capability.** The gate now calls `cliCapabilities(candidate.manifest.version)` and measures the profiles that build advertises — the same input and the same function the packaged entry point uses, so the gate cannot drift from what the product exposes. The measurement-count assertion becomes `profiles.length * 3` rather than a literal 6.
- **Coverage increases rather than decreases.** Skipping the profile silently would leave the stable build's most important property untested, so the gate additionally proves that on a non-prerelease candidate `a1 pi` exits quietly without painting a frame and without writing diagnostics. The prerelease path is unchanged: both profiles, six measurements, the same budgets, lanes, and first-attempt enforcement.
- **Spec delta.** `a1-shell` required "both `a1` and `a1 pi`" to meet the budget on the release runner while its launch requirements made `a1 pi` prerelease-only. The delta makes the budget follow the advertised profiles and states the stable-candidate expectation, resolving the contradiction rather than relaxing a budget: every budget value, lane, and first-attempt rule is retained verbatim.

## Alternatives considered

- **Expose the comparison profile in stable builds.** Rejected: it contradicts `a1-shell/spec.md` and the stated intent that the Pi comparison launch is an instrument, not product, and it would ship a development surface to released users.
- **Drop `package-startup` from the stable validation scope.** Rejected: it removes first-attempt startup validation from the only channel whose spec requires failing on an overrun.

## Evidence

- Stable [35657941674](https://github.com/timurproko/a1/actions/runs/35657941674) on `2226c9d0`, win32-node24 and win32-node22: `launch-observation-pi-post-update` failed after 125 ms; the three `a1` measurements passed.
- Develop [35656329547](https://github.com/timurproko/a1/actions/runs/35656329547) on the same `2226c9d0`, win32-node24: all six launches passed, `pi` post-update at 1133 ms.
- Stable [35461216591](https://github.com/timurproko/a1/actions/runs/35461216591) on `7d26554`: the same phase failed with the same empty diagnostic.
- `test/cli/capabilities.test.ts` already asserts `cliCapabilities(version).developmentComparison` follows `isPrereleaseVersion`, so the contract the gate contradicted is covered at the unit level.
