## 1. Establish the supported Pi boundary

- [ ] 1.1 Adopt an exact Pi release that documents a typed OAuth callback-page presentation seam, refresh its public API and compatibility evidence, and verify the Pi upgrade gates pass without private imports, dependency patches, or auth-flow copies.
- [ ] 1.2 Extend A1's public-backed Pi service composition to accept the callback renderer only for bare A1, and verify an integration fixture observes the renderer while the `a1 pi` launch path remains unconfigured.

## 2. Build the owned browser presentation

- [ ] 2.1 Add a self-contained success/failure HTML renderer derived from the product identity and owned A1 mark, and verify focused fixtures cover both outcomes, viewport metadata, close guidance, and provider-specific text.
- [ ] 2.2 Escape every dynamic display field and exclude scripts, remote resources, callback parameters, codes, state, tokens, and credentials; verify adversarial fixtures remain inert and contain no sensitive fields.
- [ ] 2.3 Wire the renderer through the public Pi callback contract while preserving Pi-owned status, `Cache-Control: no-store`, callback validation, token exchange, cancellation, and manual/device flows; verify callback-response integration tests cover success and failure semantics.

## 3. Certify identity and profile behavior

- [ ] 3.1 Add product-identity and Pi-boundary coverage proving bare A1 pages show A1 rather than Pi and comparison-profile pages remain vanilla, then verify the focused identity, architecture, API-boundary, and engine-conformance suites pass.
- [ ] 3.2 Build the checkout and record manual evidence from one browser OAuth completion in bare A1 plus an `a1 pi` comparison, confirming the branded page, provider result, close guidance, and absence of exposed authentication data.
- [ ] 3.3 Run strict OpenSpec validation and the selected bounded validation scopes, disposition any known gaps, and leave exact-head CI as the final handoff gate.
