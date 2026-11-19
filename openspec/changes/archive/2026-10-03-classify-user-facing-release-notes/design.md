# Design

## Context

Stable preparation enumerates merged pull requests and groups each title in `scripts/release/release-notes.mjs`. The renderer currently excludes only `chore(release): ...` and `docs(openspec): ...`. Every other unrecognized type falls into `Changed`, while `fix(...)` falls into `Fixed`. Consequently, generated `fix(regression): repair the ... full regression failure` proposals are advertised to users and `chore(pi): upgrade pinned Pi ...` proposals appear only by virtue of the generic fallback.

The title is the release classifier. Branch names and generated OpenSpec identities separately carry trusted automation provenance: regression selection relies on immutable App and source-run evidence, and Pi sync/re-run behavior recognizes `chore/pi-<version>`. Changing those identities would expand risk without improving the release note.

## Goals / Non-Goals

**Goals:**

- Hide routine maintenance and generated CI-repair bookkeeping from generated stable notes.
- Present Pi runtime upgrades as intentional product changes rather than chores.
- Preserve user-visible fixes found during regression investigation.
- Keep already-merged Pi upgrades visible when a stale draft is regenerated.
- Keep breaking changes visible even when their ordinary type is maintenance-oriented.

**Non-Goals:**

- Reclassifying every historical pull request or editing the current draft GitHub Release.
- Replacing title-based generation with labels or another manual metadata system.
- Renaming trusted automation branches, change identifiers, or provenance schemas.
- Changing semantic-version selection, publication authority, validation selection, or release-note editing.
- Hiding all `docs`, `refactor`, `style`, or other non-chore titles in this change.

## Decisions

### 1. Filter user-facing entries before ordinary grouping

The renderer will first detect an explicit breaking marker. Breaking titles remain eligible regardless of type. It will then omit ordinary `chore:`/`chore(scope):` titles and the historical generated `fix(regression): ...` form before cleaning and grouping titles. The existing `docs(openspec): ...` finalization exclusion remains.

Filtering all non-breaking chores provides one predictable default instead of accumulating scope-specific exclusions. A release range containing only filtered entries will say `No user-facing changes.` rather than exposing a generic maintenance summary.

### 2. Preserve historical Pi upgrade intent narrowly

Already-merged Pi proposals use `chore(pi): upgrade pinned Pi to <version>`. The renderer will recognize that exact established form as an upgrade before applying the generic chore exclusion and will continue grouping it under `Changed`. This compatibility rule prevents regeneration of the current or another stale draft from silently dropping upgrades that merged before the new title policy.

New Pi proposals will use `upgrade(pi): upgrade pinned Pi to <version>` as their pull-request title. The sync's generated proposal commit and `chore/pi-<version>` branch remain internal automation identities. The generic title cleaner already accepts alphabetic types, and the release grouper's fallback places `upgrade` under `Changed`; title parsers that enumerate supported user-facing types will be updated where applicable.

### 3. Regression triage starts as maintenance and may graduate to a fix

A failed workflow proves that repository validation needs investigation; it does not prove a user-facing product defect. New generated proposals therefore start as `chore(regression): repair ...`. Their branch, OpenSpec change, source provenance, and full-regression selection remain unchanged.

If implementation establishes that users were affected, the maintainer renames the final pull request to the actual `fix(scope): ...` outcome before merge. Release generation then includes it under `Fixed`. Historical `fix(regression): ...` generated titles are omitted so existing ranges receive the intended result without rewriting merged pull-request metadata. An explicitly breaking regression title remains visible.

### 4. Keep classification deterministic and reviewable

Classification continues to use only the bounded pull-request title already collected for release evidence. No label lookup, body parsing, network request, or mutable side table is added. Focused tests will cover ordinary and scoped chores, breaking chores, historical and new regression forms, historical and new Pi upgrade forms, normal fixes, deterministic ordering, and an all-filtered range.

The draft GitHub Release remains editable. This change improves its initial generated body but does not remove the maintainer's final review authority.

## Risks / Trade-offs

- A user-visible change incorrectly merged with a `chore` title will be omitted. The title policy makes that mistake visible before merge, and a product defect found by triage must be retitled to its actual fix scope.
- Historical `chore(pi)` compatibility is a narrow exception to the generic chore rule. It is constrained to the established upgrade wording and can remain harmless after all affected releases are historical.
- Keeping branch names unchanged means PR title type and automation branch type differ. This is intentional: titles communicate release semantics, while branch names preserve trusted workflow identity.
- Other internal-looking title types may still enter `Changed`. Broad allowlisting is deferred because it would reclassify user-visible style or documentation work beyond the reported problem.
