## ADDED Requirements

### Requirement: The normal repository build produces a resident-ready local application

On a supported development platform, `npm run build` SHALL produce the managed runtime, process guardian, and a verified release-profile terminal-host addon for the current platform, including its manifest and notices, so a subsequent bare `./scripts/dev` launch can take the resident multi-agent route without deployment or a separate tabs-specific build command. The build SHALL fail with an actionable prerequisite diagnostic when it cannot produce or verify that complete local artifact set; it SHALL NOT report success and defer discovery of the incomplete build to the launch-time single-agent fallback.

#### Scenario: Developer builds and launches bare A1

- **WHEN** a developer runs `npm run build` successfully on a supported platform and then launches bare `./scripts/dev` from an interactive terminal
- **THEN** the local release SHALL contain a verified terminal host for that platform
- **AND** resident startup SHALL be available without publishing, installing, or running another build command

#### Scenario: Native prerequisite is unavailable

- **WHEN** the normal build cannot obtain or verify the current platform's terminal-library prerequisite
- **THEN** the build SHALL fail with a diagnostic naming how to obtain that prerequisite
- **AND** it SHALL NOT claim to have produced the normal runnable application

#### Scenario: Manual Git Bash handoff

- **WHEN** an implementation candidate is handed off for interactive testing on Windows Git Bash
- **THEN** the handoff SHALL provide one copy-pasteable line that changes to the exact worktree, runs `npm run build`, and launches `./scripts/dev`
- **AND** it SHALL NOT invoke the direct Node launcher or require a tabs-specific build command
