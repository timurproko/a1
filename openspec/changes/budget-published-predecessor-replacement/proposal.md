## Why

Development publication 43860507966 staged 0.2.7-dev.1328 but its Windows published-pair smoke interrupted the 1327-to-1328 predecessor update after 120005 ms. The recovery worker continued heartbeating, npm remained alive, and the replacement prefix had the candidate manifest but no launchers. Fresh and predecessor installations in the same lane took 146738 and 153007 ms. The two-minute update limit is shorter than observed installation work, though these observations do not prove the interrupted update would succeed.

## What Changes

- Give published predecessor-update commands a five-minute deadline on every platform, matching the existing installation allowance.
- Keep acquisition at two minutes, queries and launches at thirty seconds, settlement at thirty seconds, and the existing twenty-five-minute exercise / thirty-minute job backstops.
- Retain progress, failure evidence, strict legacy-recovery eligibility, exact-candidate checks, process settlement, and failure-blocked promotion.
- Add focused coverage for an update completing beyond two minutes and an update failing at the new deadline, without trusting partial files.

## Capabilities

### Modified Capabilities

- `continuous-integration`: published installer smoke replacement budget.

## Impact

- `scripts/release/smoke-published-installer.mjs` and focused smoke/recovery contracts.
- No updater implementation, installed package bytes, npm tags, publication dispatch, merge authority, or generic-timeout recovery behavior changes.
