## ADDED Requirements

### Requirement: Provider authentication and model availability remain consistent
The owned Pi UI SHALL derive visible provider configuration, available models, active model selection, footer state, login/logout choices, and restart recovery from the same authoritative provider-auth state used by pinned Pi for the selected profile. Models SHALL be selectable only when their provider is currently configured according to that authority. Persisted credentials SHALL remain profile-local and SHALL count as an authenticated state across launches until logout or invalidation; an empty profile SHALL NOT inherit models or credentials from another profile, settings history, a prior process, or a cached catalog.

#### Scenario: Start with an empty A1 profile
- **WHEN** bare A1 starts with no stored, environment, runtime, or provider-config authentication and no equivalent configured provider
- **THEN** it SHALL report that no models are available, `/models` SHALL contain no selectable provider models, `/login` SHALL show providers as unconfigured, and the footer SHALL NOT present a stale active model

#### Scenario: Start with stored credentials
- **WHEN** bare A1 starts with valid credentials stored in its own profile for one or more providers
- **THEN** `/login` SHALL identify those providers with the same configured type and source status as pinned Pi, `/models` SHALL expose only models from currently configured providers, and selected-model and footer state SHALL agree with that catalog

#### Scenario: Keep A1 and vanilla profiles isolated
- **WHEN** `~/.a1/agent` and `~/.pi/agent` contain different authentication records
- **THEN** bare `a1` and `a1 pi` SHALL each use only its selected profile, and parity comparison SHALL use equivalent prepared state rather than copying or silently sharing credentials between profiles

#### Scenario: Complete provider login
- **WHEN** login succeeds for a provider
- **THEN** provider status, logout availability, model availability, active selection, and footer state SHALL update to the same observable state and ordering as pinned Pi without requiring a process restart

#### Scenario: Remove stored credentials
- **WHEN** logout removes a stored OAuth or API-key credential
- **THEN** the provider and its models SHALL cease to appear configured unless another declared authentication source remains, stale settings SHALL NOT preserve an unusable active model, and environment or provider-config authentication SHALL remain untouched as pinned Pi specifies

#### Scenario: Resolve non-stored provider configuration
- **WHEN** a provider is configured through a supported environment, runtime, or provider-config source rather than stored credentials
- **THEN** login status and model availability SHALL reflect the source-equivalent pinned-Pi state, while logout SHALL NOT claim to remove authentication it does not own

#### Scenario: Refresh or credential validation fails
- **WHEN** credential refresh, provider discovery, or model-catalog refresh fails or times out
- **THEN** A1 SHALL preserve only the last still-authoritative provider state, report the bounded failure as pinned Pi does, and SHALL NOT broaden model availability from all-model catalogs or stale settings

#### Scenario: Restart after authentication changes
- **WHEN** A1 restarts after login, logout, expiry, refresh, or selected-model changes
- **THEN** provider labels, model choices, selected model, warnings, and footer state SHALL reconstruct one mutually consistent state without reviving unauthenticated models

#### Scenario: Prove authentication and model parity independently
- **WHEN** this requirement is accepted
- **THEN** untouched pinned Pi and A1 SHALL be run with equivalent isolated profile fixtures for empty, stored OAuth, stored API-key, non-stored configuration, logout, stale setting, refresh failure, and restart cases, and credential values SHALL NOT be copied into evidence
