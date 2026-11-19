## Context

`openspec/specs/` must describe only the current state of this repository's code. Delivery (draft pull requests, readiness, OpenSpec finalization, the delivery check, branch deletion, rulesets) is owned by the shared workflow that `.github/workflows/delivery.yml` calls. This repository still owns product CI, validation selection, release, publication, and its governance scripts. Seven capabilities were audited against the workflows, `scripts/release/`, `scripts/governance/`, `config/`, and `src/foundation/lifecycle/`.

## Goals / Non-Goals

**Goals:**
- Every requirement in the audited capabilities that is added or modified matches code that was read.
- No requirement specifies shared-workflow behaviour, agent conduct, a finished procedure, or a superseded rule.

**Non-Goals:**
- Changing code, workflows, configuration, or documentation.
- Rewriting requirements that are accurate or could not be verified; those keep their text.
- Fixing Purpose paragraphs, which a delta cannot change.

## Decisions

- **The code wins.** Where a requirement and the code disagree the requirement is rewritten, for example `record` enforcement for nightly and Full regression and five Windows shards.
- **Keep the CI side of delivery.** Readiness deferral reads the delivery record in this repository's own scripts, so it stays as one requirement that states the routing and nothing about delivery validity.
- **Remove and re-add to drop scenarios.** Strict validation refuses a MODIFIED requirement that loses a scenario, so such requirements are removed and added under a new name with the kept text carried unchanged.
- **Carried text is generated, not retyped.** The deltas were derived from the current specs by exact replacements, so unmodified sentences are byte-identical.

## Risks / Trade-offs

- Renamed requirements break references by name in other specs or archived changes → no script or test reads these names; only prose references are affected.
- Carried text in renamed requirements was not re-verified sentence by sentence → it is unchanged from the current spec, and the report lists what was verified.
- Other capabilities may still mention delivery behaviour → out of scope for this change.
