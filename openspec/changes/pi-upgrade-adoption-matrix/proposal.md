## Why

The nightly upstream sync turned a Pi upgrade from a hand migration into a proposal, and the 0.84.2 to 0.85.1 upgrade is the first one delivered through it. The bot's commit touched 38 files; the reviewer's follow-up touched 94 files in eleven commits, and most of that work had no automated input. Nothing said which public exports had changed shape (the evaluator's compile verdict is truncated to 400 characters). Nothing said which upstream features were new and needed an A1 decision (`/thinking`, per-model thinking levels, fullscreen copy-on-select, the default-model action were found by reading the changelog and diffing the settings selector). Four copies that A1 keeps on purpose (owned editor, theme unit, text helpers, theme controller) were three-way merged into 4,000 lines of conflict blob the reviewer reverted. Six of twelve gates failed as a cascade of the first conflict marker, so the verdict list named nothing a reviewer could act on, and the startup-graph baseline was re-pinned by hand. The sync also has no notion of a proposal a human has continued: a re-run recreates `chore/pi-<version>` from `develop`, force-pushes it, and rewrites the body, so with the 0.85.1 pull request open the next scheduled run would replace eleven human commits with one bot commit.

## What Changes

- Add `config/baselines/pinned-pi-public-api.json` and `scripts/pi/update-pinned-pi-public-api.mjs`: the package-root export surface of both pinned packages (kind, normalized declaration hash, and the A1 modules that import each export), read from the declaration entry points with the TypeScript compiler API. The proposal driver gains a `public-api` step that diffs the previous surface against the candidate and lists added, removed, and changed exports, marking the ones A1 consumes as adoption items, and records the complete compile error list grouped by file in the artifact with per-file counts in the body.
- Add `config/baselines/pi-feature-adoption-matrix.json` and `scripts/pi/update-pi-feature-adoption-matrix.mjs`: one row per upstream feature the interactive baseline manifests already extract (advertised and hidden commands, TUI and app keybindings, session events, settings callbacks and presented settings, stateful components) plus one row per changelog "New Features" entry, each carrying A1's disposition: `pinned`, `owned` (behavior id and test), `diverged` (approved deviation id), `declined` (reason), or `pending`. The refresher rewrites rows from upstream and never changes a disposition; a governance suite fails on a `pending` row on `develop` or a disposition whose evidence is missing; the driver's `matrix` step lists rows new or retired upstream as review items.
- Give each `owned-presentation` ledger record an `upgradeStrategy` of `three-way` or `keep-owned`; `keep-owned` copies are never merged, the upstream delta goes to the artifact, and the body names them as "upstream changed, A1 version kept".
- Record `parity`, `typecheck`, `architecture`, and `parity-suites` as `blocked` by the conflicted copies instead of running them to fail; keep the isolated evaluator and engine conformance as the candidate's verdicts; re-pin `config/startup-graph-baseline.json` as a driver step.
- Make the sync safe to re-run: the workflow does not push when the remote proposal branch carries commits the bot did not author and comments the fresh report on the pull request instead; the body refresh rewrites only the report between `<!-- pi-upgrade-report -->` markers; an existing OpenSpec scaffold is kept; dispatch gains `refresh` to re-run the steps on top of an existing proposal branch.
- Document the baselines and the re-run rules in `docs/architecture/toolchain.md` and `docs/ci-release-runbook.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: a proposed upgrade reports the public API delta and the upstream features awaiting an A1 disposition, keeps the copies A1 owns on purpose, records blocked gates as blocked, and never replaces a proposal a human has continued.

## Impact

No runtime change and no pin change. Two baselines and two refreshers are added; the ledger gains one reviewed field per owned record; the proposal driver gains three steps and the body two sections; the workflow gains a guard and a dispatch input. The re-run guard is the urgent part: until it lands, an open proposal pull request with human commits must merge before the next scheduled sync, or the schedule must be disabled.
