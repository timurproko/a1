# CI and release operations

GitHub Actions is the only automation platform. Two required checks protect the branches:

| Branch | Required check | Produced by |
| --- | --- | --- |
| `develop` | `Development validation required` | `.github/workflows/ci.yml` |
| `master` | `Stable candidate required` | `.github/workflows/certify-stable.yml` |

These are job display names. If you rename one, update the ruleset definition, this runbook, and the live ruleset together.

## How much validation runs when

| Change | Validation |
| --- | --- |
| Docs or specs only | OpenSpec strict lint, nothing else |
| Any code PR into `develop` | Fast tier: typecheck, architecture checks, unit/contract tests |
| Preview candidate (`next`) | Fast tier + package gates: content, clean install, dependency policy |
| Stable candidate (`latest`) | Complete suite on Windows, Linux, and macOS + physical evidence |

Need more coverage for a risky preview? Dispatch the candidate with `full: true`, or run the **Full regression** workflow on demand.

## Publish a preview to npm `next`

1. Make sure `Development validation required` is green on the `develop` tip.
2. Dispatch **Build npm next candidate** with the exact commit and `confirm_candidate=build-uncertified-next-candidate`.
3. Check the resulting `candidate-evidence.json`: gates passed, package integrity matches.
4. Approve the `npm-next` environment and dispatch **Publish npm next** with the candidate run id.

The publisher uploads the exact validated tarball — it never rebuilds. Candidates expire after 14 days; an expired or mismatched artifact means building a new candidate, not patching the old one.

## Publish a stable release to npm `latest`

1. Commit the final version to `develop` (clean tree, version not yet on the registry).
2. Dispatch **Build stable candidate** — it packs once and validates the same bytes on all three platforms.
3. Dispatch **Certify stable physical platforms** on the dedicated isolated workers (they set `PHYSICAL_WORKER_ISOLATED=true` and run under the `stable-physical` environment). Never run physical host probes on a developer workstation.
4. Dispatch **Certify stable candidate** with both run ids. `Stable candidate required` passes only when every verdict binds the same commit, version, and digest.
5. Merge that exact commit to `master`, tag it `v<version>`, and dispatch **Publish npm stable**, then approve `npm-stable`.

Stable artifacts expire after 30 days. The same rule as previews applies: publication still requires exact certified bytes. Never upload locally rebuilt bytes, and never route around certification by rebuilding inside a publisher.

## When something fails

- **PR validation fails:** fix the code and push. Do not mark a failed tier optional.
- **Candidate validation fails:** discard the candidate and build a new one after the fix.
- **Physical worker fails:** fix or replace the worker, then rerun the full physical evidence for the candidate.
- **Publisher fails before npm accepted the bytes:** diagnose and retry with the same candidate while it is unexpired and the version is still unpublished.
- **Publisher is uncertain after npm accepted the bytes:** stop. Check the registry for the version, tag, and digest. Repair a dist-tag only as a separate reviewed operation — never republish.

## Why the rulesets look the way they do

One person maintains this repository, and GitHub does not let a PR author approve their own PR. Requiring even one approval would therefore deadlock the authorized solo-maintainer path — no PR could ever merge. So both rulesets require a pull request, a green required check, and resolved review threads, but set required approving reviews to zero.

- `develop` does not require the branch to be up to date: once a PR is approved and green, it merges even if unrelated work landed first — no re-validation loop.
- `master` does require it: a stable promotion always validates the exact final state.

If a second maintainer joins, raise the approval count. Do not add a direct-push bypass as a shortcut, and never weaken the force-push or deletion protection.

Ruleset mutation is a separate administrative operation: run `node scripts/check-github-rulesets.mjs` to see the diff, and apply only when a maintainer explicitly confirms with `--apply --confirm apply-a1-ci-rulesets`.
