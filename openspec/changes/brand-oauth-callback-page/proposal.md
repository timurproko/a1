## Why

OAuth sign-in launched from A1 currently ends on Pi's branded browser page, which makes a successful A1 workflow look like it switched products. The local callback page should identify A1 while preserving the provider-owned authentication flow and its security behavior.

## What Changes

- Render A1-branded success and failure pages for browser OAuth callbacks initiated by bare `a1`, using the authoritative product identity and A1 mark.
- Preserve provider-specific outcome text, safe escaping, responsive presentation, and non-cacheable callback responses without exposing callback parameters or credentials.
- Keep provider authorization, token exchange, credential storage, cancellation, and headless/manual-code behavior owned by Pi.
- Leave the explicit `a1 pi` comparison profile untouched so it continues to show vanilla Pi behavior.
- Require a documented public Pi callback-page customization point; do not patch installed dependencies, deep-import private modules, or intercept Node's HTTP implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `product-identity`: Extend A1's visible identity to the local browser pages that complete or reject provider authentication started by bare A1.

## Impact

This change affects the A1 product-identity resources, Pi service composition at the public API boundary, browser-page rendering tests, Pi compatibility evidence, and the exact pinned Pi dependency if the required public customization point first arrives in a newer release. Authentication protocols, redirect URIs, credential formats, provider network requests, and vanilla Pi remain unchanged.
