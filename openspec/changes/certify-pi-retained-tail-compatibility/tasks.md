Status: deferred independent work requiring a separate explicit implementation request. These tasks do not gate `fix-cli-session-resume`, whose approved acceptance is future-session create/exit/resume parity with its existing Pi pin. No task is completed or waived by this scope clarification; retained-tail certification is still unavailable.

## 1. Reproduction and external prerequisite

- [ ] 1.1 Prepare a synthetic upstream reproduction packet identifying the documentation/runtime mismatch and expected summary-plus-retained-message output; verify it reproduces the 0.84.2 omission without personal session data, credentials, model requests, or dependency mutation.
- [ ] 1.2 Establish a corrected immutable upstream publication through a separately authorized upstream contribution or maintainer release; verify its public types and shipped context reconstruction preserve the reproduction payload and record version, publication integrity, and upstream evidence. If no passing artifact exists, stop here with dependency adoption blocked rather than choosing an unverified newer release.

## 2. Independent candidate compatibility evidence

- [ ] 2.1 Add a public-API fixture corpus for retained-only, empty-tail, conflicting dual-format, legacy-only, latest-checkpoint, and unrelated-branch cases; verify explicit expected order/content catches omission, duplication, legacy fallback, and branch leakage in the exact candidate.
- [ ] 2.2 Add mixed-message payload fixtures with text/images, thinking, tool calls/results, supported custom messages, and intentional repetitions; verify roles, associations, ordered blocks, and metadata survive without a model request or execution of saved tools.
- [ ] 2.3 Add published-artifact and declaration/runtime consistency evidence, including a known-broken candidate outcome; verify a source-only correction or matching export names cannot satisfy the compatibility gate and the corrected publication does satisfy it.

## 3. Scoped A1 dependency integration

- [ ] 3.1 Select the qualified exact Pi family in the isolated A1 candidate and migrate only required public integration signatures; verify typechecking, authoritative manifest/lockfile consistency, and absence of private imports, dependency patches, prototype mutation, or session conversion.
- [ ] 3.2 Add bounded retained-checkpoint capability/payload validation before conversation use; verify unsupported runtime output, `null`, non-array tails, and malformed messages fail with concise non-content diagnostics while preserving target files and the previous usable session under transactional replacement semantics.
- [ ] 3.3 Adapt public restored-context presentation inputs only where necessary for retained messages without standalone tree entries; verify initial open, replacement, tree navigation, and fork/clone show the same displayable retained conversation that the engine receives, without persisted synthetic entries.
- [ ] 3.4 Verify reopening valid v3 retained files preserves ID, path, and bytes and legacy/uncompacted sessions keep their existing behavior; verify saved model/thinking state and normal unavailable-model fallback using offline fixtures rather than live provider calls.

## 4. Certification and ordinary-resume regression

- [ ] 4.1 Integrate candidate session evidence into the applicable existing compatibility and exact-package validation scopes; verify required CI API, extension, settings, TUI/module-identity, packaging, lifecycle, and regression checks pass without silently adopting unrelated upstream presentation changes.
- [ ] 4.2 Provide a build-first color-preserving owned-UI handoff against a disposable retained-only session and record user acceptance of restored content and existing legacy sessions; verify the evidence names the candidate commit and exact dependency rather than claiming planning or source inspection is runnable acceptance.
- [ ] 4.3 Verify the future certified dependency preserves the then-current ordinary CLI create/exit/resume and installed-entry regression evidence in addition to this change's strict retained-tail cases; record the two evidence sets separately without retroactively making this deferred work a prerequisite for `fix-cli-session-resume` or claiming its tasks complete.
