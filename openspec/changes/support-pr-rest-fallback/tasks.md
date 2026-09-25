## 1. Add bounded REST fallback discovery

- [ ] 1.1 Parse the selected repository's bounded `origin` URL into an exact GitHub owner/repository identity; verify accepted HTTPS and SSH forms and rejection of malformed, credentialed, non-GitHub, or ambiguous remotes.
- [ ] 1.2 Query GitHub's pull-request list endpoint only after the existing `gh` probe yields no eligible identity; verify exact head filtering, preferred-probe short-circuiting, request timeout, cancellation, and silent Git/HTTP failure.
- [ ] 1.3 Validate REST results as one exact open-or-merged branch association with a positive number and canonical GitHub URL; reject closed-unmerged, mismatched, ambiguous, malformed, unsafe, and non-success responses.
- [ ] 1.4 Apply optional `GH_TOKEN`/`GITHUB_TOKEN` authorization without persisting or exposing credentials; verify public requests omit Authorization and private-token requests include only the expected header.

## 2. Validate lifecycle compatibility

- [ ] 2.1 Extend focused repository-probe tests for CLI success, missing CLI with public REST success, authenticated fallback, and all fail-closed cases without live GitHub dependencies.
- [ ] 2.2 Verify the existing runtime refresh, generation, and disposal tests retain serialized polling, unchanged-view suppression, and cancellation behavior with fallback discovery.

## 3. Evidence and handoff

- [ ] 3.1 Run focused repository-probe and runtime lifecycle tests, typechecking, strict OpenSpec validation, and applicable code-documentation checks; record exact results and any known-gap disposition.
- [ ] 3.2 Build the candidate and provide a color-preserving manual check from a public branch PR with `gh` absent, verifying the footer shows and opens the canonical `#<number>` link while no eligible PR remains silent.
