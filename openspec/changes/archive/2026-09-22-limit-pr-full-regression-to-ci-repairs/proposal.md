## Why

PR-attached Full regression is currently selected by broad release, build, shared-support, configuration, workflow, and validation-authority path rules. Those rules make ordinary pull requests such as UI changes run the complete four-lane suite when generated files or shared repository inputs appear in their diff, despite ordinary impact-selected Development validation already being their intended gate.

Complete pre-merge regression should be exceptional. It is required for the bot-created repair pull request produced after Full regression fails, while regular human-authored pull requests should use only their ordinary selected validation.

## What Changes

- Select PR-attached Full regression only for a trusted CI-created nightly-regression repair associated with a failed Full regression run.
- Require immutable bot-author provenance plus generated repair/run provenance; a manually named branch, OpenSpec identifier, matching title, changed release path, or label does not select the suite.
- Remove release/publishing impact, validation-authority impact, unknown-path fallback, and `ci:full-regression` label as PR Full regression triggers while keeping ordinary fail-closed Development validation intact.
- Preserve the scheduled/manual Full regression workflow and the existing exact-head four-lane PR gate for the one eligible repair class.
- Update delivery and validation guidance so ordinary PRs defer exhaustive owners and CI-created failed-regression repairs must pass them before handoff.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: narrow PR-attached complete-regression selection to bot-created failed-Full-regression repair candidates and retain ordinary bounded validation for every other PR.
- `isolated-regression-testing`: require exhaustive pre-merge execution only for that repair class while preserving exhaustive scheduled/manual/nightly coverage.

## Impact

Implementation is expected to update the base-controlled selector and its PR metadata model, regression-triage provenance emitted into generated repair scaffolds, selector/workflow policy fixtures, and CI/delivery documentation. The shared complete-regression workflow, native matrix, stable protected aggregate, scheduled/manual Full regression entry point, release validation, publication authority, and ordinary impact-selected test scopes remain unchanged.

Because the deployed base policy currently selects validation-authority changes, this corrective PR may receive one final PR-attached Full regression during rollout. After integration, ordinary PRs no longer select it.
