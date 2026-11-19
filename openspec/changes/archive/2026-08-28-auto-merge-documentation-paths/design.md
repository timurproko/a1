## Context

The development-validation workflow already classifies `docs/**` as documentation-only and runs documentation-sensitive governance instead of product tests. The separate trusted auto-merge classifier permits only `openspec/**` and root `README.md`, so a successful `docs/**` validation deliberately leaves the pull request open. PR #178 demonstrated this mismatch: all required checks passed, but `docs/architecture/project-structure.md` was reported outside the auto-merge allowlist.

## Goals / Non-Goals

**Goals:**

- Give all maintained `docs/**` files the same automatic integration path as OpenSpec and root README documentation.
- Preserve exact complete-diff, rename, trust, draft, base-branch, current-head validation, and expected-SHA safeguards.
- Keep any pull request containing an executable or operational path on the manual acceptance path.

**Non-Goals:**

- Auto-merge arbitrary root Markdown files or files outside `docs/**`, `openspec/**`, and root `README.md`.
- Weaken documentation governance or strict OpenSpec validation.
- Auto-merge the implementation that changes classifier scripts, tests, or workflows.
- Change product behavior.

## Decisions

### Decision: use one exact three-surface documentation allowlist

A changed path is eligible only when it is exactly `README.md`, starts with `openspec/`, or starts with `docs/`. Every changed and renamed-from path must satisfy that rule. Empty, malformed, incomplete, or oversized classification responses fail closed.

This admits maintained architecture, feature, manual, and runbook documents without admitting arbitrary repository Markdown or operational configuration.

### Decision: eligibility does not bypass validation

Eligible documentation pull requests continue through `Development validation required`. The existing docs-only CI route runs generated documentation governance and strict OpenSpec validation whenever OpenSpec is touched. Auto-merge may arm while checks are pending, but direct reconciliation requires successful validation for the exact current head and an expected-SHA squash merge.

### Decision: mixed pull requests remain manual

A pull request containing any path outside the three allowed surfaces is code/operational as a whole. Documentation intent does not make source, tests, scripts, workflows, configuration, or generated baselines eligible. The implementation of this policy is therefore a manual code/operational pull request.

## Risks / Trade-offs

- **Documentation can influence developer behavior** → retain documentation-sensitive governance and current-head CI rather than merging without validation.
- **A rename could hide an operational origin** → classify both current and previous paths.
- **The broader allowlist could accidentally admit generated content** → limit it to tracked `docs/**`; generated baselines and configuration remain excluded.
- **Policy and implementation can temporarily differ** → merge this specification first, then implement in a separate manual pull request.

## Migration Plan

1. Merge this OpenSpec-only change through the existing documentation auto-merge path.
2. After explicit implementation authorization, create a fresh detached task worktree from updated `origin/develop`.
3. Update the trusted classifier and focused governance tests; update maintained policy guidance.
4. Leave the implementation pull request open after CI for maintainer acceptance and explicit manual merge.
5. Re-trigger or recreate a `docs/**`-containing pull request and verify automatic squash integration and exact-head branch cleanup.
6. Record acceptance and archive this change separately.

## Open Questions

None.
