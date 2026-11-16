## Context

All three native validation jobs in publication run 43835245506 failed in Validate the exact installer package. The globally installed executable imports ./repair-capsule.js, but packages/a1-install/package.json, prepare-installer-package.mjs, and validate-installer-package.mjs still enumerate only the launcher and palette JavaScript files. Source-side tests manually copy the repair helper, so they do not catch its omission from the published artifact. The validator's help expectation also lacks the already implemented --repair line.

## Decisions

- Preserve explicit minimal payload enumeration. Add only bin/repair-capsule.js to the source manifest, staging copies, and packed-entry allowlist; do not broaden to a directory glob.
- Preserve the dependency-free and executable-mode requirements, offline global installation, public launcher invocation, exact help assertion, and removed-option refusals.
- Update the expected help to the current source contract, including --repair. Do not alter command parsing or repair authorization.
- Exercise the real preparation and validation scripts against isolated fixture directories populated from the source installer. Check the tarball's exact entries and helper bytes; require validation success with the public launcher. Exercise omission as a negative case without loosening validation.

## Risks

The exact artifact test invokes local npm and needs a supported npm 11 or newer, as production packing already requires. Use bounded child processes and isolated output/prefix roots so tests do not mutate developer installations or collide with other tests. Native hosted lanes remain necessary cross-platform evidence.

## Known gaps

No implementation gaps are planned. This repair addresses the deterministic pre-staging installer failure, not any later publication or predecessor-update failure. Local packaging evidence does not establish successful numbered publication.
