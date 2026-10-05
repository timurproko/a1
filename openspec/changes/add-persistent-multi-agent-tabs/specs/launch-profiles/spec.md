## MODIFIED Requirements

### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of bare `a1`, prerelease `a1 pi`, or both. Profile selection, profile data, lifecycle state, process containment, and closure SHALL remain scoped to the originating invocation rather than a product-wide foreground slot. When resident tabs are enabled, concurrent bare-A1 instances of the same profile SHALL attach to that profile's single resident terminal host as independent clients; closing one client SHALL NOT affect another client or any resident tab. On Windows, A1-owned runtimes in either profile SHALL share the native session-writer admission guard only when selecting the same canonical session file, regardless of the resident setting. The guard SHALL be independent of resident initialization: `a1 pi` and direct A1 SHALL start no host, holder, strip or bridge. Different session files SHALL remain independently writable, and unmodified external Pi or older nonparticipating builds SHALL NOT be claimed as covered.

#### Scenario: Start the same profile twice
- **WHEN** the user starts two instances of the same retained profile
- **THEN** both SHALL launch independently without sharing foreground ownership

#### Scenario: Start both profile forms
- **WHEN** owned A1 or Pi-comparison instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

#### Scenario: Two bare A1 clients share resident tabs
- **WHEN** two bare `a1` instances of one profile run with resident tabs enabled and one of them exits
- **THEN** the remaining instance SHALL keep its tabs, active selection, and input unaffected, and every resident tab SHALL keep running

#### Scenario: Comparison profile selects a session held by a tab
- **WHEN** a Windows Pi-comparison runtime selects the canonical file already held by a resident A1 tab
- **THEN** the shared writer guard SHALL reject duplicate writing without starting resident infrastructure or changing the comparison UI into a tab client

#### Scenario: Different session files across profiles
- **WHEN** Windows bare-A1 and Pi-comparison runtimes select distinct unheld session files
- **THEN** both SHALL proceed concurrently without a product-wide foreground lock
