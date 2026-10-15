## Context

`develop.yml`, `release-candidate.yml`, and `release.yml` each call `publish.yml` from one job. GitHub renders called jobs as `<caller job name> / <called job name>`, and it offers no way to drop the caller part. Omitting `name:` only replaces it with the job id.

## Goals / Non-Goals

**Goals:** make the repeated prefix short while still telling the channels apart.

**Non-Goals:** inlining `publish.yml` into its callers, renaming workflows or `run-name`s, or changing any `publish.yml` job name.

## Decisions

### One-word channel names

| Workflow | Job id | Current name | Planned name |
| --- | --- | --- | --- |
| `develop.yml` | `publish` | `Validate and publish development packages` | `Develop` |
| `release-candidate.yml` | `validate` | `Validate the prepared stable candidate` | `Candidate` |
| `release.yml` | `publish` | `Publish the exact stable release` | `Release` |

A development row then renders as `Develop / Build process guardian (macos-15)`. The workflow title, such as `Development publication`, still carries the full description.

Inlining the reusable workflow was rejected because it would triplicate about 1,300 lines of `publish.yml`.

## Risks / Trade-offs

- Check names that include the prefix change. The callers run on `workflow_dispatch` or Release publication, never on pull requests, so no required pull-request check is affected.
- Regression lane detection in `scripts/release/propose-regression-fix.mjs` reads platform tokens from job names. None of the old or new prefixes contain one, so lane matching is unchanged.

## Planned Evidence

Add a governance assertion pinning the three caller names, run the affected repository-governance tests and strict OpenSpec validation. The next development publication then lists its jobs under `Develop /`.
