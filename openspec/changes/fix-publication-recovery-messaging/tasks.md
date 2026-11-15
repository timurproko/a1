## 1. Recovery entry dispatch through filesystem aliases

- [x] 1.1 Canonicalize direct recovery-entry recognition while retaining safe import-only behavior and all capsule authority checks.
- [x] 1.2 Add regression cases for aliased worker entry, cancellation restoration, and updater-loss settlement with fixture-owned process cleanup and useful failure diagnostics.

## 2. Readable development-publication reporting

- [ ] 2.1 Replace verbose development-publication step watching with compact state-change progress and a persistent Actions log link.
- [ ] 2.2 Summarize primary failures, downstream blocking, publication state, and unavailable/interrupted status truthfully with bounded deduplicated diagnostics.
- [ ] 2.3 Add focused reporting regression tests and document the output and retry behavior without changing publication gates.
