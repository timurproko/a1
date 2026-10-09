## ADDED Requirements

### Requirement: Pi-typed presentation payloads never cross the application layer
Values typed by a pinned Pi package, or declared `unknown` because they stand in for one, SHALL NOT be returned to or forwarded by the application layer under `src/app`. Code that needs both the Pi engine adapter and the Pi component adapter SHALL live in the `pi-session-presenters` owner and SHALL expose only ports declared in `src/contracts/owned-ui`.

#### Scenario: A selector needs an engine object
- **WHEN** a Pi component selector requires an engine-owned object such as a model runtime or session tree
- **THEN** the session presenters owner SHALL obtain it from the engine adapter and construct the selector, and the shell SHALL call only the neutral presenter port

#### Scenario: A new member on the backend port carries an opaque payload
- **WHEN** a member typed `unknown` or by a pinned Pi type is added to `OwnedUiSessionBackend`
- **THEN** the contract test SHALL fail
