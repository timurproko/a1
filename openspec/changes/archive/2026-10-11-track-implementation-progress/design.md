## Context

See `proposal.md` for motivation. Version-3 pull requests currently use two to five plain `Implementation` bullets during planning and add a separate plain `Acceptance` list only after implementation is complete. GitHub displays task progress for Markdown checkboxes anywhere in the PR body, while repository policy deliberately reserves acceptance for observable scenarios activated by authorized maintainer integration. Historical version-3 bodies and manifests must remain readable.

## Goals / Non-Goals

**Goals:**
- Make approved implementation scope and completion visible through GitHub's native task counter.
- Give agents an exact rule for when a progress item may change from unchecked to checked.
- Fail finalization when a task-list-based implementation section remains incomplete or malformed.
- Preserve plain acceptance scenarios and human integration as the acceptance decision.
- Retain compatibility with historical version-3 bodies that use plain Implementation bullets.

**Non-Goals:**
- Replacing the detailed OpenSpec `tasks.md` ledger with PR-body items.
- Representing CI, review, merge, archive, or maintainer acceptance as implementation tasks.
- Inferring completion from commits, tests, or GitHub checks without an agent updating the body.
- Rewriting merged PR bodies or historical conditional acceptance manifests.

## Decisions

### Track coarse approved scope under Implementation

New draft bodies will contain two to ten `- [ ]` items under `## Implementation`. Each item represents an independently understandable implementation outcome and may cover multiple detailed OpenSpec tasks. The agent changes only the marker to `- [x]` after the associated source/documentation changes, focused evidence, and task bookkeeping are complete.

Using `Implementation` rather than `Acceptance` keeps implementation progress distinct from the maintainer's final acceptance decision. Keeping coarse PR items separate from `tasks.md` prevents a long internal task ledger from dominating the PR summary while still exposing useful progress.

Alternative considered: put checkboxes under `Acceptance`. This was rejected because checkbox state would ambiguously claim human acceptance and would conflict with the conditional-manifest contract. Alternative considered: copy every OpenSpec task into the PR. This was rejected because it creates a noisy duplicate ledger and unstable task counts.

### Treat wording changes as scope changes, marker changes as progress

After plan approval, ordinary progress updates change only `[ ]` to `[x]`. Adding, removing, reordering, or rewriting an item requires the same explicit refinement and planning-artifact reconciliation as any other scope change; affected work returns to unchecked state until complete.

This gives reviewers a stable denominator and prevents an agent from making progress appear complete by weakening or deleting an item. The policy remains human-authorized because GitHub body history alone cannot prove that a wording change was approved.

### Validate checklist shape and completion without breaking history

The body parser will recognize two forms under `Implementation`:

- a new task-list form, where every nonblank line is a lowercase `[ ]` or `[x]` task item and there are two to ten distinct, bounded items; or
- a historical plain-bullet form, retained for read compatibility.

If any task marker appears, mixed plain/task syntax is invalid. Final version-3 parsing requires all task-list items checked, while the exported progress parser can inspect incomplete drafts. Generic process-only items covering CI, review, acceptance, merge, or archive are rejected.

The compatibility path intentionally does not reinterpret old plain bullets as incomplete tasks. Newly authored bodies are made systematic through canonical policy, agent guidance, examples, and governance tests; historical records remain immutable.

### Keep Acceptance unchanged

Final `## Acceptance` remains one to ten plain behavior-and-result bullets. Finalization continues to normalize only those scenarios into the conditional manifest, and authorized maintainer integration remains the acceptance event. Implementation checkbox state is a readiness precondition, not acceptance provenance.

## Risks / Trade-offs

- **[Risk] Agents check coarse items prematurely** → Define completion as implementation plus focused evidence and detailed task bookkeeping, and test the guidance across all agent-facing surfaces.
- **[Risk] Scope is weakened by editing item text** → Require approval for wording/order/membership changes and ordinary updates to toggle only the exact marker.
- **[Risk] Historical PRs fail new readers** → Accept the existing all-plain Implementation form as a compatibility path while strictly validating any body that uses task markers.
- **[Risk] Two ledgers drift** → Keep PR items outcome-sized, require detailed `tasks.md` completion before checking them, and block finalization on either incomplete source tasks or incomplete PR progress.
- **[Trade-off] Plain historical bodies remain machine-acceptable** → Prefer immutable compatibility over retroactive enforcement; new authoring guidance and tests establish the forward contract.

## Migration Plan

1. Add the canonical requirement and align configuration, skill, and runbook examples.
2. Add compatibility-aware parsing and finalization checks for task-list implementations.
3. Add focused parser and guidance tests for draft, complete, malformed, generic, and historical forms.
4. Use the new checklist in this PR and future newly authored version-3 deliveries.
5. Roll back through an ordinary corrective PR if the readiness gate proves too restrictive; do not rewrite historical PRs or acceptance manifests.
