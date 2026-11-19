## MODIFIED Requirements

### Requirement: Governed GitHub state is declarative and drift-detectable
A1 SHALL keep one reviewed repository definition for governed repository settings,
Actions policy, security capabilities, environments, labels, and workflow inventory.
Branch and tag rulesets SHALL be declared only in `protection/repositories.json` of the
shared delivery workflow and installed with its `delivery protect` command; the
repository definition SHALL NOT declare, compare, or apply rulesets. A read-only check SHALL compare that definition with live GitHub state and
report field-level drift without mutating the repository. Applying policy SHALL require the explicit `--apply --confirm apply-a1-github-governance` invocation, SHALL write only repository settings, Actions policy, environments, and labels, SHALL refuse when drift exists in security capabilities or the workflow inventory, and SHALL verify live state afterwards.

#### Scenario: Live policy matches
- **WHEN** the read-only governance check compares the reviewed definition with GitHub
- **THEN** it SHALL report every governed field as matching and perform no mutation

#### Scenario: An unnormalized live field drifts
- **WHEN** GitHub differs in a governed field of a declared setting, environment, label, or workflow
- **THEN** the check SHALL fail and identify the exact path of that field

#### Scenario: Ordinary CI evaluates repository policy
- **WHEN** a pull request runs repository governance validation
- **THEN** it SHALL compare the reviewed definition with the checked-out workflow files only, using read-only authority, and SHALL NOT read or apply live settings

#### Scenario: Maintainer applies reviewed policy
- **WHEN** the maintainer invokes the policy application command with its exact confirmation
- **THEN** only the differing sections among repository settings, Actions policy, environments, and labels SHALL be written and a post-apply read SHALL match the definition

### Requirement: Workflow authority is explicit and least-privileged
The repository SHALL inventory each workflow's trusted source, triggers, permissions,
concurrency, validation or publication authority, and artifact retention. A workflow
with write permission SHALL execute only default-branch trusted code and SHALL NOT
check out or execute pull-request code with that token. The `Delivery` caller is the one workflow that runs code of another repository: it SHALL contain no step of its own, SHALL only forward events and the delivery App credentials to `timurproko/MyWorkflows/.github/workflows/delivery.yml@main`, and SHALL be inventoried with the trusted source `shared-delivery-workflow`. npm publication SHALL use trusted publishing only; a workflow that reads a long-lived registry token SHALL surface as an authority the reviewed definition does not list. Third-party actions SHALL be
pinned to reviewed immutable commits; whether GitHub enforces the allowlist and SHA
policy SHALL be visible in drift reporting.

#### Scenario: Pull-request code is untrusted
- **WHEN** a write-authority workflow processes pull-request metadata
- **THEN** it SHALL check out trusted default-branch policy and SHALL NOT execute the pull-request head

#### Scenario: Workflow permissions drift
- **WHEN** a workflow or repository default gains undeclared write authority
- **THEN** repository governance SHALL fail with the workflow or setting identified

#### Scenario: Action reference is mutable
- **WHEN** a workflow references a third-party action without an approved immutable commit
- **THEN** the repository governance tests SHALL reject the workflow
- **AND** the only mutable references accepted SHALL be local workflows, this repository's `publish.yml@develop`, and the shared delivery workflow at `@main`

#### Scenario: The delivery caller gains its own steps
- **WHEN** the `Delivery` caller declares a `run` or `steps` key, or references the shared workflow at another ref
- **THEN** workflow inspection SHALL report its trusted source as `unknown`
- **AND** the comparison with the reviewed definition SHALL report that workflow as drift

## REMOVED Requirements

### Requirement: Protected refs retain distinct responsibilities
**Reason**: It restates the branch and tag rulesets, which are declared and applied by the shared delivery workflow's `delivery protect` command; no code in this repository declares, compares, or applies them.
**Migration**: Read `protection/repositories.json` of `timurproko/MyWorkflows` for the rulesets. What this repository's workflows do to `master` and release tags stays in the `continuous-integration` capability.

### Requirement: Live acceptance proves repository lifecycle outcomes
**Reason**: It prescribes acceptance evidence for automatic documentation integration and merged-branch cleanup automation that this repository no longer contains.
**Migration**: None. Merged-branch deletion is performed by the shared delivery workflow; the release-reopening branch deletion is covered by "Verified release reopening pull requests auto-merge".

### Requirement: Delivery automation is delegated to the shared workflow
**Reason**: It specifies what the shared delivery workflow performs. The part this repository implements, the inspection of the caller workflow, is a workflow-inventory rule.
**Migration**: The caller inspection is specified in "Workflow authority is explicit and least-privileged".
