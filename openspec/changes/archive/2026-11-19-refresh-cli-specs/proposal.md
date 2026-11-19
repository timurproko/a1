## Why

The specs of the command-line capabilities had drifted from the code. They specified removed commands as silent no-ops where the dispatcher exits with status 2, a clean private-contract cutover where the code negotiates the contract, and a hard failure for a missing session folder where the code offers recovery. They also carried requirements about delivery evidence, finished one-time procedures, delivery phases, and a private plugin that is not in this repository. Agents read these specs as the description of the product, so each of those statements misleads the next change.

## What Changes

- Rewrite the requirements that contradict the code so they state what the code does: reserved and unknown command words, `a1 update self`, version output, help, session-resume recovery, uninstall, installer failure vocabulary, package update summaries, and the private launch context.
- Remove requirements that describe how a change is delivered or proven, which the shared delivery workflow owns.
- Remove requirements for finished one-time procedures: the first `0.1.0` publication and the private-contract cutover.
- Remove phase wording such as "P1", "planned", "later approved delivery", and "this change SHALL".
- Remove requirements that specify the private Herdr customization and other consumers outside this repository.
- Remove the superseded 5-second and 3-second startup budgets; the 2-second and 2.5-second budgets stay.
- Repair a corrupted requirement and a scenario that had no outcome in `extension-packages`.
- Regenerate the legacy-identity inventory and allowlist for the spec files as they stand after these deltas are applied.

No product code changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `a1-shell`: command grammar outcomes, version output, help, package identity, startup tracing; the one-time publication and superseded budgets are removed.
- `cli-self-update`: `a1 update self` fails with status 2; the private launch context is negotiated per release instead of cut over.
- `cli-session-resume`: a missing stored cwd offers Continue, Fork, or Cancel; evidence-only requirements are removed.
- `cli-uninstall`: removal targets the prefix of the running installation and states its refusals and statuses.
- `silent-installer`: the failure vocabulary matches the installer; the bootstrap requirement loses its phase wording.
- `launch-profiles`: reserved words and unimplemented Pi options fail with status 2; phase labels are removed.
- `extension-packages`: update summaries match the code; a corrupted requirement is repaired.
- `pi-compatible-launch`: the roadmap paragraph and a pull request reference are replaced by the naming entry's behavior.
- `product-identity`: superseded launch keys are a declared boundary; naming requirements state what the governance checks enforce.
- `integration-api`: consumer rules are removed; the exit acknowledgement states its own meaning.
- `herdr-a1-integration`: the three requirements for the private Herdr customization are removed.
- `readme-section-navigation`: the navigator requirement matches the README's sections and heading level.

## Impact

- `openspec/specs/` for the twelve capabilities above, through the deltas of this change.
- `config/product-identity-legacy-inventory.json` and `config/product-identity-legacy-allowlist.json`, which record legacy-name occurrences in spec files by line and column.
- No source, test, or workflow file changes.
