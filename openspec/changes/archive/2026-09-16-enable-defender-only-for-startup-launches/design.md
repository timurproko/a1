# Design

## Problem

`runTierPlan` prepares the shared exact-package installation lazily, when the first consumer invocation starts. Preparation and the gates that consume it are therefore inside one workflow step, and a workflow cannot put anything between them. Because the startup gate needs Defender real-time protection on, the only place to enable it is before that step — which means before `npm ci` and before the global install. Defender then scans both extractions: about 612 files and 18 MB for the candidate alone, costing 114 to 156 seconds where Linux needs 4.7.

## Decision

Give the tier runner two entry points and let the workflow put the Defender step between them.

1. `run-validation-tier.mjs --prepare-exact-package --handoff <path>` builds the plan for the selection, verifies the existing build and package receipts, performs the one shared installation, writes a handoff file, and exits. It runs nothing else.
2. `run-validation-tier.mjs --exact-package-handoff <path>` reads that file, verifies it with the existing `verifyExactPackagePreparation` before the invocation loop, and records the preparation outcome as `verified-shared-preparation` with the duration the preparing command measured.

Without `--exact-package-handoff`, `runTierPlan` behaves exactly as today. Local runs and pull-request CI keep the lazy install.

## Why the preparing command does not run `plan.commands`

Running the plan's command list in both entry points would execute it twice. In the publication lanes every command is a receipt-verified no-op, so it would be harmless there — but Full regression's `full-release` plan contains real work such as typechecking and the documentation review, and running that twice would cost more than the change saves. The preparing command therefore performs only the two verifications that shared preparation actually depends on: the build receipt when `VALIDATION_BUILD_READY` is set, and the package receipt for the exact candidate. Both are the same functions and the same fail-closed behavior `runTierPlan` uses. The validating command still runs the full command list, so no verification is skipped.

## Handoff safety

The handoff file is written and read inside one job, but it is treated as untrusted input anyway. `verifyExactPackagePreparation` already re-derives the lane identity, re-hashes the candidate, re-walks the installed package, and compares every field against the receipt; the handoff adds no new trust. A handoff whose schema, plan agreement, or verification fails produces one failed preparation outcome and stops the run. It never falls back to a second installation, because a silent second install would both hide the failure and reintroduce the cost this change removes.

Cleanup is unchanged: the validating command owns removal of the prepared root at the end of the run, whether it prepared that root itself or received it.

## Workflow order

Both Windows workflows become:

`checkout -> setup-node -> npm ci -> record build -> (download or pack candidate) -> prepare the exact package -> enable Defender -> validate -> summarize -> upload`

The Defender step body stays byte-identical. The `defender-prerequisite` phase inside the startup gate remains the authority that protection is actually on when the packaged product launches, so the reorder cannot silently measure an unprotected launch.

## Alternatives rejected

- **Add a Defender exclusion for the npm prefix.** It would need a path that does not exist until the install starts, and it weakens the protection the startup measurement exists to represent.
- **Disable Defender for the install and re-enable it afterwards inside one step.** That is the same reorder with the state change hidden inside the tier runner, where the workflow cannot audit it.
- **Prepare the package in the `package` job and pass the installed tree as an artifact.** Installed trees are not portable across runners, and the preparation receipt is deliberately lane-scoped.
