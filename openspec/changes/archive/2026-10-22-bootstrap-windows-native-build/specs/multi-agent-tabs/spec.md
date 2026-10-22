# multi-agent-tabs Delta

## MODIFIED Requirements

### Requirement: The normal repository build produces a resident-ready local application

On a supported development platform, `npm run build` SHALL produce the managed runtime, process guardian, and a verified release-profile terminal-host addon for the current platform, including its manifest and notices, so a subsequent bare `./scripts/dev` launch can take the resident multi-agent route without deployment or a separate tabs-specific build command. Before cleaning or compiling, the build SHALL evaluate the complete native prerequisite set in one pass and fail with an actionable diagnostic when it cannot produce or verify that complete local artifact set; it SHALL NOT report success and defer discovery of the incomplete build to the launch-time single-agent fallback.

On Windows, the prerequisite set SHALL include Rust/Cargo, the Microsoft C++ x64 toolchain, and its Windows SDK environment. The build SHALL use an explicit valid tool override first, then an already valid launching environment, and otherwise SHALL discover installed Rustup and Visual Studio C++ tools and initialize them for build children without mutating the user's persistent environment. A GNU `link.exe` earlier on the launching `PATH` SHALL NOT be selected in place of Microsoft's linker. Missing software SHALL require explicit user installation; A1 SHALL NOT silently accept licenses, elevate privileges, or install third-party software.

#### Scenario: Developer builds and launches bare A1

- **WHEN** a developer runs `npm run build` successfully on a supported platform and then launches bare `./scripts/dev` from an interactive terminal
- **THEN** the local release SHALL contain a verified terminal host for that platform
- **AND** resident startup SHALL be available without publishing, installing, or running another build command

#### Scenario: Installed Windows tools are absent from the launching shell

- **WHEN** Rustup is installed in its canonical user location and a complete Visual Studio C++ workload is installed but Git Bash or ordinary PowerShell does not expose both tools correctly
- **THEN** plain `npm run build` SHALL initialize an effective child environment that resolves the repository-pinned Rust toolchain and Microsoft's x64 compiler and linker
- **AND** the build SHALL NOT require the developer to open another shell or prepend paths manually

#### Scenario: Git Bash shadows the Microsoft linker

- **WHEN** Git Bash's GNU `link.exe` precedes a complete installed Visual Studio toolchain on the launching `PATH`
- **THEN** the effective build environment SHALL select the Microsoft linker from the chosen Visual Studio installation
- **AND** prerequisite success SHALL NOT be reported for an environment that would invoke the GNU linker

#### Scenario: Windows native prerequisites are unavailable

- **WHEN** the normal build cannot obtain or verify Rust/Cargo, the Visual Studio C++ workload, its x64 linker, or its Windows SDK environment
- **THEN** the build SHALL fail before cleaning or compiling and name every observed blocker
- **AND** its diagnostic SHALL provide an ordered setup sequence using the official Rustup and Visual Studio installation paths, then direct the developer to rerun the same `npm run build`
- **AND** it SHALL NOT claim to have produced the normal runnable application or install external software without explicit user action

#### Scenario: Native prerequisite is unavailable

- **WHEN** the normal build cannot obtain or verify the current platform's terminal-library prerequisite
- **THEN** the build SHALL fail with a diagnostic naming how to obtain that prerequisite
- **AND** it SHALL NOT claim to have produced the normal runnable application

#### Scenario: Manual Git Bash handoff

- **WHEN** an implementation candidate is handed off for interactive testing on Windows Git Bash
- **THEN** the handoff SHALL provide one copy-pasteable line that changes to the exact worktree, runs `npm run build`, and launches `./scripts/dev`
- **AND** it SHALL NOT invoke the direct Node launcher, manually initialize Visual Studio, manually alter `PATH`, or require a tabs-specific build command
