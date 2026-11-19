## Context

`workflow_run` fires for a workflow's completion on any branch. The triage gated on conclusion and, for `Release`, on the schedule event, but not on the branch, so every failed proof run on a candidate branch looked like a new nightly failure with a new failed scope set and opened a fresh candidate.

## Decisions

- Gate twice: the workflow job condition compares `head_branch` with the repository default branch so a candidate-branch run does not even start a runner, and `triageDecision` compares the run's `headBranch` with `develop` so a manual dispatch with a candidate-branch run id records why it proposed nothing.
- A candidate-branch run is not appended to its own pull request automatically: the fixer records the passing proof run in the change's design evidence under the existing hand-off rule, and a failing proof run is the fixer's next step, not new evidence to file.
