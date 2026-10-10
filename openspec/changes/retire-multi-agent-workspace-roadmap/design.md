# Design

## Context

The legacy identity inventory scans `openspec/changes` but skips archived changes, and the identity tests require at least one historical evidence occurrence. The terminal-host spike evidence under the old change holds the twelve inventoried historical occurrences, so archiving the change together with its evidence would drop them and fail those tests.

## Decisions

### 1. Archive the plan, keep its evidence in `docs/architecture/evidence/`

The plan moves to `openspec/changes/archive/2026-10-10-evolve-bare-a1-into-multi-agent-workspace/`. Its `evidence/` folder moves to `docs/architecture/evidence/terminal-host-spike/`, next to the proof-gate and spike-evidence documents that describe it. The path still contains `/evidence/`, so the occurrences keep their `historical-records` class. Deleting the evidence was rejected because PR #586 evolves the same native terminal host and its provenance remains useful.

### 2. Regenerate the baselines with their own tools

`scripts/governance/product-identity-inventory.mjs --write` and `scripts/update-product-identity-allowlist.mjs` regenerate the inventory and allowlist. Allowlist fingerprints include the path, so editing ids by hand is not enough.

### 3. Record history by commit

The archive branch was deleted on purpose, and the removed source is reachable from `develop` at `243eb7a7`. The governance requirement accepts a recorded commit, so a branch no longer has to exist forever.

## Non-Goals

- Planning the persistent-tabs work; PR #586 owns that.
- Changing `config/terminal-host-provenance.json` or its checker.
