## Context

Bare A1 delegates provider login to the pinned Pi model runtime. Browser-capable providers start their callback servers inside Pi AI and render Pi's fixed `oauthSuccessHtml` / `oauthErrorHtml` pages after processing the redirect. The current public A1-to-Pi interaction supplies prompts and notifications but no browser-page renderer. A1's Pi API boundary forbids solving that gap by patching installed code, resolving private distribution files, mutating built-ins, or depending on dependency layout.

The A1 mark already exists as a repository-owned SVG resource, and display text is governed by the authoritative product identity. The comparison profile launches Pi through its untouched public process entry and must remain a vanilla oracle.

## Goals / Non-Goals

**Goals:**

- Make every local browser callback page produced by a bare-A1 provider login visibly and consistently A1-owned.
- Keep authentication processing and secrets entirely within Pi's provider runtime.
- Derive browser branding from owned identity/resources and test the rendered document without a live provider login.
- Preserve the public Pi boundary and fail compatibility checks if the customization contract changes.

**Non-Goals:**

- Changing provider authorization screens hosted by OpenAI, Anthropic, OpenRouter, Radius, or another provider.
- Reimplementing PKCE, callback validation, token exchange, credential persistence, refresh, or manual/device flows.
- Rebranding `a1 pi`, extension-owned OAuth servers, remote provider pages, or generic MCP OAuth in this change.
- Adding telemetry, browser scripting, automatic window closure, or remote assets to the callback document.

## Decisions

### 1. Depend on an explicit public Pi presentation seam

Implementation will adopt an exact Pi release that exposes a documented, typed callback-page presentation option through the public service/model-runtime construction path. A1 will pass an owned renderer at the same composition boundary that creates Pi services. The renderer receives only the bounded outcome data needed to produce the page, while Pi continues to own HTTP binding, callback validation, provider completion, status codes, headers, and login settlement.

The Pi release and its callback contract are a hard implementation prerequisite. If no compatible public release exists, implementation stops rather than substituting a private import, esbuild alias for a transitive module, loader redirect, installed-file patch, HTTP monkey patch, or copied provider flow. Those alternatives are rejected because they couple authentication to private package structure and could silently diverge on a Pi upgrade.

### 2. Own one deterministic, self-contained callback document

A small A1 presentation module will render success and failure variants from a discriminated outcome. It will inline the repository-owned A1 mark and CSS, derive the product label from the product-identity authority, escape all dynamic text, include no script or remote resource, and keep a compact centered layout across narrow and wide viewports. Success will say that authentication completed and the page can be closed; failures will retain the provider-safe message and optional detail supplied by Pi.

One renderer avoids provider-specific page forks and makes byte-level/unit inspection possible. Reusing the README file by reading it at runtime is rejected because packaged resources and callback availability must not depend on repository paths. Copying Pi's logo/page is rejected because the purpose is an independently owned A1 identity.

### 3. Scope branding to bare-A1 composition

Only the owned runtime service construction receives the renderer. The transparent `a1 pi` child process is not configured and therefore continues to emit the exact Pi page. Provider, credential, and redirect behavior are otherwise shared with pinned Pi.

This boundary is preferred to a process-global environment switch: multiple launch profiles and future in-process consumers should not acquire branding by ambient state, and a global switch would make the vanilla oracle unreliable.

### 4. Treat callback content as a security-sensitive presentation boundary

The renderer will accept already classified display strings, HTML-escape every dynamic value, and never receive or serialize authorization codes, state, tokens, callback URLs, query parameters, credential paths, or provider response bodies. Tests will use hostile text fixtures to prove escaping and inspect the document for scripts, remote URLs, and sensitive parameter names. Pi remains responsible for `Cache-Control: no-store` and callback status codes through the public seam; compatibility coverage will assert that branded rendering does not weaken those response semantics.

### 5. Validate presentation independently from live OAuth

Focused tests will snapshot or structurally assert the success and failure HTML, product mark/name, provider wording, escaping, responsive metadata, and absence of Pi branding. A public-boundary integration fixture will inject the renderer into Pi service construction and exercise callback responses without exchanging real credentials. Manual acceptance will perform one browser OAuth login in bare A1 and compare it with `a1 pi`.

Live provider login is retained as manual evidence because CI must not require external credentials or an interactive browser.

## Risks / Trade-offs

- **The required public Pi seam is not released yet** → Keep this proposal planning-only and block implementation until an exact compatible release is available; never weaken the boundary to make progress.
- **A Pi upgrade changes callback data or response ownership** → Pin the exact version, update public API baselines, and fail compile-time/conformance checks at the adapter boundary.
- **Provider text could contain unsafe markup or sensitive detail** → Escape every dynamic field, accept only bounded presentation values, and add adversarial rendering tests.
- **A branded failure page could obscure useful diagnostics** → Preserve Pi's provider-safe heading/message/detail roles while changing only identity and visual treatment.
- **The page differs from a future broader A1 design system** → Keep the renderer isolated and derive its mark/name from owned authorities so its visual tokens can be replaced without touching authentication.

## Migration Plan

1. Wait for and adopt an exact Pi release with the required public callback-page renderer contract, including normal Pi upgrade evidence.
2. Add and wire the A1 renderer only in bare-A1 service composition, then verify callback response parity and owned presentation.
3. Release normally; existing credentials and in-progress configuration require no migration because no auth data or redirect contract changes.
4. Roll back by removing the renderer configuration (and, if necessary, reverting the Pi pin), which restores Pi's default page without changing stored credentials.
