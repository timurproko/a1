# Implementation evidence

## Pre-implementation incident

- Development run: [36331807992](https://github.com/timurproko/a1/actions/runs/36331807992), source `f83c501794763b2f3ab2b2235fd4baac10dcdd01`, version `0.2.1-dev.600`.
- Attempt 2 publish job `108659173196` succeeded after the installer trusted publisher was configured. Both installer and application publish steps and registry-byte verification passed through GitHub Actions OIDC.
- Registry identities:
  - `@timurproko/a1@0.2.1-dev.600`: shasum `0a359942febd1a662756bdb1d0ef4cb13fb500fc`, integrity `sha512-46XjtW5bEUjvEvR03YC3ZZ9B0adAjKFh2MW5JzXnldlVbyPgqs39f9re3hRQQKtdIsTHLwMaXdI08SNZj+3HoA==`.
  - `@timurproko/a1-install@0.2.1-dev.600`: shasum `f610f47398c1504c00ba843de29e3f85c590eebb`, integrity `sha512-BRZ7rZf6AQjEulmsCHv0pHShBNMH1le8b9emtZ/tTFx3ndQq1y7tYmEMAo13mJotNjpJpf1nP67osNN+od0bZQ==`.
- Both registry records expose SLSA provenance attestations and both `next` tags resolve to `.600`.
- Published-pair jobs `108659563052`, `108659563070`, and `108659563084` failed during setup because `actions/checkout@de0fac2e4500dabe0009ef9f129fbe2d3a1f872d` does not exist. GitHub's commit API returns no commit, while upstream checkout v5 resolves to the repository-standard `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09`.
- Isolated Windows execution of `smoke-published-installer.mjs` against the exact registry integrities failed with `activation returned an invalid event`. Direct activation emitted 7,173 valid JSON lines. Inspection identified pre-framing truncation of `pending + chunk` to 8,000 characters, which can begin inside a valid JSON event when a chunk carries many complete lines.

## Implementation results

Pending explicit plan approval and implementation.

## Known gaps

- `.600` is valid OIDC publication evidence but remains incomplete installation evidence because no GitHub native published-pair lane reached its steps and isolated Windows installation exposed the framing defect.
- A pull request cannot safely publish replacement package bytes. Full native installation proof remains a post-merge requirement for the new numbered candidate.
