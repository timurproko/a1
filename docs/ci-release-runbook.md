# CI and release operations

This runbook is the operational source for scoped development validation, immutable npm candidates, stable certification, and branch enforcement. GitHub Actions is the only automation platform.

## Stable status names

Repository rules use job display names, not internal job keys. Keep these names stable:

| Protected flow | Required check | Producer |
| --- | --- | --- |
| Pull request into `develop` | `Development validation required` | `.github/workflows/ci.yml` |
| Accepted `develop` commit | `Development validation required` | `.github/workflows/ci.yml` push run |
| Promotion into `master` | `Stable candidate required` | `.github/workflows/certify-stable.yml` |

Matrix and tier job names are implementation details. Change a required name only by updating the reviewable ruleset definition, its governance tests, this runbook, and the live ruleset together.

## Validation selection

Validation is proportionate to the change and the channel:

- A change entirely under `docs/**`, `openspec/**`, Markdown files, `LICENSE`, or `.gitignore` runs only strict OpenSpec validation. It does not alter product bytes, so typecheck, build, runtime, integration, package, audit, and release gates do not apply.
- Any other pull request runs the fast tier: typecheck, architecture checks, and the unit/contract vitest remainder.
- Preview (`next`) candidates add the exact-package gates: package content, clean install, and dependency policy.
- Only stable (`latest`) certification runs the complete suite (`full-release`) across the supported-platform matrix.

An authorized `full: true` dispatch may widen preview validation to the complete non-physical suite but cannot suppress required tiers. Manually dispatched **Full regression** remains the on-demand backstop when a change feels risky.

## Preview candidate and `next` publication

1. Confirm `Development validation required` is green for the exact `develop` tip.
2. Dispatch **Build npm next candidate** on `develop` with the exact source commit and `confirm_candidate=build-uncertified-next-candidate`. It runs the fast tier, architecture checks, and exact-package gates. Use `full: true` whenever that coverage is not sufficient for the release decision.
3. Review `candidate-evidence.json`, selected scopes, gate outcomes, package integrity, and source tree. The candidate remains explicitly stable-ineligible.
4. Approve the protected `npm-next` environment and dispatch **Publish npm next** with the successful candidate run id and `confirm_next=publish-certified-next`.
5. The publisher downloads and verifies the certified tarball, then publishes those bytes without checkout, installation, build, or tests. Verify its registry digest and `next` tag result.

Preview candidates expire after 14 days. An expired, missing, failed, or mismatched artifact is never reconstructed in the publisher. Build and certify a new candidate.

## Stable candidate, physical evidence, and `latest` publication

1. Commit the final non-prerelease version to `develop`. Confirm it is clean, registry-unpublished, and `v<package-version>` is the intended tag.
2. Dispatch **Build stable candidate** on that exact `develop` commit with `confirm_candidate=build-stable-candidate`. It packs once on Windows and fans the same verified digest to Windows, Linux, and macOS complete automated validation and clean installation.
3. Review the `Stable automated candidate` artifact. It is not stable-eligible; physical evidence is still required.
4. On dedicated isolated workers only, dispatch **Certify stable physical platforms** for the same source and automated-candidate run with `confirm_isolated=run-isolated-physical-certification`. Workers must carry `self-hosted`, `a1-physical`, and platform-specific labels, set `PHYSICAL_WORKER_ISOLATED=true`, and be protected by the `stable-physical` environment. Never run physical host probes on a developer workstation or ordinary hosted runner.
5. Dispatch **Certify stable candidate** with the successful automated and physical run ids and `confirm_certification=certify-stable-candidate`. `Stable candidate required` passes only when all three automated and all three isolated physical verdicts bind the same commit, tree, version, integrity, and shasum.
6. Promote that exact commit to `master` without source or package changes and create `v<version>` at the same commit. The protected `master` rule requires the existing `Stable candidate required` check on that commit.
7. Dispatch **Publish npm stable** on the tag with the certification run id and `confirm_stable=publish-certified-stable-latest`, then approve `npm-stable`. It requires the current `master` and tag to equal the certified source, confirms the version is unpublished, publishes the exact tarball to `latest` with provenance, and verifies registry bytes.

Stable automated and physical candidate artifacts expire after 30 days. Publication evidence is retained for 90 days. Artifact expiry requires a new pack and complete recertification; it does not permit repacking during publication.

## Failure recovery

- **Development failure:** inspect the validation outcome artifact, fix the source, and rerun. Do not mark a failed tier optional.
- **Candidate validation failure:** discard the candidate. Any source change, package change, or uncertain evidence requires a new candidate run.
- **Physical failure:** quarantine the worker result, fix or replace the isolated worker, and rerun all evidence needed for one exact package. A hosted matrix cannot substitute for physical evidence.
- **Approval or artifact expiry:** create and certify a new candidate. Never upload locally rebuilt bytes.
- **Publisher failure before npm accepts bytes:** retain the candidate and diagnose identity, permissions, registry, or provenance. Retry only with the same candidate run if the registry still proves the version unpublished and the artifact has not expired.
- **Publisher uncertainty after npm accepts bytes:** do not republish or rebuild. Query the registry for version, dist-tag, integrity, and shasum; repair a dist-tag only through a separately reviewed registry operation.
- **Partial stable certification:** stable eligibility remains false. Missing, duplicated, failed, non-isolated, or mismatched platform evidence fails closed.

## Enforcement rollout and rollback

The repository is currently operated by one GitHub collaborator. Both rulesets therefore require a pull request, successful required status, and resolved review threads, but set required approving reviews to zero and disable last-push approval. The develop ruleset does not require an up-to-date branch, so an approved pull request merges without re-running validation when unrelated work lands first; master keeps the strict up-to-date requirement for stable promotion. A PR author cannot approve their own change, so requiring one approval with no bypass actor would deadlock the authorized solo-maintainer path. Increase the approval count only after a second eligible reviewer is registered; do not add a direct-push bypass as a substitute.

Ruleset mutation is a separate administrative operation. First run `node scripts/check-github-rulesets.mjs` in report mode and review the proposed diff. Apply only after workflows exist on the default branch, representative advisory runs pass, and a maintainer explicitly confirms the exact ruleset change. Capture the post-apply repository API response as evidence.

If a required check is operationally broken, prefer correcting the workflow. Emergency rollback may disable only the affected required context after restoring the previous blocking validation path and recording maintainer approval. Never weaken force-push/deletion protection to release. Never route around certification by rebuilding inside a publisher.

After rollback, publication still requires exact certified bytes. A failed or unavailable candidate workflow means release waits for a new candidate; it does not authorize an ad hoc npm upload.
