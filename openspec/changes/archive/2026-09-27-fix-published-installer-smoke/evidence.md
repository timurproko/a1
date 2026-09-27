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

The maintainer approved implementation in the same draft PR. The post-publication job now uses the established release-workflow checkout v5 commit, and focused policy coverage requires every checkout in `release.yml` to share that exact immutable reference.

The installer now separates newline framing from diagnostic retention: it delivers every complete line from `pending + chunk` before retaining only the final 8,000 characters of an unresolved fragment. Retained aggregate stdout/stderr diagnostics remain independently bounded exactly as before. A deterministic regression sends over 8 KiB of complete materialization events in one chunk, reassembles a final event split across chunks, and verifies an unterminated 9,000-character line is retained at only 8,000 characters. Existing strict malformed-event and silent-success orchestration coverage remains passing.

Focused execution of the corrected source installer against the OIDC-published `@timurproko/a1@0.2.1-dev.600` in an isolated Windows npm prefix completed with the exact transcript `a1 successfully installed`. This diagnoses the published `.600` installer defect without mutating its immutable bytes and does not substitute for a new native GitHub matrix.

Validation on the implementation worktree:

- `npm ci` — passed; lifecycle build completed. npm reported two moderate dependency audit advisories and the environment check noted that `gh` is not on `PATH`; neither affects candidate behavior.
- `npx vitest run test/foundation/release/installer-bootstrap.test.ts test/repository-governance/release-pipeline-policy.test.ts` — passed, 30 tests with one platform-conditional Unix test skipped on Windows.
- `npm run typecheck` — passed.
- `npm run check:code-documentation:changed` — passed with no violations.
- `node D:/Git/a1/node_modules/@fission-ai/openspec/bin/openspec.js validate fix-published-installer-smoke --strict` — passed.
- `git diff --check` — passed.
- Upstream checkout ref inspection confirmed repository-standard v5 commit `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` exists; the removed `de0fac2e4500dabe0009ef9f129fbe2d3a1f872d` does not.

Per repository policy, no local full or release suite was run. Current `origin/develop` remained `f83c501794763b2f3ab2b2235fd4baac10dcdd01` when implementation began, so no reconciliation merge was needed.

## Known gaps

- `.600` remains valid OIDC publication evidence but incomplete installation evidence. Its failed aggregate and immutable package bytes are not reclassified or repaired by the focused source smoke.
- A pull request cannot safely publish replacement package bytes. Full native installation proof remains an explicit post-merge requirement for the newly numbered candidate: both OIDC publications, registry-byte verification, Windows/Linux/macOS published-pair smoke, completion, and aggregate must all succeed.
