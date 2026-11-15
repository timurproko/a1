## Why

The approved publication progress uses a single header and aligned status dots. The failure footer still nests diagnostics at different indentation depths and places its log link last. The maintainer approved a matching footer with the existing develop-prefixed heading, an unindented log link directly beneath it, and uniformly indented asterisk bullets for details.

## What Changes

- Move the failure log link directly below the plain failure heading, without indentation or a heading bulb.
- Render job identities, concrete diagnostics or missing-evidence notices, downstream consequences, npm staging state, and the next action as equally indented asterisk bullets.
- Remove log-link indentation from the initial publication header and interrupted/unavailable observation messages.
- Preserve colored progress dots, status alignment, existing message content, diagnostic bounds, failure exit behavior, and all publication gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: consistent unindented log links and asterisk-bulleted publication failure details.

## Impact

Publication client, its focused formatting tests, and the CI/release runbook. The existing develop command supplies its failure heading prefix unchanged. Stable-candidate watching is unchanged; its shared failure formatter adopts the same log-first bullet layout. No workflow, registry, recovery runtime, or publication retry changes.
