# Design

## Matrix from a script, not a literal

The `validate` job currently carries a literal four-entry `include:` list. GitHub Actions can take a matrix from `fromJson(needs.plan.outputs.<name>)`, so the `plan` job gains one step that runs `scripts/release/publication-validation-matrix.mjs --mode <mode>` and writes the JSON to its outputs. The script is dependency-free because `plan` runs without `npm ci`.

Putting the lane policy in a script rather than in the workflow inline Node heredoc means the governance test can import and call it with each mode instead of parsing YAML prose, which is what `isolated-regression-testing` asks of durable oracles. The four lanes stay declared in one frozen list; `develop` filters it to Node 24, every other mode returns it whole, and an unknown mode throws.

Nothing downstream names a lane. `publish` and `result` depend on the `validate` job as a whole, and artifact names use `matrix.platform`, so a three-entry matrix needs no other edit.

## Why Node 22 leaves the preview and not nightly

`0.1.8-dev.444` measured `win32-node22` at 6 m 41 s and `win32-node24` at 4 m 40 s for the same bytes, and the Node 22 lane is the one that has failed on startup timing noise. The preview number follows the merged pull request, nightly publishes the same head within a day on all four lanes with enforced budgets, and Full regression remains complete. A Node-22-specific regression therefore still cannot reach a stable release unseen; it can only reach a numbered preview, which is superseded by the next merge.

## Guardian cache

The development workflow already caches `native/process-guardian` with a pinned `Swatinem/rust-cache`. The publication `guardians` job adopts the same action and pin. The step runs after checkout and before `npm run build:process-guardian`, so `cargo build --release --locked` still executes; with a warm target directory and unchanged sources it relinks, and with changed sources or a changed `Cargo.lock` cargo fingerprints rebuild the affected units. `build-process-guardian.mjs` continues to hash the emitted binary and record `Cargo.lock` and the source root in the artifact manifest, so restoration is validated by the same evidence as before. This is the compatible native compiler intermediates case the `continuous-integration` capability already permits; the cache is keyed by the workflow job, toolchain, and lockfile, never by the candidate.

## Preparation phase timing

`prepareExactPackageInstallation` times the whole operation once. It now also records `preparation.phases` with `installMs`, `proxySynchronizationMs`, and `installedIdentityMs`, each measured around its own call, while `preparation.durationMs` stays the outer total. `assertReceipt` requires the three phases to be non-negative safe integers so a hand-edited receipt cannot claim attribution it did not measure. `preparationEvidence` copies the phases into the outcome so the workflow summary and the uploaded lane JSON show them without a log grep.

## Not done here

Packing the candidate on Linux instead of Windows is left out. Its tarball-identity risk needs a one-off spike that compares digests before any workflow change, and the saving is about 40 seconds against the 100 to 150 seconds the Windows global install itself costs. That install is npm writing about 13,000 dependency files on a hosted Windows disk, which this change measures but does not attempt to fix.
