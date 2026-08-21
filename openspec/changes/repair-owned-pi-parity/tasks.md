## 1. Reproduce and Bound the Parity Failure

- [x] 1.1 Add sanitized isolated-profile fixtures for empty auth, stored OAuth, stored API key, non-stored configuration, stale selected-model settings, logout, refresh failure, expiry/refresh, and restart; reproduce the reported state where models are available while `/login` incorrectly labels their providers unconfigured. Validate with focused model-auth, workflow, shell, and profile-isolation tests without reading or recording real credential values.
- [x] 1.2 Record the pinned Pi source trace for provider auth-status resolution, login/logout option construction, model availability, selected-model fallback, and footer/provider state; add intentional-divergence fixtures proving configured-status loss and unauthenticated model broadening fail the containing parity gate.

## 2. Restore One Authoritative Authentication State

- [x] 2.1 Add an A1-owned typed authentication-provider option carrying provider identity, auth method, and bounded configured source/status from the public model runtime; replace the lossy generic workflow mapping and pass focused adapter contract, malformed-shape, upgrade-conformance, architecture, and typecheck gates.
- [x] 2.2 Preserve that typed status through the public authentication-selector component boundary so empty providers render unconfigured and stored or otherwise configured providers render the pinned type/source state; pass focused component frames, search/filter, duplicate-method, narrow/wide, login, logout, and cancellation tests.
- [x] 2.3 Reconcile successful login and logout with available models, selected-model fallback, no-model warnings, scoped models, footer state, and subsequent selectors without restart; keep ambient configuration after stored logout and pass focused state-transition, race, refresh-failure, and shell integration tests.
- [x] 2.4 Make startup, restart, expiry/refresh, and stale settings reconstruct only models from currently configured providers; prove the A1 and vanilla profile roots stay isolated and pass focused runtime, restart, profile-isolation, and N-1-compatible state tests.

## 3. Prove Equivalent-State Pinned Pi Parity

- [x] 3.1 Extend independent untouched-Pi versus A1 workflow and terminal parity with equivalent temporary profiles for every declared authentication/model state; compare provider labels, `/login`, `/logout`, `/models`, active model, warnings, and footer state, preserve bounded redacted evidence, and prove deliberate status/model mutations fail.
- [x] 3.2 Run real public-model-runtime integration using disposable synthetic credentials or non-secret configured providers, then run focused and containing test tiers, typecheck, architecture/source governance, dependency checks, packaging, release gates, audit, and strict OpenSpec validation; record exact candidate and evidence hashes.

## 4. Obtain Fresh User Acceptance

- [x] 4.1 Provide user-controlled commands that compare bare `a1` and `a1 pi` with equivalent empty profiles, then equivalent stored-provider profiles, login, model selection, restart, and logout; explicitly explain that persisted A1 credentials mean A1 is logged in even across a new process.
- [ ] 4.2 Correct every contradictory user finding with focused and containing regression gates, rerun independent parity and full release validation, and mark this change complete only after the user confirms provider status and visible models remain mutually consistent. Keep `customize-owned-pi-experience` and the held multi-agent change unstarted.
