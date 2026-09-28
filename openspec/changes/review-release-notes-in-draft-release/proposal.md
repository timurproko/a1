## Why

The first attempted `0.2.2` release exposed that a dedicated release-note pull request is both an unnatural editing surface and incompatible with the repository's documentation auto-merge policy: PR #615 was squash-merged by automation after an update, so the stable gate correctly refused it and published nothing. Release notes belong with the release itself, while their exact reviewed bytes still need to be fixed before immutable packages are built.

## What Changes

- Replace the pre-publication release-note PR with a source-bound draft GitHub Release whose body is generated from merged pull requests and edited directly in the Releases UI.
- Split preparation from approval: ordinary release preparation creates or safely reuses the draft without publishing, while an explicit authenticated human approval snapshots its exact body and dispatches stable publication for the unchanged authoritative source.
- Package that immutable snapshot into bare A1, publish the same bytes as the final GitHub Release body, and commit the note to `docs/releases/<version>.md` alongside the next-development version in the existing post-publication reopening PR.
- Correct the failed `0.2.2` attempt by removing its automatically merged unapproved note, excluding release-history documents from documentation auto-merge, and preserving the fail-closed registry, tag, source, and actor checks.
- Keep first-launch presentation, `/changelog`, preview suppression, profile acknowledgement, `a1 pi`, exact-package validation, and post-publication reopening behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Review stable notes in a draft GitHub Release, require an explicit authorized-human snapshot before publication, carry that snapshot through exact package and GitHub Release records, persist it in the reopening PR, and prevent release-history documents from automatic integration.

## Impact

The change affects stable release command syntax and orchestration, GitHub Release API handling, publication workflow inputs and evidence, package-time release-note assembly, the post-publication reopening PR, documentation auto-merge classification, release fixtures and policy tests, and operator documentation. It removes the invalid unapproved `docs/releases/0.2.2.md` introduced by PR #615; no `0.2.2` package, tag, or published GitHub Release currently exists. Planning and implementation of this change do not publish a release.
