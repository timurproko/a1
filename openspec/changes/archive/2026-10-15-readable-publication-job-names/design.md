## Context

`publish.yml` has six matrix jobs whose names interpolate matrix values: `guardians`, `terminal_hosts`, `validate_sequential`, `validate_windows_shard`, `validate_windows_lane`, and `post_publish`. Each one is skipped in at least one publication mode. For example, development mode skips the Windows shard and lane jobs, and stable mode skips sequential validation and the native builds. When a job's `if:` is false, GitHub reports one skipped job under its unrendered name template.

## Goals / Non-Goals

**Goals:** every publication job reads cleanly whether it runs or is skipped, and expanded runs still identify each matrix entry.

**Non-Goals:** changing which jobs run in any mode; changing job ids, dependencies, matrices, artifacts, or aggregation; or renaming jobs in other workflows. CI matrix labels are check names that branch protection may depend on.

## Decisions

### Static names with GitHub's automatic matrix suffix

When a matrix job's `name` contains no `matrix.*` expression, GitHub appends the entry's values in parentheses. The planned names are:

| Job id | Current name | Planned name |
| --- | --- | --- |
| `guardians` | `Build process guardian (${{ matrix.os }})` | `Build process guardian` |
| `terminal_hosts` | `Build terminal host (${{ matrix.os }})` | `Build terminal host` |
| `validate_sequential` | `Validate sequential ${{ matrix.platform }}` | `Validate sequential` |
| `validate_windows_shard` | `Validate ${{ matrix.platform }} / ${{ matrix.shard }}` | `Validate Windows shard` |
| `validate_windows_lane` | `Reconstruct ${{ matrix.platform }}` | `Reconstruct Windows lane` |
| `post_publish` | `Published pair ${{ matrix.platform }} / Node ${{ matrix.node }}` | `Published pair` |

An expanded shard then renders, for example, as `Validate Windows shard (win32-node24, windows-2025, 24, core)`. A skipped shard renders as `Validate Windows shard`.

A full-expression name with a fallback was rejected. Skipped jobs never evaluate the expression, so GitHub would show the whole expression text, which is worse.

## Risks / Trade-offs

- Expanded names also include matrix values that the old names hid, such as the runner image. This adds some noise, but nothing is lost.
- Nothing in the repository references these display names. Governance tests and aggregation use job ids, which stay the same.

## Planned Evidence

Parse `publish.yml`, then add a focused governance assertion that no publication matrix job name contains a `matrix.` expression. Run the affected repository-governance tests and strict OpenSpec validation. Afterwards, the next development publication should list its skipped Windows jobs under readable names.
