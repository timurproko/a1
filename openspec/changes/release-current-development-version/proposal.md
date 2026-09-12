## Why

The repository is already at `0.1.8-dev`, but `npm run release -- patch` selects `0.1.9` instead of releasing the version being developed. The release helper also enables auto-merge for manifest-changing PRs, contrary to the current manual code/operational merge policy, and the README still describes that outdated behavior.

## What Changes

- Fix the existing `npm run release -- patch` command to use prerelease-aware patch semantics: `0.1.8-dev` becomes `0.1.8`, while stable `0.1.8` becomes `0.1.9`.
- Do not add a no-argument release mode. A target remains required; retain `minor`, `major`, and exact-version commands and reject invalid or missing targets before release mutations.
- Remove automated merging and auto-merge enablement for both the stable-version PR and the next-development-version PR. Show their links and required manual steps, and advance only after their actual merge is verified.
- Keep the sequence explicit: prepare and manually merge `0.1.8`, verify publication of its exact approved commit, then prepare and manually merge `0.1.9-dev`. Do not open the next development version after failed or uncertain publication.
- Isolate version commits from the caller's checkout and preserve local work rather than use hard resets as release orchestration. Preserve immutable package/tag protections and the existing GitHub Actions publication authority.
- Update `README.md`, `docs/ci-release-runbook.md`, and relevant command help with accurate `--patch` examples for development and stable inputs, the retained minor/major/exact forms, manual merge gates, and failure/recovery guidance when implementation lands.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Prerelease-aware patch target selection, manually merged version PRs, safe publication/reopening order, and documented maintainer commands.

## Impact

Implementation centers on `scripts/release/release.mjs`, testable release-target/orchestration helpers as needed, and focused publication-policy and command tests. The existing publication client and GitHub Actions publisher remain responsible for exact-source validation and registry verification; this is not a new publication channel or a local publishing path.

The package manifest and lockfile will not be bumped as part of implementing this feature. No release, tag, npm upload, production version PR, or branch-protection change is authorized by this proposal. README/runbook edits will accompany the implementation so they do not advertise behavior before it exists; this PR contains OpenSpec artifacts only.
