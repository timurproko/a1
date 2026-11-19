## Context

`openspec/specs/` is written by agents for agents and should record what the product does. Thirteen UI and Pi
boundary capabilities had grown by accretion: each archived change appended requirements, including its own
acceptance gates and migration notes, and rarely removed what it replaced.

## Goals / Non-Goals

**Goals:**

- Every requirement in the thirteen capabilities describes current product or tooling behaviour.
- Where a requirement and the code disagreed, the requirement now states what the code does.
- A behaviour stated in two capabilities is kept in the more specific one.

**Non-Goals:**

- Changing product behaviour, tests, or documentation.
- Rewording requirements that are already current.
- Correcting Purpose paragraphs, which a delta cannot change; corrected sentences are reported separately.
- Fixing code defects noticed during the review; they are reported, not specified.

## Decisions

- **Code wins.** A contradicted requirement is rewritten only after reading the implementing code; a claim that
  could not be checked is left as it was and listed as unverified.
- **REMOVED plus ADDED for dropped or renamed scenarios.** Strict validation refuses a MODIFIED requirement that
  drops a scenario, so a requirement that loses or renames scenarios is removed and re-added under a name that
  states the behaviour. MODIFIED is used only when every scenario title survives.
- **Process-only requirements are removed outright.** Their Migration line points to the shared delivery
  workflow; a mixed requirement keeps its behaviour and loses the evidence paragraph.
- **Duplicates leave the broader capability.** `owned-pi-ui-foundation` gives way to the settings, viewport,
  selection, history, component, application and Pi boundary capabilities, and each Migration line names the
  requirement that keeps the behaviour.
- **Replacement text stays close to the original.** Replacement requirements are generated from the existing
  text with targeted substitutions so unrelated wording and scenarios are carried over unchanged.

## Risks / Trade-offs

- A removed duplicate may have carried a detail its keeper lacks → each removal names its keeper so a reader can
  compare, and removals were limited to requirements whose keeper covers the behaviour.
- Scenarios carried verbatim into replacement requirements were not all re-traced to code → the unverified
  parts are listed in the delivery report rather than presented as checked.
- `owned-pi-ui-foundation` remains large and still contains requirements that were read but not individually
  traced to code → they were left untouched rather than rewritten on a guess.
